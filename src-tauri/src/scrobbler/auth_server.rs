use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::time::Duration;

use log::{error, info, warn};

use super::client;

const AUTH_SERVER_PORT: u16 = 9474;
const AUTH_TIMEOUT_SECS: u64 = 120;
const API_KEY: &str = env!("LASTFM_API_KEY");

pub fn start_auth() -> Result<(String, String), String> {
    let listener = TcpListener::bind(("127.0.0.1", AUTH_SERVER_PORT))
        .map_err(|e| format!("Failed to bind port {}: {}", AUTH_SERVER_PORT, e))?;

    listener
        .set_nonblocking(true)
        .map_err(|e| format!("Failed to set non-blocking: {}", e))?;

    let auth_url = format!(
        "https://www.last.fm/api/auth/?api_key={}&cb=http://localhost:{}/callback",
        API_KEY, AUTH_SERVER_PORT
    );

    if let Err(e) = open::that(&auth_url) {
        warn!("[scrobbler] Failed to open browser: {}", e);
        return Err(format!("Failed to open browser: {}", e));
    }

    info!("[scrobbler] Opened auth URL, waiting for callback...");

    let start = std::time::Instant::now();

    loop {
        if start.elapsed() > Duration::from_secs(AUTH_TIMEOUT_SECS) {
            return Err("Authentication timed out".to_string());
        }

        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut reader = BufReader::new(&mut stream);
                let mut request_line = String::new();
                if reader.read_line(&mut request_line).is_err() {
                    continue;
                }

                let parts: Vec<&str> = request_line.split_whitespace().collect();
                if parts.len() < 2 {
                    continue;
                }

                let path = parts[1];

                if !path.starts_with("/callback") {
                    let response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
                    let _ = stream.write_all(response.as_bytes());
                    continue;
                }

                let token = if let Some(query_start) = path.find('?') {
                    let query = &path[query_start + 1..];
                    query
                        .split('&')
                        .find_map(|pair| {
                            let mut kv = pair.splitn(2, '=');
                            let key = kv.next()?;
                            let value = kv.next()?;
                            if key == "token" {
                                Some(valueto_string(value))
                            } else {
                                None
                            }
                        })
                } else {
                    None
                };

                let success_response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n{}",
                    include_str!("../../templates/lastfm_success.html")
                );

                if let Some(ref t) = token {
                    info!("[scrobbler] Received auth token");
                    let _ = stream.write_all(success_response.as_bytes());

                    match client::ScrobblerClient::get_session(t) {
                        Ok((session_key, username)) => {
                            return Ok((session_key, username));
                        }
                        Err(e) => {
                            error!("[scrobbler] get_session failed: {}", e);
                            return Err(e);
                        }
                    }
                }

                let error_response = format!(
                    "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html\r\n\r\n{}",
                    include_str!("../../templates/lastfm_error.html")
                );
                let _ = stream.write_all(error_response.as_bytes());
                return Err("No token in callback URL".to_string());
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(100));
                continue;
            }
            Err(e) => {
                warn!("[scrobbler] Accept error: {}", e);
                continue;
            }
        }
    }
}

fn valueto_string(value: &str) -> String {
    let mut result = String::with_capacity(value.len());
    let bytes = value.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(hex) = u8::from_str_radix(
                &std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or("00"),
                16,
            ) {
                result.push(hex as char);
                i += 3;
                continue;
            }
        }
        result.push(bytes[i] as char);
        i += 1;
    }
    result
}
