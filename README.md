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

> ℹ️ **Info / 注意事項**  
> This tool assumes that `output_log.txt` exists directly under your game directory and contains lines like:  
>  
> ```
> [Warning:Sideloader] Multiple versions detected, only "xxx.zipmod" will be loaded. Skipped versions: "ooo.zipmod"
> ```  
>  
> If the program appears to do nothing after clicking "Parse", please make sure:  
> 1. Your game path is correct  
> 2. The log file (`output_log.txt`) exists and contains conflict warnings  
>  
> These warnings are generated by the `Core.Sideloader` component from the [BepisPlugins](https://github.com/IllusionMods/BepisPlugins) package, specifically in `src/Core_Sideloader/Core.Sideloader.cs`.  
>  
> If you don't see any conflict warnings in the log, or if parsing fails, it might be because you are using an outdated version of BepisPlugins.  
> Versions **before r13** are known **not to emit** the above warning lines.  
>
> Feel free to open an issue or PR if you have ideas to improve this project!  
>  
> 本工具預設 `output_log.txt` 應位於遊戲資料夾根目錄，且內含以下類似內容：  
>  
> ```
> [Warning:Sideloader] Multiple versions detected, only "xxx.zipmod" will be loaded. Skipped versions: "ooo.zipmod"
> ```  
>  
> 若點擊「解析」後程式沒有反應，請先確認：  
> 1. 遊戲路徑是否正確  
> 2. `output_log.txt` 是否存在，且有包含模組衝突的警告訊息  
>  
> 這些警告訊息是由 [BepisPlugins](https://github.com/IllusionMods/BepisPlugins) 套件中的 `Core.Sideloader` 所產生（原始碼路徑：`src/Core_Sideloader/Core.Sideloader.cs`）。  
>  
> 若你使用的版本低於 **r13**，可能不會出現此類警告，導致無法解析。  
>  
> 建議前往以下網址更新 BepisPlugins 至最新版：  
> https://github.com/IllusionMods/BepisPlugins/releases
> 
> 如果有任何優化建議，歡迎發 PR 或 issue！

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
