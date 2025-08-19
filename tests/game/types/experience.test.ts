/**
 * 経験値システム型定義のテスト
 */

import {
    ExperienceSource,
    ExperienceAction,
    ExperienceError,
    ExperienceEventType,
    ExperienceInfo,
    LevelUpResult,
    StatGrowthResult,
    GrowthRates,
    ExperienceTableData,
    ExperienceContext,
    BattleContext,
    ExperienceSystemConfig,
    ExperienceEvent,
    ExperienceCalculationResult,
    LevelUpPrediction,
    ExperienceStatistics,
    UnitStats
} from '../../../game/src/types/experience';

describe('Experience Type Definitions', () => {
    describe('Enums', () => {
        test('ExperienceSource should have all required values', () => {
            expect(ExperienceSource.ATTACK_HIT).toBe('attack_hit');
            expect(ExperienceSource.ENEMY_DEFEAT).toBe('enemy_defeat');
            expect(ExperienceSource.ALLY_SUPPORT).toBe('ally_support');
            expect(ExperienceSource.HEALING).toBe('healing');
            expect(ExperienceSource.SKILL_USE).toBe('skill_use');
            expect(ExperienceSource.TURN_SURVIVAL).toBe('turn_survival');
        });

        test('ExperienceAction should have all required values', () => {
            expect(ExperienceAction.ATTACK).toBe('attack');
            expect(ExperienceAction.DEFEAT).toBe('defeat');
            expect(ExperienceAction.HEAL).toBe('heal');
            expect(ExperienceAction.SUPPORT).toBe('support');
            expect(ExperienceAction.SKILL_CAST).toBe('skill_cast');
            expect(ExperienceAction.BUFF_APPLY).toBe('buff_apply');
            expect(ExperienceAction.DEBUFF_APPLY).toBe('debuff_apply');
        });

        test('ExperienceError should have all required values', () => {
            expect(ExperienceError.DATA_NOT_FOUND).toBe('data_not_found');
            expect(ExperienceError.INVALID_CHARACTER).toBe('invalid_character');
            expect(ExperienceError.MAX_LEVEL_REACHED).toBe('max_level_reached');
            expect(ExperienceError.INVALID_EXPERIENCE_AMOUNT).toBe('invalid_experience_amount');
            expect(ExperienceError.EXPERIENCE_TABLE_INVALID).toBe('experience_table_invalid');
            expect(ExperienceError.GROWTH_RATE_INVALID).toBe('growth_rate_invalid');
            expect(ExperienceError.STAT_LIMIT_EXCEEDED).toBe('stat_limit_exceeded');
            expect(ExperienceError.LEVEL_UP_FAILED).toBe('level_up_failed');
            expect(ExperienceError.SYSTEM_NOT_INITIALIZED).toBe('system_not_initialized');
        });

        test('ExperienceEventType should have all required values', () => {
            expect(ExperienceEventType.EXPERIENCE_GAINED).toBe('experience_gained');
            expect(ExperienceEventType.LEVEL_UP).toBe('level_up');
            expect(ExperienceEventType.STAT_GROWTH).toBe('stat_growth');
            expect(ExperienceEventType.MAX_LEVEL_REACHED).toBe('max_level_reached');
            expect(ExperienceEventType.EXPERIENCE_MULTIPLIER_CHANGED).toBe('experience_multiplier_changed');
        });
    });

    describe('Interface Validation', () => {
        test('ExperienceInfo should have correct structure', () => {
            const experienceInfo: ExperienceInfo = {
                characterId: 'test-character',
                currentExperience: 150,
                currentLevel: 5,
                experienceToNextLevel: 50,
                totalExperience: 150,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.75
            };

            expect(experienceInfo.characterId).toBe('test-character');
            expect(experienceInfo.currentExperience).toBe(150);
            expect(experienceInfo.currentLevel).toBe(5);
            expect(experienceInfo.experienceToNextLevel).toBe(50);
            expect(experienceInfo.totalExperience).toBe(150);
            expect(experienceInfo.canLevelUp).toBe(false);
            expect(experienceInfo.isMaxLevel).toBe(false);
            expect(experienceInfo.experienceProgress).toBe(0.75);
        });

        test('StatGrowthResult should have correct structure', () => {
            const statGrowth: StatGrowthResult = {
                hp: 5,
                mp: 3,
                attack: 2,
                defense: 1,
                speed: 1,
                skill: 2,
                luck: 1
            };

            expect(statGrowth.hp).toBe(5);
            expect(statGrowth.mp).toBe(3);
            expect(statGrowth.attack).toBe(2);
            expect(statGrowth.defense).toBe(1);
            expect(statGrowth.speed).toBe(1);
            expect(statGrowth.skill).toBe(2);
            expect(statGrowth.luck).toBe(1);
        });

        test('GrowthRates should have correct structure', () => {
            const growthRates: GrowthRates = {
                hp: 80,
                mp: 60,
                attack: 70,
                defense: 50,
                speed: 40,
                skill: 65,
                luck: 30
            };

            expect(growthRates.hp).toBe(80);
            expect(growthRates.mp).toBe(60);
            expect(growthRates.attack).toBe(70);
            expect(growthRates.defense).toBe(50);
            expect(growthRates.speed).toBe(40);
            expect(growthRates.skill).toBe(65);
            expect(growthRates.luck).toBe(30);
        });

        test('LevelUpResult should have correct structure', () => {
            const oldStats: UnitStats = {
                maxHP: 100,
                maxMP: 50,
                attack: 20,
                defense: 15,
                speed: 10,
                skill: 12,
                luck: 8
            };

            const newStats: UnitStats = {
                maxHP: 105,
                maxMP: 53,
                attack: 22,
                defense: 16,
                speed: 11,
                skill: 14,
                luck: 9
            };

            const statGrowth: StatGrowthResult = {
                hp: 5,
                mp: 3,
                attack: 2,
                defense: 1,
                speed: 1,
                skill: 2,
                luck: 1
            };

            const levelUpResult: LevelUpResult = {
                characterId: 'test-character',
                oldLevel: 4,
                newLevel: 5,
                statGrowth,
                newExperienceRequired: 250,
                oldStats,
                newStats,
                levelsGained: 1,
                timestamp: Date.now()
            };

            expect(levelUpResult.characterId).toBe('test-character');
            expect(levelUpResult.oldLevel).toBe(4);
            expect(levelUpResult.newLevel).toBe(5);
            expect(levelUpResult.levelsGained).toBe(1);
            expect(levelUpResult.statGrowth).toEqual(statGrowth);
            expect(levelUpResult.oldStats).toEqual(oldStats);
            expect(levelUpResult.newStats).toEqual(newStats);
            expect(typeof levelUpResult.timestamp).toBe('number');
        });

        test('ExperienceTableData should have correct structure', () => {
            const experienceTable: ExperienceTableData = {
                levelRequirements: [0, 100, 250, 450, 700, 1000],
                experienceGains: {
                    attackHit: 5,
                    enemyDefeat: 25,
                    allySupport: 10,
                    healing: 8
                },
                maxLevel: 50
            };

            expect(experienceTable.levelRequirements).toHaveLength(6);
            expect(experienceTable.levelRequirements[0]).toBe(0);
            expect(experienceTable.levelRequirements[5]).toBe(1000);
            expect(experienceTable.experienceGains.attackHit).toBe(5);
            expect(experienceTable.experienceGains.enemyDefeat).toBe(25);
            expect(experienceTable.experienceGains.allySupport).toBe(10);
            expect(experienceTable.experienceGains.healing).toBe(8);
            expect(experienceTable.maxLevel).toBe(50);
        });

        test('ExperienceContext should have correct structure', () => {
            const battleContext: BattleContext = {
                battleId: 'battle-001',
                turnNumber: 3,
                attackerId: 'player-1',
                defenderId: 'enemy-1',
                damageDealt: 25,
                skillId: 'fireball'
            };

            const experienceContext: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                targetId: 'enemy-1',
                amount: 5,
                multiplier: 1.2,
                bonusAmount: 2,
                metadata: { criticalHit: true },
                timestamp: Date.now(),
                battleContext
            };

            expect(experienceContext.source).toBe(ExperienceSource.ATTACK_HIT);
            expect(experienceContext.action).toBe(ExperienceAction.ATTACK);
            expect(experienceContext.targetId).toBe('enemy-1');
            expect(experienceContext.amount).toBe(5);
            expect(experienceContext.multiplier).toBe(1.2);
            expect(experienceContext.bonusAmount).toBe(2);
            expect(experienceContext.metadata?.criticalHit).toBe(true);
            expect(typeof experienceContext.timestamp).toBe('number');
            expect(experienceContext.battleContext).toEqual(battleContext);
        });

        test('ExperienceSystemConfig should have correct structure', () => {
            const config: ExperienceSystemConfig = {
                enableExperienceGain: true,
                experienceMultiplier: 1.0,
                maxLevel: 50,
                debugMode: false,
                autoLevelUp: true,
                showExperiencePopups: true,
                experienceAnimationSpeed: 1.0,
                levelUpAnimationDuration: 2000
            };

            expect(config.enableExperienceGain).toBe(true);
            expect(config.experienceMultiplier).toBe(1.0);
            expect(config.maxLevel).toBe(50);
            expect(config.debugMode).toBe(false);
            expect(config.autoLevelUp).toBe(true);
            expect(config.showExperiencePopups).toBe(true);
            expect(config.experienceAnimationSpeed).toBe(1.0);
            expect(config.levelUpAnimationDuration).toBe(2000);
        });

        test('ExperienceCalculationResult should have correct structure', () => {
            const context: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            const calculationResult: ExperienceCalculationResult = {
                baseAmount: 5,
                multipliedAmount: 6,
                bonusAmount: 2,
                finalAmount: 8,
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                context
            };

            expect(calculationResult.baseAmount).toBe(5);
            expect(calculationResult.multipliedAmount).toBe(6);
            expect(calculationResult.bonusAmount).toBe(2);
            expect(calculationResult.finalAmount).toBe(8);
            expect(calculationResult.source).toBe(ExperienceSource.ATTACK_HIT);
            expect(calculationResult.action).toBe(ExperienceAction.ATTACK);
            expect(calculationResult.context).toEqual(context);
        });

        test('LevelUpPrediction should have correct structure', () => {
            const predictedGrowth: StatGrowthResult = {
                hp: 4,
                mp: 2,
                attack: 1,
                defense: 1,
                speed: 0,
                skill: 2,
                luck: 1
            };

            const prediction: LevelUpPrediction = {
                characterId: 'test-character',
                currentLevel: 5,
                predictedLevel: 6,
                experienceNeeded: 50,
                canLevelUp: true,
                predictedStatGrowth: predictedGrowth
            };

            expect(prediction.characterId).toBe('test-character');
            expect(prediction.currentLevel).toBe(5);
            expect(prediction.predictedLevel).toBe(6);
            expect(prediction.experienceNeeded).toBe(50);
            expect(prediction.canLevelUp).toBe(true);
            expect(prediction.predictedStatGrowth).toEqual(predictedGrowth);
        });

        test('ExperienceStatistics should have correct structure', () => {
            const averageGrowth: StatGrowthResult = {
                hp: 3.5,
                mp: 2.2,
                attack: 1.8,
                defense: 1.2,
                speed: 0.8,
                skill: 1.5,
                luck: 0.9
            };

            const statistics: ExperienceStatistics = {
                totalExperienceGained: 1500,
                experienceBySource: {
                    [ExperienceSource.ATTACK_HIT]: 300,
                    [ExperienceSource.ENEMY_DEFEAT]: 800,
                    [ExperienceSource.ALLY_SUPPORT]: 250,
                    [ExperienceSource.HEALING]: 150,
                    [ExperienceSource.SKILL_USE]: 0,
                    [ExperienceSource.TURN_SURVIVAL]: 0
                },
                experienceByAction: {
                    [ExperienceAction.ATTACK]: 300,
                    [ExperienceAction.DEFEAT]: 800,
                    [ExperienceAction.HEAL]: 150,
                    [ExperienceAction.SUPPORT]: 250,
                    [ExperienceAction.SKILL_CAST]: 0,
                    [ExperienceAction.BUFF_APPLY]: 0,
                    [ExperienceAction.DEBUFF_APPLY]: 0
                },
                totalLevelUps: 8,
                averageStatGrowth: averageGrowth,
                sessionStartTime: Date.now() - 3600000,
                sessionDuration: 3600000
            };

            expect(statistics.totalExperienceGained).toBe(1500);
            expect(statistics.experienceBySource[ExperienceSource.ATTACK_HIT]).toBe(300);
            expect(statistics.experienceBySource[ExperienceSource.ENEMY_DEFEAT]).toBe(800);
            expect(statistics.experienceByAction[ExperienceAction.ATTACK]).toBe(300);
            expect(statistics.experienceByAction[ExperienceAction.DEFEAT]).toBe(800);
            expect(statistics.totalLevelUps).toBe(8);
            expect(statistics.averageStatGrowth).toEqual(averageGrowth);
            expect(typeof statistics.sessionStartTime).toBe('number');
            expect(statistics.sessionDuration).toBe(3600000);
        });
    });

    describe('Type Safety Validation', () => {
        test('should enforce correct enum usage', () => {
            // TypeScriptの型チェックにより、不正な値は使用できない
            const validSource: ExperienceSource = ExperienceSource.ATTACK_HIT;
            const validAction: ExperienceAction = ExperienceAction.ATTACK;
            const validError: ExperienceError = ExperienceError.DATA_NOT_FOUND;

            expect(validSource).toBe('attack_hit');
            expect(validAction).toBe('attack');
            expect(validError).toBe('data_not_found');
        });

        test('should enforce required properties in interfaces', () => {
            // 必須プロパティが不足している場合、TypeScriptコンパイラがエラーを出す
            const experienceInfo: ExperienceInfo = {
                characterId: 'test',
                currentExperience: 100,
                currentLevel: 3,
                experienceToNextLevel: 50,
                totalExperience: 100,
                canLevelUp: false,
                isMaxLevel: false,
                experienceProgress: 0.67
            };

            expect(experienceInfo).toBeDefined();
        });

        test('should allow optional properties', () => {
            const minimalContext: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                timestamp: Date.now()
            };

            const fullContext: ExperienceContext = {
                source: ExperienceSource.ATTACK_HIT,
                action: ExperienceAction.ATTACK,
                targetId: 'enemy-1',
                amount: 5,
                multiplier: 1.2,
                bonusAmount: 2,
                metadata: { test: true },
                timestamp: Date.now(),
                battleContext: {
                    battleId: 'battle-1',
                    turnNumber: 1
                }
            };

            expect(minimalContext.targetId).toBeUndefined();
            expect(fullContext.targetId).toBe('enemy-1');
        });
    });

    describe('Data Validation Helpers', () => {
        test('should validate experience amounts', () => {
            const validAmount = 50;
            const invalidNegativeAmount = -10;
            const invalidZeroAmount = 0;

            expect(validAmount).toBeGreaterThan(0);
            expect(invalidNegativeAmount).toBeLessThan(0);
            expect(invalidZeroAmount).toBe(0);
        });

        test('should validate growth rates', () => {
            const validGrowthRates: GrowthRates = {
                hp: 80,
                mp: 60,
                attack: 70,
                defense: 50,
                speed: 40,
                skill: 65,
                luck: 30
            };

            // 成長率は0-100%の範囲内であるべき
            Object.values(validGrowthRates).forEach(rate => {
                expect(rate).toBeGreaterThanOrEqual(0);
                expect(rate).toBeLessThanOrEqual(100);
            });
        });

        test('should validate level requirements', () => {
            const validLevelRequirements = [0, 100, 250, 450, 700, 1000];

            // レベル要件は昇順であるべき
            for (let i = 1; i < validLevelRequirements.length; i++) {
                expect(validLevelRequirements[i]).toBeGreaterThan(validLevelRequirements[i - 1]);
            }

            // 最初のレベル（レベル1）は0経験値であるべき
            expect(validLevelRequirements[0]).toBe(0);
        });
    });
});