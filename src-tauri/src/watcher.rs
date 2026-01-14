use notify::{Event, RecursiveMode, Watcher};
use std::collections::HashSet;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

// Global state for the watcher
pub struct WatcherState {
    watcher: Arc<Mutex<Option<notify::RecommendedWatcher>>>,
    watched_paths: Arc<Mutex<HashSet<String>>>,
    debouncer_thread: Arc<Mutex<Option<std::thread::JoinHandle<()>>>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            watcher: Arc::new(Mutex::new(None)),
            watched_paths: Arc::new(Mutex::new(HashSet::new())),
            debouncer_thread: Arc::new(Mutex::new(None)),
        }
    }
}

// Initialize the watcher state
pub fn init() -> WatcherState {
    WatcherState::new()
}

#[tauri::command]
pub fn watch_paths(app: AppHandle, folders: Vec<String>) -> Result<(), String> {
    let state = app.state::<WatcherState>();
    let mut current_watcher = state.watcher.lock().map_err(|e| e.to_string())?;
    let mut watched_paths = state.watched_paths.lock().map_err(|e| e.to_string())?;

    // Check if paths actually changed
    let new_set: HashSet<String> = folders.iter().cloned().collect();
    if *watched_paths == new_set {
        return Ok(()); // No change
    }

    *watched_paths = new_set;
    drop(current_watcher); // Unlock to allow thread to access if needed (though we need to recreate watcher)

    // Re-create watcher to modify paths (notify doesn't support unwatching easily in all versions, easier to drop and recreate for clean slate)
    // Actually notify 5.0+ supports unwatch, but resetting is safer to avoid stale state.
    
    // Create channel for events
    let (tx, rx) = crossbeam_channel::unbounded();
    let tx_c = tx.clone();
    
    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        match res {
            Ok(event) => {
                // Filter interesting events
                if matches!(
                    event.kind,
                    notify::EventKind::Create(_)
                        | notify::EventKind::Modify(_)
                        | notify::EventKind::Remove(_)
                ) {
                    // Ignore transient files or temp files
                     let should_process = event.paths.iter().any(|p| {
                         let p_str = p.to_string_lossy();
                         !p_str.contains(".db") && 
                         !p_str.contains(".wal") && 
                         !p_str.contains(".tmp") &&
                         !p_str.contains("covers")
                     });
                     
                     if should_process {
                         let _ = tx_c.send(());
                     }
                }
            }
            Err(e) => log::error!("Watch error: {:?}", e),
        }
    }).map_err(|e| format!("Failed to create watcher: {}", e))?;

    // Add paths
    for folder in &folders {
        if let Err(e) = watcher.watch(Path::new(folder), RecursiveMode::Recursive) {
            log::warn!("Failed to watch {}: {}", folder, e);
        } else {
            log::info!("Watcher started for: {}", folder);
        }
    }

    // Update state
    let mut guard = state.watcher.lock().map_err(|e| e.to_string())?;
    *guard = Some(watcher);

    // Start or restart debouncer thread
    // We strive to have only one debouncer thread running.
    // The channel `rx` is new, so the old thread's rx (if any) is disconnected? No, we need to signal it?
    // Actually, `crossbeam` channel is multi-producer, multi-consumer.
    // Ideally we keep the same thread and channel, just update the watcher.
    // Let's refactor:
    // 1. Create channel ONCE in `init`.
    // 2. Pass `tx` to `watch_paths`.
    // 3. `debouncer` loop runs forever.
    
    // REFACTOR:
    // We need to change `WatcherState` to hold `tx`.
    // But `init` returns `WatcherState`, and `watch_paths` needs to access it.
    // Simple approach: Spawn a NEW thread for each `watch_paths` call is bad.
    
    // Let's stick to: "Recreate watcher" but handle debouncing cleanly.
    // If I start a loop that consumes `rx`, it works.
    // `app` clone needed for scan.
    
    let app_handle = app.clone();
    let folders_clone = folders.clone();
    
    std::thread::spawn(move || {
        // Debounce loop for this specific watcher instance
        // If `watch_paths` is called again, this loop naturally dies when `rx` is closed? 
        // `rx` closes when ALL senders drop. 
        // The sender is inside the watcher callback. 
        // When we replace `state.watcher`, the old watcher is Dropped. 
        // The callback references `tx_c`. Does dropping watcher drop callback? Yes.
        // So `tx_c` drops. `rx` closes. Loop ends. Perfect.
        
        let debounce_time = Duration::from_secs(2);
        let mut last_event = Instant::now();
        let mut dirty = false;

        loop {
            // Wait for event with timeout
            // If dirty, timeout = debounce_time remaining.
            // If not dirty, wait forever.
            
            if dirty {
                let elapsed = last_event.elapsed();
                if elapsed >= debounce_time {
                    // Trigger Scan
                    log::info!("File changes detected. Triggering auto-scan...");
                    // Call scanner
                    // We need to import scanner module
                    // Since we are in `src-tauri/src/watcher.rs`, `crate::scanner` should work.
                    match tauri::async_runtime::block_on(crate::scanner::scan_music_library(app_handle.clone(), folders_clone.clone())) {
                        Ok(_) => log::info!("Auto-scan completed successfully"),
                        Err(e) => log::error!("Auto-scan failed: {}", e),
                    }
                    dirty = false;
                    // Drain unexpected events during scan?
                } else {
                    let wait = debounce_time - elapsed;
                    match rx.recv_timeout(wait) {
                        Ok(_) => {
                            last_event = Instant::now(); // Reset timer on new event
                        },
                        Err(crossbeam_channel::RecvTimeoutError::Timeout) => {
                            // Timeout reached, loop will trigger scan
                        },
                        Err(crossbeam_channel::RecvTimeoutError::Disconnected) => break,
                    }
                }
            } else {
                match rx.recv() {
                    Ok(_) => {
                        dirty = true;
                        last_event = Instant::now();
                    }
                    Err(_) => break, // Disconnected
                }
            }
        }
    });

    Ok(())
}
