import { JobSystem } from '../../game/src/systems/jobs/JobSystem';
import { JobManager } from '../../game/src/systems/jobs/JobManager';
import { RoseEssenceManager } from '../../game/src/systems/jobs/RoseEssenceManager';
import { RankUpManager } from '../../game/src/systems/jobs/RankUpManager';
import { JobData, RoseEssenceData } from '../../game/src/types/jobs';

/**
 * 職業システムパフォーマンステスト
 * 
 * このテストスイートは、職業システムのパフォーマンス要件を検証し、
 * 大量のデータや頻繁な操作に対する性能を測定します。
 */
describe('Job System Performance Benchmark', () => {
    let jobSystem: JobSystem;

    const createLargeJobData = (numJobs: number): JobData => {
        const jobData: JobData = {};

        for (let i = 0; i < numJobs; i++) {
            const jobId = `job${i}`;
            jobData[jobId] = {
                id: jobId,
                name: `Job ${i}`,
                description: `Description for job ${i}`,
                category: i % 2 === 0 ? 'warrior' : 'mage',
                maxRank: 3,
                statModifiers: {
                    1: { hp: i, mp: i, attack: i, defense: i, speed: i, skill: i, luck: i },
                    2: { hp: i * 2, mp: i * 2, attack: i * 2, defense: i * 2, speed: i * 2, skill: i * 2, luck: i * 2 },
                    3: { hp: i * 3, mp: i * 3, attack: i * 3, defense: i * 3, speed: i * 3, skill: i * 3, luck: i * 3 }
                },
                availableSkills: {
                    1: [`skill${i}_1`, `skill${i}_2`],
                    2: [`skill${i}_1`, `skill${i}_2`, `skill${i}_3`],
                    3: [`skill${i}_1`, `skill${i}_2`, `skill${i}_3`, `skill${i}_4`]
                },
                rankUpRequirements: {
                    2: { roseEssenceCost: 10 + i, levelRequirement: 5, prerequisiteSkills: [] },
                    3: { roseEssenceCost: 20 + i, levelRequirement: 10, prerequisiteSkills: [`skill${i}_3`] }
                },
                growthRateModifiers: {
                    1: { hp: 1.0 + i * 0.01, mp: 1.0 + i * 0.01, attack: 1.0 + i * 0.01, defense: 1.0 + i * 0.01, speed: 1.0 + i * 0.01, skill: 1.0 + i * 0.01, luck: 1.0 + i * 0.01 },
                    2: { hp: 1.1 + i * 0.01, mp: 1.1 + i * 0.01, attack: 1.1 + i * 0.01, defense: 1.1 + i * 0.01, speed: 1.1 + i * 0.01, skill: 1.1 + i * 0.01, luck: 1.1 + i * 0.01 },
                    3: { hp: 1.2 + i * 0.01, mp: 1.2 + i * 0.01, attack: 1.2 + i * 0.01, defense: 1.2 + i * 0.01, speed: 1.2 + i * 0.01, skill: 1.2 + i * 0.01, luck: 1.2 + i * 0.01 }
                },
                jobTraits: [],
                visual: {
                    iconPath: `job${i}_icon.png`,
                    spriteModifications: [],
                    colorScheme: { primary: '#000000', secondary: '#ffffff' }
                }
            };
        }

        return jobData;
    };

    const mockRoseEssenceData: RoseEssenceData = {
        currentAmount: 10000,
        totalEarned: 10000,
        totalSpent: 0,
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
        jobSystem = new JobSystem();
    });

    describe('Initialization Performance', () => {
        it('should initialize with small job data within performance threshold', () => {
            // Arrange
            const smallJobData = createLargeJobData(10);
            const startTime = performance.now();

            // Act
            jobSystem.initialize(smallJobData, mockRoseEssenceData);

            const endTime = performance.now();
            const initTime = endTime - startTime;

            // Assert
            expect(initTime).toBeLessThan(100); // 100ms threshold for small data
            console.log(`Small job data initialization time: ${initTime.toFixed(2)}ms`);
        });

        it('should initialize with medium job data within performance threshold', () => {
            // Arrange
            const mediumJobData = createLargeJobData(100);
            const startTime = performance.now();

            // Act
            jobSystem.initialize(mediumJobData, mockRoseEssenceData);

            const endTime = performance.now();
            const initTime = endTime - startTime;

            // Assert
            expect(initTime).toBeLessThan(500); // 500ms threshold for medium data
            console.log(`Medium job data initialization time: ${initTime.toFixed(2)}ms`);
        });

        it('should initialize with large job data within performance threshold', () => {
            // Arrange
            const largeJobData = createLargeJobData(1000);
            const startTime = performance.now();

            // Act
            jobSystem.initialize(largeJobData, mockRoseEssenceData);

            const endTime = performance.now();
            const initTime = endTime - startTime;

            // Assert
            expect(initTime).toBeLessThan(2000); // 2s threshold for large data (requirement 8.1)
            console.log(`Large job data initialization time: ${initTime.toFixed(2)}ms`);
        });
    });

    describe('Job Operations Performance', () => {
        beforeEach(() => {
            const jobData = createLargeJobData(100);
            jobSystem.initialize(jobData, mockRoseEssenceData);
        });

        it('should perform single job change within performance threshold', () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'job0');
            const startTime = performance.now();

            // Act
            jobSystem.changeJob('char1', 'job1');

            const endTime = performance.now();
            const changeTime = endTime - startTime;

            // Assert
            expect(changeTime).toBeLessThan(1000); // 1s threshold (requirement 8.2)
            console.log(`Single job change time: ${changeTime.toFixed(2)}ms`);
        });

        it('should perform multiple job changes efficiently', () => {
            // Arrange
            const numChanges = 100;
            const characters: string[] = [];

            for (let i = 0; i < numChanges; i++) {
                const charId = `char${i}`;
                characters.push(charId);
                jobSystem.setCharacterJob(charId, 'job0');
            }

            const startTime = performance.now();

            // Act
            for (let i = 0; i < numChanges; i++) {
                const newJobId = `job${(i + 1) % 10}`;
                jobSystem.changeJob(characters[i], newJobId);
            }

            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / numChanges;

            // Assert
            expect(averageTime).toBeLessThan(10); // 10ms average per change
            expect(totalTime).toBeLessThan(2000); // 2s total for 100 changes
            console.log(`Multiple job changes - Total: ${totalTime.toFixed(2)}ms, Average: ${averageTime.toFixed(2)}ms`);
        });

        it('should perform stat calculations efficiently', () => {
            // Arrange
            const numCalculations = 1000;
            const characters: string[] = [];

            for (let i = 0; i < numCalculations; i++) {
                const charId = `char${i}`;
                characters.push(charId);
                jobSystem.setCharacterJob(charId, `job${i % 10}`);
            }

            const startTime = performance.now();

            // Act
            for (const charId of characters) {
                jobSystem.calculateJobStats(charId);
            }

            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / numCalculations;

            // Assert
            expect(averageTime).toBeLessThan(1); // 1ms average per calculation
            expect(totalTime).toBeLessThan(1000); // 1s total for 1000 calculations (requirement 8.4)
            console.log(`Stat calculations - Total: ${totalTime.toFixed(2)}ms, Average: ${averageTime.toFixed(3)}ms`);
        });

        it('should perform skill retrieval efficiently', () => {
            // Arrange
            const numRetrievals = 1000;
            const characters: string[] = [];

            for (let i = 0; i < numRetrievals; i++) {
                const charId = `char${i}`;
                characters.push(charId);
                jobSystem.setCharacterJob(charId, `job${i % 10}`);
            }

            const startTime = performance.now();

            // Act
            for (const charId of characters) {
                jobSystem.getJobSkills(charId);
            }

            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / numRetrievals;

            // Assert
            expect(averageTime).toBeLessThan(0.5); // 0.5ms average per retrieval
            expect(totalTime).toBeLessThan(500); // 500ms total for 1000 retrievals
            console.log(`Skill retrievals - Total: ${totalTime.toFixed(2)}ms, Average: ${averageTime.toFixed(3)}ms`);
        });
    });

    describe('Rose Essence Operations Performance', () => {
        beforeEach(() => {
            const jobData = createLargeJobData(10);
            jobSystem.initialize(jobData, mockRoseEssenceData);
        });

        it('should perform rose essence transactions efficiently', () => {
            // Arrange
            const numTransactions = 1000;
            const startTime = performance.now();

            // Act
            for (let i = 0; i < numTransactions; i++) {
                if (i % 2 === 0) {
                    jobSystem.awardRoseEssence(10, { type: 'boss_defeat', bossId: `boss${i}` });
                } else {
                    jobSystem.consumeRoseEssence(5, 'rank_up');
                }
            }

            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / numTransactions;

            // Assert
            expect(averageTime).toBeLessThan(1); // 1ms average per transaction
            expect(totalTime).toBeLessThan(1000); // 1s total for 1000 transactions
            console.log(`Rose essence transactions - Total: ${totalTime.toFixed(2)}ms, Average: ${averageTime.toFixed(3)}ms`);
        });

        it('should handle large transaction history efficiently', () => {
            // Arrange - Create large transaction history
            for (let i = 0; i < 1000; i++) {
                jobSystem.awardRoseEssence(1, { type: 'boss_defeat', bossId: `boss${i}` });
            }

            const startTime = performance.now();

            // Act
            const history = jobSystem.getRoseEssenceHistory();

            const endTime = performance.now();
            const retrievalTime = endTime - startTime;

            // Assert
            expect(retrievalTime).toBeLessThan(100); // 100ms threshold for history retrieval
            expect(history.length).toBe(1000);
            console.log(`Large history retrieval time: ${retrievalTime.toFixed(2)}ms`);
        });
    });

    describe('Rank Up Operations Performance', () => {
        beforeEach(() => {
            const jobData = createLargeJobData(10);
            jobSystem.initialize(jobData, mockRoseEssenceData);
        });

        it('should perform single rank up within performance threshold', async () => {
            // Arrange
            jobSystem.setCharacterJob('char1', 'job0');
            const startTime = performance.now();

            // Act
            await jobSystem.rankUpJob('char1', 2);

            const endTime = performance.now();
            const rankUpTime = endTime - startTime;

            // Assert
            expect(rankUpTime).toBeLessThan(100); // 100ms threshold for single rank up
            console.log(`Single rank up time: ${rankUpTime.toFixed(2)}ms`);
        });

        it('should perform multiple rank ups efficiently', async () => {
            // Arrange
            const numRankUps = 50;
            const characters: string[] = [];

            for (let i = 0; i < numRankUps; i++) {
                const charId = `char${i}`;
                characters.push(charId);
                jobSystem.setCharacterJob(charId, 'job0');
            }

            const startTime = performance.now();

            // Act
            const rankUpPromises = characters.map(charId => jobSystem.rankUpJob(charId, 2));
            await Promise.all(rankUpPromises);

            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / numRankUps;

            // Assert
            expect(averageTime).toBeLessThan(50); // 50ms average per rank up
            expect(totalTime).toBeLessThan(5000); // 5s total for 50 rank ups
            console.log(`Multiple rank ups - Total: ${totalTime.toFixed(2)}ms, Average: ${averageTime.toFixed(2)}ms`);
        });

        it('should check rank up availability efficiently', () => {
            // Arrange
            const numChecks = 1000;
            const characters: string[] = [];

            for (let i = 0; i < numChecks; i++) {
                const charId = `char${i}`;
                characters.push(charId);
                jobSystem.setCharacterJob(charId, `job${i % 10}`);
            }

            const startTime = performance.now();

            // Act
            for (const charId of characters) {
                jobSystem.canRankUp(charId);
            }

            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / numChecks;

            // Assert
            expect(averageTime).toBeLessThan(0.5); // 0.5ms average per check
            expect(totalTime).toBeLessThan(500); // 500ms total for 1000 checks
            console.log(`Rank up availability checks - Total: ${totalTime.toFixed(2)}ms, Average: ${averageTime.toFixed(3)}ms`);
        });
    });

    describe('Memory Usage Performance', () => {
        it('should manage memory efficiently with large number of characters', () => {
            // Arrange
            const jobData = createLargeJobData(100);
            jobSystem.initialize(jobData, mockRoseEssenceData);

            const numCharacters = 1000;
            const initialMemory = process.memoryUsage().heapUsed;

            // Act
            for (let i = 0; i < numCharacters; i++) {
                const charId = `char${i}`;
                jobSystem.setCharacterJob(charId, `job${i % 100}`);
                jobSystem.calculateJobStats(charId);
                jobSystem.getJobSkills(charId);
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryPerCharacter = memoryIncrease / numCharacters;

            // Assert
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB increase limit
            expect(memoryPerCharacter).toBeLessThan(50 * 1024); // 50KB per character limit
            console.log(`Memory usage - Total increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB, Per character: ${(memoryPerCharacter / 1024).toFixed(2)}KB`);
        });

        it('should handle memory cleanup properly', () => {
            // Arrange
            const jobData = createLargeJobData(10);
            jobSystem.initialize(jobData, mockRoseEssenceData);

            // Act - Create and remove many characters
            for (let cycle = 0; cycle < 10; cycle++) {
                for (let i = 0; i < 100; i++) {
                    const charId = `char${cycle}_${i}`;
                    jobSystem.setCharacterJob(charId, 'job0');
                    jobSystem.calculateJobStats(charId);
                }

                // Simulate cleanup (in real implementation, this would be automatic)
                if (jobSystem.cleanup) {
                    jobSystem.cleanup();
                }
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;

            // Assert - Memory should not grow indefinitely
            expect(finalMemory).toBeLessThan(100 * 1024 * 1024); // 100MB limit
            console.log(`Final memory usage after cleanup: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
        });
    });

    describe('Concurrent Operations Performance', () => {
        beforeEach(() => {
            const jobData = createLargeJobData(10);
            jobSystem.initialize(jobData, mockRoseEssenceData);
        });

        it('should handle concurrent job operations efficiently', async () => {
            // Arrange
            const numConcurrentOps = 100;
            const operations: Promise<any>[] = [];

            const startTime = performance.now();

            // Act - Create concurrent operations
            for (let i = 0; i < numConcurrentOps; i++) {
                const charId = `char${i}`;
                jobSystem.setCharacterJob(charId, 'job0');

                // Mix of different operations
                if (i % 4 === 0) {
                    operations.push(jobSystem.rankUpJob(charId, 2));
                } else if (i % 4 === 1) {
                    operations.push(Promise.resolve(jobSystem.changeJob(charId, 'job1')));
                } else if (i % 4 === 2) {
                    operations.push(Promise.resolve(jobSystem.calculateJobStats(charId)));
                } else {
                    operations.push(Promise.resolve(jobSystem.getJobSkills(charId)));
                }
            }

            await Promise.all(operations);

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Assert
            expect(totalTime).toBeLessThan(5000); // 5s for 100 concurrent operations
            console.log(`Concurrent operations time: ${totalTime.toFixed(2)}ms`);
        });

        it('should maintain data consistency under concurrent access', async () => {
            // Arrange
            const charId = 'test_char';
            jobSystem.setCharacterJob(charId, 'job0');

            const operations: Promise<any>[] = [];

            // Act - Perform concurrent operations on same character
            for (let i = 0; i < 50; i++) {
                operations.push(Promise.resolve(jobSystem.calculateJobStats(charId)));
                operations.push(Promise.resolve(jobSystem.getJobSkills(charId)));
            }

            await Promise.all(operations);

            // Assert - Character should still be in valid state
            const finalJobData = jobSystem.getCharacterJobData(charId);
            expect(finalJobData).toBeDefined();
            expect(finalJobData.currentJobId).toBe('job0');
            expect(finalJobData.currentRank).toBe(1);
        });
    });

    describe('Stress Testing', () => {
        it('should handle extreme load without crashing', () => {
            // Arrange
            const extremeJobData = createLargeJobData(500);
            const startTime = performance.now();

            // Act
            jobSystem.initialize(extremeJobData, mockRoseEssenceData);

            // Create many characters with random operations
            for (let i = 0; i < 1000; i++) {
                const charId = `stress_char${i}`;
                const jobId = `job${i % 500}`;

                try {
                    jobSystem.setCharacterJob(charId, jobId);
                    jobSystem.calculateJobStats(charId);
                    jobSystem.getJobSkills(charId);

                    if (i % 10 === 0) {
                        jobSystem.changeJob(charId, `job${(i + 1) % 500}`);
                    }
                } catch (error) {
                    // Should not crash under stress
                    fail(`System crashed under stress at iteration ${i}: ${error}`);
                }
            }

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            // Assert
            expect(totalTime).toBeLessThan(10000); // 10s limit for stress test
            expect(jobSystem.getCurrentRoseEssence()).toBeGreaterThanOrEqual(0);
            console.log(`Stress test completed in: ${totalTime.toFixed(2)}ms`);
        });

        it('should recover gracefully from error conditions', () => {
            // Arrange
            const jobData = createLargeJobData(10);
            jobSystem.initialize(jobData, mockRoseEssenceData);

            let errorCount = 0;
            let successCount = 0;

            // Act - Mix valid and invalid operations
            for (let i = 0; i < 100; i++) {
                try {
                    if (i % 5 === 0) {
                        // Invalid operation
                        jobSystem.setCharacterJob(`char${i}`, 'invalid_job');
                    } else {
                        // Valid operation
                        jobSystem.setCharacterJob(`char${i}`, 'job0');
                        jobSystem.calculateJobStats(`char${i}`);
                        successCount++;
                    }
                } catch (error) {
                    errorCount++;
                }
            }

            // Assert
            expect(successCount).toBeGreaterThan(0);
            expect(errorCount).toBeGreaterThan(0);
            expect(jobSystem.getCurrentRoseEssence()).toBe(10000); // System should remain stable
            console.log(`Error recovery test - Successes: ${successCount}, Errors: ${errorCount}`);
        });
    });
});