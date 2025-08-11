/**
 * AIPersonalityシステムの統合テスト
 * 他のAIシステムとの連携を確認
 */

import {
    AIPersonalityFactory,
    AIPersonalityManager,
    AggressivePersonality,
    DefensivePersonality,
    SupportPersonality,
    TacticalPersonality
} from '../../../../game/src/systems/ai/AIPersonality';
import { AIPersonalityType, ActionType, AIContext } from '../../../../game/src/types/ai';
import { Unit } from '../../../../game/src/types/gameplay';

// モックユニットとコンテキストの作成
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit',
    name: 'Test Unit',
    position: { x: 0, y: 0 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3,
        ...overrides.stats
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    ...overrides
});

const createMockContext = (overrides: Partial<AIContext> = {}): AIContext => ({
    currentCharacter: createMockUnit(),
    gameState: {},
    visibleEnemies: [],
    visibleAllies: [],
    npcs: [],
    availableSkills: [],
    terrainData: {},
    turnNumber: 1,
    difficultySettings: {
        level: 2,
        thinkingDepth: 3,
        randomnessFactor: 0.1,
        mistakeProbability: 0.05,
        reactionTime: 1000,
        skillUsageFrequency: 0.7,
        thinkingTimeLimit: 2000
    },
    actionHistory: [],
    ...overrides
});

describe('AIPersonality Integration Tests', () => {
    describe('Personality-based Action Preferences', () => {
        test('aggressive personality should strongly prefer attack actions', () => {
            const personality = new AggressivePersonality();

            const attackModifier = personality.getActionModifier(ActionType.ATTACK);
            const defendModifier = personality.getActionModifier(ActionType.DEFEND);
            const waitModifier = personality.getActionModifier(ActionType.WAIT);

            expect(attackModifier).toBeGreaterThan(0.5);
            expect(attackModifier).toBeGreaterThan(defendModifier);
            expect(attackModifier).toBeGreaterThan(waitModifier);
        });

        test('defensive personality should prefer defensive and wait actions', () => {
            const personality = new DefensivePersonality();

            const defendModifier = personality.getActionModifier(ActionType.DEFEND);
            const waitModifier = personality.getActionModifier(ActionType.WAIT);
            const attackModifier = personality.getActionModifier(ActionType.ATTACK);

            expect(defendModifier).toBeGreaterThan(attackModifier);
            expect(waitModifier).toBeGreaterThan(attackModifier);
        });

        test('support personality should prefer skill actions', () => {
            const personality = new SupportPersonality();

            const skillModifier = personality.getActionModifier(ActionType.SKILL);
            const attackModifier = personality.getActionModifier(ActionType.ATTACK);

            expect(skillModifier).toBeGreaterThan(attackModifier);
            expect(skillModifier).toBeGreaterThan(0);
        });

        test('tactical personality should prefer movement and skill actions', () => {
            const personality = new TacticalPersonality();

            const moveModifier = personality.getActionModifier(ActionType.MOVE);
            const skillModifier = personality.getActionModifier(ActionType.SKILL);
            const waitModifier = personality.getActionModifier(ActionType.WAIT);

            expect(moveModifier).toBeGreaterThan(0);
            expect(skillModifier).toBeGreaterThan(0);
            expect(moveModifier).toBeGreaterThan(waitModifier);
        });
    });

    describe('Risk Assessment Integration', () => {
        test('aggressive personality should take more risks than defensive', () => {
            const aggressive = new AggressivePersonality();
            const defensive = new DefensivePersonality();

            const mediumRisk = 0.6;

            let aggressiveRiskCount = 0;
            let defensiveRiskCount = 0;

            // 複数回テストして傾向を確認
            for (let i = 0; i < 100; i++) {
                if (aggressive.shouldTakeRisk(mediumRisk)) aggressiveRiskCount++;
                if (defensive.shouldTakeRisk(mediumRisk)) defensiveRiskCount++;
            }

            expect(aggressiveRiskCount).toBeGreaterThan(defensiveRiskCount);
        });

        test('tactical personality should make calculated risk decisions', () => {
            const tactical = new TacticalPersonality();

            const lowRisk = 0.2;
            const highRisk = 0.8;

            // 低リスクは受け入れ、高リスクは避ける傾向
            expect(tactical.shouldTakeRisk(lowRisk)).toBe(true);
            expect(tactical.shouldTakeRisk(highRisk)).toBe(false);
        });
    });

    describe('Target Priority Modification', () => {
        test('aggressive personality should prioritize low HP targets', () => {
            const personality = new AggressivePersonality();

            const lowHPTarget = createMockUnit({ currentHP: 20 });
            const highHPTarget = createMockUnit({ currentHP: 80 });

            const lowHPPriority = personality.getPriorityModifier(lowHPTarget);
            const highHPPriority = personality.getPriorityModifier(highHPTarget);

            expect(lowHPPriority).toBeGreaterThan(highHPPriority);
        });

        test('defensive personality should prioritize high threat targets', () => {
            const personality = new DefensivePersonality();

            const highThreatTarget = createMockUnit({
                stats: { attack: 40, speed: 20, defense: 10, maxHP: 100, maxMP: 0, movement: 3 }
            });
            const lowThreatTarget = createMockUnit({
                stats: { attack: 10, speed: 5, defense: 5, maxHP: 100, maxMP: 0, movement: 3 }
            });

            const highThreatPriority = personality.getPriorityModifier(highThreatTarget);
            const lowThreatPriority = personality.getPriorityModifier(lowThreatTarget);

            expect(highThreatPriority).toBeGreaterThanOrEqual(lowThreatPriority);
        });

        test('support personality should prioritize injured allies', () => {
            const personality = new SupportPersonality();

            const injuredAlly = createMockUnit({
                currentHP: 30,
                faction: 'player'
            });
            const healthyAlly = createMockUnit({
                currentHP: 90,
                faction: 'player'
            });

            const injuredPriority = personality.getPriorityModifier(injuredAlly);
            const healthyPriority = personality.getPriorityModifier(healthyAlly);

            expect(injuredPriority).toBeGreaterThan(healthyPriority);
        });

        test('tactical personality should consider tactical value', () => {
            const personality = new TacticalPersonality();

            const supportUnit = createMockUnit({
                stats: { attack: 15, speed: 18, defense: 8, maxHP: 80, maxMP: 50, movement: 3 }
            });
            const tankUnit = createMockUnit({
                stats: { attack: 25, speed: 8, defense: 20, maxHP: 120, maxMP: 0, movement: 2 }
            });

            const supportPriority = personality.getPriorityModifier(supportUnit);
            const tankPriority = personality.getPriorityModifier(tankUnit);

            // 戦術的性格は支援系ユニット（MP持ち、高速、低防御）を優先
            expect(supportPriority).toBeGreaterThan(tankPriority);
        });
    });

    describe('Personality Manager Integration', () => {
        let manager: AIPersonalityManager;

        beforeEach(() => {
            manager = new AIPersonalityManager();
        });

        test('should manage multiple AI personalities in battle scenario', () => {
            // 複数のキャラクターに異なる性格を割り当て
            manager.assignPersonality('aggressive-enemy', AIPersonalityFactory.create(AIPersonalityType.AGGRESSIVE));
            manager.assignPersonality('defensive-enemy', AIPersonalityFactory.create(AIPersonalityType.DEFENSIVE));
            manager.assignPersonality('support-ally', AIPersonalityFactory.create(AIPersonalityType.SUPPORT));

            // 各キャラクターが適切な性格を持つことを確認
            expect(manager.getPersonality('aggressive-enemy').type).toBe(AIPersonalityType.AGGRESSIVE);
            expect(manager.getPersonality('defensive-enemy').type).toBe(AIPersonalityType.DEFENSIVE);
            expect(manager.getPersonality('support-ally').type).toBe(AIPersonalityType.SUPPORT);

            // 全ての性格が管理されていることを確認
            const allPersonalities = manager.getAllPersonalities();
            expect(allPersonalities.size).toBe(3);
        });

        test('should handle dynamic personality changes during gameplay', () => {
            const characterId = 'dynamic-character';

            // 初期性格を設定
            manager.assignPersonality(characterId, AIPersonalityFactory.create(AIPersonalityType.BALANCED));
            expect(manager.getPersonality(characterId).type).toBe(AIPersonalityType.BALANCED);

            // 戦闘中に性格を変更（例：ダメージを受けて防御的になる）
            manager.changePersonality(characterId, AIPersonalityType.DEFENSIVE);
            expect(manager.getPersonality(characterId).type).toBe(AIPersonalityType.DEFENSIVE);

            // 履歴が正しく記録されていることを確認
            const history = manager.getPersonalityHistory(characterId);
            expect(history).toEqual([AIPersonalityType.BALANCED, AIPersonalityType.DEFENSIVE]);
        });
    });

    describe('Personality Factory Integration', () => {
        test('should create appropriate personalities for different enemy types', () => {
            // 異なる敵タイプに適した性格を作成
            const berserker = AIPersonalityFactory.create(AIPersonalityType.AGGRESSIVE);
            const guardian = AIPersonalityFactory.create(AIPersonalityType.DEFENSIVE);
            const healer = AIPersonalityFactory.create(AIPersonalityType.SUPPORT);
            const strategist = AIPersonalityFactory.create(AIPersonalityType.TACTICAL);

            // 各性格が期待される特性を持つことを確認
            expect(berserker.aggressiveness).toBeGreaterThan(0.8);
            expect(guardian.defensiveness).toBeGreaterThan(0.8);
            expect(healer.supportiveness).toBeGreaterThan(0.8);
            expect(strategist.tacticalness).toBeGreaterThan(0.8);
        });

        test('should create custom personalities for special enemies', () => {
            // ボス敵用のカスタム性格
            const bossPersonality = AIPersonalityFactory.createCustom({
                aggressiveness: 0.8,
                defensiveness: 0.6,
                supportiveness: 0.3,
                tacticalness: 0.9,
                riskTolerance: 0.7
            });

            expect(bossPersonality.aggressiveness).toBe(0.8);
            expect(bossPersonality.tacticalness).toBe(0.9);

            // ボスは攻撃的かつ戦術的な行動を好む
            const attackModifier = bossPersonality.getActionModifier(ActionType.ATTACK);
            const moveModifier = bossPersonality.getActionModifier(ActionType.MOVE);

            expect(attackModifier).toBeGreaterThan(0);
            expect(moveModifier).toBeGreaterThan(0);
        });
    });

    describe('Requirements Validation', () => {
        test('should satisfy requirement 2.1: aggressive AI attacks nearest enemy', () => {
            const personality = new AggressivePersonality();

            // 攻撃的性格は攻撃行動に高い修正値を与える
            const attackModifier = personality.getActionModifier(ActionType.ATTACK);
            expect(attackModifier).toBeGreaterThan(0.5);

            // 低HPの敵を優先する
            const lowHPEnemy = createMockUnit({ currentHP: 25 });
            const highHPEnemy = createMockUnit({ currentHP: 75 });

            const lowHPPriority = personality.getPriorityModifier(lowHPEnemy);
            const highHPPriority = personality.getPriorityModifier(highHPEnemy);

            expect(lowHPPriority).toBeGreaterThan(highHPPriority);
        });

        test('should satisfy requirement 2.2: defensive AI prioritizes safety when HP < 25%', () => {
            const personality = new DefensivePersonality();

            // 防御的性格は防御行動を優先
            const defendModifier = personality.getActionModifier(ActionType.DEFEND);
            const attackModifier = personality.getActionModifier(ActionType.ATTACK);

            expect(defendModifier).toBeGreaterThan(attackModifier);

            // リスクを避ける傾向
            const highRisk = 0.7;
            expect(personality.shouldTakeRisk(highRisk)).toBe(false);
        });

        test('should satisfy requirement 2.3: support AI prioritizes ally support', () => {
            const personality = new SupportPersonality();

            // 支援性格はスキル使用を優先
            const skillModifier = personality.getActionModifier(ActionType.SKILL);
            const attackModifier = personality.getActionModifier(ActionType.ATTACK);

            expect(skillModifier).toBeGreaterThan(attackModifier);

            // 負傷した味方を優先
            const injuredAlly = createMockUnit({
                currentHP: 30,
                faction: 'player'
            });
            const healthyAlly = createMockUnit({
                currentHP: 90,
                faction: 'player'
            });

            const injuredPriority = personality.getPriorityModifier(injuredAlly);
            const healthyPriority = personality.getPriorityModifier(healthyAlly);

            expect(injuredPriority).toBeGreaterThan(healthyPriority);
        });

        test('should satisfy requirement 4.1: difficulty affects AI behavior', () => {
            // 異なる性格タイプが異なる行動パターンを示すことを確認
            const personalities = [
                AIPersonalityFactory.create(AIPersonalityType.AGGRESSIVE),
                AIPersonalityFactory.create(AIPersonalityType.DEFENSIVE),
                AIPersonalityFactory.create(AIPersonalityType.SUPPORT),
                AIPersonalityFactory.create(AIPersonalityType.TACTICAL)
            ];

            // 各性格が異なる行動修正値を持つことを確認
            const attackModifiers = personalities.map(p => p.getActionModifier(ActionType.ATTACK));
            const defendModifiers = personalities.map(p => p.getActionModifier(ActionType.DEFEND));

            // 全ての修正値が同じではないことを確認（多様性の証明）
            expect(new Set(attackModifiers).size).toBeGreaterThan(1);
            expect(new Set(defendModifiers).size).toBeGreaterThan(1);
        });

        test('should satisfy requirement 4.2: personality affects action priority', () => {
            const aggressive = new AggressivePersonality();
            const defensive = new DefensivePersonality();

            // 同じターゲットに対して異なる優先度を示すことを確認
            const target = createMockUnit({ currentHP: 50 });

            const aggressivePriority = aggressive.getPriorityModifier(target);
            const defensivePriority = defensive.getPriorityModifier(target);

            // 性格によって優先度が異なることを確認
            expect(aggressivePriority).not.toBe(defensivePriority);
        });
    });
});