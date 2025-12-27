/**
 * RewardCalculator
 * ステージクリア時の報酬計算システム
 * 
 * 要件4.1, 4.2, 4.3, 4.5に対応
 */

import {
  StageRewards,
  StagePerformance,
  ClearRating,
  BossReward,
  RecruitmentReward,
  ClearRatingBonus,
  ItemReward,
} from '../../types/reward';
import { BossData } from '../../types/boss';

/**
 * ステージデータ（報酬計算に必要な情報）
 */
export interface StageData {
  id: string;
  name: string;
  baseExperienceReward: number;
  targetTurns: number; // 目標ターン数（評価基準）
  maxTurns: number; // 最大ターン数
  itemRewards?: ItemReward[];
}

/**
 * 報酬計算設定
 */
export interface RewardCalculationConfig {
  // 基本経験値の倍率
  baseExperienceMultiplier: number;

  // ボス撃破経験値ボーナス倍率
  bossExperienceMultiplier: number;

  // 仲間化ボーナス経験値
  recruitmentBonusBase: number;

  // クリア評価の経験値倍率
  clearRatingMultipliers: Record<ClearRating, number>;

  // パフォーマンス修正の重み
  performanceWeights: {
    turnsUsed: number;
    unitsLost: number;
    enemiesDefeated: number;
    bossesDefeated: number;
    recruitmentSuccesses: number;
  };
}

/**
 * デフォルト報酬計算設定
 */
const DEFAULT_CONFIG: RewardCalculationConfig = {
  baseExperienceMultiplier: 1.0,
  bossExperienceMultiplier: 2.0,
  recruitmentBonusBase: 100,
  clearRatingMultipliers: {
    [ClearRating.S]: 2.0,
    [ClearRating.A]: 1.5,
    [ClearRating.B]: 1.2,
    [ClearRating.C]: 1.0,
    [ClearRating.D]: 0.8,
  },
  performanceWeights: {
    turnsUsed: 0.3,
    unitsLost: 0.2,
    enemiesDefeated: 0.2,
    bossesDefeated: 0.2,
    recruitmentSuccesses: 0.1,
  },
};

/**
 * RewardCalculator
 * ステージクリア報酬の計算を担当
 */
export class RewardCalculator {
  private config: RewardCalculationConfig;

  constructor(config: Partial<RewardCalculationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 報酬を計算
   * 要件4.1: ステージクリア時の報酬計算
   */
  calculateRewards(
    stageData: StageData,
    performance: StagePerformance,
    defeatedBosses: BossData[],
    recruitedCharacterIds: string[]
  ): StageRewards {
    // 基本報酬計算
    const baseExperience = this.calculateBaseRewards(stageData, performance);

    // ボス撃破報酬計算
    const bossRewards = this.calculateBossRewards(defeatedBosses);

    // クリア評価計算
    const clearRating = this.calculateClearRating(stageData, performance);

    // 仲間化報酬計算
    const recruitmentRewards = this.calculateRecruitmentRewards(recruitedCharacterIds);

    // クリア評価ボーナス
    const clearRatingBonus: ClearRatingBonus = {
      rating: clearRating,
      experienceMultiplier: this.config.clearRatingMultipliers[clearRating],
      additionalRewards: this.getAdditionalRewardsForRating(clearRating),
    };

    // パフォーマンス修正を適用
    const modifiedBaseExperience = this.applyPerformanceModifiers(
      baseExperience,
      performance,
      clearRatingBonus.experienceMultiplier
    );

    return {
      baseExperience: modifiedBaseExperience,
      bossRewards,
      recruitmentRewards,
      clearRatingBonus,
      itemRewards: stageData.itemRewards || [],
      specialRewards: [],
    };
  }

  /**
   * 基本報酬を計算
   * 要件4.2: 基本経験値報酬の計算
   */
  calculateBaseRewards(stageData: StageData, performance: StagePerformance): number {
    // ステージの基本経験値
    let baseExperience = stageData.baseExperienceReward;

    // 基本倍率を適用
    baseExperience *= this.config.baseExperienceMultiplier;

    // 敵撃破数に応じたボーナス
    const defeatBonus = performance.enemiesDefeated * 10;
    baseExperience += defeatBonus;

    return Math.floor(baseExperience);
  }

  /**
   * ボス撃破報酬を計算
   * 要件4.2: ボス撃破報酬の計算
   */
  calculateBossRewards(defeatedBosses: BossData[]): BossReward[] {
    return defeatedBosses.map((boss) => ({
      bossId: boss.id,
      bossName: boss.name,
      roseEssenceAmount: boss.roseEssenceAmount,
      roseEssenceType: boss.roseEssenceType,
      experienceBonus: Math.floor(boss.experienceReward * this.config.bossExperienceMultiplier),
    }));
  }

  /**
   * クリア評価を計算
   * 要件4.3: クリア評価の計算
   */
  calculateClearRating(stageData: StageData, performance: StagePerformance): ClearRating {
    // 評価スコアを計算（0-100）
    let score = 100;

    // ターン数による減点
    const turnRatio = performance.turnsUsed / stageData.targetTurns;
    if (turnRatio > 1.0) {
      score -= (turnRatio - 1.0) * 30;
    }

    // ユニットロストによる減点
    score -= performance.unitsLost * 15;

    // ボス撃破によるボーナス
    score += performance.bossesDefeated * 10;

    // 仲間化成功によるボーナス
    score += performance.recruitmentSuccesses * 5;

    // スコアを0-100に制限
    score = Math.max(0, Math.min(100, score));

    // 評価に変換
    if (score >= 90) return ClearRating.S;
    if (score >= 75) return ClearRating.A;
    if (score >= 60) return ClearRating.B;
    if (score >= 40) return ClearRating.C;
    return ClearRating.D;
  }

  /**
   * 仲間化報酬を計算
   * 要件4.5: 仲間化報酬の計算
   */
  calculateRecruitmentRewards(recruitedCharacterIds: string[]): RecruitmentReward[] {
    return recruitedCharacterIds.map((characterId, index) => ({
      characterId,
      characterName: `Character_${characterId}`, // 実際にはキャラクターデータから取得
      recruitmentBonus: this.config.recruitmentBonusBase + index * 50,
    }));
  }

  /**
   * パフォーマンス修正を適用
   * 要件4.3: パフォーマンスに基づく報酬修正
   */
  applyPerformanceModifiers(
    baseExperience: number,
    performance: StagePerformance,
    ratingMultiplier: number
  ): number {
    // クリア評価倍率を適用
    let modifiedExperience = baseExperience * ratingMultiplier;

    // パフォーマンスボーナス/ペナルティ
    const weights = this.config.performanceWeights;

    // ターン数が少ないほどボーナス（最大10%）
    const turnBonus = Math.max(0, 1.0 - performance.turnsUsed / 100) * weights.turnsUsed;

    // ユニットロストが少ないほどボーナス（最大20%）
    const lossBonus = Math.max(0, 1.0 - performance.unitsLost / 6) * weights.unitsLost;

    // 敵撃破数に応じたボーナス（最大20%）
    const defeatBonus = Math.min(1.0, performance.enemiesDefeated / 20) * weights.enemiesDefeated;

    // ボス撃破ボーナス（最大20%）
    const bossBonus = Math.min(1.0, performance.bossesDefeated / 3) * weights.bossesDefeated;

    // 仲間化成功ボーナス（最大10%）
    const recruitmentBonus =
      Math.min(1.0, performance.recruitmentSuccesses / 5) * weights.recruitmentSuccesses;

    // 合計ボーナス倍率
    const totalBonus = 1.0 + turnBonus + lossBonus + defeatBonus + bossBonus + recruitmentBonus;

    modifiedExperience *= totalBonus;

    return Math.floor(modifiedExperience);
  }

  /**
   * クリア評価に応じた追加報酬を取得
   */
  private getAdditionalRewardsForRating(rating: ClearRating): ItemReward[] {
    const rewards: ItemReward[] = [];

    switch (rating) {
      case ClearRating.S:
        rewards.push({ itemId: 'rare_item', itemName: 'レアアイテム', quantity: 1 });
        rewards.push({ itemId: 'gold', itemName: 'ゴールド', quantity: 1000 });
        break;
      case ClearRating.A:
        rewards.push({ itemId: 'gold', itemName: 'ゴールド', quantity: 500 });
        break;
      case ClearRating.B:
        rewards.push({ itemId: 'gold', itemName: 'ゴールド', quantity: 300 });
        break;
      case ClearRating.C:
        rewards.push({ itemId: 'gold', itemName: 'ゴールド', quantity: 100 });
        break;
      case ClearRating.D:
        // D評価は追加報酬なし
        break;
    }

    return rewards;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<RewardCalculationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): RewardCalculationConfig {
    return { ...this.config };
  }
}
