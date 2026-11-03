use tauri::State;
use crate::state::AppState;
use crate::vault::VaultRecord;

#[tauri::command]
pub async fn get_saved_vps(state: State<'_, AppState>) -> Result<Option<VaultRecord>, String> {
    let vault = state.vault.lock().map_err(|_| "Не удалось получить блокировку Vault".to_string())?;
    vault.load_record().map_err(|e| format!("Ошибка загрузки данных из Vault: {}", e))
}

#[tauri::command]
pub async fn save_saved_vps(state: State<'_, AppState>, record: VaultRecord) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|_| "Не удалось получить блокировку Vault".to_string())?;
    vault.save_record(&record).map_err(|e| format!("Ошибка сохранения данных в Vault: {}", e))
}

#[tauri::command]
pub async fn clear_saved_vps(state: State<'_, AppState>) -> Result<(), String> {
    let vault = state.vault.lock().map_err(|_| "Не удалось получить блокировку Vault".to_string())?;
    vault.clear().map_err(|e| format!("Ошибка очистки данных Vault: {}", e))
}
