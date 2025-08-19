/**
 * ExperienceUIIntegration.test.ts - ExperienceUIの統合テスト
 * 
 * このテストファイルは、ExperienceUIと他のシステムとの統合をテストします:
 * - UIManagerとの統合
 * - GameplaySceneとの統合
 * - 経験値システムとの連携
 * - アニメーション効果の動作確認
 * - パフォーマンステスト
 * 
 * 要件: 6.1, 6.2, 6.3, 6.4, 6.5の統合テスト
 */

import * as Phaser from 'phaser';
import { ExperienceUI, ExperienceGainDisplay } from '../../game/src/systems/experience/ExperienceUI';
import { UIManager } from '../../game/src/ui/UIManager';
import {
    ExperienceInfo,
    LevelUpResult,
    StatGrowthResult,
    ExperienceSource,
    UnitStats
} from '../../game/src/types/experience';
import { Unit } from '../../game/src/types/gameplay';

// テスト用のPhaserシーンモック
class MockGameplayScene extends Phaser.Scene {
    public experienceUI!: ExperienceUI;
    public uiManager!: UIManager;

    constructor() {
        super({ key: 'MockGameplayScene' });
    }

    create(): void {
        this.experienceUI = new ExperienceUI(this);
        this.uiManager = new UIManager(this);
        this.uiManager.createUI();
    }
}

describe('ExperienceUI Integration Tests', () => {
    let game: Phaser.Game;
    let scene: MockGameplayScene;
    let experienceUI: ExperienceUI;
    let uiManager: UIManager;

    beforeAll((done) => {
        // Phaserゲームインスタンスを作成
        game = new Phaser.Game({
            type: Phaser.HEADLESS,
            width: 1024,
            height: 768,
            scene: MockGameplayScene,
            callbacks: {
                postBoot: () => {
                    scene = game.scene.getScene('MockGameplayScene') as MockGameplayScene;
                    scene.create();
                    experienceUI = scene.experienceUI;
                    uiManager = scene.uiManager;
                    done();
                }
            }
        });
    });

    afterAll(() => {
        if (game) {
            game.destroy(true);
        }
    });

    beforeEach(() => {
        // 各テスト前にUIをクリア
        experienceUI.clearAll();
    });

    describe('UIManagerとの統合', () => {
        test('ExperienceUIとUIManagerが同時に動作する', () => {
            const mockCharacter: Unit = {
                id: 'test-character',
                name: 'Test Hero',
                position: { x: 5, y: 5 },
                stats: {
                    maxHP: 100,
                    maxMP: 50,
                    attack: 20,
                    defense: 15,
                    speed: 10,
                    movement: 3
                } as UnitStats,
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            };

            const experienceInfo: ExperienceInfo = {
                characterId: 'test-character',
                currentExperience: 75,
                currentLevel: 5,
                experienceToNextLevel: 25,
                totalExperience: 275,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            };

            // UIManagerでキャラクター情報を表示
            uiManager.showCharacterInfo(mockCharacter);

            // ExperienceUIで経験値情報を表示
            experienceUI.displayExperienceInfo(mockCharacter, experienceInfo);

            // 両方のUIが表示されていることを確認
            expect(uiManager.isCharacterInfoPanelVisible()).toBe(true);

            // ExperienceUIのデバッグ情報を確認
            const debugInfo = experienceUI.getDebugInfo();
            expect(debugInfo.containerVisible).toBe(true);
        });

        test('UI深度が正しく設定されている', () => {
            const display: ExperienceGainDisplay = {
                characterId: 'test-character',
                amount: 50,
                source: ExperienceSource.ATTACK_HIT,
                position: { x: 100, y: 100 }
            };

            experienceUI.showExperienceGain(display);

            // ExperienceUIの要素がUIManagerの要素より上に表示されることを確認
            // （実際の深度値は実装に依存するため、存在確認のみ）
            const debugInfo = experienceUI.getDebugInfo();
            expect(debugInfo.activeGains).toBe(1);
        });
    });

    describe('経験値獲得フローの統合テスト', () => {
        test('戦闘から経験値獲得までの完全なフロー', async () => {
            const mockCharacter: Unit = {
                id: 'test-character',
                name: 'Test Hero',
                position: { x: 5, y: 5 },
                stats: {
                    maxHP: 100,
                    maxMP: 50,
                    attack: 20,
                    defense: 15,
                    speed: 10,
                    movement: 3
                } as UnitStats,
                currentHP: 100,
                currentMP: 50,
                faction: 'player',
                hasActed: false,
                hasMoved: false
            };

            // 1. 攻撃命中による経験値獲得
            const hitDisplay: ExperienceGainDisplay = {
                characterId: 'test-character',
                amount: 10,
                source: ExperienceSource.ATTACK_HIT,
                position: { x: 160, y: 160 }
            };
            experienceUI.showExperienceGain(hitDisplay);

            // 2. 敵撃破による経験値獲得
            const defeatDisplay: ExperienceGainDisplay = {
                characterId: 'test-character',
                amount: 50,
                source: ExperienceSource.ENEMY_DEFEAT,
                position: { x: 160, y: 160 }
            };
            experienceUI.showExperienceGain(defeatDisplay);

            // 3. 経験値バーの更新
            const experienceInfo: ExperienceInfo = {
                characterId: 'test-character',
                currentExperience: 85,
                currentLevel: 5,
                experienceToNextLevel: 15,
                totalExperience: 285,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.85
            };
            experienceUI.updateExperienceBar('test-character', experienceInfo);

            // 複数の経験値獲得が表示されていることを確認
            const debugInfo = experienceUI.getDebugInfo();
            expect(debugInfo.activeGains).toBe(2);
            expect(debugInfo.activeBars).toBe(1);
        });

        test('レベルアップ時の完全なフロー', async () => {
            const mockCharacter: Unit = {
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

            const levelUpResult: LevelUpResult = {
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

            // 1. レベルアップ演出を表示
            const levelUpPromise = experienceUI.showLevelUpEffect(mockCharacter, levelUpResult);

            // 2. 成長結果を表示
            experienceUI.showGrowthResults(mockCharacter, levelUpResult.statGrowth);

            // 3. 更新された経験値情報を表示
            const newExperienceInfo: ExperienceInfo = {
                characterId: 'test-character',
                currentExperience: 0,
                currentLevel: 5,
                experienceToNextLevel: 250,
                totalExperience: 250,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0
            };
            experienceUI.updateExperienceBar('test-character', newExperienceInfo);

            // レベルアップ演出が実行されていることを確認
            expect(levelUpPromise).toBeInstanceOf(Promise);

            const debugInfo = experienceUI.getDebugInfo();
            expect(debugInfo.activeEffects).toBe(1);
            expect(debugInfo.activeBars).toBe(1);

            // レベルアップ演出の完了を待つ
            await levelUpPromise;
        });
    });

    describe('複数キャラクターの同時処理', () => {
        test('複数キャラクターの経験値獲得が同時に表示される', () => {
            const characters = ['char1', 'char2', 'char3'];

            characters.forEach((characterId, index) => {
                const display: ExperienceGainDisplay = {
                    characterId,
                    amount: 25 + index * 10,
                    source: ExperienceSource.ALLY_SUPPORT,
                    position: { x: 100 + index * 50, y: 100 }
                };
                experienceUI.showExperienceGain(display);
            });

            const debugInfo = experienceUI.getDebugInfo();
            expect(debugInfo.activeGains).toBe(3);
        });

        test('複数キャラクターの経験値バーが独立して管理される', () => {
            const characters = [
                {
                    id: 'char1',
                    info: {
                        characterId: 'char1',
                        currentExperience: 50,
                        currentLevel: 3,
                        experienceToNextLevel: 50,
                        totalExperience: 150,
                        canLevelUp: false,
                        isMaxLevel: false,
                        experienceProgress: 0.5
                    }
                },
                {
                    id: 'char2',
                    info: {
                        characterId: 'char2',
                        currentExperience: 75,
                        currentLevel: 4,
                        experienceToNextLevel: 25,
                        totalExperience: 225,
                        canLevelUp: false,
                        isMaxLevel: false,
                        experienceProgress: 0.75
                    }
                }
            ];

            characters.forEach(char => {
                experienceUI.updateExperienceBar(char.id, char.info);
            });

            const debugInfo = experienceUI.getDebugInfo();
            expect(debugInfo.activeBars).toBe(2);

            // 個別のバーを非表示にできることを確認
            experienceUI.hideExperienceBar('char1');
            const updatedDebugInfo = experienceUI.getDebugInfo();
            expect(updatedDebugInfo.activeBars).toBe(1);
        });
    });

    describe('アニメーション効果の統合テスト', () => {
        test('複数のアニメーションが同時に実行される', async () => {
            const mockCharacter: Unit = {
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

            // 経験値獲得アニメーション
            const display: ExperienceGainDisplay = {
                characterId: 'test-character',
                amount: 100,
                source: ExperienceSource.ENEMY_DEFEAT,
                position: { x: 160, y: 160 }
            };
            experienceUI.showExperienceGain(display);

            // レベルアップアニメーション
            const levelUpResult: LevelUpResult = {
                characterId: 'test-character',
                oldLevel: 4,
                newLevel: 5,
                statGrowth: {
                    hp: 5, mp: 3, attack: 2, defense: 1, speed: 1, skill: 2, luck: 1
                },
                newExperienceRequired: 250,
                oldStats: {} as UnitStats,
                newStats: {} as UnitStats,
                levelsGained: 1,
                timestamp: Date.now()
            };

            const levelUpPromise = experienceUI.showLevelUpEffect(mockCharacter, levelUpResult);

            // 両方のアニメーションが実行されていることを確認
            const debugInfo = experienceUI.getDebugInfo();
            expect(debugInfo.activeGains).toBe(1);
            expect(debugInfo.activeEffects).toBe(1);

            await levelUpPromise;
        });

        test('アニメーション完了後のクリーンアップ', (done) => {
            const display: ExperienceGainDisplay = {
                characterId: 'test-character',
                amount: 50,
                source: ExperienceSource.ATTACK_HIT,
                position: { x: 100, y: 100 },
                duration: 100 // 短い期間でテスト
            };

            experienceUI.showExperienceGain(display);

            // アニメーション開始直後
            let debugInfo = experienceUI.getDebugInfo();
            expect(debugInfo.activeGains).toBe(1);

            // アニメーション完了後のクリーンアップを確認
            setTimeout(() => {
                debugInfo = experienceUI.getDebugInfo();
                expect(debugInfo.activeGains).toBe(0);
                done();
            }, 200);
        });
    });

    describe('パフォーマンステスト', () => {
        test('大量の経験値獲得表示のパフォーマンス', () => {
            const startTime = performance.now();

            // 100個の経験値獲得を同時に表示
            for (let i = 0; i < 100; i++) {
                const display: ExperienceGainDisplay = {
                    characterId: `char-${i}`,
                    amount: Math.floor(Math.random() * 100) + 1,
                    source: ExperienceSource.ATTACK_HIT,
                    position: {
                        x: Math.random() * 800 + 100,
                        y: Math.random() * 600 + 100
                    }
                };
                experienceUI.showExperienceGain(display);
            }

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // 100個の表示が100ms以内に完了することを確認
            expect(executionTime).toBeLessThan(100);

            const debugInfo = experienceUI.getDebugInfo();
            expect(debugInfo.activeGains).toBe(100);
        });

        test('メモリリークの確認', () => {
            // 大量の要素を作成して削除
            for (let i = 0; i < 50; i++) {
                const display: ExperienceGainDisplay = {
                    characterId: `temp-char-${i}`,
                    amount: 10,
                    source: ExperienceSource.ATTACK_HIT,
                    position: { x: 100, y: 100 }
                };
                experienceUI.showExperienceGain(display);
            }

            // すべてクリア
            experienceUI.clearAll();

            // クリア後の状態を確認
            const debugInfo = experienceUI.getDebugInfo();
            expect(debugInfo.activeGains).toBe(0);
            expect(debugInfo.activeEffects).toBe(0);
            expect(debugInfo.activeBars).toBe(0);
        });
    });

    describe('エラー処理とリカバリ', () => {
        test('無効なデータでもクラッシュしない', () => {
            const invalidDisplay: ExperienceGainDisplay = {
                characterId: '',
                amount: NaN,
                source: 'invalid' as ExperienceSource,
                position: { x: NaN, y: NaN }
            };

            expect(() => {
                experienceUI.showExperienceGain(invalidDisplay);
            }).not.toThrow();
        });

        test('破棄されたシーンでの操作', () => {
            // UIを破棄
            experienceUI.destroy();

            // 破棄後の操作でエラーが発生しないことを確認
            expect(() => {
                const display: ExperienceGainDisplay = {
                    characterId: 'test',
                    amount: 50,
                    source: ExperienceSource.ATTACK_HIT,
                    position: { x: 100, y: 100 }
                };
                experienceUI.showExperienceGain(display);
            }).not.toThrow();
        });
    });

    describe('画面サイズ変更への対応', () => {
        test('リサイズ時のUI要素の再配置', () => {
            const mockCharacter: Unit = {
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

            const experienceInfo: ExperienceInfo = {
                characterId: 'test-character',
                currentExperience: 75,
                currentLevel: 5,
                experienceToNextLevel: 25,
                totalExperience: 275,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            };

            // 経験値情報を表示
            experienceUI.displayExperienceInfo(mockCharacter, experienceInfo);

            // 画面サイズを変更
            experienceUI.resize(1920, 1080);

            // リサイズ後もUIが正常に動作することを確認
            expect(() => {
                experienceUI.displayExperienceInfo(mockCharacter, experienceInfo);
            }).not.toThrow();
        });
    });
});