# KK Log-Based Mod Conflict Manager

A Tauri + React desktop tool for analyzing and managing mod conflicts detected from Koikatsu's `output_log.txt`.

## 基於 Tauri + React 製作的桌面工具，透過分析 Koikatsu 的 `output_log.txt`，協助你檢視與管理重複的模組衝突。

## 🧠 Motivation / 動機

I made this tool to help me clean up and organize my Koikatsu mod collection. While [KKManager](https://github.com/IllusionMods/KKManager) offers a built-in "remove duplicated mods" function, I’m a mod hoarder and wanted more control over what gets removed.

這個小工具是我為了整理 Koikatsu 的模組寫的。雖然 [KKManager](https://github.com/IllusionMods/KKManager) 有內建移除重複模組功能，不過我是倉鼠人，想自己盤點收藏。

---

## 📦 Install

https://github.com/soapproject/koikatsu-log-based-mod-conflict-manager/releases

## 🧪 Usage

## 🛠️ Dev / 開發環境建置

### Prerequisites / 前置需求

- [Node.js](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/tools/install)

### Run dev / 本地運行

```bash
# Install frontend dependencies
# 安裝前端依賴
npm install

# Fetch Rust (Tauri) dependencies
# 安裝 Rust 依賴
cd src-tauri
cargo fetch
cd ..

# Start Tauri in development mode
# 啟動 Tauri 開發模式
npm run tauri dev
```

To quickly trace the main logic:

- Frontend logic is primarily located in [`src/App.tsx`](./src/App.tsx)
- Backend (Rust) logic is primarily located in [`src-tauri/src/lib.rs`](./src-tauri/src/lib.rs)

快速追蹤主要邏輯：

- 前端 [`src/App.tsx`](./src/App.tsx)
- 後端 [`src-tauri/src/lib.rs`](./src-tauri/src/lib.rs)
