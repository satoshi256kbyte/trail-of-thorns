# 設計文書

## 概要

経験値・レベルアップシステムは、プレイヤーキャラクターの成長を管理する核となるシステムです。戦闘中の様々な行動を通じて経験値を獲得し、レベルアップによって能力値が成長する仕組みを提供します。

## アーキテクチャ

### システム構成

```
ExperienceSystem (メインコントローラー)
├── ExperienceManager (経験値管理)
├── LevelUpProcessor (レベルアップ処理)
├── GrowthCalculator (能力値成長計算)
├── ExperienceUI (UI表示)
└── ExperienceDataLoader (データ管理)
```

### データフロー

```
戦闘行動 → 経験値獲得判定 → 経験値付与 → レベルアップ判定 → 能力値成長 → UI更新
```

## コンポーネントと インターフェース

### 1. ExperienceSystem (メインコントローラー)

```typescript
export class ExperienceSystem {
    // 経験値獲得処理
    public awardExperience(characterId: string, action: ExperienceAction, context: ExperienceContext): void
    
    // レベルアップ判定・実行
    public checkAndProcessLevelUp(characterId: string): LevelUpResult | null
    
    // 経験値情報取得
    public getExperienceInfo(characterId: string): ExperienceInfo
    
    // システム初期化
    public initialize(experienceData: ExperienceTableData): void
}
```

### 2. ExperienceManager (経験値管理)

```typescript
export class ExperienceManager {
    // 経験値付与
    public addExperience(characterId: string, amount: number, source: ExperienceSource): void
    
    // 現在経験値取得
    public getCurrentExperience(characterId: string): number
    
    // 次レベルまでの必要経験値
    public getExperienceToNextLevel(characterId: string): number
    
    // レベルアップ判定
    public canLevelUp(characterId: string): boolean
}
```

### 3. LevelUpProcessor (レベルアップ処理)

```typescript
export class LevelUpProcessor {
    // レベルアップ実行
    public processLevelUp(character: Unit): LevelUpResult
    
    // 能力値成長処理
    public processStatGrowth(character: Unit, growthRates: GrowthRates): StatGrowthResult
    
    // HP/MP調整
    public adjustCurrentStats(character: Unit, oldMaxHP: number, oldMaxMP: number): void
}
```

### 4. GrowthCalculator (能力値成長計算)

```typescript
export class GrowthCalculator {
    // 成長判定
    public calculateStatGrowth(baseStats: UnitStats, growthRates: GrowthRates): StatGrowthResult
    
    // 成長率取得
    public getGrowthRates(characterId: string, level: number): GrowthRates
    
    // 能力値上限チェック
    public enforceStatLimits(stats: UnitStats): UnitStats
}
```

### 5. ExperienceUI (UI表示)

```typescript
export class ExperienceUI {
    // 経験値獲得表示
    public showExperienceGain(characterId: string, amount: number, source: ExperienceSource): void
    
    // レベルアップ演出
    public showLevelUpEffect(character: Unit, result: LevelUpResult): Promise<void>
    
    // 経験値バー更新
    public updateExperienceBar(characterId: string, current: number, required: number): void
    
    // 成長結果表示
    public showGrowthResults(character: Unit, growthResult: StatGrowthResult): void
}
```

## データモデル

### 経験値テーブル構造

```typescript
interface ExperienceTableData {
    levelRequirements: number[];           // レベル別必要経験値
    experienceGains: {
        attackHit: number;                 // 攻撃命中時獲得経験値
        enemyDefeat: number;               // 敵撃破時獲得経験値
        allySupport: number;               // 味方支援時獲得経験値
        healing: number;                   // 回復時獲得経験値
    };
    maxLevel: number;                      // 最大レベル
}
```

### キャラクター成長率

```typescript
interface GrowthRates {
    hp: number;        // HP成長率 (0-100%)
    mp: number;        // MP成長率 (0-100%)
    attack: number;    // 攻撃力成長率 (0-100%)
    defense: number;   // 防御力成長率 (0-100%)
    speed: number;     // 速度成長率 (0-100%)
    skill: number;     // 技術成長率 (0-100%)
    luck: number;      // 運成長率 (0-100%)
}
```

### レベルアップ結果

```typescript
interface LevelUpResult {
    characterId: string;
    oldLevel: number;
    newLevel: number;
    statGrowth: StatGrowthResult;
    newExperienceRequired: number;
}

interface StatGrowthResult {
    hp: number;        // HP上昇値
    mp: number;        // MP上昇値
    attack: number;    // 攻撃力上昇値
    defense: number;   // 防御力上昇値
    speed: number;     // 速度上昇値
    skill: number;     // 技術上昇値
    luck: number;      // 運上昇値
}
```

## エラーハンドリング

### エラー種別

1. **ExperienceDataError**: 経験値テーブルデータの不正
2. **InvalidCharacterError**: 存在しないキャラクターへの操作
3. **MaxLevelError**: 最大レベル到達後の経験値付与
4. **StatLimitError**: 能力値上限超過

### エラー処理戦略

- データ不正時はデフォルト値で継続
- 存在しないキャラクターは警告ログ出力
- 最大レベル到達時は経験値付与を無視
- 能力値上限超過時は上限値に調整

## テスト戦略

### ユニットテスト

- 経験値計算の正確性
- レベルアップ判定ロジック
- 能力値成長計算
- データ読み込み・検証

### 統合テスト

- 戦闘システムとの連携
- UI表示の同期
- セーブ・ロード機能
- パフォーマンス測定

### シナリオテスト

- 複数キャラクター同時レベルアップ
- 戦闘中レベルアップ処理
- 章跨ぎでの成長継続
- エラー状況での復旧

## パフォーマンス考慮事項

### 最適化ポイント

1. **経験値テーブルキャッシュ**: 頻繁な参照データのメモリキャッシュ
2. **バッチ処理**: 複数キャラクターの経験値処理を一括実行
3. **UI更新制御**: 不要なUI更新を抑制
4. **メモリ管理**: 一時的なオブジェクトの適切な解放

### パフォーマンス目標

- 経験値計算: 100ms以内
- レベルアップ処理: 200ms以内
- UI更新: 50ms以内
- メモリ使用量: 10MB以下

## セキュリティ考慮事項

### データ整合性

- 経験値の不正操作防止
- レベル・能力値の妥当性チェック
- セーブデータの改ざん検出

### 入力検証

- 経験値付与量の範囲チェック
- キャラクターIDの妥当性確認
- 成長率データの範囲検証
