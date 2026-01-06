# ChapterStageManagementSystem - 章・ステージ管理システム

## 概要

ChapterStageManagementSystemは、章・ステージ管理システムのメインコントローラーです。
各マネージャー（ChapterManager、PartyManager、StageProgressManager、SaveLoadManager）を統合し、
システム全体の初期化と状態管理を行います。

## 主な機能

### 1. システム初期化
- 全キャラクターデータの登録
- 各マネージャーの初期化
- システム全体の状態管理

### 2. 章管理
- 章データの読み込みと開始
- 章の完了処理
- 次章への準備

### 3. ステージ管理
- ステージの開始
- ステージのクリア
- ステージ進行状況の追跡

### 4. パーティ管理
- パーティ編成の検証
- キャラクターロスト時のパーティ更新
- 利用可能なキャラクターの管理

### 5. セーブ・ロード
- ゲーム進行状況の保存
- セーブデータの読み込み
- オートセーブ機能

## 使用方法

### 基本的な使用例

```typescript
import { ChapterStageManagementSystem } from './systems/chapterStage/ChapterStageManagementSystem';

// システムの作成
const system = new ChapterStageManagementSystem(scene, {
  autoSaveEnabled: true,
  maxPartySize: 6,
  minPartySize: 1,
  debugMode: false,
});

// システムの初期化
await system.initialize(allCharacters);

// 章の読み込みと開始
await system.loadAndStartChapter('chapter-1');

// ステージの開始
system.startStage('stage-1-1', ['char-001', 'char-002', 'char-003']);

// ステージのクリア
system.completeStage('stage-1-1', rewards);

// キャラクターロスト処理
system.handleCharacterLoss('char-001');

// ゲームの保存
system.saveGame(1); // スロット1に保存

// ゲームの読み込み
system.loadGame(1); // スロット1から読み込み
```

### イベントリスニング

```typescript
// システム初期化完了
system.on('system-initialized', (data) => {
  console.log(`Initialized with ${data.characterCount} characters`);
});

// 章開始
system.on('chapter-started', (data) => {
  console.log(`Chapter ${data.chapterId} started`);
});

// ステージ開始
system.on('stage-started', (data) => {
  console.log(`Stage ${data.stageId} started with party size ${data.partySize}`);
});

// ステージクリア
system.on('stage-completed', (data) => {
  console.log(`Stage ${data.stageId} completed`);
});

// キャラクターロスト
system.on('character-lost', (data) => {
  console.log(`Character ${data.characterId} lost`);
});

// 章完了
system.on('chapter-completed', (data) => {
  console.log(`Chapter ${data.chapterId} completed`);
});

// ゲーム保存
system.on('game-saved', (data) => {
  console.log(`Game saved to slot ${data.slotId}`);
});

// ゲーム読み込み
system.on('game-loaded', (data) => {
  console.log(`Game loaded from slot ${data.slotId}`);
});

// オートセーブ
system.on('auto-saved', () => {
  console.log('Auto save completed');
});
```

### システム状態の取得

```typescript
const state = system.getSystemState();

console.log('System State:', {
  isInitialized: state.isInitialized,
  currentChapterId: state.currentChapterId,
  currentStageId: state.currentStageId,
  partyMemberCount: state.partyMemberCount,
  availableCharacterCount: state.availableCharacterCount,
  lostCharacterCount: state.lostCharacterCount,
  completedStageCount: state.completedStageCount,
});
```

### 各マネージャーへのアクセス

```typescript
// 章マネージャー
const chapterManager = system.getChapterManager();
const chapterState = chapterManager.getCurrentChapterState();

// パーティマネージャー
const partyManager = system.getPartyManager();
const availableCharacters = partyManager.getAvailableCharacters();

// ステージ進行マネージャー
const stageProgressManager = system.getStageProgressManager();
const isUnlocked = stageProgressManager.isStageUnlocked('stage-1-2');

// セーブ・ロードマネージャー
const saveLoadManager = system.getSaveLoadManager();
const saveSlots = saveLoadManager.getSaveSlots();
```

## 設定オプション

### ChapterStageSystemConfig

```typescript
interface ChapterStageSystemConfig {
  /** オートセーブを有効にするか（デフォルト: true） */
  autoSaveEnabled?: boolean;
  
  /** パーティの最大サイズ（デフォルト: 6） */
  maxPartySize?: number;
  
  /** パーティの最小サイズ（デフォルト: 1） */
  minPartySize?: number;
  
  /** デバッグモードを有効にするか（デフォルト: false） */
  debugMode?: boolean;
}
```

## エラーハンドリング

システムの各メソッドは`ChapterStageResult`を返します：

```typescript
interface ChapterStageResult {
  /** 成功フラグ */
  success: boolean;
  
  /** エラータイプ（失敗時） */
  error?: ChapterStageError;
  
  /** メッセージ */
  message: string;
  
  /** 詳細情報 */
  details?: Record<string, unknown>;
}
```

### エラータイプ

```typescript
enum ChapterStageError {
  // 章管理エラー
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  CHAPTER_NOT_UNLOCKED = 'CHAPTER_NOT_UNLOCKED',
  CHAPTER_ALREADY_STARTED = 'CHAPTER_ALREADY_STARTED',
  CHAPTER_NOT_INITIALIZED = 'CHAPTER_NOT_INITIALIZED',
  
  // パーティ編成エラー
  PARTY_FULL = 'PARTY_FULL',
  CHARACTER_LOST = 'CHARACTER_LOST',
  CHARACTER_NOT_AVAILABLE = 'CHARACTER_NOT_AVAILABLE',
  CHARACTER_DUPLICATE = 'CHARACTER_DUPLICATE',
  INVALID_PARTY_COMPOSITION = 'INVALID_PARTY_COMPOSITION',
  
  // ステージ進行エラー
  STAGE_NOT_FOUND = 'STAGE_NOT_FOUND',
  STAGE_NOT_UNLOCKED = 'STAGE_NOT_UNLOCKED',
  STAGE_ALREADY_COMPLETED = 'STAGE_ALREADY_COMPLETED',
  STAGE_NOT_INITIALIZED = 'STAGE_NOT_INITIALIZED',
  
  // セーブ・ロードエラー
  SAVE_DATA_CORRUPTED = 'SAVE_DATA_CORRUPTED',
  SAVE_SLOT_NOT_FOUND = 'SAVE_SLOT_NOT_FOUND',
  SAVE_FAILED = 'SAVE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  
  // データエラー
  DATA_LOAD_FAILED = 'DATA_LOAD_FAILED',
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
}
```

## アーキテクチャ

```
ChapterStageManagementSystem (メインコントローラー)
├── ChapterManager (章管理)
│   ├── 章データの読み込み
│   ├── 章の開始・完了
│   ├── キャラクターロスト処理
│   └── 章状態の永続化
├── PartyManager (パーティ管理)
│   ├── パーティ編成
│   ├── パーティ検証
│   └── キャラクター利用可能性チェック
├── StageProgressManager (ステージ進行管理)
│   ├── ステージ解放条件の評価
│   ├── ステージクリア処理
│   └── 進行状況の追跡
└── SaveLoadManager (セーブ・ロード管理)
    ├── セーブデータのシリアライズ
    ├── セーブデータの検証
    └── セーブスロット管理
```

## テスト

### ユニットテスト

```bash
npm test -- tests/game/systems/chapterStage/ChapterStageManagementSystem.test.ts --run
```

**注意**: 現在、テスト環境でphaser3spectorjsモジュールのインポートエラーが発生します。
これは既存のStageSelectScene.test.tsやChapterSelectScene.test.tsでも同様に発生しており、
プロジェクト全体のテスト環境設定の問題です。テストコード自体は完成していますが、
実行には環境修正が必要です。

### 統合テスト

システム全体の統合テストは、各マネージャーの統合テストで間接的にカバーされています。

## 今後の拡張

1. **章選択UIとの統合**: 章選択画面からの章開始処理
2. **ステージ選択UIとの統合**: ステージ選択画面からのステージ開始処理
3. **パーティ編成UIとの統合**: パーティ編成画面からのパーティ設定
4. **GameplaySceneとの統合**: ゲームプレイシーンでの状態更新
5. **LocalStorage連携**: ブラウザのLocalStorageへの永続化

## 関連ドキュメント

- [要件定義書](../../../.kiro/specs/3.4-chapter-stage-management/requirements.md)
- [設計書](../../../.kiro/specs/3.4-chapter-stage-management/design.md)
- [タスク一覧](../../../.kiro/specs/3.4-chapter-stage-management/tasks.md)
