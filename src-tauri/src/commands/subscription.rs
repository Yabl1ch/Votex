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

#[tauri::command]
pub async fn regenerate_subscription_token() -> Result<String, String> {
    use rand::RngCore;
    let mut bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut bytes);
    let token = bytes.iter().map(|b| format!("{:02x}", b)).collect::<String>();
    Ok(token)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_regenerate_subscription_token() {
        let token = regenerate_subscription_token().await.unwrap();
        assert_eq!(token.len(), 32);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
