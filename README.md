# Koikatsu Mod Conflict Viewer

A Tauri + React desktop tool for analyzing and managing mod conflicts detected from Koikatsu's `output_log.txt`.

## ✨ Features

- 🧠 **Parse Koikatsu mod conflict logs**
- 📂 Show `Loaded` and `Skipped` mod versions
- 🔍 Display mod metadata: file size, creation date
- 🖱️ Double-click to open mod file
- 🧹 Remove mods (individually or all skipped) to Recycle Bin
- 🔄 Auto-update UI after deletion

---

## 📦 Setup

```bash
# 1. Clone repo
npm install

# 2. Install Rust deps
cargo add trash

# 3. Run Tauri dev
npm run tauri dev
```

Make sure you have:

- `@tauri-apps/plugin-opener` in `package.json`
- Plugin enabled in `tauri.conf.json`
- Capabilities declared in `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    {
      "identifier": "opener:allow-open-path",
      "allow": [{ "path": "C:/" }, { "path": "D:/" }]
    }
  ]
}
```

---

## 🧪 Usage

1. 打開應用
2. 貼上遊戲根目錄（如 `C:\Program Files (x86)\Steam\steamapps\common\Koikatsu`）
3. 點擊 **Parse log**
4. 透過介面：
   - 雙擊 mod 路徑 → 用預設程式開啟
   - 點 **Remove this** ➜ 移除該模組並更新畫面
   - 點 **Remove others** ➜ 刪掉與該 mod 重複的版本

---

## 📁 Log 路徑搜尋順序

此工具會自動在以下位置找 log：

- `Koikatsu/output_log.txt`
- `Koikatsu/Koikatsu_Data/output_log.txt`
- `Koikatsu/BepInEx/LogOutput.log`

---
