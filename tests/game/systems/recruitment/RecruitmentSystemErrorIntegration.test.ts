/**
 * RecruitmentSystem Error Integration Test Suite
 * 
 * Tests the integration between RecruitmentSystem and RecruitmentErrorHandler
 */

import { RecruitmentSystem } from '../../../../game/src/systems/recruitment/RecruitmentSystem';
import { RecruitmentErrorHandler } from '../../../../game/src/systems/recruitment/RecruitmentErrorHandler';
import { RecruitmentUI } from '../../../../game/src/systems/recruitment/RecruitmentUI';
import {
    RecruitmentError,
    RecruitmentStatus,
    RecruitmentAction,
    RecruitmentConditionType
} from '../../../../game/src/types/recruitment';
import { Unit, StageData, GameplayError } from '../../../../game/src/types/gameplay';

// Mock Phaser scene
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setDepth: jest.fn(),
            setVisible: jest.fn(),
            setPosition: jest.fn(),
            add: jest.fn(),
            destroy: jest.fn()
        }),
        text: jest.fn().mockReturnValue({
            setColor: jest.fn(),
            setText: jest.fn(),
            setOrigin: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            lineStyle: jest.fn(),
            strokeCircle: jest.fn(),
            fillStyle: jest.fn(),
            fillRoundedRect: jest.fn(),
            strokeRoundedRect: jest.fn(),
            destroy: jest.fn()
        })
    },
    cameras: {
        main: {
            centerX: 400,
            centerY: 300,
            y: 0
        }
    },
    time: {
        delayedCall: jest.fn()
    },
    tweens: {
        killAll: jest.fn(),
        add: jest.fn()
    }
} as any;

// Mock event emitter
const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
} as any;

// Helper functions
const createMockUnit = (id: string, name: string, faction: 'player' | 'enemy' = 'enemy'): Unit => ({
    id,
    name,
    position: { x: 5, y: 5 },
    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
    currentHP: 80,
    currentMP: 30,
    faction,
    hasActed: false,
    hasMoved: false
});

const createMockRecruitableUnit = (id: string, name: string): Unit => {
    const unit = createMockUnit(id, name);
    (unit as any).metadata = {
        recruitment: {
            conditions: [
                {
                    id: 'test_condition',
                    type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                    description: 'Must be attacked by protagonist',
                    parameters: { attackerId: 'protagonist' }
                }
            ],
            priority: 50,
            description: `Recruit ${name}`,
            rewards: []
        }
    };
    return unit;
};

const createMockStageData = (recruitableUnits: Unit[] = []): StageData => ({
    id: 'test-stage',
    name: 'Test Stage',
    chapterId: 'test-chapter',
    mapData: {
        width: 10,
        height: 10,
        tiles: []
    },
    playerUnits: [createMockUnit('protagonist', 'Protagonist', 'player')],
    enemyUnits: recruitableUnits,
    victoryConditions: [{ type: 'defeat_all_enemies' }]
});

describe('RecruitmentSystem Error Integration', () => {
    let recruitmentSystem: RecruitmentSystem;
    let errorHandler: RecruitmentErrorHandler;
    let recruitmentUI: RecruitmentUI;
    let mockStageData: StageData;

    beforeEach(() => {
        jest.clearAllMocks();

        recruitmentSystem = new RecruitmentSystem(mockScene, {}, mockEventEmitter);
        errorHandler = recruitmentSystem.getErrorHandler();
        recruitmentUI = new RecruitmentUI(mockScene, {}, mockEventEmitter, errorHandler);

        const recruitableUnit = createMockRecruitableUnit('enemy1', 'Recruitable Enemy');
        mockStageData = createMockStageData([recruitableUnit]);
    });

    afterEach(() => {
        recruitmentSystem.destroy?.();
        errorHandler.destroy?.();
        recruitmentUI.destroy?.();
    });

    describe('System Initialization Error Handling', () => {
        test('should handle invalid stage data during initialization', async () => {
            const invalidStageData = null as any;

            const result = await recruitmentSystem.initialize(invalidStageData);

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
            expect(result.message).toContain('Invalid stage data');

            // Check that error was handled by error handler
            const stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBe(1);
            expect(stats.errorsByType[RecruitmentError.INVALID_STAGE]).toBe(1);
        });

        test('should handle stage data without ID', async () => {
            const stageDataWithoutId = { ...mockStageData, id: undefined as any };

            const result = await recruitmentSystem.initialize(stageDataWithoutId);

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
            expect(result.message).toContain('valid ID');
        });

        test('should handle initialization system errors', async () => {
            // Mock a system error during initialization
            jest.spyOn(recruitmentSystem as any, 'extractRecruitmentData').mockImplementation(() => {
                throw new Error('System malfunction');
            });

            const result = await recruitmentSystem.initialize(mockStageData);

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
            expect(result.message).toContain('Unexpected error');

            // Check that system error was handled
            const stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBe(1);
            expect(stats.errorsByType[RecruitmentError.SYSTEM_ERROR]).toBe(1);
        });
    });

    describe('Recruitment Eligibility Error Handling', () => {
        beforeEach(async () => {
            await recruitmentSystem.initialize(mockStageData);
        });

        test('should handle uninitialized system error', async () => {
            // Create a new uninitialized system
            const uninitializedSystem = new RecruitmentSystem(mockScene, {}, mockEventEmitter);
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const target = createMockUnit('enemy1', 'Enemy');

            const result = await uninitializedSystem.checkRecruitmentEligibility(attacker, target);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.SYSTEM_ERROR);
            expect(result.nextAction).toBe(RecruitmentAction.CONTINUE_BATTLE);

            // Check error handling
            const uninitializedErrorHandler = uninitializedSystem.getErrorHandler();
            const stats = uninitializedErrorHandler.getStatistics();
            expect(stats.totalErrors).toBe(1);
            expect(stats.errorsByType[RecruitmentError.SYSTEM_ERROR]).toBe(1);
        });

        test('should handle invalid attacker or target', async () => {
            const invalidAttacker = null as any;
            const target = createMockUnit('enemy1', 'Enemy');

            const result = await recruitmentSystem.checkRecruitmentEligibility(invalidAttacker, target);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.nextAction).toBe(RecruitmentAction.CONTINUE_BATTLE);

            // Check error handling
            const stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBe(1);
            expect(stats.errorsByType[RecruitmentError.INVALID_TARGET]).toBe(1);
        });

        test('should handle non-recruitable target', async () => {
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const nonRecruitableTarget = createMockUnit('enemy2', 'Non-recruitable Enemy');

            const result = await recruitmentSystem.checkRecruitmentEligibility(attacker, nonRecruitableTarget);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.message).toContain('not recruitable');

            // Check error handling
            const stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBe(1);
            expect(stats.errorsByType[RecruitmentError.INVALID_TARGET]).toBe(1);
        });

        test('should handle already recruited target', async () => {
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const target = createMockRecruitableUnit('enemy1', 'Already Recruited');

            // Initialize and mark as recruited
            await recruitmentSystem.initialize(createMockStageData([target]));
            const recruitableData = (recruitmentSystem as any).recruitableCharacters.get(target.id);
            recruitableData.recruitmentStatus = RecruitmentStatus.RECRUITED;

            const result = await recruitmentSystem.checkRecruitmentEligibility(attacker, target);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.message).toContain('already recruited');
        });
    });

    describe('Recruitment Attempt Error Handling', () => {
        beforeEach(async () => {
            await recruitmentSystem.initialize(mockStageData);
        });

        test('should handle uninitialized system during recruitment attempt', async () => {
            const uninitializedSystem = new RecruitmentSystem(mockScene, {}, mockEventEmitter);
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const target = createMockUnit('enemy1', 'Enemy');

            const result = await uninitializedSystem.processRecruitmentAttempt(attacker, target, 50);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.SYSTEM_ERROR);
            expect(result.nextAction).toBe(RecruitmentAction.CONTINUE_BATTLE);
        });

        test('should handle recruitment attempt on non-recruitable target', async () => {
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const nonRecruitableTarget = createMockUnit('enemy2', 'Non-recruitable');

            const result = await recruitmentSystem.processRecruitmentAttempt(attacker, nonRecruitableTarget, 50);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.nextAction).toBe(RecruitmentAction.CONTINUE_BATTLE);
        });

        test('should handle conditions not met during recruitment attempt', async () => {
            const wrongAttacker = createMockUnit('wrong_attacker', 'Wrong Attacker', 'player');
            const target = createMockRecruitableUnit('enemy1', 'Recruitable Enemy');

            // Initialize with the recruitable target
            await recruitmentSystem.initialize(createMockStageData([target]));

            const result = await recruitmentSystem.processRecruitmentAttempt(wrongAttacker, target, 50);

            expect(result.success).toBe(false);
            expect(result.nextAction).toBe(RecruitmentAction.CONTINUE_BATTLE);
        });
    });

    describe('NPC Conversion Error Handling', () => {
        beforeEach(async () => {
            await recruitmentSystem.initialize(mockStageData);
        });

        test('should handle invalid unit during NPC conversion', () => {
            const invalidUnit = null as any;

            const result = recruitmentSystem.convertToNPC(invalidUnit, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.message).toContain('Invalid unit');
        });

        test('should handle non-recruitable unit during NPC conversion', () => {
            const nonRecruitableUnit = createMockUnit('enemy2', 'Non-recruitable');

            const result = recruitmentSystem.convertToNPC(nonRecruitableUnit, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.message).toContain('not recruitable');
        });
    });

    describe('Error Recovery Integration', () => {
        beforeEach(async () => {
            await recruitmentSystem.initialize(mockStageData);
        });

        test('should integrate error recovery with UI feedback', async () => {
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const nonRecruitableTarget = createMockUnit('enemy2', 'Non-recruitable');

            // Mock UI feedback methods
            const showErrorSpy = jest.spyOn(recruitmentUI as any, 'showRecruitmentErrorMessage');
            const highlightErrorSpy = jest.spyOn(recruitmentUI as any, 'highlightRecruitmentError');

            const result = await recruitmentSystem.checkRecruitmentEligibility(attacker, nonRecruitableTarget);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);

            // Verify that error handling was triggered
            const stats = errorHandler.getStatistics();
            expect(stats.totalErrors).toBe(1);
            expect(stats.errorsByType[RecruitmentError.INVALID_TARGET]).toBe(1);
        });

        test('should handle state cleanup after errors', async () => {
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const target = createMockRecruitableUnit('enemy1', 'Recruitable Enemy');

            // Trigger an error that requires cleanup
            const result = await recruitmentSystem.processRecruitmentAttempt(attacker, target, 0); // No damage, won't defeat

            // Verify cleanup was called
            expect(mockScene.tweens.killAll).toHaveBeenCalled();
        });
    });

    describe('Event Integration', () => {
        beforeEach(async () => {
            await recruitmentSystem.initialize(mockStageData);
        });

        test('should emit error events through event system', async () => {
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const nonRecruitableTarget = createMockUnit('enemy2', 'Non-recruitable');

            await recruitmentSystem.checkRecruitmentEligibility(attacker, nonRecruitableTarget);

            // Check that error handling event was emitted
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-error-handled',
                expect.objectContaining({
                    error: RecruitmentError.INVALID_TARGET
                })
            );
        });

        test('should emit cancel request events', async () => {
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const nonRecruitableTarget = createMockUnit('enemy2', 'Non-recruitable');

            await recruitmentSystem.checkRecruitmentEligibility(attacker, nonRecruitableTarget);

            // Check that cancel request was emitted
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-cancel-requested',
                expect.objectContaining({
                    error: RecruitmentError.INVALID_TARGET
                })
            );
        });

        test('should emit reset request events for critical errors', async () => {
            // Mock a critical system error
            jest.spyOn(recruitmentSystem as any, 'checkRecruitmentEligibility').mockImplementation(() => {
                throw new Error('Critical system failure');
            });

            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const target = createMockUnit('enemy1', 'Enemy');

            try {
                await recruitmentSystem.checkRecruitmentEligibility(attacker, target);
            } catch (error) {
                // Expected to throw
            }

            // Check that critical error event was emitted
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                'recruitment-critical-error',
                expect.objectContaining({
                    originalError: expect.any(String)
                })
            );
        });
    });

    describe('Configuration Integration', () => {
        test('should respect error handler configuration in UI', () => {
            const customConfig = {
                showUserMessages: false,
                enableErrorAnimations: false,
                showRecruitmentHints: false
            };

            const customErrorHandler = new RecruitmentErrorHandler(mockScene, customConfig);
            const customUI = new RecruitmentUI(mockScene, {}, mockEventEmitter, customErrorHandler);

            const config = customErrorHandler.getConfig();
            expect(config.showUserMessages).toBe(false);
            expect(config.enableErrorAnimations).toBe(false);
            expect(config.showRecruitmentHints).toBe(false);
        });

        test('should update error handler configuration dynamically', () => {
            const newConfig = {
                messageDuration: 1000,
                enableErrorSounds: false
            };

            errorHandler.updateConfig(newConfig);

            const config = errorHandler.getConfig();
            expect(config.messageDuration).toBe(1000);
            expect(config.enableErrorSounds).toBe(false);
        });
    });

    describe('Error Statistics Integration', () => {
        beforeEach(async () => {
            await recruitmentSystem.initialize(mockStageData);
        });

        test('should track comprehensive error statistics across system', async () => {
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const nonRecruitableTarget1 = createMockUnit('enemy2', 'Non-recruitable 1');
            const nonRecruitableTarget2 = createMockUnit('enemy3', 'Non-recruitable 2');

            // Generate various errors
            await recruitmentSystem.checkRecruitmentEligibility(attacker, nonRecruitableTarget1);
            await recruitmentSystem.checkRecruitmentEligibility(attacker, nonRecruitableTarget2);
            await recruitmentSystem.processRecruitmentAttempt(attacker, nonRecruitableTarget1, 50);

            const stats = errorHandler.getStatistics();

            expect(stats.totalErrors).toBe(3);
            expect(stats.errorsByType[RecruitmentError.INVALID_TARGET]).toBe(3);
            expect(stats.mostCommonError).toBe(RecruitmentError.INVALID_TARGET);
            expect(stats.userCancellations).toBe(3); // All invalid target errors result in cancellation
        });

        test('should provide error history for debugging', async () => {
            const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
            const nonRecruitableTarget = createMockUnit('enemy2', 'Non-recruitable');

            await recruitmentSystem.checkRecruitmentEligibility(attacker, nonRecruitableTarget);

            const history = errorHandler.getErrorHistory();

            expect(history).toHaveLength(1);
            expect(history[0].error).toBe(RecruitmentError.INVALID_TARGET);
            expect(history[0].context.attacker.id).toBe('protagonist');
            expect(history[0].context.target.id).toBe('enemy2');
            expect(history[0].recoverable).toBe(true);
        });
    });

    describe('Context Validation Integration', () => {
        test('should validate recruitment context before processing', async () => {
            const invalidContext = {
                attacker: null,
                target: null,
                damage: -1,
                turn: 0,
                alliedUnits: null,
                enemyUnits: null,
                npcUnits: null
            } as any;

            const validation = errorHandler.validateRecruitmentContext(invalidContext);

            expect(validation.valid).toBe(false);
            expect(validation.errors).toContain('Missing attacker in recruitment context');
            expect(validation.errors).toContain('Missing target in recruitment context');
            expect(validation.errors).toContain('Invalid damage value in recruitment context');
            expect(validation.errors).toContain('Invalid turn value in recruitment context');
            expect(validation.warnings).toContain('Missing or invalid allied units array');
            expect(validation.warnings).toContain('Missing or invalid enemy units array');
            expect(validation.warnings).toContain('Missing or invalid NPC units array');
        });
    });
});

describe('RecruitmentSystem Error Recovery Scenarios', () => {
    let recruitmentSystem: RecruitmentSystem;
    let errorHandler: RecruitmentErrorHandler;

    beforeEach(() => {
        jest.clearAllMocks();
        recruitmentSystem = new RecruitmentSystem(mockScene, {}, mockEventEmitter);
        errorHandler = recruitmentSystem.getErrorHandler();
    });

    afterEach(() => {
        recruitmentSystem.destroy?.();
        errorHandler.destroy?.();
    });

    test('should recover from temporary system errors', async () => {
        // Simulate a temporary error followed by successful operation
        let callCount = 0;
        const originalMethod = recruitmentSystem.initialize.bind(recruitmentSystem);

        jest.spyOn(recruitmentSystem, 'initialize').mockImplementation(async (stageData) => {
            callCount++;
            if (callCount === 1) {
                throw new Error('Temporary system error');
            }
            return originalMethod(stageData);
        });

        const recruitableUnit = createMockRecruitableUnit('enemy1', 'Recruitable Enemy');
        const stageData = createMockStageData([recruitableUnit]);

        // First call should fail
        const result1 = await recruitmentSystem.initialize(stageData);
        expect(result1.success).toBe(false);

        // Second call should succeed (in a real scenario, this would be a retry)
        const result2 = await recruitmentSystem.initialize(stageData);
        expect(result2.success).toBe(true);

        // Check error statistics
        const stats = errorHandler.getStatistics();
        expect(stats.totalErrors).toBe(1);
        expect(stats.errorsByType[RecruitmentError.SYSTEM_ERROR]).toBe(1);
    });

    test('should handle cascading errors gracefully', async () => {
        // Initialize system
        const recruitableUnit = createMockRecruitableUnit('enemy1', 'Recruitable Enemy');
        const stageData = createMockStageData([recruitableUnit]);
        await recruitmentSystem.initialize(stageData);

        const attacker = createMockUnit('protagonist', 'Protagonist', 'player');
        const target = createMockUnit('enemy2', 'Non-recruitable'); // This will cause an error

        // First error: invalid target
        const result1 = await recruitmentSystem.checkRecruitmentEligibility(attacker, target);
        expect(result1.success).toBe(false);
        expect(result1.error).toBe(RecruitmentError.INVALID_TARGET);

        // Second error: attempt to process recruitment on invalid target
        const result2 = await recruitmentSystem.processRecruitmentAttempt(attacker, target, 50);
        expect(result2.success).toBe(false);
        expect(result2.error).toBe(RecruitmentError.INVALID_TARGET);

        // Check that both errors were handled
        const stats = errorHandler.getStatistics();
        expect(stats.totalErrors).toBe(2);
        expect(stats.errorsByType[RecruitmentError.INVALID_TARGET]).toBe(2);
    });

    test('should maintain system stability after multiple errors', async () => {
        const recruitableUnit = createMockRecruitableUnit('enemy1', 'Recruitable Enemy');
        const stageData = createMockStageData([recruitableUnit]);
        await recruitmentSystem.initialize(stageData);

        const attacker = createMockUnit('protagonist', 'Protagonist', 'player');

        // Generate multiple errors
        for (let i = 0; i < 10; i++) {
            const invalidTarget = createMockUnit(`invalid${i}`, `Invalid ${i}`);
            await recruitmentSystem.checkRecruitmentEligibility(attacker, invalidTarget);
        }

        // System should still be functional
        const validTarget = createMockRecruitableUnit('enemy1', 'Valid Target');
        await recruitmentSystem.initialize(createMockStageData([validTarget]));

        const result = await recruitmentSystem.checkRecruitmentEligibility(attacker, validTarget);

        // Should work despite previous errors
        expect(result.success).toBe(false); // Conditions not met, but system is working
        expect(result.error).toBeUndefined(); // No system error

        // Check error statistics
        const stats = errorHandler.getStatistics();
        expect(stats.totalErrors).toBe(10);
        expect(stats.errorsByType[RecruitmentError.INVALID_TARGET]).toBe(10);
    });
});