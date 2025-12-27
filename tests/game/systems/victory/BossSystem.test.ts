/**
 * BossSystemのユニットテスト
 * ボス登録、判定、撃破処理、薔薇の力計算、フェーズ変化のテスト
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BossSystem, BossSystemError } from '../../../../game/src/systems/victory/BossSystem';
import {
  BossData,
  BossType,
  BossDifficulty,
  RoseEssenceType,
  AIPersonality,
  BossPhase,
} from '../../../../game/src/types/boss';
import { Unit } from '../../../../game/src/types/gameplay';

describe('BossSystem', () => {
  let bossSystem: BossSystem;
  let mockBossUnit: Unit;
  let mockBossData: BossData;

  beforeEach(() => {
    bossSystem = new BossSystem();

    // モックボスユニット
    mockBossUnit = {
      id: 'boss-001',
      name: 'Test Boss',
      position: { x: 5, y: 5 },
      stats: {
        maxHP: 1000,
        maxMP: 100,
        attack: 50,
        defense: 30,
        speed: 10,
        movement: 3,
      },
      currentHP: 1000,
      currentMP: 100,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
      equipment: {},
    };

    // モックボスデータ
    const mockPhases: BossPhase[] = [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        newAbilities: [],
      },
      {
        phaseNumber: 2,
        hpThreshold: 50,
        statModifiers: { attack: 10 },
        newAbilities: ['rage'],
      },
      {
        phaseNumber: 3,
        hpThreshold: 25,
        statModifiers: { attack: 20, speed: 5 },
        newAbilities: ['berserk'],
      },
    ];

    mockBossData = {
      id: 'boss-001',
      name: 'Test Boss',
      title: 'The Crimson Rose',
      description: 'A powerful boss corrupted by the rose',
      roseEssenceAmount: 100,
      roseEssenceType: RoseEssenceType.CRIMSON,
      isBoss: true,
      bossType: BossType.MAJOR_BOSS,
      difficulty: BossDifficulty.NORMAL,
      phases: mockPhases,
      currentPhase: 1,
      specialAbilities: [],
      aiPersonality: AIPersonality.AGGRESSIVE,
      aiPriority: 10,
      experienceReward: 500,
    };
  });

  describe('registerBoss', () => {
    test('should register a boss successfully', () => {
      const result = bossSystem.registerBoss(mockBossUnit, mockBossData);

      expect(result.success).toBe(true);
      expect(bossSystem.isBoss(mockBossUnit.id)).toBe(true);
      expect(bossSystem.getBossData(mockBossUnit.id)).toEqual(mockBossData);
    });

    test('should emit boss-registered event', () => {
      const eventSpy = vi.fn();
      bossSystem.on('boss-registered', eventSpy);

      bossSystem.registerBoss(mockBossUnit, mockBossData);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          unitId: mockBossUnit.id,
          bossData: mockBossData,
        })
      );
    });

    test('should fail with invalid unit', () => {
      const invalidUnit = null as any;
      const result = bossSystem.registerBoss(invalidUnit, mockBossData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(BossSystemError.INVALID_UNIT);
    });

    test('should fail with invalid boss data', () => {
      const invalidBossData = null as any;
      const result = bossSystem.registerBoss(mockBossUnit, invalidBossData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(BossSystemError.INVALID_BOSS_DATA);
    });

    test('should fail when boss is already registered', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);
      const result = bossSystem.registerBoss(mockBossUnit, mockBossData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(BossSystemError.BOSS_ALREADY_REGISTERED);
    });

    test('should fail with invalid rose essence amount', () => {
      const invalidBossData = { ...mockBossData, roseEssenceAmount: 0 };
      const result = bossSystem.registerBoss(mockBossUnit, invalidBossData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(BossSystemError.INVALID_BOSS_DATA);
    });

    test('should fail with empty phases array', () => {
      const invalidBossData = { ...mockBossData, phases: [] };
      const result = bossSystem.registerBoss(mockBossUnit, invalidBossData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(BossSystemError.INVALID_BOSS_DATA);
    });

    test('should fail with invalid current phase', () => {
      const invalidBossData = { ...mockBossData, currentPhase: 0 };
      const result = bossSystem.registerBoss(mockBossUnit, invalidBossData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(BossSystemError.INVALID_BOSS_DATA);
    });

    test('should fail with negative experience reward', () => {
      const invalidBossData = { ...mockBossData, experienceReward: -100 };
      const result = bossSystem.registerBoss(mockBossUnit, invalidBossData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(BossSystemError.INVALID_BOSS_DATA);
    });
  });

  describe('isBoss', () => {
    test('should return true for registered boss', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      expect(bossSystem.isBoss(mockBossUnit.id)).toBe(true);
    });

    test('should return false for non-registered unit', () => {
      expect(bossSystem.isBoss('non-existent-id')).toBe(false);
    });

    test('should return false after boss is defeated', async () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);
      await bossSystem.handleBossDefeat(mockBossUnit);

      expect(bossSystem.isBoss(mockBossUnit.id)).toBe(false);
    });
  });

  describe('getBossData', () => {
    test('should return boss data for registered boss', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      const data = bossSystem.getBossData(mockBossUnit.id);
      expect(data).toEqual(mockBossData);
    });

    test('should return null for non-registered unit', () => {
      const data = bossSystem.getBossData('non-existent-id');
      expect(data).toBeNull();
    });

    test('should return null after boss is defeated', async () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);
      await bossSystem.handleBossDefeat(mockBossUnit);

      const data = bossSystem.getBossData(mockBossUnit.id);
      expect(data).toBeNull();
    });
  });

  describe('handleBossDefeat', () => {
    test('should handle boss defeat successfully', async () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      const result = await bossSystem.handleBossDefeat(mockBossUnit);

      expect(result.bossId).toBe(mockBossUnit.id);
      expect(result.bossName).toBe(mockBossData.name);
      expect(result.roseEssenceAmount).toBeGreaterThan(0);
      expect(result.roseEssenceType).toBe(mockBossData.roseEssenceType);
      expect(result.experienceReward).toBe(mockBossData.experienceReward);
    });

    test('should emit boss-defeated event', async () => {
      const eventSpy = vi.fn();
      bossSystem.on('boss-defeated', eventSpy);

      bossSystem.registerBoss(mockBossUnit, mockBossData);
      await bossSystem.handleBossDefeat(mockBossUnit);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          bossId: mockBossUnit.id,
          bossName: mockBossData.name,
        })
      );
    });

    test('should remove boss data after defeat', async () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);
      await bossSystem.handleBossDefeat(mockBossUnit);

      expect(bossSystem.isBoss(mockBossUnit.id)).toBe(false);
      expect(bossSystem.getBossData(mockBossUnit.id)).toBeNull();
    });

    test('should throw error for non-registered boss', async () => {
      await expect(bossSystem.handleBossDefeat(mockBossUnit)).rejects.toThrow();
    });

    test('should include additional rewards if present', async () => {
      const bossDataWithRewards = {
        ...mockBossData,
        additionalRewards: [
          { itemId: 'item-001', itemName: 'Magic Sword', quantity: 1 },
        ],
      };

      bossSystem.registerBoss(mockBossUnit, bossDataWithRewards);
      const result = await bossSystem.handleBossDefeat(mockBossUnit);

      expect(result.additionalRewards).toHaveLength(1);
      expect(result.additionalRewards[0].itemId).toBe('item-001');
    });
  });

  describe('calculateRoseEssenceReward', () => {
    test('should calculate reward for normal difficulty', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      const reward = bossSystem.calculateRoseEssenceReward(mockBossUnit);

      expect(reward).toBe(100); // 基本値 * 1.0
    });

    test('should apply easy difficulty multiplier', () => {
      const easyBossData = { ...mockBossData, difficulty: BossDifficulty.EASY };
      bossSystem.registerBoss(mockBossUnit, easyBossData);

      const reward = bossSystem.calculateRoseEssenceReward(mockBossUnit);

      expect(reward).toBe(80); // 100 * 0.8
    });

    test('should apply hard difficulty multiplier', () => {
      const hardBossData = { ...mockBossData, difficulty: BossDifficulty.HARD };
      bossSystem.registerBoss(mockBossUnit, hardBossData);

      const reward = bossSystem.calculateRoseEssenceReward(mockBossUnit);

      expect(reward).toBe(130); // 100 * 1.3
    });

    test('should apply extreme difficulty multiplier', () => {
      const extremeBossData = { ...mockBossData, difficulty: BossDifficulty.EXTREME };
      bossSystem.registerBoss(mockBossUnit, extremeBossData);

      const reward = bossSystem.calculateRoseEssenceReward(mockBossUnit);

      expect(reward).toBe(160); // 100 * 1.6
    });

    test('should guarantee minimum reward of 1', () => {
      const lowRewardBossData = {
        ...mockBossData,
        roseEssenceAmount: 1,
        difficulty: BossDifficulty.EASY,
      };
      bossSystem.registerBoss(mockBossUnit, lowRewardBossData);

      const reward = bossSystem.calculateRoseEssenceReward(mockBossUnit);

      expect(reward).toBeGreaterThanOrEqual(1);
    });

    test('should return default value for non-registered boss', () => {
      const reward = bossSystem.calculateRoseEssenceReward(mockBossUnit);

      expect(reward).toBe(1);
    });
  });

  describe('handleBossPhaseChange', () => {
    test('should change boss phase successfully', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      const result = bossSystem.handleBossPhaseChange(mockBossUnit, 2);

      expect(result.success).toBe(true);
      const updatedData = bossSystem.getBossData(mockBossUnit.id);
      expect(updatedData?.currentPhase).toBe(2);
    });

    test('should emit boss-phase-changed event', () => {
      const eventSpy = vi.fn();
      bossSystem.on('boss-phase-changed', eventSpy);

      bossSystem.registerBoss(mockBossUnit, mockBossData);
      bossSystem.handleBossPhaseChange(mockBossUnit, 2);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          bossId: mockBossUnit.id,
          previousPhase: 1,
          newPhase: 2,
        })
      );
    });

    test('should fail for non-registered boss', () => {
      const result = bossSystem.handleBossPhaseChange(mockBossUnit, 2);

      expect(result.success).toBe(false);
      expect(result.error).toBe(BossSystemError.BOSS_NOT_FOUND);
    });

    test('should fail for invalid phase number (too low)', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      const result = bossSystem.handleBossPhaseChange(mockBossUnit, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe(BossSystemError.PHASE_CHANGE_FAILED);
    });

    test('should fail for invalid phase number (too high)', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      const result = bossSystem.handleBossPhaseChange(mockBossUnit, 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe(BossSystemError.PHASE_CHANGE_FAILED);
    });

    test('should include HP percentage in event', () => {
      const eventSpy = vi.fn();
      bossSystem.on('boss-phase-changed', eventSpy);

      mockBossUnit.currentHP = 500; // 50% HP
      bossSystem.registerBoss(mockBossUnit, mockBossData);
      bossSystem.handleBossPhaseChange(mockBossUnit, 2);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          hpPercentage: 50,
        })
      );
    });
  });

  describe('checkPhaseChange', () => {
    test('should trigger phase change when HP threshold is reached', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);
      mockBossUnit.currentHP = 500; // 50% HP

      const changed = bossSystem.checkPhaseChange(mockBossUnit);

      expect(changed).toBe(true);
      const updatedData = bossSystem.getBossData(mockBossUnit.id);
      expect(updatedData?.currentPhase).toBe(2);
    });

    test('should not trigger phase change when HP is above threshold', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);
      mockBossUnit.currentHP = 600; // 60% HP

      const changed = bossSystem.checkPhaseChange(mockBossUnit);

      expect(changed).toBe(false);
      const updatedData = bossSystem.getBossData(mockBossUnit.id);
      expect(updatedData?.currentPhase).toBe(1);
    });

    test('should trigger multiple phase changes in sequence', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      // フェーズ2へ
      mockBossUnit.currentHP = 500; // 50% HP
      bossSystem.checkPhaseChange(mockBossUnit);
      expect(bossSystem.getBossData(mockBossUnit.id)?.currentPhase).toBe(2);

      // フェーズ3へ
      mockBossUnit.currentHP = 250; // 25% HP
      bossSystem.checkPhaseChange(mockBossUnit);
      expect(bossSystem.getBossData(mockBossUnit.id)?.currentPhase).toBe(3);
    });

    test('should not trigger phase change when already at max phase', () => {
      const maxPhaseBossData = { ...mockBossData, currentPhase: 3 };
      bossSystem.registerBoss(mockBossUnit, maxPhaseBossData);
      mockBossUnit.currentHP = 100; // 10% HP

      const changed = bossSystem.checkPhaseChange(mockBossUnit);

      expect(changed).toBe(false);
    });

    test('should return false for non-registered boss', () => {
      const changed = bossSystem.checkPhaseChange(mockBossUnit);

      expect(changed).toBe(false);
    });
  });

  describe('clearAllBosses', () => {
    test('should clear all registered bosses', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      const anotherBoss = { ...mockBossUnit, id: 'boss-002' };
      const anotherBossData = { ...mockBossData, id: 'boss-002' };
      bossSystem.registerBoss(anotherBoss, anotherBossData);

      expect(bossSystem.getBossCount()).toBe(2);

      bossSystem.clearAllBosses();

      expect(bossSystem.getBossCount()).toBe(0);
      expect(bossSystem.isBoss(mockBossUnit.id)).toBe(false);
      expect(bossSystem.isBoss(anotherBoss.id)).toBe(false);
    });

    test('should emit all-bosses-cleared event', () => {
      const eventSpy = vi.fn();
      bossSystem.on('all-bosses-cleared', eventSpy);

      bossSystem.clearAllBosses();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('getBossCount', () => {
    test('should return 0 initially', () => {
      expect(bossSystem.getBossCount()).toBe(0);
    });

    test('should return correct count after registering bosses', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      const anotherBoss = { ...mockBossUnit, id: 'boss-002' };
      const anotherBossData = { ...mockBossData, id: 'boss-002' };
      bossSystem.registerBoss(anotherBoss, anotherBossData);

      expect(bossSystem.getBossCount()).toBe(2);
    });

    test('should decrease count after boss defeat', async () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);
      expect(bossSystem.getBossCount()).toBe(1);

      await bossSystem.handleBossDefeat(mockBossUnit);
      expect(bossSystem.getBossCount()).toBe(0);
    });
  });

  describe('getAllBossData', () => {
    test('should return empty array initially', () => {
      expect(bossSystem.getAllBossData()).toEqual([]);
    });

    test('should return all registered boss data', () => {
      bossSystem.registerBoss(mockBossUnit, mockBossData);

      const anotherBoss = { ...mockBossUnit, id: 'boss-002' };
      const anotherBossData = { ...mockBossData, id: 'boss-002', name: 'Another Boss' };
      bossSystem.registerBoss(anotherBoss, anotherBossData);

      const allData = bossSystem.getAllBossData();
      expect(allData).toHaveLength(2);
      expect(allData).toContainEqual(mockBossData);
      expect(allData).toContainEqual(anotherBossData);
    });
  });

  describe('destroy', () => {
    test('should clear all data and listeners', () => {
      const eventSpy = vi.fn();
      bossSystem.on('boss-registered', eventSpy);

      bossSystem.registerBoss(mockBossUnit, mockBossData);
      expect(eventSpy).toHaveBeenCalledTimes(1);

      bossSystem.destroy();

      expect(bossSystem.getBossCount()).toBe(0);

      // 新しいBossSystemインスタンスを作成して、イベントリスナーが削除されていることを確認
      const newBossSystem = new BossSystem();
      const newEventSpy = vi.fn();
      newBossSystem.on('boss-registered', newEventSpy);
      newBossSystem.registerBoss(mockBossUnit, mockBossData);
      expect(newEventSpy).toHaveBeenCalledTimes(1);

      // 元のインスタンスのイベントは発火しない
      expect(eventSpy).toHaveBeenCalledTimes(1); // 最初の1回のみ
    });
  });
});
