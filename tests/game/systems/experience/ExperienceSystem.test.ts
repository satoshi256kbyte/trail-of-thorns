/**
 * ExperienceSystem統合テスト
 * 経験値システム全体の統合テストと状態管理テスト
 */

import { ExperienceSystem } from '../../../../game/src/systems/experience/ExperienceSystem';
import {
    ExperienceAction,
    ExperienceSource,
    ExperienceContext,
    GrowthRateData,
    ExperienceTableData,
    BattleContext
} from '../../../../game/src/types/experience';
import { Unit } from '../../../../game/src/types/gameplay';

// Phaserのモック
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            add: jest.fn().mockReturnThis(),
            removeAll: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            fillCircle: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRect: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis()
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setText: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            setBackgroundColor: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis()
        })
    },
    cameras: {
        main: {
            width: 800,
            height: 600
        }
    },
    tweens: {
        add: jest.fn()
    },
    time: {
        delayedCall: jest.fn()
    }
} as any;

// fetchのモック
global.fetch = jest.fn();

describe('ExperienceSystem', () => {
    let experienceSystem: ExperienceSystem;
    let mockCharacter: Unit;
    let mockGrowthRateData: GrowthRateData;
    let mockExperienceTableData: ExperienceTableData;

    beforeEach(() => {
        jest.clearAllMocks();

        experienceSystem = new ExperienceSystem(mockScene);

        mockCharacter = {
            id: 'test-character',
            name: 'Test Character',
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

        mockGrowthRateData = {
            characterGrowthRates: {
                'test-character': {
                    hp: 60,
                    mp: 40,
                    attack: 50,
                    defense: 45,
                    speed: 35,
                    skill: 55,
                    luck: 30
                }
            },
            jobClassGrowthRates: {
                warrior: {
                    hp: 70,
                    mp: 20,
                    attack: 60,
                    defense: 55,
                    speed: 30,
                    skill: 40,
                    luck: 25
                }
            },
            statLimits: {
                maxHP: 999,
                maxMP: 999,
                attack: 99,
                defense: 99,
                speed: 99,
                skill: 99,
                luck: 99
            }
        };

        mockExperienceTableData = {
            levelRequirements: [0, 50, 100, 200, 350, 550],
            experienceGains: {
                attackHit: 5,
                enemyDefeat: 25,
                allySupport: 10,
                healing: 8
            },
            maxLevel: 5
        };

        // fetchのモック設定
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue(mockExperienceTableData)
        });
    });

    afterEach(() => {
        experienceSystem.destroy();
    });

    describe('システム初期化', () => {
        test('正常に初期化される', async () => {
            const result = await experienceSystem.initialize(
                'test-experience-table.json',
                mockGrowthRateData
            );

            expect(result).toBe(true);

            const systemState = experienceSystem.getSystemState();
            expect(systemState.isInitialized).toBe(true);
            expect(systemState.experienceTableLoaded).toBe(true);
            expect(systemState.growthRatesLoaded).toBe(true);
        });

        test('経験値テーブルファイルが見つからない場合はデフォルト値を使用', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false
            });

            const result = await experienceSystem.initialize();

            expect(result).toBe(true);

            const systemState = experienceSystem.getSystemState();
            expect(systemState.isInitialized).toBe(true);
        });

        test('成長率データが提供されない場合はデフォルト値を使用', async () => {
            const result = await experienceSystem.initialize();

            expect(result).toBe(true);

            const systemState = experienceSystem.getSystemState();
            expect(systemState.growthRatesLoaded).toBe(true);
        });

        test('初期化エラー時は適切に処理される', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await experienceSystem.initialize();

            expect(result).toBe(true); // デフォルト値で初期化されるため成功
        });
    });

    describe('キャラクター登録・削除', () => {
        beforeEach(async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);
        });

        test('キャラクターを正常に登録できる', () => {
            experienceSystem.registerCharacter(mockCharacter, 1, 0);

            const systemState = experienceSystem.getSystemState();
            expect(systemState.activeCharacters.has(mockCharacter.id)).toBe(true);

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.characterId).toBe(mockCharacter.id);
            expect(experienceInfo.currentLevel).toBe(1);
        });

        test('初期レベルと経験値を指定して登録できる', () => {
            experienceSystem.registerCharacter(mockCharacter, 3, 300);

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.currentLevel).toBe(3);
            expect(experienceInfo.currentExperience).toBe(300);
        });

        test('キャラクターを正常に削除できる', () => {
            experienceSystem.registerCharacter(mockCharacter);

            const removed = experienceSystem.unregisterCharacter(mockCharacter.id);

            expect(removed).toBe(true);

            const systemState = experienceSystem.getSystemState();
            expect(systemState.activeCharacters.has(mockCharacter.id)).toBe(false);
        });

        test('存在しないキャラクターの削除は失敗する', () => {
            const removed = experienceSystem.unregisterCharacter('non-existent');

            expect(removed).toBe(false);
        });
    });

    describe('経験値獲得処理', () => {
        beforeEach(async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);
            experienceSystem.registerCharacter(mockCharacter, 1, 0);
        });

        test('攻撃命中で経験値を獲得できる', () => {
            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            const result = experienceSystem.awardExperience(
                mockCharacter.id,
                ExperienceAction.ATTACK,
                context
            );

            expect(result).not.toBeNull();
            expect(result!.finalAmount).toBe(5); // attackHit の基本値

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.currentExperience).toBe(5);
        });

        test('敵撃破で経験値を獲得できる', () => {
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                timestamp: Date.now()
            };

            const result = experienceSystem.awardExperience(
                mockCharacter.id,
                ExperienceAction.DEFEAT,
                context
            );

            expect(result).not.toBeNull();
            expect(result!.finalAmount).toBe(25); // enemyDefeat の基本値

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.currentExperience).toBe(25);
        });

        test('経験値倍率が適用される', () => {
            experienceSystem.setExperienceMultiplier(2.0);

            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                multiplier: 2.0,
                timestamp: Date.now()
            };

            const result = experienceSystem.awardExperience(
                mockCharacter.id,
                ExperienceAction.ATTACK,
                context
            );

            expect(result).not.toBeNull();
            expect(result!.finalAmount).toBe(10); // 5 * 2.0

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.currentExperience).toBe(10);
        });

        test('ボーナス経験値が加算される', () => {
            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                bonusAmount: 15,
                timestamp: Date.now()
            };

            const result = experienceSystem.awardExperience(
                mockCharacter.id,
                ExperienceAction.ATTACK,
                context
            );

            expect(result).not.toBeNull();
            expect(result!.finalAmount).toBe(20); // 5 + 15

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.currentExperience).toBe(20);
        });

        test('未登録キャラクターへの経験値付与は失敗する', () => {
            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            const result = experienceSystem.awardExperience(
                'unregistered-character',
                ExperienceAction.ATTACK,
                context
            );

            expect(result).toBeNull();
        });
    });

    describe('レベルアップ処理', () => {
        beforeEach(async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);

            // テスト用の経験値テーブルを直接設定
            const experienceDataLoader = (experienceSystem as any).experienceDataLoader;
            experienceDataLoader.setExperienceTableForTesting(mockExperienceTableData);



            experienceSystem.registerCharacter(mockCharacter, 1, 0);
        });

        test('十分な経験値でレベルアップが発生する', () => {
            // レベル2に必要な経験値（100）を付与
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                timestamp: Date.now()
            };

            // 100経験値を獲得（25 * 4回）
            for (let i = 0; i < 4; i++) {
                experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.DEFEAT, context);
            }



            const levelUpResult = experienceSystem.checkAndProcessLevelUp(mockCharacter.id);

            expect(levelUpResult).not.toBeNull();
            expect(levelUpResult!.oldLevel).toBe(1);
            expect(levelUpResult!.newLevel).toBe(2);

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.currentLevel).toBe(2);
        });

        test('経験値不足時はレベルアップしない', () => {
            // 50経験値のみ獲得
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.DEFEAT, context);
            experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.DEFEAT, context);

            const levelUpResult = experienceSystem.checkAndProcessLevelUp(mockCharacter.id);

            expect(levelUpResult).toBeNull();

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.currentLevel).toBe(1);
        });

        test('複数レベルアップが正常に処理される', () => {
            // レベル3に必要な経験値（250）を一度に付与
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                bonusAmount: 225, // 25 + 225 = 250
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.DEFEAT, context);

            // レベルアップを複数回実行
            let levelUpResult = experienceSystem.checkAndProcessLevelUp(mockCharacter.id);
            expect(levelUpResult).not.toBeNull();
            expect(levelUpResult!.newLevel).toBe(2);

            levelUpResult = experienceSystem.checkAndProcessLevelUp(mockCharacter.id);
            expect(levelUpResult).not.toBeNull();
            expect(levelUpResult!.newLevel).toBe(3);

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.currentLevel).toBe(3);
        });
    });

    describe('戦闘中経験値処理', () => {
        beforeEach(async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);
            experienceSystem.registerCharacter(mockCharacter, 1, 0);
        });

        test('戦闘中の経験値獲得が正常に処理される', () => {
            const battleContext: BattleContext = {
                battleId: 'test-battle',
                turnNumber: 1,
                attackerId: mockCharacter.id,
                defenderId: 'enemy-1',
                damageDealt: 30
            };

            experienceSystem.handleBattleExperience(
                mockCharacter.id,
                ExperienceAction.ATTACK,
                battleContext
            );

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.currentExperience).toBe(5); // attackHit の基本値
        });

        test('戦闘中レベルアップが即座に適用される', () => {
            // 事前に99経験値を付与
            const preContext: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                bonusAmount: 74, // 25 + 74 = 99
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.DEFEAT, preContext);

            // 戦闘中に1経験値を獲得してレベルアップ
            const battleContext: BattleContext = {
                battleId: 'test-battle',
                turnNumber: 1,
                attackerId: mockCharacter.id,
                defenderId: 'enemy-1'
            };

            experienceSystem.handleBattleExperience(
                mockCharacter.id,
                ExperienceAction.ATTACK,
                battleContext
            );

            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);
            expect(experienceInfo.currentLevel).toBe(2);
        });
    });

    describe('経験値情報取得', () => {
        beforeEach(async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);
            experienceSystem.registerCharacter(mockCharacter, 2, 150);
        });

        test('正確な経験値情報を取得できる', () => {
            const experienceInfo = experienceSystem.getExperienceInfo(mockCharacter.id);

            expect(experienceInfo.characterId).toBe(mockCharacter.id);
            expect(experienceInfo.currentLevel).toBe(2);
            expect(experienceInfo.currentExperience).toBe(150);
            expect(experienceInfo.experienceToNextLevel).toBe(100); // 250 - 150
            expect(experienceInfo.canLevelUp).toBe(false);
            expect(experienceInfo.isMaxLevel).toBe(false);
            expect(experienceInfo.experienceProgress).toBeGreaterThan(0);
        });

        test('最大レベル到達時の情報が正確', () => {
            experienceSystem.registerCharacter(
                { ...mockCharacter, id: 'max-level-char' },
                5, // 最大レベル
                1000
            );

            const experienceInfo = experienceSystem.getExperienceInfo('max-level-char');

            expect(experienceInfo.isMaxLevel).toBe(true);
            expect(experienceInfo.experienceToNextLevel).toBe(0);
            expect(experienceInfo.canLevelUp).toBe(false);
            expect(experienceInfo.experienceProgress).toBe(1.0);
        });

        test('全キャラクターの経験値情報を取得できる', () => {
            const secondCharacter = { ...mockCharacter, id: 'second-character' };
            experienceSystem.registerCharacter(secondCharacter, 1, 50);

            const allInfo = experienceSystem.getAllExperienceInfo();

            expect(allInfo.size).toBe(2);
            expect(allInfo.has(mockCharacter.id)).toBe(true);
            expect(allInfo.has(secondCharacter.id)).toBe(true);
        });
    });

    describe('システム状態管理', () => {
        beforeEach(async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);
        });

        test('システム状態が正確に管理される', () => {
            const initialState = experienceSystem.getSystemState();

            expect(initialState.isInitialized).toBe(true);
            expect(initialState.experienceTableLoaded).toBe(true);
            expect(initialState.growthRatesLoaded).toBe(true);
            expect(initialState.activeCharacters.size).toBe(0);
            expect(initialState.experienceMultiplier).toBe(1.0);
        });

        test('経験値倍率の変更が状態に反映される', () => {
            experienceSystem.setExperienceMultiplier(1.5, 'Test multiplier');

            const state = experienceSystem.getSystemState();
            expect(state.experienceMultiplier).toBe(1.5);
        });

        test('設定の更新が状態に反映される', () => {
            experienceSystem.updateConfig({
                autoLevelUp: true,
                showExperiencePopups: false
            });

            const state = experienceSystem.getSystemState();
            expect(state.config.autoLevelUp).toBe(true);
            expect(state.config.showExperiencePopups).toBe(false);
        });

        test('保留レベルアップが正常に管理される', async () => {
            experienceSystem.registerCharacter(mockCharacter, 1, 0);

            // autoLevelUpを無効にして保留レベルアップを発生させる
            experienceSystem.updateConfig({ autoLevelUp: false });

            // レベルアップに必要な経験値を付与
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                bonusAmount: 75, // 25 + 75 = 100
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.DEFEAT, context);
            experienceSystem.checkAndProcessLevelUp(mockCharacter.id);

            const state = experienceSystem.getSystemState();
            expect(state.pendingLevelUps.has(mockCharacter.id)).toBe(true);

            // 保留レベルアップを処理
            experienceSystem.processPendingLevelUps(mockCharacter.id);

            const updatedState = experienceSystem.getSystemState();
            expect(updatedState.pendingLevelUps.has(mockCharacter.id)).toBe(false);
        });
    });

    describe('イベントシステム', () => {
        beforeEach(async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);
            experienceSystem.registerCharacter(mockCharacter, 1, 0);
        });

        test('経験値獲得イベントが発行される', () => {
            const eventListener = jest.fn();
            experienceSystem.on('experience-awarded', eventListener);

            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.ATTACK, context);

            expect(eventListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    characterId: mockCharacter.id,
                    action: ExperienceAction.ATTACK
                })
            );
        });

        test('レベルアップイベントが発行される', () => {
            const eventListener = jest.fn();
            experienceSystem.on('level-up-processed', eventListener);

            // レベルアップに必要な経験値を付与
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                bonusAmount: 75,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.DEFEAT, context);
            experienceSystem.checkAndProcessLevelUp(mockCharacter.id);

            expect(eventListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    characterId: mockCharacter.id,
                    result: expect.objectContaining({
                        oldLevel: 1,
                        newLevel: 2
                    })
                })
            );
        });

        test('イベントリスナーの削除が正常に動作する', () => {
            const eventListener = jest.fn();
            experienceSystem.on('experience-awarded', eventListener);
            experienceSystem.off('experience-awarded', eventListener);

            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(mockCharacter.id, ExperienceAction.ATTACK, context);

            expect(eventListener).not.toHaveBeenCalled();
        });
    });

    describe('エラーハンドリング', () => {
        test('未初期化状態での操作はエラーになる', () => {
            const uninitializedSystem = new ExperienceSystem(mockScene);

            expect(() => {
                uninitializedSystem.registerCharacter(mockCharacter);
            }).toThrow('system_not_initialized');

            expect(() => {
                const context: ExperienceContext = {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                };
                uninitializedSystem.awardExperience(mockCharacter.id, ExperienceAction.ATTACK, context);
            }).toThrow('system_not_initialized');

            uninitializedSystem.destroy();
        });

        test('無効なキャラクターIDでの操作はエラーになる', async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);

            expect(() => {
                experienceSystem.getExperienceInfo('invalid-character');
            }).toThrow('invalid_character');

            expect(() => {
                experienceSystem.checkAndProcessLevelUp('invalid-character');
            }).toThrow('invalid_character');
        });

        test('負の経験値倍率設定はエラーになる', async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);

            expect(() => {
                experienceSystem.setExperienceMultiplier(-1.0);
            }).toThrow('Experience multiplier cannot be negative');
        });
    });

    describe('デバッグ機能', () => {
        beforeEach(async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);
            experienceSystem.registerCharacter(mockCharacter, 1, 0);
        });

        test('デバッグ情報が正確に取得される', () => {
            const debugInfo = experienceSystem.getDebugInfo();

            expect(debugInfo).toHaveProperty('systemState');
            expect(debugInfo).toHaveProperty('config');
            expect(debugInfo).toHaveProperty('activeCharacters');
            expect(debugInfo).toHaveProperty('components');

            expect(debugInfo.activeCharacters).toContain(mockCharacter.id);
            expect(debugInfo.components.experienceDataLoader).toBe(true);
            expect(debugInfo.components.growthCalculator).toBe(true);
        });
    });

    describe('リソース管理', () => {
        test('システム破棄が正常に実行される', async () => {
            await experienceSystem.initialize(undefined, mockGrowthRateData);
            experienceSystem.registerCharacter(mockCharacter, 1, 0);

            // 破棄前の状態確認
            const preDestroyState = experienceSystem.getSystemState();
            expect(preDestroyState.activeCharacters.size).toBe(1);

            // システム破棄
            experienceSystem.destroy();

            // 破棄後の操作はエラーになることを確認
            expect(() => {
                experienceSystem.getExperienceInfo(mockCharacter.id);
            }).toThrow();
        });
    });
});