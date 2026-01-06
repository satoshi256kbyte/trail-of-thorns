# 章・ステージ管理システム デバッグツール

## 概要

章・ステージ管理システムの開発とデバッグを支援するツール群です。

## 提供機能

### 1. ChapterStageDebugManager

章・ステージ管理システムの状態を可視化し、デバッグ情報を収集します。

#### 主な機能

- 章状態の可視化
- ステージ進行状況の表示
- パーティ情報の表示
- セーブデータ情報の表示
- パフォーマンスメトリクスの記録

#### 使用方法

```typescript
import { ChapterStageDebugManager } from './debug/ChapterStageDebugManager';

// デバッグマネージャーの作成
const debugManager = new ChapterStageDebugManager(scene);

// デバッグモードの有効化
debugManager.enableDebugMode();

// 章状態の更新
debugManager.updateChapterState({
  chapterId: 'chapter-1',
  chapterName: '薔薇の目覚め',
  currentStageIndex: 2,
  totalStages: 10,
  completedStages: 2,
  lostCharacters: ['char-003'],
  availableCharacters: ['char-001', 'char-002', 'char-004'],
  partyMembers: ['char-001', 'char-002'],
  isCompleted: false,
  playTime: 3600000,
});

// デバッグレポートの生成
const report = debugManager.generateDebugReport();
console.log(report);
```

#### コンソールコマンド

```javascript
// デバッグモードの切り替え
chapterStageDebug.enable();
chapterStageDebug.disable();
chapterStageDebug.toggle();

// デバッグ情報の表示
chapterStageDebug.showChapter(); // 章情報
chapterStageDebug.showStages(); // ステージ情報
chapterStageDebug.showParty(); // パーティ情報
chapterStageDebug.showSaveData(); // セーブデータ情報

// レポート生成
chapterStageDebug.report();

// パフォーマンスメトリクス
chapterStageDebug.metrics();

// ヘルプ表示
chapterStageDebug.help();
```

### 2. ChapterStageSaveDataValidator

セーブデータの検証と修復を行います。

#### 主な機能

- データ構造の検証
- バージョン互換性チェック
- データ整合性チェック
- 破損データの検出
- 自動修復機能

#### 使用方法

```typescript
import { ChapterStageSaveDataValidator } from './debug/ChapterStageSaveDataValidator';

const validator = new ChapterStageSaveDataValidator();

// セーブデータの検証
const validationResult = validator.validateSaveData(saveData);

if (!validationResult.isValid) {
  console.log('検証エラー:', validationResult.errors);
  console.log('警告:', validationResult.warnings);

  // 修復可能な場合は修復
  if (validationResult.canBeRepaired) {
    const repairResult = validator.repairSaveData(saveData);

    if (repairResult.success) {
      console.log('修復成功:', repairResult.appliedFixes);
      // 修復されたデータを使用
      const repairedData = repairResult.repairedData;
    }
  }
}

// セーブデータの比較
const differences = validator.compareSaveData(saveData1, saveData2);
console.log('差分:', differences);
```

#### 検証項目

1. **基本構造**
   - 必須フィールドの存在確認
   - データ型の検証

2. **バージョン**
   - バージョン情報の存在確認
   - サポートバージョンのチェック

3. **章状態**
   - 必須フィールドの検証
   - 配列フィールドの型チェック
   - ステージインデックスの妥当性
   - キャラクターリストの整合性

4. **ステージ進行状況**
   - ステージ配列の検証
   - 解放・完了状態の整合性
   - ステージIDの存在確認

5. **パーティ編成**
   - パーティサイズの検証
   - メンバーの重複チェック
   - ロストキャラクターの混入チェック

6. **データ整合性**
   - パーティとロストキャラクターの整合性
   - パーティと利用可能キャラクターの整合性

### 3. ChapterStageConsoleCommands

開発者向けコンソールコマンドを提供します。

#### 使用方法

```typescript
import { ChapterStageConsoleCommands } from './debug/ChapterStageConsoleCommands';

const consoleCommands = new ChapterStageConsoleCommands(debugManager);

// マネージャー参照の設定
consoleCommands.setManagers({
  chapterManager,
  partyManager,
  stageProgressManager,
  saveLoadManager,
});
```

#### コンソールコマンド一覧

##### 章操作

```javascript
// 章を開始
chapterStage.startChapter('chapter-1');

// 章を完了
chapterStage.completeChapter();

// 章をリセット
chapterStage.resetChapter();

// 現在ステージを設定
chapterStage.setStage(5);
```

##### キャラクター操作

```javascript
// キャラクターをロスト状態に
chapterStage.loseCharacter('char-003');

// キャラクターを復活
chapterStage.reviveCharacter('char-003');

// 全キャラクターを復活
chapterStage.reviveAll();

// キャラクター一覧表示
chapterStage.listCharacters();
```

##### パーティ操作

```javascript
// パーティに追加
chapterStage.addToParty('char-001');

// パーティから除外
chapterStage.removeFromParty('char-001');

// パーティをクリア
chapterStage.clearParty();

// パーティ情報表示
chapterStage.showParty();
```

##### ステージ操作

```javascript
// ステージを解放
chapterStage.unlockStage('stage-1-5');

// ステージを完了
chapterStage.completeStage('stage-1-5');

// 全ステージを解放
chapterStage.unlockAllStages();

// 進行状況をリセット
chapterStage.resetStageProgress();
```

##### セーブデータ操作

```javascript
// セーブ
chapterStage.save(1);

// ロード
chapterStage.load(1);

// セーブデータ削除
chapterStage.deleteSave(1);

// セーブスロット一覧
chapterStage.listSaves();

// セーブデータ検証
chapterStage.validateSave(1);

// セーブデータ修復
chapterStage.repairSave(1);
```

##### デバッグ情報

```javascript
// 現在の状態表示
chapterStage.status();

// デバッグレポート生成
chapterStage.report();

// パフォーマンスメトリクス表示
chapterStage.metrics();

// ヘルプ表示
chapterStage.help();
```

## 統合例

```typescript
import { ChapterStageDebugManager } from './debug/ChapterStageDebugManager';
import { ChapterStageConsoleCommands } from './debug/ChapterStageConsoleCommands';

// GameplaySceneでの統合例
export class GameplayScene extends Phaser.Scene {
  private debugManager?: ChapterStageDebugManager;
  private consoleCommands?: ChapterStageConsoleCommands;

  create() {
    // デバッグマネージャーの初期化
    if (process.env.NODE_ENV === 'development') {
      this.debugManager = new ChapterStageDebugManager(this);
      this.consoleCommands = new ChapterStageConsoleCommands(this.debugManager);

      // マネージャー参照の設定
      this.consoleCommands.setManagers({
        chapterManager: this.chapterManager,
        partyManager: this.partyManager,
        stageProgressManager: this.stageProgressManager,
        saveLoadManager: this.saveLoadManager,
      });

      // デバッグモードを有効化
      this.debugManager.enableDebugMode();
    }
  }

  update(time: number, delta: number) {
    // デバッグ情報の更新
    if (this.debugManager) {
      const chapterState = this.chapterManager.getCurrentChapterState();
      if (chapterState) {
        this.debugManager.updateChapterState({
          chapterId: chapterState.chapterId,
          chapterName: this.getChapterName(chapterState.chapterId),
          currentStageIndex: chapterState.currentStageIndex,
          totalStages: this.getTotalStages(chapterState.chapterId),
          completedStages: chapterState.completedStageIds.length,
          lostCharacters: chapterState.lostCharacterIds,
          availableCharacters: chapterState.availableCharacterIds,
          partyMembers: this.partyManager.getParty().members,
          isCompleted: chapterState.isCompleted,
          playTime: chapterState.playTime,
        });
      }
    }
  }
}
```

## パフォーマンスメトリクス

デバッグマネージャーは以下のパフォーマンスメトリクスを記録します：

- **セーブ時間**: 最終/平均セーブ時間、総セーブ回数
- **ロード時間**: 最終/平均ロード時間、総ロード回数
- **バリデーション時間**: 最終バリデーション時間

これらのメトリクスは、システムのパフォーマンス最適化に役立ちます。

## トラブルシューティング

### デバッグ表示が表示されない

1. デバッグモードが有効化されているか確認
   ```javascript
   chapterStageDebug.enable();
   ```

2. シーンが正しく設定されているか確認
   ```typescript
   const debugManager = new ChapterStageDebugManager(scene);
   ```

### コンソールコマンドが動作しない

1. マネージャー参照が設定されているか確認
   ```typescript
   consoleCommands.setManagers({
     chapterManager,
     partyManager,
     stageProgressManager,
     saveLoadManager,
   });
   ```

2. ブラウザのコンソールでコマンドが登録されているか確認
   ```javascript
   console.log(window.chapterStage);
   ```

### セーブデータ検証エラー

1. エラーの詳細を確認
   ```javascript
   chapterStage.validateSave(1);
   ```

2. 修復可能な場合は修復を試行
   ```javascript
   chapterStage.repairSave(1);
   ```

3. 修復できない場合は、エラーメッセージを確認してデータを手動で修正

## 注意事項

- デバッグツールは開発環境でのみ使用してください
- 本番環境では無効化することを推奨します
- コンソールコマンドはゲームの状態を直接変更するため、慎重に使用してください
- セーブデータの修復は必ずバックアップを取ってから実行してください

## 今後の拡張

- ステージデータの可視化
- キャラクター状態の詳細表示
- パーティ編成のシミュレーション
- セーブデータのエクスポート/インポート機能
- デバッグログのファイル出力
