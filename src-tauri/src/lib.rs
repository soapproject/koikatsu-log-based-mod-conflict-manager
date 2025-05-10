use serde::Serialize;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

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

#[tauri::command]
fn delete_mods(paths: Vec<String>) -> Result<(), String> {
    for path in paths {
        trash::delete(&path).map_err(|e| format!("Failed to delete {}: {}", path, e))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            parse_log,
            read_log_from_path,
            delete_mods
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
