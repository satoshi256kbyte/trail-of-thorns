/**
 * RecruitmentSystem state management tests
 * Tests the state transitions and management throughout the recruitment process
 */

import { RecruitmentSystem } from '../../../../game/src/systems/recruitment/RecruitmentSystem';
import {
    RecruitmentStatus,
    RecruitmentAction,
    RecruitmentError,
    RecruitmentConditionType
} from '../../../../game/src/types/recruitment';
import { Unit, StageData } from '../../../../game/src/types/gameplay';

// Mock Phaser environment
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            add: jest.fn(),
            setDepth: jest.fn(),
            setScale: jest.fn(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillRoundedRect: jest.fn(),
            fillCircle: jest.fn()
        })
    },
    tweens: {
        add: jest.fn()
    }
} as any;

const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
} as any;

describe('RecruitmentSystem State Management', () => {
    let recruitmentSystem: RecruitmentSystem;
    let mockStageData: StageData;
    let mockPlayerUnit: Unit;
    let mockRecruitableUnit: Unit;

    beforeEach(() => {
        jest.clearAllMocks();

        recruitmentSystem = new RecruitmentSystem(mockScene, undefined, mockEventEmitter);

        mockPlayerUnit = {
            id: 'player-1',
            name: 'Hero',
            position: { x: 0, y: 0 },
            stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
            equipment: {}
        };

        mockRecruitableUnit = {
            id: 'recruitable-1',
            name: 'Knight',
            position: { x: 5, y: 5 },
            stats: { maxHP: 120, maxMP: 30, attack: 25, defense: 20, speed: 12, movement: 3 },
            currentHP: 120,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
            equipment: {},
            metadata: {
                recruitment: {
                    conditions: [
                        {
                            id: 'specific-attacker',
                            type: RecruitmentConditionType.SPECIFIC_ATTACKER,
                            description: 'Must be attacked by Hero',
                            parameters: { attackerId: 'player-1' }
                        },
                        {
                            id: 'hp-threshold',
                            type: RecruitmentConditionType.HP_THRESHOLD,
                            description: 'HP must be below 50%',
                            parameters: { threshold: 0.5 }
                        }
                    ],
                    priority: 70
                }
            }
        } as any;

        mockStageData = {
            id: 'state-test-stage',
            name: 'State Test Stage',
            description: 'Testing state management',
            mapData: {
                width: 10,
                height: 10,
                tileSize: 32,
                layers: [{
                    name: 'background',
                    type: 'background',
                    data: [[0]],
                    visible: true,
                    opacity: 1
                }],
                playerSpawns: [{ x: 0, y: 0 }],
                enemySpawns: [{ x: 5, y: 5 }]
            },
            playerUnits: [mockPlayerUnit],
            enemyUnits: [mockRecruitableUnit],
            victoryConditions: [{
                type: 'defeat_all',
                description: 'Defeat all enemies'
            }]
        };
    });

    describe('Recruitment Status Transitions', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should start with AVAILABLE status', () => {
            const status = recruitmentSystem.getRecruitmentStatus('recruitable-1');
            expect(status).toBe(RecruitmentStatus.AVAILABLE);

            const stats = recruitmentSystem.getRecruitmentStatistics();
            expect(stats.recruitmentsByStatus[RecruitmentStatus.AVAILABLE]).toBe(1);
            expect(stats.availableForRecruitment).toBe(1);
        });

        it('should transition to NPC_STATE when recruitment conditions are met', () => {
            // Set up conditions for successful recruitment
            mockRecruitableUnit.currentHP = 50; // Below 50% threshold

            const result = recruitmentSystem.processRecruitmentAttempt(
                mockPlayerUnit,
                mockRecruitableUnit,
                55, // Enough to defeat
                undefined,
                1
            );

            expect(result.success).toBe(true);
            expect(recruitmentSystem.getRecruitmentStatus('recruitable-1')).toBe(RecruitmentStatus.NPC_STATE);

            const stats = recruitmentSystem.getRecruitmentStatistics();
            expect(stats.recruitmentsByStatus[RecruitmentStatus.NPC_STATE]).toBe(1);
            expect(stats.currentNPCs).toBe(1);
            expect(stats.availableForRecruitment).toBe(0);
        });

        it('should transition to RECRUITED when stage is completed successfully', () => {
            // Convert to NPC first
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            // Complete recruitment with surviving NPC
            mockRecruitableUnit.currentHP = 20;
            const allUnits = [mockPlayerUnit, mockRecruitableUnit];
            const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

            expect(recruitedUnits).toHaveLength(1);
            expect(recruitmentSystem.getRecruitmentStatus('recruitable-1')).toBe(RecruitmentStatus.RECRUITED);

            const stats = recruitmentSystem.getRecruitmentStatistics();
            expect(stats.recruitmentsByStatus[RecruitmentStatus.RECRUITED]).toBe(1);
            expect(stats.recruitedCharacters).toBe(1);
            expect(stats.currentNPCs).toBe(0);
        });

        it('should transition to FAILED when NPC is defeated', () => {
            // Convert to NPC first
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            // Complete recruitment with defeated NPC
            mockRecruitableUnit.currentHP = 0;
            const allUnits = [mockPlayerUnit, mockRecruitableUnit];
            const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

            expect(recruitedUnits).toHaveLength(0);
            expect(recruitmentSystem.getRecruitmentStatus('recruitable-1')).toBe(RecruitmentStatus.FAILED);

            const stats = recruitmentSystem.getRecruitmentStatistics();
            expect(stats.recruitmentsByStatus[RecruitmentStatus.FAILED]).toBe(1);
            expect(stats.failedRecruitments).toBe(1);
            expect(stats.currentNPCs).toBe(0);
        });

        it('should not allow transitions from terminal states', () => {
            // Convert to NPC and then to RECRUITED
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);
            mockRecruitableUnit.currentHP = 20;
            recruitmentSystem.completeRecruitment([mockPlayerUnit, mockRecruitableUnit]);

            expect(recruitmentSystem.getRecruitmentStatus('recruitable-1')).toBe(RecruitmentStatus.RECRUITED);

            // Try to process another recruitment attempt (should fail)
            const result = recruitmentSystem.processRecruitmentAttempt(
                mockPlayerUnit,
                mockRecruitableUnit,
                50,
                undefined,
                2
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.message).toContain('already recruited');
        });

        it('should not allow recruitment attempts on failed units', () => {
            // Convert to NPC and then to FAILED
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);
            mockRecruitableUnit.currentHP = 0;
            recruitmentSystem.completeRecruitment([mockPlayerUnit, mockRecruitableUnit]);

            expect(recruitmentSystem.getRecruitmentStatus('recruitable-1')).toBe(RecruitmentStatus.FAILED);

            // Try to process another recruitment attempt (should fail)
            const result = recruitmentSystem.processRecruitmentAttempt(
                mockPlayerUnit,
                mockRecruitableUnit,
                50,
                undefined,
                2
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.RECRUITMENT_FAILED);
            expect(result.message).toContain('already failed');
        });
    });

    describe('Unit State Management', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should properly manage unit properties during NPC conversion', () => {
            // Initial state
            expect(mockRecruitableUnit.faction).toBe('enemy');
            expect(mockRecruitableUnit.hasActed).toBe(false);
            expect(mockRecruitableUnit.hasMoved).toBe(false);
            expect(recruitmentSystem.isNPC(mockRecruitableUnit)).toBe(false);

            // Convert to NPC
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            // Check NPC state
            expect(mockRecruitableUnit.faction).toBe('player');
            expect(mockRecruitableUnit.hasActed).toBe(true);
            expect(mockRecruitableUnit.hasMoved).toBe(true);
            expect(recruitmentSystem.isNPC(mockRecruitableUnit)).toBe(true);

            // Check NPC priority
            const priority = recruitmentSystem.getNPCPriority(mockRecruitableUnit);
            expect(priority).toBeGreaterThan(0);
        });

        it('should properly manage unit properties during recruitment completion', () => {
            // Convert to NPC
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            // Complete recruitment
            mockRecruitableUnit.currentHP = 20;
            const recruitedUnits = recruitmentSystem.completeRecruitment([mockPlayerUnit, mockRecruitableUnit]);

            expect(recruitedUnits).toHaveLength(1);
            const recruitedUnit = recruitedUnits[0];

            // Check recruited unit properties
            expect(recruitedUnit.unit.faction).toBe('player');
            expect(recruitedUnit.unit.hasActed).toBe(false); // Reset for next stage
            expect(recruitedUnit.unit.hasMoved).toBe(false); // Reset for next stage
            expect(recruitmentSystem.isNPC(recruitedUnit.unit)).toBe(false); // No longer NPC
        });

        it('should maintain unit HP correctly throughout process', () => {
            const initialHP = mockRecruitableUnit.currentHP;

            // Damage unit to meet threshold
            mockRecruitableUnit.currentHP = 50;

            // Convert to NPC
            const conversionResult = recruitmentSystem.convertToNPC(mockRecruitableUnit, 1);
            expect(conversionResult.success).toBe(true);
            expect(conversionResult.npcState?.remainingHP).toBe(50);

            // Further damage as NPC
            mockRecruitableUnit.currentHP = 30;

            // Complete recruitment
            const recruitedUnits = recruitmentSystem.completeRecruitment([mockPlayerUnit, mockRecruitableUnit]);
            expect(recruitedUnits[0].unit.currentHP).toBe(30);
        });
    });

    describe('Progress Tracking', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should track recruitment progress correctly', () => {
            // Initial progress (no context)
            let progress = recruitmentSystem.getRecruitmentProgress(mockRecruitableUnit);
            expect(progress?.overallProgress).toBe(0);
            expect(progress?.isEligible).toBe(false);

            // Progress with partial conditions met
            progress = recruitmentSystem.getRecruitmentProgress(mockRecruitableUnit, {
                attacker: mockPlayerUnit,
                damage: 30,
                turn: 1,
                alliedUnits: [mockPlayerUnit],
                enemyUnits: [mockRecruitableUnit],
                npcUnits: []
            });

            expect(progress?.overallProgress).toBe(50); // 1 of 2 conditions met
            expect(progress?.isEligible).toBe(false);
            expect(progress?.conditionProgress[0]).toBe(true); // Specific attacker
            expect(progress?.conditionProgress[1]).toBe(false); // HP threshold

            // Progress with all conditions met
            mockRecruitableUnit.currentHP = 50; // Below 50% threshold
            progress = recruitmentSystem.getRecruitmentProgress(mockRecruitableUnit, {
                attacker: mockPlayerUnit,
                damage: 55,
                turn: 1,
                alliedUnits: [mockPlayerUnit],
                enemyUnits: [mockRecruitableUnit],
                npcUnits: []
            });

            expect(progress?.overallProgress).toBe(100);
            expect(progress?.isEligible).toBe(true);
            expect(progress?.conditionProgress.every(met => met)).toBe(true);
        });

        it('should update progress tracking after state changes', () => {
            // Convert to NPC
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            // Progress should still be trackable for NPC
            const progress = recruitmentSystem.getRecruitmentProgress(mockRecruitableUnit, {
                attacker: mockPlayerUnit,
                damage: 30,
                turn: 2,
                alliedUnits: [mockPlayerUnit],
                enemyUnits: [mockRecruitableUnit],
                npcUnits: [mockRecruitableUnit]
            });

            expect(progress).toBeDefined();
            expect(progress?.characterId).toBe('recruitable-1');
        });
    });

    describe('System Statistics', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should maintain accurate statistics throughout recruitment process', () => {
            // Initial statistics
            let stats = recruitmentSystem.getRecruitmentStatistics();
            expect(stats.totalRecruitableCharacters).toBe(1);
            expect(stats.availableForRecruitment).toBe(1);
            expect(stats.currentNPCs).toBe(0);
            expect(stats.recruitedCharacters).toBe(0);
            expect(stats.failedRecruitments).toBe(0);

            // After NPC conversion
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            stats = recruitmentSystem.getRecruitmentStatistics();
            expect(stats.availableForRecruitment).toBe(0);
            expect(stats.currentNPCs).toBe(1);
            expect(stats.recruitmentsByStatus[RecruitmentStatus.NPC_STATE]).toBe(1);

            // After successful recruitment
            mockRecruitableUnit.currentHP = 20;
            recruitmentSystem.completeRecruitment([mockPlayerUnit, mockRecruitableUnit]);

            stats = recruitmentSystem.getRecruitmentStatistics();
            expect(stats.recruitedCharacters).toBe(1);
            expect(stats.currentNPCs).toBe(0);
            expect(stats.recruitmentsByStatus[RecruitmentStatus.RECRUITED]).toBe(1);
        });

        it('should handle statistics for failed recruitments', () => {
            // Convert to NPC
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            // Fail recruitment
            mockRecruitableUnit.currentHP = 0;
            recruitmentSystem.completeRecruitment([mockPlayerUnit, mockRecruitableUnit]);

            const stats = recruitmentSystem.getRecruitmentStatistics();
            expect(stats.failedRecruitments).toBe(1);
            expect(stats.recruitedCharacters).toBe(0);
            expect(stats.currentNPCs).toBe(0);
            expect(stats.recruitmentsByStatus[RecruitmentStatus.FAILED]).toBe(1);
        });
    });

    describe('Event Emission State Tracking', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should emit events at correct state transitions', () => {
            jest.clearAllMocks();

            // Check eligibility (should emit eligibility-checked)
            recruitmentSystem.checkRecruitmentEligibility(mockPlayerUnit, mockRecruitableUnit, {
                damage: 30,
                turn: 1,
                alliedUnits: [mockPlayerUnit],
                enemyUnits: [mockRecruitableUnit],
                npcUnits: []
            });

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-eligibility-checked',
                expect.objectContaining({
                    unitId: 'recruitable-1',
                    eligible: false
                })
            );

            // Process recruitment attempt (should emit multiple events)
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-attempt-processed',
                expect.objectContaining({
                    unitId: 'recruitable-1',
                    result: expect.objectContaining({ success: true })
                })
            );

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('character-converted-to-npc',
                expect.objectContaining({
                    unitId: 'recruitable-1',
                    npcState: expect.any(Object)
                })
            );

            // Complete recruitment (should emit completion events)
            mockRecruitableUnit.currentHP = 20;
            recruitmentSystem.completeRecruitment([mockPlayerUnit, mockRecruitableUnit]);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-completed',
                expect.objectContaining({
                    unitId: 'recruitable-1',
                    success: true
                })
            );

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('stage-recruitment-completed',
                expect.objectContaining({
                    recruitedUnits: expect.arrayContaining([mockRecruitableUnit]),
                    failedUnits: []
                })
            );
        });

        it('should emit failure events at appropriate times', () => {
            jest.clearAllMocks();

            // Convert to NPC
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            // Fail recruitment
            mockRecruitableUnit.currentHP = 0;
            recruitmentSystem.completeRecruitment([mockPlayerUnit, mockRecruitableUnit]);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-failed',
                expect.objectContaining({
                    unitId: 'recruitable-1',
                    reason: RecruitmentError.NPC_ALREADY_DEFEATED
                })
            );

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('stage-recruitment-completed',
                expect.objectContaining({
                    recruitedUnits: [],
                    failedUnits: ['recruitable-1']
                })
            );
        });
    });

    describe('State Persistence and Recovery', () => {
        it('should maintain state consistency after system reset', () => {
            recruitmentSystem.initialize(mockStageData);

            // Set up some state
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            expect(recruitmentSystem.isNPC(mockRecruitableUnit)).toBe(true);
            expect(recruitmentSystem.getRecruitmentStatus('recruitable-1')).toBe(RecruitmentStatus.NPC_STATE);

            // Reset system
            recruitmentSystem.reset();

            // State should be cleared
            expect(recruitmentSystem.isNPC(mockRecruitableUnit)).toBe(false);
            expect(recruitmentSystem.getRecruitmentStatus('recruitable-1')).toBeNull();
            expect(recruitmentSystem.getRecruitableCharacterIds()).toHaveLength(0);

            // Re-initialize should work correctly
            const result = recruitmentSystem.initialize(mockStageData);
            expect(result.success).toBe(true);
            expect(recruitmentSystem.getRecruitmentStatus('recruitable-1')).toBe(RecruitmentStatus.AVAILABLE);
        });

        it('should handle configuration changes without losing state', () => {
            recruitmentSystem.initialize(mockStageData);

            // Convert to NPC
            mockRecruitableUnit.currentHP = 50;
            recruitmentSystem.processRecruitmentAttempt(mockPlayerUnit, mockRecruitableUnit, 55, undefined, 1);

            const initialStats = recruitmentSystem.getRecruitmentStatistics();
            expect(initialStats.currentNPCs).toBe(1);

            // Update configuration
            recruitmentSystem.updateConfig({ maxNPCsPerStage: 5 });

            // State should be preserved
            const updatedStats = recruitmentSystem.getRecruitmentStatistics();
            expect(updatedStats.currentNPCs).toBe(1);
            expect(recruitmentSystem.isNPC(mockRecruitableUnit)).toBe(true);
        });
    });
});