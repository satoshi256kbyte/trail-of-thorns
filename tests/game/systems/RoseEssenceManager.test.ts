import { RoseEssenceManager } from '../../../game/src/systems/jobs/RoseEssenceManager';
import { RoseEssenceData, RoseEssenceTransaction, RoseEssenceSource } from '../../../game/src/types/jobs';

describe('RoseEssenceManager', () => {
    let roseEssenceManager: RoseEssenceManager;

    const mockRoseEssenceData: RoseEssenceData = {
        currentAmount: 50,
        totalEarned: 100,
        totalSpent: 50,
        sources: {
            boss_defeat: { baseAmount: 20, difficultyMultiplier: 1.5, firstTimeBonus: 10 },
            mini_boss_defeat: { baseAmount: 10, difficultyMultiplier: 1.2, firstTimeBonus: 5 },
            special_event: { baseAmount: 15, difficultyMultiplier: 1.0, firstTimeBonus: 0 }
        },
        costs: {
            rankUp: {
                warrior: { 2: 10, 3: 20 },
                mage: { 2: 15, 3: 25 },
                archer: { 2: 12, 3: 22 }
            },
            jobChange: 5,
            skillUnlock: 3
        }
    };

    beforeEach(() => {
        roseEssenceManager = new RoseEssenceManager();
    });

    describe('initialize', () => {
        it('should initialize with provided rose essence data', () => {
            // Act
            roseEssenceManager.initialize(mockRoseEssenceData);

            // Assert
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(50);
        });

        it('should throw error for invalid rose essence data', () => {
            // Arrange
            const invalidData = {} as RoseEssenceData;

            // Act & Assert
            expect(() => roseEssenceManager.initialize(invalidData))
                .toThrow('Invalid rose essence data provided');
        });

        it('should handle missing sources or costs gracefully', () => {
            // Arrange
            const incompleteData = {
                currentAmount: 10,
                totalEarned: 10,
                totalSpent: 0,
                sources: {},
                costs: { rankUp: {}, jobChange: 5, skillUnlock: 3 }
            } as RoseEssenceData;

            // Act & Assert
            expect(() => roseEssenceManager.initialize(incompleteData)).not.toThrow();
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(10);
        });
    });

    describe('addRoseEssence', () => {
        beforeEach(() => {
            roseEssenceManager.initialize(mockRoseEssenceData);
        });

        it('should add rose essence with basic source', () => {
            // Arrange
            const initialAmount = roseEssenceManager.getCurrentRoseEssence();
            const source: RoseEssenceSource = { type: 'boss_defeat', bossId: 'boss1' };

            // Act
            roseEssenceManager.addRoseEssence(20, source);

            // Assert
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(initialAmount + 20);
        });

        it('should add rose essence with difficulty multiplier', () => {
            // Arrange
            const initialAmount = roseEssenceManager.getCurrentRoseEssence();
            const source: RoseEssenceSource = {
                type: 'boss_defeat',
                bossId: 'boss1',
                difficulty: 'hard'
            };

            // Act
            roseEssenceManager.addRoseEssence(20, source);

            // Assert
            const expectedAmount = Math.floor(20 * 1.5); // difficulty multiplier
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(initialAmount + expectedAmount);
        });

        it('should add first time bonus when applicable', () => {
            // Arrange
            const initialAmount = roseEssenceManager.getCurrentRoseEssence();
            const source: RoseEssenceSource = {
                type: 'boss_defeat',
                bossId: 'boss1',
                isFirstTime: true
            };

            // Act
            roseEssenceManager.addRoseEssence(20, source);

            // Assert
            const expectedAmount = 20 + 10; // base + first time bonus
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(initialAmount + expectedAmount);
        });

        it('should record transaction in history', () => {
            // Arrange
            const source: RoseEssenceSource = { type: 'boss_defeat', bossId: 'boss1' };

            // Act
            roseEssenceManager.addRoseEssence(20, source);

            // Assert
            const history = roseEssenceManager.getEssenceHistory();
            const lastTransaction = history[history.length - 1];
            expect(lastTransaction.type).toBe('gain');
            expect(lastTransaction.amount).toBe(20);
            expect(lastTransaction.source).toBe('boss_defeat');
        });

        it('should throw error for negative amount', () => {
            // Arrange
            const source: RoseEssenceSource = { type: 'boss_defeat', bossId: 'boss1' };

            // Act & Assert
            expect(() => roseEssenceManager.addRoseEssence(-10, source))
                .toThrow('Rose essence amount must be positive');
        });

        it('should throw error for zero amount', () => {
            // Arrange
            const source: RoseEssenceSource = { type: 'boss_defeat', bossId: 'boss1' };

            // Act & Assert
            expect(() => roseEssenceManager.addRoseEssence(0, source))
                .toThrow('Rose essence amount must be positive');
        });
    });

    describe('consumeRoseEssence', () => {
        beforeEach(() => {
            roseEssenceManager.initialize(mockRoseEssenceData);
        });

        it('should consume rose essence when sufficient amount available', () => {
            // Arrange
            const initialAmount = roseEssenceManager.getCurrentRoseEssence();
            const consumeAmount = 20;

            // Act
            const result = roseEssenceManager.consumeRoseEssence(consumeAmount, 'rank_up');

            // Assert
            expect(result).toBe(true);
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(initialAmount - consumeAmount);
        });

        it('should fail to consume when insufficient amount available', () => {
            // Arrange
            const currentAmount = roseEssenceManager.getCurrentRoseEssence();
            const consumeAmount = currentAmount + 10;

            // Act
            const result = roseEssenceManager.consumeRoseEssence(consumeAmount, 'rank_up');

            // Assert
            expect(result).toBe(false);
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(currentAmount); // Unchanged
        });

        it('should record consumption transaction in history', () => {
            // Act
            roseEssenceManager.consumeRoseEssence(20, 'rank_up');

            // Assert
            const history = roseEssenceManager.getEssenceHistory();
            const lastTransaction = history[history.length - 1];
            expect(lastTransaction.type).toBe('spend');
            expect(lastTransaction.amount).toBe(20);
            expect(lastTransaction.source).toBe('rank_up');
        });

        it('should throw error for negative amount', () => {
            // Act & Assert
            expect(() => roseEssenceManager.consumeRoseEssence(-10, 'rank_up'))
                .toThrow('Rose essence amount must be positive');
        });

        it('should throw error for zero amount', () => {
            // Act & Assert
            expect(() => roseEssenceManager.consumeRoseEssence(0, 'rank_up'))
                .toThrow('Rose essence amount must be positive');
        });
    });

    describe('hasEnoughEssence', () => {
        beforeEach(() => {
            roseEssenceManager.initialize(mockRoseEssenceData);
        });

        it('should return true when sufficient essence available', () => {
            // Arrange
            const currentAmount = roseEssenceManager.getCurrentRoseEssence();
            const requiredAmount = currentAmount - 10;

            // Act
            const result = roseEssenceManager.hasEnoughEssence(requiredAmount);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when insufficient essence available', () => {
            // Arrange
            const currentAmount = roseEssenceManager.getCurrentRoseEssence();
            const requiredAmount = currentAmount + 10;

            // Act
            const result = roseEssenceManager.hasEnoughEssence(requiredAmount);

            // Assert
            expect(result).toBe(false);
        });

        it('should return true when exact amount available', () => {
            // Arrange
            const currentAmount = roseEssenceManager.getCurrentRoseEssence();

            // Act
            const result = roseEssenceManager.hasEnoughEssence(currentAmount);

            // Assert
            expect(result).toBe(true);
        });

        it('should handle zero requirement', () => {
            // Act
            const result = roseEssenceManager.hasEnoughEssence(0);

            // Assert
            expect(result).toBe(true);
        });

        it('should throw error for negative requirement', () => {
            // Act & Assert
            expect(() => roseEssenceManager.hasEnoughEssence(-10))
                .toThrow('Required amount must be non-negative');
        });
    });

    describe('predictEssenceGain', () => {
        beforeEach(() => {
            roseEssenceManager.initialize(mockRoseEssenceData);
        });

        it('should predict basic essence gain for known boss type', () => {
            // Act
            const prediction = roseEssenceManager.predictEssenceGain('boss_defeat');

            // Assert
            expect(prediction).toBe(20); // Base amount
        });

        it('should predict essence gain with difficulty multiplier', () => {
            // Act
            const prediction = roseEssenceManager.predictEssenceGain('boss_defeat', 'hard');

            // Assert
            expect(prediction).toBe(30); // 20 * 1.5
        });

        it('should predict essence gain with first time bonus', () => {
            // Act
            const prediction = roseEssenceManager.predictEssenceGain('boss_defeat', 'normal', true);

            // Assert
            expect(prediction).toBe(30); // 20 + 10
        });

        it('should predict essence gain with both multiplier and bonus', () => {
            // Act
            const prediction = roseEssenceManager.predictEssenceGain('boss_defeat', 'hard', true);

            // Assert
            expect(prediction).toBe(40); // (20 * 1.5) + 10
        });

        it('should return 0 for unknown boss type', () => {
            // Act
            const prediction = roseEssenceManager.predictEssenceGain('unknown_boss');

            // Assert
            expect(prediction).toBe(0);
        });
    });

    describe('getEssenceHistory', () => {
        beforeEach(() => {
            roseEssenceManager.initialize(mockRoseEssenceData);
        });

        it('should return empty history initially', () => {
            // Act
            const history = roseEssenceManager.getEssenceHistory();

            // Assert
            expect(history).toEqual([]);
        });

        it('should return complete transaction history', () => {
            // Arrange
            const source1: RoseEssenceSource = { type: 'boss_defeat', bossId: 'boss1' };
            const source2: RoseEssenceSource = { type: 'mini_boss_defeat', bossId: 'mini1' };

            // Act
            roseEssenceManager.addRoseEssence(20, source1);
            roseEssenceManager.consumeRoseEssence(10, 'rank_up');
            roseEssenceManager.addRoseEssence(15, source2);

            // Assert
            const history = roseEssenceManager.getEssenceHistory();
            expect(history).toHaveLength(3);
            expect(history[0].type).toBe('gain');
            expect(history[0].amount).toBe(20);
            expect(history[1].type).toBe('spend');
            expect(history[1].amount).toBe(10);
            expect(history[2].type).toBe('gain');
            expect(history[2].amount).toBe(15);
        });

        it('should maintain chronological order in history', () => {
            // Arrange
            const source: RoseEssenceSource = { type: 'boss_defeat', bossId: 'boss1' };

            // Act
            roseEssenceManager.addRoseEssence(10, source);
            const firstTimestamp = new Date();

            // Small delay to ensure different timestamps
            setTimeout(() => {
                roseEssenceManager.addRoseEssence(20, source);
                const secondTimestamp = new Date();

                // Assert
                const history = roseEssenceManager.getEssenceHistory();
                expect(history[0].timestamp.getTime()).toBeLessThanOrEqual(firstTimestamp.getTime());
                expect(history[1].timestamp.getTime()).toBeGreaterThanOrEqual(secondTimestamp.getTime());
            }, 10);
        });
    });

    describe('data persistence and recovery', () => {
        beforeEach(() => {
            roseEssenceManager.initialize(mockRoseEssenceData);
        });

        it('should maintain data consistency after multiple operations', () => {
            // Arrange
            const initialAmount = roseEssenceManager.getCurrentRoseEssence();
            const source: RoseEssenceSource = { type: 'boss_defeat', bossId: 'boss1' };

            // Act
            roseEssenceManager.addRoseEssence(30, source);
            roseEssenceManager.consumeRoseEssence(20, 'rank_up');
            roseEssenceManager.addRoseEssence(10, source);
            roseEssenceManager.consumeRoseEssence(5, 'job_change');

            // Assert
            const expectedAmount = initialAmount + 30 - 20 + 10 - 5;
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(expectedAmount);
        });

        it('should handle edge case of consuming all essence', () => {
            // Arrange
            const currentAmount = roseEssenceManager.getCurrentRoseEssence();

            // Act
            const result = roseEssenceManager.consumeRoseEssence(currentAmount, 'rank_up');

            // Assert
            expect(result).toBe(true);
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(0);
        });

        it('should handle large amounts without overflow', () => {
            // Arrange
            const largeAmount = Number.MAX_SAFE_INTEGER - 1000;
            const source: RoseEssenceSource = { type: 'special_event', eventId: 'large_reward' };

            // Act & Assert
            expect(() => roseEssenceManager.addRoseEssence(largeAmount, source)).not.toThrow();
        });
    });

    describe('error handling and edge cases', () => {
        beforeEach(() => {
            roseEssenceManager.initialize(mockRoseEssenceData);
        });

        it('should handle invalid source types gracefully', () => {
            // Arrange
            const invalidSource: RoseEssenceSource = { type: 'invalid_type' as any, bossId: 'boss1' };

            // Act & Assert
            expect(() => roseEssenceManager.addRoseEssence(10, invalidSource)).not.toThrow();
            expect(roseEssenceManager.getCurrentRoseEssence()).toBe(60); // 50 + 10
        });

        it('should handle missing source configuration', () => {
            // Arrange
            const unknownSource: RoseEssenceSource = { type: 'unknown_source' as any };

            // Act
            const prediction = roseEssenceManager.predictEssenceGain('unknown_source');

            // Assert
            expect(prediction).toBe(0);
        });

        it('should validate transaction data integrity', () => {
            // Arrange
            const source: RoseEssenceSource = { type: 'boss_defeat', bossId: 'boss1' };

            // Act
            roseEssenceManager.addRoseEssence(25, source);

            // Assert
            const history = roseEssenceManager.getEssenceHistory();
            const transaction = history[history.length - 1];
            expect(transaction.id).toBeDefined();
            expect(transaction.timestamp).toBeInstanceOf(Date);
            expect(transaction.description).toBeDefined();
        });
    });

    describe('performance and scalability', () => {
        beforeEach(() => {
            roseEssenceManager.initialize(mockRoseEssenceData);
        });

        it('should handle large number of transactions efficiently', () => {
            // Arrange
            const startTime = performance.now();
            const numTransactions = 1000;
            const source: RoseEssenceSource = { type: 'boss_defeat', bossId: 'boss1' };

            // Act
            for (let i = 0; i < numTransactions; i++) {
                if (i % 2 === 0) {
                    roseEssenceManager.addRoseEssence(10, source);
                } else {
                    roseEssenceManager.consumeRoseEssence(5, 'rank_up');
                }
            }

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // Assert
            expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
            expect(roseEssenceManager.getEssenceHistory()).toHaveLength(numTransactions);
        });

        it('should maintain memory efficiency with large history', () => {
            // This test would check memory usage, but is simplified for unit testing
            const source: RoseEssenceSource = { type: 'boss_defeat', bossId: 'boss1' };

            for (let i = 0; i < 100; i++) {
                roseEssenceManager.addRoseEssence(1, source);
            }

            expect(roseEssenceManager.getEssenceHistory()).toHaveLength(100);
        });
    });
});