# VictoryConditionDebugCommands - デバッグコマンドガイド

ボス戦・勝利条件システムのデバッグコマンドシステムの使用方法を説明します。

## 概要

VictoryConditionDebugCommandsは、開発者がボス戦・勝利条件システムをテスト・デバッグするためのコンソールコマンドを提供します。

## 初期化

デバッグコマンドは、VictoryConditionSystemが初期化されると自動的に利用可能になります。

```typescript
const victorySystem = new VictoryConditionSystem(scene);
const debugCommands = new VictoryConditionDebugCommands(victorySystem);
```

ブラウザのコンソールで `victoryCommands` オブジェクトが利用可能になります。

## コマンド一覧

### 勝利・敗北強制

#### forceVictory()
すべての目標を強制的に完了し、勝利状態にします。

```javascript
victoryCommands.forceVictory()
// => { success: true, message: '勝利を強制しました', data: {...} }
```

#### forceDefeat(reason?)
敗北状態に強制的に遷移します。

```javascript
victoryCommands.forceDefeat('テスト用敗北')
// => { success: true, message: '敗北を強制しました: テスト用敗北', data: {...} }
```

### ボス操作

#### defeatBoss(bossId)
指定したボスを即座に撃破します。

```javascript
victoryCommands.defeatBoss('boss_1')
// => { success: true, message: "ボス 'Test Boss' を撃破しました", data: {...} }
```

#### listBosses()
登録されているボスの一覧を表示します。

```javascript
victoryCommands.listBosses()
// => { success: true, message: '2 体のボスが登録されています', data: [...] }
```

#### showBossInfo(bossId)
指定したボスの詳細情報を表示します。

```javascript
victoryCommands.showBossInfo('boss_1')
// => { success: true, message: "ボス 'Test Boss' の詳細情報", data: {...} }
```

### 報酬調整

#### setRewardMultiplier(multiplier)
報酬の倍率を設定します。

```javascript
victoryCommands.setRewardMultiplier(2.0)
// => { success: true, message: '報酬倍率を 2x に設定しました', data: {...} }
```

#### getRewardMultiplier()
現在の報酬倍率を取得します。

```javascript
victoryCommands.getRewardMultiplier()
// => { success: true, message: '現在の報酬倍率', data: { multiplier: 2.0 } }
```

#### previewRewards()
現在のパフォーマンスに基づいて報酬をプレビューします。

```javascript
victoryCommands.previewRewards()
// => { success: true, message: '報酬プレビュー', data: {...} }
```

### 目標管理

#### showObjectiveStatus()
すべての目標の達成状態を表形式で表示します。

```javascript
victoryCommands.showObjectiveStatus()
// コンソールに目標の状態がテーブル形式で表示されます
```

#### completeObjective(objectiveId)
指定した目標を強制的に完了します。

```javascript
victoryCommands.completeObjective('obj_defeat_boss')
// => { success: true, message: "目標 'obj_defeat_boss' を完了しました", data: {...} }
```

#### listObjectives()
登録されている目標の一覧を表示します。

```javascript
victoryCommands.listObjectives()
// => { success: true, message: '3 個の目標が登録されています', data: [...] }
```

### システム情報

#### getSystemStatus()
システムの現在の状態を取得します。

```javascript
victoryCommands.getSystemStatus()
// => { 
//   success: true, 
//   message: 'システム状態', 
//   data: {
//     initialized: true,
//     stageComplete: false,
//     stageFailed: false,
//     currentStage: { id: 'stage_1', name: 'Test Stage' },
//     objectives: { total: 3, completed: 1 },
//     bosses: { total: 2 }
//   }
// }
```

#### getPerformance()
ステージのパフォーマンス情報を取得します。

```javascript
victoryCommands.getPerformance()
// => { 
//   success: true, 
//   message: 'ステージパフォーマンス', 
//   data: {
//     turnsUsed: 5,
//     unitsLost: 0,
//     enemiesDefeated: 10,
//     bossesDefeated: 1,
//     recruitmentSuccesses: 2,
//     damageDealt: 500,
//     damageTaken: 200,
//     healingDone: 100
//   }
// }
```

#### clearCache()
パフォーマンスマネージャーのキャッシュをクリアします。

```javascript
victoryCommands.clearCache()
// => { success: true, message: 'キャッシュをクリアしました' }
```

### ヘルプ

#### help()
すべてのコマンドのヘルプを表示します。

```javascript
victoryCommands.help()
// コンソールにヘルプテキストが表示されます
```

## 使用例

### 例1: ステージを素早くクリアする

```javascript
// 1. 現在の目標を確認
victoryCommands.showObjectiveStatus()

// 2. すべてのボスを撃破
victoryCommands.listBosses()
victoryCommands.defeatBoss('boss_1')

// 3. 勝利を強制
victoryCommands.forceVictory()

// 4. 報酬を確認
victoryCommands.previewRewards()
```

### 例2: 報酬をテストする

```javascript
// 1. 報酬倍率を設定
victoryCommands.setRewardMultiplier(3.0)

// 2. 報酬をプレビュー
victoryCommands.previewRewards()

// 3. 倍率を元に戻す
victoryCommands.setRewardMultiplier(1.0)
```

### 例3: ボス情報を確認する

```javascript
// 1. ボス一覧を表示
victoryCommands.listBosses()

// 2. 特定のボスの詳細を確認
victoryCommands.showBossInfo('boss_chapter_1')

// 3. ボスを撃破してテスト
victoryCommands.defeatBoss('boss_chapter_1')
```

### 例4: 敗北シナリオをテストする

```javascript
// 1. 現在の状態を確認
victoryCommands.getSystemStatus()

// 2. 敗北を強制
victoryCommands.forceDefeat('全滅テスト')

// 3. システム状態を再確認
victoryCommands.getSystemStatus()
```

## エラーハンドリング

すべてのコマンドは `CommandResult` オブジェクトを返します：

```typescript
interface CommandResult {
  success: boolean;  // コマンドが成功したかどうか
  message: string;   // 結果メッセージ
  data?: any;        // 追加データ（オプション）
}
```

エラーが発生した場合：

```javascript
victoryCommands.defeatBoss('invalid_boss')
// => { success: false, message: "ボス 'invalid_boss' が見つかりません" }
```

## 注意事項

1. **開発環境専用**: これらのコマンドは開発・デバッグ用です。本番環境では無効化してください。

2. **システム初期化**: ほとんどのコマンドは、VictoryConditionSystemが初期化されている必要があります。

3. **状態の整合性**: デバッグコマンドを使用すると、ゲームの状態が不整合になる可能性があります。テスト後はゲームをリロードすることを推奨します。

4. **パフォーマンス**: 頻繁にコマンドを実行すると、パフォーマンスに影響を与える可能性があります。

## トラブルシューティング

### コマンドが利用できない

```javascript
// victoryCommands が undefined の場合
// => VictoryConditionDebugCommandsが初期化されていません
// => VictoryConditionSystemを先に初期化してください
```

### システムが初期化されていない

```javascript
victoryCommands.showObjectiveStatus()
// => { success: false, message: 'システムが初期化されていません' }

// 解決方法: ステージを開始してシステムを初期化してください
```

### ボスが見つからない

```javascript
victoryCommands.defeatBoss('unknown_boss')
// => { success: false, message: "ボス 'unknown_boss' が見つかりません" }

// 解決方法: listBosses() で正しいボスIDを確認してください
```

## 関連ドキュメント

- [VictoryConditionSystem 設計文書](../../.kiro/specs/3.3-boss-victory-system/design.md)
- [要件ドキュメント](../../.kiro/specs/3.3-boss-victory-system/requirements.md)
- [BattleConsoleCommands](./BattleConsoleCommands.ts) - 戦闘システムのデバッグコマンド

## ライセンス

このプロジェクトのライセンスに従います。
