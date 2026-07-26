use std::collections::BTreeMap;

use log::{info, warn};
use md5::{Digest, Md5};

const API_KEY: &str = env!("LASTFM_API_KEY");
const API_SECRET: &str = env!("LASTFM_API_SECRET");
const BASE_URL: &str = "https://ws.audioscrobbler.com/2.0/";

pub struct ScrobblerClient {
    session_key: String,
    client: reqwest::blocking::Client,
}

impl ScrobblerClient {
    pub fn new(session_key: String) -> Self {
        Self {
            session_key,
            client: reqwest::blocking::Client::new(),
        }
    }

    pub fn get_session(token: &str) -> Result<(String, String), String> {
        let mut params = BTreeMap::new();
        params.insert("method", "auth.getSession");
        params.insert("token", token);
        params.insert("api_key", API_KEY);

        let sig = sign_params(&params);
        params.insert("api_sig", &sig);

        let url = build_url(&params);
        let resp: reqwest::blocking::Response =
            reqwest::blocking::get(&url).map_err(|e: reqwest::Error| e.to_string())?;
        let body = resp.text().map_err(|e: reqwest::Error| e.to_string())?;

        let xml = roxmltree::Document::parse(&body).map_err(|e| {
            warn!("[scrobbler] auth.getSession parse failed: {}", e);
            format!("Failed to parse response: {}", e)
        })?;

        if let Some(err) = xml.descendants().find(|n| n.has_tag_name("error")) {
            let code = err
                .attribute("code")
                .unwrap_or("unknown");
            let text = err.text().unwrap_or("unknown error");
            return Err(format!("Last.fm error {}: {}", code, text));
        }

        let session_key = xml
            .descendants()
            .find(|n| n.has_tag_name("key"))
            .and_then(|n| n.text())
            .map(|s| s.to_string())
            .ok_or("No session key in response")?;

        let username = xml
            .descendants()
            .find(|n| n.has_tag_name("name"))
            .and_then(|n| n.text())
            .map(|s| s.to_string())
            .ok_or("No username in response")?;

        info!("[scrobbler] Authenticated as {}", username);
        Ok((session_key, username))
    }

    pub fn now_playing(
        &self,
        artist: &str,
        track: &str,
        album: &str,
        duration_secs: u64,
    ) -> Result<(), String> {
        let duration_str = duration_secs.to_string();
        let mut params = BTreeMap::new();
        params.insert("method", "track.updateNowPlaying");
        params.insert("artist", artist);
        params.insert("track", track);
        params.insert("album", album);
        params.insert("duration", &duration_str);
        params.insert("api_key", API_KEY);
        params.insert("sk", &self.session_key);

        let sig = sign_params(&params);
        params.insert("api_sig", &sig);

        let resp = self
            .client
            .post(BASE_URL)
            .form(&params)
            .send()
            .map_err(|e: reqwest::Error| e.to_string())?;

        if !resp.status().is_success() {
            return Err(format!("HTTP {}", resp.status()));
        }

        Ok(())
    }

    pub fn scrobble(
        &self,
        artist: &str,
        track: &str,
        album: &str,
        duration_secs: u64,
        timestamp: u64,
    ) -> Result<(), String> {
        let duration_str = duration_secs.to_string();
        let timestamp_str = timestamp.to_string();
        let mut params = BTreeMap::new();
        params.insert("method", "track.scrobble");
        params.insert("artist", artist);
        params.insert("track", track);
        params.insert("album", album);
        params.insert("duration", &duration_str);
        params.insert("timestamp", &timestamp_str);
        params.insert("api_key", API_KEY);
        params.insert("sk", &self.session_key);

        let sig = sign_params(&params);
        params.insert("api_sig", &sig);

        let resp = self
            .client
            .post(BASE_URL)
            .form(&params)
            .send()
            .map_err(|e: reqwest::Error| e.to_string())?;

        if !resp.status().is_success() {
            return Err(format!("HTTP {}", resp.status()));
        }

        Ok(())
    }
}

fn sign_params(params: &BTreeMap<&str, &str>) -> String {
    let mut raw = String::new();
    for (key, value) in params.iter() {
        raw.push_str(key);
        raw.push_str(value);
    }
    raw.push_str(API_SECRET);

    let mut hasher = Md5::new();
    hasher.update(raw.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn build_url(params: &BTreeMap<&str, &str>) -> String {
    let mut url = String::from(BASE_URL);
    url.push('?');

    let mut first = true;
    for (key, value) in params.iter() {
        if !first {
            url.push('&');
        }
        first = false;
        url.push_str(&urlencoding(key));
        url.push('=');
        url.push_str(&urlencoding(value));
    }

    url
}

fn urlencoding(s: &str) -> String {
    let mut encoded = String::with_capacity(s.len() * 3);
    for byte in s.as_bytes() {
        match *byte {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(*byte as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    encoded
}
