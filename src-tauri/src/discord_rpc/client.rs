use std::collections::HashMap;
use std::sync::mpsc::Receiver;
use std::time::{SystemTime, UNIX_EPOCH};

use discord_rich_presence::activity::{self, ActivityType, StatusDisplayType};
use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
use log::{info, warn};
use url::Url;

use super::RpcCommand;

pub fn run_rpc_loop(rx: Receiver<RpcCommand>) {
    let app_id = env!("DISCORD_APP_ID");

    std::thread::spawn(move || {
        let mut cache: HashMap<String, String> = HashMap::new();
        let mut client: Option<DiscordIpcClient> = None;
        let mut connected = false;

        loop {
            match rx.recv() {
                Ok(RpcCommand::Shutdown) => {
                    if let Some(ref mut c) = client {
                        if connected {
                            let _ = c.clear_activity();
                        }
                        let _ = c.close();
                    }
                    info!("[discord-rpc] Shutdown");
                    break;
                }
                Ok(RpcCommand::ClearActivity) => {
                    if let Some(ref mut c) = client {
                        if connected {
                            let _ = c.clear_activity();
                        }
                    }
                }
                Ok(RpcCommand::SetActivity {
                    title,
                    artist,
                    album,
                    elapsed_secs,
                    duration_secs,
                }) => {
                    if client.is_none() {
                        client = Some(DiscordIpcClient::new(app_id));
                    }

                    let c = client.as_mut().unwrap();

                    if !connected {
                        match c.connect() {
                            Ok(()) => {
                                connected = true;
                                info!("[discord-rpc] Connected to Discord");
                            }
                            Err(e) => {
                                warn!("[discord-rpc] Failed to connect: {}", e);
                                continue;
                            }
                        }
                    }

                    let artwork_url = fetch_artwork(&artist, &album, &mut cache);

                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64;
                    let start = now.saturating_sub(elapsed_secs);

                    let mut assets = activity::Assets::new();
                    if let Some(ref url) = artwork_url {
                        assets = assets.large_image(url);
                    }

                    let mut timestamps = activity::Timestamps::new().start(start);
                    if duration_secs > 0 {
                        timestamps = timestamps.end(start + duration_secs);
                    }

                    let act = activity::Activity::new()
                        .name("Vibe Music")
                        .details(&title)
                        .state(&artist)
                        .assets(assets)
                        .timestamps(timestamps)
                        .activity_type(ActivityType::Listening)
                        .status_display_type(StatusDisplayType::Details);

                    if let Err(e) = c.set_activity(act) {
                        warn!("[discord-rpc] Failed to set activity: {}", e);
                        connected = false;
                    } else {
                        info!(
                            "[discord-rpc] Presence updated: {} - {}",
                            title, artist,
                        );
                    }
                }
                Err(_) => break,
            }
        }
    });
}

fn fetch_artwork(
    artist: &str,
    album: &str,
    cache: &mut HashMap<String, String>,
) -> Option<String> {
    let key = format!("{} - {}", artist, album);
    if let Some(url) = cache.get(&key) {
        return if url.is_empty() { None } else { Some(url.clone()) };
    }

    let mut url = match Url::parse("https://itunes.apple.com/search") {
        Ok(u) => u,
        Err(_) => return None,
    };
    url.query_pairs_mut()
        .append_pair("term", &format!("{} {}", artist, album))
        .append_pair("entity", "album")
        .append_pair("limit", "1");

    let resp = match reqwest::blocking::get(url) {
        Ok(r) => r,
        Err(e) => {
            warn!("[discord-rpc] iTunes lookup failed: {}", e);
            cache.insert(key, String::new());
            return None;
        }
    };

    let json: serde_json::Value = match resp.json::<serde_json::Value>() {
        Ok(j) => j,
        Err(e) => {
            warn!("[discord-rpc] iTunes response parse failed: {}", e);
            cache.insert(key, String::new());
            return None;
        }
    };

    if let Some(results) = json["results"].as_array() {
        if let Some(first) = results.first() {
            if let Some(artwork) = first["artworkUrl100"].as_str() {
                let large = artwork.replace("100x100bb", "500x500bb");
                info!(
                    "[discord-rpc] Found artwork for {} - {}",
                    artist, album
                );
                cache.insert(key, large.clone());
                return Some(large);
            }
        }
    }

    cache.insert(key, String::new());
    None
}
