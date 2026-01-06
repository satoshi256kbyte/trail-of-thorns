# LocalStorage連携機能

## 概要

章・ステージ管理システムのデータ永続化機能は、ブラウザのLocalStorageを使用してゲーム進行状況を保存・読み込みします。

## 主要コンポーネント

### LocalStorageManager

LocalStorageへのデータ永続化を管理する低レベルクラスです。

**主な機能:**
- データの保存・読み込み・削除
- オプションの暗号化機能
- ストレージ使用量の監視
- プレフィックスによる名前空間管理

**使用例:**

```typescript
import { LocalStorageManager } from './LocalStorageManager';

// 基本的な使用
const storage = new LocalStorageManager({
  keyPrefix: 'my_game_',
  enableEncryption: false,
});

// データの保存
storage.save('player_data', { name: 'Player1', level: 10 });

// データの読み込み
const result = storage.load('player_data');
if (result.success) {
  console.log(result.data);
}

// データの削除
storage.remove('player_data');
```

**暗号化を有効にする場合:**

```typescript
const storage = new LocalStorageManager({
  keyPrefix: 'my_game_',
  enableEncryption: true,
  encryptionKey: 'your-secret-key-here',
});
```

### SaveLoadManager

ゲーム進行状況の保存・読み込みを管理する高レベルクラスです。

**主な機能:**
- 複数セーブスロットの管理（最大10スロット）
- オートセーブ機能
- セーブデータの検証
- LocalStorageManagerとの統合

**使用例:**

```typescript
import { SaveLoadManager } from './SaveLoadManager';

// 基本的な使用
const saveLoadManager = new SaveLoadManager();

// ゲームの保存
const success = saveLoadManager.saveGame(
  1, // スロットID
  chapterState,
  stageProgress,
  partyComposition,
  playTime
);

// ゲームの読み込み
const saveData = saveLoadManager.loadGame(1);
if (saveData) {
  // ゲーム状態を復元
}

// オートセーブ
saveLoadManager.autoSave(
  chapterState,
  stageProgress,
  partyComposition,
  playTime
);
```

**暗号化を有効にする場合:**

```typescript
const saveLoadManager = new SaveLoadManager(
  true, // 暗号化を有効化
  'your-secret-key-here' // 暗号化キー
);
```

## データ構造

### SaveData

```typescript
interface SaveData {
  version: string;           // セーブデータバージョン
  timestamp: number;         // 保存時刻（ミリ秒）
  chapterState: ChapterStateData;
  stageProgress: StageProgressData;
  partyComposition: PartyComposition;
  playTime: number;          // プレイ時間（ミリ秒）
}
```

### ChapterStateData

```typescript
interface ChapterStateData {
  chapterId: string;
  currentStageIndex: number;
  lostCharacterIds: string[];
  availableCharacterIds: string[];
  completedStageIds: string[];
  isCompleted: boolean;
  startTime: number;
  playTime: number;
  version: string;
  timestamp: number;
}
```

## セーブスロット管理

### スロット構成

- **スロット0**: オートセーブ専用
- **スロット1-9**: 手動セーブ用

### セーブスロット情報の取得

```typescript
const slots = saveLoadManager.getSaveSlots();

slots.forEach(slot => {
  if (slot.saveData) {
    console.log(`スロット${slot.slotId}:`);
    console.log(`  章: ${slot.saveData.chapterState.chapterId}`);
    console.log(`  最終保存: ${new Date(slot.lastSaved).toLocaleString()}`);
  }
});
```

## オートセーブ

オートセーブは以下のタイミングで自動的に実行されます：

1. ステージクリア時
2. 章完了時

```typescript
// オートセーブの有効/無効切り替え
saveLoadManager.setAutoSaveEnabled(true);

// オートセーブの状態確認
const isEnabled = saveLoadManager.isAutoSaveEnabled();
```

## データ検証

セーブデータは読み込み時に自動的に検証されます：

- データ構造の整合性チェック
- バージョン互換性チェック
- 必須フィールドの存在確認

検証に失敗した場合、`loadGame()`は`null`を返します。

## ストレージ使用量の監視

```typescript
const usage = saveLoadManager.getStorageUsage();

console.log(`使用量: ${usage.used} bytes`);
console.log(`合計: ${usage.total} bytes`);
console.log(`使用率: ${usage.percentage}%`);
```

## エラーハンドリング

### LocalStorageが利用できない場合

```typescript
if (!saveLoadManager.isLocalStorageAvailable()) {
  console.error('LocalStorageが利用できません');
  // フォールバック処理
}
```

### セーブ失敗時

```typescript
const success = saveLoadManager.saveGame(1, ...);
if (!success) {
  console.error('セーブに失敗しました');
  // エラー処理
}
```

### ロード失敗時

```typescript
const saveData = saveLoadManager.loadGame(1);
if (!saveData) {
  console.error('ロードに失敗しました');
  // エラー処理
}
```

## セキュリティ考慮事項

### 暗号化機能

現在の実装は簡易的なXOR暗号化を使用しています。これは基本的なデータ保護には十分ですが、本番環境では以下のような強力な暗号化ライブラリの使用を推奨します：

- [crypto-js](https://www.npmjs.com/package/crypto-js)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

### 暗号化キーの管理

暗号化キーは以下の方法で管理することを推奨します：

1. 環境変数から読み込む
2. ユーザーごとに異なるキーを生成する
3. キーをハードコードしない

```typescript
// 環境変数から暗号化キーを取得
const encryptionKey = process.env.GAME_ENCRYPTION_KEY || 'default-key';

const saveLoadManager = new SaveLoadManager(true, encryptionKey);
```

## パフォーマンス最適化

### ストレージ容量の制限

LocalStorageの一般的な制限は5MBです。大量のデータを保存する場合は注意が必要です。

### データ圧縮

将来的にデータ圧縮機能を追加することで、ストレージ使用量を削減できます：

```typescript
const storage = new LocalStorageManager({
  keyPrefix: 'my_game_',
  enableCompression: true, // 将来の実装
});
```

## デバッグ機能

### 全セーブデータのクリア

```typescript
// 開発・デバッグ用
saveLoadManager.clearAllSaveData();
```

### ストレージの内容確認

```typescript
const keys = saveLoadManager.getStorageManager().getAllKeys();
console.log('保存されているキー:', keys);
```

## ブラウザ互換性

LocalStorageは以下のブラウザでサポートされています：

- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge (全バージョン)
- Opera 10.5+

## トラブルシューティング

### LocalStorageが無効になっている

一部のブラウザやプライベートモードでは、LocalStorageが無効になっている場合があります。

```typescript
if (!saveLoadManager.isLocalStorageAvailable()) {
  // 代替手段を提供
  alert('セーブ機能を使用するには、ブラウザのLocalStorageを有効にしてください');
}
```

### ストレージ容量超過

```typescript
const usage = saveLoadManager.getStorageUsage();
if (usage.percentage > 90) {
  console.warn('ストレージ容量が不足しています');
  // 古いセーブデータの削除を促す
}
```

### データ破損

```typescript
const saveData = saveLoadManager.loadGame(1);
if (!saveData) {
  console.error('セーブデータが破損しています');
  // 新規ゲーム開始を促す
}
```

## 今後の拡張予定

1. **データ圧縮**: より効率的なストレージ使用
2. **クラウド同期**: 複数デバイス間でのデータ同期
3. **バックアップ機能**: セーブデータの自動バックアップ
4. **エクスポート/インポート**: セーブデータのファイル出力・読み込み

## 関連ファイル

- `LocalStorageManager.ts`: LocalStorage管理クラス
- `SaveLoadManager.ts`: セーブ・ロード管理クラス
- `SaveDataValidator.ts`: セーブデータ検証クラス
- `ChapterStageManagementSystem.ts`: システム統合クラス
