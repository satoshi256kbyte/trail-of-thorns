/**
 * JobSystemDebugger のテスト
 * 
 * デバッグ機能、ログ記録、パフォーマンス監視、開発者ツールのテストを実装します。
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

import { JobSystemDebugger, LogLevel } from '../JobSystemDebugger';
import { JobSystemError, JobSystemContext } from '../../../types/job';

// performance.now() のモック
Object.defineProperty(global, 'performance', {
    value: {
        now: jest.fn(() => Date.now()),
        memory: {
            usedJSHeapSize: 1000000,
            totalJSHeapSize: 2000000,
            jsHeapSizeLimit: 4000000,
        },
    },
});

describe('JobSystemDebugger', () => {
    let jobDebugger: JobSystemDebugger;

    beforeEach(() => {
        jobDebugger = new JobSystemDebugger({
            enabled: true,
            logLevel: LogLevel.DEBUG,
            maxLogEntries: 100,
            enablePerformanceTracking: true,
            enableStackTrace: false, // テスト環境では無効化
            enableConsoleOutput: false, // テスト環境では無効化
            enableRemoteLogging: false,
            categories: ['job', 'rank_up', 'rose_essence', 'error', 'performance'],
        });
    });

    afterEach(() => {
        jobDebugger.destroy();
    });

    describe('ログ記録', () => {
        test('デバッグログを記録できる', () => {
            jobDebugger.debug('job', 'テストデバッグメッセージ', { test: 'data' });

            const logs = jobDebugger.getLogs();
            expect(logs).toHaveLength(1); // テストログ
            expect(logs[0]).toMatchObject({
                level: LogLevel.DEBUG,
                category: 'job',
                message: 'テストデバッグメッセージ',
                data: { test: 'data' },
            });
        });

        test('情報ログを記録できる', () => {
            jobDebugger.info('job', 'テスト情報メッセージ');

            const logs = jobDebugger.getLogs();
            expect(logs[0]).toMatchObject({
                level: LogLevel.INFO,
                category: 'job',
                message: 'テスト情報メッセージ',
            });
        });

        test('警告ログを記録できる', () => {
            jobDebugger.warn('job', 'テスト警告メッセージ');

            const logs = jobDebugger.getLogs();
            expect(logs[0]).toMatchObject({
                level: LogLevel.WARN,
                category: 'job',
                message: 'テスト警告メッセージ',
            });
        });

        test('エラーログを記録できる', () => {
            jobDebugger.error('error', 'テストエラーメッセージ');

            const logs = jobDebugger.getLogs();
            expect(logs[0]).toMatchObject({
                level: LogLevel.ERROR,
                category: 'error',
                message: 'テストエラーメッセージ',
            });
        });

        test('重大エラーログを記録できる', () => {
            jobDebugger.critical('error', 'テスト重大エラーメッセージ');

            const logs = jobDebugger.getLogs();
            expect(logs[0]).toMatchObject({
                level: LogLevel.CRITICAL,
                category: 'error',
                message: 'テスト重大エラーメッセージ',
            });
        });

        test('ログレベルフィルタリングが機能する', () => {
            const errorOnlyDebugger = new JobSystemDebugger({
                enabled: true,
                logLevel: LogLevel.ERROR,
                enableConsoleOutput: false,
            });

            errorOnlyDebugger.debug('job', 'デバッグメッセージ');
            errorOnlyDebugger.info('job', '情報メッセージ');
            errorOnlyDebugger.warn('job', '警告メッセージ');
            errorOnlyDebugger.error('error', 'エラーメッセージ');

            const logs = errorOnlyDebugger.getLogs();
            expect(logs).toHaveLength(1); // エラーログのみ
            expect(logs[0].level).toBe(LogLevel.ERROR);

            errorOnlyDebugger.destroy();
        });

        test('カテゴリフィルタリングが機能する', () => {
            const jobOnlyDebugger = new JobSystemDebugger({
                enabled: true,
                categories: ['job'],
                enableConsoleOutput: false,
            });

            jobOnlyDebugger.info('job', 'ジョブメッセージ');
            jobOnlyDebugger.info('error', 'エラーメッセージ');

            const logs = jobOnlyDebugger.getLogs();
            expect(logs).toHaveLength(1); // jobカテゴリのみ
            expect(logs[0].category).toBe('job');

            jobOnlyDebugger.destroy();
        });

        test('ログサイズ制限が機能する', () => {
            const smallDebugger = new JobSystemDebugger({
                enabled: true,
                maxLogEntries: 2,
                enableConsoleOutput: false,
            });

            smallDebugger.info('job', 'メッセージ1');
            smallDebugger.info('job', 'メッセージ2');
            smallDebugger.info('job', 'メッセージ3');

            const logs = smallDebugger.getLogs();
            expect(logs).toHaveLength(2);
            // 最新の2つのログが保持される
            expect(logs[0].message).toBe('メッセージ3');
            expect(logs[1].message).toBe('メッセージ2');

            smallDebugger.destroy();
        });

        test('ログをフィルタリングして取得できる', () => {
            jobDebugger.info('job', 'ジョブメッセージ');
            jobDebugger.info('rank_up', 'ランクアップメッセージ');
            jobDebugger.info('rose_essence', '薔薇の力メッセージ');

            const jobLogs = jobDebugger.getLogs('job');
            expect(jobLogs.length).toBeGreaterThan(0);
            expect(jobLogs.every(log => log.category.includes('job') || log.message.includes('job'))).toBe(true);
        });
    });

    describe('パフォーマンス測定', () => {
        test('パフォーマンス測定を開始・終了できる', () => {
            jobDebugger.startPerformanceTracking('test_operation', { param: 'value' });

            // 少し時間を経過させる
            jest.advanceTimersByTime(100);

            const result = jobDebugger.endPerformanceTracking('test_operation');

            expect(result).toBeTruthy();
            expect(result!.name).toBe('test_operation');
            expect(result!.duration).toBeGreaterThan(0);
            expect(result!.metadata).toEqual({ param: 'value' });
        });

        test('存在しない測定を終了しようとすると警告が記録される', () => {
            const result = jobDebugger.endPerformanceTracking('nonexistent_operation');

            expect(result).toBeNull();

            const logs = jobDebugger.getLogs('performance');
            expect(logs.some(log => log.message.includes('Performance metric not found'))).toBe(true);
        });

        test('パフォーマンス測定が無効な場合は何もしない', () => {
            const noPerformanceDebugger = new JobSystemDebugger({
                enabled: true,
                enablePerformanceTracking: false,
                enableConsoleOutput: false,
            });

            noPerformanceDebugger.startPerformanceTracking('test_operation');
            const result = noPerformanceDebugger.endPerformanceTracking('test_operation');

            expect(result).toBeNull();

            noPerformanceDebugger.destroy();
        });
    });

    describe('職業システム固有のログ', () => {
        test('職業変更をログできる', () => {
            jobDebugger.logJobChange('character1', 'warrior', 'mage', true);

            const logs = jobDebugger.getLogs('job');
            expect(logs.some(log =>
                log.message === 'Job change attempt' &&
                log.data.characterId === 'character1' &&
                log.data.oldJobId === 'warrior' &&
                log.data.newJobId === 'mage' &&
                log.data.success === true
            )).toBe(true);
        });

        test('ランクアップをログできる', () => {
            jobDebugger.logRankUp('character1', 'warrior', 1, 2, 50, true);

            const logs = jobDebugger.getLogs('rank_up');
            expect(logs.some(log =>
                log.message === 'Rank up attempt' &&
                log.data.characterId === 'character1' &&
                log.data.jobId === 'warrior' &&
                log.data.oldRank === 1 &&
                log.data.newRank === 2 &&
                log.data.roseEssenceUsed === 50 &&
                log.data.success === true
            )).toBe(true);
        });

        test('薔薇の力の変動をログできる', () => {
            jobDebugger.logRoseEssenceChange('gain', 25, 'boss_defeat', 100);

            const logs = jobDebugger.getLogs('rose_essence');
            expect(logs.some(log =>
                log.message === 'Rose essence gain' &&
                log.data.type === 'gain' &&
                log.data.amount === 25 &&
                log.data.source === 'boss_defeat' &&
                log.data.currentTotal === 100
            )).toBe(true);
        });

        test('エラーコンテキストをログできる', () => {
            const context: JobSystemContext = {
                characterId: 'character1',
                targetJobId: 'invalid-job',
                error: JobSystemError.JOB_NOT_FOUND,
            };

            jobDebugger.logErrorContext(JobSystemError.JOB_NOT_FOUND, context);

            const logs = jobDebugger.getLogs('error');
            expect(logs.some(log =>
                log.message.includes('JobSystem error occurred') &&
                log.data.error === JobSystemError.JOB_NOT_FOUND &&
                log.data.context === context
            )).toBe(true);
        });

        test('データ破損エラーは重大エラーとして記録される', () => {
            const context: JobSystemContext = {
                error: JobSystemError.DATA_CORRUPTION,
            };

            jobDebugger.logErrorContext(JobSystemError.DATA_CORRUPTION, context);

            const logs = jobDebugger.getLogs();
            expect(logs.some(log =>
                log.level === LogLevel.CRITICAL &&
                log.message === 'Data corruption detected'
            )).toBe(true);
        });

        test('JobSystemの状態をログできる', () => {
            const mockJobSystem = {
                isSystemInitialized: () => true,
                getAllJobs: () => new Map([['warrior', {}], ['mage', {}]]),
                getCurrentRoseEssence: () => 75,
                getRankUpCandidates: () => [{ characterId: 'char1' }],
                getSystemStats: () => ({ uptime: 1000 }),
            };

            jobDebugger.logJobSystemState(mockJobSystem);

            const logs = jobDebugger.getLogs('job');
            expect(logs.some(log =>
                log.message === 'JobSystem state snapshot' &&
                log.data.initialized === true &&
                log.data.totalJobs === 2 &&
                log.data.currentRoseEssence === 75 &&
                log.data.rankUpCandidates === 1
            )).toBe(true);
        });
    });

    describe('統計情報', () => {
        test('統計情報を取得できる', () => {
            jobDebugger.info('job', 'メッセージ1');
            jobDebugger.warn('job', 'メッセージ2');
            jobDebugger.error('error', 'メッセージ3');

            const stats = jobDebugger.getStatistics();

            expect(stats.totalLogs).toBeGreaterThan(0);
            expect(stats.logsByLevel.get(LogLevel.INFO)).toBeGreaterThan(0);
            expect(stats.logsByLevel.get(LogLevel.WARN)).toBe(1);
            expect(stats.logsByLevel.get(LogLevel.ERROR)).toBe(1);
            expect(stats.logsByCategory.get('job')).toBe(2);
            expect(stats.logsByCategory.get('error')).toBe(1);
            expect(stats.errorRate).toBeGreaterThan(0);
            expect(stats.sessionDuration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('ログのエクスポート', () => {
        test('ログをJSON形式でエクスポートできる', () => {
            jobDebugger.info('job', 'テストメッセージ');

            const exportedData = jobDebugger.exportLogs();
            const parsedData = JSON.parse(exportedData);

            expect(parsedData).toHaveProperty('sessionId');
            expect(parsedData).toHaveProperty('exportTime');
            expect(parsedData).toHaveProperty('config');
            expect(parsedData).toHaveProperty('statistics');
            expect(parsedData).toHaveProperty('logs');
            expect(parsedData).toHaveProperty('systemState');
            expect(parsedData.logs.length).toBeGreaterThan(0);
        });
    });

    describe('ログのクリア', () => {
        test('ログをクリアできる', () => {
            jobDebugger.info('job', 'テストメッセージ');
            expect(jobDebugger.getLogs()).toHaveLength(1); // テストログ

            const mockLogCleared = jest.fn();
            jobDebugger.on('logs_cleared', mockLogCleared);

            jobDebugger.clearLogs();

            expect(jobDebugger.getLogs()).toHaveLength(0);
            expect(mockLogCleared).toHaveBeenCalled();
        });
    });

    describe('設定管理', () => {
        test('設定を更新できる', () => {
            const mockConfigUpdated = jest.fn();
            jobDebugger.on('config_updated', mockConfigUpdated);

            jobDebugger.updateConfig({
                logLevel: LogLevel.ERROR,
                maxLogEntries: 50,
            });

            expect(mockConfigUpdated).toHaveBeenCalledWith(
                expect.objectContaining({
                    logLevel: LogLevel.ERROR,
                    maxLogEntries: 50,
                })
            );
        });

        test('デバッグモードを有効/無効化できる', () => {
            jobDebugger.setEnabled(false);
            jobDebugger.info('job', 'テストメッセージ');

            // 無効化されているのでログは記録されない
            expect(jobDebugger.getLogs()).toHaveLength(0);

            jobDebugger.setEnabled(true);
            jobDebugger.info('job', 'テストメッセージ2');

            // 有効化されたのでログが記録される
            expect(jobDebugger.getLogs()).toHaveLength(1); // テストログ
        });
    });

    describe('デバッグが無効な場合', () => {
        test('デバッグが無効な場合はログが記録されない', () => {
            const disabledDebugger = new JobSystemDebugger({
                enabled: false,
            });

            disabledDebugger.info('job', 'テストメッセージ');

            expect(disabledDebugger.getLogs()).toHaveLength(0);

            disabledDebugger.destroy();
        });

        test('デバッグが無効な場合はパフォーマンス測定が行われない', () => {
            const disabledDebugger = new JobSystemDebugger({
                enabled: false,
            });

            disabledDebugger.startPerformanceTracking('test_operation');
            const result = disabledDebugger.endPerformanceTracking('test_operation');

            expect(result).toBeNull();

            disabledDebugger.destroy();
        });
    });

    describe('イベント発行', () => {
        test('ログエントリ時にイベントが発行される', () => {
            const mockLogEntry = jest.fn();
            jobDebugger.on('log_entry', mockLogEntry);

            jobDebugger.info('job', 'テストメッセージ');

            expect(mockLogEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: LogLevel.INFO,
                    category: 'job',
                    message: 'テストメッセージ',
                })
            );
        });
    });
});