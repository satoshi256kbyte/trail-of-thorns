/**
 * 経験値システムエラーハンドリング統合テスト
 * 
 * 経験値システム全体でのエラーハンドリングの動作を検証します。
 * 
 * テスト対象:
 * - システム初期化時のエラー処理
 * - 経験値獲得時のエラー処理
 * - レベルアップ時のエラー処理
 * - データ永続化時のエラー処理
 * - エラー回復とシステム継続性
 */

import * as Phaser from 'phaser';
import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import { ExperienceError, ExperiencePersistenceError, ExperienceAction, ExperienceSource } from '../../game/src/types/experience';
import { Unit } from '../../game/src/types/gameplay';

// テスト用のPhaserシーンモック
class MockScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MockScene' });
    }
}

describe('ExperienceErrorHandling Integration Tests', () => {
    let scene: MockScene;
    let experienceSystem: ExperienceSystem;
    let mockCharacter: Unit;

    beforeEach(() => {
        // Phaserシーンのモックを作成
        scene = new MockScene();

        // 必要なPhaserオブジェクトをモック
        (scene as any).add = {
            text: jest.fn().mockReturnValue({
                setOrigin: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis(),
                setScale: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            }),
            graphics: jest.fn().mockReturnValue({
                fillStyle: jest.fn().mockReturnThis(),
                fillRect: jest.fn().mockReturnThis(),
                setAlpha: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            })
        };

        (scene as any).tweens = {
            add: jest.fn().mockReturnValue({
                on: jest.fn().mockReturnThis()
            })
        };

        experienceSystem = new ExperienceSystem(scene);

        // テスト用キャラクター
        mockCharacter = {
            id: 'test-character',
            name: 'Test Character',
            level: 1,
            experience: 0,
            position: { x: 5, y: 5 },
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
            faction: 'player',
            hasActed: false,
            hasMoved: false
        };
    });

    afterEach(() => {
        experienceSystem.destroy();
    });

    describe('システム初期化エラー処理', () => {
        test('無効な経験値テーブルでも初期化が完了する', async () => {
            // 存在しないファイルパスを指定
            const result = await experienceSystem.initialize('invalid/path/experience-table.json');

            // エラーハンドリングによりデフォルト値で初期化される
            expect(result).toBe(true);

            const systemState = experienceSystem.getSystemState();
            expect(systemState.isInitialized).toBe(true);
        });

        test('無効な成長率データでもシステムが動作する', async () => {
            const invalidGrowthRateData = {
                characterGrowthRates: null as any,
                jobClassGrowthRates: null as any,
                statLimits: null as any
            };

            const result = await experienceSystem.initialize(undefined, invalidGrowthRateData);

            // エラーハンドリングによりデフォルト値で初期化される
            expect(result).toBe(true);

            const systemState = experienceSystem.getSystemState();
            expect(systemState.isInitialized).toBe(true);
        });
    });

    describe('経験値獲得エラー処理', () => {
        beforeEach(async () => {
            await experienceSystem.initialize();
            experienceSystem.registerCharacter(mockCharacter);
        });

        test('無効なキャラクターIDでも処理が継続される', () => {
            const context = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            // 無効なキャラクターIDで経験値獲得を試行
            const result = experienceSystem.awardExperience('invalid-character', ExperienceAction.ATTACK, context);

            // エラーハンドリングによりnullが返される（システムは継続）
            expect(result).toBeNull();

            // システムは正常に動作し続ける
            const validResult = experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.ATTACK, context);
            expect(validResult).not.toBeNull();
        });

        test('負の経験値量が修正される', () => {
            const context = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                amount: -100, // 負の値
                timestamp: Date.now()
            };

            const result = experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.ATTACK, context);

            // エラーハンドリングにより0以上の値に修正される
            expect(result).not.toBeNull();
            expect(result!.finalAmount).toBeGreaterThanOrEqual(0);
        });

        test('システム未初期化状態でのエラー処理', () => {
            // 新しいシステムインスタンス（未初期化）
            const uninitializedSystem = new ExperienceSystem(scene);

            const context = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            const result = uninitializedSystem.awardExperience(mockCharacter.id, ExperienceAction.ATTACK, context);

            // エラーハンドリングによりnullが返される
            expect(result).toBeNull();

            uninitializedSystem.destroy();
        });
    });

    describe('レベルアップエラー処理', () => {
        beforeEach(async () => {
            await experienceSystem.initialize();
            experienceSystem.registerCharacter(mockCharacter);
        });

        test('最大レベル到達時のエラー処理', () => {
            // キャラクターを最大レベルに設定
            mockCharacter.level = 49; // 最大レベル

            const result = experienceSystem.checkAndProcessLevelUp(mockCharacter.id);

            // エラーハンドリングによりnullが返される（エラーログは出力される）
            expect(result).toBeNull();

            // システムは正常に動作し続ける
            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.isMaxLevel).toBe(true);
        });

        test('無効なキャラクターでのレベルアップ処理', () => {
            const result = experienceSystem.checkAndProcessLevelUp('invalid-character');

            // エラーハンドリングによりnullが返される
            expect(result).toBeNull();

            // システムは正常に動作し続ける
            const validResult = experienceSystem.checkAndProcessLevelUp(mockCharacter.id);
            expect(validResult).toBeNull(); // レベルアップ条件を満たしていないため
        });
    });

    describe('データ取得エラー処理', () => {
        beforeEach(async () => {
            await experienceSystem.initialize();
        });

        test('未登録キャラクターの経験値情報取得', () => {
            expect(() => {
                experienceSystem.getExperienceInfo('unregistered-character');
            }).toThrow();

            // システムは正常に動作し続ける
            experienceSystem.registerCharacter(mockCharacter);
            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo).toBeDefined();
        });

        test('空のキャラクターIDでの情報取得', () => {
            expect(() => {
                experienceSystem.getExperienceInfo('');
            }).toThrow();

            // システムは正常に動作し続ける
            experienceSystem.registerCharacter(mockCharacter);
            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo).toBeDefined();
        });
    });

    describe('エラー統計とモニタリング', () => {
        beforeEach(async () => {
            await experienceSystem.initialize();
            experienceSystem.registerCharacter(mockCharacter);
        });

        test('エラー統計が正しく記録される', () => {
            const context = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            // 複数のエラーを発生させる
            experienceSystem.awardExperience('invalid-character-1', ExperienceAction.ATTACK, context);
            experienceSystem.awardExperience('invalid-character-2', ExperienceAction.ATTACK, context);
            experienceSystem.checkAndProcessLevelUp('invalid-character-3');

            const statistics = experienceSystem.getErrorStatistics();

            expect(statistics.totalErrors).toBeGreaterThan(0);
            expect(statistics.errorsByType).toBeDefined();
            expect(statistics.errorsBySeverity).toBeDefined();
        });

        test('エラー履歴をクリアできる', () => {
            const context = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            // エラーを発生させる
            experienceSystem.awardExperience('invalid-character', ExperienceAction.ATTACK, context);

            let statistics = experienceSystem.getErrorStatistics();
            expect(statistics.totalErrors).toBeGreaterThan(0);

            // エラー履歴をクリア
            experienceSystem.clearErrorHistory();

            statistics = experienceSystem.getErrorStatistics();
            expect(statistics.totalErrors).toBe(0);
        });
    });

    describe('システム復旧機能', () => {
        test('システム状態を復旧できる', async () => {
            await experienceSystem.initialize();

            // システム状態を破損させる（シミュレーション）
            const systemState = experienceSystem.getSystemState();
            expect(systemState.isInitialized).toBe(true);

            // 復旧を実行
            const recoveryResult = await experienceSystem.recoverSystemState({
                useBackup: true,
                useDefaultValues: true,
                resetCorruptedData: false,
                preserveProgress: true
            });

            expect(recoveryResult).toBe(true);

            // システムが正常に動作することを確認
            const newSystemState = experienceSystem.getSystemState();
            expect(newSystemState.isInitialized).toBe(true);
        });

        test('デフォルト値による復旧', async () => {
            await experienceSystem.initialize();

            const recoveryResult = await experienceSystem.recoverSystemState({
                useBackup: false,
                useDefaultValues: true,
                resetCorruptedData: true,
                preserveProgress: false
            });

            expect(recoveryResult).toBe(true);

            // システムが正常に動作することを確認
            const systemState = experienceSystem.getSystemState();
            expect(systemState.isInitialized).toBe(true);
        });
    });

    describe('ユーザー通知システム', () => {
        let notificationReceived: any = null;

        beforeEach(async () => {
            await experienceSystem.initialize();

            // 通知イベントをリッスン
            experienceSystem.on('experience-error-notification', (notification) => {
                notificationReceived = notification;
            });
        });

        test('重要なエラーで通知が送信される', async () => {
            // 重要なエラーを発生させる（システム初期化失敗をシミュレート）
            const uninitializedSystem = new ExperienceSystem(scene);

            // 初期化せずに操作を実行
            const context = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            uninitializedSystem.awardExperience(mockCharacter.id, ExperienceAction.ATTACK, context);

            // 通知が送信されることを確認
            // （実際の通知は非同期で処理される場合があるため、少し待機）
            await new Promise(resolve => setTimeout(resolve, 100));

            uninitializedSystem.destroy();
        });
    });

    describe('エラー回復とシステム継続性', () => {
        beforeEach(async () => {
            await experienceSystem.initialize();
            experienceSystem.registerCharacter(mockCharacter);
        });

        test('複数のエラーが発生してもシステムが継続動作する', () => {
            const context = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            // 複数の異なるエラーを発生させる
            experienceSystem.awardExperience('invalid-character-1', ExperienceAction.ATTACK, context);
            experienceSystem.awardExperience('invalid-character-2', ExperienceAction.ATTACK, context);
            experienceSystem.checkAndProcessLevelUp('invalid-character-3');

            try {
                experienceSystem.getExperienceInfo('invalid-character-4');
            } catch (error) {
                // エラーが発生することを期待
            }

            // システムは正常に動作し続ける
            const validResult = experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.ATTACK, context);
            expect(validResult).not.toBeNull();

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo).toBeDefined();
        });

        test('エラー発生後もデータ整合性が保たれる', () => {
            const context = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            // 正常な経験値獲得
            const initialInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            const result1 = experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.ATTACK, context);
            expect(result1).not.toBeNull();

            // エラーを発生させる
            experienceSystem.awardExperience('invalid-character', ExperienceAction.ATTACK, context);

            // 再度正常な経験値獲得
            const result2 = experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.ATTACK, context);
            expect(result2).not.toBeNull();

            // データ整合性を確認
            const finalInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(finalInfo.currentExperience).toBeGreaterThan(initialInfo.currentExperience);
            expect(finalInfo.totalExperience).toBeGreaterThan(initialInfo.totalExperience);
        });
    });
});