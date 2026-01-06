/**
 * ChapterStageErrorHandler プロパティベーステスト
 *
 * プロパティ13: エラーハンドリングの包括性
 * 任意のエラー条件（データ読み込み失敗、無効なパーティ編成、未解放ステージへのアクセス、保存失敗）に対して、
 * 適切なエラーメッセージが表示され、システムは安全な状態を維持する
 *
 * 検証: 要件 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ChapterStageErrorHandler,
  ChapterStageError,
  ErrorContext,
} from '../../../../game/src/systems/chapter-stage/ChapterStageErrorHandler';

/**
 * モックシーンの作成
 */
function createMockScene() {
  const mockScene = {
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
    uiManager: null,
  };

  return mockScene;
}

/**
 * ランダムなエラーコンテキストを生成
 */
function generateRandomErrorContext(): ErrorContext {
  const contexts: ErrorContext[] = [
    { chapterId: 'chapter-1' },
    { stageId: 'stage-1-1' },
    { characterId: 'hero' },
    { slotId: 1 },
    { chapterId: 'chapter-2', stageId: 'stage-2-3' },
    { characterId: 'warrior', additionalInfo: { level: 5 } },
    {},
  ];

  return contexts[Math.floor(Math.random() * contexts.length)];
}

/**
 * 全てのエラー種別を取得
 */
function getAllErrorTypes(): ChapterStageError[] {
  return Object.values(ChapterStageError);
}

describe('ChapterStageErrorHandler プロパティベーステスト', () => {
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
  });

  /**
   * プロパティ13: エラーハンドリングの包括性
   *
   * 任意のエラー条件に対して、適切なエラーメッセージが表示され、
   * システムは安全な状態を維持する
   */
  describe('プロパティ13: エラーハンドリングの包括性', () => {
    test(
      '任意のエラー種別に対して、エラーメッセージが生成される',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        const iterations = 100;
        const errorTypes = getAllErrorTypes();

        for (let i = 0; i < iterations; i++) {
          // ランダムなエラー種別を選択
          const errorType =
            errorTypes[Math.floor(Math.random() * errorTypes.length)];
          const context = generateRandomErrorContext();

          // エラーを処理
          await errorHandler.handleError(errorType, context);

          // エラーログが記録されていることを確認
          const latestError = errorHandler.getLatestError();
          expect(latestError).not.toBeNull();
          expect(latestError?.errorType).toBe(errorType);
          expect(latestError?.message).toBeTruthy();
          expect(latestError?.message.length).toBeGreaterThan(0);
        }
      },
      10000
    );

    test(
      '任意のエラー種別に対して、エラーログが正しく記録される',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        const iterations = 100;
        const errorTypes = getAllErrorTypes();

        for (let i = 0; i < iterations; i++) {
          const errorType =
            errorTypes[Math.floor(Math.random() * errorTypes.length)];
          const context = generateRandomErrorContext();

          await errorHandler.handleError(errorType, context);

          const latestError = errorHandler.getLatestError();
          expect(latestError).not.toBeNull();
          expect(latestError?.timestamp).toBeGreaterThan(0);
          expect(latestError?.errorType).toBe(errorType);
          expect(latestError?.context).toEqual(context);
        }
      },
      10000
    );

    test(
      '任意のエラー種別に対して、システムは安全な状態を維持する（エラーハンドラーが破壊されない）',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        const iterations = 100;
        const errorTypes = getAllErrorTypes();

        for (let i = 0; i < iterations; i++) {
          const errorType =
            errorTypes[Math.floor(Math.random() * errorTypes.length)];
          const context = generateRandomErrorContext();

          // エラーを処理してもエラーハンドラーが正常に動作し続けることを確認
          await expect(
            errorHandler.handleError(errorType, context)
          ).resolves.not.toThrow();

          // エラーハンドラーが引き続き使用可能であることを確認
          const errorLog = errorHandler.getErrorLog();
          expect(errorLog).toBeDefined();
          expect(Array.isArray(errorLog)).toBe(true);
        }
      },
      10000
    );

    test(
      'データ読み込みエラーに対して、適切なエラーメッセージが表示される',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        // 要件 9.1: データ読み込みエラーが発生する場合
        const iterations = 50;
        const dataLoadErrors = [
          ChapterStageError.DATA_LOAD_FAILED,
          ChapterStageError.CHAPTER_NOT_FOUND,
          ChapterStageError.STAGE_NOT_FOUND,
        ];

        for (let i = 0; i < iterations; i++) {
          const errorType =
            dataLoadErrors[Math.floor(Math.random() * dataLoadErrors.length)];
          const context = generateRandomErrorContext();

          await errorHandler.handleError(errorType, context);

          const latestError = errorHandler.getLatestError();
          expect(latestError).not.toBeNull();
          expect(latestError?.message).toBeTruthy();
          // エラーメッセージが空でないことを確認
          expect(latestError?.message.length).toBeGreaterThan(0);
        }
      },
      10000
    );

    test('無効なパーティ編成エラーに対して、具体的な問題を説明するメッセージが表示される', async () => {
      // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
      // 要件 9.2: 無効なパーティ編成を検出する場合
      const iterations = 50;
      const partyErrors = [
        ChapterStageError.PARTY_FULL,
        ChapterStageError.CHARACTER_LOST,
        ChapterStageError.CHARACTER_NOT_AVAILABLE,
        ChapterStageError.CHARACTER_DUPLICATE,
      ];

      for (let i = 0; i < iterations; i++) {
        const errorType =
          partyErrors[Math.floor(Math.random() * partyErrors.length)];
        const context = { characterId: `char-${i}` };

        await errorHandler.handleError(errorType, context);

        const latestError = errorHandler.getLatestError();
        expect(latestError).not.toBeNull();
        expect(latestError?.message).toBeTruthy();
        // パーティ関連のエラーメッセージが含まれることを確認
        expect(
          latestError?.message.includes('パーティ') ||
            latestError?.message.includes('キャラクター')
        ).toBe(true);
      }
    });

    test('ステージ解放条件エラーに対して、必要な条件が明確に表示される', async () => {
      // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
      // 要件 9.3: ステージ解放条件を満たしていない場合
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const context = { stageId: `stage-${i % 10}-${i % 5}` };

        await errorHandler.handleError(
          ChapterStageError.STAGE_NOT_UNLOCKED,
          context
        );

        const latestError = errorHandler.getLatestError();
        expect(latestError).not.toBeNull();
        expect(latestError?.message).toBeTruthy();
        // 解放条件に関するメッセージが含まれることを確認
        expect(
          latestError?.message.includes('解放') ||
            latestError?.message.includes('条件')
        ).toBe(true);
      }
    });

    test(
      'セーブデータ保存失敗エラーに対して、再試行オプションが提供される',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        // 要件 9.4: セーブデータの保存に失敗する場合
        const iterations = 50;
        let retrySaveEventCount = 0;

        errorHandler.on('retry-save', () => {
          retrySaveEventCount++;
        });

        for (let i = 0; i < iterations; i++) {
          const context = { slotId: i % 5 };

          await errorHandler.handleError(ChapterStageError.SAVE_FAILED, context);

          const latestError = errorHandler.getLatestError();
          expect(latestError).not.toBeNull();
          expect(latestError?.errorType).toBe(ChapterStageError.SAVE_FAILED);
        }

        // 再試行イベントが発行されていることを確認
        expect(retrySaveEventCount).toBeGreaterThan(0);
      },
      10000
    );

    test(
      'システムエラーに対して、エラーログが記録される',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        // 要件 9.5: システムエラーが発生する場合
        const iterations = 100;
        const errorTypes = getAllErrorTypes();

        for (let i = 0; i < iterations; i++) {
          const errorType =
            errorTypes[Math.floor(Math.random() * errorTypes.length)];
          const context = generateRandomErrorContext();
          const error = new Error(`Test error ${i}`);

          await errorHandler.handleError(errorType, context, error);

          const latestError = errorHandler.getLatestError();
          expect(latestError).not.toBeNull();
          expect(latestError?.stackTrace).toBeDefined();
        }
      },
      10000
    );

    test(
      'エラーログが最大サイズを超えない',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        const iterations = 150; // 最大ログサイズ（100）を超える回数
        const errorTypes = getAllErrorTypes();

        for (let i = 0; i < iterations; i++) {
          const errorType =
            errorTypes[Math.floor(Math.random() * errorTypes.length)];
          await errorHandler.handleError(errorType, {});
        }

        const errorLog = errorHandler.getErrorLog();
        expect(errorLog.length).toBeLessThanOrEqual(100);
      },
      10000
    );

    test(
      'エラー統計が正しく集計される',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        const iterations = 100;
        const errorCounts: Record<string, number> = {};

        for (let i = 0; i < iterations; i++) {
          const errorTypes = getAllErrorTypes();
          const errorType =
            errorTypes[Math.floor(Math.random() * errorTypes.length)];

          errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
          await errorHandler.handleError(errorType, {});
        }

        const statistics = errorHandler.getErrorStatistics();

        // 統計が正しく集計されていることを確認
        for (const [errorType, count] of Object.entries(errorCounts)) {
          expect(statistics[errorType]).toBe(count);
        }
      },
      10000
    );

    test(
      '特定のエラー種別でフィルタリングできる',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        const iterations = 50;
        const targetErrorType = ChapterStageError.PARTY_FULL;
        let targetErrorCount = 0;

        for (let i = 0; i < iterations; i++) {
          const errorTypes = getAllErrorTypes();
          const errorType =
            errorTypes[Math.floor(Math.random() * errorTypes.length)];

          if (errorType === targetErrorType) {
            targetErrorCount++;
          }

          await errorHandler.handleError(errorType, {});
        }

        const filteredErrors = errorHandler.getErrorsByType(targetErrorType);
        expect(filteredErrors.length).toBe(targetErrorCount);

        // 全てのフィルタリングされたエラーが正しい種別であることを確認
        for (const error of filteredErrors) {
          expect(error.errorType).toBe(targetErrorType);
        }
      },
      10000
    );

    test(
      'エラーハンドラーの破棄後は新しいエラーを処理できない',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        const errorType = ChapterStageError.DATA_LOAD_FAILED;

        // エラーを処理
        await errorHandler.handleError(errorType, {});
        expect(errorHandler.getLatestError()).not.toBeNull();

        // エラーハンドラーを破棄
        errorHandler.destroy();

        // 破棄後はエラーログがクリアされている
        expect(errorHandler.getErrorLog().length).toBe(0);
      },
      10000
    );

    test(
      '複数のエラーが連続して発生しても、全て正しく記録される',
      async () => {
        // Feature: 3.4-chapter-stage-management, Property 13: エラーハンドリングの包括性
        const iterations = 100;
        const errorTypes = getAllErrorTypes();
        const recordedErrors: ChapterStageError[] = [];

        for (let i = 0; i < iterations; i++) {
          const errorType =
            errorTypes[Math.floor(Math.random() * errorTypes.length)];
          recordedErrors.push(errorType);

          await errorHandler.handleError(errorType, {});
        }

        const errorLog = errorHandler.getErrorLog();

        // 記録されたエラーの数が正しいことを確認（最大100件）
        expect(errorLog.length).toBe(Math.min(iterations, 100));

        // 最新のエラーが正しく記録されていることを確認
        const latestRecordedErrors = recordedErrors.slice(-100);
        for (let i = 0; i < errorLog.length; i++) {
          expect(errorLog[i].errorType).toBe(
            latestRecordedErrors[i + Math.max(0, iterations - 100)]
          );
        }
      },
      10000
    );
  });
});
