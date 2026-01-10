# 統合セーブ・ロードUIシステム API仕様書

## 概要

このドキュメントは、統合セーブ・ロードUIシステムの全てのクラス、メソッド、プロパティの詳細なAPI仕様を提供します。

## 目次

1. [SaveLoadScene](#saveloadscene)
2. [SaveLoadManager](#saveloadmanager)
3. [SaveSlotList](#saveslotlist)
4. [SaveSlotButton](#saveslotbutton)
5. [SaveSlotDetailPanel](#saveslotdetailpanel)
6. [ConfirmationDialog](#confirmationdialog)
7. [ErrorMessage](#errormessage)
8. [LoadingSpinner](#loadingspinner)
9. [データ型定義](#データ型定義)

---

## SaveLoadScene

### 概要

セーブ・ロード画面のメインシーンクラス。Phaser.Sceneを継承し、全てのUIコンポーネントを管理します。

### コンストラクタ

```typescript
constructor()
```

SaveLoadSceneを初期化します。シーンキーは'SaveLoadScene'に設定されます。

**例**:
```typescript
const scene = new SaveLoadScene();
```

### ライフサイクルメソッド

#### preload(): void

Phaserのライフサイクルメソッド。アセットの読み込みを行います（現在は空実装）。

**呼び出しタイミング**: シーン開始時、create()の前

**例**:
```typescript
scene.preload();
```

#### create(data?: SceneData): void

Phaserのライフサイクルメソッド。シーンを作成し、全てのUIコンポーネントを初期化します。

**パラメータ**:
- `data` (optional): シーンデータ
  - `mode`: 'save' | 'load' - 動作モード
  - `fromScene`: string - 遷移元シーン名
  - `currentGameState`: object - 現在のゲーム状態（セーブモード時）

**呼び出しタイミング**: preload()の後

**例**:
```typescript
scene.create({
  mode: 'save',
  fromScene: 'GameplayScene',
  currentGameState: {
    chapterState: { chapterId: 'chapter-1' },
    stageProgress: { stages: [] },
    partyComposition: { members: [] },
    playTime: 12345
  }
});
```

#### update(time: number, delta: number): void

Phaserのライフサイクルメソッド。ゲームループ処理を行います（現在は空実装）。

**パラメータ**:
- `time`: number - ゲーム開始からの経過時間（ミリ秒）
- `delta`: number - 前フレームからの経過時間（ミリ秒）

**呼び出しタイミング**: 毎フレーム

**例**:
```typescript
scene.update(1000, 16);
```

#### destroy(): void

シーンを破棄し、全てのリソースを解放します。メモリリークを防ぐために必ず呼び出してください。

**呼び出しタイミング**: シーン終了時

**例**:
```typescript
scene.destroy();
```

### プライベートメソッド

#### setupBackground(): void

背景グラフィックスを作成します。

#### createTitle(): void

タイトルテキストを作成します。

#### createSaveSlotList(): void

セーブスロット一覧を作成します。

#### createDetailPanel(): void

詳細情報パネルを作成します。

#### createNavigationButtons(): void

ナビゲーションボタン（保存、読み込み、削除、戻る）を作成します。

#### setupKeyboardNavigation(): void

キーボードナビゲーションを初期化します。

#### handleSlotSelect(slotId: number): void

スロット選択時の処理を行います。

**パラメータ**:
- `slotId`: number - 選択されたスロットID（0-9）

#### handleSaveButton(): Promise<void>

保存ボタンクリック時の処理を行います。

#### handleLoadButton(): Promise<void>

読み込みボタンクリック時の処理を行います。

#### handleDeleteButton(): Promise<void>

削除ボタンクリック時の処理を行います。

#### handleBackButton(): Promise<void>

戻るボタンクリック時の処理を行います。

#### showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void

メッセージを表示します。

**パラメータ**:
- `message`: string - 表示するメッセージ
- `type`: 'success' | 'error' | 'warning' | 'info' - メッセージタイプ

---

## SaveLoadManager

### 概要

セーブデータの管理を行うクラス。LocalStorageとの連携を担当します。

### コンストラクタ

```typescript
constructor()
```

SaveLoadManagerを初期化します。

**例**:
```typescript
const manager = new SaveLoadManager();
```

### メソッド

#### saveGame(slotId: number, chapterState: any, stageProgress: any, partyComposition: any, playTime: number): boolean

ゲームデータを指定スロットに保存します。

**パラメータ**:
- `slotId`: number - スロット番号（0-9）
- `chapterState`: any - 章状態データ
- `stageProgress`: any - ステージ進行データ
- `partyComposition`: any - パーティ編成データ
- `playTime`: number - プレイ時間（ミリ秒）

**戻り値**:
- `boolean` - 保存成功時はtrue

**例外**:
- `Error` - LocalStorageが利用できない場合
- `QuotaExceededError` - ストレージ容量不足の場合

**例**:
```typescript
const success = manager.saveGame(
  1,
  { chapterId: 'chapter-1' },
  { stages: [] },
  { members: ['char-1'] },
  12345
);

if (success) {
  console.log('保存成功');
} else {
  console.error('保存失敗');
}
```

#### loadGame(slotId: number): SaveData | null

指定スロットからゲームデータを読み込みます。

**パラメータ**:
- `slotId`: number - スロット番号（0-9）

**戻り値**:
- `SaveData | null` - 読み込んだデータ、失敗時はnull

**例外**:
- `Error` - LocalStorageが利用できない場合
- `Error` - データが破損している場合

**例**:
```typescript
const saveData = manager.loadGame(1);

if (saveData) {
  console.log('読み込み成功:', saveData);
} else {
  console.error('読み込み失敗');
}
```

#### deleteSaveData(slotId: number): boolean

指定スロットのデータを削除します。

**パラメータ**:
- `slotId`: number - スロット番号（0-9）

**戻り値**:
- `boolean` - 削除成功時はtrue

**例外**:
- `Error` - LocalStorageが利用できない場合

**例**:
```typescript
const success = manager.deleteSaveData(1);

if (success) {
  console.log('削除成功');
} else {
  console.error('削除失敗');
}
```

#### getSaveSlots(): SaveSlotInfo[]

全てのスロット情報を取得します。

**戻り値**:
- `SaveSlotInfo[]` - スロット情報の配列

**例**:
```typescript
const slots = manager.getSaveSlots();

slots.forEach(slot => {
  console.log(`Slot ${slot.slotId}:`, slot.isEmpty ? 'Empty' : 'Has data');
});
```

#### validateSaveData(saveData: any): boolean

セーブデータの整合性を検証します。

**パラメータ**:
- `saveData`: any - 検証するセーブデータ

**戻り値**:
- `boolean` - データが有効な場合はtrue

**例**:
```typescript
const isValid = manager.validateSaveData(saveData);

if (!isValid) {
  console.error('データが破損しています');
}
```

#### isLocalStorageAvailable(): boolean

LocalStorageが利用可能かチェックします。

**戻り値**:
- `boolean` - 利用可能な場合はtrue

**例**:
```typescript
if (!manager.isLocalStorageAvailable()) {
  console.error('LocalStorageが利用できません');
}
```

#### getStorageUsage(): { used: number; total: number; percentage: number }

ストレージ使用量を取得します。

**戻り値**:
- `object` - ストレージ使用量情報
  - `used`: number - 使用量（バイト）
  - `total`: number - 総容量（バイト）
  - `percentage`: number - 使用率（0-100）

**例**:
```typescript
const usage = manager.getStorageUsage();

console.log(`使用量: ${usage.percentage}%`);

if (usage.percentage > 90) {
  console.warn('ストレージ容量が不足しています');
}
```

#### isAutoSaveEnabled(): boolean

オートセーブが有効かチェックします。

**戻り値**:
- `boolean` - 有効な場合はtrue

**例**:
```typescript
const isEnabled = manager.isAutoSaveEnabled();

console.log(`オートセーブ: ${isEnabled ? 'ON' : 'OFF'}`);
```

#### setAutoSaveEnabled(enabled: boolean): void

オートセーブの有効/無効を設定します。

**パラメータ**:
- `enabled`: boolean - 有効にする場合はtrue

**例**:
```typescript
manager.setAutoSaveEnabled(true);

console.log('オートセーブを有効にしました');
```

---

## SaveSlotList

### 概要

セーブスロット一覧を管理するクラス。

### コンストラクタ

```typescript
constructor(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onSlotSelect: (slotId: number) => void
)
```

SaveSlotListを初期化します。

**パラメータ**:
- `scene`: Phaser.Scene - 親シーン
- `x`: number - X座標
- `y`: number - Y座標
- `onSlotSelect`: (slotId: number) => void - スロット選択時のコールバック

**例**:
```typescript
const slotList = new SaveSlotList(
  scene,
  150,
  200,
  (slotId) => console.log(`Slot ${slotId} selected`)
);
```

### メソッド

#### create(saveSlots: SaveSlotInfo[]): void

スロット一覧を作成します。

**パラメータ**:
- `saveSlots`: SaveSlotInfo[] - スロット情報の配列

**例**:
```typescript
const saveSlots = manager.getSaveSlots();
slotList.create(saveSlots);
```

#### getSlotButtons(): SaveSlotButton[]

全てのスロットボタンを取得します。

**戻り値**:
- `SaveSlotButton[]` - スロットボタンの配列

**例**:
```typescript
const buttons = slotList.getSlotButtons();

console.log(`スロット数: ${buttons.length}`);
```

#### getSlotButtonById(slotId: number): SaveSlotButton | undefined

指定IDのスロットボタンを取得します。

**パラメータ**:
- `slotId`: number - スロットID

**戻り値**:
- `SaveSlotButton | undefined` - スロットボタン、見つからない場合はundefined

**例**:
```typescript
const button = slotList.getSlotButtonById(1);

if (button) {
  console.log('スロット1のボタンが見つかりました');
}
```

#### destroy(): void

スロット一覧を破棄します。

**例**:
```typescript
slotList.destroy();
```

---

## SaveSlotButton

### 概要

個別のセーブスロットボタンを表すクラス。

### コンストラクタ

```typescript
constructor(
  scene: Phaser.Scene,
  x: number,
  y: number,
  slotId: number,
  saveData: SaveData | null,
  onSelect: (slotId: number) => void
)
```

SaveSlotButtonを初期化します。

**パラメータ**:
- `scene`: Phaser.Scene - 親シーン
- `x`: number - X座標
- `y`: number - Y座標
- `slotId`: number - スロットID
- `saveData`: SaveData | null - セーブデータ（空の場合はnull）
- `onSelect`: (slotId: number) => void - 選択時のコールバック

**例**:
```typescript
const button = new SaveSlotButton(
  scene,
  100,
  100,
  1,
  saveData,
  (slotId) => console.log(`Slot ${slotId} clicked`)
);
```

### メソッド

#### setSelected(selected: boolean): void

選択状態を設定します。

**パラメータ**:
- `selected`: boolean - 選択状態

**例**:
```typescript
button.setSelected(true);
```

#### getId(): string

ボタンのIDを取得します。

**戻り値**:
- `string` - ボタンID（例: 'save-slot-button-1'）

**例**:
```typescript
const id = button.getId();

console.log(`Button ID: ${id}`);
```

---

## SaveSlotDetailPanel

### 概要

選択中のスロットの詳細情報を表示するパネルクラス。

### コンストラクタ

```typescript
constructor(
  scene: Phaser.Scene,
  x: number,
  y: number
)
```

SaveSlotDetailPanelを初期化します。

**パラメータ**:
- `scene`: Phaser.Scene - 親シーン
- `x`: number - X座標
- `y`: number - Y座標

**例**:
```typescript
const detailPanel = new SaveSlotDetailPanel(
  scene,
  800,
  400
);
```

### メソッド

#### updateDetails(slotInfo: SaveSlotInfo): void

詳細情報を更新します。

**パラメータ**:
- `slotInfo`: SaveSlotInfo - スロット情報

**例**:
```typescript
const slotInfo = {
  slotId: 1,
  isEmpty: false,
  saveData: {
    chapterState: { chapterId: 'chapter-1' },
    stageProgress: { stages: [] },
    partyComposition: { members: ['char-1'] },
    playTime: 12345,
    timestamp: Date.now()
  },
  isCorrupted: false
};

detailPanel.updateDetails(slotInfo);
```

#### destroy(): void

詳細パネルを破棄します。

**例**:
```typescript
detailPanel.destroy();
```

---

## ConfirmationDialog

### 概要

確認ダイアログを表示するクラス。

### コンストラクタ

```typescript
constructor(scene: Phaser.Scene)
```

ConfirmationDialogを初期化します。

**パラメータ**:
- `scene`: Phaser.Scene - 親シーン

**例**:
```typescript
const dialog = new ConfirmationDialog(scene);
```

### メソッド

#### show(message: string, onConfirm: () => void, onCancel?: () => void, confirmText?: string, cancelText?: string): void

ダイアログを表示します。

**パラメータ**:
- `message`: string - 確認メッセージ
- `onConfirm`: () => void - 確認時のコールバック
- `onCancel`: () => void (optional) - キャンセル時のコールバック
- `confirmText`: string (optional) - 確認ボタンのテキスト（デフォルト: 'はい'）
- `cancelText`: string (optional) - キャンセルボタンのテキスト（デフォルト: 'いいえ'）

**例**:
```typescript
dialog.show(
  '本当に削除しますか？',
  () => console.log('削除実行'),
  () => console.log('キャンセル'),
  '削除する',
  'キャンセル'
);
```

#### hide(): void

ダイアログを非表示にします。

**例**:
```typescript
dialog.hide();
```

#### destroy(): void

ダイアログを破棄します。

**例**:
```typescript
dialog.destroy();
```

---

## ErrorMessage

### 概要

エラーメッセージを表示するクラス。

### コンストラクタ

```typescript
constructor(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ErrorMessageConfig
)
```

ErrorMessageを初期化します。

**パラメータ**:
- `scene`: Phaser.Scene - 親シーン
- `x`: number - X座標
- `y`: number - Y座標
- `config`: ErrorMessageConfig - エラーメッセージ設定

**例**:
```typescript
const errorMessage = new ErrorMessage(
  scene,
  960,
  540,
  {
    title: 'エラー',
    message: '保存に失敗しました',
    action: '再度お試しください',
    type: 'error',
    duration: 5000
  }
);
```

### メソッド

#### destroy(): void

エラーメッセージを破棄します。

**例**:
```typescript
errorMessage.destroy();
```

---

## LoadingSpinner

### 概要

ローディングスピナーを表示するクラス。

### コンストラクタ

```typescript
constructor(
  scene: Phaser.Scene,
  x: number,
  y: number
)
```

LoadingSpinnerを初期化します。

**パラメータ**:
- `scene`: Phaser.Scene - 親シーン
- `x`: number - X座標
- `y`: number - Y座標

**例**:
```typescript
const spinner = new LoadingSpinner(
  scene,
  960,
  540
);
```

### メソッド

#### show(): void

スピナーを表示します。

**例**:
```typescript
spinner.show();
```

#### hide(): void

スピナーを非表示にします。

**例**:
```typescript
spinner.hide();
```

#### destroy(): void

スピナーを破棄します。

**例**:
```typescript
spinner.destroy();
```

---

## データ型定義

### SaveData

```typescript
interface SaveData {
  chapterState: ChapterStateData;
  stageProgress: StageProgressData;
  partyComposition: PartyCompositionData;
  playTime: number;
  timestamp: number;
}
```

**プロパティ**:
- `chapterState`: ChapterStateData - 章状態データ
- `stageProgress`: StageProgressData - ステージ進行データ
- `partyComposition`: PartyCompositionData - パーティ編成データ
- `playTime`: number - プレイ時間（ミリ秒）
- `timestamp`: number - 保存日時（Unixタイムスタンプ）

### SaveSlotInfo

```typescript
interface SaveSlotInfo {
  slotId: number;
  isEmpty: boolean;
  saveData: SaveData | null;
  isCorrupted: boolean;
}
```

**プロパティ**:
- `slotId`: number - スロットID（0-9）
- `isEmpty`: boolean - 空スロットの場合はtrue
- `saveData`: SaveData | null - セーブデータ（空の場合はnull）
- `isCorrupted`: boolean - データが破損している場合はtrue

### SceneData

```typescript
interface SceneData {
  mode?: 'save' | 'load';
  fromScene?: string;
  currentGameState?: {
    chapterState: any;
    stageProgress: any;
    partyComposition: any;
    playTime: number;
  };
}
```

**プロパティ**:
- `mode`: 'save' | 'load' (optional) - 動作モード
- `fromScene`: string (optional) - 遷移元シーン名
- `currentGameState`: object (optional) - 現在のゲーム状態（セーブモード時）

### ErrorMessageConfig

```typescript
interface ErrorMessageConfig {
  title: string;
  message: string;
  action?: string;
  type: 'error' | 'warning' | 'info';
  duration?: number;
}
```

**プロパティ**:
- `title`: string - エラータイトル
- `message`: string - エラーメッセージ
- `action`: string (optional) - 推奨アクション
- `type`: 'error' | 'warning' | 'info' - メッセージタイプ
- `duration`: number (optional) - 表示時間（ミリ秒、デフォルト: 5000）

---

## エラーコード

### STORAGE_UNAVAILABLE

LocalStorageが利用できない場合のエラー。

**原因**:
- ブラウザの設定でLocalStorageが無効化されている
- プライベートモード/シークレットモードで実行している

**対処法**:
- ブラウザの設定を確認
- プライベートモードを無効化

### QUOTA_EXCEEDED

ストレージ容量が不足している場合のエラー。

**原因**:
- LocalStorageの容量制限（通常5-10MB）に達している

**対処法**:
- 不要なセーブデータを削除
- 他のサイトのLocalStorageデータを削除
- ブラウザのキャッシュをクリア

### DATA_CORRUPTED

セーブデータが破損している場合のエラー。

**原因**:
- LocalStorageのデータが不正な形式
- データの一部が欠損している

**対処法**:
- 破損したスロットを削除
- 新しいスロットにセーブ

### AUTOSAVE_SLOT

スロット0（オートセーブ専用）への手動保存を試みた場合のエラー。

**原因**:
- スロット0を選択して保存ボタンをクリックした

**対処法**:
- スロット1-9を選択して保存

### EMPTY_SLOT

空スロットからのロードを試みた場合のエラー。

**原因**:
- データが存在しないスロットを選択してロードボタンをクリックした

**対処法**:
- データが存在するスロットを選択

---

## 使用例

### 基本的な使用例

```typescript
// シーンの作成
const scene = new SaveLoadScene();

// セーブモードで起動
scene.create({
  mode: 'save',
  fromScene: 'GameplayScene',
  currentGameState: {
    chapterState: { chapterId: 'chapter-1' },
    stageProgress: { stages: [] },
    partyComposition: { members: ['char-1'] },
    playTime: 12345
  }
});

// ロードモードで起動
scene.create({
  mode: 'load',
  fromScene: 'TitleScene'
});
```

### SaveLoadManagerの使用例

```typescript
// マネージャーの作成
const manager = new SaveLoadManager();

// セーブ
const success = manager.saveGame(
  1,
  { chapterId: 'chapter-1' },
  { stages: [] },
  { members: ['char-1'] },
  12345
);

// ロード
const saveData = manager.loadGame(1);

// 削除
const deleted = manager.deleteSaveData(1);

// スロット情報取得
const slots = manager.getSaveSlots();

// オートセーブ設定
manager.setAutoSaveEnabled(true);
```

### エラーハンドリングの例

```typescript
try {
  const success = manager.saveGame(1, chapterState, stageProgress, partyComposition, playTime);
  
  if (!success) {
    console.error('保存失敗');
  }
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    console.error('ストレージ容量不足');
  } else {
    console.error('予期しないエラー:', error);
  }
}
```

---

## バージョン履歴

### v1.0.0 (2026-01-10)

- 初回リリース
- 全てのコアAPI実装完了
- セーブ・ロード・削除機能
- キーボードナビゲーション
- エラーハンドリング
- アニメーション・エフェクト

---

## ライセンス

このプロジェクトは「Trail of Thorns」ゲームの一部です。

## サポート

バグ報告や機能要望は、GitHubのIssueで受け付けています。
