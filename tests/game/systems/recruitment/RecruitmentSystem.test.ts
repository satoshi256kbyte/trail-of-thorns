/**
 * RecruitmentSystem unit tests
 * Tests the main controller functionality for the recruitment system
 */

import { RecruitmentSystem } from '../../../../game/src/systems/recruitment/RecruitmentSystem';
import {
    RecruitmentStatus,
    RecruitmentAction,
    RecruitmentError,
    RecruitmentConditionType,
    RecruitmentUtils
} from '../../../../game/src/types/recruitment';
import { Unit, StageData, GameplayError } from '../../../../game/src/types/gameplay';
import { BattleResult, DamageType } from '../../../../game/src/types/battle';

// Mock Phaser
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

describe('RecruitmentSystem', () => {
    let recruitmentSystem: RecruitmentSystem;
    let mockStageData: StageData;
    let mockPlayerUnit: Unit;
    let mockEnemyUnit: Unit;
    let mockRecruitableEnemyUnit: Unit;

    beforeEach(() => {
        jest.clearAllMocks();

        recruitmentSystem = new RecruitmentSystem(mockScene, undefined, mockEventEmitter);

        // Create mock units
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

        mockEnemyUnit = {
            id: 'enemy-1',
            name: 'Orc',
            position: { x: 5, y: 5 },
            stats: { maxHP: 80, maxMP: 20, attack: 15, defense: 10, speed: 8, movement: 2 },
            currentHP: 80,
            currentMP: 20,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false,
            equipment: {}
        };

        mockRecruitableEnemyUnit = {
            id: 'recruitable-1',
            name: 'Knight',
            position: { x: 3, y: 3 },
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
                            description: 'HP must be below 30%',
                            parameters: { threshold: 0.3 }
                        }
                    ],
                    priority: 75,
                    description: 'Recruit the noble knight',
                    rewards: []
                }
            }
        } as any;

        mockStageData = {
            id: 'test-stage',
            name: 'Test Stage',
            description: 'A test stage',
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
            enemyUnits: [mockEnemyUnit, mockRecruitableEnemyUnit],
            victoryConditions: [{
                type: 'defeat_all',
                description: 'Defeat all enemies'
            }]
        };
    });

    describe('initialize', () => {
        it('should initialize successfully with valid stage data', () => {
            const result = recruitmentSystem.initialize(mockStageData);

            expect(result.success).toBe(true);
            expect(result.message).toContain('1 recruitable characters');
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-initialized', {
                stageId: 'test-stage',
                recruitableCount: 1
            });
        });

        it('should handle invalid stage data', () => {
            const result = recruitmentSystem.initialize(null as any);

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
            expect(result.message).toContain('Invalid stage data');
        });

        it('should handle stage data without ID', () => {
            const invalidStageData = { ...mockStageData, id: '' };
            const result = recruitmentSystem.initialize(invalidStageData);

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.INVALID_STAGE_DATA);
            expect(result.message).toContain('valid ID');
        });

        it('should initialize with no recruitable characters', () => {
            const stageWithoutRecruitables = {
                ...mockStageData,
                enemyUnits: [mockEnemyUnit] // Only non-recruitable enemy
            };

            const result = recruitmentSystem.initialize(stageWithoutRecruitables);

            expect(result.success).toBe(true);
            expect(result.message).toContain('0 recruitable characters');
        });

        it('should handle disabled recruitment system', () => {
            const disabledSystem = new RecruitmentSystem(mockScene, { enableRecruitment: false }, mockEventEmitter);
            const result = disabledSystem.initialize(mockStageData);

            expect(result.success).toBe(true);
            expect(result.message).toContain('disabled by configuration');
        });
    });

    describe('checkRecruitmentEligibility', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should check eligibility correctly when conditions are not met', () => {
            const result = recruitmentSystem.checkRecruitmentEligibility(
                mockPlayerUnit,
                mockRecruitableEnemyUnit,
                {
                    damage: 50,
                    turn: 1,
                    alliedUnits: [mockPlayerUnit],
                    enemyUnits: [mockEnemyUnit, mockRecruitableEnemyUnit],
                    npcUnits: []
                }
            );

            expect(result.success).toBe(false);
            expect(result.nextAction).toBe(RecruitmentAction.CONTINUE_BATTLE);
            expect(result.conditionsMet).toHaveLength(2);
            expect(result.conditionsMet[0]).toBe(true); // Specific attacker condition met
            expect(result.conditionsMet[1]).toBe(false); // HP threshold not met (HP still high)
        });

        it('should check eligibility correctly when all conditions are met', () => {
            // Reduce enemy HP to below threshold
            mockRecruitableEnemyUnit.currentHP = 30; // 25% of 120 HP

            const result = recruitmentSystem.checkRecruitmentEligibility(
                mockPlayerUnit,
                mockRecruitableEnemyUnit,
                {
                    damage: 50,
                    turn: 1,
                    alliedUnits: [mockPlayerUnit],
                    enemyUnits: [mockEnemyUnit, mockRecruitableEnemyUnit],
                    npcUnits: []
                }
            );

            expect(result.success).toBe(true);
            expect(result.nextAction).toBe(RecruitmentAction.CONVERT_TO_NPC);
            expect(result.conditionsMet).toHaveLength(2);
            expect(result.conditionsMet[0]).toBe(true); // Specific attacker condition met
            expect(result.conditionsMet[1]).toBe(true); // HP threshold met
        });

        it('should handle non-recruitable targets', () => {
            const result = recruitmentSystem.checkRecruitmentEligibility(
                mockPlayerUnit,
                mockEnemyUnit, // Non-recruitable enemy
                {
                    damage: 50,
                    turn: 1,
                    alliedUnits: [mockPlayerUnit],
                    enemyUnits: [mockEnemyUnit, mockRecruitableEnemyUnit],
                    npcUnits: []
                }
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.message).toContain('not recruitable');
        });

        it('should handle invalid attacker or target', () => {
            const result = recruitmentSystem.checkRecruitmentEligibility(
                null as any,
                mockRecruitableEnemyUnit
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.message).toContain('Invalid attacker or target');
        });

        it('should emit eligibility check event', () => {
            recruitmentSystem.checkRecruitmentEligibility(
                mockPlayerUnit,
                mockRecruitableEnemyUnit,
                {
                    damage: 50,
                    turn: 1,
                    alliedUnits: [mockPlayerUnit],
                    enemyUnits: [mockEnemyUnit, mockRecruitableEnemyUnit],
                    npcUnits: []
                }
            );

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-eligibility-checked',
                expect.objectContaining({
                    unitId: 'recruitable-1',
                    eligible: false,
                    progress: expect.objectContaining({
                        characterId: 'recruitable-1',
                        overallProgress: 50 // 1 of 2 conditions met
                    })
                })
            );
        });
    });

    describe('processRecruitmentAttempt', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should process successful recruitment attempt', () => {
            // Set up conditions for successful recruitment
            mockRecruitableEnemyUnit.currentHP = 30; // Below threshold
            const damage = 35; // Enough to defeat the unit

            const mockBattleResult: BattleResult = {
                attacker: mockPlayerUnit,
                target: mockRecruitableEnemyUnit,
                weapon: { id: 'sword', name: 'Iron Sword' } as any,
                baseDamage: 35,
                finalDamage: 35,
                modifiers: [],
                isCritical: false,
                isEvaded: false,
                experienceGained: 10,
                targetDefeated: true,
                effectsApplied: [],
                timestamp: Date.now()
            };

            const result = recruitmentSystem.processRecruitmentAttempt(
                mockPlayerUnit,
                mockRecruitableEnemyUnit,
                damage,
                mockBattleResult,
                1
            );

            expect(result.success).toBe(true);
            expect(result.nextAction).toBe(RecruitmentAction.CONVERT_TO_NPC);
            expect(result.npcState).toBeDefined();
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-attempt-processed',
                expect.objectContaining({
                    unitId: 'recruitable-1',
                    result: expect.objectContaining({
                        success: true
                    })
                })
            );
        });

        it('should handle recruitment attempt when conditions not met', () => {
            // HP still high, conditions not met
            const damage = 50;

            const result = recruitmentSystem.processRecruitmentAttempt(
                mockPlayerUnit,
                mockRecruitableEnemyUnit,
                damage,
                undefined,
                1
            );

            expect(result.success).toBe(false);
            expect(result.nextAction).toBe(RecruitmentAction.CONTINUE_BATTLE);
        });

        it('should handle target that survives when conditions are met', () => {
            // Set up conditions but target survives
            mockRecruitableEnemyUnit.currentHP = 30; // Below threshold
            const damage = 20; // Not enough to defeat

            const result = recruitmentSystem.processRecruitmentAttempt(
                mockPlayerUnit,
                mockRecruitableEnemyUnit,
                damage,
                undefined,
                1
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.CONDITIONS_NOT_MET);
            expect(result.message).toContain('must be defeated');
        });

        it('should handle uninitialized system', () => {
            const uninitializedSystem = new RecruitmentSystem();
            const result = uninitializedSystem.processRecruitmentAttempt(
                mockPlayerUnit,
                mockRecruitableEnemyUnit,
                50
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.SYSTEM_ERROR);
            expect(result.message).toContain('not initialized');
        });
    });

    describe('convertToNPC', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should convert unit to NPC successfully', () => {
            const result = recruitmentSystem.convertToNPC(mockRecruitableEnemyUnit, 1);

            expect(result.success).toBe(true);
            expect(result.npcState).toBeDefined();
            expect(result.npcState?.convertedAt).toBe(1);
            expect(result.npcState?.remainingHP).toBe(mockRecruitableEnemyUnit.currentHP);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('character-converted-to-npc',
                expect.objectContaining({
                    unitId: 'recruitable-1',
                    npcState: expect.any(Object)
                })
            );
        });

        it('should handle invalid unit', () => {
            const result = recruitmentSystem.convertToNPC(null as any, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.message).toContain('Invalid unit');
        });

        it('should handle non-recruitable unit', () => {
            const result = recruitmentSystem.convertToNPC(mockEnemyUnit, 1);

            expect(result.success).toBe(false);
            expect(result.error).toBe(RecruitmentError.INVALID_TARGET);
            expect(result.message).toContain('not recruitable');
        });
    });

    describe('completeRecruitment', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should complete recruitment for surviving NPCs', () => {
            // First convert to NPC
            recruitmentSystem.convertToNPC(mockRecruitableEnemyUnit, 1);

            // Ensure NPC is alive
            mockRecruitableEnemyUnit.currentHP = 50;

            const allUnits = [mockPlayerUnit, mockEnemyUnit, mockRecruitableEnemyUnit];
            const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

            expect(recruitedUnits).toHaveLength(1);
            expect(recruitedUnits[0].unit.id).toBe('recruitable-1');
            expect(recruitedUnits[0].unit.faction).toBe('player');
            expect(recruitedUnits[0].unit.hasActed).toBe(false);
            expect(recruitedUnits[0].unit.hasMoved).toBe(false);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-completed',
                expect.objectContaining({
                    unitId: 'recruitable-1',
                    success: true
                })
            );
        });

        it('should handle defeated NPCs', () => {
            // First convert to NPC
            recruitmentSystem.convertToNPC(mockRecruitableEnemyUnit, 1);

            // NPC is defeated
            mockRecruitableEnemyUnit.currentHP = 0;

            const allUnits = [mockPlayerUnit, mockEnemyUnit, mockRecruitableEnemyUnit];
            const recruitedUnits = recruitmentSystem.completeRecruitment(allUnits);

            expect(recruitedUnits).toHaveLength(0);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-failed',
                expect.objectContaining({
                    unitId: 'recruitable-1',
                    reason: RecruitmentError.NPC_ALREADY_DEFEATED
                })
            );
        });

        it('should emit stage recruitment completed event', () => {
            // Convert to NPC and keep alive
            recruitmentSystem.convertToNPC(mockRecruitableEnemyUnit, 1);
            mockRecruitableEnemyUnit.currentHP = 50;

            const allUnits = [mockPlayerUnit, mockEnemyUnit, mockRecruitableEnemyUnit];
            recruitmentSystem.completeRecruitment(allUnits);

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('stage-recruitment-completed',
                expect.objectContaining({
                    recruitedUnits: expect.arrayContaining([mockRecruitableEnemyUnit]),
                    failedUnits: []
                })
            );
        });

        it('should handle uninitialized system', () => {
            const uninitializedSystem = new RecruitmentSystem();
            const recruitedUnits = uninitializedSystem.completeRecruitment([]);

            expect(recruitedUnits).toHaveLength(0);
        });
    });

    describe('getRecruitmentConditions', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should return conditions for recruitable unit', () => {
            const conditions = recruitmentSystem.getRecruitmentConditions(mockRecruitableEnemyUnit);

            expect(conditions).toHaveLength(2);
            expect(conditions[0].type).toBe(RecruitmentConditionType.SPECIFIC_ATTACKER);
            expect(conditions[1].type).toBe(RecruitmentConditionType.HP_THRESHOLD);
        });

        it('should return empty array for non-recruitable unit', () => {
            const conditions = recruitmentSystem.getRecruitmentConditions(mockEnemyUnit);

            expect(conditions).toHaveLength(0);
        });

        it('should handle invalid unit', () => {
            const conditions = recruitmentSystem.getRecruitmentConditions(null as any);

            expect(conditions).toHaveLength(0);
        });
    });

    describe('getRecruitmentProgress', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should return progress for recruitable unit with context', () => {
            const progress = recruitmentSystem.getRecruitmentProgress(mockRecruitableEnemyUnit, {
                attacker: mockPlayerUnit,
                damage: 50,
                turn: 1,
                alliedUnits: [mockPlayerUnit],
                enemyUnits: [mockEnemyUnit, mockRecruitableEnemyUnit],
                npcUnits: []
            });

            expect(progress).toBeDefined();
            expect(progress!.characterId).toBe('recruitable-1');
            expect(progress!.conditions).toHaveLength(2);
            expect(progress!.conditionProgress).toHaveLength(2);
            expect(progress!.overallProgress).toBe(50); // 1 of 2 conditions met
            expect(progress!.isEligible).toBe(false);
        });

        it('should return progress with no context', () => {
            const progress = recruitmentSystem.getRecruitmentProgress(mockRecruitableEnemyUnit);

            expect(progress).toBeDefined();
            expect(progress!.characterId).toBe('recruitable-1');
            expect(progress!.overallProgress).toBe(0); // No conditions met without context
            expect(progress!.isEligible).toBe(false);
        });

        it('should return null for non-recruitable unit', () => {
            const progress = recruitmentSystem.getRecruitmentProgress(mockEnemyUnit);

            expect(progress).toBeNull();
        });
    });

    describe('utility methods', () => {
        beforeEach(() => {
            recruitmentSystem.initialize(mockStageData);
        });

        it('should check NPC status correctly', () => {
            expect(recruitmentSystem.isNPC(mockRecruitableEnemyUnit)).toBe(false);

            recruitmentSystem.convertToNPC(mockRecruitableEnemyUnit, 1);
            expect(recruitmentSystem.isNPC(mockRecruitableEnemyUnit)).toBe(true);
        });

        it('should get NPC priority correctly', () => {
            expect(recruitmentSystem.getNPCPriority(mockRecruitableEnemyUnit)).toBe(0);

            recruitmentSystem.convertToNPC(mockRecruitableEnemyUnit, 1);
            expect(recruitmentSystem.getNPCPriority(mockRecruitableEnemyUnit)).toBeGreaterThan(0);
        });

        it('should get recruitable character IDs', () => {
            const ids = recruitmentSystem.getRecruitableCharacterIds();
            expect(ids).toContain('recruitable-1');
            expect(ids).not.toContain('enemy-1');
        });

        it('should get recruitment status', () => {
            expect(recruitmentSystem.getRecruitmentStatus('recruitable-1')).toBe(RecruitmentStatus.AVAILABLE);
            expect(recruitmentSystem.getRecruitmentStatus('enemy-1')).toBeNull();
        });

        it('should get recruitment statistics', () => {
            const stats = recruitmentSystem.getRecruitmentStatistics();

            expect(stats.totalRecruitableCharacters).toBe(1);
            expect(stats.availableForRecruitment).toBe(1);
            expect(stats.currentNPCs).toBe(0);
            expect(stats.recruitedCharacters).toBe(0);
            expect(stats.failedRecruitments).toBe(0);
        });

        it('should check if system is ready', () => {
            expect(recruitmentSystem.isReady()).toBe(true);

            const disabledSystem = new RecruitmentSystem(mockScene, { enableRecruitment: false });
            expect(disabledSystem.isReady()).toBe(false);
        });
    });

    describe('configuration and lifecycle', () => {
        it('should update configuration', () => {
            const newConfig = { maxNPCsPerStage: 5, npcProtectionPriority: 80 };
            recruitmentSystem.updateConfig(newConfig);

            const config = recruitmentSystem.getConfig();
            expect(config.maxNPCsPerStage).toBe(5);
            expect(config.npcProtectionPriority).toBe(80);
        });

        it('should reset system correctly', () => {
            recruitmentSystem.initialize(mockStageData);
            expect(recruitmentSystem.isReady()).toBe(true);

            recruitmentSystem.reset();
            expect(recruitmentSystem.isReady()).toBe(false);
            expect(recruitmentSystem.getRecruitableCharacterIds()).toHaveLength(0);
        });

        it('should destroy system correctly', () => {
            recruitmentSystem.initialize(mockStageData);
            recruitmentSystem.destroy();

            expect(mockEventEmitter.emit).toHaveBeenCalledWith('recruitment-system-destroyed');
            expect(recruitmentSystem.isReady()).toBe(false);
        });
    });
});