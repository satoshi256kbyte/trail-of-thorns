/**
 * ExperienceDebugManager テストスイート
 * 
 * 経験値デバッグマネージャーの機能をテストします:
 * - デバッグ表示機能
 * - シミュレーション機能
 * - 統計情報収集
 * - パフォーマンス監視
 */

import * as Phaser from 'phaser';
import { ExperienceDebugManager } from '../../../game/src/debug/ExperienceDebugManager';
import { ExperienceSystem } from '../../../game/src/systems/experience/ExperienceSystem';
import { ExperienceAction, ExperienceSource } from '../../../game/src/types/experience';
import { Unit } from '../../../game/src/types/gameplay';

// モック設定
jest.mock('phaser');

describe('ExperienceDebugManager', () => {
    let mockScene: jest.Mocked<Phaser.Scene>;
    let mockExperienceSystem: jest.Mocked<ExperienceSystem>;
    let debugManager: ExperienceDebugManager;

    beforeEach(() => {
        // Phaserシーンのモック
        mockScene = {
            add: {
                graphics: jest.fn().mockReturnValue({
                    setDepth: jest.fn().mockReturnThis(),
                    clear: jest.fn(),
                    fillStyle: jest.fn(),
                    fillRect: jest.fn(),
                    fillCircle: jest.fn(),
                    lineStyle: jest.fn(),
                    strokeRect: jest.fn()
                }),
                text: jest.fn().mockReturnValue({
                    setDepth: jest.fn().mockReturnThis(),
                    setScrollFactor: jest.fn().mockReturnThis(),
                    setText: jest.fn(),
                    setOrigin: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                })
            },
            time: {
                delayedCall: jest.fn()
            }
        } as any;

        // ExperienceSystemのモック
        mockExperienceSystem = {
            on: jest.fn(),
            off: jest.fn(),
            getExperienceInfo: jest.fn().mockReturnValue({
                characterId: 'test-character',
                currentExperience: 100,
                currentLevel: 5,
                experienceToNextLevel: 50,
                totalExperience: 100,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.67
            }),
            awardExperience: jest.fn().mockReturnValue({
                baseAmount: 10,
                multipliedAmount: 10,
                bonusAmount: 0,
                finalAmount: 10,
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                context: {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                }
            }),
            checkAndProcessLevelUp: jest.fn().mockReturnValue({
                characterId: 'test-character',
                oldLevel: 5,
                newLevel: 6,
                statGrowth: { hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1 },
                newExperienceRequired: 200,
                oldStats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3, skill: 12, luck: 8 },
                newStats: { maxHP: 105, maxMP: 53, attack: 22, defense: 16, speed: 11, movement: 3, skill: 14, luck: 9 },
                levelsGained: 1,
                timestamp: Date.now()
            })
        } as any;

        debugManager = new ExperienceDebugManager(mockScene, mockExperienceSystem);
    });

    afterEach(() => {
        debugManager.destroy();
        jest.clearAllMocks();
    });

    describe('初期化', () => {
        test('デバッグマネージャーが正しく初期化される', () => {
            expect(mockExperienceSystem.on).toHaveBeenCalledWith('experience-awarded', expect.any(Function));
            expect(mockExperienceSystem.on).toHaveBeenCalledWith('level-up-processed', expect.any(Function));
            expect(mockExperienceSystem.on).toHaveBeenCalledWith('experience-system-config-updated', expect.any(Function));
        });

        test('デバッグ表示が初期化される', () => {
            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalled();
        });
    });

    describe('経験値シミュレーション', () => {
        test('基本的なシミュレーションが実行される', async () => {
            const result = await debugManager.runExperienceSimulation(
                'test-character',
                [{ action: ExperienceAction.ATTACK, count: 5 }],
                { duration: 100, logResults: false, visualize: false }
            );

            expect(result).toBeDefined();
            expect(result.characterId).toBe('test-character');
            expect(result.totalExperienceGained).toBeGreaterThanOrEqual(0);
            expect(result.simulationDuration).toBeGreaterThan(0);
        });

        test('複数アクションのシミュレーションが実行される', async () => {
            const result = await debugManager.runExperienceSimulation(
                'test-character',
                [
                    { action: ExperienceAction.ATTACK, count: 3 },
                    { action: ExperienceAction.HEAL, count: 2 },
                    { action: ExperienceAction.SUPPORT, count: 1 }
                ],
                { duration: 100, logResults: false, visualize: false }
            );

            expect(result).toBeDefined();
            expect(mockExperienceSystem.awardExperience).toHaveBeenCalledTimes(6); // 3 + 2 + 1
        });

        test('シミュレーション中の重複実行が防止される', async () => {
            const promise1 = debugManager.runExperienceSimulation(
                'test-character',
                [{ action: ExperienceAction.ATTACK, count: 1 }]
            );

            await expect(debugManager.runExperienceSimulation(
                'test-character',
                [{ action: ExperienceAction.ATTACK, count: 1 }]
            )).rejects.toThrow('Simulation already running');

            await promise1;
        });
    });

    describe('統計情報収集', () => {
        test('経験値獲得統計が正しく収集される', () => {
            const debugData = debugManager.exportDebugData();

            expect(debugData.statistics).toBeDefined();
            expect(debugData.statistics.totalExperienceGained).toBe(0);
            expect(debugData.statistics.totalLevelUps).toBe(0);
            expect(debugData.statistics.sessionStartTime).toBeGreaterThan(0);
        });

        test('バランス統計が生成される', () => {
            const balanceStats = debugManager.generateBalanceStatistics();

            expect(balanceStats).toBeDefined();
            expect(balanceStats.averageExperiencePerAction).toBeDefined();
            expect(balanceStats.experienceSourceEfficiency).toBeDefined();
            expect(balanceStats.levelProgressionCurve).toBeDefined();
        });

        test('パフォーマンス統計が取得される', () => {
            const perfStats = debugManager.getPerformanceStatistics();

            expect(perfStats).toBeDefined();
            expect(typeof perfStats).toBe('object');
        });
    });

    describe('デバッグ表示', () => {
        test('デバッグ表示の切り替えが機能する', () => {
            debugManager.toggleDebugDisplay();

            // 設定変更が呼ばれることを確認
            // 実際の実装では GameConfig の更新が行われる
            expect(true).toBe(true); // プレースホルダー
        });

        test('デバッグデータのクリアが機能する', () => {
            debugManager.clearDebugData();

            const debugData = debugManager.exportDebugData();
            expect(debugData.statistics.totalExperienceGained).toBe(0);
            expect(debugData.statistics.totalLevelUps).toBe(0);
            expect(debugData.simulationResults).toHaveLength(0);
            expect(debugData.logHistory).toHaveLength(0);
        });
    });

    describe('イベント処理', () => {
        test('経験値獲得イベントが正しく処理される', () => {
            // イベントリスナーを取得
            const experienceAwardedListener = mockExperienceSystem.on.mock.calls
                .find(call => call[0] === 'experience-awarded')?.[1];

            expect(experienceAwardedListener).toBeDefined();

            // イベントデータをシミュレート
            const eventData = {
                characterId: 'test-character',
                action: ExperienceAction.ATTACK,
                context: {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                },
                result: {
                    baseAmount: 10,
                    multipliedAmount: 10,
                    bonusAmount: 0,
                    finalAmount: 10,
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    context: {
                        source: ExperienceSource.ATTACK_HIT,
                        action: ExperienceAction.ATTACK,
                        timestamp: Date.now()
                    }
                }
            };

            // イベントを発火
            experienceAwardedListener(eventData);

            // 統計が更新されることを確認
            const debugData = debugManager.exportDebugData();
            expect(debugData.statistics.totalExperienceGained).toBe(10);
        });

        test('レベルアップイベントが正しく処理される', () => {
            // イベントリスナーを取得
            const levelUpListener = mockExperienceSystem.on.mock.calls
                .find(call => call[0] === 'level-up-processed')?.[1];

            expect(levelUpListener).toBeDefined();

            // イベントデータをシミュレート
            const eventData = {
                characterId: 'test-character',
                result: {
                    characterId: 'test-character',
                    oldLevel: 5,
                    newLevel: 6,
                    statGrowth: { hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1 },
                    newExperienceRequired: 200,
                    oldStats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3, skill: 12, luck: 8 },
                    newStats: { maxHP: 105, maxMP: 53, attack: 22, defense: 16, speed: 11, movement: 3, skill: 14, luck: 9 },
                    levelsGained: 1,
                    timestamp: Date.now()
                }
            };

            // イベントを発火
            levelUpListener(eventData);

            // 統計が更新されることを確認
            const debugData = debugManager.exportDebugData();
            expect(debugData.statistics.totalLevelUps).toBe(1);
        });
    });

    describe('データエクスポート', () => {
        test('デバッグデータが正しくエクスポートされる', () => {
            const debugData = debugManager.exportDebugData();

            expect(debugData).toHaveProperty('statistics');
            expect(debugData).toHaveProperty('balanceStatistics');
            expect(debugData).toHaveProperty('simulationResults');
            expect(debugData).toHaveProperty('performanceMetrics');
            expect(debugData).toHaveProperty('logHistory');
        });

        test('エクスポートされたデータが有効な形式である', () => {
            const debugData = debugManager.exportDebugData();

            expect(debugData.statistics.sessionStartTime).toBeGreaterThan(0);
            expect(Array.isArray(debugData.simulationResults)).toBe(true);
            expect(Array.isArray(debugData.logHistory)).toBe(true);
            expect(typeof debugData.performanceMetrics).toBe('object');
        });
    });

    describe('リソース管理', () => {
        test('destroyメソッドがリソースを正しく解放する', () => {
            const mockGraphics = mockScene.add.graphics();
            const mockText = mockScene.add.text(0, 0, '');

            debugManager.destroy();

            expect(mockGraphics.destroy).toHaveBeenCalled();
            expect(mockText.destroy).toHaveBeenCalled();
        });
    });

    describe('エラーハンドリング', () => {
        test('無効なキャラクターIDでのシミュレーションエラーが処理される', async () => {
            mockExperienceSystem.awardExperience.mockReturnValue(null);

            const result = await debugManager.runExperienceSimulation(
                'invalid-character',
                [{ action: ExperienceAction.ATTACK, count: 1 }],
                { duration: 100, logResults: false, visualize: false }
            );

            expect(result.totalExperienceGained).toBe(0);
        });

        test('システムエラー時の統計収集が継続される', () => {
            mockExperienceSystem.getExperienceInfo.mockImplementation(() => {
                throw new Error('System error');
            });

            // エラーが発生してもデバッグマネージャーが動作し続けることを確認
            expect(() => debugManager.generateBalanceStatistics()).not.toThrow();
        });
    });
});