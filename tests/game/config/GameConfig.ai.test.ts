import { GameConfig } from '../../../game/src/config/GameConfig';

describe('GameConfig - AI System', () => {
    let gameConfig: GameConfig;

    beforeEach(() => {
        gameConfig = new GameConfig();
    });

    describe('AI設定の取得', () => {
        test('デフォルトAI設定の取得', () => {
            const aiConfig = gameConfig.getAISystemConfig();

            expect(aiConfig).toBeDefined();
            expect(aiConfig.enableAISystem).toBe(true);
            expect(aiConfig.difficultySettings).toBeDefined();
            expect(aiConfig.performanceSettings).toBeDefined();
            expect(aiConfig.balanceSettings).toBeDefined();
            expect(aiConfig.debugColors).toBeDefined();
            expect(aiConfig.consoleCommands).toBeDefined();
            expect(aiConfig.testingConfig).toBeDefined();
            expect(aiConfig.statisticsConfig).toBeDefined();
        });

        test('難易度設定の確認', () => {
            const aiConfig = gameConfig.getAISystemConfig();
            const difficulty = aiConfig.difficultySettings;

            expect(difficulty.thinkingDepth).toBe(3);
            expect(difficulty.randomnessFactor).toBe(0.2);
            expect(difficulty.mistakeProbability).toBe(0.1);
            expect(difficulty.reactionTime).toBe(1000);
            expect(difficulty.skillUsageFrequency).toBe(0.7);
        });

        test('パフォーマンス設定の確認', () => {
            const aiConfig = gameConfig.getAISystemConfig();
            const performance = aiConfig.performanceSettings;

            expect(performance.maxThinkingTime).toBe(2000);
            expect(performance.maxMemoryUsage).toBe(50);
            expect(performance.enableActionCaching).toBe(true);
            expect(performance.cacheSize).toBe(1000);
            expect(performance.enableParallelProcessing).toBe(true);
            expect(performance.maxConcurrentProcesses).toBe(4);
        });

        test('バランス設定の確認', () => {
            const aiConfig = gameConfig.getAISystemConfig();
            const balance = aiConfig.balanceSettings;

            expect(balance.globalIntelligenceMultiplier).toBe(1.0);
            expect(balance.mistakeProbability).toBe(0.1);
            expect(balance.reactionDelay).toBe(500);
            expect(balance.npcProtectionPriority).toBe(2.0);
            expect(balance.skillUsageFrequency).toBe(0.7);
            expect(balance.aggressiveBehaviorWeight).toBe(1.0);
            expect(balance.defensiveBehaviorWeight).toBe(1.0);
            expect(balance.supportBehaviorWeight).toBe(1.0);
            expect(balance.tacticalBehaviorWeight).toBe(1.0);
        });
    });

    describe('AI設定の更新', () => {
        test('部分的な設定更新', () => {
            const updates = {
                enableAIDebug: true,
                difficultySettings: {
                    thinkingDepth: 4,
                    randomnessFactor: 0.3,
                    mistakeProbability: 0.15,
                    reactionTime: 1200,
                    skillUsageFrequency: 0.8
                }
            };

            gameConfig.updateAISystemConfig(updates);
            const updatedConfig = gameConfig.getAISystemConfig();

            expect(updatedConfig.enableAIDebug).toBe(true);
            expect(updatedConfig.difficultySettings.thinkingDepth).toBe(4);
            expect(updatedConfig.difficultySettings.randomnessFactor).toBe(0.3);
            expect(updatedConfig.difficultySettings.mistakeProbability).toBe(0.15);
            expect(updatedConfig.difficultySettings.reactionTime).toBe(1200);
            expect(updatedConfig.difficultySettings.skillUsageFrequency).toBe(0.8);
        });

        test('パフォーマンス設定の更新', () => {
            const updates = {
                performanceSettings: {
                    maxThinkingTime: 1500,
                    maxMemoryUsage: 75,
                    enableActionCaching: false,
                    cacheSize: 500,
                    enableParallelProcessing: false,
                    maxConcurrentProcesses: 2
                }
            };

            gameConfig.updateAISystemConfig(updates);
            const updatedConfig = gameConfig.getAISystemConfig();

            expect(updatedConfig.performanceSettings.maxThinkingTime).toBe(1500);
            expect(updatedConfig.performanceSettings.maxMemoryUsage).toBe(75);
            expect(updatedConfig.performanceSettings.enableActionCaching).toBe(false);
            expect(updatedConfig.performanceSettings.cacheSize).toBe(500);
            expect(updatedConfig.performanceSettings.enableParallelProcessing).toBe(false);
            expect(updatedConfig.performanceSettings.maxConcurrentProcesses).toBe(2);
        });

        test('バランス設定の更新', () => {
            const updates = {
                balanceSettings: {
                    globalIntelligenceMultiplier: 1.2,
                    mistakeProbability: 0.05,
                    reactionDelay: 300,
                    npcProtectionPriority: 2.5,
                    skillUsageFrequency: 0.9,
                    aggressiveBehaviorWeight: 1.5,
                    defensiveBehaviorWeight: 0.8,
                    supportBehaviorWeight: 1.2,
                    tacticalBehaviorWeight: 1.3
                }
            };

            gameConfig.updateAISystemConfig(updates);
            const updatedConfig = gameConfig.getAISystemConfig();

            expect(updatedConfig.balanceSettings.globalIntelligenceMultiplier).toBe(1.2);
            expect(updatedConfig.balanceSettings.mistakeProbability).toBe(0.05);
            expect(updatedConfig.balanceSettings.reactionDelay).toBe(300);
            expect(updatedConfig.balanceSettings.npcProtectionPriority).toBe(2.5);
            expect(updatedConfig.balanceSettings.skillUsageFrequency).toBe(0.9);
            expect(updatedConfig.balanceSettings.aggressiveBehaviorWeight).toBe(1.5);
            expect(updatedConfig.balanceSettings.defensiveBehaviorWeight).toBe(0.8);
            expect(updatedConfig.balanceSettings.supportBehaviorWeight).toBe(1.2);
            expect(updatedConfig.balanceSettings.tacticalBehaviorWeight).toBe(1.3);
        });

        test('設定の不変性確認', () => {
            const originalConfig = gameConfig.getAISystemConfig();
            const originalThinkingDepth = originalConfig.difficultySettings.thinkingDepth;

            // 取得した設定を変更
            originalConfig.difficultySettings.thinkingDepth = 999;

            // 元の設定が変更されていないことを確認
            const freshConfig = gameConfig.getAISystemConfig();
            expect(freshConfig.difficultySettings.thinkingDepth).toBe(originalThinkingDepth);
        });
    });

    describe('AI設定の検証', () => {
        test('有効な設定での検証成功', () => {
            expect(gameConfig.validateConfig()).toBe(true);
        });

        test('無効な思考深度での検証失敗', () => {
            gameConfig.updateAISystemConfig({
                difficultySettings: {
                    thinkingDepth: 15, // 無効な値（1-10の範囲外）
                    randomnessFactor: 0.2,
                    mistakeProbability: 0.1,
                    reactionTime: 1000,
                    skillUsageFrequency: 0.7
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効なランダム性因子での検証失敗', () => {
            gameConfig.updateAISystemConfig({
                difficultySettings: {
                    thinkingDepth: 3,
                    randomnessFactor: 1.5, // 無効な値（0-1の範囲外）
                    mistakeProbability: 0.1,
                    reactionTime: 1000,
                    skillUsageFrequency: 0.7
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効なミス確率での検証失敗', () => {
            gameConfig.updateAISystemConfig({
                difficultySettings: {
                    thinkingDepth: 3,
                    randomnessFactor: 0.2,
                    mistakeProbability: -0.1, // 無効な値（負の値）
                    reactionTime: 1000,
                    skillUsageFrequency: 0.7
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効な思考時間制限での検証失敗', () => {
            gameConfig.updateAISystemConfig({
                performanceSettings: {
                    maxThinkingTime: -1000, // 無効な値（負の値）
                    maxMemoryUsage: 50,
                    enableActionCaching: true,
                    cacheSize: 1000,
                    enableParallelProcessing: true,
                    maxConcurrentProcesses: 4
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効なメモリ使用量制限での検証失敗', () => {
            gameConfig.updateAISystemConfig({
                performanceSettings: {
                    maxThinkingTime: 2000,
                    maxMemoryUsage: 0, // 無効な値（0以下）
                    enableActionCaching: true,
                    cacheSize: 1000,
                    enableParallelProcessing: true,
                    maxConcurrentProcesses: 4
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効なキャッシュサイズでの検証失敗', () => {
            gameConfig.updateAISystemConfig({
                performanceSettings: {
                    maxThinkingTime: 2000,
                    maxMemoryUsage: 50,
                    enableActionCaching: true,
                    cacheSize: -100, // 無効な値（負の値）
                    enableParallelProcessing: true,
                    maxConcurrentProcesses: 4
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効な並行プロセス数での検証失敗', () => {
            gameConfig.updateAISystemConfig({
                performanceSettings: {
                    maxThinkingTime: 2000,
                    maxMemoryUsage: 50,
                    enableActionCaching: true,
                    cacheSize: 1000,
                    enableParallelProcessing: true,
                    maxConcurrentProcesses: 0 // 無効な値（0以下）
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効な知能乗数での検証失敗', () => {
            gameConfig.updateAISystemConfig({
                balanceSettings: {
                    globalIntelligenceMultiplier: -0.5, // 無効な値（負の値）
                    mistakeProbability: 0.1,
                    reactionDelay: 500,
                    npcProtectionPriority: 2.0,
                    skillUsageFrequency: 0.7,
                    aggressiveBehaviorWeight: 1.0,
                    defensiveBehaviorWeight: 1.0,
                    supportBehaviorWeight: 1.0,
                    tacticalBehaviorWeight: 1.0
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効な行動重みでの検証失敗', () => {
            gameConfig.updateAISystemConfig({
                balanceSettings: {
                    globalIntelligenceMultiplier: 1.0,
                    mistakeProbability: 0.1,
                    reactionDelay: 500,
                    npcProtectionPriority: 2.0,
                    skillUsageFrequency: 0.7,
                    aggressiveBehaviorWeight: -1.0, // 無効な値（負の値）
                    defensiveBehaviorWeight: 1.0,
                    supportBehaviorWeight: 1.0,
                    tacticalBehaviorWeight: 1.0
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効なデバッグ色での検証失敗', () => {
            gameConfig.updateAISystemConfig({
                debugColors: {
                    aiThinking: 0x1000000, // 無効な値（0xFFFFFFを超える）
                    actionEvaluation: 0x00ffff,
                    behaviorTree: 0xff00ff,
                    pathfinding: 0x00ff00,
                    targetSelection: 0xff0000,
                    skillUsage: 0x0000ff,
                    npcProtection: 0xff8800,
                    performanceWarning: 0xffaa00,
                    performanceError: 0xff0000
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効なコンソールコマンドプレフィックスでの検証失敗', () => {
            gameConfig.updateAISystemConfig({
                consoleCommands: {
                    enableCommands: true,
                    commandPrefix: '', // 無効な値（空文字列）
                    enableTesting: true,
                    enableSimulation: true,
                    enableBalanceAdjustment: true
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });

        test('無効な統計収集間隔での検証失敗', () => {
            gameConfig.updateAISystemConfig({
                statisticsConfig: {
                    enableStatistics: true,
                    collectionInterval: -1000, // 無効な値（負の値）
                    maxHistorySize: 1000,
                    enablePerformanceTracking: true,
                    enableDecisionTracking: true,
                    enableSuccessRateTracking: true
                }
            });

            expect(gameConfig.validateConfig()).toBe(false);
        });
    });

    describe('静的設定の確認', () => {
        test('静的AI設定の存在確認', () => {
            expect(GameConfig.AI_SYSTEM).toBeDefined();
            expect(GameConfig.AI_SYSTEM.enableAISystem).toBe(true);
            expect(GameConfig.AI_SYSTEM.difficultySettings).toBeDefined();
            expect(GameConfig.AI_SYSTEM.performanceSettings).toBeDefined();
            expect(GameConfig.AI_SYSTEM.balanceSettings).toBeDefined();
        });

        test('インスタンス設定と静的設定の一致', () => {
            const instanceConfig = gameConfig.getAISystemConfig();
            const staticConfig = GameConfig.AI_SYSTEM;

            expect(instanceConfig.enableAISystem).toBe(staticConfig.enableAISystem);
            expect(instanceConfig.difficultySettings.thinkingDepth).toBe(staticConfig.difficultySettings.thinkingDepth);
            expect(instanceConfig.performanceSettings.maxThinkingTime).toBe(staticConfig.performanceSettings.maxThinkingTime);
            expect(instanceConfig.balanceSettings.globalIntelligenceMultiplier).toBe(staticConfig.balanceSettings.globalIntelligenceMultiplier);
        });
    });

    describe('設定の継承と独立性', () => {
        test('複数インスタンスの独立性', () => {
            const config1 = new GameConfig();
            const config2 = new GameConfig();

            config1.updateAISystemConfig({
                difficultySettings: {
                    thinkingDepth: 5,
                    randomnessFactor: 0.3,
                    mistakeProbability: 0.2,
                    reactionTime: 1500,
                    skillUsageFrequency: 0.8
                }
            });

            const config1AI = config1.getAISystemConfig();
            const config2AI = config2.getAISystemConfig();

            expect(config1AI.difficultySettings.thinkingDepth).toBe(5);
            expect(config2AI.difficultySettings.thinkingDepth).toBe(3); // デフォルト値のまま
        });

        test('設定更新の独立性', () => {
            const originalConfig = gameConfig.getAISystemConfig();

            gameConfig.updateAISystemConfig({
                enableAIDebug: true
            });

            const updatedConfig = gameConfig.getAISystemConfig();

            expect(originalConfig.enableAIDebug).toBe(false); // 元の取得値は変更されない
            expect(updatedConfig.enableAIDebug).toBe(true); // 新しい取得値は更新される
        });
    });
});