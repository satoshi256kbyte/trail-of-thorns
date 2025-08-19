/**
 * 経験値UI ビジュアル回帰テスト
 * 
 * 経験値システムのUI表示と状態同期の
 * ビジュアル回帰テストを実行します。
 * 
 * テスト対象:
 * - 経験値獲得ポップアップ表示
 * - レベルアップ演出
 * - 経験値バー表示
 * - 成長結果表示
 * - UI状態同期
 * - アニメーション効果
 * 
 * @version 1.0.0
 */

import { ExperienceUI } from '../../game/src/systems/experience/ExperienceUI';
import { ExperienceSystem } from '../../game/src/systems/experience/ExperienceSystem';
import {
    ExperienceSource,
    ExperienceAction,
    ExperienceInfo,
    LevelUpResult,
    StatGrowthResult,
    UnitStats,
    ExperienceTableData
} from '../../game/src/types/experience';
import { Unit } from '../../game/src/types/gameplay';

// Phaserモック
const mockScene = {
    add: {
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        container: jest.fn().mockReturnValue({
            add: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        particles: jest.fn().mockReturnValue({
            createEmitter: jest.fn().mockReturnValue({
                start: jest.fn(),
                stop: jest.fn(),
                destroy: jest.fn()
            }),
            destroy: jest.fn()
        })
    },
    tweens: {
        add: jest.fn().mockReturnValue({
            play: jest.fn(),
            stop: jest.fn(),
            destroy: jest.fn()
        }),
        timeline: jest.fn().mockReturnValue({
            add: jest.fn().mockReturnThis(),
            play: jest.fn(),
            stop: jest.fn(),
            destroy: jest.fn()
        })
    },
    time: {
        delayedCall: jest.fn().mockReturnValue({
            destroy: jest.fn()
        })
    },
    cameras: {
        main: {
            width: 1920,
            height: 1080,
            centerX: 960,
            centerY: 540
        }
    }
};

// テスト用データ
const mockExperienceTable: ExperienceTableData = {
    levelRequirements: [0, 100, 250, 450, 700, 1000],
    experienceGains: {
        attackHit: 5,
        enemyDefeat: 25,
        allySupport: 10,
        healing: 8
    },
    maxLevel: 5
};

const mockUnit: Unit = {
    id: 'test-character',
    name: 'Test Character',
    position: { x: 100, y: 100 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3,
        skill: 12,
        luck: 8
    },
    currentHP: 100,
    currentMP: 50,
    level: 1,
    experience: 0,
    faction: 'player',
    hasActed: false,
    hasMoved: false
};

const mockLevelUpResult: LevelUpResult = {
    characterId: 'test-character',
    oldLevel: 1,
    newLevel: 2,
    statGrowth: {
        hp: 5,
        mp: 3,
        attack: 2,
        defense: 1,
        speed: 1,
        skill: 2,
        luck: 1
    },
    newExperienceRequired: 150,
    oldStats: mockUnit.stats as UnitStats,
    newStats: {
        ...mockUnit.stats,
        maxHP: 105,
        maxMP: 53,
        attack: 22,
        defense: 16,
        speed: 11,
        skill: 14,
        luck: 9
    } as UnitStats,
    levelsGained: 1,
    timestamp: Date.now()
};

describe('ExperienceUI - ビジュアル回帰テスト', () => {
    let experienceUI: ExperienceUI;
    let experienceSystem: ExperienceSystem;

    beforeEach(async () => {
        experienceUI = new ExperienceUI();
        experienceSystem = new ExperienceSystem();

        // Phaserシーンのモック設定
        (experienceUI as any).scene = mockScene;

        await experienceSystem.initialize(mockExperienceTable);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('経験値獲得ポップアップ表示', () => {
        test('攻撃命中時の経験値ポップアップ表示', () => {
            const characterId = 'test-character';
            const amount = 5;
            const source = ExperienceSource.ATTACK_HIT;

            experienceUI.showExperienceGain(characterId, amount, source);

            // テキストオブジェクトの作成確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                `+${amount} EXP`,
                expect.objectContaining({
                    fontSize: expect.any(String),
                    fill: expect.any(String),
                    fontFamily: expect.any(String)
                })
            );

            // アニメーション設定確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    y: expect.any(Number),
                    alpha: 0,
                    duration: expect.any(Number),
                    ease: expect.any(String)
                })
            );
        });

        test('敵撃破時の経験値ポップアップ表示', () => {
            const characterId = 'test-character';
            const amount = 25;
            const source = ExperienceSource.ENEMY_DEFEAT;

            experienceUI.showExperienceGain(characterId, amount, source);

            // より大きな経験値獲得時の特別な表示確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                `+${amount} EXP`,
                expect.objectContaining({
                    fontSize: expect.any(String),
                    fill: '#FFD700', // 金色
                    fontFamily: expect.any(String)
                })
            );
        });

        test('支援・回復時の経験値ポップアップ表示', () => {
            const characterId = 'test-character';
            const healingAmount = 8;
            const supportAmount = 10;

            // 回復経験値
            experienceUI.showExperienceGain(characterId, healingAmount, ExperienceSource.HEALING);

            // 支援経験値
            experienceUI.showExperienceGain(characterId, supportAmount, ExperienceSource.ALLY_SUPPORT);

            // 異なる色での表示確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                `+${healingAmount} EXP`,
                expect.objectContaining({
                    fill: '#00FF00' // 緑色（回復）
                })
            );

            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                `+${supportAmount} EXP`,
                expect.objectContaining({
                    fill: '#00BFFF' // 青色（支援）
                })
            );
        });

        test('複数経験値獲得時のポップアップ重複表示', () => {
            const characterId = 'test-character';

            // 短時間で複数の経験値獲得
            experienceUI.showExperienceGain(characterId, 5, ExperienceSource.ATTACK_HIT);
            experienceUI.showExperienceGain(characterId, 25, ExperienceSource.ENEMY_DEFEAT);

            // 複数のテキストオブジェクトが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalledTimes(2);

            // Y座標がずれて表示されることを確認
            const calls = (mockScene.add.text as jest.Mock).mock.calls;
            expect(calls[0][1]).not.toBe(calls[1][1]);
        });
    });

    describe('レベルアップ演出表示', () => {
        test('レベルアップエフェクト表示', async () => {
            const character = mockUnit;
            const levelUpResult = mockLevelUpResult;

            const promise = experienceUI.showLevelUpEffect(character, levelUpResult);

            // レベルアップテキストの表示確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'LEVEL UP!',
                expect.objectContaining({
                    fontSize: expect.any(String),
                    fill: '#FFD700',
                    fontFamily: expect.any(String)
                })
            );

            // パーティクルエフェクトの作成確認
            expect(mockScene.add.particles).toHaveBeenCalled();

            // アニメーションタイムラインの作成確認
            expect(mockScene.tweens.timeline).toHaveBeenCalled();

            await promise;
        });

        test('複数レベルアップ時の演出表示', async () => {
            const character = mockUnit;
            const multiLevelUpResult: LevelUpResult = {
                ...mockLevelUpResult,
                oldLevel: 1,
                newLevel: 3,
                levelsGained: 2
            };

            await experienceUI.showLevelUpEffect(character, multiLevelUpResult);

            // 複数レベルアップの特別表示確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'LEVEL UP! x2',
                expect.any(Object)
            );
        });

        test('最大レベル到達時の演出表示', async () => {
            const character = mockUnit;
            const maxLevelResult: LevelUpResult = {
                ...mockLevelUpResult,
                oldLevel: 4,
                newLevel: 5,
                levelsGained: 1
            };

            await experienceUI.showLevelUpEffect(character, maxLevelResult);

            // 最大レベル到達の特別表示確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'MAX LEVEL!',
                expect.objectContaining({
                    fill: '#FF6B6B' // 赤色
                })
            );
        });
    });

    describe('経験値バー表示', () => {
        test('経験値バーの初期表示', () => {
            const characterId = 'test-character';
            const current = 50;
            const required = 100;

            experienceUI.updateExperienceBar(characterId, current, required);

            // 背景バーの作成確認
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // 進捗バーの描画確認
            const graphicsCall = (mockScene.add.graphics as jest.Mock).mock.results[0].value;
            expect(graphicsCall.fillStyle).toHaveBeenCalledWith(0x00FF00); // 緑色
            expect(graphicsCall.fillRect).toHaveBeenCalled();
        });

        test('経験値バーの進捗更新', () => {
            const characterId = 'test-character';

            // 初期状態
            experienceUI.updateExperienceBar(characterId, 25, 100);

            // 進捗更新
            experienceUI.updateExperienceBar(characterId, 75, 100);

            // アニメーション付きの更新確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    scaleX: 0.75, // 75%の進捗
                    duration: expect.any(Number),
                    ease: 'Power2'
                })
            );
        });

        test('レベルアップ時の経験値バーリセット', () => {
            const characterId = 'test-character';

            // レベルアップ前（満タン）
            experienceUI.updateExperienceBar(characterId, 100, 100);

            // レベルアップ後（リセット）
            experienceUI.updateExperienceBar(characterId, 0, 150);

            // バーのリセットアニメーション確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    scaleX: 0,
                    duration: expect.any(Number)
                })
            );
        });

        test('最大レベル時の経験値バー表示', () => {
            const characterId = 'test-character';
            const current = 1000;
            const required = 0; // 最大レベル

            experienceUI.updateExperienceBar(characterId, current, required);

            // 最大レベル時の特別表示確認
            const graphicsCall = (mockScene.add.graphics as jest.Mock).mock.results[0].value;
            expect(graphicsCall.fillStyle).toHaveBeenCalledWith(0xFFD700); // 金色
        });
    });

    describe('成長結果表示', () => {
        test('能力値成長結果の表示', () => {
            const character = mockUnit;
            const growthResult: StatGrowthResult = {
                hp: 5,
                mp: 3,
                attack: 2,
                defense: 1,
                speed: 1,
                skill: 2,
                luck: 1
            };

            experienceUI.showGrowthResults(character, growthResult);

            // 成長結果コンテナの作成確認
            expect(mockScene.add.container).toHaveBeenCalled();

            // 各能力値の成長表示確認
            const expectedStats = ['HP', 'MP', 'ATK', 'DEF', 'SPD', 'SKL', 'LCK'];
            expectedStats.forEach(stat => {
                expect(mockScene.add.text).toHaveBeenCalledWith(
                    expect.any(Number),
                    expect.any(Number),
                    expect.stringContaining(stat),
                    expect.any(Object)
                );
            });
        });

        test('成長なし時の表示', () => {
            const character = mockUnit;
            const noGrowthResult: StatGrowthResult = {
                hp: 0,
                mp: 0,
                attack: 0,
                defense: 0,
                speed: 0,
                skill: 0,
                luck: 0
            };

            experienceUI.showGrowthResults(character, noGrowthResult);

            // 成長なしメッセージの表示確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'No stat growth this level',
                expect.objectContaining({
                    fill: '#888888' // グレー
                })
            );
        });

        test('大幅成長時のハイライト表示', () => {
            const character = mockUnit;
            const bigGrowthResult: StatGrowthResult = {
                hp: 8, // 大幅成長
                mp: 6,
                attack: 5,
                defense: 4,
                speed: 3,
                skill: 7,
                luck: 2
            };

            experienceUI.showGrowthResults(character, bigGrowthResult);

            // 大幅成長のハイライト効果確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    scale: 1.2,
                    yoyo: true,
                    repeat: 2,
                    duration: 200
                })
            );
        });
    });

    describe('キャラクター経験値情報表示', () => {
        test('経験値情報パネルの表示', () => {
            const characterId = 'test-character';
            const expInfo: ExperienceInfo = {
                characterId,
                currentExperience: 75,
                currentLevel: 2,
                experienceToNextLevel: 175,
                totalExperience: 175,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.3
            };

            experienceUI.displayExperienceInfo(characterId, expInfo);

            // 情報パネルの作成確認
            expect(mockScene.add.container).toHaveBeenCalled();

            // レベル表示確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                `Level: ${expInfo.currentLevel}`,
                expect.any(Object)
            );

            // 経験値表示確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                `EXP: ${expInfo.currentExperience}/${expInfo.experienceToNextLevel}`,
                expect.any(Object)
            );

            // 進捗バー表示確認
            expect(mockScene.add.graphics).toHaveBeenCalled();
        });

        test('レベルアップ可能時の表示', () => {
            const characterId = 'test-character';
            const expInfo: ExperienceInfo = {
                characterId,
                currentExperience: 100,
                currentLevel: 1,
                experienceToNextLevel: 0,
                totalExperience: 100,
                canLevelUp: true,
                isMaxLevel: false,
                experienceProgress: 1.0
            };

            experienceUI.displayExperienceInfo(characterId, expInfo);

            // レベルアップ可能インジケーターの表示確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'LEVEL UP READY!',
                expect.objectContaining({
                    fill: '#FFD700' // 金色
                })
            );

            // 点滅アニメーション確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    alpha: 0.3,
                    yoyo: true,
                    repeat: -1,
                    duration: 500
                })
            );
        });

        test('最大レベル時の表示', () => {
            const characterId = 'test-character';
            const expInfo: ExperienceInfo = {
                characterId,
                currentExperience: 1000,
                currentLevel: 5,
                experienceToNextLevel: 0,
                totalExperience: 1000,
                canLevelUp: false,
                isMaxLevel: true,
                experienceProgress: 1.0
            };

            experienceUI.displayExperienceInfo(characterId, expInfo);

            // 最大レベル表示確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'MAX LEVEL',
                expect.objectContaining({
                    fill: '#FF6B6B' // 赤色
                })
            );
        });
    });

    describe('UI状態同期テスト', () => {
        test('経験値獲得時のUI同期', () => {
            const characterId = 'test-character';

            // 経験値獲得
            experienceSystem.awardExperience(characterId, ExperienceAction.ATTACK, {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            });

            // UI更新の確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                '+5 EXP',
                expect.any(Object)
            );

            // 経験値バー更新の確認
            expect(mockScene.add.graphics).toHaveBeenCalled();
        });

        test('レベルアップ時のUI同期', async () => {
            const characterId = 'test-character';

            // レベルアップに必要な経験値付与
            experienceSystem.awardExperience(characterId, ExperienceAction.DEFEAT, {
                source: ExperienceSource.ENEMY_DEFEAT,
                action: ExperienceAction.DEFEAT,
                amount: 100,
                timestamp: Date.now()
            });

            // レベルアップ実行
            const levelUpResult = experienceSystem.checkAndProcessLevelUp(characterId);

            // レベルアップ演出の確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'LEVEL UP!',
                expect.any(Object)
            );

            // 成長結果表示の確認
            expect(mockScene.add.container).toHaveBeenCalled();
        });

        test('複数キャラクターのUI同期', () => {
            const characterIds = ['player-1', 'player-2', 'player-3'];

            characterIds.forEach(characterId => {
                experienceSystem.awardExperience(characterId, ExperienceAction.ATTACK, {
                    source: ExperienceSource.ATTACK_HIT,
                    action: ExperienceAction.ATTACK,
                    timestamp: Date.now()
                });
            });

            // 各キャラクターのUI更新確認
            expect(mockScene.add.text).toHaveBeenCalledTimes(characterIds.length);
        });
    });

    describe('アニメーション効果テスト', () => {
        test('経験値獲得アニメーション', () => {
            const characterId = 'test-character';
            const amount = 25;

            experienceUI.showExperienceGain(characterId, amount, ExperienceSource.ENEMY_DEFEAT);

            // フェードアウトアニメーション確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    alpha: 0,
                    y: expect.any(Number),
                    duration: 1500,
                    ease: 'Power2'
                })
            );
        });

        test('レベルアップアニメーション', async () => {
            const character = mockUnit;
            const levelUpResult = mockLevelUpResult;

            await experienceUI.showLevelUpEffect(character, levelUpResult);

            // スケールアニメーション確認
            expect(mockScene.tweens.timeline).toHaveBeenCalled();

            // パーティクルエフェクト確認
            expect(mockScene.add.particles).toHaveBeenCalled();
        });

        test('経験値バーアニメーション', () => {
            const characterId = 'test-character';

            experienceUI.updateExperienceBar(characterId, 50, 100);

            // スムーズな進捗アニメーション確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    scaleX: 0.5,
                    duration: 800,
                    ease: 'Power2'
                })
            );
        });
    });

    describe('レスポンシブ表示テスト', () => {
        test('異なる画面サイズでの表示調整', () => {
            // 小さい画面サイズ
            (mockScene.cameras.main as any).width = 1280;
            (mockScene.cameras.main as any).height = 720;

            const characterId = 'test-character';
            experienceUI.showExperienceGain(characterId, 25, ExperienceSource.ENEMY_DEFEAT);

            // 画面サイズに応じた位置調整確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.any(String),
                expect.objectContaining({
                    fontSize: expect.stringMatching(/\d+px/)
                })
            );
        });

        test('モバイル表示での調整', () => {
            // モバイル画面サイズ
            (mockScene.cameras.main as any).width = 375;
            (mockScene.cameras.main as any).height = 667;

            const characterId = 'test-character';
            const expInfo: ExperienceInfo = {
                characterId,
                currentExperience: 50,
                currentLevel: 2,
                experienceToNextLevel: 100,
                totalExperience: 150,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.5
            };

            experienceUI.displayExperienceInfo(characterId, expInfo);

            // モバイル用のコンパクト表示確認
            expect(mockScene.add.container).toHaveBeenCalled();
        });
    });
});