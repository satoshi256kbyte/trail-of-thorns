/**
 * BehaviorTree System Unit Tests
 *
 * Tests for:
 * - BehaviorTree core functionality
 * - Node execution and results
 * - Tree structure and navigation
 * - Dynamic tree construction
 * - Error handling and edge cases
 */

import {
    BehaviorTree,
    BehaviorResult,
    AIContext,
    SelectorNode,
    SequenceNode,
    ParallelNode,
    InverterNode,
    RepeaterNode,
} from '../../../../game/src/systems/ai/BehaviorTree';

import {
    HasLowHealthNode,
    HasNPCTargetsNode,
    CanAttackEnemyNode,
    AttackNearestEnemyNode,
    AttackNPCNode,
    MoveToSafetyNode,
    WaitNode,
} from '../../../../game/src/systems/ai/BehaviorNodes';

import { BehaviorTreeBuilder } from '../../../../game/src/systems/ai/BehaviorTreeBuilder';
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

describe('BehaviorTree Core', () => {
    let tree: BehaviorTree;
    let mockContext: AIContext;

    beforeEach(() => {
        tree = new BehaviorTree();
        mockContext = createMockContext();
    });

    afterEach(() => {
        tree.destroy();
    });

    describe('Basic Tree Operations', () => {
        test('should create empty tree', () => {
            expect(tree.getRootNode()).toBeNull();
        });

        test('should set and get root node', () => {
            const rootNode = new WaitNode('root', 'Root Wait');
            tree.setRootNode(rootNode);

            expect(tree.getRootNode()).toBe(rootNode);
        });

        test('should throw error when executing tree without root node', () => {
            expect(() => tree.execute(mockContext)).toThrow('Behavior tree has no root node');
        });

        test('should execute simple wait node', () => {
            const waitNode = new WaitNode('wait', 'Wait Node');
            tree.setRootNode(waitNode);

            const action = tree.execute(mockContext);

            expect(action.type).toBe(AIActionType.WAIT);
            expect(action.reasoning).toBe('Wait and observe');
        });

        test('should reset tree state', () => {
            const rootNode = new WaitNode('root', 'Root Wait');
            tree.setRootNode(rootNode);

            tree.reset();
            // Reset should not throw errors
            expect(tree.getRootNode()).toBe(rootNode);
        });
    });

    describe('Execution History', () => {
        test('should record execution history', () => {
            const waitNode = new WaitNode('wait', 'Wait Node');
            tree.setRootNode(waitNode);

            tree.execute(mockContext);

            const history = tree.getExecutionHistory();
            expect(history).toHaveLength(1);
            expect(history[0].nodeId).toBe('wait');
            expect(history[0].nodeName).toBe('Wait Node');
            expect(history[0].result).toBe(BehaviorResult.SUCCESS);
        });

        test('should limit execution history size', () => {
            const waitNode = new WaitNode('wait', 'Wait Node');
            tree.setRootNode(waitNode);

            // Execute many times
            for (let i = 0; i < 150; i++) {
                tree.execute(mockContext);
            }

            const history = tree.getExecutionHistory();
            expect(history.length).toBeLessThanOrEqual(100);
        });
    });

    describe('Debug Information', () => {
        test('should provide debug info for empty tree', () => {
            const debugInfo = tree.getDebugInfo();
            expect(debugInfo).toHaveProperty('error', 'No root node');
        });

        test('should provide debug info for tree with root', () => {
            const waitNode = new WaitNode('wait', 'Wait Node');
            tree.setRootNode(waitNode);

            const debugInfo = tree.getDebugInfo();
            expect(debugInfo).toHaveProperty('rootNode');
            expect(debugInfo).toHaveProperty('isRunning');
            expect(debugInfo).toHaveProperty('executionHistory');
        });
    });

    describe('Configuration', () => {
        test('should enable/disable logging', () => {
            tree.setLogging(true);
            tree.setLogging(false);
            // Should not throw errors
        });

        test('should set maximum execution time', () => {
            tree.setMaxExecutionTime(5000);
            // Should not throw errors
        });
    });
});

describe('Composite Nodes', () => {
    describe('SelectorNode', () => {
        test('should return SUCCESS when first child succeeds', () => {
            const selector = new SelectorNode('selector', 'Test Selector');
            const waitNode = new WaitNode('wait', 'Wait Node');
            selector.addChild(waitNode);

            const result = selector.execute(createMockContext());
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should try next child when first fails', () => {
            const selector = new SelectorNode('selector', 'Test Selector');
            const lowHealthNode = new HasLowHealthNode('lowhealth', 0.3);
            const waitNode = new WaitNode('wait', 'Wait Node');

            selector.addChild(lowHealthNode);
            selector.addChild(waitNode);

            // Unit has full health, so first child should fail, second should succeed
            const context = createMockContext({
                currentUnit: createMockUnit({ currentHP: 100 }),
            });

            const result = selector.execute(context);
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should return FAILURE when all children fail', () => {
            const selector = new SelectorNode('selector', 'Test Selector');
            const lowHealthNode1 = new HasLowHealthNode('lowhealth1', 0.3);
            const lowHealthNode2 = new HasLowHealthNode('lowhealth2', 0.2);

            selector.addChild(lowHealthNode1);
            selector.addChild(lowHealthNode2);

            // Unit has full health, so both children should fail
            const context = createMockContext({
                currentUnit: createMockUnit({ currentHP: 100 }),
            });

            const result = selector.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });

        test('should manage children correctly', () => {
            const selector = new SelectorNode('selector', 'Test Selector');
            const waitNode = new WaitNode('wait', 'Wait Node');

            selector.addChild(waitNode);
            expect(selector.getChildren()).toHaveLength(1);

            const removed = selector.removeChild('wait');
            expect(removed).toBe(true);
            expect(selector.getChildren()).toHaveLength(0);

            const notRemoved = selector.removeChild('nonexistent');
            expect(notRemoved).toBe(false);
        });
    });

    describe('SequenceNode', () => {
        test('should return SUCCESS when all children succeed', () => {
            const sequence = new SequenceNode('sequence', 'Test Sequence');
            const waitNode1 = new WaitNode('wait1', 'Wait Node 1');
            const waitNode2 = new WaitNode('wait2', 'Wait Node 2');

            sequence.addChild(waitNode1);
            sequence.addChild(waitNode2);

            const result = sequence.execute(createMockContext());
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should return FAILURE when first child fails', () => {
            const sequence = new SequenceNode('sequence', 'Test Sequence');
            const lowHealthNode = new HasLowHealthNode('lowhealth', 0.3);
            const waitNode = new WaitNode('wait', 'Wait Node');

            sequence.addChild(lowHealthNode);
            sequence.addChild(waitNode);

            // Unit has full health, so first child should fail
            const context = createMockContext({
                currentUnit: createMockUnit({ currentHP: 100 }),
            });

            const result = sequence.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });

    describe('ParallelNode', () => {
        test('should return SUCCESS when success threshold is met', () => {
            const parallel = new ParallelNode('parallel', 'Test Parallel', 1, 2);
            const waitNode1 = new WaitNode('wait1', 'Wait Node 1');
            const waitNode2 = new WaitNode('wait2', 'Wait Node 2');

            parallel.addChild(waitNode1);
            parallel.addChild(waitNode2);

            const result = parallel.execute(createMockContext());
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should return FAILURE when failure threshold is met', () => {
            const parallel = new ParallelNode('parallel', 'Test Parallel', 2, 1);
            const lowHealthNode1 = new HasLowHealthNode('lowhealth1', 0.3);
            const lowHealthNode2 = new HasLowHealthNode('lowhealth2', 0.2);

            parallel.addChild(lowHealthNode1);
            parallel.addChild(lowHealthNode2);

            // Unit has full health, so both children should fail
            const context = createMockContext({
                currentUnit: createMockUnit({ currentHP: 100 }),
            });

            const result = parallel.execute(context);
            expect(result).toBe(BehaviorResult.FAILURE);
        });
    });
});

describe('Decorator Nodes', () => {
    describe('InverterNode', () => {
        test('should invert SUCCESS to FAILURE', () => {
            const waitNode = new WaitNode('wait', 'Wait Node');
            const inverter = new InverterNode('inverter', waitNode);

            const result = inverter.execute(createMockContext());
            expect(result).toBe(BehaviorResult.FAILURE);
        });

        test('should invert FAILURE to SUCCESS', () => {
            const lowHealthNode = new HasLowHealthNode('lowhealth', 0.3);
            const inverter = new InverterNode('inverter', lowHealthNode);

            // Unit has full health, so child should fail, inverter should succeed
            const context = createMockContext({
                currentUnit: createMockUnit({ currentHP: 100 }),
            });

            const result = inverter.execute(context);
            expect(result).toBe(BehaviorResult.SUCCESS);
        });

        test('should not invert RUNNING', () => {
            // Create a mock node that returns RUNNING
            const runningNode = {
                id: 'running',
                name: 'Running Node',
                execute: () => BehaviorResult.RUNNING,
            };

            const inverter = new InverterNode('inverter', runningNode);
            const result = inverter.execute(createMockContext());
            expect(result).toBe(BehaviorResult.RUNNING);
        });
    });

    describe('RepeaterNode', () => {
        test('should repeat child execution', () => {
            let executionCount = 0;
            const countingNode = {
                id: 'counting',
                name: 'Counting Node',
                execute: () => {
                    executionCount++;
                    return BehaviorResult.SUCCESS;
                },
            };

            const repeater = new RepeaterNode('repeater', countingNode, 3);
            const result = repeater.execute(createMockContext());

            expect(result).toBe(BehaviorResult.SUCCESS);
            expect(executionCount).toBe(3);
        });

        test('should stop on child failure', () => {
            let executionCount = 0;
            const failingNode = {
                id: 'failing',
                name: 'Failing Node',
                execute: () => {
                    executionCount++;
                    return BehaviorResult.FAILURE;
                },
            };

            const repeater = new RepeaterNode('repeater', failingNode, 5);
            const result = repeater.execute(createMockContext());

            expect(result).toBe(BehaviorResult.FAILURE);
            expect(executionCount).toBe(1);
        });
    });
});

describe('BehaviorTreeBuilder', () => {
    let builder: BehaviorTreeBuilder;

    beforeEach(() => {
        builder = new BehaviorTreeBuilder();
    });

    describe('Node Creation', () => {
        test('should create selector node', () => {
            const selector = builder.selector('Test Selector');
            expect(selector).toBeInstanceOf(SelectorNode);
            expect(selector.name).toBe('Test Selector');
        });

        test('should create sequence node', () => {
            const sequence = builder.sequence('Test Sequence');
            expect(sequence).toBeInstanceOf(SequenceNode);
            expect(sequence.name).toBe('Test Sequence');
        });

        test('should create condition nodes', () => {
            const lowHealth = builder.hasLowHealth(0.5);
            expect(lowHealth).toBeInstanceOf(HasLowHealthNode);

            const npcTargets = builder.hasNPCTargets();
            expect(npcTargets).toBeInstanceOf(HasNPCTargetsNode);

            const canAttack = builder.canAttackEnemy();
            expect(canAttack).toBeInstanceOf(CanAttackEnemyNode);
        });

        test('should create action nodes', () => {
            const attack = builder.attackNearestEnemy();
            expect(attack).toBeInstanceOf(AttackNearestEnemyNode);

            const attackNPC = builder.attackNPC();
            expect(attackNPC).toBeInstanceOf(AttackNPCNode);

            const moveToSafety = builder.moveToSafety();
            expect(moveToSafety).toBeInstanceOf(MoveToSafetyNode);

            const wait = builder.wait();
            expect(wait).toBeInstanceOf(WaitNode);
        });
    });

    describe('Pre-built Trees', () => {
        test('should create aggressive tree', () => {
            const tree = builder.createAggressiveTree();
            expect(tree).toBeInstanceOf(BehaviorTree);
            expect(tree.getRootNode()).not.toBeNull();
        });

        test('should create defensive tree', () => {
            const tree = builder.createDefensiveTree();
            expect(tree).toBeInstanceOf(BehaviorTree);
            expect(tree.getRootNode()).not.toBeNull();
        });

        test('should create support tree', () => {
            const tree = builder.createSupportTree();
            expect(tree).toBeInstanceOf(BehaviorTree);
            expect(tree.getRootNode()).not.toBeNull();
        });

        test('should create NPC hunter tree', () => {
            const tree = builder.createNPCHunterTree();
            expect(tree).toBeInstanceOf(BehaviorTree);
            expect(tree.getRootNode()).not.toBeNull();
        });

        test('should create tactical tree', () => {
            const tree = builder.createTacticalTree();
            expect(tree).toBeInstanceOf(BehaviorTree);
            expect(tree.getRootNode()).not.toBeNull();
        });

        test('should create balanced tree', () => {
            const tree = builder.createBalancedTree();
            expect(tree).toBeInstanceOf(BehaviorTree);
            expect(tree.getRootNode()).not.toBeNull();
        });
    });

    describe('Tree Validation', () => {
        test('should validate valid tree', () => {
            const tree = builder.createAggressiveTree();
            const validation = builder.validateTree(tree);

            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should detect tree without root', () => {
            const emptyTree = new BehaviorTree();
            const validation = builder.validateTree(emptyTree);

            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('Tree has no root node');
        });

        test('should warn about empty composite nodes', () => {
            const emptySelector = builder.selector('Empty Selector');
            const tree = new BehaviorTree(emptySelector);
            const validation = builder.validateTree(tree);

            expect(validation.warnings.length).toBeGreaterThan(0);
            expect(validation.warnings[0]).toContain('has no children');
        });
    });
});

describe('Integration Tests', () => {
    let builder: BehaviorTreeBuilder;

    beforeEach(() => {
        builder = new BehaviorTreeBuilder();
    });

    test('should execute aggressive tree with NPC present', () => {
        const tree = builder.createAggressiveTree();
        const npc = createMockUnit({
            id: 'npc-1',
            name: 'Test NPC',
            faction: 'enemy',
            position: { x: 6, y: 5 },
        });

        const context = createMockContext({
            currentUnit: createMockUnit({ faction: 'enemy' }),
            npcs: [npc],
            visibleEnemies: [npc],
        });

        const action = tree.execute(context);

        expect(action.type).toBe(AIActionType.ATTACK);
        expect(action.target).toBe(npc);
        expect(action.reasoning).toContain('NPC');
    });

    test('should execute defensive tree with low health', () => {
        const tree = builder.createDefensiveTree();
        const lowHealthUnit = createMockUnit({
            currentHP: 20, // 20% health
            faction: 'enemy',
        });

        const context = createMockContext({
            currentUnit: lowHealthUnit,
            mapData: { width: 10, height: 10, tiles: [] },
        });

        const action = tree.execute(context);

        // Should either move to safety or guard
        expect([AIActionType.MOVE, AIActionType.GUARD]).toContain(action.type);
    });

    test('should execute support tree with injured ally', () => {
        const tree = builder.createSupportTree();
        const injuredAlly = createMockUnit({
            id: 'injured-ally',
            name: 'Injured Ally',
            currentHP: 30, // 30% health
            faction: 'enemy',
        });

        const context = createMockContext({
            currentUnit: createMockUnit({ faction: 'enemy' }),
            visibleAllies: [injuredAlly],
            availableSkills: ['heal'],
        });

        const action = tree.execute(context);

        expect(action.type).toBe(AIActionType.SKILL);
        expect(action.skillId).toBe('heal');
        expect(action.target).toBe(injuredAlly);
    });

    test('should handle error gracefully', () => {
        // Create a tree with a node that throws an error
        const errorNode = {
            id: 'error',
            name: 'Error Node',
            execute: () => {
                throw new Error('Test error');
            },
        };

        const tree = new BehaviorTree(errorNode);
        const action = tree.execute(createMockContext());

        expect(action.type).toBe(AIActionType.WAIT);
        expect(action.reasoning).toContain('error');
    });
});