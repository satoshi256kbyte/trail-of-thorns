/**
 * VictoryConditionPerformance.test.ts
 * 
 * パフォーマンス最適化とメモリ管理のテスト
 * 要件13.1, 13.2, 13.3, 13.4, 13.5のテスト
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { VictoryConditionPerformanceManager } from '../../../../game/src/systems/victory/VictoryConditionPerformanceManager';
import { BossEffectPool, PoolableEffect } from '../../../../game/src/systems/victory/BossEffectPool';
import { GameState } from '../../../../game/src/types/gameplay';

describe('VictoryConditionPerformanceManager', () => {
  let performanceManager: VictoryConditionPerformanceManager;

  beforeEach(() => {
    performanceManager = new VictoryConditionPerformanceManager({
      enableDebugLogs: false,
      cacheExpirationMs: 1000,
      maxBatchSize: 10,
      batchFlushIntervalMs: 100,
    });
  });

  afterEach(() => {
    performanceManager.destroy();
  });

  describe('勝利・敗北条件判定のキャッシュ（要件13.1）', () => {
    test('勝利条件判定結果をキャッシュできる', () => {
      const gameState: GameState = {
        currentTurn: 1,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const victoryResult = {
        isVictory: true,
        satisfiedConditions: [],
        unsatisfiedConditions: [],
        message: 'Victory!',
      };

      // キャッシュに保存
      performanceManager.cacheVictoryCheck(gameState, victoryResult);

      // キャッシュから取得
      const cached = performanceManager.getCachedVictoryCheck(gameState);

      expect(cached).not.toBeNull();
      expect(cached?.isVictory).toBe(true);
      expect(cached?.message).toBe('Victory!');
    });

    test('敗北条件判定結果をキャッシュできる', () => {
      const gameState: GameState = {
        currentTurn: 1,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const defeatResult = {
        isDefeat: true,
        triggeredConditions: [],
        message: 'Defeat!',
      };

      // キャッシュに保存
      performanceManager.cacheDefeatCheck(gameState, defeatResult);

      // キャッシュから取得
      const cached = performanceManager.getCachedDefeatCheck(gameState);

      expect(cached).not.toBeNull();
      expect(cached?.isDefeat).toBe(true);
      expect(cached?.message).toBe('Defeat!');
    });

    test('異なるターンのキャッシュは無効', () => {
      const gameState1: GameState = {
        currentTurn: 1,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const gameState2: GameState = {
        ...gameState1,
        currentTurn: 2,
      };

      const victoryResult = {
        isVictory: true,
        satisfiedConditions: [],
        unsatisfiedConditions: [],
        message: 'Victory!',
      };

      // ターン1でキャッシュ
      performanceManager.cacheVictoryCheck(gameState1, victoryResult);

      // ターン2で取得を試みる
      const cached = performanceManager.getCachedVictoryCheck(gameState2);

      expect(cached).toBeNull();
    });

    test('キャッシュヒット率を計算できる', () => {
      const gameState: GameState = {
        currentTurn: 1,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const victoryResult = {
        isVictory: true,
        satisfiedConditions: [],
        unsatisfiedConditions: [],
        message: 'Victory!',
      };

      // キャッシュに保存
      performanceManager.cacheVictoryCheck(gameState, victoryResult);

      // ヒット
      performanceManager.getCachedVictoryCheck(gameState);

      // ミス
      performanceManager.getCachedVictoryCheck({
        ...gameState,
        currentTurn: 2,
      });

      const hitRate = performanceManager.getCacheHitRate();
      expect(hitRate).toBe(0.5); // 1ヒット / 2試行
    });
  });

  describe('目標進捗更新のバッチ処理（要件13.2）', () => {
    test('目標進捗更新をキューに追加できる', () => {
      performanceManager.queueObjectiveUpdate('obj1', 5, 10);
      performanceManager.queueObjectiveUpdate('obj2', 3, 5);

      expect(performanceManager.getBatchQueueSize()).toBe(2);
    });

    test('バッチ更新をフラッシュできる', () => {
      performanceManager.queueObjectiveUpdate('obj1', 5, 10);
      performanceManager.queueObjectiveUpdate('obj2', 3, 5);

      const updates = performanceManager.flushBatchUpdates();

      expect(updates).toHaveLength(2);
      expect(updates[0].objectiveId).toBe('obj1');
      expect(updates[0].current).toBe(5);
      expect(updates[1].objectiveId).toBe('obj2');
      expect(updates[1].current).toBe(3);

      // フラッシュ後はキューが空
      expect(performanceManager.getBatchQueueSize()).toBe(0);
    });

    test('最大バッチサイズに達すると自動フラッシュ', () => {
      const maxSize = 10;

      // 最大サイズまで追加
      for (let i = 0; i < maxSize; i++) {
        performanceManager.queueObjectiveUpdate(`obj${i}`, i, 10);
      }

      // 自動フラッシュされているはず
      expect(performanceManager.getBatchQueueSize()).toBe(0);
    });

    test('バッチ処理の統計を記録', () => {
      performanceManager.queueObjectiveUpdate('obj1', 5, 10);
      performanceManager.queueObjectiveUpdate('obj2', 3, 5);
      performanceManager.flushBatchUpdates();

      const stats = performanceManager.getStats();
      expect(stats.batchUpdatesProcessed).toBe(2);
    });
  });

  describe('報酬計算の遅延評価（要件13.4）', () => {
    test('報酬計算結果をキャッシュできる', () => {
      const stageId = 'stage1';
      const performance = {
        turnsUsed: 10,
        unitsLost: 1,
        enemiesDefeated: 5,
        bossesDefeated: 1,
        recruitmentSuccesses: 2,
      };

      const performanceHash = performanceManager.generatePerformanceHash(performance);
      const rewards = { baseExperience: 1000 };

      // キャッシュに保存
      performanceManager.cacheRewardCalculation(stageId, performanceHash, rewards);

      // キャッシュから取得
      const cached = performanceManager.getCachedRewardCalculation(stageId, performanceHash);

      expect(cached).not.toBeNull();
      expect(cached.baseExperience).toBe(1000);
    });

    test('パフォーマンスハッシュを生成できる', () => {
      const performance = {
        turnsUsed: 10,
        unitsLost: 1,
        enemiesDefeated: 5,
        bossesDefeated: 1,
        recruitmentSuccesses: 2,
      };

      const hash = performanceManager.generatePerformanceHash(performance);

      expect(hash).toBe('t10_l1_e5_b1_r2');
    });

    test('異なるパフォーマンスは異なるキャッシュ', () => {
      const stageId = 'stage1';
      const performance1 = {
        turnsUsed: 10,
        unitsLost: 1,
        enemiesDefeated: 5,
        bossesDefeated: 1,
        recruitmentSuccesses: 2,
      };
      const performance2 = {
        ...performance1,
        turnsUsed: 15,
      };

      const hash1 = performanceManager.generatePerformanceHash(performance1);
      const hash2 = performanceManager.generatePerformanceHash(performance2);

      const rewards1 = { baseExperience: 1000 };
      const rewards2 = { baseExperience: 800 };

      performanceManager.cacheRewardCalculation(stageId, hash1, rewards1);
      performanceManager.cacheRewardCalculation(stageId, hash2, rewards2);

      const cached1 = performanceManager.getCachedRewardCalculation(stageId, hash1);
      const cached2 = performanceManager.getCachedRewardCalculation(stageId, hash2);

      expect(cached1.baseExperience).toBe(1000);
      expect(cached2.baseExperience).toBe(800);
    });
  });

  describe('メモリリーク防止（要件13.5）', () => {
    test('メモリクリーンアップを実行できる', () => {
      const gameState: GameState = {
        currentTurn: 1,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const victoryResult = {
        isVictory: true,
        satisfiedConditions: [],
        unsatisfiedConditions: [],
        message: 'Victory!',
      };

      // キャッシュに保存
      performanceManager.cacheVictoryCheck(gameState, victoryResult);

      // クリーンアップを実行
      performanceManager.performMemoryCleanup();

      const stats = performanceManager.getStats();
      expect(stats.lastCleanupTime).toBeGreaterThan(0);
    });

    test('すべてのキャッシュとキューをクリアできる', () => {
      const gameState: GameState = {
        currentTurn: 1,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const victoryResult = {
        isVictory: true,
        satisfiedConditions: [],
        unsatisfiedConditions: [],
        message: 'Victory!',
      };

      performanceManager.cacheVictoryCheck(gameState, victoryResult);
      performanceManager.queueObjectiveUpdate('obj1', 5, 10);

      performanceManager.clearAll();

      // キャッシュがクリアされている
      const cached = performanceManager.getCachedVictoryCheck(gameState);
      expect(cached).toBeNull();

      // キューがクリアされている
      expect(performanceManager.getBatchQueueSize()).toBe(0);
    });

    test('メモリ使用量を推定できる', () => {
      const stats = performanceManager.getStats();
      expect(stats.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    test('リソースを適切に解放できる', () => {
      performanceManager.queueObjectiveUpdate('obj1', 5, 10);

      performanceManager.destroy();

      // 破棄後はキューが空
      expect(performanceManager.getBatchQueueSize()).toBe(0);
    });
  });

  describe('パフォーマンス統計', () => {
    test('統計情報を取得できる', () => {
      const stats = performanceManager.getStats();

      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('batchUpdatesProcessed');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('lastCleanupTime');
    });

    test('統計をリセットできる', () => {
      const gameState: GameState = {
        currentTurn: 1,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };

      const victoryResult = {
        isVictory: true,
        satisfiedConditions: [],
        unsatisfiedConditions: [],
        message: 'Victory!',
      };

      performanceManager.cacheVictoryCheck(gameState, victoryResult);
      performanceManager.getCachedVictoryCheck(gameState);

      performanceManager.resetStats();

      const stats = performanceManager.getStats();
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });

    test('デバッグ情報を取得できる', () => {
      const debugInfo = performanceManager.getDebugInfo();

      expect(debugInfo).toHaveProperty('config');
      expect(debugInfo).toHaveProperty('stats');
      expect(debugInfo).toHaveProperty('cacheHitRate');
      expect(debugInfo).toHaveProperty('caches');
      expect(debugInfo).toHaveProperty('batchQueue');
    });
  });
});

describe('BossEffectPool', () => {
  let scene: any;
  let effectPool: BossEffectPool;

  // モックエフェクトクラス
  class MockEffect implements PoolableEffect {
    private active: boolean = true;

    reset(): void {
      this.active = true;
    }

    destroy(): void {
      this.active = false;
    }

    isActive(): boolean {
      return this.active;
    }
  }

  beforeEach(() => {
    scene = {};
    effectPool = new BossEffectPool(scene);
  });

  afterEach(() => {
    effectPool.destroy();
  });

  describe('オブジェクトプール管理（要件13.3）', () => {
    test('エフェクトプールを登録できる', () => {
      effectPool.registerPool('testEffect', () => new MockEffect(), {
        initialSize: 5,
        maxSize: 20,
      });

      const stats = effectPool.getPoolStats('testEffect');
      expect(stats).not.toBeNull();
      expect(stats?.currentSize).toBe(5);
    });

    test('エフェクトを取得できる', () => {
      effectPool.registerPool('testEffect', () => new MockEffect());

      const effect = effectPool.acquire<MockEffect>('testEffect');

      expect(effect).toBeDefined();
      expect(effect.isActive()).toBe(true);
    });

    test('エフェクトを返却できる', () => {
      effectPool.registerPool('testEffect', () => new MockEffect());

      const effect = effectPool.acquire<MockEffect>('testEffect');
      effectPool.release('testEffect', effect);

      const stats = effectPool.getPoolStats('testEffect');
      expect(stats?.currentActive).toBe(0);
    });

    test('複数のエフェクトを管理できる', () => {
      effectPool.registerPool('effect1', () => new MockEffect());
      effectPool.registerPool('effect2', () => new MockEffect());

      const effect1 = effectPool.acquire<MockEffect>('effect1');
      const effect2 = effectPool.acquire<MockEffect>('effect2');

      expect(effect1).toBeDefined();
      expect(effect2).toBeDefined();
    });

    test('プールのすべてのアクティブオブジェクトを返却できる', () => {
      effectPool.registerPool('testEffect', () => new MockEffect());

      effectPool.acquire<MockEffect>('testEffect');
      effectPool.acquire<MockEffect>('testEffect');
      effectPool.acquire<MockEffect>('testEffect');

      effectPool.releaseAll('testEffect');

      const stats = effectPool.getPoolStats('testEffect');
      expect(stats?.currentActive).toBe(0);
    });

    test('すべてのプールのアクティブオブジェクトを返却できる', () => {
      effectPool.registerPool('effect1', () => new MockEffect());
      effectPool.registerPool('effect2', () => new MockEffect());

      effectPool.acquire<MockEffect>('effect1');
      effectPool.acquire<MockEffect>('effect2');

      effectPool.releaseAllPools();

      const stats1 = effectPool.getPoolStats('effect1');
      const stats2 = effectPool.getPoolStats('effect2');

      expect(stats1?.currentActive).toBe(0);
      expect(stats2?.currentActive).toBe(0);
    });

    test('プール統計を取得できる', () => {
      effectPool.registerPool('testEffect', () => new MockEffect());

      effectPool.acquire<MockEffect>('testEffect');
      effectPool.acquire<MockEffect>('testEffect');

      const stats = effectPool.getPoolStats('testEffect');

      expect(stats).not.toBeNull();
      expect(stats?.totalAcquired).toBe(2);
      expect(stats?.currentActive).toBe(2);
    });

    test('すべてのプール統計を取得できる', () => {
      effectPool.registerPool('effect1', () => new MockEffect());
      effectPool.registerPool('effect2', () => new MockEffect());

      const allStats = effectPool.getAllPoolStats();

      expect(allStats.size).toBe(2);
      expect(allStats.has('effect1')).toBe(true);
      expect(allStats.has('effect2')).toBe(true);
    });

    test('プールをクリアできる', () => {
      effectPool.registerPool('testEffect', () => new MockEffect());

      effectPool.acquire<MockEffect>('testEffect');
      effectPool.clearPool('testEffect');

      const stats = effectPool.getPoolStats('testEffect');
      expect(stats?.currentActive).toBe(0);
      expect(stats?.currentInactive).toBe(0);
    });

    test('すべてのプールをクリアできる', () => {
      effectPool.registerPool('effect1', () => new MockEffect());
      effectPool.registerPool('effect2', () => new MockEffect());

      effectPool.acquire<MockEffect>('effect1');
      effectPool.acquire<MockEffect>('effect2');

      effectPool.clearAllPools();

      const stats1 = effectPool.getPoolStats('effect1');
      const stats2 = effectPool.getPoolStats('effect2');

      expect(stats1?.currentSize).toBe(0);
      expect(stats2?.currentSize).toBe(0);
    });

    test('プールを削除できる', () => {
      effectPool.registerPool('testEffect', () => new MockEffect());

      effectPool.removePool('testEffect');

      const stats = effectPool.getPoolStats('testEffect');
      expect(stats).toBeNull();
    });

    test('リソースを適切に解放できる', () => {
      effectPool.registerPool('testEffect', () => new MockEffect());

      effectPool.acquire<MockEffect>('testEffect');

      effectPool.destroy();

      // 破棄後は統計が取得できない
      const stats = effectPool.getPoolStats('testEffect');
      expect(stats).toBeNull();
    });
  });
});
