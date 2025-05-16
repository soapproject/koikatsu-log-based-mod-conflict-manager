use std::{
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

use regex::Regex;
use serde::{Deserialize, Serialize};
use zip::ZipArchive;
use quick_xml::de::from_str;
use trash;

// ───────────────────────────────────────────────
// Data Structures / 資料結構定義
// ───────────────────────────────────────────────

/// Parsed manifest.xml inside mod zip
/// 解析 zip 模組中的 manifest.xml
#[derive(Debug, Serialize, Deserialize)]
pub struct ManifestData {
    pub guid: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
}

/// Entry representing one mod (either loaded or skipped)
/// 單一模組資料結構（可為 loaded 或 skipped）
#[derive(Serialize)]
struct ModEntry {
    name: String,
    path: String,
    size: u64,
    created: Option<u64>,
}

/// Conflict block in log: one loaded mod + multiple skipped mods
/// 衝突項目：一個 loaded mod 與多個被跳過的 mod
#[derive(Serialize)]
struct ModConflict {
    loaded: ModEntry,
    skipped: Vec<ModEntry>,
}

// ───────────────────────────────────────────────
// Utility Function / 工具函式
// ───────────────────────────────────────────────

/// Build a ModEntry struct from file metadata
/// 從檔案資訊建構 ModEntry 結構
fn build_mod_entry(full_path: &Path, rel_path_for_name: &str) -> ModEntry {
    let name = Path::new(rel_path_for_name)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| rel_path_for_name.to_string());

    let path_str = full_path.to_string_lossy().to_string();

    let metadata = fs::metadata(full_path).ok();
    let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
    let created = metadata
        .and_then(|m| m.created().ok())
        .and_then(|c| c.duration_since(UNIX_EPOCH).ok())
        .map(|dur| dur.as_secs());

    ModEntry {
        name,
        path: path_str,
        size,
        created,
    }
}

// ───────────────────────────────────────────────
// Tauri Commands / 可由前端呼叫的函式
// ───────────────────────────────────────────────

/// Parse the log and extract all mod conflicts
/// 解析 log 字串，抓出所有模組衝突紀錄
#[tauri::command]
fn parse_log(log: String, game_path: String) -> Vec<ModConflict> {
    let mut results = Vec::new();
    let re = Regex::new(r#"only\s+"([^"]+)"\s+will be loaded\. Skipped versions:\s+((?:"[^"]+",\s*)*"[^"]+")"#).unwrap();
    let base_mods_path = PathBuf::from(game_path).join("mods");

    for cap in re.captures_iter(&log) {
        let loaded_rel = cap[1].to_string();
        let loaded_full = base_mods_path.join(&loaded_rel);
        let loaded = build_mod_entry(&loaded_full, &loaded_rel);

        let skipped_raw = cap[2].to_string();
        let skipped = skipped_raw
            .split(", ")
            .map(|s| s.trim_matches('"').to_string())
            .map(|rel_path| {
                let full_path = base_mods_path.join(&rel_path);
                build_mod_entry(&full_path, &rel_path)
            })
            .collect::<Vec<_>>();

        results.push(ModConflict { loaded, skipped });
    }

    results
}

/// Try to find and read the Koikatsu log file
/// 嘗試讀取 Koikatsu 的 log 檔案（從常見路徑中找）
#[tauri::command]
fn read_log_from_path(game_path: String) -> Result<String, String> {
    let root = PathBuf::from(game_path);
    let candidates = vec![
        root.join("output_log.txt"),
        root.join("Koikatsu_Data").join("output_log.txt"),
        root.join("BepInEx").join("LogOutput.log"),
    ];

    for candidate in candidates {
        if candidate.exists() {
            return fs::read_to_string(candidate)
                .map_err(|e| format!("Failed to read log file: {}", e));
        }
    }

    Err("No known log file found in the specified game path.".to_string())
}

/// Move mod files to Recycle Bin
/// 將指定模組檔案丟進回收桶
#[tauri::command]
fn delete_mods(paths: Vec<String>) -> Result<(), String> {
    for path in paths {
        trash::delete(&path).map_err(|e| format!("Failed to delete {}: {}", path, e))?;
    }
    Ok(())
}

/// Open and extract manifest.xml from mod file
/// 開啟 zip 檔並解析其中的 manifest.xml
#[tauri::command]
fn read_manifest_from_mod_file(path: String) -> Result<ManifestData, String> {
    let file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Invalid zip file: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("Zip error: {}", e))?;
        let name = entry.name().to_lowercase();
        if name.ends_with("manifest.xml") {
            let mut content = String::new();
            entry.read_to_string(&mut content).map_err(|e| format!("Read error: {}", e))?;

            let manifest: ManifestData = from_str(&content)
                .map_err(|e| format!("XML parse error: {}", e))?;

            return Ok(manifest);
        }
    }

    Err("manifest.xml not found in zip file".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            parse_log,
            read_log_from_path,
            delete_mods,
            read_manifest_from_mod_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
