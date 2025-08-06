/**
 * AIController Integration Test Suite
 * 
 * Tests for AI system integration with NPCStateManager, BattleSystem,
 * and RecruitmentSystem in realistic game scenarios
 */

import { AIController, AIBehaviorType, AIActionType } from '../../../game/src/systems/AIController';
import { NPCStateManager } from '../../../game/src/systems/recruitment/NPCStateManager';
import { RecruitmentSystem } from '../../../game/src/systems/recruitment/RecruitmentSystem';
import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { MovementSystem } from '../../../game/src/systems/MovementSystem';
import { Unit, Position, MapData } from '../../../game/src/types/gameplay';
import { RecruitmentCondition, RecruitmentConditionType } from '../../../game/src/types/recruitment';

// Mock Phaser Scene with more complete implementation
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            add: jest.fn(),
            setDepth: jest.fn(),
            setScale: jest.fn(),
            destroy: jest.fn(),
            x: 0,
            y: 0
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn(),
            fillCircle: jest.fn(),
            fillRoundedRect: jest.fn(),
            strokeRect: jest.fn(),
            fillRect: jest.fn(),
            lineStyle: jest.fn()
        })
    },
    tweens: {
        add: jest.fn()
    },
    events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
    }
} as any;

// Helper function to create realistic mock units
function createRealisticUnit(overrides: Partial<Unit> = {}): Unit {
    const baseUnit = {
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
        faction: 'player',
        hasActed: false,
        hasMoved: false,
        weapon: {
            id: 'sword',
            name: 'Iron Sword',
            attack: 10,
            range: 1,
            durability: 100
        },
        sprite: {
            x: 0,
            y: 0,
            setTint: jest.fn(),
            clearTint: jest.fn(),
            setScale: jest.fn()
        }
    };

    return { ...baseUnit, ...overrides } as Unit;
}

// Helper function to create realistic map data
function createRealisticMapData(width: number = 10, height: number = 10): MapData {
    return {
        width,
        height,
        tiles: Array(height).fill(null).map(() =>
            Array(width).fill({ type: 'grass', movementCost: 1 })
        )
    };
}

// Helper function to create mock recruitment conditions
function createMockRecruitmentCondition(type: RecruitmentConditionType): RecruitmentCondition {
    return {
        id: `condition-${type}`,
        type: type,
        description: `Test condition for ${type}`,
        parameters: type === RecruitmentConditionType.HP_THRESHOLD ? { threshold: 0.3 } : {},
        checkCondition: jest.fn().mockReturnValue(true)
    };
}

describe('AIController Integration Tests', () => {
    let aiController: AIController;
    let npcStateManager: NPCStateManager;
    let recruitmentSystem: RecruitmentSystem;
    let battleSystem: BattleSystem;
    let movementSystem: MovementSystem;

    beforeEach(() => {
        // Create realistic battle system mock
        battleSystem = {
            canAttack: jest.fn().mockReturnValue(true),
            setRecruitmentSystem: jest.fn(),
            hasRecruitmentSystem: jest.fn().mockReturnValue(true),
            getRecruitmentConditions: jest.fn().mockReturnValue([]),
            canRecruit: jest.fn().mockReturnValue(false),
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn()
        } as any;

        // Create realistic movement system mock
        movementSystem = {
            calculateMovementRange: jest.fn().mockImplementation((unit: Unit) => {
                const range: Position[] = [];
                const movement = unit.stats.movement;

                for (let x = unit.position.x - movement; x <= unit.position.x + movement; x++) {
                    for (let y = unit.position.y - movement; y <= unit.position.y + movement; y++) {
                        if (Math.abs(x - unit.position.x) + Math.abs(y - unit.position.y) <= movement) {
                            range.push({ x, y });
                        }
                    }
                }

                return range;
            }),
            canMoveTo: jest.fn().mockReturnValue(true),
            on: jest.fn(),
            off: jest.fn()
        } as any;

        // Create NPC state manager
        npcStateManager = new NPCStateManager(mockScene, {
            defaultNPCPriority: 100,
            maxNPCsPerStage: 3,
            enableProtection: true
        });

        // Create recruitment system mock
        recruitmentSystem = {
            getRecruitmentConditions: jest.fn().mockReturnValue([]),
            checkRecruitmentEligibility: jest.fn().mockReturnValue({
                success: false,
                conditionsMet: [],
                nextAction: 'continue_battle'
            }),
            processRecruitmentAttempt: jest.fn(),
            initialize: jest.fn(),
            completeRecruitment: jest.fn().mockReturnValue([]),
            on: jest.fn(),
            off: jest.fn()
        } as any;

        // Create AI controller
        aiController = new AIController(
            mockScene,
            battleSystem,
            movementSystem,
            {
                enableAILogging: false,
                thinkingTimeLimit: 2000,
                npcPriorityMultiplier: 10.0,
                enableTacticalAI: true,
                randomFactor: 0.0 // Disable randomness for predictable tests
            }
        );

        // Integrate systems
        aiController.setNPCStateManager(npcStateManager);
        aiController.setRecruitmentSystem(recruitmentSystem);

        // Reset mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        aiController.destroy();
        npcStateManager.destroy();
    });

    describe('Complete NPC Protection Scenario', () => {
        test('should prioritize NPC protection in complex battle scenario', async () => {
            // Create a complex battle scenario
            const aiUnit1 = createRealisticUnit({
                id: 'ai-1',
                name: 'Enemy Soldier',
                faction: 'enemy',
                position: { x: 2, y: 2 },
                stats: { ...createRealisticUnit().stats, attack: 25 }
            });

            const aiUnit2 = createRealisticUnit({
                id: 'ai-2',
                name: 'Enemy Archer',
                faction: 'enemy',
                position: { x: 8, y: 8 },
                weapon: { ...createRealisticUnit().weapon!, range: 3 }
            });

            const playerUnit = createRealisticUnit({
                id: 'player-1',
                name: 'Player Hero',
                faction: 'player',
                position: { x: 5, y: 5 },
                stats: { ...createRealisticUnit().stats, maxHP: 120, attack: 30 }
            });

            const npcUnit = createRealisticUnit({
                id: 'npc-1',
                name: 'Recruited Knight',
                faction: 'player',
                position: { x: 3, y: 3 },
                currentHP: 60 // Damaged NPC
            });

            // Convert unit to NPC
            const conversionResult = npcStateManager.convertToNPC(npcUnit, 'knight-recruitment', 1);
            expect(conversionResult.success).toBe(true);

            const allUnits = [aiUnit1, aiUnit2, playerUnit, npcUnit];
            const mapData = createRealisticMapData(12, 12);

            // AI Unit 1 decision (close to NPC)
            const decision1 = await aiController.makeDecision(aiUnit1, allUnits, mapData, 1);

            // Should prioritize NPC (either attack if in range or move closer)
            if (decision1.type === AIActionType.ATTACK) {
                expect(decision1.target?.id).toBe(npcUnit.id);
                expect(decision1.reasoning).toContain('NPC');
            } else if (decision1.type === AIActionType.MOVE) {
                // Should move closer to NPC
                const newPos = decision1.position!;
                const distanceToNPC = Math.abs(newPos.x - npcUnit.position.x) + Math.abs(newPos.y - npcUnit.position.y);
                const currentDistanceToNPC = Math.abs(aiUnit1.position.x - npcUnit.position.x) + Math.abs(aiUnit1.position.y - npcUnit.position.y);
                expect(distanceToNPC).toBeLessThanOrEqual(currentDistanceToNPC);
                expect(decision1.reasoning).toContain('NPC');
            }

            // AI Unit 2 decision (far from NPC, close to player)
            const decision2 = await aiController.makeDecision(aiUnit2, allUnits, mapData, 1);

            // Should either attack NPC if in range or move closer to NPC
            if (decision2.type === AIActionType.ATTACK) {
                expect(decision2.target?.id).toBe(npcUnit.id);
            } else if (decision2.type === AIActionType.MOVE) {
                // Should move closer to NPC
                const newPos = decision2.position!;
                const distanceToNPC = Math.abs(newPos.x - npcUnit.position.x) + Math.abs(newPos.y - npcUnit.position.y);
                const currentDistanceToNPC = Math.abs(aiUnit2.position.x - npcUnit.position.x) + Math.abs(aiUnit2.position.y - npcUnit.position.y);
                expect(distanceToNPC).toBeLessThan(currentDistanceToNPC);
            }
        });

        test('should coordinate multiple AI units to target NPCs', async () => {
            // Create scenario with multiple AI units and one NPC
            const aiUnits = [
                createRealisticUnit({
                    id: 'ai-1',
                    faction: 'enemy',
                    position: { x: 1, y: 1 }
                }),
                createRealisticUnit({
                    id: 'ai-2',
                    faction: 'enemy',
                    position: { x: 1, y: 3 }
                }),
                createRealisticUnit({
                    id: 'ai-3',
                    faction: 'enemy',
                    position: { x: 3, y: 1 }
                })
            ];

            const npcUnit = createRealisticUnit({
                id: 'npc-1',
                faction: 'player',
                position: { x: 2, y: 2 } // Central position
            });

            // Convert to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            const allUnits = [...aiUnits, npcUnit];
            const mapData = createRealisticMapData(6, 6);

            // Get decisions for all AI units
            const decisions = await Promise.all(
                aiUnits.map(unit => aiController.makeDecision(unit, allUnits, mapData, 1))
            );

            // All AI units should target the NPC
            const npcTargetingDecisions = decisions.filter(d =>
                d.type === AIActionType.ATTACK && d.target?.id === npcUnit.id
            );

            expect(npcTargetingDecisions.length).toBeGreaterThan(0);

            // At least one unit should be targeting the NPC
            expect(decisions.some(d => d.target?.id === npcUnit.id)).toBe(true);
        });
    });

    describe('Tactical AI Behavior with NPCs', () => {
        test('should use tactical positioning when NPCs are present', async () => {
            const aiUnit = createRealisticUnit({
                id: 'tactical-ai',
                faction: 'enemy',
                position: { x: 0, y: 0 },
                stats: { ...createRealisticUnit().stats, movement: 4 }
            });

            const npcUnit = createRealisticUnit({
                id: 'npc-1',
                faction: 'player',
                position: { x: 6, y: 6 }
            });

            const playerUnit = createRealisticUnit({
                id: 'player-1',
                faction: 'player',
                position: { x: 5, y: 5 }
            });

            // Convert to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            const allUnits = [aiUnit, npcUnit, playerUnit];
            const mapData = createRealisticMapData(10, 10);

            let behaviorType: AIBehaviorType | undefined;
            aiController.on('ai-decision-made', (data) => {
                behaviorType = data.behaviorType;
            });

            const decision = await aiController.makeDecision(aiUnit, allUnits, mapData, 1);

            // Should use NPC hunter behavior
            expect(behaviorType).toBe(AIBehaviorType.NPC_HUNTER);

            // Should either attack NPC or move closer to NPC
            if (decision.type === AIActionType.MOVE) {
                const newPos = decision.position!;
                const distanceToNPC = Math.abs(newPos.x - npcUnit.position.x) + Math.abs(newPos.y - npcUnit.position.y);
                const currentDistance = Math.abs(aiUnit.position.x - npcUnit.position.x) + Math.abs(aiUnit.position.y - npcUnit.position.y);
                expect(distanceToNPC).toBeLessThan(currentDistance);
            }
        });

        test('should balance between NPC targeting and self-preservation', async () => {
            const lowHealthAI = createRealisticUnit({
                id: 'low-health-ai',
                faction: 'enemy',
                position: { x: 2, y: 2 },
                currentHP: 15, // Very low health
                stats: { ...createRealisticUnit().stats, maxHP: 100 }
            });

            const npcUnit = createRealisticUnit({
                id: 'npc-1',
                faction: 'player',
                position: { x: 3, y: 2 } // Adjacent to AI
            });

            const strongPlayer = createRealisticUnit({
                id: 'strong-player',
                faction: 'player',
                position: { x: 1, y: 2 }, // Adjacent to AI, threatening
                stats: { ...createRealisticUnit().stats, attack: 50 }
            });

            // Convert to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            const allUnits = [lowHealthAI, npcUnit, strongPlayer];
            const mapData = createRealisticMapData(6, 6);

            let behaviorType: AIBehaviorType | undefined;
            aiController.on('ai-decision-made', (data) => {
                behaviorType = data.behaviorType;
            });

            const decision = await aiController.makeDecision(lowHealthAI, allUnits, mapData, 1);

            // With very low health, should prioritize defensive behavior over NPC hunting
            expect(behaviorType).toBe(AIBehaviorType.DEFENSIVE);

            // Should either move away from threats or attack if no escape
            if (decision.type === AIActionType.MOVE) {
                const newPos = decision.position!;
                const distanceFromThreat = Math.abs(newPos.x - strongPlayer.position.x) + Math.abs(newPos.y - strongPlayer.position.y);
                const currentDistanceFromThreat = Math.abs(lowHealthAI.position.x - strongPlayer.position.x) + Math.abs(lowHealthAI.position.y - strongPlayer.position.y);
                expect(distanceFromThreat).toBeGreaterThanOrEqual(currentDistanceFromThreat);
            }
        });
    });

    describe('Performance and Decision Quality', () => {
        test('should make decisions within time limit', async () => {
            const aiUnit = createRealisticUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            // Create many units to increase decision complexity
            const manyUnits = [aiUnit];
            for (let i = 0; i < 20; i++) {
                manyUnits.push(createRealisticUnit({
                    id: `unit-${i}`,
                    faction: 'player',
                    position: { x: Math.floor(i / 4), y: i % 4 }
                }));
            }

            // Convert some to NPCs
            for (let i = 0; i < 3; i++) {
                npcStateManager.convertToNPC(manyUnits[i + 1], `recruitment-${i}`, 1);
            }

            const mapData = createRealisticMapData(15, 15);

            const startTime = performance.now();
            const decision = await aiController.makeDecision(aiUnit, manyUnits, mapData, 1);
            const decisionTime = performance.now() - startTime;

            // Should complete within time limit (2000ms)
            expect(decisionTime).toBeLessThan(2000);
            expect(decision).toBeDefined();
            expect(decision.type).toBeDefined();
        });

        test('should maintain decision quality with multiple NPCs', async () => {
            const aiUnit = createRealisticUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            // Create multiple NPCs at different distances
            const npcUnits = [
                createRealisticUnit({
                    id: 'npc-close',
                    faction: 'player',
                    position: { x: 6, y: 5 }, // Distance 1
                    currentHP: 80
                }),
                createRealisticUnit({
                    id: 'npc-medium',
                    faction: 'player',
                    position: { x: 7, y: 7 }, // Distance 4
                    currentHP: 30 // Low health
                }),
                createRealisticUnit({
                    id: 'npc-far',
                    faction: 'player',
                    position: { x: 2, y: 2 }, // Distance 6
                    currentHP: 100
                })
            ];

            // Convert all to NPCs
            npcUnits.forEach((unit, index) => {
                npcStateManager.convertToNPC(unit, `recruitment-${index}`, 1);
            });

            const allUnits = [aiUnit, ...npcUnits];
            const mapData = createRealisticMapData(10, 10);

            const decision = await aiController.makeDecision(aiUnit, allUnits, mapData, 1);

            // Should target the closest NPC (optimal decision)
            expect(decision.type).toBe(AIActionType.ATTACK);
            expect(decision.target?.id).toBe('npc-close');
        });
    });

    describe('Integration with Recruitment System', () => {
        test('should consider recruitment information in decision making', async () => {
            const aiUnit = createRealisticUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const recruitableUnit = createRealisticUnit({
                id: 'recruitable-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            const npcUnit = createRealisticUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 4, y: 5 }
            });

            // Convert one unit to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Mock recruitment system to return conditions for recruitable unit
            (recruitmentSystem.getRecruitmentConditions as jest.Mock).mockImplementation((unit) => {
                if (unit.id === 'recruitable-unit') {
                    return [createMockRecruitmentCondition(RecruitmentConditionType.HP_THRESHOLD)];
                }
                return [];
            });

            const allUnits = [aiUnit, recruitableUnit, npcUnit];
            const mapData = createRealisticMapData(8, 8);

            await aiController.makeDecision(aiUnit, allUnits, mapData, 1);

            // Should have queried recruitment system
            expect(recruitmentSystem.getRecruitmentConditions).toHaveBeenCalled();
        });

        test('should prioritize NPCs over recruitable enemies', async () => {
            const aiUnit = createRealisticUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const recruitableUnit = createRealisticUnit({
                id: 'recruitable-unit',
                faction: 'player',
                position: { x: 6, y: 5 } // Same distance as NPC
            });

            const npcUnit = createRealisticUnit({
                id: 'npc-unit',
                faction: 'player',
                position: { x: 4, y: 5 } // Same distance as recruitable
            });

            // Convert one unit to NPC
            npcStateManager.convertToNPC(npcUnit, 'test-recruitment', 1);

            // Mock recruitment system
            (recruitmentSystem.getRecruitmentConditions as jest.Mock).mockImplementation((unit) => {
                if (unit.id === 'recruitable-unit') {
                    return [createMockRecruitmentCondition(RecruitmentConditionType.HP_THRESHOLD)];
                }
                return [];
            });

            const allUnits = [aiUnit, recruitableUnit, npcUnit];
            const mapData = createRealisticMapData(8, 8);

            const decision = await aiController.makeDecision(aiUnit, allUnits, mapData, 1);

            // Should prioritize NPC over recruitable unit
            expect(decision.type).toBe(AIActionType.ATTACK);
            expect(decision.target?.id).toBe(npcUnit.id);
        });
    });

    describe('Error Recovery and Robustness', () => {
        test('should handle NPC state changes during decision making', async () => {
            const aiUnit = createRealisticUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const targetUnit = createRealisticUnit({
                id: 'target-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            // Convert to NPC
            npcStateManager.convertToNPC(targetUnit, 'test-recruitment', 1);

            const allUnits = [aiUnit, targetUnit];
            const mapData = createRealisticMapData(8, 8);

            // Start decision making
            const decisionPromise = aiController.makeDecision(aiUnit, allUnits, mapData, 1);

            // Simulate NPC being defeated during decision making
            setTimeout(() => {
                npcStateManager.removeNPCState(targetUnit);
            }, 10);

            const decision = await decisionPromise;

            // Should still make a valid decision
            expect(decision).toBeDefined();
            expect(decision.type).toBeDefined();
        });

        test('should handle system integration failures gracefully', async () => {
            const aiUnit = createRealisticUnit({
                id: 'ai-unit',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });

            const targetUnit = createRealisticUnit({
                id: 'target-unit',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            // Mock system failures
            (battleSystem.canAttack as jest.Mock).mockImplementation(() => {
                throw new Error('Battle system failure');
            });

            (movementSystem.calculateMovementRange as jest.Mock).mockImplementation(() => {
                throw new Error('Movement system failure');
            });

            const allUnits = [aiUnit, targetUnit];
            const mapData = createRealisticMapData(8, 8);

            const decision = await aiController.makeDecision(aiUnit, allUnits, mapData, 1);

            // Should fallback to safe action
            expect(decision.type).toBe(AIActionType.WAIT);
            expect(decision.reasoning).toContain('Error occurred');
        });
    });
});