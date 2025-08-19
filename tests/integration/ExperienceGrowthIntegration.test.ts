/**
 * 経験値システムと成長計算システムの統合テスト
 * ExperienceDataLoader、ExperienceManager、GrowthCalculatorの連携をテストする
 */

import { ExperienceDataLoader } from '../../game/src/systems/experience/ExperienceDataLoader';
import { ExperienceManager } from '../../game/src/systems/experience/ExperienceManager';
import { GrowthCalculator } from '../../game/src/systems/experience/GrowthCalculator';
import {
    ExperienceTableData,
    GrowthRateData,
    ExperienceSource,
    GrowthRates,
    StatGrowthResult
} from '../../game/src/types/experience';
import { UnitStats } from '../../game/src/types/gameplay';

describe('Experience and Growth System Integration', () => {
    let experienceDataLoader: ExperienceDataLoader;
    let experienceManager: ExperienceManager;
    let growthCalculator: GrowthCalculator;
    let mockExperienceData: ExperienceTableData;
    let mockGrowthRateData: GrowthRateData;

    beforeEach(() => {
        // モックデータの準備
        mockExperienceData = {
            levelRequirements: [0, 100, 250, 450, 700, 1000, 1400, 1850, 2350, 2900],
            experienceGains: {
                attackHit: 5,
                enemyDefeat: 25,
                allySupport: 10,
                healing: 8
            },
            maxLevel: 9
        };

        mockGrowthRateData = {
            characterGrowthRates: {
                'test_hero': {
                    hp: 80,
                    mp: 60,
                    attack: 70,
                    defense: 50,
                    speed: 40,
                    skill: 65,
                    luck: 30
                }
            },
            jobClassGrowthRates: {
                'warrior': {
                    hp: 75,
                    mp: 45,
                    attack: 75,
                    defense: 70,
                    speed: 55,
                    skill: 60,
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

        // システムの初期化
        experienceDataLoader = new ExperienceDataLoader();
        // テスト用メソッドでモックデータを設定
        experienceDataLoader.setExperienceTableForTesting(mockExperienceData);

        experienceManager = new ExperienceManager(experienceDataLoader);

        growthCalculator = new GrowthCalculator();
        growthCalculator.loadGrowthRateData(mockGrowthRateData);
    });

    describe('System Initialization', () => {
        test('should initialize all systems successfully', () => {
            expect(experienceDataLoader.isDataLoaded()).toBe(true);
            expect(experienceManager.isDataLoaderReady()).toBe(true);
            expect(growthCalculator.isDataLoaded()).toBe(true);
        });

        test('should have consistent max level across systems', () => {
            const maxLevel = experienceDataLoader.getMaxLevel();
            expect(maxLevel).toBe(9);
        });
    });

    describe('Character Experience and Growth Integration', () => {
        beforeEach(() => {
            // テストキャラクターを初期化
            experienceManager.initializeCharacterExperience('test_hero', 1, 0);
        });

        test('should handle level up with stat growth calculation', () => {
            // レベル2に必要な経験値を付与
            const experienceToLevel2 = experienceDataLoader.getRequiredExperience(2);
            experienceManager.addExperience('test_hero', experienceToLevel2, ExperienceSource.ENEMY_DEFEAT);

            // レベルアップが発生したことを確認
            expect(experienceManager.getCurrentLevel('test_hero')).toBe(2);
            expect(experienceManager.canLevelUp('test_hero')).toBe(false);

            // 成長率を取得して能力値成長を計算
            const growthRates = growthCalculator.getGrowthRates('test_hero', 2);
            expect(growthRates).toEqual(mockGrowthRateData.characterGrowthRates['test_hero']);

            // 基本能力値を設定
            const baseStats: UnitStats = {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 10,
                movement: 3
            };

            // 能力値成長を計算
            const statGrowth = growthCalculator.calculateStatGrowth(baseStats, growthRates);

            // 成長結果が有効な範囲内であることを確認
            expect(statGrowth.hp).toBeGreaterThanOrEqual(0);
            expect(statGrowth.hp).toBeLessThanOrEqual(1);
            expect(statGrowth.mp).toBeGreaterThanOrEqual(0);
            expect(statGrowth.mp).toBeLessThanOrEqual(1);
            expect(statGrowth.attack).toBeGreaterThanOrEqual(0);
            expect(statGrowth.attack).toBeLessThanOrEqual(1);
        });

        test('should handle multiple level ups with cumulative growth', () => {
            // レベル9まで一気に経験値を付与
            const experienceToLevel9 = experienceDataLoader.getRequiredExperience(9);
            experienceManager.addExperience('test_hero', experienceToLevel9, ExperienceSource.ENEMY_DEFEAT);

            expect(experienceManager.getCurrentLevel('test_hero')).toBe(9);

            // 複数レベルアップの累積成長を計算
            const growthRates = growthCalculator.getGrowthRates('test_hero', 9);
            const baseStats: UnitStats = {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 10,
                movement: 3
            };

            const cumulativeGrowth = growthCalculator.calculateCumulativeGrowth(
                baseStats,
                growthRates,
                8 // レベル1→9なので8回のレベルアップ
            );

            // 累積成長が妥当な範囲内であることを確認
            expect(cumulativeGrowth.hp).toBeGreaterThanOrEqual(0);
            expect(cumulativeGrowth.hp).toBeLessThanOrEqual(8);
            expect(cumulativeGrowth.mp).toBeGreaterThanOrEqual(0);
            expect(cumulativeGrowth.mp).toBeLessThanOrEqual(8);
        });

        test('should respect max level in both systems', () => {
            // 最大レベルを超える経験値を付与
            const excessiveExperience = experienceDataLoader.getRequiredExperience(9) + 1000;
            experienceManager.addExperience('test_hero', excessiveExperience, ExperienceSource.ENEMY_DEFEAT);

            // 最大レベルで止まることを確認
            expect(experienceManager.getCurrentLevel('test_hero')).toBe(9);
            expect(experienceManager.canLevelUp('test_hero')).toBe(false);
            expect(experienceManager.getExperienceToNextLevel('test_hero')).toBe(0);

            // 最大レベルでも成長計算は可能
            const growthRates = growthCalculator.getGrowthRates('test_hero', 9);
            const baseStats: UnitStats = {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 10,
                movement: 3
            };

            const statGrowth = growthCalculator.calculateStatGrowth(baseStats, growthRates);
            expect(statGrowth).toBeDefined();
        });
    });

    describe('Job Class Growth Integration', () => {
        beforeEach(() => {
            experienceManager.initializeCharacterExperience('unknown_character', 1, 0);
        });

        test('should use job class growth rates for unknown characters', () => {
            const growthRates = growthCalculator.getGrowthRates('unknown_character', 1, 'warrior');

            expect(growthRates).toEqual(mockGrowthRateData.jobClassGrowthRates['warrior']);
        });

        test('should fall back to default rates for unknown job classes', () => {
            const growthRates = growthCalculator.getGrowthRates('unknown_character', 1, 'unknown_job');

            expect(growthRates).toEqual({
                hp: 50,
                mp: 50,
                attack: 50,
                defense: 50,
                speed: 50,
                skill: 50,
                luck: 50
            });
        });
    });

    describe('Experience Gain and Growth Workflow', () => {
        beforeEach(() => {
            experienceManager.initializeCharacterExperience('test_hero', 1, 0);
        });

        test('should simulate complete battle experience and growth workflow', () => {
            const baseStats: UnitStats = {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 10,
                movement: 3
            };

            let currentStats = { ...baseStats };
            let totalGrowth: StatGrowthResult = {
                hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, skill: 0, luck: 0
            };

            // 戦闘シミュレーション：複数の経験値獲得（レベルアップが発生するよう調整）
            const battleActions = [
                { source: ExperienceSource.ATTACK_HIT, count: 20 },
                { source: ExperienceSource.ALLY_SUPPORT, count: 10 },
                { source: ExperienceSource.HEALING, count: 5 },
                { source: ExperienceSource.ENEMY_DEFEAT, count: 5 }
            ];

            battleActions.forEach(action => {
                for (let i = 0; i < action.count; i++) {
                    const gainAmount = experienceDataLoader.getExperienceGain(action.source);
                    const oldLevel = experienceManager.getCurrentLevel('test_hero');

                    experienceManager.addExperience('test_hero', gainAmount, action.source);

                    const newLevel = experienceManager.getCurrentLevel('test_hero');

                    // レベルアップが発生した場合、能力値成長を計算
                    if (newLevel > oldLevel) {
                        const growthRates = growthCalculator.getGrowthRates('test_hero', newLevel);
                        const levelGrowth = growthCalculator.calculateStatGrowth(currentStats, growthRates);

                        // 成長を適用
                        currentStats.maxHP += levelGrowth.hp;
                        currentStats.maxMP += levelGrowth.mp;
                        currentStats.attack += levelGrowth.attack;
                        currentStats.defense += levelGrowth.defense;
                        currentStats.speed += levelGrowth.speed;

                        // 累積成長を記録
                        totalGrowth.hp += levelGrowth.hp;
                        totalGrowth.mp += levelGrowth.mp;
                        totalGrowth.attack += levelGrowth.attack;
                        totalGrowth.defense += levelGrowth.defense;
                        totalGrowth.speed += levelGrowth.speed;
                        totalGrowth.skill += levelGrowth.skill;
                        totalGrowth.luck += levelGrowth.luck;
                    }
                }
            });

            // 最終状態の確認
            const finalExperienceInfo = experienceManager.getExperienceInfo('test_hero');
            expect(finalExperienceInfo.currentLevel).toBeGreaterThan(1);
            expect(finalExperienceInfo.currentExperience).toBeGreaterThan(0);

            // 成長が発生していることを確認
            expect(currentStats.maxHP).toBeGreaterThanOrEqual(baseStats.maxHP);
            expect(currentStats.maxMP).toBeGreaterThanOrEqual(baseStats.maxMP);
            expect(currentStats.attack).toBeGreaterThanOrEqual(baseStats.attack);
            expect(currentStats.defense).toBeGreaterThanOrEqual(baseStats.defense);
            expect(currentStats.speed).toBeGreaterThanOrEqual(baseStats.speed);
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle missing character data gracefully', () => {
            expect(() => {
                experienceManager.getCurrentLevel('nonexistent_character');
            }).toThrow();

            expect(() => {
                growthCalculator.getGrowthRates('nonexistent_character', 1);
            }).not.toThrow(); // GrowthCalculatorはデフォルト値を返す
        });

        test('should handle uninitialized systems', () => {
            const uninitializedGrowthCalculator = new GrowthCalculator();

            expect(() => {
                uninitializedGrowthCalculator.getGrowthRates('test_hero', 1);
            }).toThrow('Growth rate data not loaded');
        });
    });

    describe('Performance Integration', () => {
        test('should handle multiple characters efficiently', () => {
            const characterCount = 100;
            const startTime = Date.now();

            // 大量のキャラクターを初期化
            for (let i = 0; i < characterCount; i++) {
                const characterId = `character_${i}`;
                experienceManager.initializeCharacterExperience(characterId, 1, 0);

                // 経験値付与とレベルアップ
                experienceManager.addExperience(characterId, 100, ExperienceSource.ENEMY_DEFEAT);

                // 成長計算
                const growthRates = growthCalculator.getGrowthRates(characterId, 2, 'warrior');
                const baseStats: UnitStats = {
                    maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3
                };
                growthCalculator.calculateStatGrowth(baseStats, growthRates);
            }

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // 100キャラクターの処理が1秒以内に完了することを確認
            expect(executionTime).toBeLessThan(1000);
            expect(experienceManager.getAllCharacterIds()).toHaveLength(characterCount);
        });
    });

    describe('Data Consistency Integration', () => {
        test('should maintain data consistency across system operations', () => {
            experienceManager.initializeCharacterExperience('consistency_test', 1, 0);

            // 複数回の操作を実行
            for (let i = 0; i < 10; i++) {
                const oldLevel = experienceManager.getCurrentLevel('consistency_test');
                const oldExperience = experienceManager.getCurrentExperience('consistency_test');

                experienceManager.addExperience('consistency_test', 100, ExperienceSource.ENEMY_DEFEAT);

                const newLevel = experienceManager.getCurrentLevel('consistency_test');
                const newExperience = experienceManager.getCurrentExperience('consistency_test');

                // 経験値は常に増加する
                expect(newExperience).toBeGreaterThanOrEqual(oldExperience);

                // レベルは減少しない
                expect(newLevel).toBeGreaterThanOrEqual(oldLevel);

                // 経験値情報の整合性
                const experienceInfo = experienceManager.getExperienceInfo('consistency_test');
                expect(experienceInfo.currentLevel).toBe(newLevel);
                expect(experienceInfo.currentExperience).toBe(newExperience);

                // 成長率データの一貫性
                const growthRates = growthCalculator.getGrowthRates('consistency_test', newLevel, 'warrior');
                expect(growthRates).toBeDefined();
                expect(Object.values(growthRates).every(rate => rate >= 0 && rate <= 100)).toBe(true);
            }
        });
    });
});