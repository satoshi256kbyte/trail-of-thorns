/**
 * AIController Recruitment System Integration Tests
 * 
 * Tests the integration between AIController and the recruitment system,
 * specifically focusing on NPC attack priority and tactical AI behavior.
 */

import { AIController, AIBehaviorType, AIActionType } from '../../../game/src/systems/AIController';
import { NPCStateManager } from '../../../game/src/systems/recruitment/NPCStateManager';
import { RecruitmentSystem } from '../../../game/src/systems/recruitment/RecruitmentSystem';
import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { MovementSystem } from '../../../game/src/systems/MovementSystem';
import { Unit, Position, MapData } from '../../../game/src/types/gameplay';
import { StageData } from '../../../game/src/types/StageData';

// Mock Phaser Scene
class MockScene {
    add = {
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
    };
    tweens = {
        add: jest.fn()
    };
}

// Mock Event Emitter
class MockEventEmitter {
    emit = jest.fn();
    on = jest.fn();
    off = jest.fn();
    removeAllListeners = jest.fn();
}

// Test utilities
function createMockUnit(overrides: Partial<Unit> = {}): Unit {
    return {
        id: `unit-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Test Unit',
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
        faction: 'enemy',
        hasActed: false,
        hasMoved: false,
        sprite: {
            x: 0,
            y: 0,
            setTint: jest.fn(),
            clearTint: jest.fn(),
            setScale: jest.fn()
        },
        weapon: { range: 1 },
        ...overrides
    } as Unit;
}

function createMockMapData(): MapData {
    return {
        width: 10,
        height: 10,
        tiles: Array(10).fill(null).map(() =>
            Array(10).fill({ type: 'grass', movementCost: 1 })
        )
    } as MapData;
}

function createMockStageData(): StageData {
    return {
        id: 'test-stage',
        name: 'Test Stage',
        mapData: createMockMapData(),
        playerUnits: [],
        enemyUnits: [],
        victoryConditions: []
    } as StageData;
}

describe('AIController Recruitment System Integration', () => {
    let aiController: AIController;
    let npcStateManager: NPCStateManager;
    let recruitmentSystem: RecruitmentSystem;
    let battleSystem: BattleSystem;
    let movementSystem: MovementSystem;
    let mockScene: MockScene;
    let mockEventEmitter: MockEventEmitter;

    beforeEach(() => {
        mockScene = new MockScene();
        mockEventEmitter = new MockEventEmitter();

        // Create mock systems
        battleSystem = {
            canAttack: jest.fn().mockReturnValue(true)
        } as any;

        movementSystem = {
            calculateMovementRange: jest.fn().mockReturnValue([
                { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }
            ])
        } as any;

        // Create systems
        npcStateManager = new NPCStateManager(
            mockScene as any,
            undefined,
            mockEventEmitter as any
        );

        recruitmentSystem = new RecruitmentSystem(
            mockScene as any,
            undefined,
            mockEventEmitter as any
        );

        aiController = new AIController(
            mockScene as any,
            battleSystem,
            movementSystem,
            { enableAILogging: true }
        );

        // Integrate systems
        aiController.setNPCStateManager(npcStateManager);
        aiController.setRecruitmentSystem(recruitmentSystem);
    });

    describe('NPC Priority System Integration', () => {
        test('should prioritize NPC targets over regular enemies', async () => {
            // Create test units
            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const regularEnemy = createMockUnit({
                id: 'regular-enemy',
                faction: 'player',
                position: { x: 4, y: 5 }
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            // Convert one unit to NPC
            const conversionResult = npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);
            expect(conversionResult.success).toBe(true);

            // Make AI decision
            const allUnits = [aiUnit, regularEnemy, npcUnit];
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // Should prioritize attacking the NPC
            expect(decision.type).toBe(AIActionType.ATTACK);
            expect(decision.target?.id).toBe('npc-unit');
            expect(decision.reasoning).toContain('NPC');
        });

        test('should switch to NPC hunter behavior when NPCs are present', async () => {
            // Create test units
            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            // Convert unit to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Make AI decision
            const allUnits = [aiUnit, npcUnit];
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // Should use NPC hunter behavior
            expect(decision.type).toBe(AIActionType.ATTACK);
            expect(decision.target?.id).toBe('npc-unit');
        });

        test('should calculate correct NPC priority multiplier', async () => {
            // Create test units
            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 6, y: 5 },
                currentHP: 50 // Low HP for additional priority
            });

            // Convert unit to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Make AI decision
            const allUnits = [aiUnit, npcUnit];
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // Should have very high priority due to NPC status + low HP
            expect(decision.priority).toBeGreaterThan(100);
            expect(decision.target?.id).toBe('npc-unit');
        });
    });

    describe('Tactical AI Behavior with NPCs', () => {
        test('should move closer to NPCs when they are out of attack range', async () => {
            // Create test units
            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 0, y: 0 },
                hasMoved: false
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 5, y: 5 } // Far away
            });

            // Convert unit to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Mock movement system to return positions closer to NPC
            movementSystem.calculateMovementRange = jest.fn().mockReturnValue([
                { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }
            ]);

            // Make AI decision
            const allUnits = [aiUnit, npcUnit];
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // Should move closer to NPC
            expect(decision.type).toBe(AIActionType.MOVE);
            expect(decision.reasoning).toContain('NPC');
        });

        test('should handle multiple NPCs with different priorities', async () => {
            // Create test units
            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit1 = createMockUnit({
                id: 'npc-unit-1',
                faction: 'player',
                position: { x: 4, y: 5 },
                currentHP: 10 // Very low HP
            });

            const npcUnit2 = createMockUnit({
                id: 'npc-unit-2',
                faction: 'player',
                position: { x: 6, y: 5 },
                currentHP: 80 // Higher HP
            });

            // Convert both units to NPCs
            npcStateManager.convertToNPC(npcUnit1, 'test-recruitment-1', 1);
            npcStateManager.convertToNPC(npcUnit2, 'test-recruitment-2', 1);

            // Make AI decision
            const allUnits = [aiUnit, npcUnit1, npcUnit2];
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // Should prioritize the NPC with lower HP (closer to defeat)
            expect(decision.type).toBe(AIActionType.ATTACK);
            expect(decision.target?.id).toBe('npc-unit-1');
        });
    });

    describe('Recruitment System Information Integration', () => {
        test('should access recruitment conditions through RecruitmentSystem', async () => {
            // Initialize recruitment system with stage data
            const stageData = createMockStageData();
            const enemyUnit = createMockUnit({
                id: 'recruitable-enemy',
                faction: 'enemy',
                metadata: {
                    recruitment: {
                        conditions: [
                            {
                                type: 'specific_attacker',
                                parameters: { attackerId: 'protagonist' }
                            }
                        ]
                    }
                }
            });

            stageData.enemyUnits = [enemyUnit];
            recruitmentSystem.initialize(stageData);

            // Create AI unit
            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            // Make AI decision
            const allUnits = [aiUnit, enemyUnit];
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // AI should be able to access recruitment information
            expect(decision).toBeDefined();
            expect(decision.type).toBeDefined();
        });

        test('should handle recruitment system errors gracefully', async () => {
            // Create test units
            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const enemyUnit = createMockUnit({
                id: 'enemy-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            // Mock recruitment system to throw error
            recruitmentSystem.getRecruitmentConditions = jest.fn().mockImplementation(() => {
                throw new Error('Test error');
            });

            // Make AI decision - should not crash
            const allUnits = [aiUnit, enemyUnit];
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // Should still make a decision despite recruitment system error
            expect(decision).toBeDefined();
            expect(decision.type).toBeDefined();
        });
    });

    describe('AI Statistics and NPC Targeting', () => {
        test('should track NPC targeting rate in statistics', async () => {
            // Create test units
            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            const regularUnit = createMockUnit({
                id: 'regular-unit',
                faction: 'player',
                position: { x: 4, y: 5 }
            });

            // Convert one unit to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Make multiple AI decisions
            for (let i = 0; i < 5; i++) {
                const allUnits = [aiUnit, npcUnit, regularUnit];
                await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), i + 1);
            }

            // Check statistics
            const stats = aiController.getAIStatistics();
            expect(stats.npcTargetingRate).toBeGreaterThan(0);
            expect(stats.totalDecisions).toBe(5);
        });

        test('should provide decision history for analysis', async () => {
            // Create test units
            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            // Convert unit to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Make AI decision
            const allUnits = [aiUnit, npcUnit];
            await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // Check decision history
            const history = aiController.getDecisionHistory(aiUnit.id);
            expect(history).toHaveLength(1);
            expect(history[0].type).toBe(AIActionType.ATTACK);
            expect(history[0].target?.id).toBe('npc-unit');
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle missing NPCStateManager gracefully', async () => {
            // Create AI controller without NPC state manager
            const isolatedAI = new AIController(
                mockScene as any,
                battleSystem,
                movementSystem
            );

            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const enemyUnit = createMockUnit({
                id: 'enemy-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            // Should not crash without NPC state manager
            const allUnits = [aiUnit, enemyUnit];
            const decision = await isolatedAI.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            expect(decision).toBeDefined();
            expect(decision.type).toBeDefined();
        });

        test('should handle invalid NPC states', async () => {
            // Create test units
            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            // Mock NPC state manager to return invalid data
            npcStateManager.isNPC = jest.fn().mockReturnValue(true);
            npcStateManager.getNPCPriority = jest.fn().mockReturnValue(NaN);

            // Should handle invalid priority gracefully
            const allUnits = [aiUnit, npcUnit];
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            expect(decision).toBeDefined();
            expect(decision.type).toBeDefined();
        });

        test('should handle AI thinking time limits', async () => {
            // Create AI controller with very short thinking time
            const fastAI = new AIController(
                mockScene as any,
                battleSystem,
                movementSystem,
                { thinkingTimeLimit: 1 } // 1ms limit
            );

            fastAI.setNPCStateManager(npcStateManager);

            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Should still make a decision within time limit
            const startTime = performance.now();
            const allUnits = [aiUnit, npcUnit];
            const decision = await fastAI.makeDecision(aiUnit, allUnits, createMockMapData(), 1);
            const endTime = performance.now();

            expect(decision).toBeDefined();
            expect(endTime - startTime).toBeLessThan(100); // Should be fast
        });
    });

    describe('Configuration and Customization', () => {
        test('should respect NPC priority multiplier configuration', async () => {
            // Create AI controller with custom NPC priority multiplier
            const customAI = new AIController(
                mockScene as any,
                battleSystem,
                movementSystem,
                { npcPriorityMultiplier: 20.0 } // Very high multiplier
            );

            customAI.setNPCStateManager(npcStateManager);

            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            const allUnits = [aiUnit, npcUnit];
            const decision = await customAI.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // Should have extremely high priority due to custom multiplier
            expect(decision.priority).toBeGreaterThan(200);
        });

        test('should allow disabling tactical AI for NPCs', async () => {
            // Create AI controller with tactical AI disabled
            const simpleAI = new AIController(
                mockScene as any,
                battleSystem,
                movementSystem,
                { enableTacticalAI: false }
            );

            simpleAI.setNPCStateManager(npcStateManager);

            const aiUnit = createMockUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            const allUnits = [aiUnit, npcUnit];
            const decision = await simpleAI.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // Should still target NPC but without tactical considerations
            expect(decision.type).toBe(AIActionType.ATTACK);
            expect(decision.target?.id).toBe('npc-unit');
        });
    });
});