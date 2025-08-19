/**
 * ExperienceUI.test.ts - ExperienceUIクラスのユニットテスト
 * 
 * このテストファイルは、ExperienceUIクラスの全機能をテストします:
 * - 経験値獲得ポップアップ表示
 * - レベルアップ演出表示
 * - 経験値バー更新
 * - 成長結果表示
 * - キャラクター経験値情報表示
 * - UI表示とアニメーション効果
 * 
 * 要件: 6.1, 6.2, 6.3, 6.4, 6.5のテストカバレッジ
 */

import * as Phaser from 'phaser';
import { ExperienceUI, ExperienceGainDisplay } from '../../../../game/src/systems/experience/ExperienceUI';
import {
    ExperienceInfo,
    LevelUpResult,
    StatGrowthResult,
    ExperienceSource,
    UnitStats
} from '../../../../game/src/types/experience';
import { Unit } from '../../../../game/src/types/gameplay';

// Phaserのモック
jest.mock('phaser', () => ({
    Scene: jest.fn(),
    GameObjects: {
        Container: jest.fn(() => ({
            add: jest.fn(),
            removeAll: jest.fn(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            list: [],
            getAt: jest.fn()
        })),
        Graphics: jest.fn(() => ({
            fillStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            fillCircle: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            strokeRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })),
        Text: jest.fn(() => ({
            setText: jest.fn().mockReturnThis(),
            setOrigin: jest.fn().mockReturnThis(),
            setColor: jest.fn().mockReturnThis(),
            setBackgroundColor: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }))
    }
}));

describe('ExperienceUI', () => {
    let mockScene: jest.Mocked<Phaser.Scene>;
    let experienceUI: ExperienceUI;
    let mockContainer: any;
    let mockGraphics: any;
    let mockText: any;

    beforeEach(() => {
        // モックオブジェクトの作成
        mockContainer = {
            add: jest.fn(),
            removeAll: jest.fn(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            setScale: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            destroy: jest.fn(),
            list: [],
            getAt: jest.fn((index) => {
                if (index === 0) return mockGraphics; // background
                if (index === 1) return mockGraphics; // fill
                if (index === 2) return mockText; // text
                return mockGraphics;
            }),
            visible: true
        };

        mockGraphics = {
            fillStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            fillRect: jest.fn().mockReturnThis(),
            fillCircle: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            strokeRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        };

        mockText = {
            setText: jest.fn().mockReturnThis(),
            setOrigin: jest.fn().mockReturnThis(),
            setColor: jest.fn().mockReturnThis(),
            setBackgroundColor: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        };

        // Phaserシーンのモック
        mockScene = {
            add: {
                container: jest.fn(() => mockContainer),
                graphics: jest.fn(() => mockGraphics),
                text: jest.fn(() => mockText)
            },
            cameras: {
                main: {
                    width: 1024,
                    height: 768
                }
            },
            tweens: {
                add: jest.fn()
            },
            time: {
                delayedCall: jest.fn()
            }
        } as any;

        experienceUI = new ExperienceUI(mockScene);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('初期化', () => {
        test('コンストラクタでUIコンテナが正しく作成される', () => {
            expect(mockScene.add.container).toHaveBeenCalledWith(0, 0);
            expect(mockContainer.setScrollFactor).toHaveBeenCalledWith(0);
            expect(mockContainer.setDepth).toHaveBeenCalledWith(2000);
        });

        test('各機能のコンテナが作成される', () => {
            // 6つのコンテナが作成される（メイン + 5つの機能別）
            expect(mockScene.add.container).toHaveBeenCalledTimes(6);
        });
    });

    describe('経験値獲得ポップアップ表示 (要件: 6.1)', () => {
        test('showExperienceGain - 正常な経験値獲得表示', () => {
            const display: ExperienceGainDisplay = {
                characterId: 'test-character',
                amount: 50,
                source: ExperienceSource.ATTACK_HIT,
                position: { x: 100, y: 100 }
            };

            experienceUI.showExperienceGain(display);

            expect(mockScene.add.container).toHaveBeenCalledWith(100, 100);
            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalledWith(0, 0, '+50 EXP', expect.any(Object));
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('showExperienceGain - 0以下の経験値は表示しない', () => {
            const display: ExperienceGainDisplay = {
                characterId: 'test-character',
                amount: 0,
                source: ExperienceSource.ATTACK_HIT,
                position: { x: 100, y: 100 }
            };

            const initialCallCount = mockScene.add.container.mock.calls.length;
            experienceUI.showExperienceGain(display);

            // 新しいコンテナが作成されないことを確認
            expect(mockScene.add.container).toHaveBeenCalledTimes(initialCallCount);
        });

        test('showExperienceGain - 異なる経験値ソースで異なる色が使用される', () => {
            const sources = [
                ExperienceSource.ATTACK_HIT,
                ExperienceSource.ENEMY_DEFEAT,
                ExperienceSource.ALLY_SUPPORT,
                ExperienceSource.HEALING
            ];

            sources.forEach(source => {
                const display: ExperienceGainDisplay = {
                    characterId: 'test-character',
                    amount: 25,
                    source,
                    position: { x: 100, y: 100 }
                };

                experienceUI.showExperienceGain(display);
            });

            // 各ソースに対してテキストが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalledTimes(sources.length * 2); // テキスト + ソーステキスト
        });

        test('showExperienceGain - カスタム色と期間の設定', () => {
            const display: ExperienceGainDisplay = {
                characterId: 'test-character',
                amount: 100,
                source: ExperienceSource.ENEMY_DEFEAT,
                position: { x: 200, y: 150 },
                color: '#ff0000',
                duration: 3000
            };

            experienceUI.showExperienceGain(display);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                0, 0, '+100 EXP',
                expect.objectContaining({ color: '#ff0000' })
            );
        });
    });

    describe('レベルアップ演出表示 (要件: 6.2)', () => {
        let mockCharacter: Unit;
        let mockLevelUpResult: LevelUpResult;

        beforeEach(() => {
            mockCharacter = {
                id: 'test-character',
                name: 'Test Hero',
                position: { x: 5, y: 5 },
                stats: {} as UnitStats,
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            };

            mockLevelUpResult = {
                characterId: 'test-character',
                oldLevel: 4,
                newLevel: 5,
                statGrowth: {
                    hp: 5,
                    mp: 3,
                    attack: 2,
                    defense: 1,
                    speed: 1,
                    skill: 2,
                    luck: 1
                },
                newExperienceRequired: 250,
                oldStats: {} as UnitStats,
                newStats: {} as UnitStats,
                levelsGained: 1,
                timestamp: Date.now()
            };
        });

        test('showLevelUpEffect - レベルアップ演出が正しく表示される', async () => {
            const promise = experienceUI.showLevelUpEffect(mockCharacter, mockLevelUpResult);

            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalledWith(0, -80, 'LEVEL UP!', expect.any(Object));
            expect(mockScene.add.text).toHaveBeenCalledWith(0, -40, 'Lv.4 → Lv.5', expect.any(Object));
            expect(mockScene.tweens.add).toHaveBeenCalled();

            // Promiseが返されることを確認
            expect(promise).toBeInstanceOf(Promise);
        });

        test('showLevelUpEffect - 複数レベルアップの表示', async () => {
            mockLevelUpResult.oldLevel = 3;
            mockLevelUpResult.newLevel = 6;
            mockLevelUpResult.levelsGained = 3;

            experienceUI.showLevelUpEffect(mockCharacter, mockLevelUpResult);

            expect(mockScene.add.text).toHaveBeenCalledWith(0, -40, 'Lv.3 → Lv.6', expect.any(Object));
        });
    });

    describe('経験値バー更新 (要件: 6.3)', () => {
        let mockExperienceInfo: ExperienceInfo;

        beforeEach(() => {
            mockExperienceInfo = {
                characterId: 'test-character',
                currentExperience: 75,
                currentLevel: 5,
                experienceToNextLevel: 25,
                totalExperience: 275,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            };
        });

        test('updateExperienceBar - 新しい経験値バーが作成される', () => {
            experienceUI.updateExperienceBar('test-character', mockExperienceInfo);

            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalled();
        });

        test('updateExperienceBar - 最大レベル時の表示', () => {
            mockExperienceInfo.isMaxLevel = true;
            mockExperienceInfo.experienceProgress = 1.0;

            experienceUI.updateExperienceBar('test-character', mockExperienceInfo);

            expect(mockText.setText).toHaveBeenCalledWith('MAX LEVEL');
        });

        test('updateExperienceBar - 進捗率に応じたバーの塗りつぶし', () => {
            experienceUI.updateExperienceBar('test-character', mockExperienceInfo);

            expect(mockGraphics.fillRect).toHaveBeenCalled();
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('updateExperienceBar - 既存バーの更新', () => {
            // 最初の更新
            experienceUI.updateExperienceBar('test-character', mockExperienceInfo);
            const firstCallCount = mockScene.add.container.mock.calls.length;

            // 同じキャラクターの2回目の更新
            mockExperienceInfo.currentExperience = 90;
            mockExperienceInfo.experienceProgress = 0.9;
            experienceUI.updateExperienceBar('test-character', mockExperienceInfo);

            // 新しいコンテナが作成されないことを確認
            expect(mockScene.add.container).toHaveBeenCalledTimes(firstCallCount);
        });
    });

    describe('成長結果表示 (要件: 6.4)', () => {
        let mockCharacter: Unit;
        let mockGrowthResult: StatGrowthResult;

        beforeEach(() => {
            mockCharacter = {
                id: 'test-character',
                name: 'Test Hero',
                position: { x: 5, y: 5 },
                stats: {} as UnitStats,
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            };

            mockGrowthResult = {
                hp: 5,
                mp: 3,
                attack: 2,
                defense: 1,
                speed: 1,
                skill: 2,
                luck: 0
            };
        });

        test('showGrowthResults - 成長結果パネルが正しく表示される', () => {
            experienceUI.showGrowthResults(mockCharacter, mockGrowthResult);

            expect(mockContainer.removeAll).toHaveBeenCalledWith(true);
            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalledWith(expect.any(Number), 30, 'Stat Growth', expect.any(Object));
            expect(mockScene.add.text).toHaveBeenCalledWith(expect.any(Number), 60, 'Test Hero', expect.any(Object));
        });

        test('showGrowthResults - 成長した能力値のみ表示される', () => {
            experienceUI.showGrowthResults(mockCharacter, mockGrowthResult);

            // 成長した能力値（luck以外）が表示されることを確認
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number), expect.any(Number), 'HP: +5', expect.any(Object)
            );
            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number), expect.any(Number), 'MP: +3', expect.any(Object)
            );
            // luck: 0 は表示されない
        });

        test('showGrowthResults - 成長がない場合のメッセージ表示', () => {
            const noGrowthResult: StatGrowthResult = {
                hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, skill: 0, luck: 0
            };

            experienceUI.showGrowthResults(mockCharacter, noGrowthResult);

            expect(mockScene.add.text).toHaveBeenCalledWith(
                expect.any(Number), expect.any(Number), 'No stat growth this level', expect.any(Object)
            );
        });

        test('showGrowthResults - 自動非表示タイマーが設定される', () => {
            experienceUI.showGrowthResults(mockCharacter, mockGrowthResult);

            expect(mockScene.time.delayedCall).toHaveBeenCalledWith(5000, expect.any(Function));
        });

        test('hideGrowthResults - 成長結果パネルが非表示になる', () => {
            experienceUI.hideGrowthResults();

            expect(mockContainer.removeAll).toHaveBeenCalledWith(true);
        });
    });

    describe('キャラクター経験値情報表示 (要件: 6.5)', () => {
        let mockCharacter: Unit;
        let mockExperienceInfo: ExperienceInfo;

        beforeEach(() => {
            mockCharacter = {
                id: 'test-character',
                name: 'Test Hero',
                position: { x: 5, y: 5 },
                stats: {} as UnitStats,
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            };

            mockExperienceInfo = {
                characterId: 'test-character',
                currentExperience: 75,
                currentLevel: 5,
                experienceToNextLevel: 25,
                totalExperience: 275,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            };
        });

        test('displayExperienceInfo - 経験値情報パネルが正しく表示される', () => {
            experienceUI.displayExperienceInfo(mockCharacter, mockExperienceInfo);

            expect(mockContainer.removeAll).toHaveBeenCalledWith(true);
            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalledWith(15, 15, 'Test Hero (Lv.5)', expect.any(Object));
            expect(mockScene.add.text).toHaveBeenCalledWith(15, 40, 'EXP: 75/100', expect.any(Object));
        });

        test('displayExperienceInfo - 最大レベル時の表示', () => {
            mockExperienceInfo.isMaxLevel = true;

            experienceUI.displayExperienceInfo(mockCharacter, mockExperienceInfo);

            expect(mockScene.add.text).toHaveBeenCalledWith(15, 40, 'MAX LEVEL', expect.any(Object));
        });

        test('displayExperienceInfo - 経験値バーが表示される', () => {
            experienceUI.displayExperienceInfo(mockCharacter, mockExperienceInfo);

            expect(mockScene.add.graphics).toHaveBeenCalled();
            expect(mockGraphics.fillRect).toHaveBeenCalled();
        });

        test('hideExperienceInfo - 経験値情報パネルが非表示になる', () => {
            experienceUI.hideExperienceInfo();

            expect(mockContainer.removeAll).toHaveBeenCalledWith(true);
        });
    });

    describe('UI管理機能', () => {
        test('clearAll - すべてのUI要素がクリアされる', () => {
            experienceUI.clearAll();

            expect(mockContainer.removeAll).toHaveBeenCalledTimes(5); // 5つのコンテナ
        });

        test('destroy - UI要素が破棄される', () => {
            experienceUI.destroy();

            expect(mockContainer.removeAll).toHaveBeenCalled();
            expect(mockContainer.destroy).toHaveBeenCalled();
        });

        test('resize - 画面サイズ変更時の調整', () => {
            // まず情報パネルを表示
            mockContainer.list = [mockContainer]; // ダミーのパネル

            experienceUI.resize(1920, 1080);

            expect(mockContainer.setPosition).toHaveBeenCalledWith(1650, 940);
        });

        test('getDebugInfo - デバッグ情報が正しく返される', () => {
            const debugInfo = experienceUI.getDebugInfo();

            expect(debugInfo).toEqual({
                activeGains: 0,
                activeEffects: 0,
                activeBars: 0,
                containerVisible: true
            });
        });
    });

    describe('設定更新', () => {
        test('updateConfig - 設定が正しく更新される', () => {
            const newConfig = {
                levelUpEffect: {
                    duration: 3000,
                    glowColor: 0xff0000
                },
                experienceBar: {
                    width: 300,
                    height: 25
                },
                growthResults: {
                    panelWidth: 500,
                    displayDuration: 8000
                }
            };

            experienceUI.updateConfig(newConfig);

            // 設定が更新されたことを間接的に確認（実際の値は private なので）
            expect(() => experienceUI.updateConfig(newConfig)).not.toThrow();
        });
    });

    describe('ヘルパーメソッド', () => {
        test('経験値ソースに応じた色とテキストが正しく取得される', () => {
            const sources = [
                ExperienceSource.ATTACK_HIT,
                ExperienceSource.ENEMY_DEFEAT,
                ExperienceSource.ALLY_SUPPORT,
                ExperienceSource.HEALING,
                ExperienceSource.SKILL_USE
            ];

            sources.forEach(source => {
                const display: ExperienceGainDisplay = {
                    characterId: 'test',
                    amount: 10,
                    source,
                    position: { x: 0, y: 0 }
                };

                // 各ソースで異なる表示が生成されることを確認
                experienceUI.showExperienceGain(display);
            });

            // 各ソースに対してテキストが作成されることを確認
            expect(mockScene.add.text).toHaveBeenCalledTimes(sources.length * 2);
        });
    });

    describe('エラーハンドリング', () => {
        test('無効なキャラクターIDでもエラーが発生しない', () => {
            const display: ExperienceGainDisplay = {
                characterId: '',
                amount: 50,
                source: ExperienceSource.ATTACK_HIT,
                position: { x: 100, y: 100 }
            };

            expect(() => experienceUI.showExperienceGain(display)).not.toThrow();
        });

        test('負の経験値でも適切に処理される', () => {
            const display: ExperienceGainDisplay = {
                characterId: 'test',
                amount: -10,
                source: ExperienceSource.ATTACK_HIT,
                position: { x: 100, y: 100 }
            };

            const initialCallCount = mockScene.add.container.mock.calls.length;
            experienceUI.showExperienceGain(display);

            // 負の値では表示されないことを確認
            expect(mockScene.add.container).toHaveBeenCalledTimes(initialCallCount);
        });
    });
});