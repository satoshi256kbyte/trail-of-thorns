/**
 * Comprehensive AI-Recruitment System Integration Test
 * 
 * This test verifies the complete integration between AI systems and the recruitment system,
 * ensuring that all components work together correctly for NPC attack priority.
 */

import { AIController, AIActionType } from '../../../game/src/systems/AIController';
import { NPCStateManager } from '../../../game/src/systems/recruitment/NPCStateManager';
import { RecruitmentSystem } from '../../../game/src/systems/recruitment/RecruitmentSystem';
import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { MovementSystem } from '../../../game/src/systems/MovementSystem';
import { Unit, MapData, StageData } from '../../../game/src/types/gameplay';

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

describe('Comprehensive AI-Recruitment System Integration', () => {
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

        // Create integrated systems
        npcStateManager = new NPCStateManager(
            mockScene as any,
            { defaultNPCPriority: 100 },
            mockEventEmitter as any
        );

        recruitmentSystem = new RecruitmentSystem(
            mockScene as any,
            { enableRecruitment: true },
            mockEventEmitter as any
        );

        aiController = new AIController(
            mockScene as any,
            battleSystem,
            movementSystem,
            {
                enableAILogging: false, // Disable logging for cleaner test output
                npcPriorityMultiplier: 10.0
            }
        );

        // Integrate all systems
        aiController.setNPCStateManager(npcStateManager);
        aiController.setRecruitmentSystem(recruitmentSystem);
    });

    describe('Complete Integration Workflow', () => {
        test('should handle full recruitment-to-AI-targeting workflow', async () => {
            // Step 1: Create game scenario
            const aiUnit = createMockUnit({
                id: 'enemy-ai',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const playerUnit = createMockUnit({
                id: 'player-unit',
                faction: 'player',
                position: { x: 4, y: 5 }
            });

            const recruitableUnit = createMockUnit({
                id: 'recruitable-enemy',
                faction: 'enemy',
                position: { x: 6, y: 5 }
            });

            // Step 2: Initialize recruitment system
            const stageData: StageData = {
                id: 'test-stage',
                name: 'Test Stage',
                mapData: createMockMapData(),
                playerUnits: [playerUnit],
                enemyUnits: [recruitableUnit],
                victoryConditions: []
            } as StageData;

            recruitmentSystem.initialize(stageData);

            // Step 3: Simulate recruitment process (enemy becomes NPC)
            const conversionResult = npcStateManager.convertToNPC(recruitableUnit, 'test-recruitment', 1);
            expect(conversionResult.success).toBe(true);

            // Step 4: Verify AI prioritizes NPC
            const allUnits = [aiUnit, playerUnit, recruitableUnit];
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            // AI should attack the NPC with high priority
            expect(decision.type).toBe(AIActionType.ATTACK);
            expect(decision.target?.id).toBe('recruitable-enemy');
            expect(decision.priority).toBeGreaterThan(100); // High priority due to NPC status
        });

        test('should handle multiple NPCs with different priorities', async () => {
            // Create scenario with multiple NPCs
            const aiUnit = createMockUnit({
                id: 'enemy-ai',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit1 = createMockUnit({
                id: 'npc-1',
                faction: 'player',
                position: { x: 4, y: 5 },
                currentHP: 10 // Low HP - should be higher priority
            });

            const npcUnit2 = createMockUnit({
                id: 'npc-2',
                faction: 'player',
                position: { x: 6, y: 5 },
                currentHP: 90 // High HP - lower priority
            });

            // Convert both to NPCs
            npcStateManager.convertToNPC(npcUnit1, 'recruitment-1', 1);
            npcStateManager.convertToNPC(npcUnit2, 'recruitment-2', 1);

            // AI should prioritize the low-HP NPC
            const allUnits = [aiUnit, npcUnit1, npcUnit2];
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            expect(decision.type).toBe(AIActionType.ATTACK);
            expect(decision.target?.id).toBe('npc-1'); // Should target the low-HP NPC
        });

        test('should handle NPC defeat and priority recalculation', async () => {
            // Create scenario
            const aiUnit = createMockUnit({
                id: 'enemy-ai',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcUnit = createMockUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 6, y: 5 },
                currentHP: 20
            });

            const regularUnit = createMockUnit({
                id: 'regular-unit',
                faction: 'player',
                position: { x: 4, y: 5 }
            });

            // Convert to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // First decision should target NPC
            let allUnits = [aiUnit, npcUnit, regularUnit];
            let decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);
            expect(decision.target?.id).toBe('npc-unit');

            // Simulate NPC defeat
            npcStateManager.handleNPCDamage(npcUnit, 25); // Fatal damage
            expect(npcStateManager.isNPC(npcUnit)).toBe(false);

            // Second decision should target regular unit (no more NPCs)
            allUnits = [aiUnit, regularUnit]; // NPC is defeated/removed
            decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 2);
            expect(decision.target?.id).toBe('regular-unit');
        });

        test('should respect AI configuration for NPC priority', async () => {
            // Create AI with custom NPC priority multiplier
            const customAI = new AIController(
                mockScene as any,
                battleSystem,
                movementSystem,
                {
                    enableAILogging: false,
                    npcPriorityMultiplier: 1.0 // Low multiplier
                }
            );

            customAI.setNPCStateManager(npcStateManager);

            const aiUnit = createMockUnit({
                id: 'enemy-ai',
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

            // Should still target NPC but with lower priority due to custom multiplier
            expect(decision.target?.id).toBe('npc-unit');
            expect(decision.priority).toBeGreaterThan(50); // Should still have some priority
        });

        test('should handle system errors gracefully', async () => {
            // Create scenario where NPCStateManager fails
            const faultyNPCManager = new NPCStateManager();
            faultyNPCManager.isNPC = jest.fn().mockImplementation(() => {
                throw new Error('Test error');
            });

            const faultyAI = new AIController(
                mockScene as any,
                battleSystem,
                movementSystem,
                { enableAILogging: false }
            );

            faultyAI.setNPCStateManager(faultyNPCManager);

            const aiUnit = createMockUnit({
                id: 'enemy-ai',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const targetUnit = createMockUnit({
                id: 'target-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            // Should not crash despite NPC manager error
            const allUnits = [aiUnit, targetUnit];
            const decision = await faultyAI.makeDecision(aiUnit, allUnits, createMockMapData(), 1);

            expect(decision).toBeDefined();
            expect(decision.type).toBeDefined();
        });
    });

    describe('Performance and Statistics', () => {
        test('should maintain performance with multiple NPCs', async () => {
            // Create scenario with many NPCs
            const aiUnit = createMockUnit({
                id: 'enemy-ai',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const npcs: Unit[] = [];
            for (let i = 0; i < 5; i++) {
                const npc = createMockUnit({
                    id: `npc-${i}`,
                    faction: 'player',
                    position: { x: i, y: 5 }
                });
                npcs.push(npc);
                npcStateManager.convertToNPC(npc, `recruitment-${i}`, 1);
            }

            const allUnits = [aiUnit, ...npcs];

            // Measure decision time
            const startTime = performance.now();
            const decision = await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), 1);
            const endTime = performance.now();

            // Should complete quickly even with multiple NPCs
            expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
            expect(decision.type).toBeDefined();
            expect([AIActionType.ATTACK, AIActionType.MOVE]).toContain(decision.type);
        });

        test('should provide accurate statistics about NPC targeting', async () => {
            const aiUnit = createMockUnit({
                id: 'enemy-ai',
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

            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Make multiple decisions
            for (let i = 0; i < 10; i++) {
                const allUnits = [aiUnit, npcUnit, regularUnit];
                await aiController.makeDecision(aiUnit, allUnits, createMockMapData(), i + 1);
            }

            const stats = aiController.getAIStatistics();

            // Should show high NPC targeting rate
            expect(stats.totalDecisions).toBe(10);
            expect(stats.npcTargetingRate).toBeGreaterThan(0.8); // Should target NPCs most of the time
        });
    });
});