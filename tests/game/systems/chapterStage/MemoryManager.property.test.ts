/**
 * メモリ管理システムのプロパティベーステスト
 * Property-Based Tests for Memory Management System
 *
 * プロパティ14: メモリ管理の効率性
 * Property 14: Memory Management Efficiency
 *
 * 検証: 要件 10.3
 * Validates: Requirements 10.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  MemoryManager,
  SimpleCleanableResource,
  CleanableResource,
} from '../../../../game/src/systems/chapterStage/MemoryManager';

describe('MemoryManager Property-Based Tests', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = MemoryManager.getInstance();
  });

  afterEach(() => {
    memoryManager.destroy();
  });

  /**
   * プロパティ14: メモリ管理の効率性
   * Property 14: Memory Management Efficiency
   *
   * 任意の章切り替え操作に対して、前章のデータが適切にクリーンアップされ、
   * メモリリークが発生しない
   *
   * For any chapter switch operation, previous chapter data is properly cleaned up
   * and no memory leaks occur
   *
   * 検証: 要件 10.3
   * Validates: Requirements 10.3
   */
  describe('Property 14: Memory Management Efficiency', () => {
    it('章切り替え時に前章のリソースが全てクリーンアップされる', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
            minLength: 1,
            maxLength: 10,
          }),
          (resourceIds) => {
            // 前章のリソースを登録
            const resources: CleanableResource[] = [];
            resourceIds.forEach((id) => {
              const resource = new SimpleCleanableResource();
              resources.push(resource);
              memoryManager.registerResource(id, resource);
            });

            // 初期状態の確認
            const statsBefore = memoryManager.getMemoryStats();
            expect(statsBefore.cacheSize).toBe(resourceIds.length);

            // 章切り替え時のクリーンアップ
            memoryManager.cleanupChapterData();

            // クリーンアップ後の確認
            const statsAfter = memoryManager.getMemoryStats();

            // プロパティ: 全リソースがクリーンアップされている
            expect(statsAfter.cacheSize).toBe(0);

            // プロパティ: 全リソースのcleanup()が呼ばれている
            resources.forEach((resource) => {
              expect(resource.isInUse()).toBe(false);
            });

            // プロパティ: イベントリスナーもクリアされている
            expect(statsAfter.activeListeners).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('未使用リソースのみがクリーンアップされる', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              inUse: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (resourceConfigs) => {
            // 前回のイテレーションのリソースをクリーンアップ
            memoryManager.cleanupChapterData();

            // リソースを登録
            const resources: Map<string, SimpleCleanableResource> = new Map();
            resourceConfigs.forEach((config) => {
              const resource = new SimpleCleanableResource();
              resource.setInUse(config.inUse);
              resources.set(config.id, resource);
              memoryManager.registerResource(config.id, resource);
            });

            // 使用中のリソース数をカウント
            const inUseCount = resourceConfigs.filter((c) => c.inUse).length;
            const unusedCount = resourceConfigs.length - inUseCount;

            // 未使用リソースのクリーンアップ
            const cleanedCount = memoryManager.cleanupUnusedResources();

            // プロパティ: クリーンアップされた数が未使用リソース数と一致
            expect(cleanedCount).toBe(unusedCount);

            // プロパティ: 使用中のリソースは残っている
            const statsAfter = memoryManager.getMemoryStats();
            expect(statsAfter.cacheSize).toBe(inUseCount);

            // プロパティ: 使用中のリソースはまだ使用可能
            resourceConfigs.forEach((config) => {
              const resource = resources.get(config.id);
              if (config.inUse) {
                expect(resource?.isInUse()).toBe(true);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('イベントリスナーが適切に管理される', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              eventName: fc.string({ minLength: 1, maxLength: 20 }),
              listenerCount: fc.integer({ min: 1, max: 5 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (eventConfigs) => {
            // イベントリスナーを追加
            const listeners: Map<string, Function[]> = new Map();
            let totalListeners = 0;

            eventConfigs.forEach((config) => {
              const eventListeners: Function[] = [];
              for (let i = 0; i < config.listenerCount; i++) {
                const listener = () => {};
                eventListeners.push(listener);
                memoryManager.addEventListener(config.eventName, listener);
                totalListeners++;
              }
              listeners.set(config.eventName, eventListeners);
            });

            // 初期状態の確認
            const statsBefore = memoryManager.getMemoryStats();
            expect(statsBefore.activeListeners).toBe(totalListeners);

            // 章切り替え時のクリーンアップ
            memoryManager.cleanupChapterData();

            // クリーンアップ後の確認
            const statsAfter = memoryManager.getMemoryStats();

            // プロパティ: 全イベントリスナーがクリアされている
            expect(statsAfter.activeListeners).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('複数回の章切り替えでメモリリークが発生しない', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
              minLength: 1,
              maxLength: 5,
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (chapterResourceLists) => {
            const initialStats = memoryManager.getMemoryStats();

            // 複数の章を順番に処理
            chapterResourceLists.forEach((resourceIds) => {
              // 章のリソースを登録
              resourceIds.forEach((id) => {
                const resource = new SimpleCleanableResource();
                memoryManager.registerResource(id, resource);
              });

              // 章切り替え時のクリーンアップ
              memoryManager.cleanupChapterData();
            });

            // 最終状態の確認
            const finalStats = memoryManager.getMemoryStats();

            // プロパティ: 全ての章切り替え後、リソースが残っていない
            expect(finalStats.cacheSize).toBe(0);

            // プロパティ: イベントリスナーが残っていない
            expect(finalStats.activeListeners).toBe(0);

            // プロパティ: メモリ使用量が初期状態と同等
            expect(finalStats.usedMemory).toBeLessThanOrEqual(
              initialStats.usedMemory + 1024
            ); // 1KB以内の誤差を許容
          }
        ),
        { numRuns: 50 }
      );
    });

    it('リソースの登録と登録解除が正しく動作する', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              shouldUnregister: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (resourceConfigs) => {
            // 前回のイテレーションのリソースをクリーンアップ
            memoryManager.cleanupChapterData();

            // リソースを登録
            const cleanupCalled: Map<string, boolean> = new Map();
            resourceConfigs.forEach((config) => {
              cleanupCalled.set(config.id, false);
              const resource = new SimpleCleanableResource(() => {
                cleanupCalled.set(config.id, true);
              });
              memoryManager.registerResource(config.id, resource);
            });

            // 一部のリソースを登録解除
            const unregisteredIds = resourceConfigs
              .filter((c) => c.shouldUnregister)
              .map((c) => c.id);

            unregisteredIds.forEach((id) => {
              memoryManager.unregisterResource(id);
            });

            // 登録解除されたリソースのクリーンアップが呼ばれている
            unregisteredIds.forEach((id) => {
              expect(cleanupCalled.get(id)).toBe(true);
            });

            // 残りのリソース数を確認
            const stats = memoryManager.getMemoryStats();
            const expectedRemaining =
              resourceConfigs.length - unregisteredIds.length;
            expect(stats.cacheSize).toBe(expectedRemaining);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('メモリ統計が正確に報告される', () => {
      fc.assert(
        fc.property(
          fc.record({
            resourceCount: fc.integer({ min: 0, max: 20 }),
            eventCount: fc.integer({ min: 0, max: 10 }),
            listenersPerEvent: fc.integer({ min: 1, max: 5 }),
          }),
          (config) => {
            // 前回のイテレーションのリソースをクリーンアップ
            memoryManager.cleanupChapterData();

            // リソースを登録
            for (let i = 0; i < config.resourceCount; i++) {
              const resource = new SimpleCleanableResource();
              memoryManager.registerResource(`resource-${i}`, resource);
            }

            // イベントリスナーを追加
            let totalListeners = 0;
            for (let i = 0; i < config.eventCount; i++) {
              for (let j = 0; j < config.listenersPerEvent; j++) {
                memoryManager.addEventListener(`event-${i}`, () => {});
                totalListeners++;
              }
            }

            // 統計を取得
            const stats = memoryManager.getMemoryStats();

            // プロパティ: キャッシュサイズが正確
            expect(stats.cacheSize).toBe(config.resourceCount);

            // プロパティ: アクティブリスナー数が正確
            expect(stats.activeListeners).toBe(totalListeners);

            // プロパティ: メモリ使用量が推定値と一致
            const expectedMemory = config.resourceCount * 1024;
            expect(stats.usedMemory).toBe(expectedMemory);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
