/**
 * JobSystemErrorHandler のテスト
 * 
 * エラーハンドリング、ユーザーフィードバック、エラー回復処理、
 * ログ記録機能のテストを実装します。
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

import { JobSystemErrorHandler } from '../JobSystemErrorHandler';
import { JobSystemError, JobSystemContext } from '../../../types/job';

describe('JobSystemErrorHandler', () => {
    let errorHandler: JobSystemErrorHandler;

    beforeEach(() => {
        errorHandler = new JobSystemErrorHandler({
            enableLogging: true,
            enableUserNotifications: true,
            enableAutoRecovery: true,
            logLevel: 'debug',
            maxLogEntries: 100,
            enableStackTrace: false, // テスト環境では無効化
        });
    });

    afterEach(() => {
        errorHandler.destroy();
    });

    describe('エラー処理', () => {
        test('薔薇の力不足エラーを正しく処理する', () => {
            const context: JobSystemContext = {
                characterId: 'test-character',
                requiredRoseEssence: 100,
                currentRoseEssence: 50,
                error: JobSystemError.INSUFFICIENT_ROSE_ESSENCE,
            };

            const mockShowDialog = jest.fn();
            errorHandler.on('show_dialog', mockShowDialog);

            const result = errorHandler.handleError(JobSystemError.INSUFFICIENT_ROSE_ESSENCE, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('薔薇の力が50不足しています');
            expect(mockShowDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: '薔薇の力が不足しています',
                    buttons: expect.arrayContaining([
                        expect.objectContaining({
                            text: 'ボス戦に挑戦',
                            action: 'navigate_to_boss_battle',
                        }),
                    ]),
                })
            );
        });

        test('レベル要件不足エラーを正しく処理する', () => {
            const context: JobSystemContext = {
                characterId: 'test-character',
                requiredLevel: 10,
                currentLevel: 5,
                error: JobSystemError.LEVEL_REQUIREMENT_NOT_MET,
            };

            const mockShowDialog = jest.fn();
            errorHandler.on('show_dialog', mockShowDialog);

            const result = errorHandler.handleError(JobSystemError.LEVEL_REQUIREMENT_NOT_MET, context);

            expect(result.success).toBe(false);
            expect(mockShowDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'レベルが不足しています',
                    details: '必要レベル: 10\n現在のレベル: 5',
                })
            );
        });

        test('スキル要件不足エラーを正しく処理する', () => {
            const context: JobSystemContext = {
                characterId: 'test-character',
                missingSkills: ['fire_magic', 'heal'],
                error: JobSystemError.PREREQUISITE_SKILLS_MISSING,
            };

            const mockShowDialog = jest.fn();
            errorHandler.on('show_dialog', mockShowDialog);

            errorHandler.handleError(JobSystemError.PREREQUISITE_SKILLS_MISSING, context);

            expect(mockShowDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: '必要なスキルが不足しています',
                    details: '不足しているスキル: fire_magic, heal',
                })
            );
        });

        test('職業が見つからないエラーを正しく処理する', () => {
            const context: JobSystemContext = {
                characterId: 'test-character',
                targetJobId: 'invalid-job',
                error: JobSystemError.JOB_NOT_FOUND,
            };

            const mockShowDialog = jest.fn();
            errorHandler.on('show_dialog', mockShowDialog);

            errorHandler.handleError(JobSystemError.JOB_NOT_FOUND, context);

            expect(mockShowDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: '職業が見つかりません',
                    details: '指定された職業ID: invalid-job',
                })
            );
        });

        test('データ破損エラーを正しく処理する', () => {
            const context: JobSystemContext = {
                error: JobSystemError.DATA_CORRUPTION,
            };

            const mockShowDialog = jest.fn();
            errorHandler.on('show_dialog', mockShowDialog);

            errorHandler.handleError(JobSystemError.DATA_CORRUPTION, context);

            expect(mockShowDialog).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'データエラー',
                    severity: 'critical',
                    buttons: expect.arrayContaining([
                        expect.objectContaining({
                            text: '自動修復を実行',
                            action: 'attempt_data_repair',
                        }),
                    ]),
                })
            );
        });
    });

    describe('エラー回復処理', () => {
        test('データ破損からの回復を試行する', () => {
            const context: JobSystemContext = {
                characterId: 'test-character',
                targetJobId: 'warrior',
                currentRoseEssence: -10,
                error: JobSystemError.DATA_CORRUPTION,
            };

            const mockRecoverCharacterJob = jest.fn();
            const mockRecoverRoseEssence = jest.fn();
            errorHandler.on('recover_character_job', mockRecoverCharacterJob);
            errorHandler.on('recover_rose_essence', mockRecoverRoseEssence);

            const result = errorHandler.attemptErrorRecovery(JobSystemError.DATA_CORRUPTION, context);

            expect(result.success).toBe(true);
            expect(result.message).toBe('データ破損を修復しました');
            expect(result.actions).toContain('キャラクター職業をデフォルトに設定');
            expect(mockRecoverCharacterJob).toHaveBeenCalledWith({
                characterId: 'test-character',
                defaultJobId: 'warrior',
                rank: 1,
            });
            expect(mockRecoverRoseEssence).toHaveBeenCalledWith({ amount: 0 });
        });

        test('職業が見つからないエラーからの回復を試行する', () => {
            const context: JobSystemContext = {
                characterId: 'test-character',
                error: JobSystemError.JOB_NOT_FOUND,
            };

            const mockRecoverCharacterJob = jest.fn();
            errorHandler.on('recover_character_job', mockRecoverCharacterJob);

            const result = errorHandler.attemptErrorRecovery(JobSystemError.JOB_NOT_FOUND, context);

            expect(result.success).toBe(true);
            expect(result.message).toBe('デフォルト職業（戦士）に設定しました');
            expect(mockRecoverCharacterJob).toHaveBeenCalledWith({
                characterId: 'test-character',
                defaultJobId: 'warrior',
                rank: 1,
            });
        });

        test('無効なランクエラーからの回復を試行する', () => {
            const context: JobSystemContext = {
                characterId: 'test-character',
                targetRank: 10,
                maxRank: 5,
                error: JobSystemError.INVALID_RANK,
            };

            const mockRecoverCharacterRank = jest.fn();
            errorHandler.on('recover_character_rank', mockRecoverCharacterRank);

            const result = errorHandler.attemptErrorRecovery(JobSystemError.INVALID_RANK, context);

            expect(result.success).toBe(true);
            expect(result.message).toBe('ランクを有効な値（5）に修正しました');
            expect(mockRecoverCharacterRank).toHaveBeenCalledWith({
                characterId: 'test-character',
                validRank: 5,
            });
        });

        test('薔薇の力不足エラーは自動回復できない', () => {
            const context: JobSystemContext = {
                requiredRoseEssence: 100,
                currentRoseEssence: 50,
                error: JobSystemError.INSUFFICIENT_ROSE_ESSENCE,
            };

            const result = errorHandler.attemptErrorRecovery(JobSystemError.INSUFFICIENT_ROSE_ESSENCE, context);

            expect(result.success).toBe(false);
            expect(result.message).toContain('薔薇の力が50不足しています');
        });
    });

    describe('ログ記録', () => {
        test('エラーログが正しく記録される', () => {
            const context: JobSystemContext = {
                characterId: 'test-character',
                error: JobSystemError.JOB_NOT_FOUND,
            };

            errorHandler.handleError(JobSystemError.JOB_NOT_FOUND, context);

            const logs = errorHandler.getErrorLog();
            expect(logs).toHaveLength(1);
            expect(logs[0]).toMatchObject({
                error: JobSystemError.JOB_NOT_FOUND,
                context,
                recovered: false,
            });
        });

        test('ログサイズ制限が機能する', () => {
            const smallHandler = new JobSystemErrorHandler({
                maxLogEntries: 2,
            });

            const context: JobSystemContext = { error: JobSystemError.JOB_NOT_FOUND };

            // 3つのエラーを記録
            smallHandler.handleError(JobSystemError.JOB_NOT_FOUND, context);
            smallHandler.handleError(JobSystemError.INVALID_RANK, context);
            smallHandler.handleError(JobSystemError.DATA_CORRUPTION, context);

            const logs = smallHandler.getErrorLog();
            expect(logs).toHaveLength(2);
            // 最新の2つのログが保持される
            expect(logs[0].error).toBe(JobSystemError.DATA_CORRUPTION);
            expect(logs[1].error).toBe(JobSystemError.INVALID_RANK);

            smallHandler.destroy();
        });

        test('エラー統計が正しく計算される', () => {
            const context: JobSystemContext = { error: JobSystemError.JOB_NOT_FOUND };

            // 複数のエラーを記録
            errorHandler.handleError(JobSystemError.JOB_NOT_FOUND, context);
            errorHandler.handleError(JobSystemError.JOB_NOT_FOUND, context);
            errorHandler.handleError(JobSystemError.INVALID_RANK, context);

            const stats = errorHandler.getErrorStatistics();
            expect(stats.totalErrors).toBe(3);
            expect(stats.errorsByType.get(JobSystemError.JOB_NOT_FOUND)).toBe(2);
            expect(stats.errorsByType.get(JobSystemError.INVALID_RANK)).toBe(1);
        });
    });

    describe('設定管理', () => {
        test('設定を更新できる', () => {
            const mockConfigUpdated = jest.fn();
            errorHandler.on('config_updated', mockConfigUpdated);

            errorHandler.updateConfig({
                enableLogging: false,
                logLevel: 'error',
            });

            expect(mockConfigUpdated).toHaveBeenCalledWith(
                expect.objectContaining({
                    enableLogging: false,
                    logLevel: 'error',
                })
            );
        });

        test('ログレベルに基づいてログ出力が制御される', () => {
            const errorOnlyHandler = new JobSystemErrorHandler({
                logLevel: 'error',
                enableLogging: true,
            });

            const context: JobSystemContext = { error: JobSystemError.JOB_NOT_FOUND };

            // INFO レベルのエラー（実際にはERRORレベル）
            errorOnlyHandler.handleError(JobSystemError.JOB_NOT_FOUND, context);

            const logs = errorOnlyHandler.getErrorLog();
            expect(logs).toHaveLength(1);

            errorOnlyHandler.destroy();
        });
    });

    describe('エラーログのエクスポート', () => {
        test('エラーログをJSON形式でエクスポートできる', () => {
            const context: JobSystemContext = {
                characterId: 'test-character',
                error: JobSystemError.JOB_NOT_FOUND,
            };

            errorHandler.handleError(JobSystemError.JOB_NOT_FOUND, context);

            const exportedData = errorHandler.exportErrorLog();
            const parsedData = JSON.parse(exportedData);

            expect(parsedData).toHaveProperty('sessionId');
            expect(parsedData).toHaveProperty('exportTime');
            expect(parsedData).toHaveProperty('logs');
            expect(parsedData).toHaveProperty('statistics');
            expect(parsedData.logs).toHaveLength(1);
            expect(parsedData.logs[0].error).toBe(JobSystemError.JOB_NOT_FOUND);
        });
    });

    describe('エラーログのクリア', () => {
        test('エラーログをクリアできる', () => {
            const context: JobSystemContext = { error: JobSystemError.JOB_NOT_FOUND };
            errorHandler.handleError(JobSystemError.JOB_NOT_FOUND, context);

            expect(errorHandler.getErrorLog()).toHaveLength(1);

            const mockLogCleared = jest.fn();
            errorHandler.on('error_log_cleared', mockLogCleared);

            errorHandler.clearErrorLog();

            expect(errorHandler.getErrorLog()).toHaveLength(0);
            expect(mockLogCleared).toHaveBeenCalled();
        });
    });

    describe('イベント発行', () => {
        test('エラー処理時に適切なイベントが発行される', () => {
            const mockErrorHandled = jest.fn();
            errorHandler.on('error_handled', mockErrorHandled);

            const context: JobSystemContext = {
                characterId: 'test-character',
                error: JobSystemError.INSUFFICIENT_ROSE_ESSENCE, // 自動回復されないエラーを使用
            };

            errorHandler.handleError(JobSystemError.INSUFFICIENT_ROSE_ESSENCE, context);

            expect(mockErrorHandled).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: JobSystemError.INSUFFICIENT_ROSE_ESSENCE,
                    context,
                    recovered: false,
                })
            );
        });
    });
});