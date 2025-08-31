/**
 * 職業データJSONファイルのテスト
 */

import * as fs from 'fs';
import * as path from 'path';
import { JobData, RoseEssenceData, JobCategory } from '../../../game/src/types/job';

describe('Job Data JSON', () => {
    let jobTableData: any;

    beforeAll(() => {
        const jobDataPath = path.join(__dirname, '../../../data/jobs.json');
        const jobDataContent = fs.readFileSync(jobDataPath, 'utf-8');
        jobTableData = JSON.parse(jobDataContent);
    });

    describe('Job Table Structure', () => {
        test('should have required top-level properties', () => {
            expect(jobTableData).toHaveProperty('version');
            expect(jobTableData).toHaveProperty('jobs');
            expect(jobTableData).toHaveProperty('roseEssenceConfig');

            expect(typeof jobTableData.version).toBe('string');
            expect(Array.isArray(jobTableData.jobs)).toBe(true);
            expect(typeof jobTableData.roseEssenceConfig).toBe('object');
        });

        test('should have valid version format', () => {
            expect(jobTableData.version).toMatch(/^\d+\.\d+\.\d+$/);
        });

        test('should have at least one job', () => {
            expect(jobTableData.jobs.length).toBeGreaterThan(0);
        });
    });

    describe('Job Data Validation', () => {
        test('each job should have required properties', () => {
            jobTableData.jobs.forEach((job: any, index: number) => {
                expect(job).toHaveProperty('id');
                expect(job).toHaveProperty('name');
                expect(job).toHaveProperty('description');
                expect(job).toHaveProperty('category');
                expect(job).toHaveProperty('maxRank');
                expect(job).toHaveProperty('statModifiers');
                expect(job).toHaveProperty('availableSkills');
                expect(job).toHaveProperty('rankUpRequirements');
                expect(job).toHaveProperty('growthRateModifiers');
                expect(job).toHaveProperty('jobTraits');
                expect(job).toHaveProperty('visual');

                // Type checks
                expect(typeof job.id).toBe('string');
                expect(typeof job.name).toBe('string');
                expect(typeof job.description).toBe('string');
                expect(Object.values(JobCategory)).toContain(job.category);
                expect(typeof job.maxRank).toBe('number');
                expect(job.maxRank).toBeGreaterThan(0);
                expect(job.maxRank).toBeLessThanOrEqual(10);
            });
        });

        test('stat modifiers should be valid for each rank', () => {
            jobTableData.jobs.forEach((job: any) => {
                Object.keys(job.statModifiers).forEach((rank: string) => {
                    const rankNum = parseInt(rank);
                    expect(rankNum).toBeGreaterThan(0);
                    expect(rankNum).toBeLessThanOrEqual(job.maxRank);

                    const stats = job.statModifiers[rank];
                    expect(stats).toHaveProperty('hp');
                    expect(stats).toHaveProperty('mp');
                    expect(stats).toHaveProperty('attack');
                    expect(stats).toHaveProperty('defense');
                    expect(stats).toHaveProperty('speed');
                    expect(stats).toHaveProperty('skill');
                    expect(stats).toHaveProperty('luck');

                    // All should be numbers
                    Object.values(stats).forEach((value: any) => {
                        expect(typeof value).toBe('number');
                    });
                });
            });
        });

        test('available skills should be arrays for each rank', () => {
            jobTableData.jobs.forEach((job: any) => {
                Object.keys(job.availableSkills).forEach((rank: string) => {
                    const rankNum = parseInt(rank);
                    expect(rankNum).toBeGreaterThan(0);
                    expect(rankNum).toBeLessThanOrEqual(job.maxRank);

                    const skills = job.availableSkills[rank];
                    expect(Array.isArray(skills)).toBe(true);
                    skills.forEach((skill: any) => {
                        expect(typeof skill).toBe('string');
                        expect(skill.length).toBeGreaterThan(0);
                    });
                });
            });
        });

        test('rank up requirements should be valid', () => {
            jobTableData.jobs.forEach((job: any) => {
                Object.keys(job.rankUpRequirements).forEach((rank: string) => {
                    const rankNum = parseInt(rank);
                    expect(rankNum).toBeGreaterThan(1); // Rank up starts from rank 2
                    expect(rankNum).toBeLessThanOrEqual(job.maxRank);

                    const requirements = job.rankUpRequirements[rank];
                    expect(requirements).toHaveProperty('roseEssenceCost');
                    expect(requirements).toHaveProperty('levelRequirement');
                    expect(requirements).toHaveProperty('prerequisiteSkills');

                    expect(typeof requirements.roseEssenceCost).toBe('number');
                    expect(requirements.roseEssenceCost).toBeGreaterThanOrEqual(0);
                    expect(typeof requirements.levelRequirement).toBe('number');
                    expect(requirements.levelRequirement).toBeGreaterThan(0);
                    expect(Array.isArray(requirements.prerequisiteSkills)).toBe(true);
                });
            });
        });

        test('growth rate modifiers should be valid percentages', () => {
            jobTableData.jobs.forEach((job: any) => {
                Object.keys(job.growthRateModifiers).forEach((rank: string) => {
                    const rankNum = parseInt(rank);
                    expect(rankNum).toBeGreaterThan(0);
                    expect(rankNum).toBeLessThanOrEqual(job.maxRank);

                    const growthRates = job.growthRateModifiers[rank];
                    expect(growthRates).toHaveProperty('hp');
                    expect(growthRates).toHaveProperty('mp');
                    expect(growthRates).toHaveProperty('attack');
                    expect(growthRates).toHaveProperty('defense');
                    expect(growthRates).toHaveProperty('speed');
                    expect(growthRates).toHaveProperty('skill');
                    expect(growthRates).toHaveProperty('luck');

                    // All should be numbers within reasonable percentage ranges
                    Object.values(growthRates).forEach((value: any) => {
                        expect(typeof value).toBe('number');
                        expect(value).toBeGreaterThanOrEqual(-50); // Allow negative modifiers
                        expect(value).toBeLessThanOrEqual(100); // Max 100% growth rate
                    });
                });
            });
        });

        test('job traits should be valid', () => {
            jobTableData.jobs.forEach((job: any) => {
                expect(Array.isArray(job.jobTraits)).toBe(true);
                job.jobTraits.forEach((trait: any) => {
                    expect(trait).toHaveProperty('id');
                    expect(trait).toHaveProperty('name');
                    expect(trait).toHaveProperty('description');
                    expect(trait).toHaveProperty('effect');

                    expect(typeof trait.id).toBe('string');
                    expect(typeof trait.name).toBe('string');
                    expect(typeof trait.description).toBe('string');
                    expect(typeof trait.effect).toBe('object');

                    expect(trait.effect).toHaveProperty('type');
                    expect(trait.effect).toHaveProperty('value');
                    expect(typeof trait.effect.type).toBe('string');
                    expect(typeof trait.effect.value).toBe('number');
                });
            });
        });

        test('visual properties should be valid', () => {
            jobTableData.jobs.forEach((job: any) => {
                const visual = job.visual;
                expect(visual).toHaveProperty('iconPath');
                expect(visual).toHaveProperty('spriteModifications');
                expect(visual).toHaveProperty('colorScheme');

                expect(typeof visual.iconPath).toBe('string');
                expect(visual.iconPath.length).toBeGreaterThan(0);
                expect(Array.isArray(visual.spriteModifications)).toBe(true);
                expect(typeof visual.colorScheme).toBe('object');

                // Color scheme validation
                expect(visual.colorScheme).toHaveProperty('primary');
                expect(visual.colorScheme).toHaveProperty('secondary');
                expect(visual.colorScheme).toHaveProperty('accent');

                // Check hex color format
                expect(visual.colorScheme.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
                expect(visual.colorScheme.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
                expect(visual.colorScheme.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
            });
        });
    });

    describe('Rose Essence Configuration', () => {
        test('should have valid rose essence config structure', () => {
            const config = jobTableData.roseEssenceConfig;

            expect(config).toHaveProperty('currentAmount');
            expect(config).toHaveProperty('totalEarned');
            expect(config).toHaveProperty('totalSpent');
            expect(config).toHaveProperty('sources');
            expect(config).toHaveProperty('costs');

            expect(typeof config.currentAmount).toBe('number');
            expect(typeof config.totalEarned).toBe('number');
            expect(typeof config.totalSpent).toBe('number');
            expect(typeof config.sources).toBe('object');
            expect(typeof config.costs).toBe('object');
        });

        test('sources should have valid structure', () => {
            const sources = jobTableData.roseEssenceConfig.sources;

            Object.keys(sources).forEach((sourceType: string) => {
                const source = sources[sourceType];
                expect(source).toHaveProperty('baseAmount');
                expect(source).toHaveProperty('difficultyMultiplier');
                expect(source).toHaveProperty('firstTimeBonus');

                expect(typeof source.baseAmount).toBe('number');
                expect(source.baseAmount).toBeGreaterThanOrEqual(0);
                expect(typeof source.difficultyMultiplier).toBe('number');
                expect(source.difficultyMultiplier).toBeGreaterThan(0);
                expect(typeof source.firstTimeBonus).toBe('number');
                expect(source.firstTimeBonus).toBeGreaterThanOrEqual(0);
            });
        });

        test('costs should have valid structure', () => {
            const costs = jobTableData.roseEssenceConfig.costs;

            expect(costs).toHaveProperty('rankUp');
            expect(costs).toHaveProperty('jobChange');
            expect(costs).toHaveProperty('skillUnlock');

            expect(typeof costs.rankUp).toBe('object');
            expect(typeof costs.jobChange).toBe('number');
            expect(typeof costs.skillUnlock).toBe('number');

            // Validate rank up costs
            Object.keys(costs.rankUp).forEach((jobCategory: string) => {
                const jobCosts = costs.rankUp[jobCategory];
                expect(typeof jobCosts).toBe('object');

                Object.keys(jobCosts).forEach((rank: string) => {
                    const rankNum = parseInt(rank);
                    expect(rankNum).toBeGreaterThan(1);
                    expect(typeof jobCosts[rank]).toBe('number');
                    expect(jobCosts[rank]).toBeGreaterThan(0);
                });
            });
        });
    });

    describe('Data Consistency', () => {
        test('job IDs should be unique', () => {
            const jobIds = jobTableData.jobs.map((job: any) => job.id);
            const uniqueIds = new Set(jobIds);
            expect(uniqueIds.size).toBe(jobIds.length);
        });

        test('rank up costs should match job categories', () => {
            const costs = jobTableData.roseEssenceConfig.costs.rankUp;
            const jobCategories = jobTableData.jobs.map((job: any) => job.category);

            jobCategories.forEach((category: string) => {
                expect(costs).toHaveProperty(category);
            });
        });

        test('stat modifiers should exist for all ranks up to maxRank', () => {
            jobTableData.jobs.forEach((job: any) => {
                for (let rank = 1; rank <= job.maxRank; rank++) {
                    expect(job.statModifiers).toHaveProperty(rank.toString());
                    expect(job.availableSkills).toHaveProperty(rank.toString());
                    expect(job.growthRateModifiers).toHaveProperty(rank.toString());
                }
            });
        });

        test('rank up requirements should exist for ranks 2 to maxRank', () => {
            jobTableData.jobs.forEach((job: any) => {
                for (let rank = 2; rank <= job.maxRank; rank++) {
                    expect(job.rankUpRequirements).toHaveProperty(rank.toString());
                }
            });
        });
    });
});