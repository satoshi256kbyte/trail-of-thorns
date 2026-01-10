# 統合セーブ・ロードUIシステム

## 概要

統合セーブ・ロードUIシステムは、「Trail of Thorns」ゲームのセーブデータ管理を統一的に行うためのUIシステムです。プレイヤーは10個のセーブスロットを使用して、ゲームの進行状況を保存・読み込み・削除できます。

## 主要機能

### コア機能

- **10個のセーブスロット**: スロット0（オートセーブ専用）+ スロット1-9（手動セーブ）
- **セーブ機能**: 現在のゲーム状態をスロットに保存
- **ロード機能**: 保存されたゲーム状態を読み込み
- **削除機能**: セーブデータの削除
- **詳細情報表示**: 章名、ステージ、パーティ編成、プレイ時間等
- **確認ダイアログ**: 上書き・ロード・削除時の確認
- **オートセーブ設定**: オートセーブのON/OFF切り替え

### UX機能

- **キーボードナビゲーション**: 矢印キー、Enter、Esc、Tabでの操作
- **視覚的フィードバック**: アニメーション、ローディング表示、メッセージ表示
- **エラーハンドリング**: データ破損、ストレージ利用不可、容量不足の検出と通知

## システム構成

### コンポーネント構成図

```
SaveLoadScene (メインシーン)
├── SaveSlotList (スロット一覧)
│   └── SaveSlotButton × 10 (各スロット)
├── SaveSlotDetailPanel (詳細情報パネル)
├── NavigableMenuButton × 5 (アクションボタン)
│   ├── 保存ボタン
│   ├── 読み込みボタン
│   ├── 削除ボタン
│   ├── オートセーブトグル
│   └── 戻るボタン
├── ConfirmationDialog (確認ダイアログ)
├── ErrorMessage (エラーメッセージ)
├── LoadingSpinner (ローディング表示)
└── KeyboardNavigationManager (キーボード操作)
```

### データフロー

```
[SaveLoadScene]
      ↓
[SaveLoadManager] ← LocalStorage連携
      ↓
[SaveData]
  ├── chapterState (章状態)
  ├── stageProgress (ステージ進行)
  ├── partyComposition (パーティ編成)
  ├── playTime (プレイ時間)
  └── timestamp (保存日時)
```

## 使用方法

### 基本的な使用方法

#### 1. シーンへの遷移

```typescript
// タイトル画面からセーブ・ロード画面へ遷移
SceneTransition.transitionTo(
  this,
  'SaveLoadScene',
  TransitionType.FADE,
  {
    mode: 'save', // または 'load'
    fromScene: 'TitleScene',
    currentGameState: {
      chapterState: {...},
      stageProgress: {...},
      partyComposition: {...},
      playTime: 12345
    }
  }
);
```

#### 2. セーブモードでの使用

```typescript
// セーブモードで起動
const sceneData = {
  mode: 'save',
  fromScene: 'GameplayScene',
  currentGameState: getCurrentGameState()
};

this.scene.start('SaveLoadScene', sceneData);
```

#### 3. ロードモードでの使用

```typescript
// ロードモードで起動
const sceneData = {
  mode: 'load',
  fromScene: 'TitleScene'
};

this.scene.start('SaveLoadScene', sceneData);
```

### キーボード操作

| キー | 機能 |
|------|------|
| ↑/↓ | スロット選択の移動 |
| Tab | ボタン間の移動 |
| Enter | 選択中の項目を実行 |
| Esc | 画面を閉じる / ダイアログを閉じる |

### マウス操作

- **スロットクリック**: スロットを選択
- **ボタンクリック**: アクションを実行
- **ボタンホバー**: ボタンのハイライト表示

## API仕様

### SaveLoadScene

#### コンストラクタ

```typescript
constructor()
```

SaveLoadSceneを初期化します。

#### メソッド

##### create(data?: SceneData): void

シーンを作成し、UIコンポーネントを初期化します。

**パラメータ**:
- `data` (optional): シーンデータ
  - `mode`: 'save' | 'load' - 動作モード
  - `fromScene`: string - 遷移元シーン名
  - `currentGameState`: object - 現在のゲーム状態（セーブモード時）

**例**:
```typescript
scene.create({
  mode: 'save',
  fromScene: 'GameplayScene',
  currentGameState: {
    chapterState: {...},
    stageProgress: {...},
    partyComposition: {...},
    playTime: 12345
  }
});
```

##### shutdown(): void

シーンを終了し、全てのリソースを解放します。

**例**:
```typescript
scene.shutdown();
```

### SaveLoadManager

#### メソッド

##### saveGame(slotId: number, saveData: SaveData): boolean

ゲームデータを指定スロットに保存します。

**パラメータ**:
- `slotId`: number - スロット番号（0-9）
- `saveData`: SaveData - 保存するデータ

**戻り値**:
- `boolean` - 保存成功時はtrue

**例**:
```typescript
const success = saveLoadManager.saveGame(1, {
  chapterState: {...},
  stageProgress: {...},
  partyComposition: {...},
  playTime: 12345,
  timestamp: Date.now()
});
```

##### loadGame(slotId: number): SaveData | null

指定スロットからゲームデータを読み込みます。

**パラメータ**:
- `slotId`: number - スロット番号（0-9）

**戻り値**:
- `SaveData | null` - 読み込んだデータ、失敗時はnull

**例**:
```typescript
const saveData = saveLoadManager.loadGame(1);
if (saveData) {
  // データを使用
}
```

##### deleteSaveData(slotId: number): boolean

指定スロットのデータを削除します。

**パラメータ**:
- `slotId`: number - スロット番号（0-9）

**戻り値**:
- `boolean` - 削除成功時はtrue

**例**:
```typescript
const success = saveLoadManager.deleteSaveData(1);
```

##### getSaveSlots(): SaveSlotInfo[]

全てのスロット情報を取得します。

**戻り値**:
- `SaveSlotInfo[]` - スロット情報の配列

**例**:
```typescript
const slots = saveLoadManager.getSaveSlots();
slots.forEach(slot => {
  console.log(`Slot ${slot.slotId}: ${slot.isEmpty ? 'Empty' : 'Data exists'}`);
});
```

## データ構造

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

### SaveSlotInfo

```typescript
interface SaveSlotInfo {
  slotId: number;
  isEmpty: boolean;
  saveData?: SaveData;
  isCorrupted: boolean;
}
```

## 既存システムとの統合

### ChapterStageManagementSystemとの連携

```typescript
// 章・ステージ管理システムからセーブ
const chapterState = chapterManager.getCurrentChapterState();
const stageProgress = stageProgressManager.getProgress();
const partyComposition = partyManager.getComposition();

saveLoadManager.saveGame(slotId, {
  chapterState,
  stageProgress,
  partyComposition,
  playTime: gameTime.getTotalPlayTime(),
  timestamp: Date.now()
});
```

### ExperienceSystemとの連携

```typescript
// 経験値システムのデータを含めてセーブ
const saveData = {
  chapterState: {...},
  stageProgress: {...},
  partyComposition: {
    characters: partyManager.getCharacters().map(char => ({
      ...char,
      experience: experienceManager.getExperience(char.id),
      level: experienceManager.getLevel(char.id)
    }))
  },
  playTime: gameTime.getTotalPlayTime(),
  timestamp: Date.now()
};
```

### JobSystemとの連携

```typescript
// 職業システムのデータを含めてセーブ
const saveData = {
  chapterState: {...},
  stageProgress: {...},
  partyComposition: {
    characters: partyManager.getCharacters().map(char => ({
      ...char,
      job: jobManager.getJob(char.id),
      jobRank: jobManager.getRank(char.id),
      roseEssence: jobManager.getRoseEssence(char.id)
    }))
  },
  playTime: gameTime.getTotalPlayTime(),
  timestamp: Date.now()
};
```

## テスト

### ユニットテスト

```bash
# 全てのユニットテストを実行
npm test -- tests/game/scenes/SaveLoadScene.test.ts

# 特定のテストを実行
npm test -- tests/game/scenes/SaveLoadScene.autosave.test.ts
npm test -- tests/game/scenes/SaveLoadScene.keyboard.test.ts
npm test -- tests/game/scenes/SaveLoadScene.delete.test.ts
```

### プロパティベーステスト

```bash
# プロパティベーステストを実行
npm test -- tests/game/scenes/SaveLoadScene.pbt.test.ts
npm test -- tests/game/scenes/SaveLoadScene.delete.property.test.ts
npm test -- tests/game/systems/chapterStage/SaveLoadManager.property.test.ts
```

### パフォーマンステスト

```bash
# パフォーマンステストを実行
npm test -- tests/performance/SaveLoadSceneAnimationPerformance.test.ts
```

## トラブルシューティング

### よくある問題

#### 問題: LocalStorageが利用できない

**原因**: ブラウザの設定でLocalStorageが無効化されている

**解決策**:
1. ブラウザの設定を確認
2. プライベートモード/シークレットモードを無効化
3. サイトの設定でCookieとサイトデータを許可

#### 問題: データが破損している

**原因**: LocalStorageのデータが不正な形式

**解決策**:
1. 破損したスロットを削除
2. ブラウザのキャッシュをクリア
3. 新しいスロットにセーブ

#### 問題: 容量不足エラー

**原因**: LocalStorageの容量制限（通常5-10MB）に達している

**解決策**:
1. 不要なセーブデータを削除
2. 他のサイトのLocalStorageデータを削除
3. ブラウザのキャッシュをクリア

## パフォーマンス

### 目標値と実測値

| 指標 | 目標値 | 実測値 | 状態 |
|------|--------|--------|------|
| シーン初期化時間 | < 1秒 | ~0.5秒 | ✅ 達成 |
| セーブ操作時間 | < 2秒 | ~0.3秒 | ✅ 達成 |
| ロード操作時間 | < 3秒 | ~0.5秒 | ✅ 達成 |
| 平均FPS | ≥ 60fps | ~60fps | ✅ 達成 |
| 最小FPS | ≥ 48fps | ~55fps | ✅ 達成 |
| メモリ使用量 | < 100MB | ~50MB | ✅ 達成 |

詳細は[PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md)を参照してください。

## 開発ガイド

### 新しいUIコンポーネントの追加

1. `game/src/ui/`ディレクトリに新しいコンポーネントを作成
2. `SaveLoadScene`に統合
3. ユニットテストを作成
4. ドキュメントを更新

### 新しいアニメーションの追加

1. `SaveLoadScene`にアニメーションメソッドを追加
2. Tweenを使用してアニメーションを実装
3. パフォーマンステストを実行
4. 60fps維持を確認

### 新しいエラーハンドリングの追加

1. `ERROR_MESSAGES`に新しいエラーメッセージを追加
2. エラー検出ロジックを実装
3. `showEnhancedError()`を使用してエラーを表示
4. ユニットテストを作成

## 参照

- [要件定義](./requirements.md)
- [設計書](./design.md)
- [タスク一覧](./tasks.md)
- [パフォーマンス最適化](./PERFORMANCE_OPTIMIZATION.md)

## ライセンス

このプロジェクトは「Trail of Thorns」ゲームの一部です。

## 貢献

バグ報告や機能要望は、GitHubのIssueで受け付けています。

## 変更履歴

### v1.0.0 (2026-01-10)

- 初回リリース
- 10個のセーブスロット機能
- セーブ・ロード・削除機能
- キーボードナビゲーション
- エラーハンドリング
- アニメーション・エフェクト
- パフォーマンス最適化
