mod client;

use std::sync::mpsc;
use std::sync::{Arc, Mutex};

use log::info;

#[derive(Debug)]
pub enum RpcCommand {
    SetActivity {
        title: String,
        artist: String,
        album: String,
        elapsed_secs: i64,
        duration_secs: i64,
        is_paused: bool,
    },
    ClearActivity,
    Shutdown,
}

pub struct DiscordRpcHandle {
    sender: Arc<Mutex<Option<mpsc::Sender<RpcCommand>>>>,
}

impl DiscordRpcHandle {
    pub fn new() -> Self {
        Self {
            sender: Arc::new(Mutex::new(None)),
        }
    }

    pub fn init(&self) {
        let (tx, rx) = mpsc::channel();
        *self.sender.lock().unwrap() = Some(tx);
        client::run_rpc_loop(rx);
        info!("[discord-rpc] Initialized");
    }

    pub fn send(&self, cmd: RpcCommand) {
        if let Some(tx) = self.sender.lock().unwrap().as_ref() {
            let _ = tx.send(cmd);
        }
    }

    pub fn shutdown(&self) {
        if let Some(tx) = self.sender.lock().unwrap().take() {
            let _ = tx.send(RpcCommand::Shutdown);
        }
    }

    pub fn is_active(&self) -> bool {
        self.sender.lock().unwrap().is_some()
    }
}
