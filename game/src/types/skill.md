# スキルシステム型定義ドキュメント

## 概要

このドキュメントでは、スキル・アビリティシステムで使用される型定義について説明します。

## 主要な型定義

### 基本列挙型

#### SkillType（スキル種別）

- `ATTACK`: 攻撃スキル
- `HEAL`: 回復スキル
- `BUFF`: バフスキル
- `DEBUFF`: デバフスキル
- `STATUS`: 状態異常スキル
- `SPECIAL`: 特殊スキル

#### TargetType（対象種別）

- `SELF`: 自分自身
- `SINGLE_ENEMY`: 単体（敵）
- `SINGLE_ALLY`: 単体（味方）
- `AREA_ENEMY`: 範囲（敵）
- `ALL_ENEMIES`: 全体（敵）
- など

### 主要インターフェース

#### SkillData

スキルの静的データを定義するインターフェース。JSONファイルから読み込まれます。

```typescript
interface SkillData {
  id: string;
  name: string;
  description: string;
  skillType: SkillType;
  targetType: TargetType;
  range: number;
  areaOfEffect: AreaOfEffect;
  effects: SkillEffect[];
  usageCondition: SkillUsageCondition;
  learnCondition: SkillLearnCondition;
  animation: SkillAnimation;
}
```

#### SkillEffect

スキルの効果を定義するインターフェース。

```typescript
interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'status';
  value: number;
  duration?: number;
  damageType?: DamageType;
  healType?: HealType;
  buffType?: BuffType;
  statusType?: StatusEffectType;
  successRate?: number;
}
```

#### CharacterSkillData

キャラクター個別のスキル状態を管理するインターフェース。

```typescript
interface CharacterSkillData {
  characterId: string;
  learnedSkills: string[];
  skillCooldowns: Map<string, number>;
  skillUsageCounts: Map<string, number>;
  skillLearnHistory: SkillLearnRecord[];
  activeEffects: ActiveSkillEffect[];
}
```

### 抽象基底クラス

#### Skill

全てのスキルが継承する抽象基底クラス。

```typescript
abstract class Skill {
  abstract execute(context: SkillExecutionContext): Promise<SkillResult>;
  abstract canUse(casterId: string, targetPosition: Position, battlefieldState: any): SkillUsabilityResult;
  abstract getValidTargets(casterPosition: Position, battlefieldState: any): Position[];
  
  getAffectedPositions(targetPosition: Position): Position[];
}
```

## 使用例

### スキルデータの定義

```typescript
const fireballData: SkillData = {
  id: 'fireball',
  name: 'ファイアボール',
  description: '火の玉を放つ攻撃魔法',
  skillType: SkillType.ATTACK,
  targetType: TargetType.SINGLE_ENEMY,
  range: 3,
  areaOfEffect: { shape: 'single', size: 1 },
  effects: [{
    type: 'damage',
    value: 50,
    damageType: DamageType.MAGICAL
  }],
  usageCondition: {
    mpCost: 10,
    cooldown: 2,
    usageLimit: 0,
    levelRequirement: 5
  },
  learnCondition: { level: 5 },
  animation: {
    castAnimation: 'fire_cast',
    effectAnimation: 'fireball_effect',
    duration: 1500
  }
};
```

### キャラクタースキルデータの管理

```typescript
const characterSkills: CharacterSkillData = {
  characterId: 'player1',
  learnedSkills: ['fireball', 'heal'],
  skillCooldowns: new Map([['fireball', 2]]),
  skillUsageCounts: new Map([['fireball', 5]]),
  skillLearnHistory: [],
  activeEffects: []
};
```

## エラーハンドリング

スキル使用時のエラーは `SkillUsabilityError` 列挙型で定義されています：

- `INSUFFICIENT_MP`: MP不足
- `SKILL_ON_COOLDOWN`: クールダウン中
- `INVALID_TARGET`: 無効な対象
- `OUT_OF_RANGE`: 射程外
- など

## 拡張性

この型システムは以下の点で拡張可能です：

1. **新しいスキル種別**: `SkillType` 列挙型に追加
2. **新しい効果種別**: `SkillEffect` インターフェースに新しいプロパティを追加
3. **カスタムスキル**: `Skill` 基底クラスを継承して独自のスキルを実装

## テスト

型定義の妥当性は以下のテストファイルで検証されています：

- `tests/game/types/skill.test.ts`: 基本的な型定義のテスト
- `tests/game/types/skill-integration.test.ts`: 既存システムとの統合テスト
