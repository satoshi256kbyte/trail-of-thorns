/**
 * 職業システム型定義のテスト
 */

import {
    JobCategory,
    TraitEffectType,
    JobSystemError,
    RoseEssenceSourceType,
    StatModifiers,
    GrowthRateModifiers,
    JobData,
    CharacterJobData,
    RoseEssenceData,
    RoseEssenceTransaction,
    RankUpRequirements,
    RankUpResult,
    RankUpAvailability,
    JobChangeResult,
    JobSystemContext,
    JobSystemConfig,
} from '../../../game/src/types/job';

describe('Job System Types', () => {
    describe('Enums', () => {
        test('JobCategory should have all required values', () => {
            expect(JobCategory.WARRIOR).toBe('warrior');
            expect(JobCategory.MAGE).toBe('mage');
            expect(JobCategory.ARCHER).toBe('archer');
            expect(JobCategory.HEALER).toBe('healer');
            expect(JobCategory.THIEF).toBe('thief');
            expect(JobCategory.SPECIAL).toBe('special');
        });

        test('TraitEffectType should have all required values', () => {
            expect(TraitEffectType.STAT_BONUS).toBe('stat_bonus');
            expect(TraitEffectType.SKILL_BONUS).toBe('skill_bonus');
            expect(TraitEffectType.DAMAGE_BONUS).toBe('damage_bonus');
            expect(TraitEffectType.RESISTANCE).toBe('resistance');
            expect(TraitEffectType.SPECIAL_ABILITY).toBe('special_ability');
        });

        test('JobSystemError should have all required values', () => {
            expect(JobSystemError.JOB_NOT_FOUND).toBe('job_not_found');
            expect(JobSystemError.INVALID_RANK).toBe('invalid_rank');
            expect(JobSystemError.INSUFFICIENT_ROSE_ESSENCE).toBe('insufficient_rose_essence');
            expect(JobSystemError.LEVEL_REQUIREMENT_NOT_MET).toBe('level_requirement_not_met');
            expect(JobSystemError.PREREQUISITE_SKILLS_MISSING).toBe('prerequisite_skills_missing');
            expect(JobSystemError.JOB_CHANGE_NOT_ALLOWED).toBe('job_change_not_allowed');
            expect(JobSystemError.RANK_UP_NOT_AVAILABLE).toBe('rank_up_not_available');
            expect(JobSystemError.DATA_CORRUPTION).toBe('data_corruption');
        });

        test('RoseEssenceSourceType should have all required values', () => {
            expect(RoseEssenceSourceType.BOSS_DEFEAT).toBe('boss_defeat');
            expect(RoseEssenceSourceType.STAGE_CLEAR).toBe('stage_clear');
            expect(RoseEssenceSourceType.SPECIAL_EVENT).toBe('special_event');
            expect(RoseEssenceSourceType.ITEM_USE).toBe('item_use');
        });
    });

    describe('Basic Type Structures', () => {
        test('StatModifiers should have all required properties', () => {
            const statModifiers: StatModifiers = {
                hp: 10,
                mp: 5,
                attack: 8,
                defense: 6,
                speed: 3,
                skill: 4,
                luck: 2,
            };

            expect(typeof statModifiers.hp).toBe('number');
            expect(typeof statModifiers.mp).toBe('number');
            expect(typeof statModifiers.attack).toBe('number');
            expect(typeof statModifiers.defense).toBe('number');
            expect(typeof statModifiers.speed).toBe('number');
            expect(typeof statModifiers.skill).toBe('number');
            expect(typeof statModifiers.luck).toBe('number');
        });

        test('GrowthRateModifiers should have all required properties', () => {
            const growthRateModifiers: GrowthRateModifiers = {
                hp: 15,
                mp: 10,
                attack: 20,
                defense: 12,
                speed: 8,
                skill: 18,
                luck: 10,
            };

            expect(typeof growthRateModifiers.hp).toBe('number');
            expect(typeof growthRateModifiers.mp).toBe('number');
            expect(typeof growthRateModifiers.attack).toBe('number');
            expect(typeof growthRateModifiers.defense).toBe('number');
            expect(typeof growthRateModifiers.speed).toBe('number');
            expect(typeof growthRateModifiers.skill).toBe('number');
            expect(typeof growthRateModifiers.luck).toBe('number');
        });

        test('RankUpRequirements should have all required properties', () => {
            const requirements: RankUpRequirements = {
                roseEssenceCost: 20,
                levelRequirement: 10,
                prerequisiteSkills: ['sword_slash', 'guard'],
                completedStages: ['stage_1', 'stage_2'],
                defeatedBosses: ['boss_1'],
            };

            expect(typeof requirements.roseEssenceCost).toBe('number');
            expect(typeof requirements.levelRequirement).toBe('number');
            expect(Array.isArray(requirements.prerequisiteSkills)).toBe(true);
            expect(Array.isArray(requirements.completedStages)).toBe(true);
            expect(Array.isArray(requirements.defeatedBosses)).toBe(true);
        });
    });

    describe('Complex Type Structures', () => {
        test('JobData should have all required properties', () => {
            const jobData: JobData = {
                id: 'warrior',
                name: '戦士',
                description: '近接戦闘に特化した職業',
                category: JobCategory.WARRIOR,
                maxRank: 5,
                statModifiers: {
                    1: {
                        hp: 5, mp: 0, attack: 3, defense: 2, speed: -1, skill: 0, luck: 0
                    },
                    2: {
                        hp: 10, mp: 0, attack: 6, defense: 4, speed: -1, skill: 1, luck: 0
                    },
                },
                availableSkills: {
                    1: ['sword_slash', 'guard'],
                    2: ['sword_slash', 'guard', 'power_strike'],
                },
                rankUpRequirements: {
                    2: {
                        roseEssenceCost: 10,
                        levelRequirement: 5,
                        prerequisiteSkills: ['sword_slash'],
                    },
                },
                growthRateModifiers: {
                    1: {
                        hp: 10, mp: 0, attack: 15, defense: 10, speed: -5, skill: 5, luck: 5
                    },
                },
                jobTraits: [
                    {
                        id: 'warrior_resilience',
                        name: '戦士の耐久力',
                        description: '物理ダメージを10%軽減する',
                        effect: {
                            type: TraitEffectType.RESISTANCE,
                            value: 10,
                            target: 'physical_damage',
                        },
                    },
                ],
                visual: {
                    iconPath: 'assets/icons/jobs/warrior.png',
                    spriteModifications: [
                        {
                            type: 'color',
                            target: 'armor',
                            value: '#8B4513',
                        },
                    ],
                    colorScheme: {
                        primary: '#8B4513',
                        secondary: '#CD853F',
                        accent: '#FFD700',
                    },
                },
            };

            expect(typeof jobData.id).toBe('string');
            expect(typeof jobData.name).toBe('string');
            expect(typeof jobData.description).toBe('string');
            expect(Object.values(JobCategory)).toContain(jobData.category);
            expect(typeof jobData.maxRank).toBe('number');
            expect(typeof jobData.statModifiers).toBe('object');
            expect(typeof jobData.availableSkills).toBe('object');
            expect(typeof jobData.rankUpRequirements).toBe('object');
            expect(typeof jobData.growthRateModifiers).toBe('object');
            expect(Array.isArray(jobData.jobTraits)).toBe(true);
            expect(typeof jobData.visual).toBe('object');
        });

        test('CharacterJobData should have all required properties', () => {
            const characterJobData: CharacterJobData = {
                characterId: 'char_001',
                currentJobId: 'warrior',
                currentRank: 2,
                jobHistory: [
                    {
                        jobId: 'warrior',
                        rank: 1,
                        changedAt: new Date(),
                        roseEssenceUsed: 0,
                    },
                    {
                        jobId: 'warrior',
                        rank: 2,
                        changedAt: new Date(),
                        roseEssenceUsed: 10,
                    },
                ],
                jobExperience: new Map([['warrior', 150]]),
                learnedJobSkills: new Map([['warrior', ['sword_slash', 'guard', 'power_strike']]]),
            };

            expect(typeof characterJobData.characterId).toBe('string');
            expect(typeof characterJobData.currentJobId).toBe('string');
            expect(typeof characterJobData.currentRank).toBe('number');
            expect(Array.isArray(characterJobData.jobHistory)).toBe(true);
            expect(characterJobData.jobExperience instanceof Map).toBe(true);
            expect(characterJobData.learnedJobSkills instanceof Map).toBe(true);
        });

        test('RoseEssenceData should have all required properties', () => {
            const roseEssenceData: RoseEssenceData = {
                currentAmount: 50,
                totalEarned: 100,
                totalSpent: 50,
                sources: {
                    boss_defeat: {
                        baseAmount: 50,
                        difficultyMultiplier: 1.5,
                        firstTimeBonus: 25,
                    },
                },
                costs: {
                    rankUp: {
                        warrior: {
                            2: 10,
                            3: 20,
                        },
                    },
                    jobChange: 5,
                    skillUnlock: 3,
                },
            };

            expect(typeof roseEssenceData.currentAmount).toBe('number');
            expect(typeof roseEssenceData.totalEarned).toBe('number');
            expect(typeof roseEssenceData.totalSpent).toBe('number');
            expect(typeof roseEssenceData.sources).toBe('object');
            expect(typeof roseEssenceData.costs).toBe('object');
        });

        test('RoseEssenceTransaction should have all required properties', () => {
            const transaction: RoseEssenceTransaction = {
                id: 'txn_001',
                type: 'gain',
                amount: 50,
                source: {
                    type: RoseEssenceSourceType.BOSS_DEFEAT,
                    sourceId: 'boss_001',
                    bossId: 'boss_001',
                },
                timestamp: new Date(),
                characterId: 'char_001',
                description: 'ボス撃破による薔薇の力獲得',
            };

            expect(typeof transaction.id).toBe('string');
            expect(['gain', 'spend']).toContain(transaction.type);
            expect(typeof transaction.amount).toBe('number');
            expect(typeof transaction.source).toBe('object');
            expect(transaction.timestamp instanceof Date).toBe(true);
            expect(typeof transaction.description).toBe('string');
        });
    });

    describe('Result Types', () => {
        test('RankUpResult should have all required properties', () => {
            const result: RankUpResult = {
                success: true,
                characterId: 'char_001',
                jobId: 'warrior',
                oldRank: 1,
                newRank: 2,
                roseEssenceUsed: 10,
                newStatModifiers: {
                    hp: 10, mp: 0, attack: 6, defense: 4, speed: -1, skill: 1, luck: 0
                },
                newSkills: ['power_strike'],
                newTraits: [],
            };

            expect(typeof result.success).toBe('boolean');
            expect(typeof result.characterId).toBe('string');
            expect(typeof result.jobId).toBe('string');
            expect(typeof result.oldRank).toBe('number');
            expect(typeof result.newRank).toBe('number');
            expect(typeof result.roseEssenceUsed).toBe('number');
            expect(typeof result.newStatModifiers).toBe('object');
            expect(Array.isArray(result.newSkills)).toBe(true);
            expect(Array.isArray(result.newTraits)).toBe(true);
        });

        test('RankUpAvailability should have all required properties', () => {
            const availability: RankUpAvailability = {
                canRankUp: false,
                currentRank: 1,
                targetRank: 2,
                requirements: {
                    roseEssenceCost: 10,
                    levelRequirement: 5,
                    prerequisiteSkills: ['sword_slash'],
                },
                missingRequirements: {
                    roseEssence: 5,
                    level: 2,
                },
            };

            expect(typeof availability.canRankUp).toBe('boolean');
            expect(typeof availability.currentRank).toBe('number');
            expect(typeof availability.targetRank).toBe('number');
            expect(typeof availability.requirements).toBe('object');
            expect(typeof availability.missingRequirements).toBe('object');
        });

        test('JobChangeResult should have all required properties', () => {
            const result: JobChangeResult = {
                success: true,
                characterId: 'char_001',
                oldJobId: 'warrior',
                newJobId: 'mage',
                oldRank: 2,
                newRank: 1,
                statChanges: {
                    hp: -7, mp: 8, attack: 1, defense: -3, speed: 2, skill: 2, luck: 1
                },
                skillChanges: {
                    lost: ['sword_slash', 'power_strike'],
                    gained: ['fire_bolt', 'heal'],
                },
            };

            expect(typeof result.success).toBe('boolean');
            expect(typeof result.characterId).toBe('string');
            expect(typeof result.oldJobId).toBe('string');
            expect(typeof result.newJobId).toBe('string');
            expect(typeof result.oldRank).toBe('number');
            expect(typeof result.newRank).toBe('number');
            expect(typeof result.statChanges).toBe('object');
            expect(typeof result.skillChanges).toBe('object');
            expect(Array.isArray(result.skillChanges.lost)).toBe(true);
            expect(Array.isArray(result.skillChanges.gained)).toBe(true);
        });
    });

    describe('System Configuration', () => {
        test('JobSystemContext should have all required properties', () => {
            const context: JobSystemContext = {
                characterId: 'char_001',
                currentJobId: 'warrior',
                targetJobId: 'mage',
                currentRank: 2,
                targetRank: 3,
                availableRoseEssence: 25,
                characterLevel: 12,
                error: JobSystemError.INSUFFICIENT_ROSE_ESSENCE,
            };

            expect(typeof context.characterId).toBe('string');
            expect(typeof context.currentJobId).toBe('string');
            expect(typeof context.targetJobId).toBe('string');
            expect(typeof context.currentRank).toBe('number');
            expect(typeof context.targetRank).toBe('number');
            expect(typeof context.availableRoseEssence).toBe('number');
            expect(typeof context.characterLevel).toBe('number');
            expect(Object.values(JobSystemError)).toContain(context.error);
        });

        test('JobSystemConfig should have all required properties', () => {
            const config: JobSystemConfig = {
                enableDebugMode: true,
                maxJobsPerCharacter: 10,
                defaultRoseEssenceAmount: 0,
                autoSaveInterval: 30000,
                performanceMonitoring: true,
            };

            expect(typeof config.enableDebugMode).toBe('boolean');
            expect(typeof config.maxJobsPerCharacter).toBe('number');
            expect(typeof config.defaultRoseEssenceAmount).toBe('number');
            expect(typeof config.autoSaveInterval).toBe('number');
            expect(typeof config.performanceMonitoring).toBe('boolean');
        });
    });

    describe('Edge Cases and Validation', () => {
        test('should handle empty arrays and objects', () => {
            const emptyJobData: Partial<JobData> = {
                id: 'empty_job',
                name: 'Empty Job',
                description: 'A job with minimal data',
                category: JobCategory.SPECIAL,
                maxRank: 1,
                statModifiers: {},
                availableSkills: {},
                rankUpRequirements: {},
                growthRateModifiers: {},
                jobTraits: [],
            };

            expect(Array.isArray(emptyJobData.jobTraits)).toBe(true);
            expect(emptyJobData.jobTraits?.length).toBe(0);
            expect(typeof emptyJobData.statModifiers).toBe('object');
        });

        test('should handle boundary values', () => {
            const boundaryStats: StatModifiers = {
                hp: -100,
                mp: 0,
                attack: 999,
                defense: -50,
                speed: 100,
                skill: 0,
                luck: -10,
            };

            expect(typeof boundaryStats.hp).toBe('number');
            expect(boundaryStats.hp).toBe(-100);
            expect(boundaryStats.mp).toBe(0);
            expect(boundaryStats.attack).toBe(999);
        });

        test('should handle maximum rank scenarios', () => {
            const maxRankRequirements: RankUpRequirements = {
                roseEssenceCost: 1000,
                levelRequirement: 99,
                prerequisiteSkills: ['ultimate_skill_1', 'ultimate_skill_2', 'ultimate_skill_3'],
                completedStages: ['final_stage'],
                defeatedBosses: ['final_boss'],
            };

            expect(maxRankRequirements.roseEssenceCost).toBe(1000);
            expect(maxRankRequirements.levelRequirement).toBe(99);
            expect(maxRankRequirements.prerequisiteSkills.length).toBe(3);
        });
    });
});