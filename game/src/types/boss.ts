/**
 * ボス戦システムの型定義
 * ボスデータ、フェーズ、特殊能力、薔薇の力を管理
 */

/**
 * ボス種別
 */
export enum BossType {
  MINOR_BOSS = 'minor_boss', // 小ボス
  MAJOR_BOSS = 'major_boss', // 中ボス
  CHAPTER_BOSS = 'chapter_boss', // 章ボス
  FINAL_BOSS = 'final_boss', // 最終ボス
}

/**
 * ボス難易度
 */
export enum BossDifficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
  EXTREME = 'extreme',
}

/**
 * 薔薇の力の種類
 */
export enum RoseEssenceType {
  CRIMSON = 'crimson', // 紅の薔薇
  SHADOW = 'shadow', // 影の薔薇
  THORN = 'thorn', // 棘の薔薇
  CURSED = 'cursed', // 呪いの薔薇
}

/**
 * AI性格タイプ
 */
export enum AIPersonality {
  AGGRESSIVE = 'aggressive', // 攻撃的
  DEFENSIVE = 'defensive', // 防御的
  BALANCED = 'balanced', // バランス型
  TACTICAL = 'tactical', // 戦術的
}

/**
 * 能力値修正
 */
export interface StatModifiers {
  maxHP?: number;
  maxMP?: number;
  attack?: number;
  defense?: number;
  magicAttack?: number;
  magicDefense?: number;
  speed?: number;
  movement?: number;
  attackRange?: number;
}

/**
 * ボスフェーズ
 */
export interface BossPhase {
  phaseNumber: number; // フェーズ番号
  hpThreshold: number; // このフェーズに入るHP閾値（%）
  statModifiers: StatModifiers; // 能力値修正
  newAbilities: string[]; // 新規解放される特殊能力ID
  phaseChangeEffect?: string; // フェーズ変化時のエフェクト
}

/**
 * 特殊能力効果
 */
export interface AbilityEffect {
  type: string; // エフェクトタイプ
  value: number; // 効果値
  duration?: number; // 持続時間（ターン数）
  target?: 'self' | 'enemy' | 'ally' | 'area'; // 対象
  range?: number; // 範囲
  description: string; // 効果説明
}

/**
 * ボス特殊能力
 */
export interface BossAbility {
  id: string;
  name: string;
  description: string;
  type: 'passive' | 'active'; // パッシブ/アクティブ
  effect: AbilityEffect;
  cooldown?: number; // クールダウン（ターン数）
  mpCost?: number; // MP消費
}

/**
 * アイテム報酬
 */
export interface ItemReward {
  itemId: string;
  itemName: string;
  quantity: number;
}

/**
 * ボスデータ
 */
export interface BossData {
  id: string;
  name: string;
  title: string; // 称号
  description: string;

  // 薔薇の力
  roseEssenceAmount: number; // 薔薇の力の量
  roseEssenceType: RoseEssenceType; // 薔薇の力の種類

  // ボス特性
  isBoss: true;
  bossType: BossType;
  difficulty: BossDifficulty;

  // フェーズシステム
  phases: BossPhase[];
  currentPhase: number;

  // 特殊能力
  specialAbilities: BossAbility[];

  // AI設定
  aiPersonality: AIPersonality;
  aiPriority: number; // AI優先度

  // 演出設定
  introductionCutscene?: string; // 登場演出
  defeatCutscene?: string; // 撃破演出
  phaseChangeCutscene?: string; // フェーズ変化演出

  // 報酬設定
  experienceReward: number; // 経験値報酬
  additionalRewards?: ItemReward[]; // 追加報酬
}

/**
 * ボス撃破結果
 */
export interface BossDefeatResult {
  bossId: string;
  bossName: string;
  roseEssenceAmount: number;
  roseEssenceType: RoseEssenceType;
  experienceReward: number;
  additionalRewards: ItemReward[];
  timestamp: number;
}

/**
 * ボスフェーズ変化イベント
 */
export interface BossPhaseChangeEvent {
  bossId: string;
  previousPhase: number;
  newPhase: number;
  hpPercentage: number;
  timestamp: number;
}
