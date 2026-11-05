pub mod commands;
pub mod state;
pub mod vault;

use commands::benchmark::{run_quick_ping, run_speed_test};
use commands::server_status::{fetch_server_metrics, reboot_server, restart_service, test_connection};
use commands::ssh::{restore_subscription_from_server, rotate_server_keys, run_provisioning};
use commands::subscription::{clear_saved_vps, get_saved_vps, regenerate_subscription_token, save_saved_vps};
use state::AppState;

#[cfg(target_os = "windows")]
pub fn ensure_webview2_loader() {
    use std::env;
    use std::fs;
    use std::path::PathBuf;

    const WEBVIEW2_LOADER_BYTES: &[u8] = include_bytes!("../resources/WebView2Loader.dll");

    // 1. If WebView2Loader.dll already exists next to the executable, we're good
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let local_dll = exe_dir.join("WebView2Loader.dll");
            if local_dll.exists() {
                return;
            }
            // Try unpacking right next to the exe if the directory is writable
            if fs::write(&local_dll, WEBVIEW2_LOADER_BYTES).is_ok() {
                return;
            }
        }
    }

    // 2. Fallback target location: %LOCALAPPDATA%\Votex or %TEMP%\Votex
    let target_dir = env::var_os("LOCALAPPDATA")
        .map(|p| PathBuf::from(p).join("Votex"))
        .unwrap_or_else(|| env::temp_dir().join("Votex"));

    let target_dll = target_dir.join("WebView2Loader.dll");

    let needs_write = match fs::metadata(&target_dll) {
        Ok(meta) => meta.len() != WEBVIEW2_LOADER_BYTES.len() as u64,
        Err(_) => true,
    };

    if needs_write {
        let _ = fs::create_dir_all(&target_dir);
        let _ = fs::write(&target_dll, WEBVIEW2_LOADER_BYTES);
    }

    // Preload library into process space and set DLL directory so delay-load resolves it instantly
    use std::os::windows::ffi::OsStrExt;
    let wide_dll: Vec<u16> = target_dll.as_os_str().encode_wide().chain(Some(0)).collect();
    let wide_dir: Vec<u16> = target_dir.as_os_str().encode_wide().chain(Some(0)).collect();

    extern "system" {
        fn LoadLibraryW(lpLibFileName: *const u16) -> *mut std::ffi::c_void;
        fn SetDllDirectoryW(lpPathName: *const u16) -> i32;
    }

    unsafe {
        SetDllDirectoryW(wide_dir.as_ptr());
        LoadLibraryW(wide_dll.as_ptr());
    }
}

pub fn run() {
    #[cfg(target_os = "windows")]
    ensure_webview2_loader();

    let state = AppState::new().expect("Failed to initialize Votex AppState");

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            run_provisioning,
            test_connection,
            fetch_server_metrics,
            get_saved_vps,
            save_saved_vps,
            clear_saved_vps,
            run_quick_ping,
            run_speed_test,
            restart_service,
            reboot_server,
            regenerate_subscription_token,
            rotate_server_keys,
            restore_subscription_from_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running votex application");
}
