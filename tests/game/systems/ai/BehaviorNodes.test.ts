/**
 * BehaviorNodes Unit Tests
 *
 * Tests for:
 * - Condition nodes (health checks, target detection, etc.)
 * - Action nodes (attack, move, wait, etc.)
 * - Node state management and execution
 * - Edge cases and error handling
 */

import {
    BehaviorResult,
    AIContext,
} from '../../../../game/src/systems/ai/BehaviorTree';

import {
    HasLowHealthNode,
    HasNPCTargetsNode,
    CanAttackEnemyNode,
    HasMovedNode,
    HasActedNode,
    AlliesNeedHealingNode,
    HasUsableSkillsNode,
    AttackNearestEnemyNode,
    AttackNPCNode,
    MoveToSafetyNode,
    MoveToTargetNode,
    UseSkillNode,
    WaitNode,
    HealAllyNode,
    GuardNode,
} from '../../../../game/src/systems/ai/BehaviorNodes';

import { Unit, Position } from '../../../../game/src/types/gameplay';
import { AIActionType } from '../../../../game/src/systems/AIController';

// Mock unit factory
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit',
    name: 'Test Unit',
    position: { x: 5, y: 5 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3,
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'player',
    hasActed: false,
    hasMoved: false,
    weapon: { range: 1 },
    ...overrides,
});

// Mock AI context factory
const createMockContext = (overrides: Partial<AIContext> = {}): AIContext => ({
    currentUnit: createMockUnit(),
    allUnits: [],
    currentTurn: 1,
    gamePhase: 'battle',
    visibleEnemies: [],
    visibleAllies: [],
    npcs: [],
    availableSkills: [],
    tempData: new Map(),
    ...overrides,
});

describe('Condition Nodes', () => {
    describe('HasLowHealthNode', () => {
        test('should return SUCCESS when unit has low health', () => {
            const node = new HasLowHealthNode('lowhealth', 0.5);
            const context = createMockContext({
                currentUnit: createMockUnit({ currentHP: 40 }), // 40% health
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should return FAILURE when unit has high health', () => {
            const node = new HasLowHealthNode('lowhealth', 0.3);
            const context = createMockContext({
                currentUnit: createMockUnit({ currentHP: 80 }), // 80% health
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });

        test('should use custom threshold', () => {
            const node = new HasLowHealthNode('lowhealth', 0.8);
            const context = createMockContext({
                currentUnit: createMockUnit({ currentHP: 70 }), // 70% health
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should provide debug info', () => {
            const node = new HasLowHealthNode('lowhealth', 0.4);
            const debugInfo = node.getDebugInfo();

            expect(debugInfo.id).toBe('lowhealth');
            expect(debugInfo.healthThreshold).toBe(0.4);
        });
    });

    describe('HasNPCTargetsNode', () => {
        test('should return SUCCESS when NPCs are present', () => {
            const node = new HasNPCTargetsNode('hasnpcs');
            const npc = createMockUnit({ id: 'npc-1', name: 'Test NPC' });
            const context = createMockContext({
                npcs: [npc],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should return FAILURE when no NPCs are present', () => {
            const node = new HasNPCTargetsNode('hasnpcs');
            const context = createMockContext({
                npcs: [],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('CanAttackEnemyNode', () => {
        test('should return SUCCESS when enemy is in range', () => {
            const node = new CanAttackEnemyNode('canattack');
            const enemy = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
                position: { x: 6, y: 5 }, // 1 tile away
            });

            const context = createMockContext({
                currentUnit: createMockUnit({ faction: 'player' }),
                visibleEnemies: [enemy],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should return FAILURE when no enemies in range', () => {
            const node = new CanAttackEnemyNode('canattack');
            const enemy = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
                position: { x: 10, y: 10 }, // Far away
            });

            const context = createMockContext({
                currentUnit: createMockUnit({ faction: 'player' }),
                visibleEnemies: [enemy],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });

        test('should return FAILURE when enemy is dead', () => {
            const node = new CanAttackEnemyNode('canattack');
            const deadEnemy = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
                position: { x: 6, y: 5 },
                currentHP: 0,
            });

            const context = createMockContext({
                currentUnit: createMockUnit({ faction: 'player' }),
                visibleEnemies: [deadEnemy],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('HasMovedNode', () => {
        test('should return SUCCESS when unit has moved', () => {
            const node = new HasMovedNode('hasmoved');
            const context = createMockContext({
                currentUnit: createMockUnit({ hasMoved: true }),
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should return FAILURE when unit has not moved', () => {
            const node = new HasMovedNode('hasmoved');
            const context = createMockContext({
                currentUnit: createMockUnit({ hasMoved: false }),
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('HasActedNode', () => {
        test('should return SUCCESS when unit has acted', () => {
            const node = new HasActedNode('hasacted');
            const context = createMockContext({
                currentUnit: createMockUnit({ hasActed: true }),
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should return FAILURE when unit has not acted', () => {
            const node = new HasActedNode('hasacted');
            const context = createMockContext({
                currentUnit: createMockUnit({ hasActed: false }),
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('AlliesNeedHealingNode', () => {
        test('should return SUCCESS when allies need healing', () => {
            const node = new AlliesNeedHealingNode('alliesneedhealing', 0.6);
            const injuredAlly = createMockUnit({
                id: 'ally-1',
                currentHP: 40, // 40% health
            });

            const context = createMockContext({
                currentUnit: createMockUnit({ id: 'current' }),
                visibleAllies: [injuredAlly],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should return FAILURE when no allies need healing', () => {
            const node = new AlliesNeedHealingNode('alliesneedhealing', 0.5);
            const healthyAlly = createMockUnit({
                id: 'ally-1',
                currentHP: 80, // 80% health
            });

            const context = createMockContext({
                currentUnit: createMockUnit({ id: 'current' }),
                visibleAllies: [healthyAlly],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });

        test('should ignore self when checking allies', () => {
            const node = new AlliesNeedHealingNode('alliesneedhealing', 0.5);
            const currentUnit = createMockUnit({
                id: 'current',
                currentHP: 30, // 30% health
            });

            const context = createMockContext({
                currentUnit: currentUnit,
                visibleAllies: [currentUnit], // Only self in allies list
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('HasUsableSkillsNode', () => {
        test('should return SUCCESS when skills are available', () => {
            const node = new HasUsableSkillsNode('hasskills');
            const context = createMockContext({
                availableSkills: ['heal', 'fireball'],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should return FAILURE when no skills available', () => {
            const node = new HasUsableSkillsNode('hasskills');
            const context = createMockContext({
                availableSkills: [],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });
});

describe('Action Nodes', () => {
    describe('AttackNearestEnemyNode', () => {
        test('should attack nearest enemy', () => {
            const node = new AttackNearestEnemyNode('attacknearest');
            const nearEnemy = createMockUnit({
                id: 'near-enemy',
                name: 'Near Enemy',
                faction: 'enemy',
                position: { x: 6, y: 5 }, // 1 tile away
            });
            const farEnemy = createMockUnit({
                id: 'far-enemy',
                name: 'Far Enemy',
                faction: 'enemy',
                position: { x: 8, y: 5 }, // 3 tiles away
            });

            const context = createMockContext({
                currentUnit: createMockUnit({ faction: 'player' }),
                visibleEnemies: [farEnemy, nearEnemy],
            });

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction).toBeDefined();
            expect(context.selectedAction!.type).toBe(AIActionType.ATTACK);
            expect(context.selectedAction!.target).toBe(nearEnemy);
        });

        test('should return FAILURE when no enemies in range', () => {
            const node = new AttackNearestEnemyNode('attacknearest');
            const farEnemy = createMockUnit({
                id: 'far-enemy',
                faction: 'enemy',
                position: { x: 10, y: 10 }, // Far away
            });

            const context = createMockContext({
                currentUnit: createMockUnit({ faction: 'player' }),
                visibleEnemies: [farEnemy],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });

        test('should return FAILURE when no enemies present', () => {
            const node = new AttackNearestEnemyNode('attacknearest');
            const context = createMockContext({
                visibleEnemies: [],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('AttackNPCNode', () => {
        test('should attack NPC with high priority', () => {
            const node = new AttackNPCNode('attacknpc');
            const npc = createMockUnit({
                id: 'npc-1',
                name: 'Test NPC',
                faction: 'enemy',
                position: { x: 6, y: 5 }, // 1 tile away
            });

            const context = createMockContext({
                currentUnit: createMockUnit({ faction: 'player' }),
                npcs: [npc],
            });

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction).toBeDefined();
            expect(context.selectedAction!.type).toBe(AIActionType.ATTACK);
            expect(context.selectedAction!.target).toBe(npc);
            expect(context.selectedAction!.priority).toBe(100);
            expect(context.selectedAction!.reasoning).toContain('NPC');
        });

        test('should return FAILURE when no NPCs in range', () => {
            const node = new AttackNPCNode('attacknpc');
            const farNPC = createMockUnit({
                id: 'npc-1',
                position: { x: 10, y: 10 }, // Far away
            });

            const context = createMockContext({
                npcs: [farNPC],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('MoveToSafetyNode', () => {
        test('should move away from enemies', () => {
            const node = new MoveToSafetyNode('movetosafety');
            const enemy = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
                position: { x: 6, y: 5 }, // East of current unit
            });

            const context = createMockContext({
                currentUnit: createMockUnit({
                    faction: 'player',
                    hasMoved: false,
                }),
                visibleEnemies: [enemy],
                mapData: { width: 10, height: 10, tiles: [] },
            });

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction).toBeDefined();
            expect(context.selectedAction!.type).toBe(AIActionType.MOVE);
            expect(context.selectedAction!.position).toBeDefined();

            // Should move away from enemy (west of current position)
            const movePos = context.selectedAction!.position!;
            expect(movePos.x).toBeLessThan(5); // Moving west
        });

        test('should return FAILURE when already moved', () => {
            const node = new MoveToSafetyNode('movetosafety');
            const context = createMockContext({
                currentUnit: createMockUnit({ hasMoved: true }),
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });

        test('should return FAILURE when no map data', () => {
            const node = new MoveToSafetyNode('movetosafety');
            const context = createMockContext({
                currentUnit: createMockUnit({ hasMoved: false }),
                mapData: undefined,
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });

        test('should return FAILURE when no enemies present', () => {
            const node = new MoveToSafetyNode('movetosafety');
            const context = createMockContext({
                currentUnit: createMockUnit({ hasMoved: false }),
                visibleEnemies: [],
                mapData: { width: 10, height: 10, tiles: [] },
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('MoveToTargetNode', () => {
        test('should move closer to enemy', () => {
            const node = new MoveToTargetNode('movetoEnemy', 'enemy');
            const enemy = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
                position: { x: 8, y: 5 }, // East of current unit
            });

            const context = createMockContext({
                currentUnit: createMockUnit({
                    faction: 'player',
                    hasMoved: false,
                }),
                visibleEnemies: [enemy],
                mapData: { width: 10, height: 10, tiles: [] },
            });

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction).toBeDefined();
            expect(context.selectedAction!.type).toBe(AIActionType.MOVE);

            // Should move closer to enemy (east)
            const movePos = context.selectedAction!.position!;
            expect(movePos.x).toBeGreaterThan(5); // Moving east
        });

        test('should move closer to NPC', () => {
            const node = new MoveToTargetNode('movetonpc', 'npc');
            const npc = createMockUnit({
                id: 'npc-1',
                position: { x: 3, y: 5 }, // West of current unit
            });

            const context = createMockContext({
                currentUnit: createMockUnit({ hasMoved: false }),
                npcs: [npc],
                mapData: { width: 10, height: 10, tiles: [] },
            });

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction).toBeDefined();

            // Should move closer to NPC (west)
            const movePos = context.selectedAction!.position!;
            expect(movePos.x).toBeLessThan(5); // Moving west
        });

        test('should return FAILURE when no targets', () => {
            const node = new MoveToTargetNode('movetoEnemy', 'enemy');
            const context = createMockContext({
                currentUnit: createMockUnit({ hasMoved: false }),
                visibleEnemies: [],
                mapData: { width: 10, height: 10, tiles: [] },
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('UseSkillNode', () => {
        test('should use available skill', () => {
            const node = new UseSkillNode('useskill');
            const enemy = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
            });

            const context = createMockContext({
                availableSkills: ['fireball', 'heal'],
                visibleEnemies: [enemy],
            });

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction).toBeDefined();
            expect(context.selectedAction!.type).toBe(AIActionType.SKILL);
            expect(context.selectedAction!.skillId).toBe('fireball');
        });

        test('should use healing skill on ally', () => {
            const node = new UseSkillNode('useheal');
            const ally = createMockUnit({
                id: 'ally-1',
                currentHP: 50,
            });

            const context = createMockContext({
                availableSkills: ['heal'],
                visibleAllies: [ally],
            });

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction!.skillId).toBe('heal');
            expect(context.selectedAction!.target).toBe(ally);
        });

        test('should filter skills by type', () => {
            const node = new UseSkillNode('useheal', 'heal');
            const context = createMockContext({
                availableSkills: ['fireball', 'heal', 'lightning'],
            });

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction!.skillId).toBe('heal');
        });

        test('should return FAILURE when no skills available', () => {
            const node = new UseSkillNode('useskill');
            const context = createMockContext({
                availableSkills: [],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });

        test('should return FAILURE when no matching skill type', () => {
            const node = new UseSkillNode('useheal', 'heal');
            const context = createMockContext({
                availableSkills: ['fireball', 'lightning'],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('WaitNode', () => {
        test('should always succeed with wait action', () => {
            const node = new WaitNode('wait');
            const context = createMockContext();

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction).toBeDefined();
            expect(context.selectedAction!.type).toBe(AIActionType.WAIT);
            expect(context.selectedAction!.priority).toBe(5);
        });
    });

    describe('HealAllyNode', () => {
        test('should heal most injured ally', () => {
            const node = new HealAllyNode('healally', 0.6);
            const slightlyInjured = createMockUnit({
                id: 'ally-1',
                name: 'Slightly Injured',
                currentHP: 50, // 50% health
            });
            const severelyInjured = createMockUnit({
                id: 'ally-2',
                name: 'Severely Injured',
                currentHP: 20, // 20% health
            });

            const context = createMockContext({
                currentUnit: createMockUnit({ id: 'current' }),
                visibleAllies: [slightlyInjured, severelyInjured],
                availableSkills: ['heal'],
            });

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction!.type).toBe(AIActionType.SKILL);
            expect(context.selectedAction!.target).toBe(severelyInjured);
        });

        test('should return FAILURE when no healing skills', () => {
            const node = new HealAllyNode('healally');
            const injuredAlly = createMockUnit({
                currentHP: 30,
            });

            const context = createMockContext({
                visibleAllies: [injuredAlly],
                availableSkills: ['fireball'],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });

        test('should return FAILURE when no injured allies', () => {
            const node = new HealAllyNode('healally', 0.5);
            const healthyAlly = createMockUnit({
                currentHP: 80,
            });

            const context = createMockContext({
                visibleAllies: [healthyAlly],
                availableSkills: ['heal'],
            });

            const result = node.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('GuardNode', () => {
        test('should always succeed with guard action', () => {
            const node = new GuardNode('guard');
            const context = createMockContext();

            const result = node.execute(context);

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(context.selectedAction).toBeDefined();
            expect(context.selectedAction!.type).toBe(AIActionType.GUARD);
            expect(context.selectedAction!.priority).toBe(15);
        });
    });
});

describe('Node Base Classes', () => {
    test('should provide debug info for leaf nodes', () => {
        const node = new WaitNode('wait', 'Test Wait');
        const debugInfo = node.getDebugInfo();

        expect(debugInfo.id).toBe('wait');
        expect(debugInfo.name).toBe('Test Wait');
        expect(debugInfo.type).toBe('WaitNode');
    });

    test('should reset node state', () => {
        const node = new WaitNode('wait');

        // Reset should not throw errors
        node.reset();
        expect(node.id).toBe('wait');
    });
});