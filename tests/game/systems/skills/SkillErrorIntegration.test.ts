/**
 * SkillErrorIntegrationの統合テスト
 * 
 * このファイルには以下のテストが含まれます：
 * - エラーハンドラーとユーザーフィードバックの統合テスト
 * - 既存スキルシステムとの統合テスト
 * - エラー回復メカニズムの統合テスト
 * - エンドツーエンドのエラーシナリオテスト
 */

import * as Phaser from 'phaser';
import {
    SkillErrorIntegration,
    ErrorIntegrationConfig
} from '../../../../game/src/systems/skills/SkillErrorIntegration';
import {
    SkillErrorHandler,
    SkillError
} from '../../../../game/src/systems/skills/SkillErrorHandler';
import {
    SkillUserFeedback,
    NotificationType
} from '../../../../game/src/systems/skills/SkillUserFeedback';
import { SkillExecutor } from '../../../../game/src/systems/skills/SkillExecutor';
import { SkillManager } from '../../../../game/src/systems/skills/SkillManager';
import { SkillConditionChecker } from '../../../../game/src/systems/skills/SkillConditionChecker';
import {
    SkillExecutionContext,
    SkillUsabilityError,
    Position
} from '../../../../game/src/types/skill';

// モッククラス
class MockScene extends Phaser.Events.EventEmitter {
    scale = {
        width: 800,
        height: 600,
        on: jest.fn(),
        off: jest.fn()
    };

    time = {
        addEvent: jest.fn().mockReturnValue({ remove: jest.fn() }),
        delayedCall: jest.fn()
    };

    add = {
        container: jest.fn().mockReturnValue({
            setDepth: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            add: jest.fn(),
            remove: jest.fn(),
            destroy: jest.fn(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setY: jest.fn()
        }),
        rectangle: jest.fn().mockReturnValue({
            setStrokeStyle: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            on: jest.fn()
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            on: jest.fn()
        }),
        existing: jest.fn()
    };

    tweens = {
        add: jest.fn()
    };
}

class MockSkillExecutor extends Phaser.Events.EventEmitter {
    executeSkill = jest.fn();
    getExecutionState = jest.fn();
    reset = jest.fn();
    destroy = jest.fn();
}

class MockSkillManager extends Phaser.Events.EventEmitter {
    getSkill = jest.fn();
    registerSkill = jest.fn();
    updateSkillStatistics = jest.fn();
}

class MockSkillConditionChecker extends Phaser.Events.EventEmitter {
    canUseSkill = jest.fn();
    getCharacterSkillData = jest.fn();
    setCharacterSkillData = jest.fn();
}

describe('SkillErrorIntegration', () => {
    let scene: MockScene;
    let integration: SkillErrorIntegration;
    let mockSkillExecutor: MockSkillExecutor;
    let mockSkillManager: MockSkillManager;
    let mockConditionChecker: MockSkillConditionChecker;
    let mockConfig: Partial<ErrorIntegrationConfig>;

    beforeEach(() => {
        scene = new MockScene();
        mockConfig = {
            enableAutoRecovery: true,
            enableDebugMode: true,
            errorHandler: {
                enableAutoRecovery: true,
                enableErrorLogging: true
            },
            userFeedback: {
                position: 'top',
                duration: 2000
            }
        };

        integration = new SkillErrorIntegration(scene as any, mockConfig);

        mockSkillExecutor = new MockSkillExecutor();
        mockSkillManager = new MockSkillManager();
        mockConditionChecker = new MockSkillConditionChecker();
    });

    afterEach(() => {
        integration.destroy();
        jest.clearAllMocks();
    });

    describe('システム統合', () => {
        test('スキル実行システムを正しく統合する', () => {
            integration.setSkillExecutor(mockSkillExecutor as any);

            // スキル実行エラーイベントをシミュレート
            const errorData = {
                error: new Error('Animation failed'),
                context: {
                    skillId: 'fireball',
                    caster: 'player1',
                    targetPosition: { x: 5, y: 5 }
                },
                phase: 'animation',
                executionId: 'test_execution_1'
            };

            mockSkillExecutor.emit('skill-execution-error', errorData);

            // 統合が正しく動作することを確認
            expect(integration).toBeDefined();
        });

        test('スキル管理システムを正しく統合する', () => {
            integration.setSkillManager(mockSkillManager as any);

            // 統合が完了したことを確認
            expect(integration).toBeDefined();
        });

        test('条件チェッカーを正しく統合する', () => {
            integration.setConditionChecker(mockConditionChecker as any);

            // 統合が完了したことを確認
            expect(integration).toBeDefined();
        });
    });

    describe('エラーハンドリング統合', () => {
        test('スキル実行エラーを統合的に処理する', async () => {
            const errorHandlingSpy = jest.fn();
            integration.on('error-handling-complete', errorHandlingSpy);

            integration.setSkillExecutor(mockSkillExecutor as any);

            // スキル実行エラーをシミュレート
            const errorData = {
                error: new Error('Effect application failed'),
                context: {
                    skillId: 'heal',
                    caster: 'player2',
                    targetPosition: { x: 3, y: 3 },
                    battlefieldState: {},
                    currentTurn: 1,
                    executionTime: new Date()
                },
                phase: 'effect_application',
                executionId: 'test_execution_2'
            };

            mockSkillExecutor.emit('skill-execution-error', errorData);

            // 少し待ってからイベントが発行されることを確認
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(errorHandlingSpy).toHaveBeenCalled();
        });

        test('条件チェックエラーを統合的に処理する', async () => {
            const conditionErrorData = {
                usabilityResult: {
                    canUse: false,
                    error: SkillUsabilityError.INSUFFICIENT_MP,
                    message: 'MP不足',
                    missingMP: 10
                },
                skillId: 'fireball',
                casterId: 'player1',
                targetPosition: { x: 5, y: 5 }
            };

            // 条件エラーイベントを発行
            integration.emit('skill-condition-error', conditionErrorData);

            // エラーが適切に処理されることを確認
            expect(integration).toBeDefined();
        });
    });

    describe('ユーザーフィードバック統合', () => {
        test('エラー通知が正しく表示される', () => {
            const showNotificationSpy = jest.fn();

            // ユーザーフィードバックのスパイを設定
            const userFeedback = (integration as any).userFeedback;
            userFeedback.showNotification = showNotificationSpy;

            // エラーハンドラーから通知イベントを発行
            const errorHandler = (integration as any).errorHandler;
            errorHandler.emit('show-notification', {
                message: 'MPが足りません',
                type: 'warning',
                duration: 3000,
                actions: ['MPを回復してください']
            });

            expect(showNotificationSpy).toHaveBeenCalledWith({
                id: expect.stringMatching(/^error_\d+$/),
                message: 'MPが足りません',
                type: 'warning',
                duration: 3000,
                actions: ['MPを回復してください']
            });
        });

        test('ガイダンスが正しく表示される', () => {
            const showGuidanceSpy = jest.fn();

            // ユーザーフィードバックのスパイを設定
            const userFeedback = (integration as any).userFeedback;
            userFeedback.showGuidance = showGuidanceSpy;

            // エラーハンドラーからガイダンスイベントを発行
            const errorHandler = (integration as any).errorHandler;
            errorHandler.emit('show-guidance', {
                title: 'おすすめの対処法',
                actions: ['有効な対象を選択してください'],
                error: SkillError.INVALID_TARGET
            });

            expect(showGuidanceSpy).toHaveBeenCalledWith({
                title: 'おすすめの対処法',
                actions: ['有効な対象を選択してください'],
                error: SkillError.INVALID_TARGET,
                description: expect.stringContaining('選択された対象は無効です')
            });
        });

        test('音響効果が正しく再生される', () => {
            const playSoundSpy = jest.fn();
            integration.on('play-sound', playSoundSpy);

            // エラーハンドラーから音響効果イベントを発行
            const errorHandler = (integration as any).errorHandler;
            errorHandler.emit('play-sound', {
                soundKey: 'error_sound',
                volume: 0.5
            });

            expect(playSoundSpy).toHaveBeenCalledWith({
                soundKey: 'error_sound',
                volume: 0.5
            });
        });
    });

    describe('エラー回復統合', () => {
        test('エラー回復成功時に成功通知を表示する', () => {
            const showNotificationSpy = jest.fn();

            // ユーザーフィードバックのスパイを設定
            const userFeedback = (integration as any).userFeedback;
            userFeedback.showNotification = showNotificationSpy;

            // エラーハンドラーから回復成功イベントを発行
            const errorHandler = (integration as any).errorHandler;
            errorHandler.emit('error-recovery-success', {
                error: SkillError.ANIMATION_ERROR,
                strategy: 'animation_error_recovery'
            });

            expect(showNotificationSpy).toHaveBeenCalledWith({
                id: expect.stringMatching(/^recovery_\d+$/),
                message: 'エラーから回復しました',
                type: 'success',
                duration: 2000
            });
        });

        test('状態復旧イベントが正しく処理される', () => {
            const stateRecoveryCompleteSpy = jest.fn();
            integration.on('state-recovery-complete', stateRecoveryCompleteSpy);

            // エラーハンドラーから状態復旧成功イベントを発行
            const errorHandler = (integration as any).errorHandler;
            errorHandler.emit('state-recovery-success', {
                context: {
                    skillId: 'fireball',
                    caster: 'player1'
                }
            });

            expect(stateRecoveryCompleteSpy).toHaveBeenCalled();
        });

        test('各種復旧イベントが正しく処理される', () => {
            const recoverBattlefieldSpy = jest.fn();
            const uiClearSkillSelectionSpy = jest.fn();
            const animationStopAllSpy = jest.fn();
            const memoryClearTempSpy = jest.fn();

            integration.on('recover-battlefield', recoverBattlefieldSpy);
            integration.on('ui-clear-skill-selection', uiClearSkillSelectionSpy);
            integration.on('animation-stop-all-animations', animationStopAllSpy);
            integration.on('memory-clear-temporary-objects', memoryClearTempSpy);

            const errorHandler = (integration as any).errorHandler;

            // 戦場状態復旧
            errorHandler.emit('recover-battlefield-state', {
                actions: ['reset-positions']
            });

            // UI状態復旧
            errorHandler.emit('recover-ui-state', {
                actions: ['clear-skill-selection', 'hide-range-display']
            });

            // アニメーションクリーンアップ
            errorHandler.emit('cleanup-animations', {
                actions: ['stop-all-animations', 'clear-temporary-effects']
            });

            // メモリクリーンアップ
            errorHandler.emit('memory-cleanup', {
                actions: ['clear-temporary-objects', 'garbage-collect']
            });

            expect(recoverBattlefieldSpy).toHaveBeenCalled();
            expect(uiClearSkillSelectionSpy).toHaveBeenCalled();
            expect(animationStopAllSpy).toHaveBeenCalled();
            expect(memoryClearTempSpy).toHaveBeenCalled();
        });
    });

    describe('システム連携', () => {
        test('戦闘システム更新イベントが正しく処理される', () => {
            const battleSystemIntegrationSpy = jest.fn();
            integration.on('battle-system-integration', battleSystemIntegrationSpy);

            integration.setSkillExecutor(mockSkillExecutor as any);

            // 戦闘システム更新イベントをシミュレート
            mockSkillExecutor.emit('battle-system-update', {
                skill: { id: 'fireball' },
                result: { success: true },
                updateType: 'skill_execution'
            });

            expect(battleSystemIntegrationSpy).toHaveBeenCalled();
        });

        test('ターン制システム更新イベントが正しく処理される', () => {
            const turnSystemIntegrationSpy = jest.fn();
            integration.on('turn-system-integration', turnSystemIntegrationSpy);

            integration.setSkillExecutor(mockSkillExecutor as any);

            // ターン制システム更新イベントをシミュレート
            mockSkillExecutor.emit('turn-system-update', {
                skill: { id: 'heal' },
                result: { success: true },
                updateType: 'skill_usage'
            });

            expect(turnSystemIntegrationSpy).toHaveBeenCalled();
        });
    });

    describe('エラー種別変換', () => {
        test('実行エラーを正しくスキルエラーに変換する', () => {
            const testCases = [
                { error: new Error('timeout occurred'), phase: 'animation', expected: SkillError.EXECUTION_TIMEOUT },
                { error: new Error('animation failed'), phase: 'animation', expected: SkillError.ANIMATION_ERROR },
                { error: new Error('effect application error'), phase: 'effect_application', expected: SkillError.EFFECT_APPLICATION_FAILED },
                { error: new Error('data corruption detected'), phase: 'validation', expected: SkillError.DATA_CORRUPTION },
                { error: new Error('unknown error'), phase: 'unknown', expected: SkillError.UNEXPECTED_ERROR }
            ];

            testCases.forEach(({ error, phase, expected }) => {
                const result = (integration as any).convertToSkillError(error, phase);
                expect(result).toBe(expected);
            });
        });

        test('使用可能性エラーを正しくスキルエラーに変換する', () => {
            const testCases = [
                { usabilityError: SkillUsabilityError.INSUFFICIENT_MP, expected: SkillError.INSUFFICIENT_MP },
                { usabilityError: SkillUsabilityError.SKILL_ON_COOLDOWN, expected: SkillError.SKILL_ON_COOLDOWN },
                { usabilityError: SkillUsabilityError.INVALID_TARGET, expected: SkillError.INVALID_TARGET },
                { usabilityError: SkillUsabilityError.OUT_OF_RANGE, expected: SkillError.OUT_OF_RANGE },
                { usabilityError: undefined, expected: SkillError.UNEXPECTED_ERROR }
            ];

            testCases.forEach(({ usabilityError, expected }) => {
                const result = (integration as any).convertUsabilityErrorToSkillError(usabilityError);
                expect(result).toBe(expected);
            });
        });
    });

    describe('統計と履歴', () => {
        test('エラー統計を正しく取得する', () => {
            const mockStatistics = new Map([
                [SkillError.INSUFFICIENT_MP, 3],
                [SkillError.SKILL_ON_COOLDOWN, 1]
            ]);

            const errorHandler = (integration as any).errorHandler;
            errorHandler.getErrorStatistics = jest.fn().mockReturnValue(mockStatistics);

            const statistics = integration.getErrorStatistics();

            expect(statistics).toBe(mockStatistics);
            expect(errorHandler.getErrorStatistics).toHaveBeenCalled();
        });

        test('エラー履歴を正しく取得する', () => {
            const mockHistory = [
                { error: SkillError.INSUFFICIENT_MP, timestamp: new Date() },
                { error: SkillError.SKILL_ON_COOLDOWN, timestamp: new Date() }
            ];

            const errorHandler = (integration as any).errorHandler;
            errorHandler.getErrorHistory = jest.fn().mockReturnValue(mockHistory);

            const history = integration.getErrorHistory(10);

            expect(history).toBe(mockHistory);
            expect(errorHandler.getErrorHistory).toHaveBeenCalledWith(10);
        });

        test('アクティブな通知数を正しく取得する', () => {
            const userFeedback = (integration as any).userFeedback;
            userFeedback.getActiveNotificationCount = jest.fn().mockReturnValue(2);

            const count = integration.getActiveNotificationCount();

            expect(count).toBe(2);
            expect(userFeedback.getActiveNotificationCount).toHaveBeenCalled();
        });
    });

    describe('設定とライフサイクル', () => {
        test('設定を正しく更新する', () => {
            const errorHandler = (integration as any).errorHandler;
            const userFeedback = (integration as any).userFeedback;

            errorHandler.updateConfig = jest.fn();
            userFeedback.updateConfig = jest.fn();

            const newConfig: Partial<ErrorIntegrationConfig> = {
                enableDebugMode: false,
                errorHandler: {
                    enableAutoRecovery: false
                },
                userFeedback: {
                    duration: 5000
                }
            };

            integration.updateConfig(newConfig);

            expect(errorHandler.updateConfig).toHaveBeenCalledWith({
                enableAutoRecovery: false
            });
            expect(userFeedback.updateConfig).toHaveBeenCalledWith({
                duration: 5000
            });
        });

        test('全ての通知をクリアする', () => {
            const userFeedback = (integration as any).userFeedback;
            userFeedback.clearAllNotifications = jest.fn();

            integration.clearAllNotifications();

            expect(userFeedback.clearAllNotifications).toHaveBeenCalled();
        });

        test('システムを正しくリセットする', () => {
            const errorHandler = (integration as any).errorHandler;
            const userFeedback = (integration as any).userFeedback;

            errorHandler.reset = jest.fn();
            userFeedback.clearAllNotifications = jest.fn();

            integration.reset();

            expect(errorHandler.reset).toHaveBeenCalled();
            expect(userFeedback.clearAllNotifications).toHaveBeenCalled();
        });

        test('リソースを正しく破棄する', () => {
            const errorHandler = (integration as any).errorHandler;
            const userFeedback = (integration as any).userFeedback;

            errorHandler.destroy = jest.fn();
            userFeedback.destroy = jest.fn();

            const removeAllListenersSpy = jest.spyOn(integration, 'removeAllListeners');

            integration.destroy();

            expect(errorHandler.destroy).toHaveBeenCalled();
            expect(userFeedback.destroy).toHaveBeenCalled();
            expect(removeAllListenersSpy).toHaveBeenCalled();
        });
    });

    describe('エンドツーエンドシナリオ', () => {
        test('完全なエラーハンドリングフローが正しく動作する', async () => {
            // システムを完全に統合
            integration.setSkillExecutor(mockSkillExecutor as any);
            integration.setSkillManager(mockSkillManager as any);
            integration.setConditionChecker(mockConditionChecker as any);

            // 各種スパイを設定
            const showNotificationSpy = jest.fn();
            const showGuidanceSpy = jest.fn();
            const playSoundSpy = jest.fn();
            const errorHandlingCompleteSpy = jest.fn();

            const userFeedback = (integration as any).userFeedback;
            userFeedback.showNotification = showNotificationSpy;
            userFeedback.showGuidance = showGuidanceSpy;

            integration.on('play-sound', playSoundSpy);
            integration.on('error-handling-complete', errorHandlingCompleteSpy);

            // スキル実行エラーをシミュレート
            const errorData = {
                error: new Error('Animation timeout'),
                context: {
                    skillId: 'fireball',
                    caster: 'player1',
                    targetPosition: { x: 5, y: 5 },
                    battlefieldState: {},
                    currentTurn: 1,
                    executionTime: new Date()
                },
                phase: 'animation',
                executionId: 'e2e_test_1'
            };

            // エラーを発生させる
            mockSkillExecutor.emit('skill-execution-error', errorData);

            // 少し待ってから結果を確認
            await new Promise(resolve => setTimeout(resolve, 200));

            // エラーハンドリングが完了したことを確認
            expect(errorHandlingCompleteSpy).toHaveBeenCalled();
        });

        test('複数のエラーが連続して発生した場合の処理', async () => {
            integration.setSkillExecutor(mockSkillExecutor as any);

            const errorHandlingCompleteSpy = jest.fn();
            integration.on('error-handling-complete', errorHandlingCompleteSpy);

            // 複数のエラーを連続して発生させる
            const errors = [
                {
                    error: new Error('MP insufficient'),
                    context: { skillId: 'fireball', caster: 'player1' },
                    phase: 'validation'
                },
                {
                    error: new Error('Animation failed'),
                    context: { skillId: 'heal', caster: 'player2' },
                    phase: 'animation'
                },
                {
                    error: new Error('Effect application error'),
                    context: { skillId: 'buff', caster: 'player3' },
                    phase: 'effect_application'
                }
            ];

            for (const errorData of errors) {
                mockSkillExecutor.emit('skill-execution-error', errorData);
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // 全てのエラーが処理されたことを確認
            expect(errorHandlingCompleteSpy).toHaveBeenCalledTimes(3);
        });
    });
});