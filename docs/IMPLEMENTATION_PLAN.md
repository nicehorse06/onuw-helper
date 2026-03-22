# Project Summary: One Night Ultimate Werewolf Helper
**(一夜終極狼人殺 語音與腳本小幫手)**

## 1. 專案背景與遊戲規則 (Game Context)
「一夜終極狼人殺 (One Night Ultimate Werewolf)」是一款快節奏、無淘汰機制的陣營桌遊。
* **核心玩法**：遊戲只經歷「一個夜晚」和「一個白天」。在夜晚，特定角色會依序醒來執行動作（例如：查看別人的牌、交換別人的牌）。到了白天，玩家根據晚上的有限資訊進行推理與辯論，最後投票處決一名玩家。
* **專案痛點**：夜晚的「喚醒順序」與「閉眼秒數」非常嚴格，通常需要專人引導或使用官方 App。本專案旨在打造一個輕量化的 Web App，讓玩家可以自由勾選使用的角色，系統會自動排序並生成對應的「語音引導」與「文字腳本」。

## 2. 技術架構 (Technical Architecture)
本專案為純前端 (Front-end only) 應用，無後端伺服器，將部署於 GitHub Pages。
* **核心框架**：Vue 3 (Composition API) + Vite + TypeScript
* **樣式工具**：Tailwind CSS
* **資料儲存**：無資料庫，角色設定與規則由前端 `JSON` 靜態檔維護。
* **關鍵 Web API**：
    * `window.speechSynthesis`：用於文字轉語音 (TTS) 播報夜晚腳本。
    * `setTimeout` / `Promise`：處理語音播放時的非同步暫停與倒數計時。
    * `URLSearchParams`：將選中的角色狀態序列化至 URL，實現無狀態分享。
    * `navigator.clipboard`：支援一鍵複製生成的純文字腳本。

## 3. 核心功能需求 (Core Features)
1.  **角色選擇器 (Role Selector)**：以 Checkbox 列表呈現所有可用角色，供使用者勾選本局使用的配置。
2.  **動態腳本生成 (Dynamic Script Generation)**：根據勾選的角色，比對 JSON 中的 `wakeUpOrder` (喚醒順序) 進行排序，自動組裝出完整的夜晚台詞。
3.  **非同步語音播報 (Async Voice Announcer)**：將生成的腳本轉換為語音，並在每個角色的動作後加上精準的停頓時間（如 10 秒、15 秒），搭配倒數語音（五、四、三...）。
4.  **網址狀態共享 (URL State Sharing)**：當使用者勾選角色時，即時更新 URL 參數（例如 `?roles=werewolf,seer`）。當其他使用者載入此 URL 時，能自動還原勾選狀態與對應畫面。

## 4. 初始資料結構 (Initial JSON Data Structure)
請依照以下 JSON 結構設計，作為專案的 Single Source of Truth。初始階段包含以下 7 個基礎角色，需嚴格遵守 `wakeUpOrder` 大小排序：

```json
[
  {
    "id": "werewolf",
    "name": "狼人",
    "wakeUpOrder": 10,
    "script": "狼人請睜開眼睛，確認你的同伴。",
    "pauseSeconds": 10,
    "rules": "夜間可以看見其他狼人。如果只有一隻狼人，可以查看一張中央的牌。"
  },
  {
    "id": "minion",
    "name": "爪牙",
    "wakeUpOrder": 20,
    "script": "爪牙請睜開眼睛。狼人請伸出大拇指，讓爪牙確認你們的身分。",
    "pauseSeconds": 10,
    "rules": "爪牙會知道誰是狼人，但狼人不知道誰是爪牙。爪牙的目標是保護狼人。"
  },
  {
    "id": "seer",
    "name": "預言家",
    "wakeUpOrder": 30,
    "script": "預言家請睜開眼睛。你可以查看一名玩家的牌，或兩張備用牌。",
    "pauseSeconds": 15,
    "rules": "可以選擇查看一名其他玩家的底牌，或是查看中央的三張牌中的兩張。"
  },
  {
    "id": "robber",
    "name": "強盜",
    "wakeUpOrder": 40,
    "script": "強盜請睜開眼睛。你可以交換一名玩家的牌並查看。",
    "pauseSeconds": 15,
    "rules": "可以選擇與一名玩家交換底牌，並查看自己換來的新牌。之後你的陣營跟著新牌走。"
  },
  {
    "id": "troublemaker",
    "name": "搗蛋鬼",
    "wakeUpOrder": 50,
    "script": "搗蛋鬼請睜開眼睛。請交換任意兩名玩家的底牌。",
    "pauseSeconds": 15,
    "rules": "盲換任意兩名其他玩家的底牌，不能看換了什麼牌。"
  },
  {
    "id": "drunk",
    "name": "酒鬼",
    "wakeUpOrder": 60,
    "script": "酒鬼請睜開眼睛。請將你的牌與中央的一張牌交換。",
    "pauseSeconds": 10,
    "rules": "必須將自己的底牌與中央三張牌的其中一張盲換，不能看新牌是什麼。"
  },
  {
    "id": "insomniac",
    "name": "失眠者",
    "wakeUpOrder": 70,
    "script": "失眠者請睜開眼睛。請確認你現在的身分。",
    "pauseSeconds": 10,
    "rules": "在夜間最後階段醒來，查看自己的底牌是否被其他人動過。"
  }
]
```