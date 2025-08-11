import { AIStatisticsCollector } from '../../../../game/src/systems/ai/AIStatisticsCollector';
import { AIAction, BehaviorResult } from '../../../../game/src/types/ai';
import { Unit } from '../../../../game/src/types/gameplay';

describe('AIStatisticsCollector', () => {
    let collector: AIStatisticsCollector;
    const mockAIId = 'test-ai-1';

    beforeEach(() => {
        collector = new AIStatisticsCollector(100, 50); // 短い間隔、小さな履歴サイズでテスト
    });

    afterEach(() => {
        collector.stopCollection();
    });

    describe('基本機能', () => {
        test('統計収集の開始と停止', () => {
            expect(() => collector.startCollection()).not.toThrow();
            expect(() => collector.stopCollection()).not.toThrow();
        });

        test('思考時間の記録', () => {
            collector.startCollection();

            collector.recordThinkingTime(mockAIId, 1000);
            collector.recordThinkingTime(mockAIId, 1500);
            collector.recordThinkingTime(mockAIId, 800);

            const stats = collector.getAllStatistics().get(mockAIId);
            expect(stats).toBeDefined();
            expect(stats!.performance.averageThinkingTime).toBeCloseTo(1100, 1);
            expect(stats!.performance.maxThinkingTime).toBe(1500);
            expect(stats!.performance.minThinkingTime).toBe(800);
        });

        test('AI行動の記録', () => {
            collector.startCollection();

            const mockAction: AIAction = {
                type: 'attack',
                character: {} as Unit,
                priority: 1,
                evaluationScore: 0.8,
                reasoning: 'Test attack'
            };

            collector.recordAction(mockAIId, mockAction, BehaviorResult.SUCCESS);
            collector.recordAction(mockAIId, mockAction, BehaviorResult.FAILURE);

            const stats = collector.getAllStatistics().get(mockAIId);
            expect(stats).toBeDefined();
            expect(stats!.behavior.actionCounts['attack']).toBe(2);
            expect(stats!.performance.actionSuccessRate).toBe(0.5);
        });

        test('メモリ使用量の記録', () => {
            collector.startCollection();

            collector.recordMemoryUsage(mockAIId, 45.5);

            const stats = collector.getAllStatistics().get(mockAIId);
            expect(stats).toBeDefined();
            expect(stats!.performance.memoryUsage).toBe(45.5);
        });

        test('エラーの記録', () => {
            collector.startCollection();

            collector.recordError(mockAIId, 'timeout');
            collector.recordError(mockAIId, 'error');
            collector.recordError(mockAIId, 'timeout');

            const stats = collector.getAllStatistics().get(mockAIId);
            expect(stats).toBeDefined();
            expect(stats!.performance.timeoutCount).toBe(2);
            expect(stats!.performance.errorCount).toBe(1);
        });

        test('戦闘結果の記録', () => {
            collector.startCollection();

            collector.recordCombatResult(mockAIId, 100, 50, 25);
            collector.recordCombatResult(mockAIId, 80, 30, 15);

            const stats = collector.getAllStatistics().get(mockAIId);
            expect(stats).toBeDefined();
            expect(stats!.effectiveness.totalDamageDealt).toBe(180);
            expect(stats!.effectiveness.totalDamageReceived).toBe(80);
            expect(stats!.effectiveness.totalHealingProvided).toBe(40);
        });

        test('目標達成の記録', () => {
            collector.startCollection();

            collector.recordObjectiveCompletion(mockAIId);
            collector.recordObjectiveCompletion(mockAIId);

            const stats = collector.getAllStatistics().get(mockAIId);
            expect(stats).toBeDefined();
            expect(stats!.effectiveness.objectivesCompleted).toBe(2);
        });
    });

    describe('レポート生成', () => {
        test('統計レポートの生成', () => {
            collector.startCollection();

            // テストデータを追加
            collector.recordThinkingTime(mockAIId, 1000);
            collector.recordAction(mockAIId, {
                type: 'attack',
                character: {} as Unit,
                priority: 1,
                evaluationScore: 0.8
            } as AIAction, BehaviorResult.SUCCESS);
            collector.recordObjectiveCompletion(mockAIId);

            const report = collector.generateReport(mockAIId, 'aggressive', 'normal');

            expect(report.aiId).toBe(mockAIId);
            expect(report.aiType).toBe('aggressive');
            expect(report.difficultyLevel).toBe('normal');
            expect(report.statistics).toBeDefined();
            expect(report.recommendations).toBeInstanceOf(Array);
            expect(report.balanceAdjustments).toBeDefined();
        });

        test('存在しないAIのレポート生成でエラー', () => {
            expect(() => {
                collector.generateReport('non-existent-ai', 'test', 'normal');
            }).toThrow();
        });
    });

    describe('データ管理', () => {
        test('統計のクリア', () => {
            collector.startCollection();
            collector.recordThinkingTime(mockAIId, 1000);

            expect(collector.getAllStatistics().has(mockAIId)).toBe(true);

            collector.clearStatistics(mockAIId);
            expect(collector.getAllStatistics().has(mockAIId)).toBe(false);
        });

        test('全統計のクリア', () => {
            collector.startCollection();
            collector.recordThinkingTime(mockAIId, 1000);
            collector.recordThinkingTime('ai-2', 1200);

            expect(collector.getAllStatistics().size).toBe(2);

            collector.clearStatistics();
            expect(collector.getAllStatistics().size).toBe(0);
        });

        test('統計のエクスポート', () => {
            collector.startCollection();
            collector.recordThinkingTime(mockAIId, 1000);

            const exported = collector.exportStatistics(mockAIId);
            expect(() => JSON.parse(exported)).not.toThrow();

            const data = JSON.parse(exported);
            expect(data[mockAIId]).toBeDefined();
        });

        test('全統計のエクスポート', () => {
            collector.startCollection();
            collector.recordThinkingTime(mockAIId, 1000);
            collector.recordThinkingTime('ai-2', 1200);

            const exported = collector.exportStatistics();
            const data = JSON.parse(exported);

            expect(Object.keys(data)).toHaveLength(2);
            expect(data[mockAIId]).toBeDefined();
            expect(data['ai-2']).toBeDefined();
        });
    });

    describe('タイムライン管理', () => {
        test('タイムラインエントリの追加', () => {
            collector.startCollection();

            collector.recordThinkingTime(mockAIId, 1000);
            collector.recordAction(mockAIId, {
                type: 'move',
                character: {} as Unit,
                priority: 1,
                evaluationScore: 0.7
            } as AIAction, BehaviorResult.SUCCESS);

            const stats = collector.getAllStatistics().get(mockAIId);
            expect(stats!.timeline.length).toBeGreaterThan(0);

            const lastEntry = stats!.timeline[stats!.timeline.length - 1];
            expect(lastEntry.actionType).toBe('move');
            expect(lastEntry.success).toBe(true);
        });

        test('履歴サイズ制限', () => {
            const smallCollector = new AIStatisticsCollector(100, 3); // 最大3エントリ
            smallCollector.startCollection();

            // 5つのエントリを追加
            for (let i = 0; i < 5; i++) {
                smallCollector.recordThinkingTime(mockAIId, 1000 + i * 100);
            }

            const stats = smallCollector.getAllStatistics().get(mockAIId);
            expect(stats!.timeline.length).toBe(3); // 制限により3つまで

            smallCollector.stopCollection();
        });
    });

    describe('収集制御', () => {
        test('収集停止時は記録されない', () => {
            // 収集を開始せずに記録を試行
            collector.recordThinkingTime(mockAIId, 1000);

            expect(collector.getAllStatistics().has(mockAIId)).toBe(false);
        });

        test('収集停止後は記録されない', () => {
            collector.startCollection();
            collector.recordThinkingTime(mockAIId, 1000);
            collector.stopCollection();

            // 停止後の記録は無視される
            collector.recordThinkingTime(mockAIId, 2000);

            const stats = collector.getAllStatistics().get(mockAIId);
            expect(stats!.performance.averageThinkingTime).toBe(1000); // 最初の値のまま
        });
    });

    describe('推奨事項生成', () => {
        test('思考時間が長い場合の推奨事項', () => {
            collector.startCollection();

            // 長い思考時間を記録
            collector.recordThinkingTime(mockAIId, 2000);
            collector.recordThinkingTime(mockAIId, 2500);

            const report = collector.generateReport(mockAIId, 'test', 'normal');
            expect(report.recommendations.some(r => r.includes('思考時間'))).toBe(true);
        });

        test('成功率が低い場合の推奨事項', () => {
            collector.startCollection();

            const mockAction: AIAction = {
                type: 'attack',
                character: {} as Unit,
                priority: 1,
                evaluationScore: 0.5
            };

            // 低い成功率を記録
            collector.recordAction(mockAIId, mockAction, BehaviorResult.FAILURE);
            collector.recordAction(mockAIId, mockAction, BehaviorResult.FAILURE);
            collector.recordAction(mockAIId, mockAction, BehaviorResult.SUCCESS);

            const report = collector.generateReport(mockAIId, 'test', 'normal');
            expect(report.recommendations.some(r => r.includes('成功率'))).toBe(true);
        });

        test('エラーが多い場合の推奨事項', () => {
            collector.startCollection();

            // 多くのエラーを記録
            for (let i = 0; i < 6; i++) {
                collector.recordError(mockAIId, 'error');
            }

            const report = collector.generateReport(mockAIId, 'test', 'normal');
            expect(report.recommendations.some(r => r.includes('エラー'))).toBe(true);
        });
    });
});