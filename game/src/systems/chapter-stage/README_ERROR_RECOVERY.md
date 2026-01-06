# エラーリカバリー機能

## 概要

章・ステージ管理システムのエラーリカバリー機能は、エラー発生時の復旧処理を自動化し、ユーザーに適切なリカバリーオプションを提供します。

## 主な機能

### 1. タイトル画面への復帰

重大なエラー（セーブデータ破損、データ読み込み失敗など）が発生した場合、安全な状態を保存してタイトル画面に戻ります。

```typescript
// 使用例
const errorHandler = new ChapterStageErrorHandler(scene);

// 重大なエラーが発生
await errorHandler.handleError(
  ChapterStageError.SAVE_DATA_CORRUPTED,
  {}
);
// → ユーザーに確認ダイアログを表示
// → 「タイトルに戻る」を選択すると自動的にタイトル画面に遷移
```

### 2. 再試行オプション

セーブ失敗などの一時的なエラーに対して、再試行オプションを提供します。

```typescript
// セーブ失敗時の再試行
await errorHandler.handleError(
  ChapterStageError.SAVE_FAILED,
  { slotId: 1 }
);
// → 「再試行」ボタンを表示
// → 最大3回まで自動的にリトライ可能
```

### 3. 安全な状態の維持

エラー発生時でも、ゲームの状態を安全に保ちます。

- パーティ編成エラー: 編成画面を維持し、エラーメッセージのみ表示
- ステージ解放エラー: 解放条件を表示し、選択画面を維持
- ロードエラー: 別のセーブデータ選択を提案

## リカバリーアクション

### RecoveryAction.RETURN_TO_TITLE

タイトル画面に戻ります。重大なエラーで使用されます。

**対象エラー:**
- `SAVE_DATA_CORRUPTED`: セーブデータ破損
- `DATA_LOAD_FAILED`: データ読み込み失敗

### RecoveryAction.RETRY

操作を再試行します。一時的なエラーで使用されます。

**対象エラー:**
- `SAVE_FAILED`: セーブ失敗
- `LOAD_FAILED`: ロード失敗

### RecoveryAction.CONTINUE

現在の画面を維持し、処理を続行します。

**対象エラー:**
- `PARTY_FULL`: パーティ満員
- `CHARACTER_LOST`: キャラクターロスト
- `STAGE_NOT_UNLOCKED`: ステージ未解放

### RecoveryAction.RESET_STATE

状態をリセットします（将来の拡張用）。

## 使用方法

### 基本的な使用

```typescript
import { ChapterStageErrorHandler } from './ChapterStageErrorHandler';
import { ChapterStageError } from './ChapterStageErrorHandler';

// エラーハンドラーの初期化
const errorHandler = new ChapterStageErrorHandler(scene);

// エラー処理（リカバリー自動実行）
const result = await errorHandler.handleError(
  ChapterStageError.SAVE_FAILED,
  { slotId: 1 }
);

if (result) {
  console.log('リカバリー結果:', result.action);
  console.log('メッセージ:', result.message);
}
```

### リカバリーオプションのカスタマイズ

```typescript
// 最大リトライ回数を指定
await errorHandler.handleError(
  ChapterStageError.SAVE_FAILED,
  { slotId: 1 },
  undefined,
  { maxRetries: 5 }
);

// 再試行ボタンを非表示
await errorHandler.handleError(
  ChapterStageError.SAVE_FAILED,
  { slotId: 1 },
  undefined,
  { showRetryButton: false }
);
```

### イベントリスニング

```typescript
// リカバリーイベントをリスニング
errorHandler.on('retry-save', (data) => {
  console.log('セーブを再試行します:', data);
  // セーブ処理を再実行
});

errorHandler.on('returned-to-title', () => {
  console.log('タイトル画面に戻りました');
  // クリーンアップ処理
});

errorHandler.on('select-save-slot', () => {
  console.log('セーブスロット選択画面を表示');
  // セーブスロット選択UIを表示
});
```

### リトライカウントの管理

```typescript
const recovery = errorHandler.getErrorRecovery();

// 現在のリトライ回数を取得
const retryCount = recovery.getRetryCount('save_1');
console.log('リトライ回数:', retryCount);

// リトライカウントをリセット
recovery.resetRetryCount('save_1');

// 全てのリトライカウントをリセット
recovery.resetRetryCount();
```

## エラー処理フロー

```
エラー発生
    ↓
エラーハンドラーで処理
    ↓
エラーログ記録
    ↓
エラーメッセージ表示
    ↓
リカバリー判定
    ↓
┌─────────────────┐
│ リカバリー必要? │
└─────────────────┘
    ↓ Yes
リカバリー実行
    ↓
┌─────────────────────┐
│ エラー種別に応じた  │
│ リカバリー処理      │
└─────────────────────┘
    ↓
┌─────────────────────┐
│ - タイトルに戻る    │
│ - 再試行            │
│ - 画面維持          │
└─────────────────────┘
    ↓
リカバリー結果を返す
```

## 要件との対応

### 要件 9.1: データ読み込みエラー

- エラーメッセージを表示
- タイトル画面に戻る
- エラーログを記録

### 要件 9.4: セーブデータの保存失敗

- エラーを通知
- 再試行オプションを提供
- 最大リトライ回数の管理

## テスト

### ユニットテスト

```bash
npm test -- tests/game/systems/chapter-stage/ChapterStageErrorRecovery.test.ts --run
```

### 統合テスト

```bash
npm test -- tests/integration/ChapterStageErrorHandlingIntegration.test.ts --run
```

## 注意事項

1. **リカバリー中の新しいリカバリー**: リカバリー処理中は新しいリカバリーを開始できません
2. **最大リトライ回数**: デフォルトは3回、オプションで変更可能
3. **安全な状態の保存**: 重大なエラー時は最小限の情報をLocalStorageに保存
4. **イベント駆動**: リカバリー処理はイベントベースで実装されており、拡張が容易

## 今後の拡張

- [ ] 自動リトライ機能の追加
- [ ] リカバリー履歴の記録
- [ ] カスタムリカバリーアクションの登録
- [ ] リカバリー成功率の統計
