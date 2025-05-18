use std::{
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

use quick_xml::de::from_str;
use regex::Regex;
use serde::{Deserialize, Serialize};
use trash;
use zip::ZipArchive;
use log::{info, error};

// ───────────────────────────────────────────────
// Utility: Wrap function with panic catcher
// ───────────────────────────────────────────────
fn safe_invoke<T>(f: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(f)) {
        Ok(result) => result,
        Err(err) => {
            let panic_msg = if let Some(s) = err.downcast_ref::<&str>() {
                (*s).to_string()
            } else if let Some(s) = err.downcast_ref::<String>() {
                s.clone()
            } else {
                format!("{:?}", err)
            };

            error!("💥 Panic caught in command: {}", panic_msg);
            Err(format!("Internal error occurred: {panic_msg}"))
        }
    }
}

// ───────────────────────────────────────────────
// Data Structures / 資料結構定義
// ───────────────────────────────────────────────

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

#[derive(Serialize)]
struct ModEntry {
    name: String,
    path: String,
    size: u64,
    created: Option<u64>,
}

#[derive(Serialize)]
struct ModConflict {
    loaded: ModEntry,
    skipped: Vec<ModEntry>,
}

// ───────────────────────────────────────────────
// Internal Utility Function
// ───────────────────────────────────────────────

fn build_mod_entry(full_path: &Path, rel_path_for_name: &str) -> ModEntry {
    let name = Path::new(rel_path_for_name)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| rel_path_for_name.to_string());

    let path_str = full_path.to_string_lossy().to_string();

    let metadata = match fs::metadata(full_path) {
        Ok(meta) => Some(meta),
        Err(e) => {
            error!("Failed to read metadata for {}: {}", path_str, e);
            None
        }
    };

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
// Tauri Commands
// ───────────────────────────────────────────────

#[tauri::command]
fn parse_log(log: String, game_path: String) -> Result<Vec<ModConflict>, String> {
    safe_invoke(|| {
        info!("Parsing mod log from path: {}", game_path);

        let mut results = Vec::new();
        let re = Regex::new(
            r#"only\s+"([^"]+)"\s+will be loaded\. Skipped versions:\s+((?:"[^"]+",\s*)*"[^"]+")"#,
        ).map_err(|e| format!("Regex compile error: {}", e))?;

        let base_mods_path = PathBuf::from(&game_path).join("mods");

        for cap in re.captures_iter(&log) {
            let loaded_rel = cap[1].to_string();
            let skipped_raw = cap[2].to_string();

            info!("Found conflict block: loaded = {}, skipped = {}", loaded_rel, skipped_raw);

            let loaded_full = base_mods_path.join(&loaded_rel);
            let loaded = build_mod_entry(&loaded_full, &loaded_rel);

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

        Ok(results)
    })
}

#[tauri::command]
fn read_log_from_path(game_path: String) -> Result<String, String> {
    safe_invoke(|| {
        let root = PathBuf::from(&game_path);
        let candidates = vec![
            root.join("output_log.txt"),
            root.join("Koikatsu_Data").join("output_log.txt"),
            root.join("BepInEx").join("LogOutput.log"),
        ];

        for candidate in &candidates {
            if candidate.exists() {
                info!("Found log file: {:?}", candidate);
                return fs::read_to_string(candidate).map_err(|e| {
                    error!("Failed to read log file {:?}: {}", candidate, e);
                    format!("Failed to read log file: {}", e)
                });
            }
        }

        error!("No known log file found in path: {}", game_path);
        Err("No known log file found in the specified game path.".to_string())
    })
}

#[tauri::command]
fn delete_mods(paths: Vec<String>) -> Result<(), String> {
    safe_invoke(|| {
        for path in paths {
            info!("Deleting mod file: {}", path);
            trash::delete(&path).map_err(|e| {
                error!("Failed to delete {}: {}", path, e);
                format!("Failed to delete {}: {}", path, e)
            })?;
        }
        Ok(())
    })
}

#[tauri::command]
fn read_manifest_from_mod_file(path: String) -> Result<ManifestData, String> {
    safe_invoke(|| {
        info!("Reading manifest from zip file: {}", path);

        let file = File::open(&path).map_err(|e| {
            error!("Failed to open file {}: {}", path, e);
            format!("Failed to open file: {}", e)
        })?;

        let mut archive = ZipArchive::new(file).map_err(|e| {
            error!("Invalid zip file {}: {}", path, e);
            format!("Invalid zip file: {}", e)
        })?;

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i).map_err(|e| {
                error!("Zip error (index {} in {}): {}", i, path, e);
                format!("Zip error: {}", e)
            })?;

            let name = entry.name().to_lowercase();
            if name.ends_with("manifest.xml") {
                let mut content = String::new();
                entry.read_to_string(&mut content).map_err(|e| {
                    error!("Failed to read manifest.xml from {}: {}", path, e);
                    format!("Read error: {}", e)
                })?;

                let manifest: ManifestData = from_str(&content).map_err(|e| {
                    error!("Failed to parse manifest.xml in {}: {}", path, e);
                    format!("XML parse error: {}", e)
                })?;

                info!("Successfully parsed manifest.xml: {:?}", manifest);
                return Ok(manifest);
            }
        }

        error!("manifest.xml not found in zip: {}", path);
        Err("manifest.xml not found in zip file".to_string())
    })
}

// ───────────────────────────────────────────────
// Tauri App Entry
// ───────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("logs".to_string()),
                    },
                ))
                .max_file_size(50000)
                .build(),
        )
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
