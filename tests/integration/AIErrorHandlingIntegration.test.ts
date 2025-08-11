/**
 * AIエラーハンドリングシステムの統合テスト
 * 実際のAIシステムとの連携を検証
 */

import { AIErrorHandler } from '../../game/src/systems/ai/AIErrorHandler';
import { AISystemManager } from '../../game/src/systems/ai/AISystemManager';
import { AIController } from '../../game/src/systems/AIController';
import {
    AIAction,
    ActionType,
    AIContext,
    AIErrorType,
    Unit,
    DifficultySettings,
} from '../../game/src/types/ai';

// モックデータ
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit-1',
    name: 'Test Unit',
    position: { x: 0, y: 0 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3,
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    ...overrides,
});

const createMockContext = (overrides: Partial<AIContext> = {}): AIContext => ({
    currentCharacter: createMockUnit(),
    gameState: {},
    visibleEnemies: [],
    visibleAllies: [],
    npcs: [],
    availableSkills: [],
    terrainData: {},
    turnNumber: 1,
    actionHistory: [],
    difficultySettings: {
        thinkingDepth: 2,
        randomnessFactor: 0.1,
        mistakeProbability: 0.05,
        reactionTime: 500,
        skillUsageFrequency: 0.3,
        thinkingTimeLimit: 2000,
    },
    ...overrides,
});

// テスト用のAIController実装
class TestAIController extends AIController {
    private shouldTimeout: boolean = false;
    private shouldThrowError: boolean = false;
    private shouldReturnInvalidAction: boolean = false;

    constructor(character: Unit, gameState: any) {
        super(character, gameState);
    }

    public setShouldTimeout(timeout: boolean): void {
        this.shouldTimeout = timeout;
    }

    public setShouldThrowError(throwError: boolean): void {
        this.shouldThrowError = throwError;
    }

    public setShouldReturnInvalidAction(invalid: boolean): void {
        this.shouldReturnInvalidAction = invalid;
    }

    public async decideAction(): Promise<AIAction> {
        if (this.shouldThrowError) {
            throw new Error('Test AI error');
        }

        if (this.shouldTimeout) {
            // タイムアウトをシミュレート
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        if (this.shouldReturnInvalidAction) {
            return {
                type: 'invalid' as ActionType,
                character: this.character,
                priority: 50,
                reasoning: 'Invalid action for testing',
            };
        }

        return {
            type: ActionType.WAIT,
            character: this.character,
            priority: 50,
            reasoning: 'Test action',
        };
    }

    public evaluatePosition(): number {
        return 0.5;
    }

    public getPriority(): number {
        return 50;
    }
}

describe('AIErrorHandling 統合テスト', () => {
    let errorHandler: AIErrorHandler;
    let aiSystemManager: AISystemManager;
    let mockUnit: Unit;
    let mockContext: AIContext;
    let testController: TestAIController;

    beforeEach(() => {
        errorHandler = AIErrorHandler.getInstance();
        errorHandler.clearErrorLog();
        errorHandler.setEnabled(true);

        mockUnit = createMockUnit();
        mockContext = createMockContext();
        testController = new TestAIController(mockUnit, mockContext.gameState);

        // AISystemManagerの初期化
        aiSystemManager = new AISystemManager({
            thinkingTimeLimit: 2000,
            enableDebugLogging: false,
            enableVisualFeedback: false,
            randomFactor: 0.1,
            npcPriorityMultiplier: 2.0,
        });
    });

    describe('AIController との統合', () => {
        test('正常なAI実行では エラーが発生しないこと', async () => {
            const initialErrorCount = errorHandler.getStatistics().totalErrors;

            const action = await testController.decideAction();

            expect(action.type).toBe(ActionType.WAIT);
            expect(errorHandler.getStatistics().totalErrors).toBe(initialErrorCount);
        });

        test('AI実行中のエラーが適切に処理されること', async () => {
            testController.setShouldThrowError(true);

            try {
                await testController.decideAction();
            } catch (error) {
                const recovery = errorHandler.handleError(error as Error, mockUnit, mockContext);
                expect(recovery.action.type).toBe(ActionType.WAIT);
            }

            const stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBe(1);
            expect(stats.errorsByType[AIErrorType.UNEXPECTED_ERROR]).toBe(1);
        });

        test('無効な行動が返された場合の処理', async () => {
            testController.setShouldReturnInvalidAction(true);

            const action = await testController.decideAction();

            // 無効な行動が返される
            expect(action.type).toBe('invalid' as ActionType);

            // エラーハンドラーで修正
            const recovery = errorHandler.handleInvalidAction(
                action,
                mockUnit,
                'Invalid action type',
                mockContext
            );

            expect(recovery.action.type).toBe(ActionType.WAIT);
            expect(recovery.type).toBe('retry');
        });
    });

    describe('AISystemManager との統合', () => {
        test('システムマネージャー経由でのエラー処理', async () => {
            // AISystemManagerにテストコントローラーを登録
            aiSystemManager.registerAI(mockUnit.id, testController);

            // エラーを発生させる設定
            testController.setShouldThrowError(true);

            try {
                await aiSystemManager.executeAITurn(mockUnit.id);
            } catch (error) {
                // エラーが適切に処理されることを確認
                const stats = errorHandler.getStatistics();
                expect(stats.totalErrors).toBeGreaterThan(0);
            }
        });

        test('複数のAIで同時にエラーが発生した場合の処理', async () => {
            const unit1 = createMockUnit({ id: 'unit-1' });
            const unit2 = createMockUnit({ id: 'unit-2' });
            const unit3 = createMockUnit({ id: 'unit-3' });

            const controller1 = new TestAIController(unit1, mockContext.gameState);
            const controller2 = new TestAIController(unit2, mockContext.gameState);
            const controller3 = new TestAIController(unit3, mockContext.gameState);

            // 異なるエラーを設定
            controller1.setShouldThrowError(true);
            controller2.setShouldReturnInvalidAction(true);
            // controller3は正常

            aiSystemManager.registerAI(unit1.id, controller1);
            aiSystemManager.registerAI(unit2.id, controller2);
            aiSystemManager.registerAI(unit3.id, controller3);

            // 並列実行
            const promises = [
                aiSystemManager.executeAITurn(unit1.id).catch(() => 'error1'),
                aiSystemManager.executeAITurn(unit2.id).catch(() => 'error2'),
                aiSystemManager.executeAITurn(unit3.id).catch(() => 'success'),
            ];

            await Promise.all(promises);

            // エラー統計を確認
            const stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBeGreaterThan(0);
        });
    });

    describe('パフォーマンス監視との統合', () => {
        test('思考タイムアウトが正しく検出されること', async () => {
            testController.setShouldTimeout(true);

            const startTime = Date.now();

            try {
                // タイムアウト付きで実行
                await Promise.race([
                    testController.decideAction(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Thinking timeout')), 2000)
                    ),
                ]);
            } catch (error) {
                const endTime = Date.now();
                const thinkingTime = endTime - startTime;

                const recovery = errorHandler.handleThinkingTimeout(
                    mockUnit,
                    thinkingTime,
                    mockContext
                );

                expect(recovery.type).toBe('fallback');
                expect(recovery.action.type).toBe(ActionType.WAIT);
                expect(thinkingTime).toBeGreaterThan(1900); // 約2秒
            }

            const stats = errorHandler.getStatistics();
            expect(stats.errorsByType[AIErrorType.THINKING_TIMEOUT]).toBe(1);
        });

        test('メモリ使用量監視との連携', () => {
            // メモリ不足をシミュレート
            const memoryUsage = 600; // 600MB

            const recovery = errorHandler.handleMemoryShortage(
                mockUnit,
                memoryUsage,
                mockContext
            );

            expect(recovery.type).toBe('fallback');
            expect(recovery.action.type).toBe(ActionType.WAIT);

            const stats = errorHandler.getStatistics();
            expect(stats.errorsByType[AIErrorType.MEMORY_SHORTAGE]).toBe(1);
        });
    });

    describe('エラー回復の実際の動作', () => {
        test('データ破損からの回復シナリオ', () => {
            // データ破損をシミュレート
            const recovery = errorHandler.handleDataCorruption(
                mockUnit,
                'AI personality data corrupted',
                mockContext
            );

            expect(recovery.type).toBe('reset');
            expect(recovery.action.type).toBe(ActionType.WAIT);
            expect(recovery.action.reasoning).toContain('basic AI pattern');

            // 基本パターンでの動作確認
            const basicAction = errorHandler.resetToBasicPattern(mockUnit);
            expect(basicAction.type).toBe(ActionType.WAIT);
            expect(basicAction.character).toBe(mockUnit);
        });

        test('段階的な回復処理', async () => {
            // 最初に無効な行動を試行
            const invalidAction: AIAction = {
                type: 'invalid' as ActionType,
                character: mockUnit,
                priority: 50,
                reasoning: 'Invalid action',
            };

            // 第1段階：代替行動の生成
            const alternative = errorHandler.generateAlternativeAction(
                invalidAction,
                mockUnit,
                mockContext
            );

            expect(alternative.type).toBe(ActionType.WAIT);
            expect(alternative.character).toBe(mockUnit);

            // 第2段階：代替行動も失敗した場合の基本パターン
            if (alternative.type === ActionType.WAIT) {
                const basicAction = errorHandler.resetToBasicPattern(mockUnit);
                expect(basicAction.type).toBe(ActionType.WAIT);
            }
        });
    });

    describe('システム健全性の実時間監視', () => {
        test('エラー率の増加を検出できること', () => {
            // 初期状態では健全
            let health = errorHandler.checkSystemHealth();
            expect(health.isHealthy).toBe(true);

            // 大量のエラーを発生させる
            for (let i = 0; i < 20; i++) {
                errorHandler.handleThinkingTimeout(mockUnit, 3000, mockContext);
            }

            // 健全性が悪化していることを検出
            health = errorHandler.checkSystemHealth();
            expect(health.isHealthy).toBe(false);
            expect(health.issues.length).toBeGreaterThan(0);
            expect(health.recommendations.length).toBeGreaterThan(0);
        });

        test('特定のエラータイプの頻発を検出できること', () => {
            // メモリ不足エラーを頻発させる
            for (let i = 0; i < 10; i++) {
                errorHandler.handleMemoryShortage(mockUnit, 512, mockContext);
            }

            const health = errorHandler.checkSystemHealth();
            expect(health.isHealthy).toBe(false);

            const issueText = health.issues.join(' ');
            expect(issueText).toContain('Memory shortage errors');

            const recommendationText = health.recommendations.join(' ');
            expect(recommendationText).toContain('memory cleanup');
        });
    });

    describe('実際のゲームシナリオでのエラー処理', () => {
        test('戦闘中のAIエラー処理', async () => {
            // 戦闘シナリオを模擬
            const battleContext = createMockContext({
                visibleEnemies: [createMockUnit({ id: 'enemy-1' })],
                visibleAllies: [createMockUnit({ id: 'ally-1' })],
                turnNumber: 5,
            });

            // 戦闘中にエラーが発生
            testController.setShouldThrowError(true);

            try {
                await testController.decideAction();
            } catch (error) {
                const recovery = errorHandler.handleError(
                    error as Error,
                    mockUnit,
                    battleContext
                );

                // 戦闘中でも安全な行動が選択されること
                expect(recovery.action.type).toBe(ActionType.WAIT);
                expect(recovery.action.character).toBe(mockUnit);
            }
        });

        test('NPC保護シナリオでのエラー処理', () => {
            // NPC保護シナリオを模擬
            const npcContext = createMockContext({
                npcs: [createMockUnit({ id: 'npc-1', faction: 'neutral' })],
                visibleEnemies: [createMockUnit({ id: 'enemy-1' })],
            });

            // NPC攻撃行動が無効になった場合
            const invalidNPCAttack: AIAction = {
                type: ActionType.ATTACK,
                character: mockUnit,
                target: npcContext.npcs[0],
                priority: 100,
                reasoning: 'Attack NPC',
            };

            const recovery = errorHandler.handleInvalidAction(
                invalidNPCAttack,
                mockUnit,
                'NPC out of range',
                npcContext
            );

            // 代替行動が提供されること
            expect(recovery.type).toBe('retry');
            expect(recovery.action.type).not.toBe('invalid' as ActionType);
        });
    });

    describe('長時間実行での安定性', () => {
        test('長時間実行でのメモリリーク防止', () => {
            const initialLogSize = errorHandler.getErrorLog().length;

            // 大量のエラーを発生させる（メモリリークテスト）
            for (let i = 0; i < 2000; i++) {
                errorHandler.handleThinkingTimeout(mockUnit, 1000, mockContext);
            }

            const finalLogSize = errorHandler.getErrorLog().length;
            const stats = errorHandler.getStatistics();

            // ログサイズが制限されていること
            expect(finalLogSize).toBeLessThanOrEqual(1000);

            // 統計は正しく記録されていること
            expect(stats.totalErrors).toBe(2000);

            // 最近のエラーも制限されていること
            expect(stats.recentErrors.length).toBeLessThanOrEqual(100);
        });

        test('エラー回復の成功率追跡', () => {
            let successfulRecoveries = 0;
            const totalAttempts = 50;

            for (let i = 0; i < totalAttempts; i++) {
                try {
                    const recovery = errorHandler.handleThinkingTimeout(
                        mockUnit,
                        2500,
                        mockContext
                    );

                    if (recovery.action.type === ActionType.WAIT) {
                        successfulRecoveries++;
                    }
                } catch (error) {
                    // 回復に失敗した場合
                }
            }

            const successRate = successfulRecoveries / totalAttempts;
            expect(successRate).toBeGreaterThan(0.9); // 90%以上の成功率を期待
        });
    });
});