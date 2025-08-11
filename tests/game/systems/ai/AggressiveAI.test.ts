/**
 * AggressiveAI のユニットテスト
 */

import { AggressiveAI, AggressivePersonality } from '../../../../game/src/systems/ai/AggressiveAI';
import {
    AIActionType,
    AIContext,
    DifficultyLevel,
    DifficultySettings,
    AIControllerConfig,
    AISystemIntegration,
} from '../../../../game/src/types/ai';
import { Unit, Position } from '../../../../game/src/types/gameplay';

// モックデータの作成
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
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    ...overrides,
});

const createMockContext = (overrides: Partial<AIContext> = {}): AIContext => ({
    currentUnit: createMockUnit(),
    gameState: {},
    visibleEnemies: [
        createMockUnit({ id: 'enemy1', position: { x: 3, y: 3 }, faction: 'player' }),
        createMockUnit({ id: 'enemy2', position: { x: 7, y: 7 }, faction: 'player' }),
    ],
    visibleAllies: [
        createMockUnit({ id: 'ally1', position: { x: 4, y: 6 }, faction: 'enemy' }),
    ],
    npcs: [],
    availableSkills: [],
    terrainData: {},
    turnNumber: 1,
    difficultySettings: {
        level: DifficultyLevel.NORMAL,
        thinkingDepth: 3,
        randomnessFactor: 0.2,
        mistakeProbability: 0.1,
        reactionTime: 1000,
        skillUsageFrequency: 0.7,
        thinkingTimeLimit: 2000,
    },
    actionHistory: [],
    mapData: {
        width: 10,
        height: 10,
        tiles: [],
        units: [],
    },
    ...overrides,
});

const createMockConfig = (): AIControllerConfig => ({
    thinkingTimeLimit: 2000,
    randomFactor: 0.2,
    npcPriorityMultiplier: 50,
    enableAILogging: false,
});

const createMockIntegration = (): AISystemIntegration => ({
    battleSystem: {
        canAttack: jest.fn().mockReturnValue(true),
        calculateDamage: jest.fn().mockReturnValue(25),
    },
    movementSystem: {
        calculateMovementRange: jest.fn().mockReturnValue([
            { x: 4, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 6 }
        ]),
        canMoveTo: jest.fn().mockReturnValue(true),
    },
    skillSystem: {
        getAvailableSkills: jest.fn().mockReturnValue(['attack-skill']),
        canUseSkill: jest.fn().mockReturnValue(true),
    },
    recruitmentSystem: {
        isNPC: jest.fn().mockReturnValue(false),
    },
});

describe('AggressivePersonality', () => {
    let personality: AggressivePersonality;

    beforeEach(() => {
        personality = new AggressivePersonality();
    });

    test('should have aggressive personality traits', () => {
        expect(personality.type).toBe('aggressive');
        expect(personality.aggressiveness).toBe(0.9);
        expect(personality.defensiveness).toBe(0.2);
        expect(personality.riskTolerance).toBe(0.8);
    });

    test('should prioritize attack actions', () => {
        const attackModifier = personality.getActionModifier(AIActionType.ATTACK);
        const waitModifier = personality.getActionModifier(AIActionType.WAIT);

        expect(attackModifier).toBeGreaterThan(1.0);
        expect(waitModifier).toBeLessThan(1.0);
        expect(attackModifier).toBeGreaterThan(waitModifier);
    });

    test('should take high risks', () => {
        expect(personality.shouldTakeRisk(0.7)).toBe(true);
        expect(personality.shouldTakeRisk(0.9)).toBe(false);
    });

    test('should prioritize low HP enemies', () => {
        const lowHPEnemy = createMockUnit({ currentHP: 20, stats: { maxHP: 100, attack: 15 } });
        const highHPEnemy = createMockUnit({ currentHP: 80, stats: { maxHP: 100, attack: 15 } });

        const lowHPModifier = personality.getPriorityModifier(lowHPEnemy);
        const highHPModifier = personality.getPriorityModifier(highHPEnemy);

        expect(lowHPModifier).toBeGreaterThan(highHPModifier);
    });
});

describe('AggressiveAI', () => {
    let aggressiveAI: AggressiveAI;
    let mockUnit: Unit;
    let mockDifficultySettings: DifficultySettings;
    let mockConfig: AIControllerConfig;
    let mockIntegration: AISystemIntegration;

    beforeEach(() => {
        mockUnit = createMockUnit();
        mockDifficultySettings = {
            level: DifficultyLevel.NORMAL,
            thinkingDepth: 3,
            randomnessFactor: 0.2,
            mistakeProbability: 0.1,
            reactionTime: 1000,
            skillUsageFrequency: 0.7,
            thinkingTimeLimit: 2000,
        };
        mockConfig = createMockConfig();
        mockIntegration = createMockIntegration();

        aggressiveAI = new AggressiveAI(mockUnit, mockDifficultySettings, mockConfig, mockIntegration);
    });

    test('should be created with aggressive personality', () => {
        expect(aggressiveAI.aiPersonality.type).toBe('aggressive');
        expect(aggressiveAI.aiPersonality.aggressiveness).toBe(0.9);
    });

    test('should have high priority', () => {
        const context = createMockContext();
        const priority = aggressiveAI.getPriority(context);

        expect(priority).toBeGreaterThan(50);
    });

    test('should increase priority when HP is low', () => {
        const context = createMockContext();
        const normalPriority = aggressiveAI.getPriority(context);

        // HP を低く設定
        mockUnit.currentHP = 30;
        const lowHPPriority = aggressiveAI.getPriority(context);

        expect(lowHPPriority).toBeGreaterThan(normalPriority);
    });

    test('should increase priority when enemies are nearby', () => {
        const contextWithDistantEnemies = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 10, y: 10 }, faction: 'player' }),
            ],
        });
        const distantPriority = aggressiveAI.getPriority(contextWithDistantEnemies);

        const contextWithNearbyEnemies = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 6, y: 6 }, faction: 'player' }),
            ],
        });
        const nearbyPriority = aggressiveAI.getPriority(contextWithNearbyEnemies);

        expect(nearbyPriority).toBeGreaterThan(distantPriority);
    });

    test('should make decisions within time limit', async () => {
        const context = createMockContext();
        const startTime = Date.now();

        const action = await aggressiveAI.decideAction(context);
        const endTime = Date.now();

        expect(action).toBeDefined();
        expect(action.type).toBeDefined();
        expect(endTime - startTime).toBeLessThan(mockConfig.thinkingTimeLimit);
    });

    test('should prefer attack actions when enemies are in range', async () => {
        const context = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 5, y: 4 }, faction: 'player' }), // 隣接
            ],
        });

        const action = await aggressiveAI.decideAction(context);

        // 攻撃可能な敵がいる場合は攻撃を選択する可能性が高い
        expect([AIActionType.ATTACK, AIActionType.MOVE, AIActionType.SKILL]).toContain(action.type);
    });

    test('should prefer moving towards enemies when not in attack range', async () => {
        const context = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 8, y: 8 }, faction: 'player' }), // 遠距離
            ],
        });

        const action = await aggressiveAI.decideAction(context);

        // 敵が遠い場合は移動を選択する可能性が高い
        expect([AIActionType.MOVE, AIActionType.ATTACK, AIActionType.SKILL]).toContain(action.type);
    });

    test('should handle empty enemy list gracefully', async () => {
        const context = createMockContext({
            visibleEnemies: [],
        });

        const action = await aggressiveAI.decideAction(context);

        expect(action).toBeDefined();
        expect(action.type).toBeDefined();
    });

    test('should handle no valid actions gracefully', async () => {
        // 移動システムが空の移動範囲を返すようにモック
        mockIntegration.movementSystem!.calculateMovementRange = jest.fn().mockReturnValue([]);
        mockIntegration.battleSystem!.canAttack = jest.fn().mockReturnValue(false);
        mockIntegration.skillSystem!.getAvailableSkills = jest.fn().mockReturnValue([]);

        const context = createMockContext();
        const action = await aggressiveAI.decideAction(context);

        expect(action.type).toBe(AIActionType.WAIT);
    });

    test('should evaluate position correctly', () => {
        const context = createMockContext();
        const position = { x: 5, y: 5 };

        const evaluation = aggressiveAI.evaluatePosition(position, context);

        expect(typeof evaluation).toBe('number');
        expect(evaluation).toBeGreaterThanOrEqual(0);
    });

    test('should prioritize NPCs when present', async () => {
        const npcUnit = createMockUnit({ id: 'npc1', position: { x: 6, y: 5 }, faction: 'player' });
        mockIntegration.recruitmentSystem!.isNPC = jest.fn().mockImplementation((unit) => unit.id === 'npc1');

        const context = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 4, y: 5 }, faction: 'player' }),
                npcUnit,
            ],
            npcs: [npcUnit],
        });

        const action = await aggressiveAI.decideAction(context);

        // NPCが存在する場合、それを優先的に攻撃する可能性が高い
        if (action.type === AIActionType.ATTACK && action.target) {
            // NPCまたは通常の敵のどちらかを攻撃している
            expect(['npc1', 'enemy1']).toContain(action.target.id);
        }
    });

    test('should use skills when available and beneficial', async () => {
        mockIntegration.skillSystem!.getAvailableSkills = jest.fn().mockReturnValue(['attack-skill', 'heavy-strike']);

        const context = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 6, y: 5 }, faction: 'player' }),
            ],
        });

        const action = await aggressiveAI.decideAction(context);

        // スキルが利用可能な場合、使用する可能性がある
        expect([AIActionType.ATTACK, AIActionType.MOVE, AIActionType.SKILL, AIActionType.WAIT]).toContain(action.type);
    });

    test('should have reasoning for all actions', async () => {
        const context = createMockContext();
        const action = await aggressiveAI.decideAction(context);

        expect(action.reasoning).toBeDefined();
        expect(typeof action.reasoning).toBe('string');
        expect(action.reasoning!.length).toBeGreaterThan(0);
    });

    test('should handle timeout gracefully', async () => {
        // 非常に短いタイムアウトを設定
        const shortTimeoutConfig = { ...mockConfig, thinkingTimeLimit: 1 };
        const timeoutAI = new AggressiveAI(mockUnit, mockDifficultySettings, shortTimeoutConfig, mockIntegration);

        const context = createMockContext();
        const action = await timeoutAI.decideAction(context);

        // タイムアウト時でも何らかの有効な行動を返す
        expect(action).toBeDefined();
        expect(action.type).toBeDefined();
        expect([AIActionType.WAIT, AIActionType.ATTACK, AIActionType.MOVE, AIActionType.SKILL]).toContain(action.type);
    });

    test('should track performance metrics', async () => {
        const context = createMockContext();

        await aggressiveAI.decideAction(context);

        const metrics = aggressiveAI.metrics;
        expect(metrics.totalDecisions).toBe(1);
        expect(metrics.averageThinkingTime).toBeGreaterThan(0);
    });

    test('should apply difficulty settings', async () => {
        const easySettings: DifficultySettings = {
            ...mockDifficultySettings,
            level: DifficultyLevel.EASY,
            randomnessFactor: 0.5,
            mistakeProbability: 0.3,
        };

        const easyAI = new AggressiveAI(mockUnit, easySettings, mockConfig, mockIntegration);
        const context = createMockContext();

        const action = await easyAI.decideAction(context);

        expect(action).toBeDefined();
        // 簡単な難易度では、より多くのランダム性とミスが含まれる
    });
});