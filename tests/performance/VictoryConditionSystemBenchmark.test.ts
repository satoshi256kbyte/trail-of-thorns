/**
 * VictoryConditionSystemBenchmark.test.ts
 * 
 * ボス戦・勝利条件システムのパフォーマンスベンチマークテスト
 * システムのパフォーマンス要件を検証
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { VictoryConditionSystem } from '../../game/src/systems/victory/VictoryConditionSystem';
import type { StageData, Unit } from '../../game/src/types/gameplay';
import type { ObjectiveType } from '../../game/src/types/victory';
import type { BossType, RoseEssenceType } from '../../game/src/types/boss';

describe('VictoryConditionSystem - パフォーマンスベンチマーク', () => {
  let victorySystem: VictoryConditionSystem;
  let mockScene: any;
  let mockStageData: StageData;

  beforeEach(() => {
    mockScene = {
      events: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      },
      time: {
        delayedCall: vi.fn((delay, callback) => {
          callback();
          return { remove: vi.fn() };
        }),
      },
      add: {
        text: vi.fn(() => ({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        })),
        graphics: vi.fn(() => ({
          fillStyle: vi.fn().mockReturnThis(),
          fillRect: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        })),
      },
      tweens: {
        add: vi.fn((config) => {
          if (config.onComplete) config.onComplete();
          return { remove: vi.fn() };
        }),
      },
    };

    mockStageData = {
      id: 'benchmark_stage',
      name: 'Benchmark Stage',
      description: 'Stage for performance benchmarking',
      mapData: { width: 20, height: 20, tiles: [] },
      playerUnits: [],
      enemyUnits: [],
      objectives: [
        {
          id: 'obj_boss',
          type: 'defeat_boss' as ObjectiveType,
          description: 'Defeat the boss',
          isRequired: true,
          targetData: { bossId: 'boss_main' },
        },
      ],
      victoryConditions: [
        {
          id: 'victory_main',
          type: 'defeat_boss',
          description: 'Defeat the main boss',
        },
      ],
      defeatConditions: [
        {
          id: 'defeat_main',
          type: 'all_units_defeated',
          description: 'All player units defeated',
        },
      ],
      bossData: [
        {
          id: 'boss_main',
          name: 'Benchmark Boss',
          title: 'The Benchmark',
          description: 'Boss for benchmarking',
          roseEssenceAmount: 200,
          roseEssenceType: 'crimson' as RoseEssenceType,
          isBoss: true,
          bossType: 'chapter_boss' as BossType,
          difficulty: 'normal',
          phases: [],
          specialAbilities: [],
          experienceReward: 1000,
        },
      ],
    };

    victorySystem = new VictoryConditionSystem(mockScene);
  });

  describe('要件13.1: 勝利・敗北判定のパフォーマンス', () => {
    test('勝利・敗北判定が100ms以内に完了する', () => {
      victorySystem.initialize(mockStageData);

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        victorySystem.checkVictoryConditions();
        victorySystem.checkDefeatConditions();
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(100);
      console.log(`Average victory/defeat check time: ${averageTime.toFixed(2)}ms`);
    });

    test('大量の目標がある場合でも100ms以内に判定完了', () => {
      const largeStageData: StageData = {
        ...mockStageData,
        objectives: Array.from({ length: 100 }, (_, i) => ({
          id: `obj_${i}`,
          type: 'defeat_all_enemies' as ObjectiveType,
          description: `Objective ${i}`,
          isRequired: i < 10,
          targetData: {},
        })),
      };

      victorySystem.initialize(largeStageData);

      const startTime = performance.now();
      victorySystem.checkVictoryConditions();
      victorySystem.checkDefeatConditions();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
      console.log(`Large objectives check time: ${(endTime - startTime).toFixed(2)}ms`);
    });
  });

  describe('要件13.2: 報酬計算のパフォーマンス', () => {
    test('報酬計算が200ms以内に完了する', async () => {
      victorySystem.initialize(mockStageData);

      const boss: Unit = {
        id: 'boss_main',
        name: 'Benchmark Boss',
        position: { x: 10, y: 10 },
        stats: { maxHP: 3000, maxMP: 300, attack: 100, defense: 60, speed: 20, movement: 5 },
        currentHP: 0,
        currentMP: 300,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      await victorySystem.handleBossDefeat(boss);

      const rewardCalculator = victorySystem.getRewardCalculator();
      const performance_data = {
        turnsUsed: 10,
        unitsLost: 0,
        enemiesDefeated: 15,
        bossesDefeated: 1,
        recruitmentSuccesses: 2,
        damageDealt: 5000,
        damageTaken: 1000,
        healingDone: 500,
      };

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        rewardCalculator.calculateRewards(mockStageData, performance_data);
      }

      const endTime = performance.now();
      const averageTime = (endTime - startTime) / iterations;

      expect(averageTime).toBeLessThan(200);
      console.log(`Average reward calculation time: ${averageTime.toFixed(2)}ms`);
    });

    test('複数ボスの報酬計算でも200ms以内', async () => {
      const multiBossStage: StageData = {
        ...mockStageData,
        bossData: Array.from({ length: 10 }, (_, i) => ({
          id: `boss_${i}`,
          name: `Boss ${i}`,
          title: `Title ${i}`,
          description: `Boss ${i}`,
          roseEssenceAmount: 100 + i * 10,
          roseEssenceType: 'crimson' as RoseEssenceType,
          isBoss: true,
          bossType: 'minor_boss' as BossType,
          difficulty: 'normal',
          phases: [],
          specialAbilities: [],
          experienceReward: 500 + i * 50,
        })),
      };

      victorySystem.initialize(multiBossStage);

      // 全ボス撃破
      for (let i = 0; i < 10; i++) {
        const boss: Unit = {
          id: `boss_${i}`,
          name: `Boss ${i}`,
          position: { x: i, y: i },
          stats: { maxHP: 1000, maxMP: 100, attack: 50, defense: 30, speed: 10, movement: 3 },
          currentHP: 0,
          currentMP: 100,
          faction: 'enemy',
          hasActed: false,
          hasMoved: false,
        };
        await victorySystem.handleBossDefeat(boss);
      }

      const rewardCalculator = victorySystem.getRewardCalculator();
      const performance_data = {
        turnsUsed: 20,
        unitsLost: 1,
        enemiesDefeated: 50,
        bossesDefeated: 10,
        recruitmentSuccesses: 5,
        damageDealt: 15000,
        damageTaken: 3000,
        healingDone: 1500,
      };

      const startTime = performance.now();
      rewardCalculator.calculateRewards(multiBossStage, performance_data);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
      console.log(`Multi-boss reward calculation time: ${(endTime - startTime).toFixed(2)}ms`);
    });
  });

  describe('要件13.4: メモリ使用量', () => {
    test('大規模ステージでもメモリリークが発生しない', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // 100回のステージ初期化と破棄
      for (let i = 0; i < 100; i++) {
        const system = new VictoryConditionSystem(mockScene);
        system.initialize(mockStageData);

        const boss: Unit = {
          id: 'boss_main',
          name: 'Test Boss',
          position: { x: 10, y: 10 },
          stats: { maxHP: 3000, maxMP: 300, attack: 100, defense: 60, speed: 20, movement: 5 },
          currentHP: 0,
          currentMP: 300,
          faction: 'enemy',
          hasActed: false,
          hasMoved: false,
        };

        await system.handleBossDefeat(boss);
        await system.handleStageComplete();

        system.destroy();
      }

      // ガベージコレクション（可能な場合）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が50MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('要件13.5: キャッシュの効果', () => {
    test('キャッシュにより2回目以降の判定が高速化される', () => {
      victorySystem.initialize(mockStageData);

      // 1回目の判定（キャッシュなし）
      const startTime1 = performance.now();
      victorySystem.checkVictoryConditions();
      const endTime1 = performance.now();
      const firstTime = endTime1 - startTime1;

      // 2回目の判定（キャッシュあり）
      const startTime2 = performance.now();
      victorySystem.checkVictoryConditions();
      const endTime2 = performance.now();
      const secondTime = endTime2 - startTime2;

      // 2回目の方が高速であることを確認
      expect(secondTime).toBeLessThanOrEqual(firstTime);
      console.log(`First check: ${firstTime.toFixed(2)}ms, Second check: ${secondTime.toFixed(2)}ms`);
    });
  });

  describe('統合パフォーマンステスト', () => {
    test('完全なステージクリアフローが1秒以内に完了', async () => {
      const startTime = performance.now();

      victorySystem.initialize(mockStageData);

      const boss: Unit = {
        id: 'boss_main',
        name: 'Test Boss',
        position: { x: 10, y: 10 },
        stats: { maxHP: 3000, maxMP: 300, attack: 100, defense: 60, speed: 20, movement: 5 },
        currentHP: 0,
        currentMP: 300,
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
      };

      await victorySystem.handleBossDefeat(boss);
      victorySystem.checkVictoryConditions();
      await victorySystem.handleStageComplete();

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000);
      console.log(`Complete stage clear flow: ${totalTime.toFixed(2)}ms`);
    });
  });
});
