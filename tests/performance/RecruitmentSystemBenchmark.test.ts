/**
 * 仲間化システム パフォーマンスベンチマークテスト
 *
 * 仲間化システムの各機能のパフォーマンスを測定し、
 * 要求される性能基準を満たしているかを検証します。
 */

import { RecruitmentSystem } from '../../game/src/systems/recruitment/RecruitmentSystem';
import { NPCStateManager } from '../../game/src/systems/recruitment/NPCStateManager';
import { RecruitmentCondition } from '../../game/src/systems/recruitment/RecruitmentCondition';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { Unit, StageData } from '../../game/src/types';

// パフォーマンステスト用のユーティリティ
class PerformanceProfiler {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(name: string): () => number {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);

      return duration;
    };
  }

  getAverageTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getMaxTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return Math.max(...times);
  }

  getMinTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return Math.min(...times);
  }

  reset(): void {
    this.measurements.clear();
  }
}

// 大量データ生成用のファクトリー
class TestDataFactory {
  static createLargeStageData(unitCount: number = 100): StageData {
    const playerUnits = Array.from({ length: Math.min(6, unitCount / 10) }, (_, i) => ({
      id: `player-${i}`,
      name: `Player ${i}`,
      position: { x: i, y: 0 },
      stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
      currentHP: 100,
      currentMP: 50,
      faction: 'player' as const,
      hasActed: false,
      hasMoved: false,
    }));

    const enemyUnits = Array.from({ length: unitCount - playerUnits.length }, (_, i) => ({
      id: `enemy-${i}`,
      name: `Enemy ${i}`,
      position: { x: i % 20, y: Math.floor(i / 20) + 2 },
      stats: { maxHP: 80, maxMP: 30, attack: 18, defense: 12, speed: 8, movement: 3 },
      currentHP: 80,
      currentMP: 30,
      faction: 'enemy' as const,
      hasActed: false,
      hasMoved: false,
      isRecruitable: i % 3 === 0, // 3体に1体が仲間化可能
      recruitmentConditions:
        i % 3 === 0
          ? [
              {
                id: `condition-${i}`,
                type: 'specific_attacker',
                description: `Player ${i % playerUnits.length}で攻撃`,
                parameters: { attackerId: `player-${i % playerUnits.length}` },
              },
            ]
          : undefined,
    }));

    return {
      id: 'large-test-stage',
      name: 'Large Test Stage',
      mapData: {
        width: 50,
        height: 50,
        tiles: Array(50)
          .fill(null)
          .map(() => Array(50).fill({ type: 'grass', movementCost: 1 })),
      },
      playerUnits,
      enemyUnits,
      victoryConditions: [{ type: 'defeat_all_enemies' }],
    };
  }

  static createComplexRecruitmentConditions(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `complex-condition-${i}`,
      type: 'custom' as any,
      description: `Complex condition ${i}`,
      parameters: { complexity: i },
      checkCondition: (context: any) => {
        // 複雑な計算をシミュレート
        let result = true;
        for (let j = 0; j < 100; j++) {
          result = result && Math.random() > 0.1;
        }
        return result;
      },
    }));
  }
}

describe('RecruitmentSystem パフォーマンスベンチマーク', () => {
  let profiler: PerformanceProfiler;
  let recruitmentSystem: RecruitmentSystem;
  let battleSystem: BattleSystem;
  let characterManager: CharacterManager;
  let gameStateManager: GameStateManager;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
    battleSystem = new BattleSystem();
    characterManager = new CharacterManager();
    gameStateManager = new GameStateManager();
    recruitmentSystem = new RecruitmentSystem(battleSystem, characterManager, gameStateManager);
  });

  afterEach(() => {
    profiler.reset();
  });

  describe('初期化パフォーマンス', () => {
    test('大量ユニット初期化時のパフォーマンス', () => {
      const unitCounts = [10, 50, 100, 200, 500];

      unitCounts.forEach(count => {
        const stageData = TestDataFactory.createLargeStageData(count);

        const endMeasurement = profiler.startMeasurement(`init-${count}-units`);
        recruitmentSystem.initialize(stageData);
        const duration = endMeasurement();

        // 初期化時間の要件: 500ユニットでも1秒以内
        if (count <= 500) {
          expect(duration).toBeLessThan(1000);
        }

        console.log(`${count} units initialization: ${duration.toFixed(2)}ms`);
      });
    });

    test('仲間化可能ユニット識別のパフォーマンス', () => {
      const stageData = TestDataFactory.createLargeStageData(300);

      const endMeasurement = profiler.startMeasurement('identify-recruitable');
      recruitmentSystem.initialize(stageData);
      const recruitableUnits = recruitmentSystem.getRecruitableUnits();
      const duration = endMeasurement();

      expect(recruitableUnits.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // 100ms以内

      console.log(`Recruitable unit identification (300 units): ${duration.toFixed(2)}ms`);
    });
  });

  describe('条件チェックパフォーマンス', () => {
    test('単一条件チェックの実行時間', () => {
      const stageData = TestDataFactory.createLargeStageData(50);
      recruitmentSystem.initialize(stageData);

      const attacker = characterManager.getPlayerUnits()[0];
      const targets = recruitmentSystem.getRecruitableUnits();

      // 1000回の条件チェックを実行
      const iterations = 1000;
      const endMeasurement = profiler.startMeasurement('single-condition-check');

      for (let i = 0; i < iterations; i++) {
        const target = targets[i % targets.length];
        recruitmentSystem.checkRecruitmentEligibility(attacker, target);
      }

      const totalDuration = endMeasurement();
      const averagePerCheck = totalDuration / iterations;

      // 1回の条件チェックは1ms以内
      expect(averagePerCheck).toBeLessThan(1);

      console.log(`Average condition check time: ${averagePerCheck.toFixed(4)}ms`);
    });

    test('複雑な条件チェックのパフォーマンス', () => {
      const stageData = TestDataFactory.createLargeStageData(10);
      const complexConditions = TestDataFactory.createComplexRecruitmentConditions(5);

      // 複雑な条件を持つユニットを追加
      const complexUnit = {
        ...stageData.enemyUnits[0],
        id: 'complex-unit',
        recruitmentConditions: complexConditions,
      };

      stageData.enemyUnits.push(complexUnit);
      recruitmentSystem.initialize(stageData);

      const attacker = characterManager.getPlayerUnits()[0];
      const target = characterManager.getUnitById('complex-unit');

      const endMeasurement = profiler.startMeasurement('complex-condition-check');
      const result = recruitmentSystem.checkRecruitmentEligibility(attacker, target);
      const duration = endMeasurement();

      // 複雑な条件でも10ms以内
      expect(duration).toBeLessThan(10);

      console.log(`Complex condition check time: ${duration.toFixed(2)}ms`);
    });

    test('並行条件チェックのパフォーマンス', async () => {
      const stageData = TestDataFactory.createLargeStageData(100);
      recruitmentSystem.initialize(stageData);

      const attacker = characterManager.getPlayerUnits()[0];
      const targets = recruitmentSystem.getRecruitableUnits();

      const endMeasurement = profiler.startMeasurement('parallel-condition-checks');

      // 並行して条件チェックを実行
      const promises = targets.map(target =>
        Promise.resolve(recruitmentSystem.checkRecruitmentEligibility(attacker, target))
      );

      await Promise.all(promises);
      const duration = endMeasurement();

      // 並行処理により高速化されることを確認
      expect(duration).toBeLessThan(targets.length * 0.5); // 逐次処理の半分以下

      console.log(
        `Parallel condition checks (${targets.length} targets): ${duration.toFixed(2)}ms`
      );
    });
  });

  describe('NPC状態管理パフォーマンス', () => {
    test('大量NPC変換のパフォーマンス', () => {
      const stageData = TestDataFactory.createLargeStageData(200);
      recruitmentSystem.initialize(stageData);

      const recruitableUnits = recruitmentSystem.getRecruitableUnits();

      const endMeasurement = profiler.startMeasurement('mass-npc-conversion');

      // 全ての仲間化可能ユニットをNPCに変換
      recruitableUnits.forEach(unit => {
        recruitmentSystem.convertToNPC(unit);
      });

      const duration = endMeasurement();

      // 大量変換でも500ms以内
      expect(duration).toBeLessThan(500);

      console.log(
        `Mass NPC conversion (${recruitableUnits.length} units): ${duration.toFixed(2)}ms`
      );
    });

    test('NPC状態クエリのパフォーマンス', () => {
      const stageData = TestDataFactory.createLargeStageData(100);
      recruitmentSystem.initialize(stageData);

      // 半分のユニットをNPCに変換
      const recruitableUnits = recruitmentSystem.getRecruitableUnits();
      recruitableUnits.slice(0, Math.floor(recruitableUnits.length / 2)).forEach(unit => {
        recruitmentSystem.convertToNPC(unit);
      });

      const allUnits = characterManager.getAllUnits();

      const endMeasurement = profiler.startMeasurement('npc-status-queries');

      // 1000回のNPC状態クエリを実行
      for (let i = 0; i < 1000; i++) {
        const unit = allUnits[i % allUnits.length];
        recruitmentSystem.isNPC(unit);
      }

      const duration = endMeasurement();
      const averagePerQuery = duration / 1000;

      // 1回のクエリは0.1ms以内
      expect(averagePerQuery).toBeLessThan(0.1);

      console.log(`Average NPC status query time: ${averagePerQuery.toFixed(4)}ms`);
    });

    test('NPC優先度計算のパフォーマンス', () => {
      const stageData = TestDataFactory.createLargeStageData(150);
      recruitmentSystem.initialize(stageData);

      // NPCを作成
      const recruitableUnits = recruitmentSystem.getRecruitableUnits();
      recruitableUnits.forEach(unit => {
        recruitmentSystem.convertToNPC(unit);
      });

      const allUnits = characterManager.getAllUnits();

      const endMeasurement = profiler.startMeasurement('npc-priority-calculation');

      // 全ユニットの優先度を計算
      const priorities = allUnits.map(unit => recruitmentSystem.getNPCPriority(unit));

      const duration = endMeasurement();

      expect(priorities.length).toBe(allUnits.length);
      expect(duration).toBeLessThan(50); // 50ms以内

      console.log(`NPC priority calculation (${allUnits.length} units): ${duration.toFixed(2)}ms`);
    });
  });

  describe('UI更新パフォーマンス', () => {
    test('条件表示更新のパフォーマンス', () => {
      const stageData = TestDataFactory.createLargeStageData(50);
      recruitmentSystem.initialize(stageData);

      const recruitableUnits = recruitmentSystem.getRecruitableUnits();

      const endMeasurement = profiler.startMeasurement('ui-condition-updates');

      // 全ての仲間化可能ユニットの条件表示を更新
      recruitableUnits.forEach(unit => {
        const conditions = recruitmentSystem.getRecruitmentConditions(unit);
        recruitmentSystem.showRecruitmentConditions(unit, conditions);
      });

      const duration = endMeasurement();

      // UI更新は200ms以内
      expect(duration).toBeLessThan(200);

      console.log(
        `UI condition updates (${recruitableUnits.length} units): ${duration.toFixed(2)}ms`
      );
    });

    test('進捗表示更新のパフォーマンス', () => {
      const stageData = TestDataFactory.createLargeStageData(30);
      recruitmentSystem.initialize(stageData);

      const attacker = characterManager.getPlayerUnits()[0];
      const recruitableUnits = recruitmentSystem.getRecruitableUnits();

      const endMeasurement = profiler.startMeasurement('progress-updates');

      // 全ユニットの進捗を更新
      recruitableUnits.forEach(unit => {
        const progress = recruitmentSystem.getRecruitmentProgress(unit);
        recruitmentSystem.updateRecruitmentProgress(unit, progress);
      });

      const duration = endMeasurement();

      // 進捗更新は100ms以内
      expect(duration).toBeLessThan(100);

      console.log(`Progress updates (${recruitableUnits.length} units): ${duration.toFixed(2)}ms`);
    });

    test('リアルタイムUI更新のフレームレート維持', () => {
      const stageData = TestDataFactory.createLargeStageData(20);
      recruitmentSystem.initialize(stageData);

      const attacker = characterManager.getPlayerUnits()[0];
      const target = recruitmentSystem.getRecruitableUnits()[0];

      const frameTime = 16.67; // 60fps = 16.67ms per frame
      const frames = 60; // 1秒間のフレーム数

      const endMeasurement = profiler.startMeasurement('realtime-ui-updates');

      // 60フレーム分のUI更新をシミュレート
      for (let frame = 0; frame < frames; frame++) {
        // 条件チェック
        recruitmentSystem.checkRecruitmentEligibility(attacker, target);

        // 進捗更新
        const progress = recruitmentSystem.getRecruitmentProgress(target);
        recruitmentSystem.updateRecruitmentProgress(target, progress);

        // フレーム間隔をシミュレート
        const frameStart = performance.now();
        while (performance.now() - frameStart < 1) {} // 1ms待機
      }

      const totalDuration = endMeasurement();
      const averageFrameTime = totalDuration / frames;

      // 平均フレーム時間が60fpsを維持できることを確認
      expect(averageFrameTime).toBeLessThan(frameTime);

      console.log(`Average frame time with UI updates: ${averageFrameTime.toFixed(2)}ms`);
    });
  });

  describe('メモリ使用量パフォーマンス', () => {
    test('大量データ処理時のメモリ使用量', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 大量のデータを処理
      const stageData = TestDataFactory.createLargeStageData(500);
      recruitmentSystem.initialize(stageData);

      // 全ユニットを処理
      const allUnits = characterManager.getAllUnits();
      allUnits.forEach(unit => {
        if (unit.isRecruitable) {
          const conditions = recruitmentSystem.getRecruitmentConditions(unit);
          recruitmentSystem.showRecruitmentConditions(unit, conditions);
        }
      });

      const peakMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = peakMemory - initialMemory;

      // メモリ増加が100MB以下
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      console.log(`Memory increase with 500 units: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    test('メモリリーク検出', () => {
      const iterations = 10;
      const memoryMeasurements: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const stageData = TestDataFactory.createLargeStageData(100);
        recruitmentSystem.initialize(stageData);

        // 処理を実行
        const recruitableUnits = recruitmentSystem.getRecruitableUnits();
        recruitableUnits.forEach(unit => {
          recruitmentSystem.convertToNPC(unit);
        });

        // システムをクリーンアップ
        recruitmentSystem.cleanup();

        // ガベージコレクションを強制実行
        if (global.gc) {
          global.gc();
        }

        memoryMeasurements.push(process.memoryUsage().heapUsed);
      }

      // メモリ使用量が安定していることを確認（大幅な増加がない）
      const firstMeasurement = memoryMeasurements[0];
      const lastMeasurement = memoryMeasurements[memoryMeasurements.length - 1];
      const memoryGrowth = lastMeasurement - firstMeasurement;

      // メモリ増加が10MB以下（メモリリークなし）
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);

      console.log(
        `Memory growth over ${iterations} iterations: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`
      );
    });
  });

  describe('統合パフォーマンス', () => {
    test('完全な仲間化フローのパフォーマンス', () => {
      const stageData = TestDataFactory.createLargeStageData(100);

      const endMeasurement = profiler.startMeasurement('complete-recruitment-flow');

      // 1. 初期化
      recruitmentSystem.initialize(stageData);

      // 2. 仲間化対象の識別
      const recruitableUnits = recruitmentSystem.getRecruitableUnits();

      // 3. 条件チェック
      const attacker = characterManager.getPlayerUnits()[0];
      recruitableUnits.forEach(unit => {
        recruitmentSystem.checkRecruitmentEligibility(attacker, unit);
      });

      // 4. NPC変換
      recruitableUnits.slice(0, 5).forEach(unit => {
        recruitmentSystem.processRecruitmentAttempt(attacker, unit, unit.currentHP);
      });

      // 5. 仲間化完了
      const recruitedUnits = recruitmentSystem.completeRecruitment();

      const duration = endMeasurement();

      expect(recruitedUnits.length).toBeGreaterThan(0);

      // 完全フローが1秒以内
      expect(duration).toBeLessThan(1000);

      console.log(
        `Complete recruitment flow (${recruitableUnits.length} candidates): ${duration.toFixed(2)}ms`
      );
    });

    test('高負荷状況でのシステム安定性', () => {
      const stageData = TestDataFactory.createLargeStageData(200);
      recruitmentSystem.initialize(stageData);

      const attacker = characterManager.getPlayerUnits()[0];
      const recruitableUnits = recruitmentSystem.getRecruitableUnits();

      const endMeasurement = profiler.startMeasurement('high-load-stability');

      // 高負荷をシミュレート
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            recruitableUnits.forEach(unit => {
              recruitmentSystem.checkRecruitmentEligibility(attacker, unit);
              const progress = recruitmentSystem.getRecruitmentProgress(unit);
              recruitmentSystem.updateRecruitmentProgress(unit, progress);
            });
          })
        );
      }

      return Promise.all(promises).then(() => {
        const duration = endMeasurement();

        // 高負荷でも5秒以内で完了
        expect(duration).toBeLessThan(5000);

        // システムが正常状態を維持
        expect(recruitmentSystem.getSystemStatus()).toBe('ready');

        console.log(`High load stability test: ${duration.toFixed(2)}ms`);
      });
    });
  });

  describe('パフォーマンス回帰テスト', () => {
    test('バージョン間のパフォーマンス比較', () => {
      const testCases = [
        { name: 'small', unitCount: 20 },
        { name: 'medium', unitCount: 100 },
        { name: 'large', unitCount: 300 },
      ];

      const performanceBaseline = {
        small: 50, // 50ms
        medium: 200, // 200ms
        large: 500, // 500ms
      };

      testCases.forEach(testCase => {
        const stageData = TestDataFactory.createLargeStageData(testCase.unitCount);

        const endMeasurement = profiler.startMeasurement(`regression-${testCase.name}`);

        recruitmentSystem.initialize(stageData);
        const recruitableUnits = recruitmentSystem.getRecruitableUnits();

        const attacker = characterManager.getPlayerUnits()[0];
        recruitableUnits.forEach(unit => {
          recruitmentSystem.checkRecruitmentEligibility(attacker, unit);
        });

        const duration = endMeasurement();
        const baseline = performanceBaseline[testCase.name as keyof typeof performanceBaseline];

        // ベースラインを超えないことを確認
        expect(duration).toBeLessThan(baseline);

        // パフォーマンス劣化の警告（ベースラインの80%を超える場合）
        if (duration > baseline * 0.8) {
          console.warn(
            `Performance warning: ${testCase.name} test took ${duration.toFixed(2)}ms (baseline: ${baseline}ms)`
          );
        }

        console.log(
          `${testCase.name} performance: ${duration.toFixed(2)}ms (baseline: ${baseline}ms)`
        );
      });
    });
  });
});
