# AIPersonalityシステム

AIPersonalityシステムは、敵キャラクターの行動パターンを多様化し、戦略的な深度を提供するシステムです。

## 概要

このシステムは以下の機能を提供します：

- **性格ベースの行動修正**: 各AIキャラクターに固有の性格特性を付与
- **動的な優先度調整**: ターゲット選択時の優先度を性格に基づいて調整
- **リスク判定**: 性格に応じたリスク許容度による行動選択
- **行動パターンの多様化**: 攻撃的、防御的、支援的、戦術的な行動パターン

## 性格タイプ

### AggressivePersonality（攻撃的）

- **特徴**: 積極的な攻撃を好み、リスクを恐れない
- **行動傾向**: 攻撃行動を優先、低HPの敵を狙う
- **パラメータ**: 攻撃性0.9、防御性0.2、リスク許容度0.8

```typescript
const aggressive = new AggressivePersonality();
console.log(aggressive.getActionModifier(ActionType.ATTACK)); // 高い正の値
console.log(aggressive.shouldTakeRisk(0.7)); // true（高リスクでも挑戦）
```

### DefensivePersonality（防御的）

- **特徴**: 慎重な行動を好み、安全を重視
- **行動傾向**: 防御・待機行動を優先、脅威度の高い敵を警戒
- **パラメータ**: 攻撃性0.3、防御性0.9、リスク許容度0.2

```typescript
const defensive = new DefensivePersonality();
console.log(defensive.getActionModifier(ActionType.DEFEND)); // 高い正の値
console.log(defensive.shouldTakeRisk(0.5)); // false（中程度のリスクでも回避）
```

### SupportPersonality（支援的）

- **特徴**: 味方のサポートを重視し、チームプレイを好む
- **行動傾向**: スキル使用を優先、負傷した味方を重視
- **パラメータ**: 支援性0.9、戦術性0.7

```typescript
const support = new SupportPersonality();
console.log(support.getActionModifier(ActionType.SKILL)); // 高い正の値
// 負傷した味方に対して高い優先度修正値を返す
```

### TacticalPersonality（戦術的）

- **特徴**: 戦略的思考を重視し、効率的な行動を好む
- **行動傾向**: 位置取りとスキル使用を重視、計算されたリスクを取る
- **パラメータ**: 戦術性0.9、バランスの取れた他の値

```typescript
const tactical = new TacticalPersonality();
console.log(tactical.getActionModifier(ActionType.MOVE)); // 位置取りを重視
// 期待値に基づいてリスクを判定
```

### BalancedPersonality（バランス型）

- **特徴**: 全ての要素をバランス良く持つ汎用的な性格
- **行動傾向**: 状況に応じて適応的な行動
- **パラメータ**: 全て0.5のバランス型

## 使用方法

### 基本的な使用

```typescript
import { AIPersonalityFactory, AIPersonalityManager } from './ai/AIPersonality';
import { AIPersonalityType } from '../types/ai';

// 性格の作成
const personality = AIPersonalityFactory.create(AIPersonalityType.AGGRESSIVE);

// 性格管理システムの使用
const manager = new AIPersonalityManager();
manager.assignPersonality('enemy-1', personality);

// 行動修正値の取得
const attackModifier = personality.getActionModifier(ActionType.ATTACK);
const shouldRisk = personality.shouldTakeRisk(0.6);
```

### カスタム性格の作成

```typescript
// ボス敵用のカスタム性格
const bossPersonality = AIPersonalityFactory.createCustom({
    aggressiveness: 0.8,
    defensiveness: 0.6,
    supportiveness: 0.3,
    tacticalness: 0.9,
    riskTolerance: 0.7
});
```

### 動的な性格変更

```typescript
const manager = new AIPersonalityManager();

// 初期性格を設定
manager.assignPersonality('character-1', AIPersonalityFactory.create(AIPersonalityType.BALANCED));

// 戦闘中に性格を変更（例：ダメージを受けて防御的になる）
manager.changePersonality('character-1', AIPersonalityType.DEFENSIVE);

// 履歴の確認
const history = manager.getPersonalityHistory('character-1');
console.log(history); // [BALANCED, DEFENSIVE]
```

## AIControllerとの統合

AIPersonalityシステムは既存のAIControllerと統合されています：

```typescript
export abstract class AIController {
    protected personality: AIPersonality;
    
    protected evaluateAttackTarget(target: Unit, context: AIContext): number {
        let priority = 0;
        
        // 基本優先度
        priority += this.personality.aggressiveness * 10;
        
        // 性格による修正
        priority *= this.personality.getPriorityModifier(target);
        
        return priority;
    }
}
```

## ActionEvaluatorとの統合

ActionEvaluatorでも性格による修正が適用されます：

```typescript
// 評価の内訳に性格修正が含まれる
const breakdown: EvaluationBreakdown = {
    baseScore,
    positionScore,
    threatScore,
    opportunityScore,
    terrainScore,
    personalityModifier: personality.getActionModifier(actionType),
    // ...
};
```

## 要件との対応

### 要件2.1: 攻撃的AIの行動

- `AggressivePersonality`が攻撃行動に高い修正値を提供
- 低HPの敵を優先するロジックを実装

### 要件2.2: 防御的AIの行動

- `DefensivePersonality`が防御・待機行動を優先
- 高いリスク回避傾向を実装

### 要件2.3: 支援AIの行動

- `SupportPersonality`がスキル使用を優先
- 負傷した味方への優先度向上を実装

### 要件4.1-4.2: 難易度調整

- 性格パラメータによる行動パターンの多様化
- 動的な性格変更による適応的な難易度調整

## パフォーマンス考慮事項

- 性格計算は軽量で高速
- キャッシュ機能により繰り返し計算を最適化
- メモリ使用量は最小限に抑制

## デバッグ支援

```typescript
// デバッグ情報の出力
console.log(`Personality: ${personality.type}`);
console.log(`Aggressiveness: ${personality.aggressiveness}`);
console.log(`Attack modifier: ${personality.getActionModifier(ActionType.ATTACK)}`);
console.log(`Risk tolerance: ${personality.riskTolerance}`);
```

## 拡張性

新しい性格タイプは`BaseAIPersonality`を継承して簡単に追加できます：

```typescript
export class BerserkerPersonality extends BaseAIPersonality {
    constructor() {
        super(
            AIPersonalityType.AGGRESSIVE, // または新しいタイプ
            1.0,  // 最大攻撃性
            0.0,  // 最小防御性
            0.0,  // 支援性なし
            0.3,  // 低い戦術性
            1.0   // 最大リスク許容度
        );
    }
    
    // カスタムロジックをオーバーライド
    protected getAttackModifier(): number {
        return this.aggressiveness * 1.2; // より強い攻撃修正
    }
}
```

このシステムにより、AIキャラクターは多様で予測困難な行動パターンを示し、プレイヤーに戦略的な挑戦を提供します。
