/**
 * ExperienceDataLoader のユニットテスト
 * 経験値テーブルデータの読み込みと検証機能をテスト
 */

import { ExperienceDataLoader } from '../../../../game/src/systems/experience/ExperienceDataLoader';
import { ExperienceSource, ExperienceError } from '../../../../game/src/types/experience';
import { ExperienceTableSchema } from '../../../../game/src/schemas/experienceTableSchema';

// fetch のモック
global.fetch = jest.fn();

describe('ExperienceDataLoader', () => {
    let loader: ExperienceDataLoader;

    beforeEach(() => {
        loader = new ExperienceDataLoader();
        jest.clearAllMocks();
    });

    const validExperienceTableData: ExperienceTableSchema = {
        version: '1.0.0',
        levelRequirements: [0, 100, 250, 450, 700, 1000],
        experienceGains: {
            attackHit: 5,
            enemyDefeat: 25,
            allySupport: 10,
            healing: 8,
            skillUse: 3,
            criticalHit: 8,
            counterAttack: 6
        },
        maxLevel: 5,
        defaultGrowthRates: {
            hp: 65, mp: 45, attack: 55, defense: 50, speed: 50, skill: 45, luck: 40
        },
        characterGrowthRates: {
            warrior: {
                hp: 80, mp: 20, attack: 70, defense: 65, speed: 45, skill: 40, luck: 35
            },
            mage: {
                hp: 45, mp: 85, attack: 35, defense: 30, speed: 55, skill: 75, luck: 50
            }
        },
        statLimits: {
            hp: 999, mp: 999, attack: 255, defense: 255, speed: 255, skill: 255, luck: 255
        },
        experienceMultipliers: {
            easy: 1.5, normal: 1.0, hard: 0.8, expert: 0.6
        }
    };

    describe('loadExperienceTable', () => {
        test('should load valid experience table successfully', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => validExperienceTableData
            });

            const result = await loader.loadExperienceTable('test-path.json');

            expect(result).toBe(true);
            expect(loader.isDataLoaded()).toBe(true);
            expect(fetch).toHaveBeenCalledWith('test-path.json');
        });

        test('should use default data when file not found', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const result = await loader.loadExperienceTable('missing-file.json');

            expect(result).toBe(true);
            expect(loader.isDataLoaded()).toBe(true);
            expect(loader.getMaxLevel()).toBeGreaterThan(0);
        });

        test('should use default data when fetch fails', async () => {
            (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            const result = await loader.loadExperienceTable('error-file.json');

            expect(result).toBe(false);
            expect(loader.isDataLoaded()).toBe(true);
        });

        test('should use default data when validation fails', async () => {
            const invalidData = {
                version: '1.0.0',
                levelRequirements: [0, -100], // invalid negative value
                experienceGains: {
                    attackHit: 5,
                    enemyDefeat: 25,
                    allySupport: 10,
                    healing: 8
                },
                maxLevel: 1
            };

            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => invalidData
            });

            const result = await loader.loadExperienceTable('invalid-file.json');

            expect(result).toBe(false);
            expect(loader.isDataLoaded()).toBe(true);
        });

        test('should use default path when no path provided', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => validExperienceTableData
            });

            await loader.loadExperienceTable();

            expect(fetch).toHaveBeenCalledWith('data/experience-table.json');
        });
    });

    describe('getRequiredExperience', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should return correct experience for valid levels', () => {
            expect(loader.getRequiredExperience(0)).toBe(0);
            expect(loader.getRequiredExperience(1)).toBe(100);
            expect(loader.getRequiredExperience(3)).toBe(450);
            expect(loader.getRequiredExperience(5)).toBe(1000);
        });

        test('should return max level experience for levels beyond max', () => {
            const maxExp = loader.getRequiredExperience(5);
            expect(loader.getRequiredExperience(10)).toBe(maxExp);
            expect(loader.getRequiredExperience(100)).toBe(maxExp);
        });

        test('should throw error for negative levels', () => {
            expect(() => loader.getRequiredExperience(-1)).toThrow();
        });

        test('should throw error when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(() => emptyLoader.getRequiredExperience(1)).toThrow(ExperienceError.DATA_NOT_FOUND);
        });
    });

    describe('getExperienceGain', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should return correct experience gains for all sources', () => {
            expect(loader.getExperienceGain(ExperienceSource.ATTACK_HIT)).toBe(5);
            expect(loader.getExperienceGain(ExperienceSource.ENEMY_DEFEAT)).toBe(25);
            expect(loader.getExperienceGain(ExperienceSource.ALLY_SUPPORT)).toBe(10);
            expect(loader.getExperienceGain(ExperienceSource.HEALING)).toBe(8);
            expect(loader.getExperienceGain(ExperienceSource.SKILL_USE)).toBe(3);
            expect(loader.getExperienceGain(ExperienceSource.CRITICAL_HIT)).toBe(8);
            expect(loader.getExperienceGain(ExperienceSource.COUNTER_ATTACK)).toBe(6);
        });

        test('should apply difficulty multipliers correctly', () => {
            const baseExp = loader.getExperienceGain(ExperienceSource.ENEMY_DEFEAT, 'normal');
            expect(loader.getExperienceGain(ExperienceSource.ENEMY_DEFEAT, 'easy')).toBe(Math.floor(baseExp * 1.5));
            expect(loader.getExperienceGain(ExperienceSource.ENEMY_DEFEAT, 'hard')).toBe(Math.floor(baseExp * 0.8));
            expect(loader.getExperienceGain(ExperienceSource.ENEMY_DEFEAT, 'expert')).toBe(Math.floor(baseExp * 0.6));
        });

        test('should return 0 for unknown experience sources', () => {
            expect(loader.getExperienceGain('unknown_source' as ExperienceSource)).toBe(0);
        });

        test('should throw error when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(() => emptyLoader.getExperienceGain(ExperienceSource.ATTACK_HIT)).toThrow(ExperienceError.DATA_NOT_FOUND);
        });
    });

    describe('getGrowthRates', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should return character-specific growth rates', () => {
            const warriorRates = loader.getGrowthRates('warrior');
            expect(warriorRates.hp).toBe(80);
            expect(warriorRates.attack).toBe(70);

            const mageRates = loader.getGrowthRates('mage');
            expect(mageRates.mp).toBe(85);
            expect(mageRates.skill).toBe(75);
        });

        test('should return default growth rates for unknown character types', () => {
            const unknownRates = loader.getGrowthRates('unknown');
            expect(unknownRates.hp).toBe(65); // default value
            expect(unknownRates.mp).toBe(45); // default value
        });

        test('should return copy of growth rates (not reference)', () => {
            const rates1 = loader.getGrowthRates('warrior');
            const rates2 = loader.getGrowthRates('warrior');

            rates1.hp = 999;
            expect(rates2.hp).toBe(80); // should not be affected
        });

        test('should throw error when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(() => emptyLoader.getGrowthRates('warrior')).toThrow(ExperienceError.DATA_NOT_FOUND);
        });
    });

    describe('getStatLimit', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should return correct stat limits', () => {
            expect(loader.getStatLimit('hp')).toBe(999);
            expect(loader.getStatLimit('attack')).toBe(255);
            expect(loader.getStatLimit('luck')).toBe(255);
        });

        test('should throw error when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(() => emptyLoader.getStatLimit('hp')).toThrow(ExperienceError.DATA_NOT_FOUND);
        });
    });

    describe('calculateLevelFromExperience', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should calculate correct levels from experience', () => {
            expect(loader.calculateLevelFromExperience(0)).toBe(0);
            expect(loader.calculateLevelFromExperience(50)).toBe(0);
            expect(loader.calculateLevelFromExperience(100)).toBe(1);
            expect(loader.calculateLevelFromExperience(150)).toBe(1);
            expect(loader.calculateLevelFromExperience(250)).toBe(2);
            expect(loader.calculateLevelFromExperience(500)).toBe(3);
            expect(loader.calculateLevelFromExperience(1000)).toBe(5);
            expect(loader.calculateLevelFromExperience(2000)).toBe(5); // max level
        });

        test('should return 0 for negative experience', () => {
            expect(loader.calculateLevelFromExperience(-100)).toBe(0);
        });

        test('should throw error when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(() => emptyLoader.calculateLevelFromExperience(100)).toThrow(ExperienceError.DATA_NOT_FOUND);
        });
    });

    describe('getExperienceToNextLevel', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should calculate correct experience to next level', () => {
            expect(loader.getExperienceToNextLevel(0)).toBe(100);   // 100 - 0
            expect(loader.getExperienceToNextLevel(50)).toBe(50);   // 100 - 50
            expect(loader.getExperienceToNextLevel(100)).toBe(150); // 250 - 100
            expect(loader.getExperienceToNextLevel(200)).toBe(50);  // 250 - 200
        });

        test('should return 0 for max level characters', () => {
            expect(loader.getExperienceToNextLevel(1000)).toBe(0);
            expect(loader.getExperienceToNextLevel(2000)).toBe(0);
        });

        test('should throw error when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(() => emptyLoader.getExperienceToNextLevel(100)).toThrow(ExperienceError.DATA_NOT_FOUND);
        });
    });

    describe('getAvailableCharacterTypes', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should return all available character types', () => {
            const types = loader.getAvailableCharacterTypes();
            expect(types).toContain('warrior');
            expect(types).toContain('mage');
            expect(types).toHaveLength(2);
        });

        test('should throw error when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(() => emptyLoader.getAvailableCharacterTypes()).toThrow(ExperienceError.DATA_NOT_FOUND);
        });
    });

    describe('getExperienceMultiplier', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should return correct multipliers for all difficulties', () => {
            expect(loader.getExperienceMultiplier('easy')).toBe(1.5);
            expect(loader.getExperienceMultiplier('normal')).toBe(1.0);
            expect(loader.getExperienceMultiplier('hard')).toBe(0.8);
            expect(loader.getExperienceMultiplier('expert')).toBe(0.6);
        });

        test('should throw error when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(() => emptyLoader.getExperienceMultiplier('normal')).toThrow(ExperienceError.DATA_NOT_FOUND);
        });
    });

    describe('validateDataIntegrity', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should validate integrity of good data', () => {
            expect(loader.validateDataIntegrity()).toBe(true);
        });

        test('should return false when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(emptyLoader.validateDataIntegrity()).toBe(false);
        });
    });

    describe('getExperienceTableData', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should return copy of experience table data', () => {
            const data = loader.getExperienceTableData();
            expect(data).not.toBeNull();
            expect(data!.version).toBe('1.0.0');
            expect(data!.maxLevel).toBe(5);
        });

        test('should return deep copy (not reference)', () => {
            const data1 = loader.getExperienceTableData();
            const data2 = loader.getExperienceTableData();

            data1!.maxLevel = 999;
            expect(data2!.maxLevel).toBe(5); // should not be affected
        });

        test('should return null when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(emptyLoader.getExperienceTableData()).toBeNull();
        });
    });

    describe('isDataLoaded', () => {
        test('should return false initially', () => {
            expect(loader.isDataLoaded()).toBe(false);
        });

        test('should return true after successful load', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => validExperienceTableData
            });

            await loader.loadExperienceTable();
            expect(loader.isDataLoaded()).toBe(true);
        });

        test('should return true after setting test data', () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
            expect(loader.isDataLoaded()).toBe(true);
        });
    });

    describe('getMaxLevel', () => {
        beforeEach(async () => {
            loader.setExperienceTableForTesting(validExperienceTableData);
        });

        test('should return correct max level', () => {
            expect(loader.getMaxLevel()).toBe(5);
        });

        test('should throw error when data not loaded', () => {
            const emptyLoader = new ExperienceDataLoader();
            expect(() => emptyLoader.getMaxLevel()).toThrow(ExperienceError.DATA_NOT_FOUND);
        });
    });
});