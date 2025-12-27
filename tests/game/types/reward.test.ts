/**
 * 報酬システムの型定義テスト
 */

import { describe, test, expect } from 'vitest';
import {
  ClearRating,
  type StageRewards,
  type BossReward,
  type RecruitmentReward,
  type ClearRatingBonus,
  type StagePerformance,
  type RewardDistributionResult,
  type StageCompleteResult,
  type StageFailureResult,
} from '../../../game/src/types/reward';
import { RoseEssenceType } from '../../../game/src/types/boss';

describe('Reward Type Definitions', () => {
  describe('ClearRating Enum', () => {
    test('should have all required rating levels', () => {
      expect(ClearRating.S).toBe('S');
      expect(ClearRating.A).toBe('A');
      expect(ClearRating.B).toBe('B');
      expect(ClearRating.C).toBe('C');
      expect(ClearRating.D).toBe('D');
    });
  });

  describe('BossReward Interface', () => {
    test('should create valid boss reward', () => {
      const reward: BossReward = {
        bossId: 'boss-1',
        bossName: '魔性の薔薇',
        roseEssenceAmount: 100,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceBonus: 500,
      };

      expect(reward.bossId).toBe('boss-1');
      expect(reward.bossName).toBe('魔性の薔薇');
      expect(reward.roseEssenceAmount).toBe(100);
      expect(reward.roseEssenceType).toBe(RoseEssenceType.CRIMSON);
      expect(reward.experienceBonus).toBe(500);
    });
  });

  describe('RecruitmentReward Interface', () => {
    test('should create valid recruitment reward', () => {
      const reward: RecruitmentReward = {
        characterId: 'char-1',
        characterName: 'テストキャラクター',
        recruitmentBonus: 100,
      };

      expect(reward.characterId).toBe('char-1');
      expect(reward.characterName).toBe('テストキャラクター');
      expect(reward.recruitmentBonus).toBe(100);
    });
  });

  describe('ClearRatingBonus Interface', () => {
    test('should create S rank bonus', () => {
      const bonus: ClearRatingBonus = {
        rating: ClearRating.S,
        experienceMultiplier: 2.0,
        additionalRewards: [
          {
            itemId: 'item-1',
            itemName: '特別報酬',
            quantity: 1,
          },
        ],
      };

      expect(bonus.rating).toBe(ClearRating.S);
      expect(bonus.experienceMultiplier).toBe(2.0);
      expect(bonus.additionalRewards).toHaveLength(1);
    });

    test('should create C rank bonus with no additional rewards', () => {
      const bonus: ClearRatingBonus = {
        rating: ClearRating.C,
        experienceMultiplier: 1.0,
        additionalRewards: [],
      };

      expect(bonus.rating).toBe(ClearRating.C);
      expect(bonus.experienceMultiplier).toBe(1.0);
      expect(bonus.additionalRewards).toHaveLength(0);
    });
  });

  describe('StagePerformance Interface', () => {
    test('should create valid stage performance', () => {
      const performance: StagePerformance = {
        turnsUsed: 15,
        unitsLost: 0,
        enemiesDefeated: 10,
        bossesDefeated: 1,
        recruitmentSuccesses: 2,
        damageDealt: 5000,
        damageTaken: 1000,
        healingDone: 500,
      };

      expect(performance.turnsUsed).toBe(15);
      expect(performance.unitsLost).toBe(0);
      expect(performance.enemiesDefeated).toBe(10);
      expect(performance.bossesDefeated).toBe(1);
      expect(performance.recruitmentSuccesses).toBe(2);
      expect(performance.damageDealt).toBe(5000);
      expect(performance.damageTaken).toBe(1000);
      expect(performance.healingDone).toBe(500);
    });
  });

  describe('StageRewards Interface', () => {
    test('should create complete stage rewards', () => {
      const rewards: StageRewards = {
        baseExperience: 1000,
        bossRewards: [
          {
            bossId: 'boss-1',
            bossName: '魔性の薔薇',
            roseEssenceAmount: 100,
            roseEssenceType: RoseEssenceType.CRIMSON,
            experienceBonus: 500,
          },
        ],
        recruitmentRewards: [
          {
            characterId: 'char-1',
            characterName: 'テストキャラクター',
            recruitmentBonus: 100,
          },
        ],
        clearRatingBonus: {
          rating: ClearRating.A,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [
          {
            itemId: 'item-1',
            itemName: 'ポーション',
            quantity: 3,
          },
        ],
        specialRewards: [],
      };

      expect(rewards.baseExperience).toBe(1000);
      expect(rewards.bossRewards).toHaveLength(1);
      expect(rewards.recruitmentRewards).toHaveLength(1);
      expect(rewards.clearRatingBonus.rating).toBe(ClearRating.A);
      expect(rewards.itemRewards).toHaveLength(1);
      expect(rewards.specialRewards).toHaveLength(0);
    });

    test('should create minimal stage rewards', () => {
      const rewards: StageRewards = {
        baseExperience: 500,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: ClearRating.C,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };

      expect(rewards.baseExperience).toBe(500);
      expect(rewards.bossRewards).toHaveLength(0);
      expect(rewards.recruitmentRewards).toHaveLength(0);
    });
  });

  describe('RewardDistributionResult Interface', () => {
    test('should create successful distribution result', () => {
      const result: RewardDistributionResult = {
        success: true,
        experienceDistributed: 2000,
        roseEssenceDistributed: 100,
        itemsDistributed: [
          {
            itemId: 'item-1',
            itemName: 'ポーション',
            quantity: 3,
          },
        ],
        recruitedCharacters: ['char-1', 'char-2'],
        errors: [],
      };

      expect(result.success).toBe(true);
      expect(result.experienceDistributed).toBe(2000);
      expect(result.roseEssenceDistributed).toBe(100);
      expect(result.itemsDistributed).toHaveLength(1);
      expect(result.recruitedCharacters).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    test('should create failed distribution result', () => {
      const result: RewardDistributionResult = {
        success: false,
        experienceDistributed: 0,
        roseEssenceDistributed: 0,
        itemsDistributed: [],
        recruitedCharacters: [],
        errors: ['経験値システムエラー', 'データ保存失敗'],
      };

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('StageCompleteResult Interface', () => {
    test('should create valid stage complete result', () => {
      const result: StageCompleteResult = {
        stageId: 'stage-1',
        stageName: 'テストステージ',
        clearRating: ClearRating.S,
        rewards: {
          baseExperience: 1000,
          bossRewards: [],
          recruitmentRewards: [],
          clearRatingBonus: {
            rating: ClearRating.S,
            experienceMultiplier: 2.0,
            additionalRewards: [],
          },
          itemRewards: [],
          specialRewards: [],
        },
        performance: {
          turnsUsed: 10,
          unitsLost: 0,
          enemiesDefeated: 15,
          bossesDefeated: 1,
          recruitmentSuccesses: 3,
          damageDealt: 8000,
          damageTaken: 500,
          healingDone: 1000,
        },
        timestamp: Date.now(),
      };

      expect(result.stageId).toBe('stage-1');
      expect(result.stageName).toBe('テストステージ');
      expect(result.clearRating).toBe(ClearRating.S);
      expect(result.rewards.baseExperience).toBe(1000);
      expect(result.performance.turnsUsed).toBe(10);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('StageFailureResult Interface', () => {
    test('should create valid stage failure result', () => {
      const result: StageFailureResult = {
        stageId: 'stage-1',
        stageName: 'テストステージ',
        defeatReason: '全ユニットが撃破された',
        turnsPlayed: 8,
        timestamp: Date.now(),
      };

      expect(result.stageId).toBe('stage-1');
      expect(result.stageName).toBe('テストステージ');
      expect(result.defeatReason).toBe('全ユニットが撃破された');
      expect(result.turnsPlayed).toBe(8);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });
});
