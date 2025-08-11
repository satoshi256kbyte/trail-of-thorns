/**
 * AIPersonalityシステムのユニットテスト
 */

import {
    BaseAIPersonality,
    AggressivePersonality,
    DefensivePersonality,
    SupportPersonality,
    TacticalPersonality,
    BalancedPersonality,
    AIPersonalityFactory,
    AIPersonalityManager
} from '../../../../game/src/systems/ai/AIPersonality';
import { AIPersonalityType, ActionType } from '../../../../game/src/types/ai';
import { Unit } from '../../../../game/src/types/gameplay';

// モックユニットの作成
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

describe('AIPersonality System', () => {
    describe('AggressivePersonality', () => {
        let personality: AggressivePersonality;

        beforeEach(() => {
            personality = new AggressivePersonality();
        });

        test('should have correct personality type', () => {
            expect(personality.type).toBe(AIPersonalityType.AGGRESSIVE);
        });

        test('should have high aggressiveness and low defensiveness', () => {
            expect(personality.aggressiveness).toBeGreaterThan(0.8);
            expect(personality.defensiveness).toBeLessThan(0.3);
            expect(personality.riskTolerance).toBeGreaterThan(0.7);
        });

        test('should prefer attack actions', () => {
            const attackModifier = personality.getActionModifier(ActionType.ATTACK);
            const defendModifier = personality.getActionModifier(ActionType.DEFEND);

            expect(attackModifier).toBeGreaterThan(defendModifier);
            expect(attackModifier).toBeGreaterThan(0);
        });

        test('should be willing to take risks', () => {
            const highRisk = 0.7;
            const lowRisk = 0.3;

            // 攻撃的性格は高リスクでも挑戦する可能性が高い
            let riskTakenCount = 0;
            for (let i = 0; i < 100; i++) {
                if (personality.shouldTakeRisk(highRisk)) {
                    riskTakenCount++;
                }
            }

            expect(riskTakenCount).toBeGreaterThan(30); // 30%以上はリスクを取る
            expect(personality.shouldTakeRisk(lowRisk)).toBe(true);
        });

        test('should prioritize low HP targets', () => {
            const lowHPTarget = createMockUnit({ currentHP: 20 });
            const highHPTarget = createMockUnit({ currentHP: 80 });

            const lowHPModifier = personality.getPriorityModifier(lowHPTarget);
            const highHPModifier = personality.getPriorityModifier(highHPTarget);

            expect(lowHPModifier).toBeGreaterThan(highHPModifier);
        });
    });

    describe('DefensivePersonality', () => {
        let personality: DefensivePersonality;

        beforeEach(() => {
            personality = new DefensivePersonality();
        });

        test('should have correct personality type', () => {
            expect(personality.type).toBe(AIPersonalityType.DEFENSIVE);
        });

        test('should have high defensiveness and low aggressiveness', () => {
            expect(personality.defensiveness).toBeGreaterThan(0.8);
            expect(personality.aggressiveness).toBeLessThan(0.4);
            expect(personality.riskTolerance).toBeLessThan(0.3);
        });

        test('should prefer defensive actions', () => {
            const defendModifier = personality.getActionModifier(ActionType.DEFEND);
            const attackModifier = personality.getActionModifier(ActionType.ATTACK);
            const waitModifier = personality.getActionModifier(ActionType.WAIT);

            expect(defendModifier).toBeGreaterThan(attackModifier);
            expect(waitModifier).toBeGreaterThan(attackModifier);
        });

        test('should be risk-averse', () => {
            const mediumRisk = 0.5;
            const lowRisk = 0.1;

            // 防御的性格は中程度のリスクでも避ける傾向
            let riskTakenCount = 0;
            for (let i = 0; i < 100; i++) {
                if (personality.shouldTakeRisk(mediumRisk)) {
                    riskTakenCount++;
                }
            }

            expect(riskTakenCount).toBeLessThan(30); // 30%未満しかリスクを取らない
            expect(personality.shouldTakeRisk(lowRisk)).toBe(true);
        });
    });

    describe('SupportPersonality', () => {
        let personality: SupportPersonality;

        beforeEach(() => {
            personality = new SupportPersonality();
        });

        test('should have correct personality type', () => {
            expect(personality.type).toBe(AIPersonalityType.SUPPORT);
        });

        test('should have high supportiveness', () => {
            expect(personality.supportiveness).toBeGreaterThan(0.8);
            expect(personality.tacticalness).toBeGreaterThan(0.6);
        });

        test('should prefer skill actions', () => {
            const skillModifier = personality.getActionModifier(ActionType.SKILL);
            const attackModifier = personality.getActionModifier(ActionType.ATTACK);

            expect(skillModifier).toBeGreaterThan(attackModifier);
            expect(skillModifier).toBeGreaterThan(0);
        });

        test('should prioritize injured allies', () => {
            const injuredAlly = createMockUnit({
                currentHP: 30,
                faction: 'player'
            });
            const healthyAlly = createMockUnit({
                currentHP: 90,
                faction: 'player'
            });

            const injuredModifier = personality.getPriorityModifier(injuredAlly);
            const healthyModifier = personality.getPriorityModifier(healthyAlly);

            expect(injuredModifier).toBeGreaterThan(healthyModifier);
        });
    });

    describe('TacticalPersonality', () => {
        let personality: TacticalPersonality;

        beforeEach(() => {
            personality = new TacticalPersonality();
        });

        test('should have correct personality type', () => {
            expect(personality.type).toBe(AIPersonalityType.TACTICAL);
        });

        test('should have high tacticalness', () => {
            expect(personality.tacticalness).toBeGreaterThan(0.8);
        });

        test('should prefer movement and skill actions', () => {
            const moveModifier = personality.getActionModifier(ActionType.MOVE);
            const skillModifier = personality.getActionModifier(ActionType.SKILL);
            const attackModifier = personality.getActionModifier(ActionType.ATTACK);

            expect(moveModifier).toBeGreaterThan(0);
            expect(skillModifier).toBeGreaterThan(0);
            // 戦術的性格は位置取りとスキル使用を重視
        });

        test('should make calculated risk decisions', () => {
            const lowRisk = 0.2;
            const highRisk = 0.8;

            // 戦術的性格は期待値に基づいてリスクを判定
            expect(personality.shouldTakeRisk(lowRisk)).toBe(true);
            expect(personality.shouldTakeRisk(highRisk)).toBe(false);
        });
    });

    describe('BalancedPersonality', () => {
        let personality: BalancedPersonality;

        beforeEach(() => {
            personality = new BalancedPersonality();
        });

        test('should have correct personality type', () => {
            expect(personality.type).toBe(AIPersonalityType.BALANCED);
        });

        test('should have balanced attributes', () => {
            expect(personality.aggressiveness).toBe(0.5);
            expect(personality.defensiveness).toBe(0.5);
            expect(personality.supportiveness).toBe(0.5);
            expect(personality.tacticalness).toBe(0.5);
            expect(personality.riskTolerance).toBe(0.5);
        });

        test('should have moderate action modifiers', () => {
            const actionTypes = [
                ActionType.ATTACK,
                ActionType.MOVE,
                ActionType.SKILL,
                ActionType.WAIT,
                ActionType.DEFEND
            ];

            actionTypes.forEach(actionType => {
                const modifier = personality.getActionModifier(actionType);
                expect(Math.abs(modifier)).toBeLessThan(0.5); // 控えめな修正値
            });
        });
    });

    describe('AIPersonalityFactory', () => {
        test('should create correct personality types', () => {
            const aggressive = AIPersonalityFactory.create(AIPersonalityType.AGGRESSIVE);
            const defensive = AIPersonalityFactory.create(AIPersonalityType.DEFENSIVE);
            const support = AIPersonalityFactory.create(AIPersonalityType.SUPPORT);
            const tactical = AIPersonalityFactory.create(AIPersonalityType.TACTICAL);
            const balanced = AIPersonalityFactory.create(AIPersonalityType.BALANCED);

            expect(aggressive.type).toBe(AIPersonalityType.AGGRESSIVE);
            expect(defensive.type).toBe(AIPersonalityType.DEFENSIVE);
            expect(support.type).toBe(AIPersonalityType.SUPPORT);
            expect(tactical.type).toBe(AIPersonalityType.TACTICAL);
            expect(balanced.type).toBe(AIPersonalityType.BALANCED);
        });

        test('should create custom personality', () => {
            const customParams = {
                aggressiveness: 0.8,
                defensiveness: 0.2,
                supportiveness: 0.6,
                tacticalness: 0.7,
                riskTolerance: 0.9
            };

            const custom = AIPersonalityFactory.createCustom(customParams);

            expect(custom.aggressiveness).toBe(0.8);
            expect(custom.defensiveness).toBe(0.2);
            expect(custom.supportiveness).toBe(0.6);
            expect(custom.tacticalness).toBe(0.7);
            expect(custom.riskTolerance).toBe(0.9);
        });

        test('should create random personality', () => {
            const random1 = AIPersonalityFactory.createRandom();
            const random2 = AIPersonalityFactory.createRandom();

            expect(random1).toBeDefined();
            expect(random2).toBeDefined();
            expect(Object.values(AIPersonalityType)).toContain(random1.type);
            expect(Object.values(AIPersonalityType)).toContain(random2.type);
        });

        test('should handle invalid personality type', () => {
            const invalid = AIPersonalityFactory.create('invalid' as AIPersonalityType);
            expect(invalid.type).toBe(AIPersonalityType.BALANCED);
        });
    });

    describe('AIPersonalityManager', () => {
        let manager: AIPersonalityManager;

        beforeEach(() => {
            manager = new AIPersonalityManager();
        });

        test('should assign and retrieve personalities', () => {
            const personality = new AggressivePersonality();
            const characterId = 'test-character';

            manager.assignPersonality(characterId, personality);
            const retrieved = manager.getPersonality(characterId);

            expect(retrieved).toBe(personality);
            expect(retrieved.type).toBe(AIPersonalityType.AGGRESSIVE);
        });

        test('should return balanced personality for unknown character', () => {
            const unknown = manager.getPersonality('unknown-character');
            expect(unknown.type).toBe(AIPersonalityType.BALANCED);
        });

        test('should track personality history', () => {
            const characterId = 'test-character';

            manager.assignPersonality(characterId, new AggressivePersonality());
            manager.changePersonality(characterId, AIPersonalityType.DEFENSIVE);
            manager.changePersonality(characterId, AIPersonalityType.SUPPORT);

            const history = manager.getPersonalityHistory(characterId);
            expect(history).toEqual([
                AIPersonalityType.AGGRESSIVE,
                AIPersonalityType.DEFENSIVE,
                AIPersonalityType.SUPPORT
            ]);
        });

        test('should change personality dynamically', () => {
            const characterId = 'test-character';

            manager.assignPersonality(characterId, new AggressivePersonality());
            expect(manager.getPersonality(characterId).type).toBe(AIPersonalityType.AGGRESSIVE);

            manager.changePersonality(characterId, AIPersonalityType.DEFENSIVE);
            expect(manager.getPersonality(characterId).type).toBe(AIPersonalityType.DEFENSIVE);
        });

        test('should get all personalities', () => {
            manager.assignPersonality('char1', new AggressivePersonality());
            manager.assignPersonality('char2', new DefensivePersonality());

            const all = manager.getAllPersonalities();
            expect(all.size).toBe(2);
            expect(all.get('char1')?.type).toBe(AIPersonalityType.AGGRESSIVE);
            expect(all.get('char2')?.type).toBe(AIPersonalityType.DEFENSIVE);
        });

        test('should remove personality', () => {
            const characterId = 'test-character';

            manager.assignPersonality(characterId, new AggressivePersonality());
            expect(manager.getPersonality(characterId).type).toBe(AIPersonalityType.AGGRESSIVE);

            manager.removePersonality(characterId);
            expect(manager.getPersonality(characterId).type).toBe(AIPersonalityType.BALANCED);
            expect(manager.getPersonalityHistory(characterId)).toEqual([]);
        });

        test('should clear all personalities', () => {
            manager.assignPersonality('char1', new AggressivePersonality());
            manager.assignPersonality('char2', new DefensivePersonality());

            expect(manager.getAllPersonalities().size).toBe(2);

            manager.clear();
            expect(manager.getAllPersonalities().size).toBe(0);
        });
    });

    describe('Personality Value Clamping', () => {
        test('should clamp values to 0-1 range', () => {
            const personality = AIPersonalityFactory.createCustom({
                aggressiveness: 1.5,  // 範囲外
                defensiveness: -0.5,  // 範囲外
                supportiveness: 0.5,
                tacticalness: 0.8,
                riskTolerance: 2.0    // 範囲外
            });

            expect(personality.aggressiveness).toBe(1.0);
            expect(personality.defensiveness).toBe(0.0);
            expect(personality.supportiveness).toBe(0.5);
            expect(personality.tacticalness).toBe(0.8);
            expect(personality.riskTolerance).toBe(1.0);
        });
    });

    describe('Priority Modifier Calculations', () => {
        test('should calculate threat level correctly', () => {
            const personality = new DefensivePersonality();

            const highThreatTarget = createMockUnit({
                stats: { attack: 50, speed: 20, defense: 10, maxHP: 100, maxMP: 0, movement: 3 },
                currentHP: 80
            });

            const lowThreatTarget = createMockUnit({
                stats: { attack: 10, speed: 5, defense: 5, maxHP: 100, maxMP: 0, movement: 3 },
                currentHP: 50
            });

            const highThreatModifier = personality.getPriorityModifier(highThreatTarget);
            const lowThreatModifier = personality.getPriorityModifier(lowThreatTarget);

            // 防御的性格は脅威度の高い敵を優先する傾向
            expect(highThreatModifier).toBeGreaterThanOrEqual(lowThreatModifier);
        });

        test('should calculate tactical value correctly', () => {
            const personality = new TacticalPersonality();

            const supportTarget = createMockUnit({
                stats: { attack: 15, speed: 18, defense: 8, maxHP: 80, maxMP: 50, movement: 3 }
            });

            const tankTarget = createMockUnit({
                stats: { attack: 25, speed: 8, defense: 20, maxHP: 120, maxMP: 0, movement: 2 }
            });

            const supportModifier = personality.getPriorityModifier(supportTarget);
            const tankModifier = personality.getPriorityModifier(tankTarget);

            // 戦術的性格は支援系（MP持ち、高速、低防御）を優先する傾向
            expect(supportModifier).toBeGreaterThan(tankModifier);
        });
    });
});