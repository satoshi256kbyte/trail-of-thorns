import { AITestingFramework, AITestScenario, AISimulationConfig } from '../../../../game/src/systems/ai/AITestingFramework';

describe('AITestingFramework', () => {
    let framework: AITestingFramework;

    beforeEach(() => {
        framework = new AITestingFramework();
    });

    afterEach(() => {
        framework.stopSimulation();
        framework.clearTestResults();
    });

    describe('テストシナリオ管理', () => {
        test('テストシナリオの追加', () => {
            const scenario: AITestScenario = {
                id: 'test-scenario',
                name: 'テストシナリオ',
                description: 'テスト用のシナリオ',
                setup: {
                    mapSize: { width: 10, height: 10 },
                    playerUnits: [{ id: 'player1' }],
                    enemyUnits: [{ id: 'enemy1' }],
                    objectives: ['test_objective']
                },
                expectedBehaviors: ['attack', 'move'],
                successCriteria: {
                    minActionSuccessRate: 0.7,
                    maxThinkingTime: 2000,
                    requiredObjectives: 1
                }
            };

            expect(() => framework.addTestScenario(scenario)).not.toThrow();
        });

        test('テストシナリオの削除', () => {
            const scenario: AITestScenario = {
                id: 'test-scenario',
                name: 'テストシナリオ',
                description: 'テスト用のシナリオ',
                setup: {
                    mapSize: { width: 10, height: 10 },
                    playerUnits: [],
                    enemyUnits: [],
                    objectives: []
                },
                expectedBehaviors: [],
                successCriteria: {
                    minActionSuccessRate: 0.5,
                    maxThinkingTime: 2000,
                    requiredObjectives: 0
                }
            };

            framework.addTestScenario(scenario);
            expect(() => framework.removeTestScenario('test-scenario')).not.toThrow();
        });
    });

    describe('単一テスト実行', () => {
        test('基本戦闘テストの実行', async () => {
            const result = await framework.runSingleTest(
                'basic-combat',
                'test-ai',
                'aggressive',
                'normal'
            );

            expect(result).toBeDefined();
            expect(result.scenarioId).toBe('basic-combat');
            expect(result.aiId).toBe('test-ai');
            expect(result.aiType).toBe('aggressive');
            expect(result.difficultyLevel).toBe('normal');
            expect(result.statistics).toBeDefined();
            expect(result.behaviorAnalysis).toBeDefined();
            expect(result.performanceMetrics).toBeDefined();
            expect(typeof result.success).toBe('boolean');
        });

        test('存在しないシナリオでエラー', async () => {
            await expect(
                framework.runSingleTest('non-existent', 'test-ai', 'aggressive', 'normal')
            ).rejects.toThrow();
        });

        test('NPC保護テストの実行', async () => {
            const result = await framework.runSingleTest(
                'npc-protection',
                'test-ai',
                'tactical',
                'hard'
            );

            expect(result.scenarioId).toBe('npc-protection');
            expect(result.behaviorAnalysis.expectedBehaviors).toContain('target_npc');
        });
    });

    describe('バッチテスト実行', () => {
        test('複数シナリオのバッチテスト', async () => {
            const results = await framework.runBatchTest(
                ['basic-combat', 'npc-protection'],
                ['aggressive', 'defensive'],
                ['normal', 'hard']
            );

            // 2シナリオ × 2AIタイプ × 2難易度 = 8結果
            expect(results).toHaveLength(8);

            // 各結果の基本検証
            results.forEach(result => {
                expect(result.scenarioId).toMatch(/^(basic-combat|npc-protection)$/);
                expect(result.aiType).toMatch(/^(aggressive|defensive)$/);
                expect(result.difficultyLevel).toMatch(/^(normal|hard)$/);
            });
        });

        test('空の配列でのバッチテスト', async () => {
            const results = await framework.runBatchTest([], [], []);
            expect(results).toHaveLength(0);
        });
    });

    describe('AIシミュレーション', () => {
        test('基本シミュレーションの実行', async () => {
            const config: AISimulationConfig = {
                duration: 1000,
                aiCount: 2,
                difficultyLevels: ['normal'],
                behaviorPatterns: ['aggressive', 'defensive'],
                iterations: 2,
                enableLogging: false,
                enableVisualization: false
            };

            const results = await framework.runSimulation(config);

            expect(results).toBeInstanceOf(Array);
            expect(results.length).toBeGreaterThan(0);
        });

        test('シミュレーションの中断', async () => {
            const config: AISimulationConfig = {
                duration: 5000,
                aiCount: 4,
                difficultyLevels: ['normal', 'hard'],
                behaviorPatterns: ['aggressive', 'defensive', 'tactical'],
                iterations: 10,
                enableLogging: false,
                enableVisualization: false
            };

            // シミュレーションを開始
            const simulationPromise = framework.runSimulation(config);

            // 少し待ってから停止
            setTimeout(() => framework.stopSimulation(), 100);

            const results = await simulationPromise;
            expect(results).toBeInstanceOf(Array);
        });
    });

    describe('テスト結果管理', () => {
        test('テスト結果の取得', async () => {
            // テストを実行
            await framework.runSingleTest('basic-combat', 'test-ai', 'aggressive', 'normal');

            const results = framework.getTestResults();
            expect(results).toHaveLength(1);
            expect(results[0].aiId).toBe('test-ai');
        });

        test('フィルタ付きテスト結果の取得', async () => {
            // 複数のテストを実行
            await framework.runSingleTest('basic-combat', 'ai-1', 'aggressive', 'normal');
            await framework.runSingleTest('npc-protection', 'ai-2', 'defensive', 'hard');

            // シナリオでフィルタ
            const combatResults = framework.getTestResults({ scenarioId: 'basic-combat' });
            expect(combatResults).toHaveLength(1);
            expect(combatResults[0].scenarioId).toBe('basic-combat');

            // AIタイプでフィルタ
            const aggressiveResults = framework.getTestResults({ aiType: 'aggressive' });
            expect(aggressiveResults).toHaveLength(1);
            expect(aggressiveResults[0].aiType).toBe('aggressive');

            // 難易度でフィルタ
            const hardResults = framework.getTestResults({ difficultyLevel: 'hard' });
            expect(hardResults).toHaveLength(1);
            expect(hardResults[0].difficultyLevel).toBe('hard');
        });

        test('成功したテストのみの取得', async () => {
            // 複数のテストを実行（成功/失敗が混在）
            await framework.runBatchTest(
                ['basic-combat', 'multiple-enemies'],
                ['aggressive'],
                ['normal']
            );

            const allResults = framework.getTestResults();
            const successResults = framework.getTestResults({ successOnly: true });

            expect(successResults.length).toBeLessThanOrEqual(allResults.length);
            successResults.forEach(result => {
                expect(result.success).toBe(true);
            });
        });

        test('テスト結果のクリア', async () => {
            await framework.runSingleTest('basic-combat', 'test-ai', 'aggressive', 'normal');

            expect(framework.getTestResults()).toHaveLength(1);

            framework.clearTestResults();
            expect(framework.getTestResults()).toHaveLength(0);
        });
    });

    describe('テスト結果エクスポート', () => {
        test('JSON形式でのエクスポート', async () => {
            await framework.runSingleTest('basic-combat', 'test-ai', 'aggressive', 'normal');

            const exported = framework.exportTestResults('json');
            expect(() => JSON.parse(exported)).not.toThrow();

            const data = JSON.parse(exported);
            expect(data).toBeInstanceOf(Array);
            expect(data).toHaveLength(1);
        });

        test('CSV形式でのエクスポート', async () => {
            await framework.runSingleTest('basic-combat', 'test-ai', 'aggressive', 'normal');

            const exported = framework.exportTestResults('csv');
            expect(typeof exported).toBe('string');
            expect(exported).toContain('Scenario ID');
            expect(exported).toContain('basic-combat');
        });
    });

    describe('パフォーマンステスト', () => {
        test('大量テストの処理', async () => {
            const startTime = Date.now();

            const results = await framework.runBatchTest(
                ['basic-combat'],
                ['aggressive', 'defensive', 'tactical'],
                ['normal']
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(results).toHaveLength(3);
            expect(duration).toBeLessThan(10000); // 10秒以内
        });

        test('メモリ使用量の確認', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // 大量のテストを実行
            await framework.runBatchTest(
                ['basic-combat', 'npc-protection', 'multiple-enemies'],
                ['aggressive', 'defensive'],
                ['normal', 'hard']
            );

            // ガベージコレクションを実行
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // メモリ増加が50MB以下であることを確認
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
    });

    describe('エラーハンドリング', () => {
        test('無効なシナリオIDの処理', async () => {
            await expect(
                framework.runSingleTest('invalid-scenario', 'test-ai', 'aggressive', 'normal')
            ).rejects.toThrow('Test scenario not found');
        });

        test('シミュレーション中のエラー処理', async () => {
            const config: AISimulationConfig = {
                duration: 100,
                aiCount: 1,
                difficultyLevels: ['normal'],
                behaviorPatterns: ['aggressive'],
                iterations: 1,
                enableLogging: false,
                enableVisualization: false
            };

            // エラーが発生してもシミュレーションが完了することを確認
            const results = await framework.runSimulation(config);
            expect(results).toBeInstanceOf(Array);
        });
    });
});