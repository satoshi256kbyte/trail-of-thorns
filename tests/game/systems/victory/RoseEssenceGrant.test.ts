/**
 * RoseEssenceGrant テストスイート
 * 
 * 薔薇の力付与システムの正確性とJobSystemとの連携をテスト
 * 要件4.4, 4.9, 7.1, 7.2, 7.3
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RoseEssenceGrant, RoseEssenceGrantConfig } from '../../../../game/src/systems/victory/RoseEssenceGrant';
import { BossData, BossType, BossDifficulty, RoseEssenceType, AIPersonality } from '../../../../game/src/types/boss';

describe('RoseEssenceGrant', () => {
  let roseEssenceGrant: RoseEssenceGrant;
  let mockJobSystem: any;

  // テスト用ボスデータ
  const createMockBossData = (overrides?: Partial<BossData>): BossData => ({
    id: 'boss_001',
    name: 'テストボス',
    title: '魔性の薔薇の守護者',
    description: 'テスト用のボス',
    roseEssenceAmount: 100,
    roseEssenceType: RoseEssenceType.CRIMSON,
    isBoss: true,
    bossType: BossType.MINOR_BOSS,
    difficulty: BossDifficulty.NORMAL,
    phases: [],
    currentPhase: 1,
    specialAbilities: [],
    aiPersonality: AIPersonality.BALANCED,
    aiPriority: 10,
    experienceReward: 500,
    ...overrides,
  });

  beforeEach(() => {
    // RoseEssenceGrantインスタンスを作成
    roseEssenceGrant = new RoseEssenceGrant({ debugMode: false });

    // モックJobSystemを作成
    mockJobSystem = {
      awardRoseEssence: vi.fn().mockResolvedValue(undefined),
      getRankUpCandidates: vi.fn().mockReturnValue([]),
    };

    roseEssenceGrant.setJobSystem(mockJobSystem);
  });

  describe('基本機能', () => {
    test('インスタンスが正しく作成される', () => {
      expect(roseEssenceGrant).toBeDefined();
      expect(roseEssenceGrant).toBeInstanceOf(RoseEssenceGrant);
    });

    test('デフォルト設定が適用される', () => {
      const config = roseEssenceGrant.getConfig();

      expect(config.difficultyModifiers[BossDifficulty.EASY]).toBe(0.8);
      expect(config.difficultyModifiers[BossDifficulty.NORMAL]).toBe(1.0);
      expect(config.difficultyModifiers[BossDifficulty.HARD]).toBe(1.3);
      expect(config.difficultyModifiers[BossDifficulty.EXTREME]).toBe(1.6);

      expect(config.bossTypeModifiers[BossType.MINOR_BOSS]).toBe(1.0);
      expect(config.bossTypeModifiers[BossType.MAJOR_BOSS]).toBe(1.5);
      expect(config.bossTypeModifiers[BossType.CHAPTER_BOSS]).toBe(2.0);
      expect(config.bossTypeModifiers[BossType.FINAL_BOSS]).toBe(3.0);

      expect(config.firstTimeBonus).toBe(1.5);
      expect(config.minimumAmount).toBe(1);
      expect(config.maximumAmount).toBe(1000);
    });

    test('カスタム設定が適用される', () => {
      const customConfig: Partial<RoseEssenceGrantConfig> = {
        firstTimeBonus: 2.0,
        minimumAmount: 10,
        maximumAmount: 500,
      };

      const customGrant = new RoseEssenceGrant(customConfig);
      const config = customGrant.getConfig();

      expect(config.firstTimeBonus).toBe(2.0);
      expect(config.minimumAmount).toBe(10);
      expect(config.maximumAmount).toBe(500);
    });
  });

  describe('薔薇の力の量計算 (要件7.1)', () => {
    test('基本量が正しく計算される', () => {
      const bossData = createMockBossData({
        roseEssenceAmount: 100,
        difficulty: BossDifficulty.NORMAL,
        bossType: BossType.MINOR_BOSS,
      });

      const calculation = roseEssenceGrant.calculateRoseEssenceAmount(bossData, false);

      expect(calculation.baseAmount).toBe(100);
      expect(calculation.finalAmount).toBe(100); // 100 * 1.0 (normal) * 1.0 (minor)
    });

    test('難易度修正が正しく適用される (要件4.9)', () => {
      const testCases = [
        { difficulty: BossDifficulty.EASY, expected: 80 }, // 100 * 0.8
        { difficulty: BossDifficulty.NORMAL, expected: 100 }, // 100 * 1.0
        { difficulty: BossDifficulty.HARD, expected: 130 }, // 100 * 1.3
        { difficulty: BossDifficulty.EXTREME, expected: 160 }, // 100 * 1.6
      ];

      testCases.forEach(({ difficulty, expected }) => {
        const bossData = createMockBossData({
          roseEssenceAmount: 100,
          difficulty,
          bossType: BossType.MINOR_BOSS,
        });

        const calculation = roseEssenceGrant.calculateRoseEssenceAmount(bossData, false);

        expect(calculation.difficultyModifier).toBe(expected);
        expect(calculation.finalAmount).toBe(expected);
      });
    });

    test('ボス種別修正が正しく適用される', () => {
      const testCases = [
        { bossType: BossType.MINOR_BOSS, expected: 100 }, // 100 * 1.0
        { bossType: BossType.MAJOR_BOSS, expected: 150 }, // 100 * 1.5
        { bossType: BossType.CHAPTER_BOSS, expected: 200 }, // 100 * 2.0
        { bossType: BossType.FINAL_BOSS, expected: 300 }, // 100 * 3.0
      ];

      testCases.forEach(({ bossType, expected }) => {
        const bossData = createMockBossData({
          roseEssenceAmount: 100,
          difficulty: BossDifficulty.NORMAL,
          bossType,
        });

        const calculation = roseEssenceGrant.calculateRoseEssenceAmount(bossData, false);

        expect(calculation.bossTypeModifier).toBe(expected);
        expect(calculation.finalAmount).toBe(expected);
      });
    });

    test('初回ボーナスが正しく適用される (要件7.3)', () => {
      const bossData = createMockBossData({
        roseEssenceAmount: 100,
        difficulty: BossDifficulty.NORMAL,
        bossType: BossType.MINOR_BOSS,
      });

      // 初回撃破
      const firstTimeCalc = roseEssenceGrant.calculateRoseEssenceAmount(bossData, true);
      expect(firstTimeCalc.firstTimeBonus).toBe(150); // 100 * 1.5
      expect(firstTimeCalc.finalAmount).toBe(150);

      // 2回目以降
      const secondTimeCalc = roseEssenceGrant.calculateRoseEssenceAmount(bossData, false);
      expect(secondTimeCalc.firstTimeBonus).toBe(0);
      expect(secondTimeCalc.finalAmount).toBe(100);
    });

    test('複合修正が正しく計算される', () => {
      const bossData = createMockBossData({
        roseEssenceAmount: 100,
        difficulty: BossDifficulty.HARD, // 1.3倍
        bossType: BossType.CHAPTER_BOSS, // 2.0倍
      });

      // 初回撃破: 100 * 1.3 * 2.0 * 1.5 = 390
      const firstTimeCalc = roseEssenceGrant.calculateRoseEssenceAmount(bossData, true);
      expect(firstTimeCalc.finalAmount).toBe(390);

      // 2回目以降: 100 * 1.3 * 2.0 = 260
      const secondTimeCalc = roseEssenceGrant.calculateRoseEssenceAmount(bossData, false);
      expect(secondTimeCalc.finalAmount).toBe(260);
    });

    test('最小値制限が適用される', () => {
      const bossData = createMockBossData({
        roseEssenceAmount: 1,
        difficulty: BossDifficulty.EASY, // 0.8倍
        bossType: BossType.MINOR_BOSS, // 1.0倍
      });

      const calculation = roseEssenceGrant.calculateRoseEssenceAmount(bossData, false);

      // 1 * 0.8 * 1.0 = 0.8 → 最小値1に制限
      expect(calculation.finalAmount).toBe(1);
    });

    test('最大値制限が適用される', () => {
      const bossData = createMockBossData({
        roseEssenceAmount: 500,
        difficulty: BossDifficulty.EXTREME, // 1.6倍
        bossType: BossType.FINAL_BOSS, // 3.0倍
      });

      const calculation = roseEssenceGrant.calculateRoseEssenceAmount(bossData, true);

      // 500 * 1.6 * 3.0 * 1.5 = 3600 → 最大値1000に制限
      expect(calculation.finalAmount).toBe(1000);
    });

    test('計算結果が整数に丸められる', () => {
      const bossData = createMockBossData({
        roseEssenceAmount: 33,
        difficulty: BossDifficulty.HARD, // 1.3倍
        bossType: BossType.MINOR_BOSS, // 1.0倍
      });

      const calculation = roseEssenceGrant.calculateRoseEssenceAmount(bossData, false);

      // 33 * 1.3 = 42.9 → 42に丸める
      expect(calculation.finalAmount).toBe(42);
      expect(Number.isInteger(calculation.finalAmount)).toBe(true);
    });
  });

  describe('薔薇の力付与 (要件7.2)', () => {
    test('JobSystemに薔薇の力が付与される', async () => {
      const bossData = createMockBossData({
        roseEssenceAmount: 100,
        difficulty: BossDifficulty.NORMAL,
        bossType: BossType.MINOR_BOSS,
      });

      const result = await roseEssenceGrant.grantRoseEssence(bossData);

      expect(result.success).toBe(true);
      // 初回撃破なので1.5倍のボーナスが適用される: 100 * 1.5 = 150
      expect(mockJobSystem.awardRoseEssence).toHaveBeenCalledWith(
        150,
        'boss_defeat:boss_001',
        undefined
      );
    });

    test('エフェクト表示位置が正しく渡される', async () => {
      const bossData = createMockBossData();
      const position = { x: 100, y: 200 };

      await roseEssenceGrant.grantRoseEssence(bossData, position);

      expect(mockJobSystem.awardRoseEssence).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String),
        position
      );
    });

    test('付与結果が正しく返される', async () => {
      const bossData = createMockBossData({
        id: 'boss_test',
        name: 'テストボス',
        roseEssenceAmount: 150,
        roseEssenceType: RoseEssenceType.SHADOW,
      });

      const result = await roseEssenceGrant.grantRoseEssence(bossData);

      expect(result.success).toBe(true);
      expect(result.bossId).toBe('boss_test');
      expect(result.bossName).toBe('テストボス');
      // 初回撃破なので1.5倍のボーナスが適用される: 150 * 1.5 = 225
      expect(result.amount).toBe(225);
      expect(result.type).toBe(RoseEssenceType.SHADOW);
      expect(result.isFirstTime).toBe(true);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    test('初回撃破が正しく判定される', async () => {
      const bossData = createMockBossData({ id: 'boss_unique' });

      // 初回撃破
      const firstResult = await roseEssenceGrant.grantRoseEssence(bossData);
      expect(firstResult.isFirstTime).toBe(true);

      // 2回目撃破
      const secondResult = await roseEssenceGrant.grantRoseEssence(bossData);
      expect(secondResult.isFirstTime).toBe(false);
    });

    test('撃破済みボスが記録される', async () => {
      const bossData = createMockBossData({ id: 'boss_record' });

      expect(roseEssenceGrant.isFirstTimeDefeat('boss_record')).toBe(true);

      await roseEssenceGrant.grantRoseEssence(bossData);

      expect(roseEssenceGrant.isFirstTimeDefeat('boss_record')).toBe(false);
      expect(roseEssenceGrant.getDefeatedBosses()).toContain('boss_record');
    });
  });

  describe('ランクアップ可能通知 (要件7.3)', () => {
    test('ランクアップ可能キャラクターがいる場合に通知される', async () => {
      const mockCandidates = [
        { characterId: 'char_001', canRankUp: true },
        { characterId: 'char_002', canRankUp: true },
      ];

      mockJobSystem.getRankUpCandidates.mockReturnValue(mockCandidates);

      const eventSpy = vi.fn();
      roseEssenceGrant.on('rank_up_candidates_available', eventSpy);

      const bossData = createMockBossData();
      await roseEssenceGrant.grantRoseEssence(bossData);

      expect(eventSpy).toHaveBeenCalledWith({
        bossId: bossData.id,
        bossName: bossData.name,
        roseEssenceAmount: expect.any(Number),
        candidates: mockCandidates,
      });
    });

    test('ランクアップ可能キャラクターがいない場合は通知されない', async () => {
      mockJobSystem.getRankUpCandidates.mockReturnValue([]);

      const eventSpy = vi.fn();
      roseEssenceGrant.on('rank_up_candidates_available', eventSpy);

      const bossData = createMockBossData();
      await roseEssenceGrant.grantRoseEssence(bossData);

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    test('JobSystemが設定されていない場合でもエラーにならない', async () => {
      const grantWithoutJobSystem = new RoseEssenceGrant();
      const bossData = createMockBossData();

      const result = await grantWithoutJobSystem.grantRoseEssence(bossData);

      expect(result.success).toBe(true);
      expect(result.amount).toBeGreaterThan(0);
    });

    test('JobSystem.awardRoseEssenceがエラーを投げた場合に適切に処理される', async () => {
      mockJobSystem.awardRoseEssence.mockRejectedValue(new Error('Test error'));

      const bossData = createMockBossData();
      const result = await roseEssenceGrant.grantRoseEssence(bossData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.amount).toBe(0);
    });
  });

  describe('ボス報酬作成', () => {
    test('ボス報酬が正しく作成される', () => {
      const bossData = createMockBossData({
        id: 'boss_reward',
        name: '報酬ボス',
        roseEssenceAmount: 200,
        roseEssenceType: RoseEssenceType.THORN,
        experienceReward: 1000,
      });

      const calculation = roseEssenceGrant.calculateRoseEssenceAmount(bossData, false);
      const reward = roseEssenceGrant.createBossReward(bossData, calculation);

      expect(reward.bossId).toBe('boss_reward');
      expect(reward.bossName).toBe('報酬ボス');
      expect(reward.roseEssenceAmount).toBe(calculation.finalAmount);
      expect(reward.roseEssenceType).toBe(RoseEssenceType.THORN);
      expect(reward.experienceBonus).toBe(1000);
    });
  });

  describe('撃破済みボス管理', () => {
    test('撃破済みボスを手動で記録できる', () => {
      roseEssenceGrant.markBossDefeated('boss_manual');

      expect(roseEssenceGrant.isFirstTimeDefeat('boss_manual')).toBe(false);
      expect(roseEssenceGrant.getDefeatedBosses()).toContain('boss_manual');
    });

    test('撃破済みボスをクリアできる', () => {
      roseEssenceGrant.markBossDefeated('boss_clear_test');
      expect(roseEssenceGrant.getDefeatedBosses()).toHaveLength(1);

      roseEssenceGrant.clearDefeatedBosses();
      expect(roseEssenceGrant.getDefeatedBosses()).toHaveLength(0);
    });

    test('撃破済みボスデータをエクスポート/インポートできる', () => {
      roseEssenceGrant.markBossDefeated('boss_001');
      roseEssenceGrant.markBossDefeated('boss_002');
      roseEssenceGrant.markBossDefeated('boss_003');

      const exported = roseEssenceGrant.exportDefeatedBosses();
      expect(exported).toHaveLength(3);

      const newGrant = new RoseEssenceGrant();
      newGrant.importDefeatedBosses(exported);

      expect(newGrant.getDefeatedBosses()).toEqual(exported);
      expect(newGrant.isFirstTimeDefeat('boss_001')).toBe(false);
      expect(newGrant.isFirstTimeDefeat('boss_002')).toBe(false);
      expect(newGrant.isFirstTimeDefeat('boss_003')).toBe(false);
    });
  });

  describe('設定管理', () => {
    test('設定を更新できる', () => {
      const newConfig: Partial<RoseEssenceGrantConfig> = {
        firstTimeBonus: 2.5,
        minimumAmount: 5,
      };

      roseEssenceGrant.updateConfig(newConfig);

      const config = roseEssenceGrant.getConfig();
      expect(config.firstTimeBonus).toBe(2.5);
      expect(config.minimumAmount).toBe(5);
    });

    test('設定更新時にイベントが発行される', () => {
      const eventSpy = vi.fn();
      roseEssenceGrant.on('config_updated', eventSpy);

      roseEssenceGrant.updateConfig({ firstTimeBonus: 3.0 });

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        firstTimeBonus: 3.0,
      }));
    });
  });

  describe('リセットと破棄', () => {
    test('リセットで撃破済みボスがクリアされる', () => {
      roseEssenceGrant.markBossDefeated('boss_reset');
      expect(roseEssenceGrant.getDefeatedBosses()).toHaveLength(1);

      roseEssenceGrant.reset();
      expect(roseEssenceGrant.getDefeatedBosses()).toHaveLength(0);
    });

    test('破棄でJobSystem参照がクリアされる', () => {
      roseEssenceGrant.setJobSystem(mockJobSystem);
      roseEssenceGrant.destroy();

      // 破棄後は内部参照がクリアされる（直接確認はできないが、エラーが出ないことを確認）
      expect(() => roseEssenceGrant.destroy()).not.toThrow();
    });
  });

  describe('個別修正メソッド', () => {
    test('applyDifficultyModifier が正しく動作する', () => {
      expect(roseEssenceGrant.applyDifficultyModifier(100, BossDifficulty.EASY)).toBe(80);
      expect(roseEssenceGrant.applyDifficultyModifier(100, BossDifficulty.NORMAL)).toBe(100);
      expect(roseEssenceGrant.applyDifficultyModifier(100, BossDifficulty.HARD)).toBe(130);
      expect(roseEssenceGrant.applyDifficultyModifier(100, BossDifficulty.EXTREME)).toBe(160);
    });

    test('applyBossTypeModifier が正しく動作する', () => {
      expect(roseEssenceGrant.applyBossTypeModifier(100, BossType.MINOR_BOSS)).toBe(100);
      expect(roseEssenceGrant.applyBossTypeModifier(100, BossType.MAJOR_BOSS)).toBe(150);
      expect(roseEssenceGrant.applyBossTypeModifier(100, BossType.CHAPTER_BOSS)).toBe(200);
      expect(roseEssenceGrant.applyBossTypeModifier(100, BossType.FINAL_BOSS)).toBe(300);
    });

    test('applyFirstTimeBonus が正しく動作する', () => {
      expect(roseEssenceGrant.applyFirstTimeBonus(100)).toBe(150);
      expect(roseEssenceGrant.applyFirstTimeBonus(200)).toBe(300);
    });
  });

  describe('統合テスト', () => {
    test('完全なボス撃破フローが正しく動作する', async () => {
      const bossData = createMockBossData({
        id: 'integration_boss',
        name: '統合テストボス',
        roseEssenceAmount: 100,
        difficulty: BossDifficulty.HARD,
        bossType: BossType.CHAPTER_BOSS,
        roseEssenceType: RoseEssenceType.CURSED,
      });

      const mockCandidates = [{ characterId: 'char_001', canRankUp: true }];
      mockJobSystem.getRankUpCandidates.mockReturnValue(mockCandidates);

      const grantEventSpy = vi.fn();
      const candidatesEventSpy = vi.fn();

      roseEssenceGrant.on('rose_essence_granted', grantEventSpy);
      roseEssenceGrant.on('rank_up_candidates_available', candidatesEventSpy);

      // 初回撃破
      const result = await roseEssenceGrant.grantRoseEssence(bossData, { x: 100, y: 200 });

      // 結果検証
      expect(result.success).toBe(true);
      expect(result.isFirstTime).toBe(true);
      expect(result.amount).toBe(390); // 100 * 1.3 * 2.0 * 1.5

      // JobSystem連携検証
      expect(mockJobSystem.awardRoseEssence).toHaveBeenCalledWith(
        390,
        'boss_defeat:integration_boss',
        { x: 100, y: 200 }
      );

      // イベント発行検証
      expect(grantEventSpy).toHaveBeenCalled();
      expect(candidatesEventSpy).toHaveBeenCalled();

      // 撃破記録検証
      expect(roseEssenceGrant.isFirstTimeDefeat('integration_boss')).toBe(false);
    });
  });
});
