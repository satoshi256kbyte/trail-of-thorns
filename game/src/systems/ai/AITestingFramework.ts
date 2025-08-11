import { Unit } from '../../types/gameplay';
import { AIAction, AIContext, BehaviorResult, DifficultySettings } from '../../types/ai';
import { AIStatisticsCollector, AIStatisticsReport } from './AIStatisticsCollector';

/**
 * AIテストシナリオ
 */
export interface AITestScenario {
    id: string;
    name: string;
    description: string;
    setup: {
        mapSize: { width: number; height: number };
        playerUnits: Partial<Unit>[];
        enemyUnits: Partial<Unit>[];
        objectives: string[];
    };
    expectedBehaviors: string[];
    successCriteria: {
        minActionSuccessRate: number;
        maxThinkingTime: number;
        requiredObjectives: number;
    };
}

/**
 * AIテスト結果
 */
export interface AITestResult {
    scenarioId: string;
    aiId: string;
    aiType: string;
    difficultyLevel: string;
    startTime: number;
    endTime: number;
    success: boolean;
    statistics: AIStatisticsReport;
    behaviorAnalysis: {
        expectedBehaviors: string[];
        observedBehaviors: string[];
        matchRate: number;
    };
    performanceMetrics: {
        averageThinkingTime: number;
        actionSuccessRate: number;
        objectivesCompleted: number;
        errorCount: number;
    };
    recommendations: string[];
}

/**
 * AIシミュレーション設定
 */
export interface AISimulationConfig {
    duration: number; // シミュレーション時間（ミリ秒）
    aiCount: number; // 参加AI数
    difficultyLevels: string[]; // テストする難易度
    behaviorPatterns: string[]; // テストする行動パターン
    iterations: number; // 反復回数
    enableLogging: boolean;
    enableVisualization: boolean;
}

/**
 * AIテスト・シミュレーションフレームワーク
 */
export class AITestingFramework {
    private statisticsCollector: AIStatisticsCollector;
    private testScenarios: Map<string, AITestScenario> = new Map();
    private testResults: AITestResult[] = [];
    private isRunning: boolean = false;

    constructor() {
        this.statisticsCollector = new AIStatisticsCollector();
        this.initializeDefaultScenarios();
    }

    /**
     * テストシナリオを追加
     */
    public addTestScenario(scenario: AITestScenario): void {
        this.testScenarios.set(scenario.id, scenario);
        console.log(`AITestingFramework: Test scenario '${scenario.name}' added`);
    }

    /**
     * テストシナリオを削除
     */
    public removeTestScenario(scenarioId: string): void {
        this.testScenarios.delete(scenarioId);
        console.log(`AITestingFramework: Test scenario '${scenarioId}' removed`);
    }

    /**
     * 単一AIテストを実行
     */
    public async runSingleTest(
        scenarioId: string,
        aiId: string,
        aiType: string,
        difficultyLevel: string
    ): Promise<AITestResult> {
        const scenario = this.testScenarios.get(scenarioId);
        if (!scenario) {
            throw new Error(`Test scenario not found: ${scenarioId}`);
        }

        console.log(`AITestingFramework: Running test '${scenario.name}' for AI '${aiId}'`);

        const startTime = Date.now();
        this.statisticsCollector.startCollection();

        try {
            // テスト環境をセットアップ
            const testContext = this.setupTestEnvironment(scenario);

            // AIテストを実行
            const behaviorAnalysis = await this.executeAITest(testContext, aiId, aiType, difficultyLevel);

            const endTime = Date.now();

            // 統計レポートを生成
            const statistics = this.statisticsCollector.generateReport(aiId, aiType, difficultyLevel);

            // テスト結果を評価
            const success = this.evaluateTestSuccess(scenario, statistics);

            const result: AITestResult = {
                scenarioId,
                aiId,
                aiType,
                difficultyLevel,
                startTime,
                endTime,
                success,
                statistics,
                behaviorAnalysis,
                performanceMetrics: {
                    averageThinkingTime: statistics.statistics.performance.averageThinkingTime,
                    actionSuccessRate: statistics.statistics.performance.actionSuccessRate,
                    objectivesCompleted: statistics.statistics.effectiveness.objectivesCompleted,
                    errorCount: statistics.statistics.performance.errorCount
                },
                recommendations: this.generateTestRecommendations(statistics, behaviorAnalysis)
            };

            this.testResults.push(result);
            console.log(`AITestingFramework: Test completed. Success: ${success}`);

            return result;

        } finally {
            this.statisticsCollector.stopCollection();
        }
    }

    /**
     * バッチテストを実行
     */
    public async runBatchTest(
        scenarioIds: string[],
        aiTypes: string[],
        difficultyLevels: string[]
    ): Promise<AITestResult[]> {
        const results: AITestResult[] = [];

        console.log(`AITestingFramework: Running batch test with ${scenarioIds.length} scenarios`);

        for (const scenarioId of scenarioIds) {
            for (const aiType of aiTypes) {
                for (const difficultyLevel of difficultyLevels) {
                    const aiId = `${aiType}-${difficultyLevel}-${Date.now()}`;

                    try {
                        const result = await this.runSingleTest(scenarioId, aiId, aiType, difficultyLevel);
                        results.push(result);
                    } catch (error) {
                        console.error(`AITestingFramework: Test failed for ${aiId}:`, error);
                    }
                }
            }
        }

        console.log(`AITestingFramework: Batch test completed. ${results.length} tests run`);
        return results;
    }

    /**
     * AIシミュレーションを実行
     */
    public async runSimulation(config: AISimulationConfig): Promise<AITestResult[]> {
        console.log('AITestingFramework: Starting AI simulation');
        this.isRunning = true;

        const results: AITestResult[] = [];

        try {
            for (let iteration = 0; iteration < config.iterations; iteration++) {
                console.log(`AITestingFramework: Simulation iteration ${iteration + 1}/${config.iterations}`);

                // ランダムなシナリオを選択
                const scenarioIds = Array.from(this.testScenarios.keys());
                const randomScenario = scenarioIds[Math.floor(Math.random() * scenarioIds.length)];

                // AI vs AI シミュレーション
                const simulationResults = await this.runAIvsAISimulation(
                    randomScenario,
                    config.behaviorPatterns,
                    config.difficultyLevels,
                    config.duration
                );

                results.push(...simulationResults);

                // 中断チェック
                if (!this.isRunning) {
                    console.log('AITestingFramework: Simulation interrupted');
                    break;
                }
            }

            console.log(`AITestingFramework: Simulation completed. ${results.length} results generated`);
            return results;

        } finally {
            this.isRunning = false;
        }
    }

    /**
     * シミュレーションを停止
     */
    public stopSimulation(): void {
        this.isRunning = false;
        console.log('AITestingFramework: Simulation stop requested');
    }

    /**
     * テスト結果を取得
     */
    public getTestResults(filter?: {
        scenarioId?: string;
        aiType?: string;
        difficultyLevel?: string;
        successOnly?: boolean;
    }): AITestResult[] {
        let results = [...this.testResults];

        if (filter) {
            if (filter.scenarioId) {
                results = results.filter(r => r.scenarioId === filter.scenarioId);
            }
            if (filter.aiType) {
                results = results.filter(r => r.aiType === filter.aiType);
            }
            if (filter.difficultyLevel) {
                results = results.filter(r => r.difficultyLevel === filter.difficultyLevel);
            }
            if (filter.successOnly) {
                results = results.filter(r => r.success);
            }
        }

        return results;
    }

    /**
     * テスト結果をクリア
     */
    public clearTestResults(): void {
        this.testResults = [];
        this.statisticsCollector.clearStatistics();
        console.log('AITestingFramework: Test results cleared');
    }

    /**
     * テスト結果をエクスポート
     */
    public exportTestResults(format: 'json' | 'csv' = 'json'): string {
        if (format === 'json') {
            return JSON.stringify(this.testResults, null, 2);
        } else {
            return this.convertResultsToCSV(this.testResults);
        }
    }

    /**
     * デフォルトテストシナリオを初期化
     */
    private initializeDefaultScenarios(): void {
        // 基本戦闘シナリオ
        this.addTestScenario({
            id: 'basic-combat',
            name: '基本戦闘テスト',
            description: '1対1の基本戦闘シナリオ',
            setup: {
                mapSize: { width: 10, height: 10 },
                playerUnits: [{ id: 'player1', position: { x: 2, y: 2 } }],
                enemyUnits: [{ id: 'enemy1', position: { x: 7, y: 7 } }],
                objectives: ['defeat_all_enemies']
            },
            expectedBehaviors: ['attack', 'move_towards_enemy'],
            successCriteria: {
                minActionSuccessRate: 0.7,
                maxThinkingTime: 2000,
                requiredObjectives: 1
            }
        });

        // NPC保護シナリオ
        this.addTestScenario({
            id: 'npc-protection',
            name: 'NPC保護テスト',
            description: 'NPCを優先攻撃するシナリオ',
            setup: {
                mapSize: { width: 12, height: 12 },
                playerUnits: [
                    { id: 'player1', position: { x: 2, y: 2 } },
                    { id: 'npc1', position: { x: 6, y: 6 } }
                ],
                enemyUnits: [{ id: 'enemy1', position: { x: 10, y: 10 } }],
                objectives: ['protect_npc', 'defeat_all_enemies']
            },
            expectedBehaviors: ['target_npc', 'move_towards_npc'],
            successCriteria: {
                minActionSuccessRate: 0.6,
                maxThinkingTime: 2500,
                requiredObjectives: 1
            }
        });

        // 複数敵シナリオ
        this.addTestScenario({
            id: 'multiple-enemies',
            name: '複数敵対処テスト',
            description: '複数の敵に対する戦術的判断',
            setup: {
                mapSize: { width: 15, height: 15 },
                playerUnits: [{ id: 'player1', position: { x: 7, y: 7 } }],
                enemyUnits: [
                    { id: 'enemy1', position: { x: 3, y: 3 } },
                    { id: 'enemy2', position: { x: 11, y: 3 } },
                    { id: 'enemy3', position: { x: 7, y: 11 } }
                ],
                objectives: ['defeat_all_enemies', 'survive']
            },
            expectedBehaviors: ['tactical_positioning', 'target_prioritization'],
            successCriteria: {
                minActionSuccessRate: 0.5,
                maxThinkingTime: 3000,
                requiredObjectives: 1
            }
        });
    }

    /**
     * テスト環境をセットアップ
     */
    private setupTestEnvironment(scenario: AITestScenario): AIContext {
        // モックのテスト環境を作成
        return {
            currentCharacter: {} as Unit,
            gameState: {} as any,
            visibleEnemies: [],
            visibleAllies: [],
            npcs: [],
            availableSkills: [],
            terrainData: {} as any,
            turnNumber: 1,
            difficultySettings: {} as DifficultySettings
        };
    }

    /**
     * AIテストを実行
     */
    private async executeAITest(
        context: AIContext,
        aiId: string,
        aiType: string,
        difficultyLevel: string
    ): Promise<AITestResult['behaviorAnalysis']> {
        const observedBehaviors: string[] = [];

        // シミュレートされたAI行動を実行
        for (let turn = 0; turn < 10; turn++) {
            const startTime = Date.now();

            // AI思考をシミュレート
            await this.simulateAIThinking(aiId, context);

            const thinkingTime = Date.now() - startTime;
            this.statisticsCollector.recordThinkingTime(aiId, thinkingTime);

            // ランダムな行動を生成（実際のAIシステムでは実際の行動決定を使用）
            const action = this.generateMockAction();
            const result = this.simulateActionExecution(action);

            this.statisticsCollector.recordAction(aiId, action, result);
            observedBehaviors.push(action.type);

            // 目標達成をシミュレート
            if (Math.random() < 0.3) {
                this.statisticsCollector.recordObjectiveCompletion(aiId);
            }
        }

        return {
            expectedBehaviors: ['attack', 'move', 'skill'],
            observedBehaviors,
            matchRate: this.calculateBehaviorMatchRate(['attack', 'move', 'skill'], observedBehaviors)
        };
    }

    /**
     * AI思考をシミュレート
     */
    private async simulateAIThinking(aiId: string, context: AIContext): Promise<void> {
        // 思考時間をシミュレート
        const thinkingTime = Math.random() * 2000 + 500;
        await new Promise(resolve => setTimeout(resolve, thinkingTime));
    }

    /**
     * モック行動を生成
     */
    private generateMockAction(): AIAction {
        const actionTypes = ['attack', 'move', 'skill', 'wait'];
        const randomType = actionTypes[Math.floor(Math.random() * actionTypes.length)];

        return {
            type: randomType as any,
            character: {} as Unit,
            priority: Math.random(),
            evaluationScore: Math.random(),
            reasoning: `Mock ${randomType} action`
        };
    }

    /**
     * 行動実行をシミュレート
     */
    private simulateActionExecution(action: AIAction): BehaviorResult {
        // ランダムな結果を生成
        const rand = Math.random();
        if (rand < 0.7) return BehaviorResult.SUCCESS;
        if (rand < 0.9) return BehaviorResult.RUNNING;
        return BehaviorResult.FAILURE;
    }

    /**
     * テスト成功を評価
     */
    private evaluateTestSuccess(scenario: AITestScenario, statistics: AIStatisticsReport): boolean {
        const criteria = scenario.successCriteria;
        const stats = statistics.statistics;

        return (
            stats.performance.actionSuccessRate >= criteria.minActionSuccessRate &&
            stats.performance.averageThinkingTime <= criteria.maxThinkingTime &&
            stats.effectiveness.objectivesCompleted >= criteria.requiredObjectives
        );
    }

    /**
     * 行動マッチ率を計算
     */
    private calculateBehaviorMatchRate(expected: string[], observed: string[]): number {
        const expectedSet = new Set(expected);
        const matchCount = observed.filter(behavior => expectedSet.has(behavior)).length;
        return matchCount / Math.max(observed.length, 1);
    }

    /**
     * AI vs AI シミュレーションを実行
     */
    private async runAIvsAISimulation(
        scenarioId: string,
        behaviorPatterns: string[],
        difficultyLevels: string[],
        duration: number
    ): Promise<AITestResult[]> {
        const results: AITestResult[] = [];

        // 複数のAI組み合わせでシミュレーション
        for (const pattern1 of behaviorPatterns) {
            for (const pattern2 of behaviorPatterns) {
                for (const difficulty of difficultyLevels) {
                    const ai1Id = `${pattern1}-${difficulty}-1`;
                    const ai2Id = `${pattern2}-${difficulty}-2`;

                    try {
                        const result1 = await this.runSingleTest(scenarioId, ai1Id, pattern1, difficulty);
                        const result2 = await this.runSingleTest(scenarioId, ai2Id, pattern2, difficulty);

                        results.push(result1, result2);
                    } catch (error) {
                        console.error('AITestingFramework: AI vs AI simulation error:', error);
                    }
                }
            }
        }

        return results;
    }

    /**
     * テスト推奨事項を生成
     */
    private generateTestRecommendations(
        statistics: AIStatisticsReport,
        behaviorAnalysis: AITestResult['behaviorAnalysis']
    ): string[] {
        const recommendations: string[] = [];

        // 統計ベースの推奨事項
        recommendations.push(...statistics.recommendations);

        // 行動分析ベースの推奨事項
        if (behaviorAnalysis.matchRate < 0.5) {
            recommendations.push('期待される行動パターンとの一致率が低いです。行動選択ロジックの見直しが必要です。');
        }

        return recommendations;
    }

    /**
     * 結果をCSV形式に変換
     */
    private convertResultsToCSV(results: AITestResult[]): string {
        const headers = [
            'Scenario ID', 'AI ID', 'AI Type', 'Difficulty', 'Success',
            'Avg Thinking Time', 'Action Success Rate', 'Objectives Completed', 'Error Count'
        ];

        const rows = results.map(result => [
            result.scenarioId,
            result.aiId,
            result.aiType,
            result.difficultyLevel,
            result.success.toString(),
            result.performanceMetrics.averageThinkingTime.toFixed(2),
            result.performanceMetrics.actionSuccessRate.toFixed(3),
            result.performanceMetrics.objectivesCompleted.toString(),
            result.performanceMetrics.errorCount.toString()
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
}