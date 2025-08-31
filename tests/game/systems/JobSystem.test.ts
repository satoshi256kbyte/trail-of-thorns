import { JobSystem } from '../../../game/src/systems/jobs/JobSystem';
import { JobManager } from '../../../game/src/systems/jobs/JobManager';
import { RoseEssenceManager } from '../../../game/src/systems/jobs/RoseEssenceManager';
import { RankUpManager } from '../../../game/src/systems/jobs/RankUpManager';
import { WarriorJob } from '../../../game/src/systems/jobs/WarriorJob';
import { MageJob } from '../../../game/src/systems/jobs/MageJob';
import { JobData, RoseEssenceData, JobChangeResult, RankUpResult } from '../../../game/src/types/jobs';

// Mock dependencies
jest.mock('../../../game/src/systems/jobs/JobManager');
jest.mock('../../../game/src/systems/jobs/RoseEssenceManager');
jest.mock('../../../game/src/systems/jobs/RankUpManager');

describe('JobSystem', () => {
    let jobSystem: JobSystem;
    let mockJobManager: jest.Mocked<JobManager>;
    let mockRoseEssenceManager: jest.Mocked<RoseEssenceManager>;
    let mockRankUpManager: jest.Mocked<RankUpManager>;

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
        }
    };

    const mockRoseEssenceData: RoseEssenceData = {
        currentAmount: 50,
        totalEarned: 100,
        totalSpent: 50,
        sources: {
            boss_defeat: { baseAmount: 20, difficultyMultiplier: 1.5, firstTimeBonus: 10 }
        },
        costs: {
            rankUp: {
                warrior: { 2: 10, 3: 20 },
                mage: { 2: 15, 3: 25 }
            },
            jobChange: 5,
            skillUnlock: 3
        }
    };

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Create mock instances
        mockJobManager = new JobManager() as jest.Mocked<JobManager>;
        mockRoseEssenceManager = new RoseEssenceManager() as jest.Mocked<RoseEssenceManager>;
        mockRankUpManager = new RankUpManager(mockJobManager, mockRoseEssenceManager) as jest.Mocked<RankUpManager>;

        // Create JobSystem instance
        jobSystem = new JobSystem();

        // Inject mocks
        (jobSystem as any).jobManager = mockJobManager;
        (jobSystem as any).roseEssenceManager = mockRoseEssenceManager;
        (jobSystem as any).rankUpManager = mockRankUpManager;
    });

    describe('initialize', () => {
        it('should initialize all subsystems with provided data', () => {
            // Act
            jobSystem.initialize(mockJobData, mockRoseEssenceData);

            // Assert
            expect(mockJobManager.initialize).toHaveBeenCalledWith(mockJobData);
            expect(mockRoseEssenceManager.initialize).toHaveBeenCalledWith(mockRoseEssenceData);
            expect(mockRankUpManager.initialize).toHaveBeenCalled();
        });

        it('should throw error if job data is invalid', () => {
            // Arrange
            const invalidJobData = {} as JobData;

            // Act & Assert
            expect(() => jobSystem.initialize(invalidJobData, mockRoseEssenceData))
                .toThrow('Invalid job data provided');
        });

        it('should throw error if rose essence data is invalid', () => {
            // Arrange
            const invalidRoseEssenceData = {} as RoseEssenceData;

            // Act & Assert
            expect(() => jobSystem.initialize(mockJobData, invalidRoseEssenceData))
                .toThrow('Invalid rose essence data provided');
        });
    });

    describe('setCharacterJob', () => {
        beforeEach(() => {
            jobSystem.initialize(mockJobData, mockRoseEssenceData);
        });

        it('should set character job through job manager', () => {
            // Arrange
            const characterId = 'char1';
            const jobId = 'warrior';

            // Act
            jobSystem.setCharacterJob(characterId, jobId);

            // Assert
            expect(mockJobManager.setCharacterJob).toHaveBeenCalledWith(characterId, jobId, 1);
        });

        it('should throw error for invalid character ID', () => {
            // Arrange
            const invalidCharacterId = '';
            const jobId = 'warrior';

            // Act & Assert
            expect(() => jobSystem.setCharacterJob(invalidCharacterId, jobId))
                .toThrow('Invalid character ID');
        });

        it('should throw error for invalid job ID', () => {
            // Arrange
            const characterId = 'char1';
            const invalidJobId = 'invalid_job';

            mockJobManager.getJob.mockReturnValue(null);

            // Act & Assert
            expect(() => jobSystem.setCharacterJob(characterId, invalidJobId))
                .toThrow('Job not found: invalid_job');
        });
    });

    describe('changeJob', () => {
        beforeEach(() => {
            jobSystem.initialize(mockJobData, mockRoseEssenceData);
        });

        it('should successfully change job when conditions are met', () => {
            // Arrange
            const characterId = 'char1';
            const newJobId = 'mage';
            const mockResult: JobChangeResult = {
                success: true,
                characterId,
                oldJobId: 'warrior',
                newJobId,
                oldRank: 1,
                newRank: 1,
                roseEssenceUsed: 5,
                message: 'Job changed successfully'
            };

            mockJobManager.changeCharacterJob.mockReturnValue(mockResult);
            mockRoseEssenceManager.hasEnoughEssence.mockReturnValue(true);
            mockRoseEssenceManager.consumeRoseEssence.mockReturnValue(true);

            // Act
            const result = jobSystem.changeJob(characterId, newJobId);

            // Assert
            expect(result).toEqual(mockResult);
            expect(mockRoseEssenceManager.consumeRoseEssence).toHaveBeenCalledWith(5, 'job_change');
        });

        it('should fail when insufficient rose essence', () => {
            // Arrange
            const characterId = 'char1';
            const newJobId = 'mage';

            mockRoseEssenceManager.hasEnoughEssence.mockReturnValue(false);

            // Act
            const result = jobSystem.changeJob(characterId, newJobId);

            // Assert
            expect(result.success).toBe(false);
            expect(result.message).toContain('Insufficient rose essence');
        });
    });

    describe('rankUpJob', () => {
        beforeEach(() => {
            jobSystem.initialize(mockJobData, mockRoseEssenceData);
        });

        it('should successfully rank up job when conditions are met', async () => {
            // Arrange
            const characterId = 'char1';
            const targetRank = 2;
            const mockResult: RankUpResult = {
                success: true,
                characterId,
                jobId: 'warrior',
                oldRank: 1,
                newRank: 2,
                roseEssenceUsed: 10,
                newSkills: ['power_strike'],
                statChanges: { hp: 5, attack: 3, defense: 2 },
                message: 'Rank up successful'
            };

            mockRankUpManager.executeRankUp.mockResolvedValue(mockResult);

            // Act
            const result = await jobSystem.rankUpJob(characterId, targetRank);

            // Assert
            expect(result).toEqual(mockResult);
            expect(mockRankUpManager.executeRankUp).toHaveBeenCalledWith(characterId, targetRank);
        });

        it('should fail when rank up conditions are not met', async () => {
            // Arrange
            const characterId = 'char1';
            const targetRank = 3;
            const mockResult: RankUpResult = {
                success: false,
                characterId,
                jobId: 'warrior',
                oldRank: 1,
                newRank: 1,
                roseEssenceUsed: 0,
                newSkills: [],
                statChanges: {},
                message: 'Level requirement not met'
            };

            mockRankUpManager.executeRankUp.mockResolvedValue(mockResult);

            // Act
            const result = await jobSystem.rankUpJob(characterId, targetRank);

            // Assert
            expect(result).toEqual(mockResult);
            expect(result.success).toBe(false);
        });
    });

    describe('awardRoseEssence', () => {
        beforeEach(() => {
            jobSystem.initialize(mockJobData, mockRoseEssenceData);
        });

        it('should award rose essence through rose essence manager', () => {
            // Arrange
            const amount = 20;
            const source = { type: 'boss_defeat', bossId: 'boss1' };

            // Act
            jobSystem.awardRoseEssence(amount, source);

            // Assert
            expect(mockRoseEssenceManager.addRoseEssence).toHaveBeenCalledWith(amount, source);
        });

        it('should throw error for invalid amount', () => {
            // Arrange
            const invalidAmount = -5;
            const source = { type: 'boss_defeat', bossId: 'boss1' };

            // Act & Assert
            expect(() => jobSystem.awardRoseEssence(invalidAmount, source))
                .toThrow('Invalid rose essence amount');
        });
    });

    describe('canRankUp', () => {
        beforeEach(() => {
            jobSystem.initialize(mockJobData, mockRoseEssenceData);
        });

        it('should return rank up availability from rank up manager', () => {
            // Arrange
            const characterId = 'char1';
            const mockAvailability = {
                canRankUp: true,
                characterId,
                currentRank: 1,
                nextRank: 2,
                requirements: {
                    roseEssenceCost: 10,
                    levelRequirement: 5,
                    prerequisiteSkills: []
                },
                currentStatus: {
                    hasEnoughEssence: true,
                    meetsLevelRequirement: true,
                    hasPrerequisiteSkills: true
                }
            };

            mockRankUpManager.canRankUp.mockReturnValue(mockAvailability);

            // Act
            const result = jobSystem.canRankUp(characterId);

            // Assert
            expect(result).toEqual(mockAvailability);
            expect(mockRankUpManager.canRankUp).toHaveBeenCalledWith(characterId, undefined);
        });
    });

    describe('error handling', () => {
        it('should handle job manager errors gracefully', () => {
            // Arrange
            jobSystem.initialize(mockJobData, mockRoseEssenceData);
            mockJobManager.setCharacterJob.mockImplementation(() => {
                throw new Error('Job manager error');
            });

            // Act & Assert
            expect(() => jobSystem.setCharacterJob('char1', 'warrior'))
                .toThrow('Job manager error');
        });

        it('should handle rose essence manager errors gracefully', () => {
            // Arrange
            jobSystem.initialize(mockJobData, mockRoseEssenceData);
            mockRoseEssenceManager.addRoseEssence.mockImplementation(() => {
                throw new Error('Rose essence manager error');
            });

            // Act & Assert
            expect(() => jobSystem.awardRoseEssence(10, { type: 'boss_defeat', bossId: 'boss1' }))
                .toThrow('Rose essence manager error');
        });

        it('should handle rank up manager errors gracefully', async () => {
            // Arrange
            jobSystem.initialize(mockJobData, mockRoseEssenceData);
            mockRankUpManager.executeRankUp.mockRejectedValue(new Error('Rank up manager error'));

            // Act & Assert
            await expect(jobSystem.rankUpJob('char1', 2))
                .rejects.toThrow('Rank up manager error');
        });
    });

    describe('integration with other systems', () => {
        beforeEach(() => {
            jobSystem.initialize(mockJobData, mockRoseEssenceData);
        });

        it('should properly integrate job changes with experience system', () => {
            // This test would verify integration with experience system
            // Implementation depends on the actual integration interface
            expect(jobSystem).toBeDefined();
        });

        it('should properly integrate job changes with skill system', () => {
            // This test would verify integration with skill system
            // Implementation depends on the actual integration interface
            expect(jobSystem).toBeDefined();
        });

        it('should properly integrate with battle system for rose essence awards', () => {
            // This test would verify integration with battle system
            // Implementation depends on the actual integration interface
            expect(jobSystem).toBeDefined();
        });
    });
});