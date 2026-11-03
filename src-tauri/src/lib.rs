pub mod commands;
pub mod state;
pub mod vault;

use commands::benchmark::run_quick_ping;
use commands::server_status::{fetch_server_metrics, reboot_server, restart_service, test_connection};
use commands::ssh::run_provisioning;
use commands::subscription::{clear_saved_vps, get_saved_vps, regenerate_subscription_token, save_saved_vps};
use state::AppState;

pub fn run() {
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
            restart_service,
            reboot_server,
            regenerate_subscription_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running votex application");
}
