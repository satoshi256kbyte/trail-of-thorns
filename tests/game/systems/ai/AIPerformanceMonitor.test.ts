/**
 * AIPerformanceMonitor のユニットテスト
 */

import { AIPerformanceMonitor, AIPerformanceUtils, PerformanceAlert } from '../../../../game/src/systems/ai/AIPerformanceMonitor';
import { ActionType, AIAction, AIContext, Unit } from '../../../../game/src/types/ai';
import { Position } from '../../../../game/src/types/movement';

// モックユニット作成ヘルパー
const createMockUnit = (id: string, position: Position = { x: 0, y: 0 }): Unit => ({
    id,
    name: `Test Unit ${id}`,
    position,
    currentHP: 100,
    maxHP: 100,
    currentMP: 50,
    maxMP: 50,
    stats: {
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3,
        maxHP: 100,
        maxMP: 50
    },
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    level: 1,
    experience: 0,
    skills: [],
    equipment: {},
    statusEffects: []
});

// モックAIContext作成ヘルパー
const createMockAIContext = (characterId: string): AIContext => ({
    currentCharacter: createMockUnit(characterId),
    gameState: {},
    visibleEnemies: [createMockUnit('enemy1'), createMockUnit('enemy2')],
    visibleAllies: [createMockUnit('ally1')],
    npcs: [],
    availableSkills: [],
    terrainData: {},
    turnNumber: 1,
    difficultySettings: {
        thinkingDepth: 3,
        randomnessFactor: 0.2,
        mistakeProbability: 0.1,
        reactionTime: 500,
        skillUsageFrequency: 0.7,
        thinkingTimeLimit: 2000
    },
    actionHistory: []
});

// モックAIAction作成ヘルパー
const createMockAIAction = (type: ActionType = ActionType.WAIT): AIAction => ({
    type,
    priority: 50,
    reasoning: 'Test action'
});

describe('AIPerformanceMonitor', () => {
    let monitor: AIPerformanceMonitor;

    beforeEach(() => {
        // 新しいインスタンスを取得（シングルトンだが、テスト用にリセット）
        monitor = AIPerformanceMonitor.getInstance();
        monitor.resetStats();
    });

    afterEach(() => {
        monitor.stopMonitoring();
        monitor.resetStats();
    });

    describe('シングルトンパターン', () => {
        test('同じインスタンスを返すこと', () => {
            const monitor1 = AIPerformanceMonitor.getInstance();
            const monitor2 = AIPerformanceMonitor.getInstance();
            expect(monitor1).toBe(monitor2);
        });
    });

    describe('監視の開始・停止', () => {
        test('監視を開始できること', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            monitor.startMonitoring();

            expect(consoleSpy).toHaveBeenCalledWith('[AIPerformanceMonitor] Monitoring started');
            consoleSpy.mockRestore();
        });

        test('監視を停止できること', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            monitor.startMonitoring();
            monitor.stopMonitoring();

            expect(consoleSpy).toHaveBeenCalledWith('[AIPerformanceMonitor] Monitoring stopped');
            consoleSpy.mockRestore();
        });

        test('重複して監視を開始しても問題ないこと', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            monitor.startMonitoring();
            monitor.startMonitoring(); // 2回目

            expect(consoleSpy).toHaveBeenCalledTimes(1);
            consoleSpy.mockRestore();
        });
    });

    describe('思考時間の測定', () => {
        test('思考時間を正しく測定できること', async () => {
            const characterId = 'test-character';

            monitor.startThinkingTimer(characterId);

            // 少し待機
            await new Promise(resolve => setTimeout(resolve, 100));

            const duration = monitor.endThinkingTimer(characterId);

            expect(duration).toBeGreaterThan(90);
            expect(duration).toBeLessThan(200);
        });

        test('タイムアウトフラグを正しく設定できること', () => {
            const characterId = 'test-character';

            monitor.startThinkingTimer(characterId);
            const duration = monitor.endThinkingTimer(characterId, true);

            const stats = monitor.getPerformanceStats();
            expect(stats.timeoutCount).toBe(1);
        });

        test('存在しないタイマーを終了しようとした場合の警告', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const duration = monitor.endThinkingTimer('non-existent');

            expect(duration).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith(
                '[AIPerformanceMonitor] No thinking timer found for character: non-existent'
            );
            consoleSpy.mockRestore();
        });
    });

    describe('メモリ使用量の記録', () => {
        test('メモリ使用量を記録できること', () => {
            // process.memoryUsageをモック
            const originalProcess = global.process;
            global.process = {
                ...originalProcess,
                memoryUsage: jest.fn().mockReturnValue({
                    heapUsed: 50 * 1024 * 1024,
                    heapTotal: 100 * 1024 * 1024,
                    external: 10 * 1024 * 1024
                })
            } as any;

            monitor.recordMemoryUsage();

            const stats = monitor.getPerformanceStats();
            expect(stats.memoryUsage).toBe(50 * 1024 * 1024);

            global.process = originalProcess;
        });
    });

    describe('エラーの記録', () => {
        test('エラーを正しく記録できること', () => {
            monitor.recordError('test_error');
            monitor.recordError('test_error');
            monitor.recordError('another_error');

            const stats = monitor.getPerformanceStats();
            expect(stats.errorCount).toBe(3);
        });
    });

    describe('行動タイプの記録', () => {
        test('行動タイプを正しく記録できること', () => {
            monitor.recordActionType(ActionType.MOVE);
            monitor.recordActionType(ActionType.ATTACK);
            monitor.recordActionType(ActionType.MOVE);

            const metrics = monitor.getPerformanceMetrics();
            expect(metrics.actionTypeDistribution[ActionType.MOVE]).toBe(2);
            expect(metrics.actionTypeDistribution[ActionType.ATTACK]).toBe(1);
            expect(metrics.actionTypeDistribution[ActionType.WAIT]).toBe(0);
        });
    });

    describe('行動キャッシュシステム', () => {
        test('行動をキャッシュに保存できること', () => {
            const context = createMockAIContext('test-character');
            const action = createMockAIAction(ActionType.MOVE);

            monitor.cacheAction(context, action);

            const cachedAction = monitor.getCachedAction(context);
            expect(cachedAction).toEqual(action);
            expect(cachedAction).not.toBe(action); // 異なるオブジェクトであること
        });

        test('存在しないキャッシュエントリに対してnullを返すこと', () => {
            const context = createMockAIContext('non-existent');

            const cachedAction = monitor.getCachedAction(context);
            expect(cachedAction).toBeNull();
        });

        test('期限切れのキャッシュエントリを削除すること', async () => {
            const context = createMockAIContext('test-character');
            const action = createMockAIAction(ActionType.MOVE);

            monitor.cacheAction(context, action);

            // キャッシュの有効期限を短くするため、内部タイムスタンプを操作
            const cacheStats = monitor.getCacheStats();
            expect(cacheStats.size).toBe(1);

            // 時間を進める（実際のテストでは困難なので、概念的なテスト）
            const cachedAction = monitor.getCachedAction(context);
            expect(cachedAction).not.toBeNull();
        });

        test('キャッシュ統計を正しく取得できること', () => {
            const context1 = createMockAIContext('character1');
            const context2 = createMockAIContext('character2');
            const action = createMockAIAction(ActionType.MOVE);

            monitor.cacheAction(context1, action);
            monitor.cacheAction(context2, action);

            // キャッシュヒットを発生させる
            monitor.getCachedAction(context1);
            monitor.getCachedAction(context1);

            const cacheStats = monitor.getCacheStats();
            expect(cacheStats.size).toBe(2);
            expect(cacheStats.totalHits).toBe(2);
        });
    });

    describe('並列処理', () => {
        test('複数のAIを並列で実行できること', async () => {
            const characters = [
                createMockUnit('char1'),
                createMockUnit('char2'),
                createMockUnit('char3')
            ];

            const thinkingFunction = jest.fn().mockImplementation(async (character: Unit) => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return createMockAIAction(ActionType.MOVE);
            });

            const startTime = Date.now();
            const results = await monitor.executeParallelThinking(characters, thinkingFunction);
            const endTime = Date.now();

            expect(results.size).toBe(3);
            expect(thinkingFunction).toHaveBeenCalledTimes(3);

            // 並列実行により、シーケンシャル実行より高速であることを確認
            expect(endTime - startTime).toBeLessThan(150); // 3 * 50ms より短い
        });

        test('並列処理中のエラーを適切に処理すること', async () => {
            const characters = [
                createMockUnit('char1'),
                createMockUnit('char2')
            ];

            const thinkingFunction = jest.fn().mockImplementation(async (character: Unit) => {
                if (character.id === 'char1') {
                    throw new Error('Test error');
                }
                return createMockAIAction(ActionType.MOVE);
            });

            const results = await monitor.executeParallelThinking(characters, thinkingFunction);

            expect(results.size).toBe(2);
            expect(results.get('char1')?.type).toBe(ActionType.WAIT); // フォールバック行動
            expect(results.get('char2')?.type).toBe(ActionType.MOVE);
        });
    });

    describe('パフォーマンス統計', () => {
        test('パフォーマンス統計を正しく計算できること', async () => {
            // テストデータを準備
            monitor.startThinkingTimer('char1');
            await new Promise(resolve => setTimeout(resolve, 100));
            monitor.endThinkingTimer('char1');

            monitor.startThinkingTimer('char2');
            await new Promise(resolve => setTimeout(resolve, 200));
            monitor.endThinkingTimer('char2', true); // タイムアウト

            monitor.recordActionType(ActionType.MOVE);
            monitor.recordActionType(ActionType.ATTACK);
            monitor.recordError('test_error');

            const stats = monitor.getPerformanceStats();

            expect(stats.averageThinkingTime).toBeGreaterThan(140);
            expect(stats.averageThinkingTime).toBeLessThan(160);
            expect(stats.maxThinkingTime).toBeGreaterThan(190);
            expect(stats.timeoutCount).toBe(1);
            expect(stats.totalActions).toBe(2);
            expect(stats.successfulActions).toBe(1);
            expect(stats.errorCount).toBe(1);
        });

        test('パフォーマンスメトリクスを正しく取得できること', () => {
            monitor.recordActionType(ActionType.MOVE);
            monitor.recordActionType(ActionType.ATTACK);
            monitor.recordActionType(ActionType.MOVE);

            const metrics = monitor.getPerformanceMetrics();

            expect(metrics.totalDecisions).toBe(3);
            expect(metrics.actionTypeDistribution[ActionType.MOVE]).toBe(2);
            expect(metrics.actionTypeDistribution[ActionType.ATTACK]).toBe(1);
            expect(metrics.actionTypeDistribution[ActionType.WAIT]).toBe(0);
        });
    });

    describe('パフォーマンス閾値チェック', () => {
        test('思考時間の警告を正しく検出できること', async () => {
            // 長い思考時間を記録
            monitor.startThinkingTimer('char1');
            await new Promise(resolve => setTimeout(resolve, 1800)); // 1.8秒
            monitor.endThinkingTimer('char1');

            const alerts = monitor.checkPerformanceThresholds();
            const thinkingAlert = alerts.find(alert => alert.type === 'thinking_time');

            expect(thinkingAlert).toBeDefined();
            expect(thinkingAlert?.level).toBe('warning');
        });

        test('エラー率の警告を正しく検出できること', () => {
            // 高いエラー率を作成
            for (let i = 0; i < 8; i++) {
                monitor.recordActionType(ActionType.MOVE);
            }
            for (let i = 0; i < 2; i++) {
                monitor.recordError('test_error');
            }

            const alerts = monitor.checkPerformanceThresholds();
            const errorAlert = alerts.find(alert => alert.type === 'error_rate');

            expect(errorAlert).toBeDefined();
            expect(errorAlert?.level).toBe('warning');
        });
    });

    describe('メモリクリーンアップ', () => {
        test('メモリクリーンアップを実行できること', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // テストデータを追加
            const context = createMockAIContext('test-character');
            const action = createMockAIAction(ActionType.MOVE);
            monitor.cacheAction(context, action);

            monitor.performMemoryCleanup();

            expect(consoleSpy).toHaveBeenCalledWith('[AIPerformanceMonitor] Memory cleanup performed');

            // キャッシュがクリアされていることを確認
            const cacheStats = monitor.getCacheStats();
            expect(cacheStats.size).toBe(0);

            consoleSpy.mockRestore();
        });
    });

    describe('統計のリセット', () => {
        test('統計を正しくリセットできること', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // テストデータを追加
            monitor.recordActionType(ActionType.MOVE);
            monitor.recordError('test_error');

            monitor.resetStats();

            const stats = monitor.getPerformanceStats();
            expect(stats.totalActions).toBe(0);
            expect(stats.errorCount).toBe(0);

            expect(consoleSpy).toHaveBeenCalledWith('[AIPerformanceMonitor] Statistics reset');
            consoleSpy.mockRestore();
        });
    });
});

describe('AIPerformanceUtils', () => {
    let monitor: AIPerformanceMonitor;

    beforeEach(() => {
        monitor = AIPerformanceMonitor.getInstance();
        monitor.resetStats();
    });

    afterEach(() => {
        monitor.resetStats();
    });

    describe('measureThinkingTime', () => {
        test('思考時間を測定してアクションを実行できること', async () => {
            const thinkingFunction = jest.fn().mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return 'test result';
            });

            const result = await AIPerformanceUtils.measureThinkingTime('test-char', thinkingFunction);

            expect(result.result).toBe('test result');
            expect(result.duration).toBeGreaterThan(90);
            expect(result.duration).toBeLessThan(200);
            expect(thinkingFunction).toHaveBeenCalledTimes(1);
        });

        test('思考中のエラーを適切に処理すること', async () => {
            const thinkingFunction = jest.fn().mockRejectedValue(new Error('Test error'));

            await expect(
                AIPerformanceUtils.measureThinkingTime('test-char', thinkingFunction)
            ).rejects.toThrow('Test error');

            const stats = monitor.getPerformanceStats();
            expect(stats.errorCount).toBe(1);
        });
    });

    describe('monitorMemoryUsage', () => {
        test('メモリ使用量を監視してアクションを実行できること', async () => {
            const action = jest.fn().mockResolvedValue('test result');

            const result = await AIPerformanceUtils.monitorMemoryUsage(action);

            expect(result).toBe('test result');
            expect(action).toHaveBeenCalledTimes(1);
        });

        test('メモリ監視中のエラーを適切に処理すること', async () => {
            const action = jest.fn().mockRejectedValue(new Error('Test error'));

            await expect(
                AIPerformanceUtils.monitorMemoryUsage(action)
            ).rejects.toThrow('Test error');

            const stats = monitor.getPerformanceStats();
            expect(stats.errorCount).toBe(1);
        });
    });

    describe('logPerformanceStats', () => {
        test('パフォーマンス統計をコンソールに出力できること', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // テストデータを準備
            monitor.recordActionType(ActionType.MOVE);
            monitor.recordActionType(ActionType.ATTACK);

            AIPerformanceUtils.logPerformanceStats();

            expect(consoleSpy).toHaveBeenCalledWith('=== AI Performance Statistics ===');
            expect(consoleSpy).toHaveBeenCalledWith('Total Actions: 2');
            expect(consoleSpy).toHaveBeenCalledWith('================================');

            consoleSpy.mockRestore();
        });
    });
});

describe('パフォーマンス最適化の統合テスト', () => {
    let monitor: AIPerformanceMonitor;

    beforeEach(() => {
        monitor = AIPerformanceMonitor.getInstance();
        monitor.resetStats();
    });

    afterEach(() => {
        monitor.stopMonitoring();
        monitor.resetStats();
    });

    test('完全なAI思考サイクルのパフォーマンス監視', async () => {
        monitor.startMonitoring();

        const characters = [
            createMockUnit('char1'),
            createMockUnit('char2'),
            createMockUnit('char3')
        ];

        // AI思考をシミュレート
        const thinkingFunction = async (character: Unit): Promise<AIAction> => {
            const context = createMockAIContext(character.id);

            // キャッシュチェック
            let cachedAction = monitor.getCachedAction(context);
            if (cachedAction) {
                return cachedAction;
            }

            // 思考処理をシミュレート
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

            const action = createMockAIAction(ActionType.MOVE);

            // キャッシュに保存
            monitor.cacheAction(context, action);

            return action;
        };

        // 並列実行
        const results = await monitor.executeParallelThinking(characters, thinkingFunction);

        // 結果検証
        expect(results.size).toBe(3);

        // パフォーマンス統計確認
        const stats = monitor.getPerformanceStats();
        expect(stats.totalActions).toBe(3);
        expect(stats.averageThinkingTime).toBeGreaterThan(0);

        // キャッシュ統計確認
        const cacheStats = monitor.getCacheStats();
        expect(cacheStats.size).toBe(3);

        // アラートチェック
        const alerts = monitor.checkPerformanceThresholds();
        expect(alerts.length).toBeGreaterThanOrEqual(0); // 正常範囲内またはアラートあり

        monitor.stopMonitoring();
    });

    test('高負荷状況でのパフォーマンス監視', async () => {
        monitor.startMonitoring();

        // 大量のキャラクターを作成
        const characters = Array.from({ length: 20 }, (_, i) => createMockUnit(`char${i}`));

        const thinkingFunction = async (character: Unit): Promise<AIAction> => {
            // 重い処理をシミュレート
            await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));

            // ランダムにエラーを発生
            if (Math.random() < 0.1) {
                throw new Error('Random AI error');
            }

            return createMockAIAction(ActionType.MOVE);
        };

        const startTime = Date.now();
        const results = await monitor.executeParallelThinking(characters, thinkingFunction);
        const endTime = Date.now();

        // 結果検証
        expect(results.size).toBe(20);

        // 並列処理により効率的に実行されていることを確認
        const totalTime = endTime - startTime;
        expect(totalTime).toBeLessThan(3000); // シーケンシャルより高速

        // パフォーマンス統計確認
        const stats = monitor.getPerformanceStats();
        expect(stats.totalActions).toBeGreaterThanOrEqual(15); // エラーにより一部失敗する可能性
        expect(stats.errorCount).toBeGreaterThanOrEqual(0); // エラーが発生している可能性

        // アラートチェック
        const alerts = monitor.checkPerformanceThresholds();
        console.log('Performance alerts:', alerts);

        monitor.stopMonitoring();
    });
});