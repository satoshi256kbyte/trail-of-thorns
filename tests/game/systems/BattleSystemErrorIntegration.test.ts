/**
 * Integration tests for BattleSystem error handling
 * Tests the complete error handling workflow from error detection to recovery
 */

import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { BattleError } from '../../../game/src/types/battle';
import { Unit, MapData } from '../../../game/src/types/gameplay';

// Mock Phaser scene
const mockScene = {
    add: {
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            fillRect: jest.fn(),
            strokeRect: jest.fn(),
            destroy: jest.fn()
        }),
        container: jest.fn().mockReturnValue({
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setPosition: jest.fn().mockReturnThis(),
            add: jest.fn(),
            destroy: jest.fn()
        }),
        text: jest.fn().mockReturnValue({
            setStyle: jest.fn().mockReturnThis(),
            setText: jest.fn(),
            width: 200,
            height: 50
        })
    },
    cameras: {
        main: {
            centerX: 400,
            centerY: 300,
            x: 0,
            y: 0
        }
    },
    time: {
        delayedCall: jest.fn()
    },
    tweens: {
        killAll: jest.fn()
    },
    sound: {
        get: jest.fn().mockReturnValue(true),
        play: jest.fn()
    }
} as any;

// Mock units and map data
const createMockUnit = (id: string, overrides: Partial<Unit> = {}): Unit => ({
    id,
    name: `Unit ${id}`,
    position: { x: 0, y: 0 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'player',
    hasActed: false,
    hasMoved: false,
    ...overrides
});

const createMockMapData = (): MapData => ({
    width: 10,
    height: 10,
    tiles: Array(10).fill(null).map(() =>
        Array(10).fill({ type: 'grass', movementCost: 1 })
    )
});

describe('BattleSystem Error Handling Integration', () => {
    let battleSystem: BattleSystem;
    let playerUnit: Unit;
    let enemyUnit: Unit;
    let mapData: MapData;

    beforeEach(() => {
        jest.clearAllMocks();

        battleSystem = new BattleSystem(mockScene, {
            enableAnimations: false, // Disable for testing
            enableBattleLogging: false
        });

        playerUnit = createMockUnit('player1', { faction: 'player' });
        enemyUnit = createMockUnit('enemy1', {
            faction: 'enemy',
            position: { x: 5, y: 5 }
        });
        mapData = createMockMapData();

        battleSystem.initialize([playerUnit, enemyUnit], mapData);
    });

    afterEach(() => {
        battleSystem.destroy();
    });

    describe('Error Detection and Classification', () => {
        test('should detect and handle invalid attacker error', async () => {
            const defeatedUnit = createMockUnit('defeated', {
                currentHP: 0,
                faction: 'player'
            });

            const errorSpy = jest.fn();
            battleSystem.on('battle-error', errorSpy);

            try {
                await battleSystem.initiateAttack(defeatedUnit);
            } catch (error) {
                // Expected to throw
            }

            expect(errorSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: BattleError.INVALID_ATTACKER
                })
            );
        });

        test('should detect and handle already acted error', async () => {
            const actedUnit = createMockUnit('acted', {
                hasActed: true,
                faction: 'player'
            });

            const errorSpy = jest.fn();
            battleSystem.on('battle-error', errorSpy);

            try {
                await battleSystem.initiateAttack(actedUnit);
            } catch (error) {
                // Expected to throw
            }

            expect(errorSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: BattleError.ALREADY_ACTED
                })
            );
        });

        test('should detect invalid target during selection', async () => {
            await battleSystem.initiateAttack(playerUnit);

            const errorSpy = jest.fn();
            battleSystem.on('battle-error', errorSpy);

            // Try to target an ally (invalid target)
            const allyUnit = createMockUnit('ally', { faction: 'player' });

            try {
                await battleSystem.selectTarget(allyUnit);
            } catch (error) {
                // Expected to throw
            }

            expect(errorSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: BattleError.INVALID_TARGET
                })
            );
        });
    });

    describe('Error Recovery Mechanisms', () => {
        test('should cancel attack on invalid target error', async () => {
            await battleSystem.initiateAttack(playerUnit);

            const initialState = battleSystem.getSystemState();
            expect(initialState.isActive).toBe(true);

            const errorSpy = jest.fn();
            const cancelSpy = jest.fn();
            battleSystem.on('battle-error', errorSpy);
            battleSystem.on('attack-cancelled', cancelSpy);

            // Try invalid target
            const allyUnit = createMockUnit('ally', { faction: 'player' });

            try {
                await battleSystem.selectTarget(allyUnit);
            } catch (error) {
                // Expected to throw
            }

            // Should trigger error recovery
            expect(errorSpy).toHaveBeenCalled();

            // Check if system was reset appropriately
            const finalState = battleSystem.getSystemState();
            expect(finalState.phase).toBe('idle');
        });

        test('should reset system on critical error', async () => {
            const resetSpy = jest.fn();
            battleSystem.on('system-reset', resetSpy);

            // Simulate critical error by forcing an internal error
            const originalMethod = battleSystem['executeBattle'];
            battleSystem['executeBattle'] = jest.fn().mockRejectedValue(
                new Error('BATTLE_SYSTEM_ERROR: Critical failure')
            );

            await battleSystem.initiateAttack(playerUnit);

            try {
                await battleSystem.selectTarget(enemyUnit);
            } catch (error) {
                // Expected to throw
            }

            // Should eventually trigger system reset
            expect(resetSpy).toHaveBeenCalled();

            // Restore original method
            battleSystem['executeBattle'] = originalMethod;
        });

        test('should handle retry requests correctly', async () => {
            const retrySpy = jest.fn();
            battleSystem.on('retry-requested', retrySpy);

            // Simulate error that triggers retry
            battleSystem['errorHandler'].emit('retry-requested', {
                error: BattleError.OUT_OF_RANGE,
                context: { attacker: playerUnit, phase: 'target_selection' }
            });

            expect(retrySpy).toHaveBeenCalled();

            // System should be reset to allow retry
            const state = battleSystem.getSystemState();
            expect(state.phase).toBe('idle');
            expect(state.isActive).toBe(false);
        });
    });

    describe('State Cleanup and Recovery', () => {
        test('should clean up visual elements on error', async () => {
            await battleSystem.initiateAttack(playerUnit);

            // Graphics should be created for range display
            expect(mockScene.add.graphics).toHaveBeenCalled();

            // Force an error
            try {
                await battleSystem.selectTarget(createMockUnit('invalid', { faction: 'player' }));
            } catch (error) {
                // Expected to throw
            }

            // Graphics destroy should be called during cleanup
            const graphicsMock = mockScene.add.graphics();
            expect(graphicsMock.destroy).toHaveBeenCalled();
        });

        test('should maintain system integrity after error recovery', async () => {
            // Cause an error
            try {
                await battleSystem.initiateAttack(createMockUnit('defeated', { currentHP: 0 }));
            } catch (error) {
                // Expected to throw
            }

            // System should still be functional
            const integrity = battleSystem.validateSystemIntegrity();
            expect(integrity.valid).toBe(true);

            // Should be able to start new attack
            const canAttack = battleSystem.canAttack(playerUnit);
            expect(canAttack).toBe(true);
        });

        test('should preserve battle history during error recovery', async () => {
            // Add some battle history first
            battleSystem['battleHistory'].push({
                attacker: playerUnit,
                target: enemyUnit,
                weapon: {
                    id: 'test-sword',
                    name: 'Test Sword',
                    type: 'sword' as any,
                    attackPower: 10,
                    range: 1,
                    rangePattern: { type: 'single', range: 1, pattern: [] },
                    element: 'none' as any,
                    criticalRate: 10,
                    accuracy: 90,
                    specialEffects: [],
                    description: 'Test weapon'
                },
                baseDamage: 10,
                finalDamage: 10,
                modifiers: [],
                isCritical: false,
                isEvaded: false,
                experienceGained: 10,
                targetDefeated: false,
                effectsApplied: [],
                timestamp: Date.now()
            });

            const initialHistory = battleSystem.getBattleHistory();
            expect(initialHistory).toHaveLength(1);

            // Cause an error
            try {
                await battleSystem.initiateAttack(createMockUnit('defeated', { currentHP: 0 }));
            } catch (error) {
                // Expected to throw
            }

            // History should be preserved
            const finalHistory = battleSystem.getBattleHistory();
            expect(finalHistory).toHaveLength(1);
        });
    });

    describe('User Feedback Integration', () => {
        test('should provide user feedback for errors', async () => {
            const errorSpy = jest.fn();
            battleSystem.on('battle-error', errorSpy);

            try {
                await battleSystem.initiateAttack(createMockUnit('defeated', { currentHP: 0 }));
            } catch (error) {
                // Expected to throw
            }

            expect(errorSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    recoveryResult: expect.objectContaining({
                        userGuidance: expect.any(String)
                    })
                })
            );
        });

        test('should show appropriate error messages', async () => {
            try {
                await battleSystem.initiateAttack(createMockUnit('defeated', { currentHP: 0 }));
            } catch (error) {
                // Expected to throw
            }

            // Should create text element for error message
            expect(mockScene.add.text).toHaveBeenCalled();
        });
    });

    describe('Error Statistics and Monitoring', () => {
        test('should track error statistics', async () => {
            // Generate multiple errors
            try {
                await battleSystem.initiateAttack(createMockUnit('defeated1', { currentHP: 0 }));
            } catch (error) {
                // Expected to throw
            }

            try {
                await battleSystem.initiateAttack(createMockUnit('defeated2', { currentHP: 0 }));
            } catch (error) {
                // Expected to throw
            }

            const stats = battleSystem.getErrorStatistics();
            expect(stats.totalErrors).toBeGreaterThan(0);
            expect(stats.errorsByType[BattleError.INVALID_ATTACKER]).toBeGreaterThan(0);
        });

        test('should provide error history for debugging', async () => {
            try {
                await battleSystem.initiateAttack(createMockUnit('defeated', { currentHP: 0 }));
            } catch (error) {
                // Expected to throw
            }

            const errorHandler = battleSystem['errorHandler'];
            const history = errorHandler.getErrorHistory();
            expect(history.length).toBeGreaterThan(0);
            expect(history[0]).toMatchObject({
                error: expect.any(String),
                message: expect.any(String),
                timestamp: expect.any(Number),
                recoverable: expect.any(Boolean)
            });
        });
    });

    describe('Complex Error Scenarios', () => {
        test('should handle cascading errors gracefully', async () => {
            const errorSpy = jest.fn();
            const criticalErrorSpy = jest.fn();
            battleSystem.on('battle-error', errorSpy);
            battleSystem.on('critical-error', criticalErrorSpy);

            // Mock multiple system failures
            const originalAnimator = battleSystem['battleAnimator'];
            battleSystem['battleAnimator'] = {
                ...originalAnimator,
                playAttackAnimation: jest.fn().mockRejectedValue(new Error('Animation failed')),
                clearBattleEffects: jest.fn()
            } as any;

            await battleSystem.initiateAttack(playerUnit);

            try {
                await battleSystem.selectTarget(enemyUnit);
            } catch (error) {
                // Expected to throw
            }

            // Should handle the error without causing system crash
            const integrity = battleSystem.validateSystemIntegrity();
            expect(integrity.valid).toBe(true);
        });

        test('should recover from error handler failures', async () => {
            const criticalErrorSpy = jest.fn();
            battleSystem.on('critical-error', criticalErrorSpy);

            // Mock error handler failure
            const originalHandler = battleSystem['errorHandler'];
            battleSystem['errorHandler'] = {
                ...originalHandler,
                handleError: jest.fn().mockRejectedValue(new Error('Handler failed'))
            } as any;

            try {
                await battleSystem.initiateAttack(createMockUnit('defeated', { currentHP: 0 }));
            } catch (error) {
                // Expected to throw
            }

            // Should emit critical error but not crash
            expect(criticalErrorSpy).toHaveBeenCalled();

            // System should still be in a valid state
            const state = battleSystem.getSystemState();
            expect(state.phase).toBe('idle');
        });
    });

    describe('Performance Under Error Conditions', () => {
        test('should handle rapid error generation without performance degradation', async () => {
            const startTime = Date.now();

            // Generate many errors rapidly
            const promises = [];
            for (let i = 0; i < 50; i++) {
                promises.push(
                    battleSystem.initiateAttack(createMockUnit(`defeated${i}`, { currentHP: 0 }))
                        .catch(() => { }) // Ignore errors for this test
                );
            }

            await Promise.all(promises);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (less than 1 second)
            expect(duration).toBeLessThan(1000);

            // System should still be functional
            const integrity = battleSystem.validateSystemIntegrity();
            expect(integrity.valid).toBe(true);
        });

        test('should limit error history size to prevent memory leaks', async () => {
            // Generate many errors to test history limit
            for (let i = 0; i < 150; i++) {
                try {
                    await battleSystem.initiateAttack(createMockUnit(`defeated${i}`, { currentHP: 0 }));
                } catch (error) {
                    // Expected to throw
                }
            }

            const errorHandler = battleSystem['errorHandler'];
            const history = errorHandler.getErrorHistory();

            // Should not exceed maximum history size
            expect(history.length).toBeLessThanOrEqual(100);
        });
    });

    describe('Configuration Impact on Error Handling', () => {
        test('should respect error handling configuration', () => {
            const customBattleSystem = new BattleSystem(mockScene, {
                enableAnimations: false,
                enableBattleLogging: false,
                battleSpeed: 2.0
            });

            customBattleSystem.initialize([playerUnit, enemyUnit], mapData);

            // Configuration should be applied
            expect(customBattleSystem['config'].enableAnimations).toBe(false);
            expect(customBattleSystem['config'].battleSpeed).toBe(2.0);

            customBattleSystem.destroy();
        });
    });
});