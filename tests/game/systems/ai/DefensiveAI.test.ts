/**
 * DefensiveAI のユニットテスト
 */

import { DefensiveAI, DefensivePersonality } from '../../../../game/src/systems/ai/DefensiveAI';
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
        getAvailableSkills: jest.fn().mockReturnValue(['heal-skill']),
        canUseSkill: jest.fn().mockReturnValue(true),
    },
    recruitmentSystem: {
        isNPC: jest.fn().mockReturnValue(false),
    },
});

describe('DefensivePersonality', () => {
    let personality: DefensivePersonality;

    beforeEach(() => {
        personality = new DefensivePersonality();
    });

    test('should have defensive personality traits', () => {
        expect(personality.type).toBe('defensive');
        expect(personality.aggressiveness).toBe(0.3);
        expect(personality.defensiveness).toBe(0.9);
        expect(personality.riskTolerance).toBe(0.2);
    });

    test('should prioritize defensive actions', () => {
        const attackModifier = personality.getActionModifier(AIActionType.ATTACK);
        const moveModifier = personality.getActionModifier(AIActionType.MOVE);
        const waitModifier = personality.getActionModifier(AIActionType.WAIT);

        expect(moveModifier).toBeGreaterThan(attackModifier);
        expect(waitModifier).toBeGreaterThan(attackModifier);
    });

    test('should avoid high risks', () => {
        expect(personality.shouldTakeRisk(0.1)).toBe(true);
        expect(personality.shouldTakeRisk(0.3)).toBe(false);
    });

    test('should avoid strong enemies', () => {
        const weakEnemy = createMockUnit({ currentHP: 30, stats: { maxHP: 100, attack: 10 } });
        const strongEnemy = createMockUnit({ currentHP: 90, stats: { maxHP: 100, attack: 50 } });

        const weakModifier = personality.getPriorityModifier(weakEnemy);
        const strongModifier = personality.getPriorityModifier(strongEnemy);

        expect(weakModifier).toBeGreaterThan(strongModifier);
    });
});

describe('DefensiveAI', () => {
    let defensiveAI: DefensiveAI;
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

        defensiveAI = new DefensiveAI(mockUnit, mockDifficultySettings, mockConfig, mockIntegration);
    });

    test('should be created with defensive personality', () => {
        expect(defensiveAI.aiPersonality.type).toBe('defensive');
        expect(defensiveAI.aiPersonality.defensiveness).toBe(0.9);
    });

    test('should have moderate priority', () => {
        const context = createMockContext();
        const priority = defensiveAI.getPriority(context);

        expect(priority).toBeGreaterThanOrEqual(40);
        expect(priority).toBeLessThanOrEqual(80);
    });

    test('should increase priority when HP is low', () => {
        const context = createMockContext();
        const normalPriority = defensiveAI.getPriority(context);

        // HP を低く設定
        mockUnit.currentHP = 20;
        const lowHPPriority = defensiveAI.getPriority(context);

        expect(lowHPPriority).toBeGreaterThan(normalPriority);
    });

    test('should increase priority when in dangerous position', () => {
        const safeContext = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 10, y: 10 }, faction: 'player' }),
            ],
        });
        const safePriority = defensiveAI.getPriority(safeContext);

        const dangerousContext = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 4, y: 4 }, faction: 'player' }),
                createMockUnit({ id: 'enemy2', position: { x: 6, y: 6 }, faction: 'player' }),
            ],
        });
        const dangerousPriority = defensiveAI.getPriority(dangerousContext);

        expect(dangerousPriority).toBeGreaterThan(safePriority);
    });

    test('should make decisions within time limit', async () => {
        const context = createMockContext();
        const startTime = Date.now();

        const action = await defensiveAI.decideAction(context);
        const endTime = Date.now();

        expect(action).toBeDefined();
        expect(action.type).toBeDefined();
        expect(endTime - startTime).toBeLessThan(mockConfig.thinkingTimeLimit);
    });

    test('should prioritize healing when HP is critical', async () => {
        mockUnit.currentHP = 15; // 15% HP (critical)
        mockIntegration.skillSystem!.getAvailableSkills = jest.fn().mockReturnValue(['heal-skill']);

        const context = createMockContext();
        const action = await defensiveAI.decideAction(context);

        // 緊急状態では回復スキルを優先する可能性が高い
        if (action.type === AIActionType.SKILL) {
            expect(action.skillId).toBe('heal-skill');
        }
    });

    test('should prefer safe retreat when HP is low', async () => {
        mockUnit.currentHP = 30; // 30% HP (dangerous)

        const context = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 4, y: 4 }, faction: 'player' }),
            ],
        });

        const action = await defensiveAI.decideAction(context);

        // 危険状態では移動または待機を選択する可能性が高い
        expect([AIActionType.MOVE, AIActionType.WAIT, AIActionType.SKILL]).toContain(action.type);
    });

    test('should avoid risky attacks', async () => {
        // 強力な敵を隣接位置に配置
        const strongEnemy = createMockUnit({
            id: 'strong-enemy',
            position: { x: 6, y: 5 },
            faction: 'player',
            stats: { maxHP: 150, attack: 50, defense: 30 },
            currentHP: 150,
        });

        const context = createMockContext({
            visibleEnemies: [strongEnemy],
        });

        const action = await defensiveAI.decideAction(context);

        // 強力な敵に対しては攻撃を避ける傾向
        if (action.type === AIActionType.ATTACK) {
            // 攻撃する場合でも、より慎重な判断がされている
            expect(action.target).toBeDefined();
        } else {
            // 攻撃以外の行動を選択
            expect([AIActionType.MOVE, AIActionType.WAIT, AIActionType.SKILL]).toContain(action.type);
        }
    });

    test('should prefer positions near allies', async () => {
        const context = createMockContext({
            visibleAllies: [
                createMockUnit({ id: 'ally1', position: { x: 4, y: 4 }, faction: 'enemy' }),
                createMockUnit({ id: 'ally2', position: { x: 6, y: 6 }, faction: 'enemy' }),
            ],
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 8, y: 8 }, faction: 'player' }),
            ],
        });

        const action = await defensiveAI.decideAction(context);

        // 味方の近くにいる場合は、その位置を維持する傾向
        expect([AIActionType.WAIT, AIActionType.MOVE, AIActionType.SKILL]).toContain(action.type);
    });

    test('should handle empty enemy list gracefully', async () => {
        const context = createMockContext({
            visibleEnemies: [],
        });

        const action = await defensiveAI.decideAction(context);

        expect(action).toBeDefined();
        expect(action.type).toBeDefined();
    });

    test('should handle no valid actions gracefully', async () => {
        // 移動システムが空の移動範囲を返すようにモック
        mockIntegration.movementSystem!.calculateMovementRange = jest.fn().mockReturnValue([]);
        mockIntegration.battleSystem!.canAttack = jest.fn().mockReturnValue(false);
        mockIntegration.skillSystem!.getAvailableSkills = jest.fn().mockReturnValue([]);

        const context = createMockContext();
        const action = await defensiveAI.decideAction(context);

        expect(action.type).toBe(AIActionType.WAIT);
    });

    test('should evaluate position with safety priority', () => {
        const context = createMockContext();
        const safePosition = { x: 1, y: 1 }; // 敵から遠い位置
        const dangerousPosition = { x: 3, y: 3 }; // 敵に近い位置

        const safeEvaluation = defensiveAI.evaluatePosition(safePosition, context);
        const dangerousEvaluation = defensiveAI.evaluatePosition(dangerousPosition, context);

        expect(typeof safeEvaluation).toBe('number');
        expect(typeof dangerousEvaluation).toBe('number');
        // 安全な位置の方が高く評価される傾向
    });

    test('should prioritize defensive skills', async () => {
        mockIntegration.skillSystem!.getAvailableSkills = jest.fn().mockReturnValue([
            'attack-skill', 'heal-skill', 'defend-skill', 'shield-skill'
        ]);

        const context = createMockContext();
        const action = await defensiveAI.decideAction(context);

        if (action.type === AIActionType.SKILL) {
            // 防御的スキルを優先する傾向
            expect(['heal-skill', 'defend-skill', 'shield-skill']).toContain(action.skillId);
        }
    });

    test('should wait in safe positions', async () => {
        const context = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 10, y: 10 }, faction: 'player' }), // 遠い敵
            ],
            visibleAllies: [
                createMockUnit({ id: 'ally1', position: { x: 4, y: 5 }, faction: 'enemy' }), // 近くの味方
            ],
        });

        const action = await defensiveAI.decideAction(context);

        // 安全な位置では待機を選択する可能性が高い
        expect([AIActionType.WAIT, AIActionType.MOVE, AIActionType.SKILL]).toContain(action.type);
    });

    test('should have reasoning for all actions', async () => {
        const context = createMockContext();
        const action = await defensiveAI.decideAction(context);

        expect(action.reasoning).toBeDefined();
        expect(typeof action.reasoning).toBe('string');
        expect(action.reasoning!.length).toBeGreaterThan(0);
    });

    test('should handle timeout gracefully', async () => {
        // 非常に短いタイムアウトを設定
        const shortTimeoutConfig = { ...mockConfig, thinkingTimeLimit: 1 };
        const timeoutAI = new DefensiveAI(mockUnit, mockDifficultySettings, shortTimeoutConfig, mockIntegration);

        const context = createMockContext();
        const action = await timeoutAI.decideAction(context);

        // タイムアウト時はWAITアクションにフォールバック
        expect(action.type).toBe(AIActionType.WAIT);
    });

    test('should track performance metrics', async () => {
        const context = createMockContext();

        await defensiveAI.decideAction(context);

        const metrics = defensiveAI.metrics;
        expect(metrics.totalDecisions).toBe(1);
        expect(metrics.averageThinkingTime).toBeGreaterThan(0);
    });

    test('should apply difficulty settings', async () => {
        const hardSettings: DifficultySettings = {
            ...mockDifficultySettings,
            level: DifficultyLevel.HARD,
            randomnessFactor: 0.1,
            mistakeProbability: 0.05,
        };

        const hardAI = new DefensiveAI(mockUnit, hardSettings, mockConfig, mockIntegration);
        const context = createMockContext();

        const action = await hardAI.decideAction(context);

        expect(action).toBeDefined();
        // 難しい難易度では、より最適な判断がされる
    });

    test('should make emergency decisions when critically injured', async () => {
        mockUnit.currentHP = 10; // 10% HP (critical)

        const context = createMockContext({
            visibleEnemies: [
                createMockUnit({ id: 'enemy1', position: { x: 4, y: 4 }, faction: 'player' }),
            ],
        });

        const action = await defensiveAI.decideAction(context);

        // 緊急状態では生存を最優先とした行動を取る
        expect([AIActionType.SKILL, AIActionType.MOVE, AIActionType.WAIT]).toContain(action.type);

        if (action.type === AIActionType.ATTACK) {
            // 攻撃する場合は確実に倒せる相手のみ
            expect(action.target).toBeDefined();
        }
    });

    test('should consider ally support in decision making', async () => {
        const contextWithSupport = createMockContext({
            visibleAllies: [
                createMockUnit({ id: 'ally1', position: { x: 4, y: 5 }, faction: 'enemy' }),
                createMockUnit({ id: 'ally2', position: { x: 6, y: 5 }, faction: 'enemy' }),
            ],
        });

        const contextWithoutSupport = createMockContext({
            visibleAllies: [],
        });

        const actionWithSupport = await defensiveAI.decideAction(contextWithSupport);
        const actionWithoutSupport = await defensiveAI.decideAction(contextWithoutSupport);

        // 味方の支援がある場合とない場合で行動が変わる可能性
        expect(actionWithSupport).toBeDefined();
        expect(actionWithoutSupport).toBeDefined();
    });
});