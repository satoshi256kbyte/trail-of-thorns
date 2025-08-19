/**
 * ExperienceTableValidator のユニットテスト
 * 経験値テーブルデータの検証機能をテスト
 */

import { ExperienceTableValidator } from '../../../../game/src/systems/experience/ExperienceTableValidator';
import {
    ExperienceTableSchema,
    ExperienceTableValidationError,
    ValidationResult
} from '../../../../game/src/schemas/experienceTableSchema';

describe('ExperienceTableValidator', () => {
    let validator: ExperienceTableValidator;

    beforeEach(() => {
        validator = ExperienceTableValidator.getInstance();
    });

    describe('getInstance', () => {
        test('should return singleton instance', () => {
            const instance1 = ExperienceTableValidator.getInstance();
            const instance2 = ExperienceTableValidator.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('validateExperienceTable', () => {
        const validExperienceTable: ExperienceTableSchema = {
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
                }
            },
            statLimits: {
                hp: 999, mp: 999, attack: 255, defense: 255, speed: 255, skill: 255, luck: 255
            },
            experienceMultipliers: {
                easy: 1.5, normal: 1.0, hard: 0.8, expert: 0.6
            }
        };

        test('should validate correct experience table', () => {
            const result = validator.validateExperienceTable(validExperienceTable);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject null or undefined data', () => {
            const result1 = validator.validateExperienceTable(null);
            const result2 = validator.validateExperienceTable(undefined);

            expect(result1.isValid).toBe(false);
            expect(result2.isValid).toBe(false);
            expect(result1.errors.length).toBeGreaterThan(0);
            expect(result2.errors.length).toBeGreaterThan(0);
        });

        test('should reject data missing required fields', () => {
            const incompleteData = {
                version: '1.0.0',
                levelRequirements: [0, 100, 250]
                // missing other required fields
            };

            const result = validator.validateExperienceTable(incompleteData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === ExperienceTableValidationError.MISSING_REQUIRED_FIELD)).toBe(true);
        });

        test('should reject invalid version format', () => {
            const invalidVersionData = {
                ...validExperienceTable,
                version: 'invalid-version'
            };

            const result = validator.validateExperienceTable(invalidVersionData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === ExperienceTableValidationError.INVALID_VERSION)).toBe(true);
        });

        test('should reject invalid level requirements', () => {
            const invalidLevelData = {
                ...validExperienceTable,
                levelRequirements: [0, 100, 90, 200] // not monotonically increasing
            };

            const result = validator.validateExperienceTable(invalidLevelData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === ExperienceTableValidationError.INVALID_LEVEL_REQUIREMENTS)).toBe(true);
        });

        test('should reject level requirements not starting with 0', () => {
            const invalidStartData = {
                ...validExperienceTable,
                levelRequirements: [10, 100, 250, 450] // doesn't start with 0
            };

            const result = validator.validateExperienceTable(invalidStartData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === ExperienceTableValidationError.INVALID_LEVEL_REQUIREMENTS)).toBe(true);
        });

        test('should reject invalid experience gains', () => {
            const invalidGainsData = {
                ...validExperienceTable,
                experienceGains: {
                    attackHit: -5, // negative value
                    enemyDefeat: 25,
                    allySupport: 10,
                    healing: 8,
                    skillUse: 3,
                    criticalHit: 8,
                    counterAttack: 6
                }
            };

            const result = validator.validateExperienceTable(invalidGainsData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === ExperienceTableValidationError.INVALID_EXPERIENCE_GAINS)).toBe(true);
        });

        test('should reject missing required experience gains', () => {
            const missingGainsData = {
                ...validExperienceTable,
                experienceGains: {
                    attackHit: 5,
                    enemyDefeat: 25
                    // missing allySupport and healing
                }
            };

            const result = validator.validateExperienceTable(missingGainsData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === ExperienceTableValidationError.INVALID_EXPERIENCE_GAINS)).toBe(true);
        });

        test('should reject invalid growth rates', () => {
            const invalidGrowthData = {
                ...validExperienceTable,
                defaultGrowthRates: {
                    hp: 150, // over 100%
                    mp: 45,
                    attack: 55,
                    defense: 50,
                    speed: 50,
                    skill: 45,
                    luck: 40
                }
            };

            const result = validator.validateExperienceTable(invalidGrowthData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === ExperienceTableValidationError.INVALID_GROWTH_RATES)).toBe(true);
        });

        test('should reject mismatched maxLevel and levelRequirements length', () => {
            const mismatchedData = {
                ...validExperienceTable,
                maxLevel: 10, // doesn't match levelRequirements.length - 1
                levelRequirements: [0, 100, 250, 450, 700] // length 5, so maxLevel should be 4
            };

            const result = validator.validateExperienceTable(mismatchedData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.type === ExperienceTableValidationError.INVALID_LEVEL_REQUIREMENTS)).toBe(true);
        });

        test('should generate warnings for unbalanced experience gains', () => {
            const unbalancedData = {
                ...validExperienceTable,
                experienceGains: {
                    attackHit: 50, // higher than enemyDefeat
                    enemyDefeat: 25,
                    allySupport: 10,
                    healing: 8,
                    skillUse: 3,
                    criticalHit: 8,
                    counterAttack: 6
                }
            };

            const result = validator.validateExperienceTable(unbalancedData);

            expect(result.isValid).toBe(true); // still valid, but with warnings
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        test('should generate warnings for extreme growth rates', () => {
            const extremeGrowthData = {
                ...validExperienceTable,
                characterGrowthRates: {
                    overpowered: {
                        hp: 100, mp: 100, attack: 100, defense: 100, speed: 100, skill: 100, luck: 100 // total 700%
                    },
                    underpowered: {
                        hp: 10, mp: 10, attack: 10, defense: 10, speed: 10, skill: 10, luck: 10 // total 70%
                    }
                }
            };

            const result = validator.validateExperienceTable(extremeGrowthData);

            expect(result.isValid).toBe(true);
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings.some(w => w.message.includes('overpowered'))).toBe(true);
            expect(result.warnings.some(w => w.message.includes('underpowered'))).toBe(true);
        });
    });

    describe('validateDataIntegrity', () => {
        const validData: ExperienceTableSchema = {
            version: '1.0.0',
            levelRequirements: [0, 100, 250, 450, 700, 1000],
            experienceGains: {
                attackHit: 5, enemyDefeat: 25, allySupport: 10, healing: 8,
                skillUse: 3, criticalHit: 8, counterAttack: 6
            },
            maxLevel: 5,
            defaultGrowthRates: {
                hp: 65, mp: 45, attack: 55, defense: 50, speed: 50, skill: 45, luck: 40
            },
            characterGrowthRates: {
                warrior: { hp: 80, mp: 20, attack: 70, defense: 65, speed: 45, skill: 40, luck: 35 },
                mage: { hp: 45, mp: 85, attack: 35, defense: 30, speed: 55, skill: 75, luck: 50 },
                archer: { hp: 60, mp: 40, attack: 65, defense: 40, speed: 70, skill: 80, luck: 60 }
            },
            statLimits: {
                hp: 999, mp: 999, attack: 255, defense: 255, speed: 255, skill: 255, luck: 255
            },
            experienceMultipliers: {
                easy: 1.5, normal: 1.0, hard: 0.8, expert: 0.6
            }
        };

        test('should validate data integrity for well-balanced data', () => {
            const result = validator.validateDataIntegrity(validData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should warn about very high maximum experience', () => {
            const highExpData = {
                ...validData,
                levelRequirements: [0, 100000, 500000, 1500000] // very high values
            };

            const result = validator.validateDataIntegrity(highExpData);

            expect(result.isValid).toBe(true);
            expect(result.warnings.some(w => w.message.includes('非常に高く設定されています'))).toBe(true);
        });

        test('should warn about few character types', () => {
            const fewCharactersData = {
                ...validData,
                characterGrowthRates: {
                    warrior: { hp: 80, mp: 20, attack: 70, defense: 65, speed: 45, skill: 40, luck: 35 }
                    // only one character type
                }
            };

            const result = validator.validateDataIntegrity(fewCharactersData);

            expect(result.isValid).toBe(true);
            expect(result.warnings.some(w => w.message.includes('職業の種類'))).toBe(true);
        });

        test('should warn about incorrect difficulty multipliers', () => {
            const wrongMultipliersData = {
                ...validData,
                experienceMultipliers: {
                    easy: 0.8, // should be higher than normal
                    normal: 1.0,
                    hard: 0.8,
                    expert: 0.6
                }
            };

            const result = validator.validateDataIntegrity(wrongMultipliersData);

            expect(result.isValid).toBe(true);
            expect(result.warnings.some(w => w.message.includes('イージーモード'))).toBe(true);
        });
    });

    describe('formatValidationErrors', () => {
        test('should format successful validation', () => {
            const successResult: ValidationResult = {
                isValid: true,
                errors: [],
                warnings: []
            };

            const formatted = validator.formatValidationErrors(successResult);

            expect(formatted).toBe('検証に成功しました。');
        });

        test('should format errors and warnings', () => {
            const failureResult: ValidationResult = {
                isValid: false,
                errors: [
                    {
                        type: ExperienceTableValidationError.INVALID_SCHEMA,
                        message: 'テストエラー',
                        path: 'test.path'
                    }
                ],
                warnings: [
                    {
                        message: 'テスト警告',
                        path: 'test.warning.path',
                        suggestion: 'テスト提案'
                    }
                ]
            };

            const formatted = validator.formatValidationErrors(failureResult);

            expect(formatted).toContain('[エラー] テストエラー (パス: test.path)');
            expect(formatted).toContain('[警告] テスト警告 (パス: test.warning.path) - テスト提案');
        });
    });
});