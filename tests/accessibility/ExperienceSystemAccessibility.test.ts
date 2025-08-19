/**
 * 経験値システム アクセシビリティテスト
 * 
 * 経験値システムのアクセシビリティ対応を検証します。
 * キーボード操作、視覚的フィードバック、スクリーンリーダー対応など
 * 
 * アクセシビリティ要件:
 * - キーボード操作対応
 * - 視覚的フィードバック
 * - スクリーンリーダー対応
 * - 色覚異常対応
 * - 動作軽減対応
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
    ExperienceTableData,
    ExperienceSystemConfig
} from '../../game/src/types/experience';
import { Unit } from '../../game/src/types/gameplay';

// アクセシビリティテスト用のモック
const mockScene = {
    add: {
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setTint: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        container: jest.fn().mockReturnValue({
            add: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })
    },
    tweens: {
        add: jest.fn().mockReturnValue({
            play: jest.fn(),
            stop: jest.fn(),
            destroy: jest.fn()
        })
    },
    input: {
        keyboard: {
            on: jest.fn(),
            addKey: jest.fn().mockReturnValue({
                on: jest.fn()
            }),
            createCursorKeys: jest.fn().mockReturnValue({
                up: { isDown: false },
                down: { isDown: false },
                left: { isDown: false },
                right: { isDown: false }
            })
        }
    },
    sound: {
        add: jest.fn().mockReturnValue({
            play: jest.fn(),
            stop: jest.fn(),
            destroy: jest.fn()
        })
    }
};

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

describe('ExperienceSystem - アクセシビリティテスト', () => {
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

    describe('キーボード操作対応', () => {
        test('経験値情報表示のキーボードナビゲーション', () => {
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

            // インタラクティブ要素の設定確認
            expect(mockScene.add.container).toHaveBeenCalled();
            const containerCall = (mockScene.add.container as jest.Mock).mock.results[0].value;
            expect(containerCall.setInteractive).toHaveBeenCalled();

            // キーボードイベントリスナーの設定確認
            expect(containerCall.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
        });

        test('レベルアップ確認ダイアログのキーボード操作', async () => {
            const character = mockUnit;
            const levelUpResult: LevelUpResult = {
                characterId: 'test-character',
                oldLevel: 1,
                newLevel: 2,
                statGrowth: {
                    hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1
                },
                newExperienceRequired: 150,
                oldStats: character.stats as UnitStats,
                newStats: character.stats as UnitStats,
                levelsGained: 1,
                timestamp: Date.now()
            };

            await experienceUI.showLevelUpEffect(character, levelUpResult);

            // キーボードイベントリスナーの設定確認
            expect(mockScene.input.keyboard.on).toHaveBeenCalledWith(
                'keydown-ENTER',
                expect.any(Function)
            );
            expect(mockScene.input.keyboard.on).toHaveBeenCalledWith(
                'keydown-ESC',
                expect.any(Function)
            );
        });

        test('経験値バーのキーボードフォーカス', () => {
            const characterId = 'test-character';

            experienceUI.updateExperienceBar(characterId, 50, 100);

            // 経験値バーがキーボードフォーカス可能であることを確認
            const graphicsCall = (mockScene.add.graphics as jest.Mock).mock.results[0].value;
            expect(graphicsCall.setInteractive).toHaveBeenCalled();
            expect(graphicsCall.on).toHaveBeenCalledWith('focus', expect.any(Function));
            expect(graphicsCall.on).toHaveBeenCalledWith('blur', expect.any(Function));
        });

        test('タブキーによる要素間移動', () => {
            const characterIds = ['character-1', 'character-2', 'character-3'];

            characterIds.forEach(characterId => {
                const expInfo: ExperienceInfo = {
                    characterId,
                    currentExperience: 25,
                    currentLevel: 1,
                    experienceToNextLevel: 75,
                    totalExperience: 25,
                    canLevelUp: false,
                    isMaxLevel: false,
                    experienceProgress: 0.25
                };

                experienceUI.displayExperienceInfo(characterId, expInfo);
            });

            // タブインデックスの設定確認
            const containerCalls = (mockScene.add.container as jest.Mock).mock.results;
            containerCalls.forEach((result, index) => {
                expect(result.value.setInteractive).toHaveBeenCalledWith(
                    expect.objectContaining({
                        useHandCursor: true
                    })
                );
            });
        });

        test('ショートカットキーの対応', () => {
            // 経験値情報表示ショートカット（Eキー）
            experienceUI.setupKeyboardShortcuts();

            expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('E');
            expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('L'); // レベルアップ情報
            expect(mockScene.input.keyboard.addKey).toHaveBeenCalledWith('S'); // 統計情報
        });
    });

    describe('視覚的フィードバック', () => {
        test('経験値獲得時の視覚的強調', () => {
            const characterId = 'test-character';
            const amount = 25;

            experienceUI.showExperienceGain(characterId, amount, ExperienceSource.ENEMY_DEFEAT);

            // 視覚的強調効果の確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                `+${amount} EXP`,
                expect.objectContaining({
                    fontSize: expect.any(String),
                    fill: expect.any(String),
                    stroke: expect.any(String), // アウトライン
                    strokeThickness: expect.any(Number)
                })
            );
        });

        test('レベルアップ時の視覚的フィードバック', async () => {
            const character = mockUnit;
            const levelUpResult: LevelUpResult = {
                characterId: 'test-character',
                oldLevel: 1,
                newLevel: 2,
                statGrowth: {
                    hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1
                },
                newExperienceRequired: 150,
                oldStats: character.stats as UnitStats,
                newStats: character.stats as UnitStats,
                levelsGained: 1,
                timestamp: Date.now()
            };

            await experienceUI.showLevelUpEffect(character, levelUpResult);

            // 複数の視覚的フィードバック確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'LEVEL UP!',
                expect.objectContaining({
                    fontSize: expect.stringMatching(/\d+px/),
                    fill: '#FFD700',
                    stroke: '#000000',
                    strokeThickness: 4
                })
            );

            // アニメーション効果の確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    targets: expect.any(Object),
                    scale: 1.5,
                    yoyo: true,
                    duration: 300
                })
            );
        });

        test('経験値バーの視覚的進捗表示', () => {
            const characterId = 'test-character';

            experienceUI.updateExperienceBar(characterId, 75, 100);

            // 進捗バーの視覚的表現確認
            const graphicsCall = (mockScene.add.graphics as jest.Mock).mock.results[0].value;

            // 背景バー
            expect(graphicsCall.fillStyle).toHaveBeenCalledWith(0x333333);
            expect(graphicsCall.fillRect).toHaveBeenCalled();

            // 進捗バー
            expect(graphicsCall.fillStyle).toHaveBeenCalledWith(0x00FF00);
            expect(graphicsCall.fillRect).toHaveBeenCalled();

            // ボーダー
            expect(graphicsCall.lineStyle).toHaveBeenCalledWith(2, 0xFFFFFF);
            expect(graphicsCall.strokeRect).toHaveBeenCalled();
        });

        test('能力値成長の視覚的ハイライト', () => {
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

            // 成長した能力値のハイライト確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('HP +5'),
                expect.objectContaining({
                    fill: '#00FF00', // 成長時は緑色
                    fontSize: expect.any(String)
                })
            );
        });

        test('フォーカス状態の視覚的表示', () => {
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

            // フォーカス時の視覚的変化確認
            const containerCall = (mockScene.add.container as jest.Mock).mock.results[0].value;
            expect(containerCall.on).toHaveBeenCalledWith('focus', expect.any(Function));
            expect(containerCall.on).toHaveBeenCalledWith('blur', expect.any(Function));
        });
    });

    describe('スクリーンリーダー対応', () => {
        test('経験値情報のARIAラベル設定', () => {
            const characterId = 'test-character';
            const expInfo: ExperienceInfo = {
                characterId,
                currentExperience: 75,
                currentLevel: 3,
                experienceToNextLevel: 125,
                totalExperience: 325,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.375
            };

            experienceUI.displayExperienceInfo(characterId, expInfo);

            // ARIAラベルの設定確認
            expect(mockScene.add.container).toHaveBeenCalled();
            const containerCall = (mockScene.add.container as jest.Mock).mock.results[0].value;

            // スクリーンリーダー用のテキスト情報確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('Level 3'),
                expect.objectContaining({
                    alpha: 0, // 視覚的には非表示だがスクリーンリーダーで読み上げ可能
                    fontSize: '1px'
                })
            );
        });

        test('レベルアップ時の音声フィードバック', async () => {
            const character = mockUnit;
            const levelUpResult: LevelUpResult = {
                characterId: 'test-character',
                oldLevel: 1,
                newLevel: 2,
                statGrowth: {
                    hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1
                },
                newExperienceRequired: 150,
                oldStats: character.stats as UnitStats,
                newStats: character.stats as UnitStats,
                levelsGained: 1,
                timestamp: Date.now()
            };

            await experienceUI.showLevelUpEffect(character, levelUpResult);

            // 音声フィードバックの確認
            expect(mockScene.sound.add).toHaveBeenCalledWith('level-up-sound');

            // スクリーンリーダー用の詳細情報確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining('Character leveled up from 1 to 2'),
                expect.objectContaining({
                    alpha: 0,
                    fontSize: '1px'
                })
            );
        });

        test('経験値獲得時の音声通知', () => {
            const characterId = 'test-character';
            const amount = 25;

            experienceUI.showExperienceGain(characterId, amount, ExperienceSource.ENEMY_DEFEAT);

            // 音声通知の確認
            expect(mockScene.sound.add).toHaveBeenCalledWith('experience-gain-sound');

            // スクリーンリーダー用テキスト確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                `Character gained ${amount} experience points`,
                expect.objectContaining({
                    alpha: 0,
                    fontSize: '1px'
                })
            );
        });

        test('能力値成長の詳細読み上げ', () => {
            const character = mockUnit;
            const growthResult: StatGrowthResult = {
                hp: 5,
                mp: 3,
                attack: 2,
                defense: 0,
                speed: 1,
                skill: 2,
                luck: 0
            };

            experienceUI.showGrowthResults(character, growthResult);

            // 詳細な成長情報の読み上げテキスト確認
            const expectedText = 'Stat growth: HP increased by 5, MP increased by 3, Attack increased by 2, Speed increased by 1, Skill increased by 2';

            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.stringContaining(expectedText),
                expect.objectContaining({
                    alpha: 0,
                    fontSize: '1px'
                })
            );
        });
    });

    describe('色覚異常対応', () => {
        test('経験値獲得時の色覚異常対応', () => {
            const characterId = 'test-character';

            // 異なる経験値源での色分け確認
            experienceUI.showExperienceGain(characterId, 5, ExperienceSource.ATTACK_HIT);
            experienceUI.showExperienceGain(characterId, 25, ExperienceSource.ENEMY_DEFEAT);
            experienceUI.showExperienceGain(characterId, 10, ExperienceSource.ALLY_SUPPORT);
            experienceUI.showExperienceGain(characterId, 8, ExperienceSource.HEALING);

            const textCalls = (mockScene.add.text as jest.Mock).mock.calls;

            // 色だけでなく形状やパターンでも区別可能であることを確認
            expect(textCalls[0][3]).toEqual(expect.objectContaining({
                fill: expect.any(String),
                stroke: expect.any(String),
                strokeThickness: expect.any(Number)
            }));
        });

        test('経験値バーの色覚異常対応', () => {
            const characterId = 'test-character';

            experienceUI.updateExperienceBar(characterId, 75, 100);

            const graphicsCall = (mockScene.add.graphics as jest.Mock).mock.results[0].value;

            // 進捗バーにパターンや質感を追加
            expect(graphicsCall.fillStyle).toHaveBeenCalledWith(0x00AA00); // より識別しやすい緑
            expect(graphicsCall.lineStyle).toHaveBeenCalledWith(2, 0xFFFFFF); // 白いボーダー
        });

        test('レベルアップ演出の色覚異常対応', async () => {
            const character = mockUnit;
            const levelUpResult: LevelUpResult = {
                characterId: 'test-character',
                oldLevel: 1,
                newLevel: 2,
                statGrowth: {
                    hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1
                },
                newExperienceRequired: 150,
                oldStats: character.stats as UnitStats,
                newStats: character.stats as UnitStats,
                levelsGained: 1,
                timestamp: Date.now()
            };

            await experienceUI.showLevelUpEffect(character, levelUpResult);

            // 色以外の視覚的要素の確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                'LEVEL UP!',
                expect.objectContaining({
                    fontSize: expect.any(String),
                    stroke: '#000000',
                    strokeThickness: 4 // 太いアウトライン
                })
            );
        });

        test('能力値成長表示の色覚異常対応', () => {
            const character = mockUnit;
            const growthResult: StatGrowthResult = {
                hp: 5,
                mp: 0,
                attack: 2,
                defense: 0,
                speed: 1,
                skill: 0,
                luck: 1
            };

            experienceUI.showGrowthResults(character, growthResult);

            // 成長した能力値と成長しなかった能力値の区別
            const textCalls = (mockScene.add.text as jest.Mock).mock.calls;

            // 成長した能力値（アイコンや記号で区別）
            expect(textCalls.some(call =>
                call[2].includes('↑') || call[2].includes('+')
            )).toBe(true);
        });
    });

    describe('動作軽減対応', () => {
        test('アニメーション無効化設定', () => {
            // 動作軽減設定を有効化
            const config: ExperienceSystemConfig = {
                enableExperienceGain: true,
                experienceMultiplier: 1.0,
                maxLevel: 100,
                debugMode: false,
                autoLevelUp: false,
                showExperiencePopups: true,
                experienceAnimationSpeed: 0, // アニメーション無効
                levelUpAnimationDuration: 0 // アニメーション無効
            };

            experienceSystem.updateConfig(config);

            const characterId = 'test-character';
            experienceUI.showExperienceGain(characterId, 25, ExperienceSource.ENEMY_DEFEAT);

            // アニメーションが無効化されていることを確認
            expect(mockScene.tweens.add).not.toHaveBeenCalled();
        });

        test('点滅効果の軽減', () => {
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

            // 動作軽減設定でレベルアップ可能表示
            experienceUI.displayExperienceInfo(characterId, expInfo);

            // 点滅アニメーションが軽減されていることを確認
            const tweenCalls = (mockScene.tweens.add as jest.Mock).mock.calls;
            const blinkingTween = tweenCalls.find(call =>
                call[0].yoyo === true && call[0].repeat === -1
            );

            if (blinkingTween) {
                // 点滅頻度が軽減されている
                expect(blinkingTween[0].duration).toBeGreaterThan(1000);
            }
        });

        test('自動スクロール無効化', () => {
            const characterIds = Array.from({ length: 10 }, (_, i) => `character-${i}`);

            characterIds.forEach(characterId => {
                experienceUI.showExperienceGain(characterId, 5, ExperienceSource.ATTACK_HIT);
            });

            // 自動スクロールアニメーションが無効化されていることを確認
            const tweenCalls = (mockScene.tweens.add as jest.Mock).mock.calls;
            const scrollTweens = tweenCalls.filter(call =>
                call[0].targets && call[0].y !== undefined
            );

            scrollTweens.forEach(tween => {
                expect(tween[0].duration).toBeLessThan(100); // 即座に移動
            });
        });

        test('視差効果の無効化', async () => {
            const character = mockUnit;
            const levelUpResult: LevelUpResult = {
                characterId: 'test-character',
                oldLevel: 1,
                newLevel: 2,
                statGrowth: {
                    hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1
                },
                newExperienceRequired: 150,
                oldStats: character.stats as UnitStats,
                newStats: character.stats as UnitStats,
                levelsGained: 1,
                timestamp: Date.now()
            };

            await experienceUI.showLevelUpEffect(character, levelUpResult);

            // 複雑な視差効果が無効化されていることを確認
            const tweenCalls = (mockScene.tweens.add as jest.Mock).mock.calls;
            const complexTweens = tweenCalls.filter(call =>
                call[0].scale !== undefined && call[0].rotation !== undefined
            );

            expect(complexTweens.length).toBe(0);
        });
    });

    describe('ユーザー設定対応', () => {
        test('フォントサイズ調整対応', () => {
            // 大きなフォントサイズ設定
            const largeFontConfig = {
                baseFontSize: 24,
                scaleFactor: 1.5
            };

            experienceUI.updateFontSettings(largeFontConfig);

            const characterId = 'test-character';
            experienceUI.showExperienceGain(characterId, 25, ExperienceSource.ENEMY_DEFEAT);

            // フォントサイズが調整されていることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number),
                expect.any(Number),
                expect.any(String),
                expect.objectContaining({
                    fontSize: '36px' // 24 * 1.5
                })
            );
        });

        test('コントラスト調整対応', () => {
            // 高コントラスト設定
            const highContrastConfig = {
                backgroundColor: '#000000',
                textColor: '#FFFFFF',
                accentColor: '#FFFF00',
                borderColor: '#FFFFFF'
            };

            experienceUI.updateContrastSettings(highContrastConfig);

            const characterId = 'test-character';
            experienceUI.updateExperienceBar(characterId, 50, 100);

            // 高コントラスト色が適用されていることを確認
            const graphicsCall = (mockScene.add.graphics as jest.Mock).mock.results[0].value;
            expect(graphicsCall.fillStyle).toHaveBeenCalledWith(0x000000); // 背景
            expect(graphicsCall.lineStyle).toHaveBeenCalledWith(2, 0xFFFFFF); // ボーダー
        });

        test('音声フィードバック設定', () => {
            // 音声フィードバック設定
            const audioConfig = {
                enableSoundEffects: true,
                enableVoiceAnnouncements: true,
                volume: 0.8,
                speechRate: 1.2
            };

            experienceUI.updateAudioSettings(audioConfig);

            const characterId = 'test-character';
            experienceUI.showExperienceGain(characterId, 25, ExperienceSource.ENEMY_DEFEAT);

            // 音声設定が適用されていることを確認
            expect(mockScene.sound.add).toHaveBeenCalledWith(
                'experience-gain-sound',
                expect.objectContaining({
                    volume: 0.8
                })
            );
        });

        test('操作タイムアウト調整', () => {
            // 長いタイムアウト設定
            const timeoutConfig = {
                interactionTimeout: 10000, // 10秒
                confirmationTimeout: 5000   // 5秒
            };

            experienceUI.updateTimeoutSettings(timeoutConfig);

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

            // タイムアウト設定が適用されていることを確認
            expect(mockScene.time.delayedCall).toHaveBeenCalledWith(
                10000,
                expect.any(Function)
            );
        });
    });

    describe('アクセシビリティ統合テスト', () => {
        test('全アクセシビリティ機能の統合動作', async () => {
            const characterId = 'test-character';

            // 1. キーボード操作でキャラクター選択
            const expInfo: ExperienceInfo = {
                characterId,
                currentExperience: 95,
                currentLevel: 1,
                experienceToNextLevel: 5,
                totalExperience: 95,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.95
            };

            experienceUI.displayExperienceInfo(characterId, expInfo);

            // 2. 経験値獲得（視覚・音声フィードバック）
            experienceUI.showExperienceGain(characterId, 5, ExperienceSource.ATTACK_HIT);

            // 3. レベルアップ（全アクセシビリティ機能）
            const character = mockUnit;
            const levelUpResult: LevelUpResult = {
                characterId,
                oldLevel: 1,
                newLevel: 2,
                statGrowth: {
                    hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1
                },
                newExperienceRequired: 150,
                oldStats: character.stats as UnitStats,
                newStats: character.stats as UnitStats,
                levelsGained: 1,
                timestamp: Date.now()
            };

            await experienceUI.showLevelUpEffect(character, levelUpResult);

            // 全アクセシビリティ機能の動作確認
            expect(mockScene.add.text).toHaveBeenCalled(); // 視覚表示
            expect(mockScene.sound.add).toHaveBeenCalled(); // 音声フィードバック
            expect(mockScene.input.keyboard.on).toHaveBeenCalled(); // キーボード操作
        });

        test('アクセシビリティエラー処理', () => {
            // 音声ファイルが見つからない場合
            (mockScene.sound.add as jest.Mock).mockImplementation(() => {
                throw new Error('Audio file not found');
            });

            const characterId = 'test-character';

            // エラーが発生してもシステムが継続動作することを確認
            expect(() => {
                experienceUI.showExperienceGain(characterId, 25, ExperienceSource.ENEMY_DEFEAT);
            }).not.toThrow();

            // 代替フィードバックが提供されることを確認
            expect(mockScene.add.text).toHaveBeenCalled();
        });

        test('アクセシビリティ設定の永続化', () => {
            const accessibilitySettings = {
                enableKeyboardNavigation: true,
                enableScreenReader: true,
                enableHighContrast: true,
                enableReducedMotion: true,
                fontSize: 'large',
                soundVolume: 0.8
            };

            experienceUI.saveAccessibilitySettings(accessibilitySettings);

            // 設定が保存されることを確認
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'experience-ui-accessibility',
                JSON.stringify(accessibilitySettings)
            );
        });
    });
});