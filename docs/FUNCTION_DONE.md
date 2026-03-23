# Project Summary: One Night Ultimate Werewolf Helper
**(一夜終極狼人殺 語音與腳本小幫手)**

## 1. 專案現況 (Current Scope)
本專案為純前端 Web App，提供「角色配置 + 夜晚語音播報 + 腳本複製 + URL 分享」的一站式工具。

- 使用者可勾選角色，系統依 `wakeUpOrder` 自動生成夜晚播報腳本。
- 支援語音播放、停止、語速與音高調整、倒數唸秒。
- 支援一鍵複製完整播報稿、角色腳本、分享網址。
- 目前已實作「快捷配置（3-9 人）」與「基礎卡牌模式」切換。

## 2. 技術架構 (Technical Architecture)
- 前端框架：Vue 3 (Composition API) + TypeScript + Vite
- 樣式：Tailwind CSS
- 資料來源：`src/data/roles.json`（靜態角色資料）
- 關鍵 API：
  - `window.speechSynthesis`：語音播報
  - `navigator.clipboard`：複製功能
  - `URLSearchParams` + `history.replaceState`：狀態同步到網址

## 3. 已完成功能 (Implemented Features)
1. 角色選擇與篩選
- 角色勾選、好人/壞人/已勾選篩選、隊伍摘要顯示。
- 顯示「角色數」與「實際牌數」（含重複卡）。

2. 腳本生成與語音播報
- 依喚醒順序生成完整夜晚腳本。
- 角色動作後包含倒數與閉眼倒數流程。
- 可停止播報並安全中斷當前 session。

3. 快捷配置（3-9 人）
- 支援兩套快捷配置：
  - `基礎卡牌：開` -> 使用基礎卡牌配置
  - `基礎卡牌：關` -> 使用原先配置
- 預設為 `基礎卡牌：開`。
- 點選快捷配置按鈕後，按鈕會高亮；若手動改勾選或切換模式會取消高亮。

4. 可重複卡牌機制
- 快捷配置可指定角色張數（`count`），例如：
  - `werewolf: 2`
  - `sentinel: 2`
- 目前透過 `selectedRoleCountOverrides` 管理單局覆寫張數。
- 預設覆寫保留 `sentinel = 2`（未指定時也會套用）。

5. URL 狀態同步與還原
- 狀態會同步 `roles` 與 `filter` 到網址。
- `roles` 支援重複參數來表示重複卡牌數量（例如 `roles=werewolf&roles=werewolf`）。
- 進入頁面時會從 URL 還原勾選與卡牌張數。

## 4. 基礎卡牌快捷配置規格 (3-9 人)
以下為目前實作版本的基礎卡牌 preset（含中央 3 張）：

- 3 人：`werewolf x2`, `seer`, `robber`, `troublemaker`, `villager`
- 4 人：3 人配置 + `insomniac`
- 5 人：4 人配置 + `tanner`
- 6 人：5 人配置 + `hunter`
- 7 人：6 人配置 + `minion` + `villager`
- 8 人：7 人基礎上改為 `sentinel x2`（並保留其他核心角色）
- 9 人：8 人配置 + `villager`

## 5. 主要檔案與責任 (Key Files)
- `src/App.vue`
  - 角色勾選、快捷配置、URL 同步、語音播報主流程
- `src/data/roles.json`
  - 角色資料（名稱、喚醒順序、台詞、規則）

## 6. 後續可優化項目 (Follow-up Ideas)
- 依當前牌組自動匹配並高亮對應 preset（重新整理後也能自動亮）。
- 提供進階「手動調整張數 UI」（目前重複張數主要由 preset 與 URL 驅動）。
- 將基礎卡牌表格進一步與規則文件做一致性驗證（總張數/組合一致檢查）。
