# 設計書

## 概要

本書は「Trail of Thorns」における章・ステージ管理システムの設計を定義します。このシステムは、4-24ステージで構成される章の進行管理、最大6人のパーティ編成、ステージ解放条件の管理など、ゲーム進行の基盤となる機能を提供します。

## アーキテクチャ

### システム構成

```
ChapterStageManagementSystem
├── ChapterManager (章管理)
│   ├── ChapterState (章状態)
│   ├── ChapterDataLoader (章データ読み込み)
│   └── ChapterPersistence (章永続化)
├── PartyManager (パーティ管理)
│   ├── PartyComposition (パーティ編成)
│   ├── PartyValidator (パーティ検証)
│   └── PartyUI (パーティUI)
├── StageProgressManager (ステージ進行管理)
│   ├── StageUnlockSystem (ステージ解放)
│   ├── StageProgressTracker (進行追跡)
│   └── StageSelectionUI (ステージ選択UI)
└── SaveLoadManager (セーブ・ロード管理)
    ├── SaveDataSerializer (セーブデータシリアライザ)
    ├── SaveDataValidator (セーブデータ検証)
    └── SaveSlotManager (セーブスロット管理)
```

### データフロー

```
タイトル画面
    ↓
章選択画面 ← ChapterManager
    ↓
ステージ選択画面 ← StageProgressManager
    ↓
パーティ編成画面 ← PartyManager
    ↓
ゲームプレイシーン
    ↓
ステージクリア → StageProgressManager (進行状況更新)
    ↓
章完了 → ChapterManager (章状態リセット)
    ↓
セーブ → SaveLoadManager (データ永続化)
```

## コンポーネントとインターフェース

### ChapterManager（章管理システム）

章の進行状況とキャラクター状態を一元管理します。


```typescript
interface ChapterData {
  id: string;
  name: string;
  storyDescription: string;
  stages: StageData[];
  recommendedLevel: number;
  unlockCondition?: UnlockCondition;
}

interface ChapterState {
  chapterId: string;
  currentStageIndex: number;
  lostCharacterIds: string[];
  availableCharacterIds: string[];
  completedStageIds: string[];
  isCompleted: boolean;
  startTime: number;
  playTime: number;
}

class ChapterManager {
  private currentChapter: ChapterState | null = null;
  private chapterData: Map<string, ChapterData> = new Map();
  
  // 章の開始
  startChapter(chapterId: string): void;
  
  // 章の完了
  completeChapter(): void;
  
  // キャラクターロスト処理
  markCharacterAsLost(characterId: string): void;
  
  // 章状態の取得
  getCurrentChapterState(): ChapterState | null;
  
  // 利用可能なキャラクターの取得
  getAvailableCharacters(): string[];
  
  // ロストキャラクターの取得
  getLostCharacters(): string[];
  
  // 章データの読み込み
  loadChapterData(chapterId: string): ChapterData;
  
  // 章状態の保存
  saveChapterState(): ChapterStateData;
  
  // 章状態の復元
  restoreChapterState(data: ChapterStateData): void;
}
```

### PartyManager（パーティ管理システム）

最大6人のパーティ編成とバリデーションを管理します。

```typescript
interface PartyComposition {
  members: string[]; // キャラクターID配列（最大6人）
  formation: FormationType;
}

interface PartyValidationResult {
  isValid: boolean;
  errors: PartyValidationError[];
}

enum PartyValidationError {
  PARTY_FULL = 'PARTY_FULL',
  CHARACTER_LOST = 'CHARACTER_LOST',
  CHARACTER_DUPLICATE = 'CHARACTER_DUPLICATE',
  CHARACTER_NOT_AVAILABLE = 'CHARACTER_NOT_AVAILABLE',
}

class PartyManager {
  private party: PartyComposition;
  private maxPartySize: number = 6;
  
  // キャラクターの追加
  addCharacter(characterId: string): boolean;
  
  // キャラクターの除外
  removeCharacter(characterId: string): boolean;
  
  // パーティのクリア
  clearParty(): void;
  
  // パーティの検証
  validateParty(lostCharacterIds: string[]): PartyValidationResult;
  
  // パーティサイズの確認
  isPartyFull(): boolean;
  
  // パーティの取得
  getParty(): PartyComposition;
  
  // パーティの設定
  setParty(composition: PartyComposition): void;
}
```

### StageProgressManager（ステージ進行管理システム）

ステージの解放条件と進行状況を管理します。

```typescript
interface StageData {
  id: string;
  name: string;
  chapterId: string;
  difficulty: number;
  recommendedLevel: number;
  unlockCondition: StageUnlockCondition;
  rewards: StageReward[];
}

interface StageUnlockCondition {
  type: 'PREVIOUS_STAGE' | 'MULTIPLE_STAGES' | 'CHAPTER_COMPLETE';
  requiredStageIds: string[];
}

interface StageProgress {
  stageId: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  completionTime?: number;
  rewards: StageReward[];
}

class StageProgressManager {
  private stageProgress: Map<string, StageProgress> = new Map();
  
  // ステージのクリア
  completeStage(stageId: string, rewards: StageReward[]): void;
  
  // ステージの解放チェック
  isStageUnlocked(stageId: string): boolean;
  
  // ステージの解放
  unlockStage(stageId: string): void;
  
  // 次のステージの解放
  unlockNextStages(completedStageId: string): void;
  
  // 章の全ステージクリア確認
  isChapterCompleted(chapterId: string): boolean;
  
  // 進行状況の取得
  getStageProgress(stageId: string): StageProgress | null;
  
  // 章内の全ステージ進行状況の取得
  getChapterProgress(chapterId: string): StageProgress[];
  
  // 進行状況の保存
  saveProgress(): StageProgressData;
  
  // 進行状況の復元
  restoreProgress(data: StageProgressData): void;
}
```

### SaveLoadManager（セーブ・ロード管理システム）

ゲーム進行状況の永続化を管理します。

```typescript
interface SaveData {
  version: string;
  timestamp: number;
  chapterState: ChapterStateData;
  stageProgress: StageProgressData;
  partyComposition: PartyComposition;
  playTime: number;
}

interface SaveSlot {
  slotId: number;
  saveData: SaveData | null;
  lastSaved: number;
}

class SaveLoadManager {
  private saveSlots: SaveSlot[] = [];
  private autoSaveEnabled: boolean = true;
  
  // ゲームの保存
  saveGame(slotId: number): boolean;
  
  // ゲームの読み込み
  loadGame(slotId: number): boolean;
  
  // セーブデータの検証
  validateSaveData(data: SaveData): boolean;
  
  // オートセーブ
  autoSave(): void;
  
  // セーブスロットの取得
  getSaveSlots(): SaveSlot[];
  
  // セーブデータの削除
  deleteSaveData(slotId: number): boolean;
  
  // セーブデータのシリアライズ
  serializeSaveData(): string;
  
  // セーブデータのデシリアライズ
  deserializeSaveData(data: string): SaveData;
}
```

## データモデル

### 章データ（JSON）

```json
{
  "id": "chapter-1",
  "name": "薔薇の目覚め",
  "storyDescription": "平和な村に突如現れた魔性の薔薇...",
  "recommendedLevel": 1,
  "stages": [
    {
      "id": "stage-1-1",
      "name": "村の異変",
      "difficulty": 1,
      "recommendedLevel": 1,
      "unlockCondition": {
        "type": "PREVIOUS_STAGE",
        "requiredStageIds": []
      }
    }
  ]
}
```

### セーブデータ（LocalStorage）

```json
{
  "version": "1.0.0",
  "timestamp": 1704067200000,
  "chapterState": {
    "chapterId": "chapter-1",
    "currentStageIndex": 3,
    "lostCharacterIds": ["char-003"],
    "availableCharacterIds": ["char-001", "char-002", "char-004"],
    "completedStageIds": ["stage-1-1", "stage-1-2"],
    "isCompleted": false,
    "playTime": 3600000
  },
  "stageProgress": {
    "stages": [
      {
        "stageId": "stage-1-1",
        "isUnlocked": true,
        "isCompleted": true,
        "completionTime": 1800000
      }
    ]
  },
  "partyComposition": {
    "members": ["char-001", "char-002", "char-004"],
    "formation": "BALANCED"
  },
  "playTime": 3600000
}
```


## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や動作のことです。プロパティは人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ1: 章初期化の完全性

*任意の*章IDに対して、章を開始すると、章データが正しく初期化され、全ての利用可能なキャラクターが設定され、ロストキャラクターリストが空になる

**検証: 要件 1.1**

### プロパティ2: キャラクターロストの一貫性

*任意の*キャラクターに対して、章内でロストすると、そのキャラクターは使用不可リストに追加され、パーティから除外され、利用可能リストから削除される

**検証: 要件 1.2**

### プロパティ3: 章完了時の状態リセット

*任意の*章に対して、章をクリアして次章を開始すると、前章のロスト状態がクリアされ、全キャラクターが再び利用可能になる

**検証: 要件 1.3, 4.1, 4.2**

### プロパティ4: 状態の永続化ラウンドトリップ

*任意の*有効な章状態に対して、保存してから読み込むと、元の状態と等価な状態が復元される（章ID、ステージ、ロストキャラクター、パーティ編成が全て一致）

**検証: 要件 1.4, 1.5, 4.3, 5.1, 5.2**

### プロパティ5: パーティサイズ制限

*任意の*パーティ編成に対して、キャラクターを追加する操作は、パーティサイズが6人未満の場合のみ成功する

**検証: 要件 2.1, 7.4**

### プロパティ6: ロストキャラクター制限

*任意の*ロストキャラクターに対して、そのキャラクターをパーティに追加しようとすると、操作は拒否され、適切なエラーメッセージが返される

**検証: 要件 2.2, 7.5**

### プロパティ7: パーティ編成の有効性

*任意の*有効なパーティ編成に対して、全てのキャラクターが利用可能であり、重複がなく、ロストキャラクターが含まれていない

**検証: 要件 2.4**

### プロパティ8: ステージクリアによる進行

*任意の*ステージに対して、ステージをクリアすると、クリア状態が記録され、解放条件を満たす次のステージが自動的に解放される

**検証: 要件 3.1**

### プロパティ9: ステージ解放条件の遵守

*任意の*未解放ステージに対して、そのステージを選択しようとすると、操作は拒否され、解放条件が表示される

**検証: 要件 3.3**

### プロパティ10: 章完了による次章解放

*任意の*章に対して、章内の全ステージをクリアすると、章完了状態が記録され、次章が解放される

**検証: 要件 3.4**

### プロパティ11: セーブデータの破損検出

*任意の*破損したセーブデータに対して、読み込もうとすると、エラーが検出され、適切なエラーメッセージが表示される

**検証: 要件 5.3**

### プロパティ12: オートセーブの自動実行

*任意の*ステージクリアまたは章完了イベントに対して、オートセーブが有効な場合、自動的に進行状況が保存される

**検証: 要件 5.5**

### プロパティ13: エラーハンドリングの包括性

*任意の*エラー条件（データ読み込み失敗、無効なパーティ編成、未解放ステージへのアクセス、保存失敗）に対して、適切なエラーメッセージが表示され、システムは安全な状態を維持する

**検証: 要件 9.1, 9.2, 9.3, 9.4, 9.5**

### プロパティ14: メモリ管理の効率性

*任意の*章切り替え操作に対して、前章のデータが適切にクリーンアップされ、メモリリークが発生しない

**検証: 要件 10.3**

## エラーハンドリング

### エラー種別

```typescript
enum ChapterStageError {
  // 章管理エラー
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  CHAPTER_NOT_UNLOCKED = 'CHAPTER_NOT_UNLOCKED',
  CHAPTER_ALREADY_STARTED = 'CHAPTER_ALREADY_STARTED',
  
  // パーティ編成エラー
  PARTY_FULL = 'PARTY_FULL',
  CHARACTER_LOST = 'CHARACTER_LOST',
  CHARACTER_NOT_AVAILABLE = 'CHARACTER_NOT_AVAILABLE',
  CHARACTER_DUPLICATE = 'CHARACTER_DUPLICATE',
  
  // ステージ進行エラー
  STAGE_NOT_FOUND = 'STAGE_NOT_FOUND',
  STAGE_NOT_UNLOCKED = 'STAGE_NOT_UNLOCKED',
  STAGE_ALREADY_COMPLETED = 'STAGE_ALREADY_COMPLETED',
  
  // セーブ・ロードエラー
  SAVE_DATA_CORRUPTED = 'SAVE_DATA_CORRUPTED',
  SAVE_SLOT_NOT_FOUND = 'SAVE_SLOT_NOT_FOUND',
  SAVE_FAILED = 'SAVE_FAILED',
  LOAD_FAILED = 'LOAD_FAILED',
  
  // データエラー
  DATA_LOAD_FAILED = 'DATA_LOAD_FAILED',
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
}

class ChapterStageErrorHandler {
  handleError(error: ChapterStageError, context: any): void {
    switch (error) {
      case ChapterStageError.PARTY_FULL:
        this.showMessage('パーティが満員です（最大6人）');
        break;
      case ChapterStageError.CHARACTER_LOST:
        this.showMessage('このキャラクターは章内で使用不可です');
        break;
      case ChapterStageError.STAGE_NOT_UNLOCKED:
        this.showUnlockConditions(context.stageId);
        break;
      case ChapterStageError.SAVE_DATA_CORRUPTED:
        this.showMessage('セーブデータが破損しています');
        this.returnToTitle();
        break;
      default:
        this.showMessage('エラーが発生しました');
        this.logError(error, context);
    }
  }
}
```

### エラーリカバリー

- **データ読み込みエラー**: タイトル画面に戻り、エラーログを記録
- **パーティ編成エラー**: エラーメッセージを表示し、編成画面を維持
- **ステージ解放エラー**: 解放条件を表示し、ステージ選択画面を維持
- **セーブ失敗**: 再試行オプションを提供し、失敗時はエラーログを記録

## テスト戦略

### ユニットテスト

各コンポーネントの個別機能をテストします：

- **ChapterManager**: 章の初期化、キャラクターロスト、状態保存・復元
- **PartyManager**: キャラクター追加・除外、パーティ検証、サイズ制限
- **StageProgressManager**: ステージクリア、解放条件、進行状況管理
- **SaveLoadManager**: セーブデータのシリアライズ・デシリアライズ、検証

### プロパティベーステスト

正確性プロパティを検証するテストを実装します：

- **最小100回の反復**: 各プロパティテストは最小100回実行
- **ランダム入力生成**: 様々な章状態、パーティ編成、ステージ進行をランダムに生成
- **プロパティ検証**: 各プロパティが全ての入力に対して成立することを確認

### 統合テスト

システム間の連携をテストします：

- **章開始からクリアまでのフロー**: 章開始 → ステージクリア → 章完了
- **パーティ編成からステージ開始**: パーティ編成 → 検証 → ステージ開始
- **セーブ・ロードの完全性**: 保存 → 読み込み → 状態検証

### E2Eテスト

完全なゲームフローをテストします：

- **新規ゲーム開始**: 章選択 → ステージ選択 → パーティ編成 → ゲーム開始
- **進行状況の保存・復元**: ゲームプレイ → 保存 → 終了 → 再開 → 状態確認
- **章完了とキャラクター復活**: 章クリア → 次章開始 → ロスト状態リセット確認

### テストカバレッジ目標

- **ユニットテスト**: 90%以上のコードカバレッジ
- **プロパティテスト**: 全14プロパティの検証
- **統合テスト**: 主要なシステム間連携の検証
- **E2Eテスト**: 主要なユーザーフローの検証

