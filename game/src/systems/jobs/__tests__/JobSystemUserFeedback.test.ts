/**
 * JobSystemUserFeedback のテスト
 * 
 * ユーザーフィードバック、通知、ダイアログ、ガイダンス機能のテストを実装します。
 */

// Phaser のモック
global.Phaser = {
    Events: {
        EventEmitter: class EventEmitter {
            private events: Map<string, Function[]> = new Map();

            on(event: string, callback: Function) {
                if (!this.events.has(event)) {
                    this.events.set(event, []);
                }
                this.events.get(event)!.push(callback);
            }

            off(event: string, callback: Function) {
                const callbacks = this.events.get(event);
                if (callbacks) {
                    const index = callbacks.indexOf(callback);
                    if (index > -1) {
                        callbacks.splice(index, 1);
                    }
                }
            }

            emit(event: string, ...args: any[]) {
                const callbacks = this.events.get(event);
                if (callbacks) {
                    callbacks.forEach(callback => callback(...args));
                }
            }

            removeAllListeners() {
                this.events.clear();
            }
        }
    }
} as any;

import { JobSystemUserFeedback, NotificationType } from '../JobSystemUserFeedback';
import { JobSystemError, JobSystemContext } from '../../../types/job';

describe('JobSystemUserFeedback', () => {
    let userFeedback: JobSystemUserFeedback;

    beforeEach(() => {
        userFeedback = new JobSystemUserFeedback({
            enableNotifications: true,
            enableDialogs: true,
            enableGuidance: true,
            enableSoundEffects: false, // テスト環境では無効化
            notificationDuration: 1000,
            maxNotifications: 3,
            enableAnimations: false,
        });
    });

    afterEach(() => {
        userFeedback.destroy();
    });

    describe('通知システム', () => {
        test('成功通知を表示できる', () => {
            const mockShowNotification = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);

            userFeedback.showSuccessNotification(
                'テスト成功',
                'テストが正常に完了しました',
                '詳細情報'
            );

            expect(mockShowNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: NotificationType.SUCCESS,
                    title: 'テスト成功',
                    message: 'テストが正常に完了しました',
                    details: '詳細情報',
                })
            );
        });

        test('情報通知を表示できる', () => {
            const mockShowNotification = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);

            userFeedback.showInfoNotification('情報', 'テスト情報です');

            expect(mockShowNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: NotificationType.INFO,
                    title: '情報',
                    message: 'テスト情報です',
                })
            );
        });

        test('警告通知を表示できる', () => {
            const mockShowNotification = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);

            userFeedback.showWarningNotification('警告', 'テスト警告です');

            expect(mockShowNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: NotificationType.WARNING,
                    title: '警告',
                    message: 'テスト警告です',
                    persistent: true,
                })
            );
        });

        test('エラー通知を表示できる', () => {
            const mockShowNotification = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);

            userFeedback.showErrorNotification('エラー', 'テストエラーです');

            expect(mockShowNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: NotificationType.ERROR,
                    title: 'エラー',
                    message: 'テストエラーです',
                    persistent: true,
                })
            );
        });

        test('通知数制限が機能する', () => {
            const mockShowNotification = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);

            // 最大数を超える通知を送信
            for (let i = 0; i < 5; i++) {
                userFeedback.showInfoNotification(`通知${i}`, `メッセージ${i}`);
            }

            // 最大3つまでしか表示されない
            expect(mockShowNotification).toHaveBeenCalledTimes(3);

            // アクティブな通知を確認
            const activeNotifications = userFeedback.getActiveNotifications();
            expect(activeNotifications).toHaveLength(3);
        });

        test('通知を非表示にできる', () => {
            const mockShowNotification = jest.fn();
            const mockHideNotification = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);
            userFeedback.on('hide_notification', mockHideNotification);

            userFeedback.showInfoNotification('テスト', 'メッセージ');

            const activeNotifications = userFeedback.getActiveNotifications();
            expect(activeNotifications).toHaveLength(1);

            const notificationId = activeNotifications[0].id;
            userFeedback.hideNotification(notificationId);

            expect(mockHideNotification).toHaveBeenCalled();
            expect(userFeedback.getActiveNotifications()).toHaveLength(0);
        });

        test('全ての通知を非表示にできる', () => {
            const mockHideNotification = jest.fn();
            userFeedback.on('hide_notification', mockHideNotification);

            // 複数の通知を表示
            userFeedback.showInfoNotification('通知1', 'メッセージ1');
            userFeedback.showInfoNotification('通知2', 'メッセージ2');

            expect(userFeedback.getActiveNotifications()).toHaveLength(2);

            userFeedback.hideAllNotifications();

            expect(userFeedback.getActiveNotifications()).toHaveLength(0);
            expect(mockHideNotification).toHaveBeenCalledTimes(2);
        });
    });

    describe('ダイアログシステム', () => {
        test('ダイアログを表示できる', () => {
            const mockShowDialog = jest.fn();
            userFeedback.on('show_dialog', mockShowDialog);

            const dialogId = userFeedback.showDialog({
                title: 'テストダイアログ',
                message: 'テストメッセージ',
                type: 'alert',
            });

            expect(dialogId).toBeTruthy();
            expect(mockShowDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'テストダイアログ',
                    message: 'テストメッセージ',
                    type: 'alert',
                })
            );
        });

        test('確認ダイアログを表示できる', () => {
            const mockShowDialog = jest.fn();
            const mockHideDialog = jest.fn();
            const mockConfirm = jest.fn();
            const mockCancel = jest.fn();

            userFeedback.on('show_dialog', mockShowDialog);
            userFeedback.on('hide_dialog', mockHideDialog);

            const dialogId = userFeedback.showConfirmDialog(
                '確認',
                '実行しますか？',
                mockConfirm,
                mockCancel
            );

            expect(mockShowDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: '確認',
                    message: '実行しますか？',
                    type: 'confirm',
                    buttons: expect.arrayContaining([
                        expect.objectContaining({
                            text: '確認',
                            action: 'confirm',
                        }),
                        expect.objectContaining({
                            text: 'キャンセル',
                            action: 'cancel',
                        }),
                    ]),
                })
            );

            // 確認ボタンをクリックした場合をシミュレート
            userFeedback.hideDialog(dialogId, { action: 'confirm' });

            expect(mockConfirm).toHaveBeenCalled();
            expect(mockCancel).not.toHaveBeenCalled();
        });

        test('ダイアログをキャンセルできる', () => {
            const mockConfirm = jest.fn();
            const mockCancel = jest.fn();

            const dialogId = userFeedback.showConfirmDialog(
                '確認',
                '実行しますか？',
                mockConfirm,
                mockCancel
            );

            // キャンセルボタンをクリックした場合をシミュレート
            userFeedback.hideDialog(dialogId, { action: 'cancel' });

            expect(mockConfirm).not.toHaveBeenCalled();
            expect(mockCancel).toHaveBeenCalled();
        });

        test('全てのダイアログを非表示にできる', () => {
            const mockHideDialog = jest.fn();
            userFeedback.on('hide_dialog', mockHideDialog);

            // 複数のダイアログを表示
            userFeedback.showDialog({ title: 'ダイアログ1', message: 'メッセージ1' });
            userFeedback.showDialog({ title: 'ダイアログ2', message: 'メッセージ2' });

            expect(userFeedback.getActiveDialogs()).toHaveLength(2);

            userFeedback.hideAllDialogs();

            expect(userFeedback.getActiveDialogs()).toHaveLength(0);
            expect(mockHideDialog).toHaveBeenCalledTimes(2);
        });
    });

    describe('ガイダンスシステム', () => {
        test('ガイダンスを表示できる', () => {
            const mockShowGuidance = jest.fn();
            userFeedback.on('show_guidance', mockShowGuidance);

            userFeedback.showGuidance('job_change');

            expect(mockShowGuidance).toHaveBeenCalledWith(
                expect.objectContaining({
                    guidance: expect.objectContaining({
                        id: 'job_change',
                        title: '職業変更ガイド',
                        category: 'job_change',
                    }),
                })
            );
        });

        test('職業変更ガイダンスを表示できる', () => {
            const mockShowGuidance = jest.fn();
            userFeedback.on('show_guidance', mockShowGuidance);

            userFeedback.showJobChangeGuidance('test-character', ['warrior', 'mage']);

            expect(mockShowGuidance).toHaveBeenCalledWith(
                expect.objectContaining({
                    context: expect.objectContaining({
                        characterId: 'test-character',
                        availableJobs: ['warrior', 'mage'],
                    }),
                })
            );
        });

        test('ランクアップガイダンスを表示できる', () => {
            const mockShowGuidance = jest.fn();
            userFeedback.on('show_guidance', mockShowGuidance);

            userFeedback.showRankUpGuidance('test-character', 100, 50);

            expect(mockShowGuidance).toHaveBeenCalledWith(
                expect.objectContaining({
                    context: expect.objectContaining({
                        characterId: 'test-character',
                        requiredRoseEssence: 100,
                        currentRoseEssence: 50,
                        shortage: 50,
                    }),
                })
            );
        });

        test('薔薇の力ガイダンスを表示できる', () => {
            const mockShowGuidance = jest.fn();
            userFeedback.on('show_guidance', mockShowGuidance);

            userFeedback.showRoseEssenceGuidance(75, 25);

            expect(mockShowGuidance).toHaveBeenCalledWith(
                expect.objectContaining({
                    context: expect.objectContaining({
                        currentAmount: 75,
                        nextBossReward: 25,
                    }),
                })
            );
        });
    });

    describe('職業システム固有のフィードバック', () => {
        test('薔薇の力不足フィードバックを処理する', () => {
            const mockShowNotification = jest.fn();
            const mockShowGuidance = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);
            userFeedback.on('show_guidance', mockShowGuidance);

            const context: JobSystemContext = {
                requiredRoseEssence: 100,
                currentRoseEssence: 50,
                error: JobSystemError.INSUFFICIENT_ROSE_ESSENCE,
            };

            userFeedback.handleJobSystemFeedback(JobSystemError.INSUFFICIENT_ROSE_ESSENCE, context);

            expect(mockShowNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: NotificationType.WARNING,
                    title: '薔薇の力が不足しています',
                    actions: expect.arrayContaining([
                        expect.objectContaining({
                            text: 'ボス戦に挑戦',
                            action: 'navigate_to_boss_battle',
                        }),
                    ]),
                })
            );

            expect(mockShowGuidance).toHaveBeenCalled();
        });

        test('レベル要件不足フィードバックを処理する', () => {
            const mockShowNotification = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);

            const context: JobSystemContext = {
                requiredLevel: 10,
                currentLevel: 5,
                error: JobSystemError.LEVEL_REQUIREMENT_NOT_MET,
            };

            userFeedback.handleJobSystemFeedback(JobSystemError.LEVEL_REQUIREMENT_NOT_MET, context);

            expect(mockShowNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: NotificationType.WARNING,
                    title: 'レベルが不足しています',
                    details: '現在のレベル: 5 (あと5レベル必要)',
                })
            );
        });

        test('スキル要件不足フィードバックを処理する', () => {
            const mockShowNotification = jest.fn();
            const mockShowGuidance = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);
            userFeedback.on('show_guidance', mockShowGuidance);

            const context: JobSystemContext = {
                missingSkills: ['fire_magic', 'heal'],
                error: JobSystemError.PREREQUISITE_SKILLS_MISSING,
            };

            userFeedback.handleJobSystemFeedback(JobSystemError.PREREQUISITE_SKILLS_MISSING, context);

            expect(mockShowNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: NotificationType.WARNING,
                    title: '必要なスキルが不足しています',
                    details: '不足スキル: fire_magic, heal',
                })
            );

            expect(mockShowGuidance).toHaveBeenCalledWith(
                expect.objectContaining({
                    context: expect.objectContaining({
                        missingSkills: ['fire_magic', 'heal'],
                    }),
                })
            );
        });

        test('職業が見つからないフィードバックを処理する', () => {
            const mockShowNotification = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);

            const context: JobSystemContext = {
                targetJobId: 'invalid-job',
                error: JobSystemError.JOB_NOT_FOUND,
            };

            userFeedback.handleJobSystemFeedback(JobSystemError.JOB_NOT_FOUND, context);

            expect(mockShowNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: NotificationType.ERROR,
                    title: '職業が見つかりません',
                    details: '職業ID: invalid-job',
                })
            );
        });

        test('ランクアップ不可フィードバックを処理する', () => {
            const mockShowNotification = jest.fn();
            const mockShowGuidance = jest.fn();
            userFeedback.on('show_notification', mockShowNotification);
            userFeedback.on('show_guidance', mockShowGuidance);

            const context: JobSystemContext = {
                characterId: 'test-character',
                reason: 'テスト理由',
                requiredRoseEssence: 100,
                currentRoseEssence: 50,
                error: JobSystemError.RANK_UP_NOT_AVAILABLE,
            };

            userFeedback.handleJobSystemFeedback(JobSystemError.RANK_UP_NOT_AVAILABLE, context);

            expect(mockShowNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: NotificationType.WARNING,
                    title: 'ランクアップできません',
                    details: 'テスト理由',
                })
            );

            expect(mockShowGuidance).toHaveBeenCalled();
        });
    });

    describe('設定管理', () => {
        test('設定を更新できる', () => {
            const mockConfigUpdated = jest.fn();
            userFeedback.on('config_updated', mockConfigUpdated);

            userFeedback.updateConfig({
                enableNotifications: false,
                notificationDuration: 2000,
            });

            expect(mockConfigUpdated).toHaveBeenCalledWith(
                expect.objectContaining({
                    enableNotifications: false,
                    notificationDuration: 2000,
                })
            );
        });

        test('通知が無効化されている場合は表示されない', () => {
            const disabledFeedback = new JobSystemUserFeedback({
                enableNotifications: false,
            });

            const mockShowNotification = jest.fn();
            disabledFeedback.on('show_notification', mockShowNotification);

            disabledFeedback.showInfoNotification('テスト', 'メッセージ');

            expect(mockShowNotification).not.toHaveBeenCalled();

            disabledFeedback.destroy();
        });

        test('ダイアログが無効化されている場合は表示されない', () => {
            const disabledFeedback = new JobSystemUserFeedback({
                enableDialogs: false,
            });

            const mockShowDialog = jest.fn();
            disabledFeedback.on('show_dialog', mockShowDialog);

            const dialogId = disabledFeedback.showDialog({
                title: 'テスト',
                message: 'メッセージ',
            });

            expect(dialogId).toBe('');
            expect(mockShowDialog).not.toHaveBeenCalled();

            disabledFeedback.destroy();
        });
    });

    describe('音効果', () => {
        test('音効果が有効な場合は音が再生される', () => {
            const soundFeedback = new JobSystemUserFeedback({
                enableSoundEffects: true,
            });

            const mockPlaySound = jest.fn();
            soundFeedback.on('play_sound', mockPlaySound);

            soundFeedback.showSuccessNotification('成功', 'メッセージ');

            expect(mockPlaySound).toHaveBeenCalledWith('notification_success');

            soundFeedback.destroy();
        });

        test('音効果が無効な場合は音が再生されない', () => {
            const mockPlaySound = jest.fn();
            userFeedback.on('play_sound', mockPlaySound);

            userFeedback.showSuccessNotification('成功', 'メッセージ');

            expect(mockPlaySound).not.toHaveBeenCalled();
        });
    });
});