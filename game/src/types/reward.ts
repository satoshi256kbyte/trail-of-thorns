/**
 * 報酬システムの型定義
 * ステージクリア報酬、ボス報酬、クリア評価を管理
 */

import { RoseEssenceType } from './boss';

/**
 * クリア評価
 */
export enum ClearRating {
  S = 'S',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
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
 * ボス撃破報酬
 */
export interface BossReward {
  bossId: string;
  bossName: string;
  roseEssenceAmount: number; // 薔薇の力の量
  roseEssenceType: RoseEssenceType; // 薔薇の力の種類
  experienceBonus: number; // 経験値ボーナス
}

/**
 * 仲間化報酬
 */
export interface RecruitmentReward {
  characterId: string;
  characterName: string;
  recruitmentBonus: number; // 仲間化ボーナス経験値
}

/**
 * クリア評価ボーナス
 */
export interface ClearRatingBonus {
  rating: ClearRating;
  experienceMultiplier: number; // 経験値倍率
  additionalRewards: ItemReward[]; // 追加報酬
}

/**
 * 特殊報酬
 */
export interface SpecialReward {
  id: string;
  name: string;
  description: string;
  type: string; // 報酬タイプ
  value: any; // 報酬値
}

/**
 * ステージ報酬
 */
export interface StageRewards {
  // 基本報酬
  baseExperience: number;

  // ボス撃破報酬
  bossRewards: BossReward[];

  // 仲間化報酬
  recruitmentRewards: RecruitmentReward[];

  // クリア評価報酬
  clearRatingBonus: ClearRatingBonus;

  // アイテム報酬
  itemRewards: ItemReward[];

  // 特殊報酬
  specialRewards: SpecialReward[];
}

/**
 * ステージパフォーマンス
 */
export interface StagePerformance {
  turnsUsed: number; // 使用ターン数
  unitsLost: number; // 失ったユニット数
  enemiesDefeated: number; // 撃破した敵数
  bossesDefeated: number; // 撃破したボス数
  recruitmentSuccesses: number; // 仲間化成功数
  damageDealt: number; // 与えたダメージ総量
  damageTaken: number; // 受けたダメージ総量
  healingDone: number; // 回復した総量
}

/**
 * 報酬配布結果
 */
export interface RewardDistributionResult {
  success: boolean;
  experienceDistributed: number; // 配布した経験値
  roseEssenceDistributed: number; // 配布した薔薇の力
  itemsDistributed: ItemReward[]; // 配布したアイテム
  recruitedCharacters: string[]; // 仲間化したキャラクターID
  errors: string[]; // エラーメッセージ
}

/**
 * ステージクリア結果
 */
export interface StageCompleteResult {
  stageId: string;
  stageName: string;
  clearRating: ClearRating;
  rewards: StageRewards;
  performance: StagePerformance;
  timestamp: number;
}

/**
 * ステージ失敗結果
 */
export interface StageFailureResult {
  stageId: string;
  stageName: string;
  defeatReason: string;
  turnsPlayed: number;
  timestamp: number;
}
