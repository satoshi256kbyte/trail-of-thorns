/**
 * ChapterStageErrorHandler Property-Based Tests
 *
 * Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
 * 検証: 要件 9.1, 9.2, 9.3, 9.4, 9.5
 *
 * プロパティ13: エラーハンドリングの包括性
 * 任意のエラー条件（データ読み込み失敗、無効なパーティ編成、未解放ステージへのアクセス、保存失敗）に対して、
 * 適切なエラーメッセージが表示され、システムは安全な状態を維持する
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  ChapterStageErrorHandler,
  ChapterStageError,
  ErrorContext,
} from '../../../../game/src/systems/chapter-stage/ChapterStageErrorHandler';

// モックシーンの作成
const createMockScene = () => {
  return {
    cameras: {
      main: {
        width: 800,
        height: 600,
      },
    },
    add: {
      rectangle: vi.fn().mockReturnValue({
        setScrollFactor: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
        active: true,
      }),
      text: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setScrollFactor: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        setInteractive: vi.fn().mockReturnThis(),
        on: vi.fn(),
        destroy: vi.fn(),
        active: true,
      }),
    },
    time: {
      delayedCall: vi.fn(),
    },
  } as any;
};

describe('ChapterStageErrorHandler - Property-Based Tests', () => {
  let errorHandler: ChapterStageErrorHandler;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    errorHandler = new ChapterStageErrorHandler(mockScene);
  });

  afterEach(() => {
    if (errorHandler) {
      errorHandler.destroy();
    }
    vi.clearAllMocks();
  });

  /**
   * プロパティ13: エラーハンドリングの包括性
   *
   * 任意のエラー条件に対して、適切なエラーメッセージが表示され、
   * システムは安全な状態を維持する
   */
  describe('Property 13: エラーハンドリングの包括性', () => {
    // エラー種別のArbitrary
    const errorTypeArb = fc.constantFrom(
      ...Object.values(ChapterStageError)
    ) as fc.Arbitrary<ChapterStageError>;

    // エラーコンテキストのArbitrary
    const errorContextArb = fc.record({
      chapterId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), {
        nil: undefined,
      }),
      stageId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), {
        nil: undefined,
      }),
      characterId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), {
        nil: undefined,
      }),
      slotId: fc.option(fc.integer({ min: 0, max: 9 }), { nil: undefined }),
      additionalInfo: fc.option(fc.dictionary(fc.string(), fc.anything()), {
        nil: undefined,
      }),
    }) as fc.Arbitrary<ErrorContext>;

    test('任意のエラー種別に対してエラーログが記録される', () => {
      fc.assert(
        fc.property(errorTypeArb, errorContextArb, (errorType, context) => {
          // エラーログをクリア
          errorHandler.clearErrorLog();

          // エラーを処理
          errorHandler.handleError(errorType, context);

          // エラーログが記録されていることを確認
          const log = errorHandler.getErrorLog();
          expect(log.length).toBe(1);
          expect(log[0].errorType).toBe(errorType);
          expect(log[0].context).toEqual(context);
          expect(log[0].timestamp).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    test('任意のエラー種別に対してエラーイベントが発行される', async () => {
      await fc.assert(
        fc.asyncProperty(errorTypeArb, errorContextArb, async (errorType, context) => {
          // イベントリスナーを設定
          const eventPromise = new Promise<void>(resolve => {
            errorHandler.once('error-occurred', (data: any) => {
              expect(data.errorType).toBe(errorType);
              expect(data.context).toEqual(context);
              expect(data.message).toBeDefined();
              resolve();
            });
          });

          // エラーを処理
          errorHandler.handleError(errorType, context);

          // イベントが発行されるのを待つ
          await eventPromise;
        }),
        { numRuns: 100 }
      );
    });

    test('複数のエラーが発生してもログが正しく記録される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(errorTypeArb, errorContextArb), {
            minLength: 1,
            maxLength: 10,
          }),
          errors => {
            // エラーログをクリア
            errorHandler.clearErrorLog();

            // 複数のエラーを処理
            errors.forEach(([errorType, context]) => {
              errorHandler.handleError(errorType, context);
            });

            // 全てのエラーがログに記録されていることを確認
            const log = errorHandler.getErrorLog();
            expect(log.length).toBe(errors.length);

            errors.forEach(([errorType, context], index) => {
              expect(log[index].errorType).toBe(errorType);
              expect(log[index].context).toEqual(context);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('エラー統計が正しく集計される', () => {
      fc.assert(
        fc.property(
          fc.array(errorTypeArb, { minLength: 1, maxLength: 20 }),
          errorTypes => {
            // エラーログをクリア
            errorHandler.clearErrorLog();

            // 複数のエラーを処理
            errorTypes.forEach(errorType => {
              errorHandler.handleError(errorType, {});
            });

            // 統計を取得
            const statistics = errorHandler.getErrorStatistics();

            // 各エラー種別の発生回数を確認
            const expectedCounts: Record<string, number> = {};
            errorTypes.forEach(errorType => {
              expectedCounts[errorType] = (expectedCounts[errorType] || 0) + 1;
            });

            Object.entries(expectedCounts).forEach(([errorType, count]) => {
              expect(statistics[errorType]).toBe(count);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('特定のエラー種別のログを正しく取得できる', () => {
      fc.assert(
        fc.property(
          errorTypeArb,
          fc.array(errorTypeArb, { minLength: 5, maxLength: 15 }),
          (targetErrorType, allErrorTypes) => {
            // エラーログをクリア
            errorHandler.clearErrorLog();

            // 複数のエラーを処理
            allErrorTypes.forEach(errorType => {
              errorHandler.handleError(errorType, {});
            });

            // 特定のエラー種別のログを取得
            const filteredLog = errorHandler.getErrorsByType(targetErrorType);

            // 全てのログが指定されたエラー種別であることを確認
            filteredLog.forEach(entry => {
              expect(entry.errorType).toBe(targetErrorType);
            });

            // 件数が正しいことを確認
            const expectedCount = allErrorTypes.filter(
              et => et === targetErrorType
            ).length;
            expect(filteredLog.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('最新のエラーが正しく取得できる', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(errorTypeArb, errorContextArb), {
            minLength: 1,
            maxLength: 10,
          }),
          errors => {
            // エラーログをクリア
            errorHandler.clearErrorLog();

            // 複数のエラーを処理
            errors.forEach(([errorType, context]) => {
              errorHandler.handleError(errorType, context);
            });

            // 最新のエラーを取得
            const latestError = errorHandler.getLatestError();

            // 最後に処理したエラーと一致することを確認
            const [lastErrorType, lastContext] = errors[errors.length - 1];
            expect(latestError).not.toBeNull();
            expect(latestError!.errorType).toBe(lastErrorType);
            expect(latestError!.context).toEqual(lastContext);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('エラーログのサイズ制限が機能する', () => {
      fc.assert(
        fc.property(
          fc.array(errorTypeArb, { minLength: 101, maxLength: 150 }),
          errorTypes => {
            // エラーログをクリア
            errorHandler.clearErrorLog();

            // 最大サイズを超えるエラーを処理
            errorTypes.forEach(errorType => {
              errorHandler.handleError(errorType, {});
            });

            // ログサイズが制限内であることを確認（最大100件）
            const log = errorHandler.getErrorLog();
            expect(log.length).toBeLessThanOrEqual(100);

            // 最新のエラーが保持されていることを確認
            const latestError = errorHandler.getLatestError();
            expect(latestError!.errorType).toBe(
              errorTypes[errorTypes.length - 1]
            );
          }
        ),
        { numRuns: 50 }
      );
    });

    test('重大なエラーに対してcritical-errorイベントが発行される', async () => {
      const criticalErrors = [
        ChapterStageError.SAVE_DATA_CORRUPTED,
        ChapterStageError.DATA_LOAD_FAILED,
      ];

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...criticalErrors),
          errorContextArb,
          async (errorType, context) => {
            // イベントリスナーを設定
            const eventPromise = new Promise<void>(resolve => {
              errorHandler.once('critical-error', (data: any) => {
                expect(data.errorType).toBe(errorType);
                expect(data.context).toEqual(context);
                resolve();
              });
            });

            // エラーを処理
            errorHandler.handleError(errorType, context);

            // イベントが発行されるのを待つ
            await eventPromise;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('ステージ解放エラーに対してshow-unlock-conditionsイベントが発行される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async stageId => {
            const context: ErrorContext = { stageId };

            // イベントリスナーを設定
            const eventPromise = new Promise<void>(resolve => {
              errorHandler.once('show-unlock-conditions', (data: any) => {
                expect(data.stageId).toBe(stageId);
                resolve();
              });
            });

            // エラーを処理
            errorHandler.handleError(
              ChapterStageError.STAGE_NOT_UNLOCKED,
              context
            );

            // イベントが発行されるのを待つ
            await eventPromise;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('セーブ失敗エラーに対してretry-saveイベントが発行される', async () => {
      await fc.assert(
        fc.asyncProperty(errorContextArb, async context => {
          // イベントリスナーを設定
          const eventPromise = new Promise<void>(resolve => {
            errorHandler.once('retry-save', (data: any) => {
              expect(data.context).toEqual(context);
              resolve();
            });
          });

          // エラーを処理
          errorHandler.handleError(ChapterStageError.SAVE_FAILED, context);

          // イベントが発行されるのを待つ
          await eventPromise;
        }),
        { numRuns: 100 }
      );
    });
  });
});
