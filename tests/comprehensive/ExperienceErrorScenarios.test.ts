/**
 * ExperienceErrorScenarios - 経験値システムエラーシナリオテスト
 * 
 * このテストファイルは経験値システムで発生する可能性のある
 * 各種エラーシナリオと回復メカニズムを包括的にテストします:
 * - データ不正エラーの検出と回復
 * - キャラクター不存在エラーの処理
 * - システム初期化エラーの回復
 * - 永続化エラーの処理
 * - ユーザー通知とガイダンス表示
 * - 状態復旧とクリーンアップ処理
 * 
 * @version 1.0.0
 * @author Trail of Thorns Development Team
 */

import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import {
    ExperienceErrorHandler,
    ErrorRecoveryStrategy,
    ErrorSeverity,
    NotificationType,
    UserNotification
} from '../../game/src/systems/experience/ExperienceErrorHandler';
import {
    ExperienceError,
    ExperiencePersistenceError,
    ExperienceInfo,
    ExperienceTableData,
    GrowthRates,
    ExperienceAction,
    ExperienceSource,
    ExperienceContext
} from '../../game/src/types/experience';
import { Unit } from '../../game/src/types/gameplay';

// Mock utilities
const createMockScene = (): Phaser.Scene => {
    return {
        add: {
            container: jest.fn().mockReturnValue({
                setDepth: jest.fn().mockReturnThis(),
                setScrollFactor: jest.fn().mockReturnThis(),
                add: jest.fn(),
                setPosition: jest.fn(),
                setX: jest.fn(),
                setAlpha: jest.fn(),
                destroy: jest.fn()
            }),
            graphics: jest.fn().mockReturnValue({
                fillStyle: jest.fn().mockReturnThis(),
                lineStyle: jest.fn().mockReturnThis(),
                fillRoundedRect: jest.fn().mockReturnThis(),
                strokeRoundedRect: jest.fn().mockReturnThis(),
                setInteractive: jest.fn().mockReturnThis(),
                on: jest.fn().mockReturnThis(),
                clear: jest.fn().mockReturnThis()
            }),
            text: jest.fn().mockReturnValue({
                setOrigin: jest.fn().mockReturnThis(),
                height: 20
            })
        },
        cameras: {
            main: {
                width: 1920,
                height: 1080
            }
        },
        tweens: {
            add: jest.fn()
        },
        time: {
            delayedCall: jest.fn()
        },
        events: {
            emit: jest.fn()
        }
    } as any;
};

const createMockUnit = (overrides: Partial<Unit> = {}): Unit => {
    return {
        id: 'test-unit',
        name: 'Test Unit',
        level: 1,
        stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3
        },
        currentHP: 100,
        currentMP: 50,
        position: { x: 0, y: 0 },
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        ...overrides
    } as Unit;
};

describe('ExperienceErrorScenarios', () => {
    let errorHandler: ExperienceErrorHandler;
    let mockUnit: Unit;

    beforeEach(() => {
        errorHandler = new ExperienceErrorHandler();
        mockUnit = createMockUnit({ id: 'test-character', level: 5 });
    });

    describe('データ不正エラーの検出と回復', () => {
        test('無効な経験値テーブルデータの回復', async () => {
            // 無効な経験値テーブルデータを設定
            const invalidExperienceTable = {
                levelRequirements: [], // 空の配列
                experienceGains: {
                    attackHit: -5, // 負の値
                    enemyDefeat: 'invalid', // 文字列
                    allySupport: null, // null値
                    healing: undefined // undefined値
                },
                maxLevel: 0 // 無効な最大レベル
            } as any;

            // エラーハンドリングをテスト
            const recoveryResult = errorHandler.handleError(
                ExperienceError.EXPERIENCE_TABLE_INVALID,
                { operation: 'loadExperienceTable', details: invalidExperienceTable }
            );

            expect(recoveryResult.success).toBe(true);
            expect(recoveryResult.strategy).toBe(ErrorRecoveryStrategy.FALLBACK);
            expect(recoveryResult.recoveredData).toBeDefined();
            expect(recoveryResult.userNotification).toBeDefined();
            expect(recoveryResult.userNotification?.type).toBe(NotificationType.WARNING);
        });

        test('破損した成長率データの修復', () => {
            const corruptedGrowthRates = {
                hp: 'invalid',
                mp: -10,
                attack: 150, // 上限超過
                defense: null,
                speed: undefined,
                skill: NaN,
                luck: Infinity
            } as any;

            const recoveryResult = errorHandler.handleError(
                ExperienceError.GROWTH_RATE_INVALID,
                { operation: 'loadGrowthRates', details: corruptedGrowthRates }
            );

            expect(recoveryResult.success).toBe(true);
            expect(recoveryResult.strategy).toBe(ErrorRecoveryStrategy.FALLBACK);
            expect(recoveryResult.recoveredData).toBeDefined();

            // デフォルト成長率が適用されることを確認
            const defaultGrowthRates = recoveryResult.recoveredData as GrowthRates;
            expect(defaultGrowthRates.hp).toBeGreaterThan(0);
            expect(defaultGrowthRates.hp).toBeLessThanOrEqual(100);
            expect(defaultGrowthRates.attack).toBeGreaterThan(0);
            expect(defaultGrowthRates.attack).toBeLessThanOrEqual(100);
        });

        test('破損したキャラクター経験値データの修復', () => {
            const corruptedExperienceData = {
                characterId: '',
                currentExperience: -100,
                currentLevel: 0,
                experienceToNextLevel: 'invalid',
                totalExperience: null,
                canLevelUp: 'yes',
                isMaxLevel: 1,
                experienceProgress: 2.5
            };

            const repairedData = errorHandler.attemptDataRepair('test-character', corruptedExperienceData);

            expect(repairedData).toBeDefined();
            expect(repairedData!.characterId).toBe('test-character');
            expect(repairedData!.currentExperience).toBeGreaterThanOrEqual(0);
            expect(repairedData!.currentLevel).toBeGreaterThanOrEqual(1);
            expect(repairedData!.currentLevel).toBeLessThanOrEqual(99);
            expect(repairedData!.experienceProgress).toBeGreaterThanOrEqual(0);
            expect(repairedData!.experienceProgress).toBeLessThanOrEqual(1);
        });
    });

    describe('キャラクター不存在エラーの処理', () => {
        test('存在しないキャラクターへの経験値付与', () => {
            const recoveryResult = errorHandler.handleError(
                ExperienceError.INVALID_CHARACTER,
                { characterId: 'non-existent-character', operation: 'awardExperience' }
            );

            expect(recoveryResult.success).toBe(true);
            expect([ErrorRecoveryStrategy.RESTORE_BACKUP, ErrorRecoveryStrategy.SKIP]).toContain(recoveryResult.strategy);

            // エラー統計を確認
            const errorStats = errorHandler.getErrorStatistics();
            expect(errorStats.errorsByType.get(ExperienceError.INVALID_CHARACTER)).toBeGreaterThan(0);
        });

        test('存在しないキャラクターの経験値情報取得', () => {
            const recoveryResult = errorHandler.handleError(
                ExperienceError.INVALID_CHARACTER,
                { characterId: 'non-existent-character', operation: 'getExperienceInfo' }
            );

            expect(recoveryResult.success).toBe(true);

            // エラー統計を確認
            const errorStats = errorHandler.getErrorStatistics();
            expect(errorStats.errorsByType.get(ExperienceError.INVALID_CHARACTER)).toBeGreaterThan(0);
        });

        test('バックアップからのキャラクターデータ復元', () => {
            const originalExperienceInfo: ExperienceInfo = {
                characterId: 'test-character',
                currentExperience: 150,
                currentLevel: 5,
                experienceToNextLevel: 50,
                totalExperience: 150,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            };

            // バックアップを保存
            errorHandler.saveBackup('test-character', originalExperienceInfo);

            // バックアップから復元
            const restoredData = errorHandler.restoreFromBackup('test-character');

            expect(restoredData).toBeDefined();
            expect(restoredData!.characterId).toBe('test-character');
            expect(restoredData!.currentExperience).toBe(150);
            expect(restoredData!.currentLevel).toBe(5);
        });
    });

    describe('システム初期化エラーの回復', () => {
        test('初期化前の操作エラー処理', () => {
            const recoveryResult = errorHandler.handleError(
                ExperienceError.SYSTEM_NOT_INITIALIZED,
                { operation: 'awardExperience', characterId: 'test-character' }
            );

            expect(recoveryResult.success).toBe(true);
            expect([ErrorRecoveryStrategy.RETRY, ErrorRecoveryStrategy.SYSTEM_SHUTDOWN]).toContain(recoveryResult.strategy);
        });

        test('システム回復の実行', () => {
            const recoveryResult = errorHandler.handleError(
                ExperienceError.SYSTEM_NOT_INITIALIZED,
                { operation: 'systemRecovery' }
            );

            expect(recoveryResult.success).toBe(true);
            expect(recoveryResult.strategy).toBe(ErrorRecoveryStrategy.RETRY);
        });

        test('回復不可能なシステムエラー', async () => {
            // 致命的なエラーをシミュレート
            const recoveryResult = errorHandler.handleError(
                ExperienceError.SYSTEM_NOT_INITIALIZED,
                { operation: 'criticalFailure', details: 'Unrecoverable system error' }
            );

            // 複数回の再試行後にシステム停止戦略が選択されることを確認
            for (let i = 0; i < 5; i++) {
                errorHandler.handleError(
                    ExperienceError.SYSTEM_NOT_INITIALIZED,
                    { operation: 'criticalFailure', details: 'Repeated failure' }
                );
            }

            const finalRecoveryResult = errorHandler.handleError(
                ExperienceError.SYSTEM_NOT_INITIALIZED,
                { operation: 'criticalFailure', details: 'Final attempt' }
            );

            expect(finalRecoveryResult.strategy).toBe(ErrorRecoveryStrategy.SYSTEM_SHUTDOWN);
            expect(finalRecoveryResult.canContinue).toBe(false);
        });
    });

    describe('永続化エラーの処理', () => {
        test('セーブデータ保存エラーの処理', () => {
            const recoveryResult = errorHandler.handleError(
                ExperienceError.PERSISTENCE_ERROR,
                { operation: 'saveExperienceData', details: 'Storage quota exceeded' }
            );

            expect(recoveryResult.success).toBe(true);
            expect([ErrorRecoveryStrategy.RETRY, ErrorRecoveryStrategy.SKIP]).toContain(recoveryResult.strategy);
        });

        test('セーブデータ読み込みエラーの処理', () => {
            const recoveryResult = errorHandler.handleError(
                ExperienceError.PERSISTENCE_ERROR,
                { operation: 'loadExperienceData', details: 'Corrupted save data' }
            );

            expect(recoveryResult.success).toBe(true);
            expect(recoveryResult.userNotification).toBeDefined();
        });
    });

    describe('ユーザー通知とガイダンス表示', () => {
        test('エラー通知の生成', () => {
            const recoveryResult = errorHandler.handleError(
                ExperienceError.LEVEL_UP_FAILED,
                { characterId: 'test-character', operation: 'processLevelUp' }
            );

            expect(recoveryResult.userNotification).toBeDefined();
            expect(recoveryResult.userNotification!.type).toBe(NotificationType.WARNING);
            expect(recoveryResult.userNotification!.title).toBeTruthy();
            expect(recoveryResult.userNotification!.message).toBeTruthy();
        });

        test('重要度別通知の分類', () => {
            // 軽微なエラー
            const lowSeverityResult = errorHandler.handleError(
                ExperienceError.MAX_LEVEL_REACHED,
                { characterId: 'test-character' }
            );

            expect(lowSeverityResult.userNotification?.type).toBe(NotificationType.INFO);

            // 重要なエラー
            const highSeverityResult = errorHandler.handleError(
                ExperienceError.LEVEL_UP_FAILED,
                { characterId: 'test-character' }
            );

            expect(highSeverityResult.userNotification?.type).toBe(NotificationType.WARNING);

            // 致命的なエラー
            const criticalSeverityResult = errorHandler.handleError(
                ExperienceError.SYSTEM_NOT_INITIALIZED,
                { operation: 'critical' }
            );

            expect(criticalSeverityResult.userNotification?.type).toBe(NotificationType.ERROR);
        });

        test('推奨アクション付き通知', () => {
            const recoveryResult = errorHandler.handleError(
                ExperienceError.SYSTEM_NOT_INITIALIZED,
                { operation: 'userIntervention' }
            );

            if (recoveryResult.strategy === ErrorRecoveryStrategy.USER_INTERVENTION) {
                expect(recoveryResult.userNotification?.actionRequired).toBe(true);
                expect(recoveryResult.userNotification?.suggestedActions).toBeDefined();
                expect(recoveryResult.userNotification?.suggestedActions!.length).toBeGreaterThan(0);
            }
        });
    });

    describe('状態復旧とクリーンアップ処理', () => {
        test('キャラクター固有の状態クリーンアップ', () => {
            // エラー状態を作成
            errorHandler.handleError(
                ExperienceError.INVALID_CHARACTER,
                { characterId: 'test-character', operation: 'test' }
            );

            // クリーンアップを実行
            errorHandler.cleanupSystemState('test-character');

            // 状態がクリーンアップされたことを確認
            const errorStats = errorHandler.getErrorStatistics();
            expect(errorStats).toBeDefined();
        });

        test('全体的な状態クリーンアップ', () => {
            // 複数のエラー状態を作成
            errorHandler.handleError(
                ExperienceError.INVALID_CHARACTER,
                { characterId: 'character1', operation: 'test' }
            );
            errorHandler.handleError(
                ExperienceError.LEVEL_UP_FAILED,
                { characterId: 'character2', operation: 'test' }
            );

            // 全体クリーンアップを実行
            errorHandler.cleanupSystemState();

            // 状態がクリーンアップされたことを確認
            const errorStats = errorHandler.getErrorStatistics();
            expect(errorStats).toBeDefined();
        });

        test('バックアップデータの管理', () => {
            const experienceInfo: ExperienceInfo = {
                characterId: 'test-character',
                currentExperience: 100,
                currentLevel: 3,
                experienceToNextLevel: 150,
                totalExperience: 100,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.4
            };

            // 複数のバックアップを保存
            for (let i = 0; i < 10; i++) {
                const modifiedInfo = { ...experienceInfo, currentExperience: 100 + i * 10 };
                errorHandler.saveBackup('test-character', modifiedInfo);
            }

            // 最新のバックアップを復元
            const restoredData = errorHandler.restoreFromBackup('test-character');

            expect(restoredData).toBeDefined();
            expect(restoredData!.currentExperience).toBe(190); // 最後に保存された値
        });
    });

    describe('エラー統計と監視', () => {
        test('エラー統計の収集', () => {
            // 複数のエラーを発生させる
            errorHandler.handleError(ExperienceError.INVALID_CHARACTER, { characterId: 'char1' });
            errorHandler.handleError(ExperienceError.INVALID_CHARACTER, { characterId: 'char2' });
            errorHandler.handleError(ExperienceError.LEVEL_UP_FAILED, { characterId: 'char3' });

            const errorStats = errorHandler.getErrorStatistics();

            expect(errorStats.totalErrors).toBe(3);
            expect(errorStats.errorsByType.get(ExperienceError.INVALID_CHARACTER)).toBe(2);
            expect(errorStats.errorsByType.get(ExperienceError.LEVEL_UP_FAILED)).toBe(1);
            expect(errorStats.frequentErrors.length).toBeGreaterThan(0);
        });

        test('頻出エラーの追跡', () => {
            // 同じエラーを複数回発生させる
            for (let i = 0; i < 5; i++) {
                errorHandler.handleError(ExperienceError.INVALID_CHARACTER, { characterId: `char${i}` });
            }

            const errorStats = errorHandler.getErrorStatistics();
            const mostFrequentError = errorStats.frequentErrors[0];

            expect(mostFrequentError.error).toBe(ExperienceError.INVALID_CHARACTER);
            expect(mostFrequentError.count).toBe(5);
        });

        test('回復成功率の計算', () => {
            // 成功する回復
            errorHandler.handleError(ExperienceError.INVALID_EXPERIENCE_AMOUNT, {});

            // 失敗する回復（システム停止）
            for (let i = 0; i < 5; i++) {
                errorHandler.handleError(ExperienceError.SYSTEM_NOT_INITIALIZED, { operation: 'critical' });
            }

            const errorStats = errorHandler.getErrorStatistics();
            expect(errorStats.totalErrors).toBeGreaterThan(0);
        });
    });

    describe('回復戦略の選択', () => {
        test('再試行戦略の制限', () => {
            const errorContext = { operation: 'retryTest', characterId: 'test-char' };

            // 最大再試行回数まで再試行戦略が選択される
            for (let i = 0; i < 3; i++) {
                const result = errorHandler.handleError(ExperienceError.PERSISTENCE_ERROR, errorContext);
                if (i < 2) {
                    expect(result.strategy).toBe(ErrorRecoveryStrategy.RETRY);
                } else {
                    expect(result.strategy).not.toBe(ErrorRecoveryStrategy.RETRY);
                }
            }
        });

        test('エラー種別による戦略選択', () => {
            // 最大レベル到達エラーはスキップ戦略
            const maxLevelResult = errorHandler.handleError(
                ExperienceError.MAX_LEVEL_REACHED,
                { characterId: 'test-char' }
            );
            expect(maxLevelResult.strategy).toBe(ErrorRecoveryStrategy.SKIP);

            // 無効な経験値量はフォールバック戦略
            const invalidAmountResult = errorHandler.handleError(
                ExperienceError.INVALID_EXPERIENCE_AMOUNT,
                { characterId: 'test-char' }
            );
            expect(invalidAmountResult.strategy).toBe(ErrorRecoveryStrategy.FALLBACK);
        });

        test('回復オプションによる戦略変更', () => {
            // バックアップ使用を無効にする
            errorHandler.setRecoveryOptions({ useBackup: false });

            const result = errorHandler.handleError(
                ExperienceError.INVALID_CHARACTER,
                { characterId: 'test-char' }
            );

            expect(result.strategy).toBe(ErrorRecoveryStrategy.SKIP);

            // バックアップ使用を有効にする
            errorHandler.setRecoveryOptions({ useBackup: true });

            const resultWithBackup = errorHandler.handleError(
                ExperienceError.INVALID_CHARACTER,
                { characterId: 'test-char' }
            );

            expect(resultWithBackup.strategy).toBe(ErrorRecoveryStrategy.RESTORE_BACKUP);
        });
    });

    describe('統合エラーシナリオ', () => {
        test('複合エラーの処理', async () => {
            // システム初期化エラー + データ破損エラー
            const system = new ExperienceSystem(mockScene);

            // 初期化を失敗させる
            const initResult = await system.initialize('invalid-path');
            expect(initResult).toBe(false);

            // 破損データでキャラクター修復を試行
            const repairResult = system.repairCharacterData('test-char', { invalid: 'data' });

            // システム回復を試行
            const recoveryResult = await system.attemptSystemRecovery();
            expect(recoveryResult).toBe(true);
        });

        test('エラー連鎖の処理', () => {
            // 初期エラー
            errorHandler.handleError(
                ExperienceError.SYSTEM_NOT_INITIALIZED,
                { operation: 'initial' }
            );

            // 連鎖エラー
            errorHandler.handleError(
                ExperienceError.INVALID_CHARACTER,
                { characterId: 'test-char', operation: 'cascading' }
            );

            // データ破損エラー
            errorHandler.handleError(
                ExperienceError.PERSISTENCE_ERROR,
                { operation: 'data-corruption' }
            );

            const errorStats = errorHandler.getErrorStatistics();
            expect(errorStats.totalErrors).toBe(3);
            expect(errorStats.frequentErrors.length).toBeGreaterThan(0);
        });

        test('長時間実行でのエラー処理', () => {
            // 長時間実行をシミュレート
            const startTime = Date.now();

            for (let i = 0; i < 100; i++) {
                const errorType = i % 2 === 0 ?
                    ExperienceError.INVALID_CHARACTER :
                    ExperienceError.LEVEL_UP_FAILED;

                errorHandler.handleError(errorType, {
                    characterId: `char${i}`,
                    operation: 'long-running-test',
                    timestamp: startTime + i * 1000
                });
            }

            const errorStats = errorHandler.getErrorStatistics();
            expect(errorStats.totalErrors).toBe(100);
            expect(errorStats.lastErrorTime).toBeGreaterThan(startTime);
        });
    });
});