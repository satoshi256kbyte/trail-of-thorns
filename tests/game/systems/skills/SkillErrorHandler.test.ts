/**
 * SkillErrorHandlerのテスト
 * 
 * このファイルには以下のテストが含まれます：
 * - エラー分類と処理のテスト
 * - ユーザーフィードバック表示のテスト
 * - エラー回復メカニズムのテスト
 * - 状態復旧とクリーンアップのテスト
 * - エラーシナリオの包括的テスト
 */

import * as Phaser from 'phaser';
import {
    SkillErrorHandler,
    SkillError,
    ErrorSeverity,
    SkillErrorContext,
    SkillErrorDetails,
    UserFeedbackConfig
} from '../../../../game/src/systems/skills/SkillErrorHandler';
import {
    SkillExecutionContext,
    SkillResult,
    SkillUsabilityError,
    Position
} from '../../../../game/src/types/skill';

// モッククラス
class MockScene extends Phaser.Events.EventEmitter {
    time = {
        addEvent: jest.fn().mockReturnValue({ remove: jest.fn() })
    };
}

describe('SkillErrorHandler', () => {
    let scene: MockScene;
    let errorHandler: SkillErrorHandler;
    let mockConfig: Partial<UserFeedbackConfig>;

    beforeEach(() => {
        scene = new MockScene();
        mockConfig = {
            notificationDuration: 2000,
            enableSoundEffects: true,
            showDetailedErrors: true,
            enableAutoRecovery: true,
            enableErrorLogging: true
        };
        errorHandler = new SkillErrorHandler(scene as any, mockConfig);
    });

    afterEach(() => {
        errorHandler.destroy();
        jest.clearAllMocks();
    });

    describe('エラー分類と処理', () => {
        test('MP不足エラーを正しく分類する', async () => {
            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date(),
                additionalInfo: { requiredMP: 20, currentMP: 10 }
            };

            const result = await errorHandler.handleSkillError(
                SkillError.INSUFFICIENT_MP,
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillError.INSUFFICIENT_MP);
            expect(result.errorMessage).toBe('MPが足りません');
            expect(result.additionalInfo?.severity).toBe(ErrorSeverity.WARNING);
        });

        test('クールダウンエラーを正しく分類する', async () => {
            const context: SkillErrorContext = {
                skillId: 'heal',
                casterId: 'player2',
                timestamp: new Date(),
                additionalInfo: { remainingCooldown: 2 }
            };

            const result = await errorHandler.handleSkillError(
                SkillError.SKILL_ON_COOLDOWN,
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillError.SKILL_ON_COOLDOWN);
            expect(result.additionalInfo?.severity).toBe(ErrorSeverity.INFO);
            expect(result.additionalInfo?.suggestedActions).toContain('ターンを進めてください');
        });

        test('致命的エラーを正しく分類する', async () => {
            const context: SkillErrorContext = {
                skillId: 'corrupted_skill',
                casterId: 'player1',
                timestamp: new Date()
            };

            const result = await errorHandler.handleSkillError(
                SkillError.DATA_CORRUPTION,
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillError.DATA_CORRUPTION);
            expect(result.additionalInfo?.severity).toBe(ErrorSeverity.CRITICAL);
            expect(result.additionalInfo?.recoverable).toBe(false);
        });

        test('対象エラーを正しく分類する', async () => {
            const context: SkillErrorContext = {
                skillId: 'attack',
                casterId: 'player1',
                targetPosition: { x: 10, y: 10 },
                timestamp: new Date()
            };

            const result = await errorHandler.handleSkillError(
                SkillError.OUT_OF_RANGE,
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillError.OUT_OF_RANGE);
            expect(result.additionalInfo?.suggestedActions).toContain('射程内の対象を選択してください');
        });
    });

    describe('ユーザーフィードバック表示', () => {
        test('エラー通知イベントを発行する', async () => {
            const showNotificationSpy = jest.fn();
            errorHandler.on('show-notification', showNotificationSpy);

            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            await errorHandler.handleSkillError(SkillError.INSUFFICIENT_MP, context);

            expect(showNotificationSpy).toHaveBeenCalledWith({
                message: 'MPが足りません',
                type: ErrorSeverity.WARNING,
                duration: 2000,
                actions: expect.arrayContaining(['MPを回復してください'])
            });
        });

        test('音響効果イベントを発行する', async () => {
            const playSoundSpy = jest.fn();
            errorHandler.on('play-sound', playSoundSpy);

            const context: SkillErrorContext = {
                skillId: 'heal',
                casterId: 'player1',
                timestamp: new Date()
            };

            await errorHandler.handleSkillError(SkillError.SKILL_ON_COOLDOWN, context);

            expect(playSoundSpy).toHaveBeenCalledWith({
                soundKey: 'info_sound',
                volume: 0.5
            });
        });

        test('詳細エラー情報を表示する', async () => {
            const showDetailsSpy = jest.fn();
            errorHandler.on('show-error-details', showDetailsSpy);

            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            await errorHandler.handleSkillError(SkillError.DATA_CORRUPTION, context);

            expect(showDetailsSpy).toHaveBeenCalledWith({
                error: SkillError.DATA_CORRUPTION,
                message: 'データが破損しています',
                context,
                timestamp: context.timestamp
            });
        });

        test('ユーザーガイダンスを表示する', async () => {
            const showGuidanceSpy = jest.fn();
            errorHandler.on('show-guidance', showGuidanceSpy);

            const context: SkillErrorContext = {
                skillId: 'attack',
                casterId: 'player1',
                timestamp: new Date()
            };

            await errorHandler.handleSkillError(SkillError.INVALID_TARGET, context);

            expect(showGuidanceSpy).toHaveBeenCalledWith({
                title: 'おすすめの対処法',
                actions: expect.arrayContaining(['有効な対象を選択してください']),
                error: SkillError.INVALID_TARGET
            });
        });

        test('音響効果無効時は音を再生しない', async () => {
            const configWithoutSound = { ...mockConfig, enableSoundEffects: false };
            const handlerWithoutSound = new SkillErrorHandler(scene as any, configWithoutSound);

            const playSoundSpy = jest.fn();
            handlerWithoutSound.on('play-sound', playSoundSpy);

            const context: SkillErrorContext = {
                skillId: 'heal',
                casterId: 'player1',
                timestamp: new Date()
            };

            await handlerWithoutSound.handleSkillError(SkillError.SKILL_ON_COOLDOWN, context);

            expect(playSoundSpy).not.toHaveBeenCalled();

            handlerWithoutSound.destroy();
        });
    });

    describe('エラー回復メカニズム', () => {
        test('アニメーションエラーの自動回復を試行する', async () => {
            const skipAnimationSpy = jest.fn();
            errorHandler.on('skip-animation', skipAnimationSpy);

            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            const executionContext: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'fireball',
                targetPosition: { x: 5, y: 5 },
                battlefieldState: {},
                currentTurn: 1,
                executionTime: new Date()
            };

            const result = await errorHandler.handleSkillError(
                SkillError.ANIMATION_ERROR,
                context,
                executionContext
            );

            expect(skipAnimationSpy).toHaveBeenCalledWith({ context: executionContext });
            expect(result.success).toBe(true);
            expect(result.additionalInfo?.recoveredFromError).toBe(SkillError.ANIMATION_ERROR);
        });

        test('実行タイムアウトの回復を試行する', async () => {
            const cancelExecutionSpy = jest.fn();
            const stateRecoverySpy = jest.fn();

            errorHandler.on('cancel-execution', cancelExecutionSpy);
            errorHandler.on('state-recovery-success', stateRecoverySpy);

            const context: SkillErrorContext = {
                skillId: 'slow_skill',
                casterId: 'player1',
                timestamp: new Date()
            };

            const executionContext: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'slow_skill',
                targetPosition: { x: 3, y: 3 },
                battlefieldState: {
                    getCharacter: jest.fn().mockReturnValue({ hasActed: true }),
                    updateCharacterState: jest.fn()
                },
                currentTurn: 2,
                executionTime: new Date()
            };

            const result = await errorHandler.handleSkillError(
                SkillError.EXECUTION_TIMEOUT,
                context,
                executionContext
            );

            expect(cancelExecutionSpy).toHaveBeenCalledWith({ context: executionContext });
            expect(result.success).toBe(true);
        });

        test('回復不可能なエラーは回復を試行しない', async () => {
            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            const executionContext: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'fireball',
                targetPosition: { x: 5, y: 5 },
                battlefieldState: {},
                currentTurn: 1,
                executionTime: new Date()
            };

            const result = await errorHandler.handleSkillError(
                SkillError.DATA_CORRUPTION,
                context,
                executionContext
            );

            expect(result.success).toBe(false);
            expect(result.additionalInfo?.recoveredFromError).toBeUndefined();
        });

        test('自動回復無効時は回復を試行しない', async () => {
            const configWithoutRecovery = { ...mockConfig, enableAutoRecovery: false };
            const handlerWithoutRecovery = new SkillErrorHandler(scene as any, configWithoutRecovery);

            const skipAnimationSpy = jest.fn();
            handlerWithoutRecovery.on('skip-animation', skipAnimationSpy);

            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            const executionContext: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'fireball',
                targetPosition: { x: 5, y: 5 },
                battlefieldState: {},
                currentTurn: 1,
                executionTime: new Date()
            };

            const result = await handlerWithoutRecovery.handleSkillError(
                SkillError.ANIMATION_ERROR,
                context,
                executionContext
            );

            expect(skipAnimationSpy).not.toHaveBeenCalled();
            expect(result.success).toBe(false);

            handlerWithoutRecovery.destroy();
        });
    });

    describe('状態復旧とクリーンアップ', () => {
        test('キャラクター状態の復旧を実行する', async () => {
            const mockCharacter = {
                hasActed: true,
                currentMP: 50
            };

            const mockBattlefieldState = {
                getCharacter: jest.fn().mockReturnValue(mockCharacter),
                updateCharacterState: jest.fn()
            };

            const context: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'fireball',
                targetPosition: { x: 5, y: 5 },
                battlefieldState: mockBattlefieldState,
                currentTurn: 1,
                executionTime: new Date()
            };

            const errorDetails: SkillErrorDetails = {
                error: SkillError.EFFECT_APPLICATION_FAILED,
                message: 'Effect application failed',
                userMessage: 'スキル効果の適用に失敗',
                severity: ErrorSeverity.ERROR,
                recoverable: true,
                suggestedActions: [],
                context: {
                    skillId: 'fireball',
                    casterId: 'player1',
                    timestamp: new Date()
                }
            };

            const success = await errorHandler.performStateRecovery(context, errorDetails);

            expect(success).toBe(true);
            expect(mockBattlefieldState.getCharacter).toHaveBeenCalledWith('player1');
        });

        test('UI状態の復旧イベントを発行する', async () => {
            const recoverUISpy = jest.fn();
            errorHandler.on('recover-ui-state', recoverUISpy);

            const context: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'fireball',
                targetPosition: { x: 5, y: 5 },
                battlefieldState: {
                    getCharacter: jest.fn().mockReturnValue({ hasActed: true })
                },
                currentTurn: 1,
                executionTime: new Date()
            };

            const errorDetails: SkillErrorDetails = {
                error: SkillError.ANIMATION_ERROR,
                message: 'Animation error',
                userMessage: '表示エラーが発生しました',
                severity: ErrorSeverity.WARNING,
                recoverable: true,
                suggestedActions: [],
                context: {
                    skillId: 'fireball',
                    casterId: 'player1',
                    timestamp: new Date()
                }
            };

            await errorHandler.performStateRecovery(context, errorDetails);

            expect(recoverUISpy).toHaveBeenCalledWith({
                context,
                errorDetails,
                actions: expect.arrayContaining([
                    'clear-skill-selection',
                    'hide-range-display',
                    'reset-cursor',
                    'clear-temporary-effects'
                ])
            });
        });

        test('アニメーション状態のクリーンアップイベントを発行する', async () => {
            const cleanupAnimationsSpy = jest.fn();
            errorHandler.on('cleanup-animations', cleanupAnimationsSpy);

            const context: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'fireball',
                targetPosition: { x: 5, y: 5 },
                battlefieldState: {
                    getCharacter: jest.fn().mockReturnValue({ hasActed: true })
                },
                currentTurn: 1,
                executionTime: new Date()
            };

            const errorDetails: SkillErrorDetails = {
                error: SkillError.ANIMATION_ERROR,
                message: 'Animation error',
                userMessage: '表示エラーが発生しました',
                severity: ErrorSeverity.WARNING,
                recoverable: true,
                suggestedActions: [],
                context: {
                    skillId: 'fireball',
                    casterId: 'player1',
                    timestamp: new Date()
                }
            };

            await errorHandler.performStateRecovery(context, errorDetails);

            expect(cleanupAnimationsSpy).toHaveBeenCalledWith({
                context,
                errorDetails,
                actions: expect.arrayContaining([
                    'stop-all-animations',
                    'clear-temporary-effects',
                    'reset-character-sprites',
                    'clear-particle-effects'
                ])
            });
        });

        test('メモリクリーンアップイベントを発行する', async () => {
            const memoryCleanupSpy = jest.fn();
            errorHandler.on('memory-cleanup', memoryCleanupSpy);

            const context: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'fireball',
                targetPosition: { x: 5, y: 5 },
                battlefieldState: {
                    getCharacter: jest.fn().mockReturnValue({ hasActed: true })
                },
                currentTurn: 1,
                executionTime: new Date()
            };

            const errorDetails: SkillErrorDetails = {
                error: SkillError.EXECUTION_TIMEOUT,
                message: 'Execution timeout',
                userMessage: '実行時間が長すぎます',
                severity: ErrorSeverity.ERROR,
                recoverable: true,
                suggestedActions: [],
                context: {
                    skillId: 'fireball',
                    casterId: 'player1',
                    timestamp: new Date()
                }
            };

            await errorHandler.performStateRecovery(context, errorDetails);

            expect(memoryCleanupSpy).toHaveBeenCalledWith({
                context,
                errorDetails,
                actions: expect.arrayContaining([
                    'clear-temporary-objects',
                    'release-unused-textures',
                    'cleanup-event-listeners',
                    'garbage-collect'
                ])
            });
        });
    });

    describe('エラー統計と履歴', () => {
        test('エラー統計を正しく記録する', async () => {
            const context1: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            const context2: SkillErrorContext = {
                skillId: 'heal',
                casterId: 'player2',
                timestamp: new Date()
            };

            await errorHandler.handleSkillError(SkillError.INSUFFICIENT_MP, context1);
            await errorHandler.handleSkillError(SkillError.INSUFFICIENT_MP, context2);
            await errorHandler.handleSkillError(SkillError.SKILL_ON_COOLDOWN, context1);

            const statistics = errorHandler.getErrorStatistics();

            expect(statistics.get(SkillError.INSUFFICIENT_MP)).toBe(2);
            expect(statistics.get(SkillError.SKILL_ON_COOLDOWN)).toBe(1);
        });

        test('エラー履歴を正しく記録する', async () => {
            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            await errorHandler.handleSkillError(SkillError.INSUFFICIENT_MP, context);
            await errorHandler.handleSkillError(SkillError.SKILL_ON_COOLDOWN, context);

            const history = errorHandler.getErrorHistory();

            expect(history).toHaveLength(2);
            expect(history[0].error).toBe(SkillError.INSUFFICIENT_MP);
            expect(history[1].error).toBe(SkillError.SKILL_ON_COOLDOWN);
        });

        test('履歴の件数制限が機能する', async () => {
            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            // 5件のエラーを記録
            for (let i = 0; i < 5; i++) {
                await errorHandler.handleSkillError(SkillError.INSUFFICIENT_MP, context);
            }

            const limitedHistory = errorHandler.getErrorHistory(3);
            const fullHistory = errorHandler.getErrorHistory();

            expect(limitedHistory).toHaveLength(3);
            expect(fullHistory).toHaveLength(5);
        });
    });

    describe('設定とライフサイクル', () => {
        test('設定を更新できる', () => {
            const newConfig: Partial<UserFeedbackConfig> = {
                notificationDuration: 5000,
                enableSoundEffects: false
            };

            errorHandler.updateConfig(newConfig);

            // 設定が更新されたことを確認するため、内部的にアクセスできる方法が必要
            // ここでは動作確認として、音響効果が無効になることをテスト
            const playSoundSpy = jest.fn();
            errorHandler.on('play-sound', playSoundSpy);

            const context: SkillErrorContext = {
                skillId: 'heal',
                casterId: 'player1',
                timestamp: new Date()
            };

            return errorHandler.handleSkillError(SkillError.SKILL_ON_COOLDOWN, context)
                .then(() => {
                    expect(playSoundSpy).not.toHaveBeenCalled();
                });
        });

        test('リセット機能が正しく動作する', async () => {
            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            await errorHandler.handleSkillError(SkillError.INSUFFICIENT_MP, context);

            expect(errorHandler.getErrorHistory()).toHaveLength(1);
            expect(errorHandler.getErrorStatistics().size).toBeGreaterThan(0);

            errorHandler.reset();

            expect(errorHandler.getErrorHistory()).toHaveLength(0);
            expect(errorHandler.getErrorStatistics().size).toBe(0);
        });

        test('破棄機能が正しく動作する', () => {
            const removeAllListenersSpy = jest.spyOn(errorHandler, 'removeAllListeners');

            errorHandler.destroy();

            expect(removeAllListenersSpy).toHaveBeenCalled();
            expect(errorHandler.getErrorHistory()).toHaveLength(0);
        });
    });

    describe('エラーシナリオの包括的テスト', () => {
        test('複数のエラーが連続して発生した場合の処理', async () => {
            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            const errors = [
                SkillError.INSUFFICIENT_MP,
                SkillError.SKILL_ON_COOLDOWN,
                SkillError.INVALID_TARGET,
                SkillError.OUT_OF_RANGE
            ];

            const results: SkillResult[] = [];

            for (const error of errors) {
                const result = await errorHandler.handleSkillError(error, context);
                results.push(result);
            }

            expect(results).toHaveLength(4);
            expect(results.every(r => !r.success)).toBe(true);
            expect(errorHandler.getErrorHistory()).toHaveLength(4);
        });

        test('回復可能エラーと回復不可能エラーの混在処理', async () => {
            const recoverableContext: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            const unrecoverableContext: SkillErrorContext = {
                skillId: 'corrupted_skill',
                casterId: 'player1',
                timestamp: new Date()
            };

            const executionContext: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'fireball',
                targetPosition: { x: 5, y: 5 },
                battlefieldState: {},
                currentTurn: 1,
                executionTime: new Date()
            };

            const recoverableResult = await errorHandler.handleSkillError(
                SkillError.ANIMATION_ERROR,
                recoverableContext,
                executionContext
            );

            const unrecoverableResult = await errorHandler.handleSkillError(
                SkillError.DATA_CORRUPTION,
                unrecoverableContext,
                executionContext
            );

            expect(recoverableResult.success).toBe(true);
            expect(unrecoverableResult.success).toBe(false);
            expect(recoverableResult.additionalInfo?.recoveredFromError).toBe(SkillError.ANIMATION_ERROR);
            expect(unrecoverableResult.additionalInfo?.recoveredFromError).toBeUndefined();
        });

        test('エラー発生時のイベント連鎖が正しく動作する', async () => {
            const skillErrorSpy = jest.fn();
            const errorRecoverySuccessSpy = jest.fn();

            errorHandler.on('skill-error', skillErrorSpy);
            errorHandler.on('error-recovery-success', errorRecoverySuccessSpy);

            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            const executionContext: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'fireball',
                targetPosition: { x: 5, y: 5 },
                battlefieldState: {
                    getCharacter: jest.fn().mockReturnValue({ hasActed: true })
                },
                currentTurn: 1,
                executionTime: new Date()
            };

            await errorHandler.handleSkillError(
                SkillError.ANIMATION_ERROR,
                context,
                executionContext
            );

            expect(skillErrorSpy).toHaveBeenCalled();
            expect(errorRecoverySuccessSpy).toHaveBeenCalled();
            // State recovery is called internally during error recovery, 
            // but the event may not be emitted in this test scenario
        });
    });

    describe('エッジケースとエラー境界', () => {
        test('null/undefinedコンテキストの処理', async () => {
            const context: SkillErrorContext = {
                skillId: undefined as any,
                casterId: undefined as any,
                timestamp: new Date()
            };

            const result = await errorHandler.handleSkillError(
                SkillError.SKILL_NOT_FOUND,
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillError.SKILL_NOT_FOUND);
        });

        test('無効なエラー種別の処理', async () => {
            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            // 存在しないエラー種別をテスト
            const invalidError = 'INVALID_ERROR' as SkillError;

            await expect(async () => {
                await errorHandler.handleSkillError(invalidError, context);
            }).rejects.toThrow();
        });

        test('メモリ制限に達した場合の履歴管理', async () => {
            const context: SkillErrorContext = {
                skillId: 'fireball',
                casterId: 'player1',
                timestamp: new Date()
            };

            // 大量のエラーを生成して履歴制限をテスト
            for (let i = 0; i < 150; i++) {
                await errorHandler.handleSkillError(SkillError.INSUFFICIENT_MP, context);
            }

            // 定期クリーンアップを手動実行
            (errorHandler as any).performPeriodicCleanup();

            const history = errorHandler.getErrorHistory();
            expect(history.length).toBeLessThanOrEqual(100);
        });
    });
});