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

1. Input game path.  
輸入遊戲路徑  

2. Click Parse.  
點擊解析按鈕  

![image](https://github.com/user-attachments/assets/554d9a5a-8fe4-4691-aa43-88166de96137)  

3. The program will try to parse `output_log.txt`.  
程式會嘗試解析`output_log.txt`  

![image](https://github.com/user-attachments/assets/6566805c-1a6c-43b4-9838-7c3fe29ad8c1)

4. Double-click to open file, use the remove button to move the file to Recycle Bin.  
雙擊可開啟檔案, 使用移除按鈕送到回收桶  

![image](https://github.com/user-attachments/assets/772cdbd6-284b-40ee-80d5-255de7e69e69)

> ⚠️ **Warning / 注意**  
> This tool does **not** write back to `output_log.txt`. To refresh the log content and see updated conflicts, **you must launch the game once** after making any changes.  
>  
> 本工具**不會寫回 `output_log.txt`**。若要更新衝突狀況，**請在修改完後重新啟動一次遊戲**以刷新 log 內容。

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
