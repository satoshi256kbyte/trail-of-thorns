import { AIBalanceTool, BalanceAnalysis } from '../../../../game/src/systems/ai/AIBalanceTool';
import { GameConfig } from '../../../../game/src/config/GameConfig';
import { AIStatisticsReport } from '../../../../game/src/systems/ai/AIStatisticsCollector';
import { AITestResult } from '../../../../game/src/systems/ai/AITestingFramework';

// GameConfigのモック
jest.mock('../../../../game/src/config/GameConfig');

describe('AIBalanceTool', () => {
    let balanceTool: AIBalanceTool;
    let mockGameConfig: jest.Mocked<GameConfig>;

    beforeEach(() => {
        mockGameConfig = new GameConfig() as jest.Mocked<GameConfig>;

        // デフォルトのAI設定をモック
        mockGameConfig.getAISystemConfig.mockReturnValue({
            enableAISystem: true,
            enableAIDebug: false,
            showThinkingDebug: false,
            showActionEvaluationDebug: false,
            showBehaviorTreeDebug: false,
            showPerformanceMetrics: false,
            enableDetailedLogging: false,
            difficultySettings: {
                thinkingDepth: 3,
                randomnessFactor: 0.2,
                mistakeProbability: 0.1,
                reactionTime: 1000,
                skillUsageFrequency: 0.7
            },
            performanceSettings: {
                maxThinkingTime: 2000,
                maxMemoryUsage: 50,
                enableActionCaching: true,
                cacheSize: 1000,
                enableParallelProcessing: true,
                maxConcurrentProcesses: 4
            },
            balanceSettings: {
                globalIntelligenceMultiplier: 1.0,
                mistakeProbability: 0.1,
                reactionDelay: 500,
                npcProtectionPriority: 2.0,
                skillUsageFrequency: 0.7,
                aggressiveBehaviorWeight: 1.0,
                defensiveBehaviorWeight: 1.0,
                supportBehaviorWeight: 1.0,
                tacticalBehaviorWeight: 1.0
            },
            debugColors: {
                aiThinking: 0xffff00,
                actionEvaluation: 0x00ffff,
                behaviorTree: 0xff00ff,
                pathfinding: 0x00ff00,
                targetSelection: 0xff0000,
                skillUsage: 0x0000ff,
                npcProtection: 0xff8800,
                performanceWarning: 0xffaa00,
                performanceError: 0xff0000
            },
            consoleCommands: {
                enableCommands: true,
                commandPrefix: 'ai',
                enableTesting: true,
                enableSimulation: true,
                enableBalanceAdjustment: true
            },
            testingConfig: {
                enableTestingMode: false,
                autoExecuteActions: false,
                logAllDecisions: true,
                generateStatistics: true,
                testBehaviorPatterns: false,
                enableAIvsAISimulation: false
            },
            statisticsConfig: {
                enableStatistics: true,
                collectionInterval: 1000,
                maxHistorySize: 1000,
                enablePerformanceTracking: true,
                enableDecisionTracking: true,
                enableSuccessRateTracking: true
            }
        });

        balanceTool = new AIBalanceTool(mockGameConfig);
    });

    describe('現在のバランス分析', () => {
        test('基本的なバランス分析', () => {
            const analysis = balanceTool.analyzeCurrentBalance();

            expect(analysis).toBeDefined();
            expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
            expect(analysis.overallScore).toBeLessThanOrEqual(1);
            expect(analysis.adjustments).toBeInstanceOf(Array);
            expect(analysis.strengths).toBeInstanceOf(Array);
            expect(analysis.weaknesses).toBeInstanceOf(Array);
            expect(analysis.recommendations).toBeInstanceOf(Array);
        });

        test('思考深度が高い場合の分析', () => {
            // 思考深度を高く設定
            mockGameConfig.getAISystemConfig.mockReturnValue({
                ...mockGameConfig.getAISystemConfig(),
                difficultySettings: {
                    thinkingDepth: 6, // 高い値
                    randomnessFactor: 0.2,
                    mistakeProbability: 0.1,
                    reactionTime: 1000,
                    skillUsageFrequency: 0.7
                }
            });

            const analysis = balanceTool.analyzeCurrentBalance();

            const thinkingDepthAdjustment = analysis.adjustments.find(
                adj => adj.parameter === 'thinkingDepth'
            );
            expect(thinkingDepthAdjustment).toBeDefined();
            expect(thinkingDepthAdjustment!.suggestedValue).toBeLessThan(6);
            expect(analysis.weaknesses).toContain('思考深度が高い');
        });

        test('ランダム性が高い場合の分析', () => {
            // ランダム性を高く設定
            mockGameConfig.getAISystemConfig.mockReturnValue({
                ...mockGameConfig.getAISystemConfig(),
                difficultySettings: {
                    thinkingDepth: 3,
                    randomnessFactor: 0.5, // 高い値
                    mistakeProbability: 0.1,
                    reactionTime: 1000,
                    skillUsageFrequency: 0.7
                }
            });

            const analysis = balanceTool.analyzeCurrentBalance();

            const randomnessAdjustment = analysis.adjustments.find(
                adj => adj.parameter === 'randomnessFactor'
            );
            expect(randomnessAdjustment).toBeDefined();
            expect(randomnessAdjustment!.suggestedValue).toBeLessThan(0.5);
            expect(analysis.weaknesses).toContain('ランダム性が高い');
        });

        test('思考時間制限が長い場合の分析', () => {
            // 思考時間制限を長く設定
            mockGameConfig.getAISystemConfig.mockReturnValue({
                ...mockGameConfig.getAISystemConfig(),
                performanceSettings: {
                    maxThinkingTime: 4000, // 長い値
                    maxMemoryUsage: 50,
                    enableActionCaching: true,
                    cacheSize: 1000,
                    enableParallelProcessing: true,
                    maxConcurrentProcesses: 4
                }
            });

            const analysis = balanceTool.analyzeCurrentBalance();

            const thinkingTimeAdjustment = analysis.adjustments.find(
                adj => adj.parameter === 'maxThinkingTime'
            );
            expect(thinkingTimeAdjustment).toBeDefined();
            expect(thinkingTimeAdjustment!.suggestedValue).toBeLessThan(4000);
            expect(analysis.weaknesses).toContain('思考時間制限が長い');
        });
    });

    describe('統計データに基づくバランス調整', () => {
        test('パフォーマンス統計に基づく調整', () => {
            const mockStatistics = new Map<string, AIStatisticsReport>();
            mockStatistics.set('test-ai', {
                generatedAt: Date.now(),
                aiId: 'test-ai',
                aiType: 'aggressive',
                difficultyLevel: 'normal',
                sessionDuration: 60000,
                statistics: {
                    performance: {
                        averageThinkingTime: 2000, // 長い思考時間
                        maxThinkingTime: 3000,
                        minThinkingTime: 1000,
                        memoryUsage: 45,
                        actionSuccessRate: 0.5, // 低い成功率
                        errorCount: 2,
                        timeoutCount: 1
                    },
                    behavior: {
                        actionCounts: { attack: 10, move: 5, wait: 8 }, // 待機が多い
                        targetSelectionAccuracy: 0.7,
                        skillUsageRate: 0.3,
                        movementEfficiency: 0.8,
                        decisionConsistency: 0.6
                    },
                    effectiveness: {
                        totalDamageDealt: 100,
                        totalDamageReceived: 200, // 被ダメージが多い
                        totalHealingProvided: 50,
                        objectivesCompleted: 1,
                        survivalRate: 0.6,
                        winRate: 0.4
                    },
                    timeline: []
                },
                recommendations: [],
                balanceAdjustments: {}
            });

            const analysis = balanceTool.adjustBalanceFromStatistics(mockStatistics);

            expect(analysis.adjustments.length).toBeGreaterThan(0);

            // 思考時間に関する調整があることを確認
            const thinkingAdjustment = analysis.adjustments.find(
                adj => adj.parameter === 'thinkingDepth'
            );
            expect(thinkingAdjustment).toBeDefined();

            // 成功率に関する調整があることを確認
            const successRateAdjustment = analysis.adjustments.find(
                adj => adj.parameter === 'mistakeProbability'
            );
            expect(successRateAdjustment).toBeDefined();
        });

        test('行動統計に基づく調整', () => {
            const mockStatistics = new Map<string, AIStatisticsReport>();
            mockStatistics.set('test-ai', {
                generatedAt: Date.now(),
                aiId: 'test-ai',
                aiType: 'aggressive',
                difficultyLevel: 'normal',
                sessionDuration: 60000,
                statistics: {
                    performance: {
                        averageThinkingTime: 1000,
                        maxThinkingTime: 1500,
                        minThinkingTime: 500,
                        memoryUsage: 30,
                        actionSuccessRate: 0.8,
                        errorCount: 0,
                        timeoutCount: 0
                    },
                    behavior: {
                        actionCounts: { attack: 5, move: 3, wait: 15, skill: 2 }, // 待機が多すぎる
                        targetSelectionAccuracy: 0.7,
                        skillUsageRate: 0.08, // スキル使用率が低い
                        movementEfficiency: 0.8,
                        decisionConsistency: 0.6
                    },
                    effectiveness: {
                        totalDamageDealt: 150,
                        totalDamageReceived: 100,
                        totalHealingProvided: 25,
                        objectivesCompleted: 2,
                        survivalRate: 0.8,
                        winRate: 0.7
                    },
                    timeline: []
                },
                recommendations: [],
                balanceAdjustments: {}
            });

            const analysis = balanceTool.adjustBalanceFromStatistics(mockStatistics);

            // 反応遅延に関する調整があることを確認
            const reactionAdjustment = analysis.adjustments.find(
                adj => adj.parameter === 'reactionDelay'
            );
            expect(reactionAdjustment).toBeDefined();

            // スキル使用頻度に関する調整があることを確認
            const skillAdjustment = analysis.adjustments.find(
                adj => adj.parameter === 'skillUsageFrequency'
            );
            expect(skillAdjustment).toBeDefined();
        });
    });

    describe('テスト結果に基づくバランス調整', () => {
        test('成功率が低い場合の調整', () => {
            const mockTestResults: AITestResult[] = [
                {
                    scenarioId: 'basic-combat',
                    aiId: 'test-ai-1',
                    aiType: 'aggressive',
                    difficultyLevel: 'normal',
                    startTime: Date.now() - 10000,
                    endTime: Date.now(),
                    success: false,
                    statistics: {} as any,
                    behaviorAnalysis: {
                        expectedBehaviors: ['attack', 'move'],
                        observedBehaviors: ['wait', 'move'],
                        matchRate: 0.5
                    },
                    performanceMetrics: {
                        averageThinkingTime: 1200,
                        actionSuccessRate: 0.4, // 低い成功率
                        objectivesCompleted: 0,
                        errorCount: 2
                    },
                    recommendations: []
                },
                {
                    scenarioId: 'basic-combat',
                    aiId: 'test-ai-2',
                    aiType: 'defensive',
                    difficultyLevel: 'normal',
                    startTime: Date.now() - 8000,
                    endTime: Date.now(),
                    success: false,
                    statistics: {} as any,
                    behaviorAnalysis: {
                        expectedBehaviors: ['defend', 'move'],
                        observedBehaviors: ['wait', 'defend'],
                        matchRate: 0.5
                    },
                    performanceMetrics: {
                        averageThinkingTime: 1100,
                        actionSuccessRate: 0.5,
                        objectivesCompleted: 0,
                        errorCount: 1
                    },
                    recommendations: []
                }
            ];

            const analysis = balanceTool.adjustBalanceFromTestResults(mockTestResults);

            expect(analysis.adjustments.length).toBeGreaterThan(0);
            expect(analysis.weaknesses).toContain('テスト成功率が低い');

            // ミス確率の調整があることを確認
            const mistakeAdjustment = analysis.adjustments.find(
                adj => adj.parameter === 'mistakeProbability'
            );
            expect(mistakeAdjustment).toBeDefined();
            expect(mistakeAdjustment!.suggestedValue).toBeLessThan(0.1);
        });

        test('思考時間が長い場合の調整', () => {
            const mockTestResults: AITestResult[] = [
                {
                    scenarioId: 'basic-combat',
                    aiId: 'test-ai',
                    aiType: 'tactical',
                    difficultyLevel: 'hard',
                    startTime: Date.now() - 15000,
                    endTime: Date.now(),
                    success: true,
                    statistics: {} as any,
                    behaviorAnalysis: {
                        expectedBehaviors: ['tactical_positioning'],
                        observedBehaviors: ['tactical_positioning'],
                        matchRate: 1.0
                    },
                    performanceMetrics: {
                        averageThinkingTime: 2500, // 長い思考時間
                        actionSuccessRate: 0.8,
                        objectivesCompleted: 1,
                        errorCount: 0
                    },
                    recommendations: []
                }
            ];

            const analysis = balanceTool.adjustBalanceFromTestResults(mockTestResults);

            // 思考深度の調整があることを確認
            const thinkingAdjustment = analysis.adjustments.find(
                adj => adj.parameter === 'thinkingDepth'
            );
            expect(thinkingAdjustment).toBeDefined();
            expect(thinkingAdjustment!.suggestedValue).toBeLessThan(3);
            expect(analysis.weaknesses).toContain('思考時間が長い');
        });

        test('成功率が高すぎる場合の調整', () => {
            const mockTestResults: AITestResult[] = Array(10).fill(null).map((_, i) => ({
                scenarioId: 'basic-combat',
                aiId: `test-ai-${i}`,
                aiType: 'aggressive',
                difficultyLevel: 'easy',
                startTime: Date.now() - 5000,
                endTime: Date.now(),
                success: true, // 全て成功
                statistics: {} as any,
                behaviorAnalysis: {
                    expectedBehaviors: ['attack'],
                    observedBehaviors: ['attack'],
                    matchRate: 1.0
                },
                performanceMetrics: {
                    averageThinkingTime: 800,
                    actionSuccessRate: 0.95,
                    objectivesCompleted: 1,
                    errorCount: 0
                },
                recommendations: []
            }));

            const analysis = balanceTool.adjustBalanceFromTestResults(mockTestResults);

            expect(analysis.strengths).toContain('高いテスト成功率');

            // 難易度を上げる調整があることを確認
            const mistakeAdjustment = analysis.adjustments.find(
                adj => adj.parameter === 'mistakeProbability'
            );
            expect(mistakeAdjustment).toBeDefined();
            expect(mistakeAdjustment!.suggestedValue).toBeGreaterThan(0.1);
        });
    });

    describe('バランス履歴管理', () => {
        test('バランス履歴の記録', () => {
            const analysis1 = balanceTool.analyzeCurrentBalance();
            const analysis2 = balanceTool.analyzeCurrentBalance();

            const history = balanceTool.getBalanceHistory();
            expect(history).toHaveLength(2);
            expect(history[0]).toBe(analysis1);
            expect(history[1]).toBe(analysis2);
        });

        test('バランス設定のリセット', () => {
            balanceTool.analyzeCurrentBalance();
            expect(balanceTool.getBalanceHistory()).toHaveLength(1);

            balanceTool.resetBalance();
            expect(balanceTool.getBalanceHistory()).toHaveLength(0);
            expect(mockGameConfig.updateAISystemConfig).toHaveBeenCalled();
        });
    });

    describe('設定のエクスポート・インポート', () => {
        test('バランス設定のエクスポート', () => {
            balanceTool.analyzeCurrentBalance();

            const exported = balanceTool.exportBalanceSettings();
            expect(() => JSON.parse(exported)).not.toThrow();

            const data = JSON.parse(exported);
            expect(data.timestamp).toBeDefined();
            expect(data.aiSystemConfig).toBeDefined();
            expect(data.balanceHistory).toBeDefined();
        });

        test('バランス設定のインポート', () => {
            const testData = {
                timestamp: Date.now(),
                aiSystemConfig: {
                    difficultySettings: {
                        thinkingDepth: 4,
                        randomnessFactor: 0.3,
                        mistakeProbability: 0.15,
                        reactionTime: 1200,
                        skillUsageFrequency: 0.8
                    }
                },
                balanceHistory: []
            };

            const success = balanceTool.importBalanceSettings(JSON.stringify(testData));
            expect(success).toBe(true);
            expect(mockGameConfig.updateAISystemConfig).toHaveBeenCalledWith(testData.aiSystemConfig);
        });

        test('無効なデータのインポート', () => {
            const success = balanceTool.importBalanceSettings('invalid json');
            expect(success).toBe(false);
        });
    });

    describe('総合スコア計算', () => {
        test('調整が不要な場合の高スコア', () => {
            // 理想的な設定でテスト
            const analysis = balanceTool.analyzeCurrentBalance();

            if (analysis.adjustments.length === 0) {
                expect(analysis.overallScore).toBe(1.0);
            }
        });

        test('多くの調整が必要な場合の低スコア', () => {
            // 問題のある設定を作成
            mockGameConfig.getAISystemConfig.mockReturnValue({
                ...mockGameConfig.getAISystemConfig(),
                difficultySettings: {
                    thinkingDepth: 8, // 高すぎる
                    randomnessFactor: 0.6, // 高すぎる
                    mistakeProbability: 0.3, // 高すぎる
                    reactionTime: 1000,
                    skillUsageFrequency: 0.7
                },
                performanceSettings: {
                    maxThinkingTime: 5000, // 長すぎる
                    maxMemoryUsage: 200, // 多すぎる
                    enableActionCaching: true,
                    cacheSize: 1000,
                    enableParallelProcessing: true,
                    maxConcurrentProcesses: 4
                }
            });

            const analysis = balanceTool.analyzeCurrentBalance();
            expect(analysis.overallScore).toBeLessThan(0.8);
            expect(analysis.adjustments.length).toBeGreaterThan(2);
        });
    });

    describe('エラーハンドリング', () => {
        test('GameConfig更新エラーの処理', () => {
            mockGameConfig.updateAISystemConfig.mockImplementation(() => {
                throw new Error('Config update failed');
            });

            // エラーが発生してもクラッシュしないことを確認
            expect(() => {
                const mockTestResults: AITestResult[] = [{
                    scenarioId: 'test',
                    aiId: 'test-ai',
                    aiType: 'aggressive',
                    difficultyLevel: 'normal',
                    startTime: Date.now(),
                    endTime: Date.now(),
                    success: false,
                    statistics: {} as any,
                    behaviorAnalysis: {
                        expectedBehaviors: [],
                        observedBehaviors: [],
                        matchRate: 0
                    },
                    performanceMetrics: {
                        averageThinkingTime: 2000,
                        actionSuccessRate: 0.4,
                        objectivesCompleted: 0,
                        errorCount: 0
                    },
                    recommendations: []
                }];

                balanceTool.adjustBalanceFromTestResults(mockTestResults);
            }).not.toThrow();
        });
    });
});