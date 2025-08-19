/**
 * ExperienceSystem統合テスト
 * 経験値システム全体の統合テストと他システムとの連携テスト
 */

import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import {
    ExperienceAction,
    ExperienceSource,
    ExperienceContext,
    GrowthRateData,
    BattleContext
} from '../../game/src/types/experience';
import { Unit } from '../../game/src/types/gameplay';

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
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({
        levelRequirements: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250],
        experienceGains: {
            attackHit: 5,
            enemyDefeat: 25,
            allySupport: 10,
            healing: 8
        },
        maxLevel: 10
    })
});

describe('ExperienceSystem Integration Tests', () => {
    let experienceSystem: ExperienceSystem;
    let playerCharacter: Unit;
    let enemyCharacter: Unit;
    let mockGrowthRateData: GrowthRateData;

    beforeEach(async () => {
        jest.clearAllMocks();

        experienceSystem = new ExperienceSystem(mockScene);

        playerCharacter = {
            id: 'player-001',
            name: 'Hero',
            position: { x: 2, y: 2 },
            stats: {
                maxHP: 120,
                maxMP: 60,
                attack: 25,
                defense: 18,
                speed: 12,
                movement: 3
            },
            currentHP: 120,
            currentMP: 60,
            faction: 'player',
            hasActed: false,
            hasMoved: false
        };

        enemyCharacter = {
            id: 'enemy-001',
            name: 'Goblin',
            position: { x: 8, y: 8 },
            stats: {
                maxHP: 80,
                maxMP: 20,
                attack: 15,
                defense: 10,
                speed: 8,
                movement: 2
            },
            currentHP: 80,
            currentMP: 20,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false
        };

        mockGrowthRateData = {
            characterGrowthRates: {
                'player-001': {
                    hp: 65,
                    mp: 45,
                    attack: 55,
                    defense: 50,
                    speed: 40,
                    skill: 60,
                    luck: 35
                }
            },
            jobClassGrowthRates: {
                hero: {
                    hp: 70,
                    mp: 40,
                    attack: 60,
                    defense: 55,
                    speed: 45,
                    skill: 65,
                    luck: 40
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

        await experienceSystem.initialize(undefined, mockGrowthRateData);
        experienceSystem.registerCharacter(playerCharacter, 1, 0);
    });

    afterEach(() => {
        experienceSystem.destroy();
    });

    describe('戦闘フロー統合テスト', () => {
        test('完全な戦闘フローでの経験値獲得とレベルアップ', async () => {
            const battleContext: BattleContext = {
                battleId: 'battle-001',
                turnNumber: 1,
                attackerId: playerCharacter.id,
                defenderId: enemyCharacter.id,
                damageDealt: 30
            };

            // 戦闘開始 - 複数回の攻撃
            for (let turn = 1; turn <= 3; turn++) {
                battleContext.turnNumber = turn;
                battleContext.damageDealt = 25 + turn * 5;

                // 攻撃命中
                experienceSystem.handleBattleExperience(
                    playerCharacter.id,
                    ExperienceAction.ATTACK,
                    { ...battleContext }
                );

                // 現在の経験値を確認
                const expInfo = experienceSystem.getExperienceInfo(playerCharacter.id);
                expect(expInfo.currentExperience).toBe(turn * 5);
            }

            // 敵撃破
            experienceSystem.handleBattleExperience(
                playerCharacter.id,
                ExperienceAction.DEFEAT,
                battleContext
            );

            // 最終経験値確認（攻撃3回 + 撃破1回 = 15 + 25 = 40）
            const finalExpInfo = experienceSystem.getExperienceInfo(playerCharacter.id);
            expect(finalExpInfo.currentExperience).toBe(40);
            expect(finalExpInfo.currentLevel).toBe(1); // まだレベルアップしない
        });

        test('戦闘中レベルアップが即座に反映される', async () => {
            // 事前に95経験値を付与
            const preContext: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                bonusAmount: 70, // 25 + 70 = 95
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(playerCharacter.id, ExperienceAction.DEFEAT, preContext);

            // 戦闘中に5経験値を獲得してレベルアップ
            const battleContext: BattleContext = {
                battleId: 'battle-002',
                turnNumber: 1,
                attackerId: playerCharacter.id,
                defenderId: enemyCharacter.id,
                damageDealt: 25
            };

            experienceSystem.handleBattleExperience(
                playerCharacter.id,
                ExperienceAction.ATTACK,
                battleContext
            );

            // レベルアップが即座に反映されることを確認
            const expInfo = experienceSystem.getExperienceInfo(playerCharacter.id);
            expect(expInfo.currentLevel).toBe(2);
            expect(expInfo.currentExperience).toBe(100);
        });

        test('複数キャラクターの同時経験値処理', async () => {
            // 2人目のキャラクターを登録
            const secondPlayer: Unit = {
                ...playerCharacter,
                id: 'player-002',
                name: 'Mage'
            };

            experienceSystem.registerCharacter(secondPlayer, 1, 0);

            const battleContext: BattleContext = {
                battleId: 'battle-003',
                turnNumber: 1,
                attackerId: 'player-001',
                defenderId: enemyCharacter.id
            };

            // 両方のキャラクターが経験値を獲得
            experienceSystem.handleBattleExperience(
                playerCharacter.id,
                ExperienceAction.ATTACK,
                battleContext
            );

            experienceSystem.handleBattleExperience(
                secondPlayer.id,
                ExperienceAction.SUPPORT,
                { ...battleContext, attackerId: secondPlayer.id }
            );

            // 両方の経験値を確認
            const player1Info = experienceSystem.getExperienceInfo(playerCharacter.id);
            const player2Info = experienceSystem.getExperienceInfo(secondPlayer.id);

            expect(player1Info.currentExperience).toBe(5); // 攻撃命中
            expect(player2Info.currentExperience).toBe(10); // 味方支援
        });
    });

    describe('成長システム統合テスト', () => {
        test('レベルアップ時の能力値成長が正常に適用される', async () => {
            // レベル2まで経験値を付与
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                bonusAmount: 75, // 25 + 75 = 100
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(playerCharacter.id, ExperienceAction.DEFEAT, context);

            // レベルアップ処理
            const levelUpResult = experienceSystem.checkAndProcessLevelUp(playerCharacter.id);

            expect(levelUpResult).not.toBeNull();
            expect(levelUpResult!.oldLevel).toBe(1);
            expect(levelUpResult!.newLevel).toBe(2);

            // 能力値成長を確認
            const statGrowth = levelUpResult!.statGrowth;
            expect(statGrowth.hp).toBeGreaterThanOrEqual(0);
            expect(statGrowth.mp).toBeGreaterThanOrEqual(0);
            expect(statGrowth.attack).toBeGreaterThanOrEqual(0);
            expect(statGrowth.defense).toBeGreaterThanOrEqual(0);
            expect(statGrowth.speed).toBeGreaterThanOrEqual(0);
            expect(statGrowth.skill).toBeGreaterThanOrEqual(0);
            expect(statGrowth.luck).toBeGreaterThanOrEqual(0);

            // 新しい能力値が適用されていることを確認
            expect(levelUpResult!.newStats.maxHP).toBeGreaterThanOrEqual(levelUpResult!.oldStats.maxHP);
        });

        test('複数レベルアップ時の累積成長', async () => {
            // レベル4まで一気に経験値を付与
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                bonusAmount: 425, // 25 + 425 = 450 (レベル4の必要経験値)
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(playerCharacter.id, ExperienceAction.DEFEAT, context);

            // 複数回レベルアップ処理
            const levelUpResults = [];
            let levelUpResult = experienceSystem.checkAndProcessLevelUp(playerCharacter.id);

            while (levelUpResult) {
                levelUpResults.push(levelUpResult);
                levelUpResult = experienceSystem.checkAndProcessLevelUp(playerCharacter.id);
            }

            expect(levelUpResults.length).toBe(3); // レベル1→2→3→4
            expect(levelUpResults[levelUpResults.length - 1].newLevel).toBe(4);

            // 最終的な経験値情報を確認
            const finalExpInfo = experienceSystem.getExperienceInfo(playerCharacter.id);
            expect(finalExpInfo.currentLevel).toBe(4);
            expect(finalExpInfo.currentExperience).toBe(450);
        });
    });

    describe('UI統合テスト', () => {
        test('経験値獲得時のUI表示が呼び出される', () => {
            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            // UI表示を有効にして経験値を付与
            experienceSystem.updateConfig({ showExperiencePopups: true });
            experienceSystem.awardExperience(playerCharacter.id, ExperienceAction.ATTACK, context);

            // UI要素の作成が呼び出されたことを確認
            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalled();
        });

        test('レベルアップ時のUI演出が呼び出される', async () => {
            // レベルアップに必要な経験値を付与
            const context: ExperienceContext = {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                bonusAmount: 75,
                timestamp: Date.now()
            };

            experienceSystem.awardExperience(playerCharacter.id, ExperienceAction.DEFEAT, context);

            // 自動レベルアップを有効にしてレベルアップ処理
            experienceSystem.updateConfig({ autoLevelUp: true });
            experienceSystem.checkAndProcessLevelUp(playerCharacter.id);

            // レベルアップ演出のUI要素が作成されたことを確認
            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });
    });

    describe('パフォーマンステスト', () => {
        test('大量の経験値処理が適切な時間内で完了する', async () => {
            const startTime = Date.now();

            // 100回の経験値付与を実行
            for (let i = 0; i < 100; i++) {
                const context: ExperienceContext = {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                };

                experienceSystem.awardExperience(playerCharacter.id, ExperienceAction.ATTACK, context);
            }

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            // 100回の処理が1秒以内で完了することを確認
            expect(processingTime).toBeLessThan(1000);

            // 最終的な経験値を確認
            const finalExpInfo = experienceSystem.getExperienceInfo(playerCharacter.id);
            expect(finalExpInfo.currentExperience).toBe(500); // 5 * 100
        });

        test('複数キャラクターの同時処理パフォーマンス', async () => {
            // 10人のキャラクターを登録
            const characters: Unit[] = [];
            for (let i = 0; i < 10; i++) {
                const character: Unit = {
                    ...playerCharacter,
                    id: `player-${i.toString().padStart(3, '0')}`,
                    name: `Player ${i}`
                };
                characters.push(character);
                experienceSystem.registerCharacter(character, 1, 0);
            }

            const startTime = Date.now();

            // 各キャラクターに50回ずつ経験値を付与
            for (const character of characters) {
                for (let i = 0; i < 50; i++) {
                    const context: ExperienceContext = {
                        source: ExperienceSource.ATTACK_HIT,
                        action: ExperienceAction.ATTACK,
                        timestamp: Date.now()
                    };

                    experienceSystem.awardExperience(character.id, ExperienceAction.ATTACK, context);
                }
            }

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            // 500回の処理（10キャラ × 50回）が2秒以内で完了することを確認
            expect(processingTime).toBeLessThan(2000);

            // 全キャラクターの経験値を確認
            const allExpInfo = experienceSystem.getAllExperienceInfo();
            expect(allExpInfo.size).toBe(11); // 元の1人 + 追加の10人

            for (const character of characters) {
                const expInfo = allExpInfo.get(character.id);
                expect(expInfo?.currentExperience).toBe(250); // 5 * 50
            }
        });
    });

    describe('エラー回復テスト', () => {
        test('データ破損時の回復処理', async () => {
            // 不正なデータでfetchをモック
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    // 不正なデータ構造
                    levelRequirements: [0, -100], // 負の値
                    experienceGains: {
                        attackHit: 'invalid' // 文字列
                    },
                    maxLevel: 'invalid'
                })
            });

            // 新しいシステムで初期化
            const newSystem = new ExperienceSystem(mockScene);
            const result = await newSystem.initialize();

            // デフォルト値で初期化されることを確認
            expect(result).toBe(true);

            const systemState = newSystem.getSystemState();
            expect(systemState.isInitialized).toBe(true);

            newSystem.destroy();
        });

        test('ネットワークエラー時の回復処理', async () => {
            // ネットワークエラーをシミュレート
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const newSystem = new ExperienceSystem(mockScene);
            const result = await newSystem.initialize();

            // デフォルト値で初期化されることを確認
            expect(result).toBe(true);

            const systemState = newSystem.getSystemState();
            expect(systemState.isInitialized).toBe(true);

            newSystem.destroy();
        });
    });

    describe('メモリ管理テスト', () => {
        test('システム破棄後のメモリリーク防止', () => {
            // 大量のキャラクターを登録
            for (let i = 0; i < 100; i++) {
                const character: Unit = {
                    ...playerCharacter,
                    id: `test-character-${i}`,
                    name: `Test Character ${i}`
                };
                experienceSystem.registerCharacter(character, 1, 0);
            }

            // システム状態を確認
            const preDestroyState = experienceSystem.getSystemState();
            expect(preDestroyState.activeCharacters.size).toBe(100);

            // システムを破棄
            experienceSystem.destroy();

            // 破棄後の操作でエラーが発生することを確認
            expect(() => {
                experienceSystem.getSystemState();
            }).toThrow();
        });
    });
});