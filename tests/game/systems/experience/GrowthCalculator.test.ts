/**
 * GrowthCalculator のユニットテスト
 * 能力値成長計算システムの正確性と一貫性をテストする
 */

import { GrowthCalculator } from '../../../../game/src/systems/experience/GrowthCalculator';
import {
    GrowthRates,
    StatGrowthResult,
    GrowthRateData,
    StatLimits
} from '../../../../game/src/types/experience';
import { UnitStats } from '../../../../game/src/types/gameplay';

describe('GrowthCalculator', () => {
    let growthCalculator: GrowthCalculator;
    let mockGrowthRateData: GrowthRateData;
    let mockBaseStats: UnitStats;
    let mockGrowthRates: GrowthRates;

    beforeEach(() => {
        growthCalculator = new GrowthCalculator();

        mockGrowthRateData = {
            characterGrowthRates: {
                'test_character': {
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

        mockBaseStats = {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3
        };

        mockGrowthRates = {
            hp: 80,
            mp: 60,
            attack: 70,
            defense: 50,
            speed: 40,
            skill: 65,
            luck: 30
        };

        growthCalculator.loadGrowthRateData(mockGrowthRateData);
    });

    describe('loadGrowthRateData', () => {
        test('should load growth rate data successfully', () => {
            const newCalculator = new GrowthCalculator();
            expect(newCalculator.isDataLoaded()).toBe(false);

            newCalculator.loadGrowthRateData(mockGrowthRateData);
            expect(newCalculator.isDataLoaded()).toBe(true);
        });
    });

    describe('getGrowthRates', () => {
        test('should return character-specific growth rates', () => {
            const growthRates = growthCalculator.getGrowthRates('test_character', 1);

            expect(growthRates).toEqual({
                hp: 80,
                mp: 60,
                attack: 70,
                defense: 50,
                speed: 40,
                skill: 65,
                luck: 30
            });
        });

        test('should return job class growth rates when character not found', () => {
            const growthRates = growthCalculator.getGrowthRates('unknown_character', 1, 'warrior');

            expect(growthRates).toEqual({
                hp: 75,
                mp: 45,
                attack: 75,
                defense: 70,
                speed: 55,
                skill: 60,
                luck: 40
            });
        });

        test('should return default growth rates when neither character nor job class found', () => {
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

        test('should throw error when growth rate data not loaded', () => {
            const newCalculator = new GrowthCalculator();

            expect(() => {
                newCalculator.getGrowthRates('test_character', 1);
            }).toThrow('Growth rate data not loaded');
        });
    });

    describe('generateRandomGrowth', () => {
        test('should return 0 or 1', () => {
            for (let i = 0; i < 100; i++) {
                const growth = growthCalculator.generateRandomGrowth(50);
                expect(growth).toBeOneOf([0, 1]);
            }
        });

        test('should return 1 for 100% growth rate', () => {
            const growth = growthCalculator.generateRandomGrowth(100);
            expect(growth).toBe(1);
        });

        test('should return 0 for 0% growth rate', () => {
            const growth = growthCalculator.generateRandomGrowth(0);
            expect(growth).toBe(0);
        });

        test('should handle negative growth rates', () => {
            const growth = growthCalculator.generateRandomGrowth(-10);
            expect(growth).toBe(0);
        });

        test('should handle growth rates over 100', () => {
            const growth = growthCalculator.generateRandomGrowth(150);
            expect(growth).toBe(1);
        });

        test('should have approximately correct probability distribution', () => {
            const growthRate = 70;
            const trials = 10000;
            let successes = 0;

            for (let i = 0; i < trials; i++) {
                if (growthCalculator.generateRandomGrowth(growthRate) === 1) {
                    successes++;
                }
            }

            const actualRate = (successes / trials) * 100;
            // 70%の成長率で、±5%の誤差を許容
            expect(actualRate).toBeGreaterThan(65);
            expect(actualRate).toBeLessThan(75);
        });
    });

    describe('calculateStatGrowth', () => {
        test('should return valid stat growth result', () => {
            const growth = growthCalculator.calculateStatGrowth(mockBaseStats, mockGrowthRates);

            expect(growth).toHaveProperty('hp');
            expect(growth).toHaveProperty('mp');
            expect(growth).toHaveProperty('attack');
            expect(growth).toHaveProperty('defense');
            expect(growth).toHaveProperty('speed');
            expect(growth).toHaveProperty('skill');
            expect(growth).toHaveProperty('luck');

            // 各成長値は0または1
            Object.values(growth).forEach(value => {
                expect(value).toBeOneOf([0, 1]);
            });
        });

        test('should respect stat limits', () => {
            const highStats: UnitStats = {
                maxHP: 998,
                maxMP: 998,
                attack: 98,
                defense: 98,
                speed: 98,
                movement: 3
            };

            const maxGrowthRates: GrowthRates = {
                hp: 100,
                mp: 100,
                attack: 100,
                defense: 100,
                speed: 100,
                skill: 100,
                luck: 100
            };

            const growth = growthCalculator.calculateStatGrowth(highStats, maxGrowthRates);

            // 上限に近い場合、成長が制限される
            expect(highStats.maxHP + growth.hp).toBeLessThanOrEqual(999);
            expect(highStats.maxMP + growth.mp).toBeLessThanOrEqual(999);
            expect(highStats.attack + growth.attack).toBeLessThanOrEqual(99);
            expect(highStats.defense + growth.defense).toBeLessThanOrEqual(99);
            expect(highStats.speed + growth.speed).toBeLessThanOrEqual(99);
        });

        test('should handle stats at maximum limits', () => {
            const maxStats: UnitStats = {
                maxHP: 999,
                maxMP: 999,
                attack: 99,
                defense: 99,
                speed: 99,
                movement: 3
            };

            const maxGrowthRates: GrowthRates = {
                hp: 100,
                mp: 100,
                attack: 100,
                defense: 100,
                speed: 100,
                skill: 100,
                luck: 100
            };

            const growth = growthCalculator.calculateStatGrowth(maxStats, maxGrowthRates);

            // 最大値の場合、成長しない
            expect(growth.hp).toBe(0);
            expect(growth.mp).toBe(0);
            expect(growth.attack).toBe(0);
            expect(growth.defense).toBe(0);
            expect(growth.speed).toBe(0);
            // skill と luck は UnitStats に含まれないため、通常通り成長
            expect(growth.skill).toBeOneOf([0, 1]);
            expect(growth.luck).toBeOneOf([0, 1]);
        });
    });

    describe('enforceStatLimits', () => {
        test('should not modify stats below limits', () => {
            const normalStats: UnitStats = {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 10,
                movement: 3
            };

            const limitedStats = growthCalculator.enforceStatLimits(normalStats);
            expect(limitedStats).toEqual(normalStats);
        });

        test('should limit stats above maximum', () => {
            const highStats: UnitStats = {
                maxHP: 1500,
                maxMP: 1200,
                attack: 150,
                defense: 120,
                speed: 110,
                movement: 3
            };

            const limitedStats = growthCalculator.enforceStatLimits(highStats);

            expect(limitedStats.maxHP).toBe(999);
            expect(limitedStats.maxMP).toBe(999);
            expect(limitedStats.attack).toBe(99);
            expect(limitedStats.defense).toBe(99);
            expect(limitedStats.speed).toBe(99);
            expect(limitedStats.movement).toBe(3); // 移動力は制限されない
        });

        test('should return original stats when data not loaded', () => {
            const newCalculator = new GrowthCalculator();
            const stats: UnitStats = {
                maxHP: 1500,
                maxMP: 1200,
                attack: 150,
                defense: 120,
                speed: 110,
                movement: 3
            };

            const limitedStats = newCalculator.enforceStatLimits(stats);
            expect(limitedStats).toEqual(stats);
        });
    });

    describe('getStatLimits', () => {
        test('should return stat limits when data loaded', () => {
            const limits = growthCalculator.getStatLimits();

            expect(limits).toEqual({
                maxHP: 999,
                maxMP: 999,
                attack: 99,
                defense: 99,
                speed: 99,
                skill: 99,
                luck: 99
            });
        });

        test('should return null when data not loaded', () => {
            const newCalculator = new GrowthCalculator();
            const limits = newCalculator.getStatLimits();

            expect(limits).toBeNull();
        });
    });

    describe('isDataLoaded', () => {
        test('should return true when data is loaded', () => {
            expect(growthCalculator.isDataLoaded()).toBe(true);
        });

        test('should return false when data is not loaded', () => {
            const newCalculator = new GrowthCalculator();
            expect(newCalculator.isDataLoaded()).toBe(false);
        });
    });

    describe('clearData', () => {
        test('should clear loaded data', () => {
            expect(growthCalculator.isDataLoaded()).toBe(true);

            growthCalculator.clearData();
            expect(growthCalculator.isDataLoaded()).toBe(false);
        });
    });

    describe('calculateCumulativeGrowth', () => {
        test('should calculate cumulative growth for multiple level ups', () => {
            // 確定的な成長をテストするため、100%成長率を使用
            const certainGrowthRates: GrowthRates = {
                hp: 100,
                mp: 100,
                attack: 100,
                defense: 100,
                speed: 100,
                skill: 100,
                luck: 100
            };

            const cumulativeGrowth = growthCalculator.calculateCumulativeGrowth(
                mockBaseStats,
                certainGrowthRates,
                3
            );

            expect(cumulativeGrowth.hp).toBe(3);
            expect(cumulativeGrowth.mp).toBe(3);
            expect(cumulativeGrowth.attack).toBe(3);
            expect(cumulativeGrowth.defense).toBe(3);
            expect(cumulativeGrowth.speed).toBe(3);
            expect(cumulativeGrowth.skill).toBe(3);
            expect(cumulativeGrowth.luck).toBe(3);
        });

        test('should handle zero level ups', () => {
            const cumulativeGrowth = growthCalculator.calculateCumulativeGrowth(
                mockBaseStats,
                mockGrowthRates,
                0
            );

            expect(cumulativeGrowth.hp).toBe(0);
            expect(cumulativeGrowth.mp).toBe(0);
            expect(cumulativeGrowth.attack).toBe(0);
            expect(cumulativeGrowth.defense).toBe(0);
            expect(cumulativeGrowth.speed).toBe(0);
            expect(cumulativeGrowth.skill).toBe(0);
            expect(cumulativeGrowth.luck).toBe(0);
        });

        test('should respect stat limits in cumulative growth', () => {
            const highBaseStats: UnitStats = {
                maxHP: 997,
                maxMP: 997,
                attack: 97,
                defense: 97,
                speed: 97,
                movement: 3
            };

            const certainGrowthRates: GrowthRates = {
                hp: 100,
                mp: 100,
                attack: 100,
                defense: 100,
                speed: 100,
                skill: 100,
                luck: 100
            };

            const cumulativeGrowth = growthCalculator.calculateCumulativeGrowth(
                highBaseStats,
                certainGrowthRates,
                5
            );

            // 上限により成長が制限される
            expect(cumulativeGrowth.hp).toBeLessThanOrEqual(2); // 999 - 997 = 2
            expect(cumulativeGrowth.mp).toBeLessThanOrEqual(2); // 999 - 997 = 2
            expect(cumulativeGrowth.attack).toBeLessThanOrEqual(2); // 99 - 97 = 2
            expect(cumulativeGrowth.defense).toBeLessThanOrEqual(2); // 99 - 97 = 2
            expect(cumulativeGrowth.speed).toBeLessThanOrEqual(2); // 99 - 97 = 2
        });
    });

    describe('calculateExpectedGrowth', () => {
        test('should calculate expected growth values', () => {
            const expectedGrowth = growthCalculator.calculateExpectedGrowth(mockGrowthRates, 10);

            expect(expectedGrowth.hp).toBe(8); // 80% * 10 = 8
            expect(expectedGrowth.mp).toBe(6); // 60% * 10 = 6
            expect(expectedGrowth.attack).toBe(7); // 70% * 10 = 7
            expect(expectedGrowth.defense).toBe(5); // 50% * 10 = 5
            expect(expectedGrowth.speed).toBe(4); // 40% * 10 = 4
            expect(expectedGrowth.skill).toBe(7); // 65% * 10 = 6.5 → 7
            expect(expectedGrowth.luck).toBe(3); // 30% * 10 = 3
        });

        test('should handle single level up', () => {
            const expectedGrowth = growthCalculator.calculateExpectedGrowth(mockGrowthRates, 1);

            expect(expectedGrowth.hp).toBe(1); // 80% * 1 = 0.8 → 1
            expect(expectedGrowth.mp).toBe(1); // 60% * 1 = 0.6 → 1
            expect(expectedGrowth.attack).toBe(1); // 70% * 1 = 0.7 → 1
            expect(expectedGrowth.defense).toBe(1); // 50% * 1 = 0.5 → 1
            expect(expectedGrowth.speed).toBe(0); // 40% * 1 = 0.4 → 0
            expect(expectedGrowth.skill).toBe(1); // 65% * 1 = 0.65 → 1
            expect(expectedGrowth.luck).toBe(0); // 30% * 1 = 0.3 → 0
        });

        test('should handle zero level ups', () => {
            const expectedGrowth = growthCalculator.calculateExpectedGrowth(mockGrowthRates, 0);

            expect(expectedGrowth.hp).toBe(0);
            expect(expectedGrowth.mp).toBe(0);
            expect(expectedGrowth.attack).toBe(0);
            expect(expectedGrowth.defense).toBe(0);
            expect(expectedGrowth.speed).toBe(0);
            expect(expectedGrowth.skill).toBe(0);
            expect(expectedGrowth.luck).toBe(0);
        });
    });

    describe('integration tests', () => {
        test('should maintain consistency across multiple calculations', () => {
            // 同じ入力で複数回計算しても、構造は一貫している
            for (let i = 0; i < 10; i++) {
                const growth = growthCalculator.calculateStatGrowth(mockBaseStats, mockGrowthRates);

                expect(typeof growth.hp).toBe('number');
                expect(typeof growth.mp).toBe('number');
                expect(typeof growth.attack).toBe('number');
                expect(typeof growth.defense).toBe('number');
                expect(typeof growth.speed).toBe('number');
                expect(typeof growth.skill).toBe('number');
                expect(typeof growth.luck).toBe('number');

                expect(growth.hp).toBeGreaterThanOrEqual(0);
                expect(growth.mp).toBeGreaterThanOrEqual(0);
                expect(growth.attack).toBeGreaterThanOrEqual(0);
                expect(growth.defense).toBeGreaterThanOrEqual(0);
                expect(growth.speed).toBeGreaterThanOrEqual(0);
                expect(growth.skill).toBeGreaterThanOrEqual(0);
                expect(growth.luck).toBeGreaterThanOrEqual(0);
            }
        });

        test('should work with real character data structure', () => {
            const realCharacterGrowthRates = growthCalculator.getGrowthRates('test_character', 5);
            const growth = growthCalculator.calculateStatGrowth(mockBaseStats, realCharacterGrowthRates);

            expect(growth).toBeDefined();
            expect(Object.keys(growth)).toHaveLength(7);
        });
    });
});

// カスタムマッチャーの追加
expect.extend({
    toBeOneOf(received: any, expected: any[]) {
        const pass = expected.includes(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be one of ${expected}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be one of ${expected}`,
                pass: false,
            };
        }
    },
});

declare global {
    namespace jest {
        interface Matchers<R> {
            toBeOneOf(expected: any[]): R;
        }
    }
}