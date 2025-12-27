/**
 * ボス戦システムの型定義テスト
 */

import { describe, test, expect } from 'vitest';
import {
  BossType,
  BossDifficulty,
  RoseEssenceType,
  AIPersonality,
  type BossData,
  type BossPhase,
  type BossAbility,
  type BossDefeatResult,
  type BossPhaseChangeEvent,
} from '../../../game/src/types/boss';

describe('Boss Type Definitions', () => {
  describe('BossType Enum', () => {
    test('should have all required boss types', () => {
      expect(BossType.MINOR_BOSS).toBe('minor_boss');
      expect(BossType.MAJOR_BOSS).toBe('major_boss');
      expect(BossType.CHAPTER_BOSS).toBe('chapter_boss');
      expect(BossType.FINAL_BOSS).toBe('final_boss');
    });
  });

  describe('BossDifficulty Enum', () => {
    test('should have all required difficulty levels', () => {
      expect(BossDifficulty.EASY).toBe('easy');
      expect(BossDifficulty.NORMAL).toBe('normal');
      expect(BossDifficulty.HARD).toBe('hard');
      expect(BossDifficulty.EXTREME).toBe('extreme');
    });
  });

  describe('RoseEssenceType Enum', () => {
    test('should have all required rose essence types', () => {
      expect(RoseEssenceType.CRIMSON).toBe('crimson');
      expect(RoseEssenceType.SHADOW).toBe('shadow');
      expect(RoseEssenceType.THORN).toBe('thorn');
      expect(RoseEssenceType.CURSED).toBe('cursed');
    });
  });

  describe('AIPersonality Enum', () => {
    test('should have all required AI personality types', () => {
      expect(AIPersonality.AGGRESSIVE).toBe('aggressive');
      expect(AIPersonality.DEFENSIVE).toBe('defensive');
      expect(AIPersonality.BALANCED).toBe('balanced');
      expect(AIPersonality.TACTICAL).toBe('tactical');
    });
  });

  describe('BossPhase Interface', () => {
    test('should create valid boss phase', () => {
      const phase: BossPhase = {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {
          attack: 10,
          defense: 5,
        },
        newAbilities: ['ability-1'],
      };

      expect(phase.phaseNumber).toBe(1);
      expect(phase.hpThreshold).toBe(100);
      expect(phase.statModifiers.attack).toBe(10);
      expect(phase.newAbilities).toHaveLength(1);
    });

    test('should create phase with effect', () => {
      const phase: BossPhase = {
        phaseNumber: 2,
        hpThreshold: 50,
        statModifiers: {
          speed: 20,
        },
        newAbilities: ['ability-2', 'ability-3'],
        phaseChangeEffect: 'dark-aura',
      };

      expect(phase.phaseNumber).toBe(2);
      expect(phase.hpThreshold).toBe(50);
      expect(phase.phaseChangeEffect).toBe('dark-aura');
      expect(phase.newAbilities).toHaveLength(2);
    });
  });

  describe('BossAbility Interface', () => {
    test('should create passive ability', () => {
      const ability: BossAbility = {
        id: 'ability-1',
        name: '魔性の加護',
        description: '防御力が上昇する',
        type: 'passive',
        effect: {
          type: 'stat_boost',
          value: 10,
          target: 'self',
          description: '防御力+10',
        },
      };

      expect(ability.id).toBe('ability-1');
      expect(ability.type).toBe('passive');
      expect(ability.effect.value).toBe(10);
      expect(ability.cooldown).toBeUndefined();
    });

    test('should create active ability with cooldown', () => {
      const ability: BossAbility = {
        id: 'ability-2',
        name: '薔薇の嵐',
        description: '範囲攻撃を行う',
        type: 'active',
        effect: {
          type: 'area_damage',
          value: 50,
          range: 3,
          target: 'area',
          description: '範囲3マスにダメージ',
        },
        cooldown: 3,
        mpCost: 20,
      };

      expect(ability.type).toBe('active');
      expect(ability.cooldown).toBe(3);
      expect(ability.mpCost).toBe(20);
      expect(ability.effect.range).toBe(3);
    });
  });

  describe('BossData Interface', () => {
    test('should create valid boss data', () => {
      const bossData: BossData = {
        id: 'boss-1',
        name: '魔性の薔薇',
        title: '紅の支配者',
        description: '紅い薔薇の力を持つボス',
        roseEssenceAmount: 100,
        roseEssenceType: RoseEssenceType.CRIMSON,
        isBoss: true,
        bossType: BossType.CHAPTER_BOSS,
        difficulty: BossDifficulty.HARD,
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 100,
            statModifiers: {},
            newAbilities: [],
          },
        ],
        currentPhase: 0,
        specialAbilities: [],
        aiPersonality: AIPersonality.AGGRESSIVE,
        aiPriority: 10,
        experienceReward: 500,
      };

      expect(bossData.id).toBe('boss-1');
      expect(bossData.isBoss).toBe(true);
      expect(bossData.bossType).toBe(BossType.CHAPTER_BOSS);
      expect(bossData.roseEssenceAmount).toBe(100);
      expect(bossData.roseEssenceType).toBe(RoseEssenceType.CRIMSON);
      expect(bossData.difficulty).toBe(BossDifficulty.HARD);
      expect(bossData.aiPersonality).toBe(AIPersonality.AGGRESSIVE);
    });

    test('should create boss with multiple phases', () => {
      const bossData: BossData = {
        id: 'boss-2',
        name: '影の薔薇',
        title: '闇の支配者',
        description: '影の薔薇の力を持つボス',
        roseEssenceAmount: 150,
        roseEssenceType: RoseEssenceType.SHADOW,
        isBoss: true,
        bossType: BossType.MAJOR_BOSS,
        difficulty: BossDifficulty.EXTREME,
        phases: [
          {
            phaseNumber: 1,
            hpThreshold: 100,
            statModifiers: {},
            newAbilities: ['ability-1'],
          },
          {
            phaseNumber: 2,
            hpThreshold: 50,
            statModifiers: { attack: 20 },
            newAbilities: ['ability-2'],
          },
        ],
        currentPhase: 0,
        specialAbilities: [],
        aiPersonality: AIPersonality.TACTICAL,
        aiPriority: 15,
        experienceReward: 1000,
        introductionCutscene: 'boss-intro',
        defeatCutscene: 'boss-defeat',
      };

      expect(bossData.phases).toHaveLength(2);
      expect(bossData.introductionCutscene).toBe('boss-intro');
      expect(bossData.defeatCutscene).toBe('boss-defeat');
    });
  });

  describe('BossDefeatResult Interface', () => {
    test('should create valid boss defeat result', () => {
      const result: BossDefeatResult = {
        bossId: 'boss-1',
        bossName: '魔性の薔薇',
        roseEssenceAmount: 100,
        roseEssenceType: RoseEssenceType.CRIMSON,
        experienceReward: 500,
        additionalRewards: [
          {
            itemId: 'item-1',
            itemName: '薔薇の欠片',
            quantity: 1,
          },
        ],
        timestamp: Date.now(),
      };

      expect(result.bossId).toBe('boss-1');
      expect(result.roseEssenceAmount).toBe(100);
      expect(result.roseEssenceType).toBe(RoseEssenceType.CRIMSON);
      expect(result.experienceReward).toBe(500);
      expect(result.additionalRewards).toHaveLength(1);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('BossPhaseChangeEvent Interface', () => {
    test('should create valid phase change event', () => {
      const event: BossPhaseChangeEvent = {
        bossId: 'boss-1',
        previousPhase: 0,
        newPhase: 1,
        hpPercentage: 45,
        timestamp: Date.now(),
      };

      expect(event.bossId).toBe('boss-1');
      expect(event.previousPhase).toBe(0);
      expect(event.newPhase).toBe(1);
      expect(event.hpPercentage).toBe(45);
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });
});
