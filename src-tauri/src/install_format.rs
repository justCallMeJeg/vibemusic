use serde::{Deserialize, Serialize};
use std::env;

/// Detected installation format of the current app.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub enum InstallFormat {
    #[default]
    Unknown,
    Msi,
    Exe,
    Dmg,
    AppImage,
    Deb,
    Rpm,
}

impl InstallFormat {
    pub fn supports_auto_update(&self) -> bool {
        matches!(
            self,
            InstallFormat::Msi | InstallFormat::Dmg | InstallFormat::AppImage
        )
    }
}

/// Detect how the current app was installed by examining the executable path
/// and platform-specific hints.
pub fn detect_install_format() -> InstallFormat {
    #[cfg(target_os = "windows")]
    {
        let exe = env::current_exe().ok();
        if let Some(path) = exe {
            let path_str = path.to_string_lossy().to_lowercase();
            // NSIS installs go to %LOCALAPPDATA%\Programs\...
            if path_str.contains("temp") || path_str.contains("appdata\\local\\temp") {
                return InstallFormat::Exe;
            }
            if path_str.contains("program files") {
                return InstallFormat::Msi;
            }
        }
        // fallback: check registry-like paths via parent dir name
        if let Some(parent) = env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_string_lossy().to_lowercase()))
        {
            if parent.contains("program files") {
                return InstallFormat::Msi;
            }
        }
        InstallFormat::Exe
    }

    #[cfg(target_os = "macos")]
    {
        InstallFormat::Dmg
    }

    #[cfg(target_os = "linux")]
    {
        let exe = env::current_exe().ok();
        if let Some(path) = exe {
            let path_str = path.to_string_lossy();
            // AppImage is mounted from a temp path
            if path_str.contains("/tmp/.mount_") || path_str.starts_with("/tmp/") {
                return InstallFormat::AppImage;
            }
            // .deb installs go to /usr/
            if path_str.starts_with("/usr/") {
                return InstallFormat::Deb;
            }
            // .rpm installs go to /usr/ as well but with .rpm extension in path
            // Check if it's in /opt/ (common for some RPM-based apps)
            if path_str.starts_with("/opt/") {
                return InstallFormat::Rpm;
            }
        }
        InstallFormat::AppImage
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        InstallFormat::Unknown
    }
}

#[tauri::command]
pub fn get_install_format() -> InstallFormat {
    detect_install_format()
}
