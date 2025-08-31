import { JobManager } from '../../../game/src/systems/jobs/JobManager';
import { WarriorJob } from '../../../game/src/systems/jobs/WarriorJob';
import { MageJob } from '../../../game/src/systems/jobs/MageJob';
import { Job } from '../../../game/src/systems/jobs/Job';
import { JobData, CharacterJobData, JobChangeResult, StatModifiers } from '../../../game/src/types/jobs';

describe('JobManager', () => {
    let jobManager: JobManager;

    const mockJobData: JobData = {
        warrior: {
            id: 'warrior',
            name: '戦士',
            description: '近接戦闘の専門家',
            category: 'warrior',
            maxRank: 3,
            statModifiers: {
                1: { hp: 5, mp: 0, attack: 3, defense: 2, speed: -1, skill: 0, luck: 0 },
                2: { hp: 10, mp: 0, attack: 6, defense: 4, speed: -2, skill: 0, luck: 0 },
                3: { hp: 15, mp: 0, attack: 9, defense: 6, speed: -3, skill: 0, luck: 0 }
            },
            availableSkills: {
                1: ['sword_slash', 'guard'],
                2: ['sword_slash', 'guard', 'power_strike'],
                3: ['sword_slash', 'guard', 'power_strike', 'berserker_rage']
            },
            rankUpRequirements: {
                2: { roseEssenceCost: 10, levelRequirement: 5, prerequisiteSkills: [] },
                3: { roseEssenceCost: 20, levelRequirement: 10, prerequisiteSkills: ['power_strike'] }
            },
            growthRateModifiers: {
                1: { hp: 1.1, mp: 0.8, attack: 1.2, defense: 1.1, speed: 0.9, skill: 1.0, luck: 1.0 },
                2: { hp: 1.2, mp: 0.8, attack: 1.3, defense: 1.2, speed: 0.9, skill: 1.0, luck: 1.0 },
                3: { hp: 1.3, mp: 0.8, attack: 1.4, defense: 1.3, speed: 0.9, skill: 1.0, luck: 1.0 }
            },
            jobTraits: [],
            visual: {
                iconPath: 'warrior_icon.png',
                spriteModifications: [],
                colorScheme: { primary: '#ff0000', secondary: '#800000' }
            }
        },
        mage: {
            id: 'mage',
            name: '魔法使い',
            description: '魔法攻撃の専門家',
            category: 'mage',
            maxRank: 3,
            statModifiers: {
                1: { hp: 0, mp: 8, attack: 4, defense: -1, speed: 1, skill: 2, luck: 0 },
                2: { hp: 0, mp: 16, attack: 8, defense: -2, speed: 2, skill: 4, luck: 0 },
                3: { hp: 0, mp: 24, attack: 12, defense: -3, speed: 3, skill: 6, luck: 0 }
            },
            availableSkills: {
                1: ['fire_bolt', 'heal'],
                2: ['fire_bolt', 'heal', 'ice_shard', 'group_heal'],
                3: ['fire_bolt', 'heal', 'ice_shard', 'group_heal', 'meteor', 'resurrection']
            },
            rankUpRequirements: {
                2: { roseEssenceCost: 15, levelRequirement: 5, prerequisiteSkills: [] },
                3: { roseEssenceCost: 25, levelRequirement: 10, prerequisiteSkills: ['group_heal'] }
            },
            growthRateModifiers: {
                1: { hp: 0.9, mp: 1.3, attack: 1.2, defense: 0.8, speed: 1.1, skill: 1.3, luck: 1.0 },
                2: { hp: 0.9, mp: 1.4, attack: 1.3, defense: 0.8, speed: 1.2, skill: 1.4, luck: 1.0 },
                3: { hp: 0.9, mp: 1.5, attack: 1.4, defense: 0.8, speed: 1.3, skill: 1.5, luck: 1.0 }
            },
            jobTraits: [],
            visual: {
                iconPath: 'mage_icon.png',
                spriteModifications: [],
                colorScheme: { primary: '#0000ff', secondary: '#000080' }
            }
        }
    };

    beforeEach(() => {
        jobManager = new JobManager();
    });

    describe('initialize', () => {
        it('should initialize with job data and create job instances', () => {
            // Act
            jobManager.initialize(mockJobData);

            // Assert
            expect(jobManager.getJob('warrior')).toBeInstanceOf(WarriorJob);
            expect(jobManager.getJob('mage')).toBeInstanceOf(MageJob);
        });

        it('should throw error for invalid job data', () => {
            // Arrange
            const invalidJobData = {} as JobData;

            // Act & Assert
            expect(() => jobManager.initialize(invalidJobData))
                .toThrow('Invalid job data provided');
        });

        it('should handle job data with missing required fields', () => {
            // Arrange
            const incompleteJobData = {
                warrior: {
                    id: 'warrior',
                    name: '戦士'
                    // Missing required fields
                }
            } as any;

            // Act & Assert
            expect(() => jobManager.initialize(incompleteJobData))
                .toThrow('Invalid job configuration for job: warrior');
        });
    });

    describe('job registration and retrieval', () => {
        beforeEach(() => {
            jobManager.initialize(mockJobData);
        });

        it('should register and retrieve jobs correctly', () => {
            // Act
            const warriorJob = jobManager.getJob('warrior');
            const mageJob = jobManager.getJob('mage');

            // Assert
            expect(warriorJob).toBeDefined();
            expect(warriorJob?.id).toBe('warrior');
            expect(warriorJob?.name).toBe('戦士');

            expect(mageJob).toBeDefined();
            expect(mageJob?.id).toBe('mage');
            expect(mageJob?.name).toBe('魔法使い');
        });

        it('should return null for non-existent job', () => {
            // Act
            const nonExistentJob = jobManager.getJob('non_existent');

            // Assert
            expect(nonExistentJob).toBeNull();
        });

        it('should register custom job instance', () => {
            // Arrange
            const customJob = new WarriorJob();
            customJob.id = 'custom_warrior';
            customJob.name = 'カスタム戦士';

            // Act
            jobManager.registerJob(customJob);

            // Assert
            expect(jobManager.getJob('custom_warrior')).toBe(customJob);
        });
    });

    describe('character job management', () => {
        beforeEach(() => {
            jobManager.initialize(mockJobData);
        });

        it('should set character job correctly', () => {
            // Arrange
            const characterId = 'char1';
            const jobId = 'warrior';
            const rank = 1;

            // Act
            jobManager.setCharacterJob(characterId, jobId, rank);

            // Assert
            const characterJob = jobManager.getCharacterJob(characterId);
            expect(characterJob).toBeDefined();
            expect(characterJob?.id).toBe(jobId);
            expect(characterJob?.rank).toBe(rank);
        });

        it('should throw error for invalid job ID when setting character job', () => {
            // Arrange
            const characterId = 'char1';
            const invalidJobId = 'invalid_job';
            const rank = 1;

            // Act & Assert
            expect(() => jobManager.setCharacterJob(characterId, invalidJobId, rank))
                .toThrow('Job not found: invalid_job');
        });

        it('should throw error for invalid rank when setting character job', () => {
            // Arrange
            const characterId = 'char1';
            const jobId = 'warrior';
            const invalidRank = 0;

            // Act & Assert
            expect(() => jobManager.setCharacterJob(characterId, jobId, invalidRank))
                .toThrow('Invalid rank: 0');
        });

        it('should return null for character without job', () => {
            // Act
            const characterJob = jobManager.getCharacterJob('non_existent_char');

            // Assert
            expect(characterJob).toBeNull();
        });
    });

    describe('job change functionality', () => {
        beforeEach(() => {
            jobManager.initialize(mockJobData);
            jobManager.setCharacterJob('char1', 'warrior', 1);
        });

        it('should successfully change character job', () => {
            // Act
            const result = jobManager.changeCharacterJob('char1', 'mage');

            // Assert
            expect(result.success).toBe(true);
            expect(result.characterId).toBe('char1');
            expect(result.oldJobId).toBe('warrior');
            expect(result.newJobId).toBe('mage');
            expect(result.oldRank).toBe(1);
            expect(result.newRank).toBe(1);

            // Verify job was actually changed
            const newJob = jobManager.getCharacterJob('char1');
            expect(newJob?.id).toBe('mage');
        });

        it('should fail to change to non-existent job', () => {
            // Act
            const result = jobManager.changeCharacterJob('char1', 'invalid_job');

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('Job not found');

            // Verify job was not changed
            const currentJob = jobManager.getCharacterJob('char1');
            expect(currentJob?.id).toBe('warrior');
        });

        it('should fail to change job for non-existent character', () => {
            // Act
            const result = jobManager.changeCharacterJob('non_existent_char', 'mage');

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('Character not found');
        });

        it('should preserve job history when changing jobs', () => {
            // Act
            jobManager.changeCharacterJob('char1', 'mage');
            jobManager.changeCharacterJob('char1', 'warrior');

            // Assert
            const characterJobData = (jobManager as any).characterJobs.get('char1') as CharacterJobData;
            expect(characterJobData.jobHistory).toHaveLength(2);
            expect(characterJobData.jobHistory[0].jobId).toBe('mage');
            expect(characterJobData.jobHistory[1].jobId).toBe('warrior');
        });
    });

    describe('stat calculation', () => {
        beforeEach(() => {
            jobManager.initialize(mockJobData);
            jobManager.setCharacterJob('char1', 'warrior', 2);
        });

        it('should calculate job stats correctly', () => {
            // Act
            const stats = jobManager.calculateJobStats('char1');

            // Assert
            expect(stats).toEqual({
                hp: 10,
                mp: 0,
                attack: 6,
                defense: 4,
                speed: -2,
                skill: 0,
                luck: 0
            });
        });

        it('should return zero stats for character without job', () => {
            // Act
            const stats = jobManager.calculateJobStats('non_existent_char');

            // Assert
            expect(stats).toEqual({
                hp: 0,
                mp: 0,
                attack: 0,
                defense: 0,
                speed: 0,
                skill: 0,
                luck: 0
            });
        });

        it('should handle rank changes in stat calculation', () => {
            // Arrange
            jobManager.setCharacterJob('char1', 'warrior', 3);

            // Act
            const stats = jobManager.calculateJobStats('char1');

            // Assert
            expect(stats).toEqual({
                hp: 15,
                mp: 0,
                attack: 9,
                defense: 6,
                speed: -3,
                skill: 0,
                luck: 0
            });
        });
    });

    describe('skill management', () => {
        beforeEach(() => {
            jobManager.initialize(mockJobData);
            jobManager.setCharacterJob('char1', 'warrior', 2);
        });

        it('should return correct skills for character job and rank', () => {
            // Act
            const skills = jobManager.getJobSkills('char1');

            // Assert
            expect(skills).toEqual(['sword_slash', 'guard', 'power_strike']);
        });

        it('should return empty array for character without job', () => {
            // Act
            const skills = jobManager.getJobSkills('non_existent_char');

            // Assert
            expect(skills).toEqual([]);
        });

        it('should update skills when job rank changes', () => {
            // Arrange
            jobManager.setCharacterJob('char1', 'warrior', 3);

            // Act
            const skills = jobManager.getJobSkills('char1');

            // Assert
            expect(skills).toEqual(['sword_slash', 'guard', 'power_strike', 'berserker_rage']);
        });

        it('should update skills when job changes', () => {
            // Arrange
            jobManager.changeCharacterJob('char1', 'mage');

            // Act
            const skills = jobManager.getJobSkills('char1');

            // Assert
            expect(skills).toEqual(['fire_bolt', 'heal']);
        });
    });

    describe('error handling', () => {
        beforeEach(() => {
            jobManager.initialize(mockJobData);
        });

        it('should handle corrupted character job data gracefully', () => {
            // Arrange
            const characterJobs = (jobManager as any).characterJobs;
            characterJobs.set('char1', { currentJobId: 'invalid_job', currentRank: 1 });

            // Act & Assert
            expect(() => jobManager.calculateJobStats('char1')).not.toThrow();
            expect(jobManager.calculateJobStats('char1')).toEqual({
                hp: 0, mp: 0, attack: 0, defense: 0, speed: 0, skill: 0, luck: 0
            });
        });

        it('should handle invalid rank gracefully', () => {
            // Arrange
            const characterJobs = (jobManager as any).characterJobs;
            characterJobs.set('char1', { currentJobId: 'warrior', currentRank: 999 });

            // Act & Assert
            expect(() => jobManager.calculateJobStats('char1')).not.toThrow();
        });

        it('should validate character ID format', () => {
            // Act & Assert
            expect(() => jobManager.setCharacterJob('', 'warrior', 1))
                .toThrow('Invalid character ID');
            expect(() => jobManager.setCharacterJob(null as any, 'warrior', 1))
                .toThrow('Invalid character ID');
        });
    });

    describe('performance considerations', () => {
        beforeEach(() => {
            jobManager.initialize(mockJobData);
        });

        it('should handle large number of characters efficiently', () => {
            // Arrange
            const startTime = performance.now();
            const numCharacters = 1000;

            // Act
            for (let i = 0; i < numCharacters; i++) {
                jobManager.setCharacterJob(`char${i}`, 'warrior', 1);
                jobManager.calculateJobStats(`char${i}`);
                jobManager.getJobSkills(`char${i}`);
            }

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // Assert - Should complete within reasonable time (adjust threshold as needed)
            expect(executionTime).toBeLessThan(1000); // 1 second
        });

        it('should cache job instances for reuse', () => {
            // Act
            const job1 = jobManager.getJob('warrior');
            const job2 = jobManager.getJob('warrior');

            // Assert
            expect(job1).toBe(job2); // Same instance
        });
    });
});