use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::PathBuf;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum VaultError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Encryption error: failed to encrypt data")]
    EncryptionFailed,
    #[error("Decryption error: invalid key, corrupted ciphertext or tampered data")]
    DecryptionFailed,
    #[error("Corrupted vault file: payload is too short")]
    CorruptedFile,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VaultRecord {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub subscription_token: String,
    pub subscription_url: String,
    pub updated_at: String,
}

pub struct Vault {
    storage_path: PathBuf,
    key: [u8; 32],
}

impl Vault {
    pub fn new() -> Result<Self, VaultError> {
        let storage_path = Self::default_vault_path();
        let key = Self::derive_machine_key();
        Ok(Self { storage_path, key })
    }

    pub fn with_path_and_key(storage_path: PathBuf, key: [u8; 32]) -> Self {
        Self { storage_path, key }
    }

    fn default_vault_path() -> PathBuf {
        let mut path = dirs_or_home_dir();
        path.push(".votex");
        let _ = fs::create_dir_all(&path);
        path.push("vault.bin");
        path
    }

    fn derive_machine_key() -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(b"VOTEX_LOCAL_VAULT_SALT_V1_");
        
        let computer_name = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "VotexHost".to_string());
        let user_name = std::env::var("USERNAME").unwrap_or_else(|_| "VotexUser".to_string());
        let processor_id = std::env::var("PROCESSOR_IDENTIFIER").unwrap_or_else(|_| "X86_CPU".to_string());
        
        hasher.update(computer_name.as_bytes());
        hasher.update(b":");
        hasher.update(user_name.as_bytes());
        hasher.update(b":");
        hasher.update(processor_id.as_bytes());

        let result = hasher.finalize();
        let mut key = [0u8; 32];
        key.copy_from_slice(&result);
        key
    }

    pub fn save_record(&self, record: &VaultRecord) -> Result<(), VaultError> {
        let serialized = serde_json::to_vec(record)?;
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|_| VaultError::EncryptionFailed)?;

        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, serialized.as_ref())
            .map_err(|_| VaultError::EncryptionFailed)?;

        if let Some(parent) = self.storage_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut file = File::create(&self.storage_path)?;
        file.write_all(&nonce_bytes)?;
        file.write_all(&ciphertext)?;
        file.flush()?;

        Ok(())
    }

    pub fn load_record(&self) -> Result<Option<VaultRecord>, VaultError> {
        if !self.storage_path.exists() {
            return Ok(None);
        }

        let mut file = File::open(&self.storage_path)?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;

        if buffer.len() < 12 + 16 {
            return Err(VaultError::CorruptedFile);
        }

        let (nonce_bytes, ciphertext) = buffer.split_at(12);
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|_| VaultError::DecryptionFailed)?;
        let nonce = Nonce::from_slice(nonce_bytes);

        let decrypted = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|_| VaultError::DecryptionFailed)?;

        let record: VaultRecord = serde_json::from_slice(&decrypted)?;
        Ok(Some(record))
    }

    pub fn clear(&self) -> Result<(), VaultError> {
        if self.storage_path.exists() {
            fs::remove_file(&self.storage_path)?;
        }
        Ok(())
    }
}

fn dirs_or_home_dir() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata)
    } else if let Ok(userprofile) = std::env::var("USERPROFILE") {
        PathBuf::from(userprofile)
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home)
    } else {
        std::env::temp_dir()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_encrypt_decrypt_roundtrip() {
        let temp_dir = std::env::temp_dir().join(format!("votex_test_vault_{}", rand::random::<u64>()));
        let _ = fs::create_dir_all(&temp_dir);
        let file_path = temp_dir.join("vault.bin");

        let key = [42u8; 32];
        let vault = Vault::with_path_and_key(file_path.clone(), key);

        let record = VaultRecord {
            host: "192.168.1.100".to_string(),
            port: 22,
            username: "root".to_string(),
            subscription_token: "abcd1234efgh5678".to_string(),
            subscription_url: "http://192.168.1.100:18080/sub/abcd1234efgh5678".to_string(),
            updated_at: "2026-11-03T12:00:00Z".to_string(),
        };

        vault.save_record(&record).expect("Failed to save record");
        let loaded = vault.load_record().expect("Failed to load record");

        assert_eq!(loaded, Some(record));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_vault_tampered_data_fails() {
        let temp_dir = std::env::temp_dir().join(format!("votex_test_vault_tamper_{}", rand::random::<u64>()));
        let _ = fs::create_dir_all(&temp_dir);
        let file_path = temp_dir.join("vault.bin");

        let key = [99u8; 32];
        let vault = Vault::with_path_and_key(file_path.clone(), key);

        let record = VaultRecord {
            host: "10.0.0.1".to_string(),
            port: 22,
            username: "root".to_string(),
            subscription_token: "token_secret_123".to_string(),
            subscription_url: "http://10.0.0.1:18080/sub/token_secret_123".to_string(),
            updated_at: "2026-11-03T12:00:00Z".to_string(),
        };

        vault.save_record(&record).expect("Failed to save record");

        // Tamper with ciphertext byte
        let mut bytes = fs::read(&file_path).expect("Failed to read file");
        if let Some(last_byte) = bytes.last_mut() {
            *last_byte ^= 0xFF;
        }
        fs::write(&file_path, &bytes).expect("Failed to write tampered file");

        let result = vault.load_record();
        assert!(result.is_err(), "Decryption must fail on tampered data");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_vault_empty_when_file_not_found() {
        let temp_dir = std::env::temp_dir().join(format!("votex_test_vault_missing_{}", rand::random::<u64>()));
        let file_path = temp_dir.join("non_existent.bin");

        let key = [1u8; 32];
        let vault = Vault::with_path_and_key(file_path, key);

        let loaded = vault.load_record().expect("Loading missing vault should return Ok(None)");
        assert_eq!(loaded, None);
    }
}
