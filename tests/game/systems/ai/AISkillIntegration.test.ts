/**
 * AIスキルシステム統合テスト
 * AIとスキルシステムの連携機能をテスト
 */

import { AISkillEvaluator } from '../../../../game/src/systems/ai/AISkillEvaluator';
import { AIController } from '../../../../game/src/systems/AIController';
import { SkillSystem } from '../../../../game/src/systems/skills/SkillSystem';
import { SkillConditionChecker } from '../../../../game/src/systems/skills/SkillConditionChecker';
import {
    AIContext,
    AIPersonality,
    AIPersonalityType,
    DifficultySettings,
    DifficultyLevel,
    AIControllerConfig,
    AISystemIntegration
} from '../../../../game/src/types/ai';
import {
    SkillType,
    TargetType,
    SkillData,
    CharacterSkillData
} from '../../../../game/src/types/skill';
import { Unit } from '../../../../game/src/types/gameplay';

// モッククラス
class MockSkillSystem {
    private skills: Map<string, any> = new Map();
    private availableSkills: Map<string, string[]> = new Map();

    constructor() {
        // テスト用スキルを追加
        this.addTestSkills();
    }

    private addTestSkills() {
        const attackSkill = {
            id: 'fireball',
            name: 'Fireball',
            skillType: SkillType.ATTACK,
            targetType: TargetType.SINGLE_ENEMY,
            range: 3,
            areaOfEffect: { shape: 'single', size: 1 },
            effects: [{ type: 'damage', value: 50, damageType: 'magical' }],
            usageCondition: {
                mpCost: 20,
                cooldown: 2,
                usageLimit: 0,
                levelRequirement: 1
            },
            learnCondition: { level: 1 },
            animation: { castAnimation: 'cast', effectAnimation: 'fire', duration: 1000 }
        };

        const healSkill = {
            id: 'heal',
            name: 'Heal',
            skillType: SkillType.HEAL,
            targetType: TargetType.SINGLE_ALLY,
            range: 2,
            areaOfEffect: { shape: 'single', size: 1 },
            effects: [{ type: 'heal', value: 40, healType: 'fixed' }],
            usageCondition: {
                mpCost: 15,
                cooldown: 0,
                usageLimit: 0,
                levelRequirement: 1
            },
            learnCondition: { level: 1 },
            animation: { castAnimation: 'cast', effectAnimation: 'heal', duration: 800 }
        };

        this.skills.set('fireball', attackSkill);
        this.skills.set('heal', healSkill);
    }

    getAvailableSkills(unitId: string) {
        return [
            {
                skill: this.skills.get('fireball'),
                usability: { canUse: true },
                displayText: 'Fireball (MP:20)',
                enabled: true,
                recommendation: 70
            },
            {
                skill: this.skills.get('heal'),
                usability: { canUse: true },
                displayText: 'Heal (MP:15)',
                enabled: true,
                recommendation: 60
            }
        ];
    }

    getSkill(skillId: string) {
        return this.skills.get(skillId);
    }

    canUseSkill(unit: Unit, skillId: string) {
        const skill = this.skills.get(skillId);
        return skill && unit.currentMP >= skill.usageCondition.mpCost;
    }
}

class MockConditionChecker {
    canUseSkill(skill: any, casterId: string, targetPosition: any, battlefieldState: any, characterData: any) {
        return {
            canUse: true,
            message: 'Skill can be used'
        };
    }

    getCharacterSkillData(characterId: string): CharacterSkillData {
        return {
            characterId,
            learnedSkills: ['fireball', 'heal'],
            skillCooldowns: new Map(),
            skillUsageCounts: new Map(),
            skillLearnHistory: [],
            activeEffects: []
        };
    }
}

// テスト用ユニット作成
function createTestUnit(id: string, faction: string, mp: number = 100): Unit {
    return {
        id,
        name: `Unit ${id}`,
        position: { x: 0, y: 0 },
        faction,
        currentHP: 80,
        currentMP: mp,
        stats: {
            maxHP: 100,
            maxMP: 100,
            attack: 50,
            defense: 30,
            speed: 40,
            movement: 3
        },
        hasActed: false,
        hasMoved: false
    };
}

// テスト用AIコンテキスト作成
function createTestContext(): AIContext {
    return {
        currentCharacter: createTestUnit('ai1', 'enemy'),
        gameState: {},
        visibleEnemies: [
            createTestUnit('player1', 'player', 60),
            createTestUnit('player2', 'player', 30)
        ],
        visibleAllies: [
            createTestUnit('ai2', 'enemy', 80)
        ],
        npcs: [],
        availableSkills: [],
        terrainData: {},
        turnNumber: 5,
        difficultySettings: {
            thinkingDepth: 3,
            randomnessFactor: 0.2,
            mistakeProbability: 0.1,
            reactionTime: 1000,
            skillUsageFrequency: 0.8,
            thinkingTimeLimit: 2000
        },
        actionHistory: []
    };
}

// テスト用AI性格作成
function createTestPersonality(): AIPersonality {
    return {
        type: AIPersonalityType.AGGRESSIVE,
        aggressiveness: 0.8,
        defensiveness: 0.3,
        supportiveness: 0.4,
        tacticalness: 0.6,
        riskTolerance: 0.7,
        getActionModifier: (actionType) => 1.0,
        shouldTakeRisk: (riskLevel) => riskLevel < 0.7,
        getPriorityModifier: (target) => 1.0
    };
}

describe('AISkillEvaluator', () => {
    let skillEvaluator: AISkillEvaluator;
    let mockSkillSystem: MockSkillSystem;
    let mockConditionChecker: MockConditionChecker;
    let testContext: AIContext;
    let testPersonality: AIPersonality;
    let testDifficulty: DifficultySettings;

    beforeEach(() => {
        mockSkillSystem = new MockSkillSystem();
        mockConditionChecker = new MockConditionChecker();
        skillEvaluator = new AISkillEvaluator(mockSkillSystem as any, mockConditionChecker as any);

        testContext = createTestContext();
        testPersonality = createTestPersonality();
        testDifficulty = {
            thinkingDepth: 3,
            randomnessFactor: 0.2,
            mistakeProbability: 0.1,
            reactionTime: 1000,
            skillUsageFrequency: 0.8,
            thinkingTimeLimit: 2000
        };
    });

    describe('evaluateSkillUsage', () => {
        test('should return skill evaluations sorted by score', () => {
            const evaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                testPersonality,
                testDifficulty
            );

            expect(evaluations).toBeDefined();
            expect(evaluations.length).toBeGreaterThan(0);

            // スコア順にソートされているかチェック
            for (let i = 1; i < evaluations.length; i++) {
                expect(evaluations[i - 1].score).toBeGreaterThanOrEqual(evaluations[i].score);
            }
        });

        test('should evaluate attack skills against enemies', () => {
            const evaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                testPersonality,
                testDifficulty
            );

            const attackEvaluations = evaluations.filter(e =>
                e.skill.skillType === SkillType.ATTACK
            );

            expect(attackEvaluations.length).toBeGreaterThan(0);

            // 攻撃スキルは敵を対象にしているかチェック
            for (const evaluation of attackEvaluations) {
                if (evaluation.target) {
                    expect(evaluation.target.faction).toBe('player');
                }
            }
        });

        test('should evaluate heal skills against allies', () => {
            // 味方を負傷させる
            testContext.visibleAllies[0].currentHP = 30;

            const evaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                testPersonality,
                testDifficulty
            );

            const healEvaluations = evaluations.filter(e =>
                e.skill.skillType === SkillType.HEAL
            );

            expect(healEvaluations.length).toBeGreaterThan(0);

            // 回復スキルは味方を対象にしているかチェック
            for (const evaluation of healEvaluations) {
                if (evaluation.target) {
                    expect(evaluation.target.faction).toBe('enemy');
                }
            }
        });

        test('should consider MP costs in evaluation', () => {
            // MP不足の状況を作る
            testContext.currentCharacter!.currentMP = 25;

            const evaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                testPersonality,
                testDifficulty
            );

            // 低コストスキルが高評価になるかチェック
            const lowCostSkills = evaluations.filter(e =>
                e.skill.usageCondition.mpCost <= 20
            );
            const highCostSkills = evaluations.filter(e =>
                e.skill.usageCondition.mpCost > 20
            );

            if (lowCostSkills.length > 0 && highCostSkills.length > 0) {
                expect(lowCostSkills[0].breakdown.resourceCostScore)
                    .toBeGreaterThan(highCostSkills[0].breakdown.resourceCostScore);
            }
        });

        test('should apply personality modifiers', () => {
            const aggressivePersonality: AIPersonality = {
                ...testPersonality,
                aggressiveness: 1.0,
                supportiveness: 0.2
            };

            const supportivePersonality: AIPersonality = {
                ...testPersonality,
                aggressiveness: 0.2,
                supportiveness: 1.0
            };

            const aggressiveEvaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                aggressivePersonality,
                testDifficulty
            );

            const supportiveEvaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                supportivePersonality,
                testDifficulty
            );

            // 攻撃的性格は攻撃スキルを高評価
            const aggressiveAttackScore = aggressiveEvaluations
                .find(e => e.skill.skillType === SkillType.ATTACK)?.score || 0;
            const supportiveAttackScore = supportiveEvaluations
                .find(e => e.skill.skillType === SkillType.ATTACK)?.score || 0;

            expect(aggressiveAttackScore).toBeGreaterThan(supportiveAttackScore);
        });

        test('should provide reasoning for evaluations', () => {
            const evaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                testPersonality,
                testDifficulty
            );

            for (const evaluation of evaluations) {
                expect(evaluation.reasoning).toBeDefined();
                expect(evaluation.reasoning.length).toBeGreaterThan(0);
            }
        });
    });

    describe('skill effectiveness evaluation', () => {
        test('should prioritize low-health enemies for attack skills', () => {
            // 一体を瀕死にする
            testContext.visibleEnemies[1].currentHP = 10;

            const evaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                testPersonality,
                testDifficulty
            );

            const attackEvaluations = evaluations.filter(e =>
                e.skill.skillType === SkillType.ATTACK
            );

            // 瀕死の敵を対象とする評価が高いかチェック
            const lowHealthTargetEval = attackEvaluations.find(e =>
                e.target && e.target.currentHP <= 10
            );
            const highHealthTargetEval = attackEvaluations.find(e =>
                e.target && e.target.currentHP > 50
            );

            if (lowHealthTargetEval && highHealthTargetEval) {
                expect(lowHealthTargetEval.score).toBeGreaterThan(highHealthTargetEval.score);
            }
        });

        test('should prioritize injured allies for heal skills', () => {
            // 味方を負傷させる
            testContext.visibleAllies[0].currentHP = 20;

            const evaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                testPersonality,
                testDifficulty
            );

            const healEvaluations = evaluations.filter(e =>
                e.skill.skillType === SkillType.HEAL
            );

            expect(healEvaluations.length).toBeGreaterThan(0);

            // 負傷した味方を対象にしているかチェック
            const injuredTargetEval = healEvaluations.find(e =>
                e.target && e.target.currentHP < e.target.stats.maxHP * 0.5
            );

            expect(injuredTargetEval).toBeDefined();
            if (injuredTargetEval) {
                expect(injuredTargetEval.score).toBeGreaterThan(50);
            }
        });
    });

    describe('difficulty integration', () => {
        test('should adjust skill usage frequency based on difficulty', () => {
            const easyDifficulty: DifficultySettings = {
                ...testDifficulty,
                skillUsageFrequency: 0.3
            };

            const hardDifficulty: DifficultySettings = {
                ...testDifficulty,
                skillUsageFrequency: 1.0
            };

            const easyEvaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                testPersonality,
                easyDifficulty
            );

            const hardEvaluations = skillEvaluator.evaluateSkillUsage(
                testContext,
                testPersonality,
                hardDifficulty
            );

            // 難易度が高いほどスキル使用頻度が高い
            const easyAvgScore = easyEvaluations.reduce((sum, e) => sum + e.score, 0) / easyEvaluations.length;
            const hardAvgScore = hardEvaluations.reduce((sum, e) => sum + e.score, 0) / hardEvaluations.length;

            expect(hardAvgScore).toBeGreaterThan(easyAvgScore);
        });

        test('should apply random factors based on difficulty', () => {
            const lowRandomDifficulty: DifficultySettings = {
                ...testDifficulty,
                randomnessFactor: 0.0
            };

            const highRandomDifficulty: DifficultySettings = {
                ...testDifficulty,
                randomnessFactor: 1.0
            };

            // 複数回実行して結果の分散を確認
            const lowRandomResults: number[] = [];
            const highRandomResults: number[] = [];

            for (let i = 0; i < 10; i++) {
                const lowRandomEvals = skillEvaluator.evaluateSkillUsage(
                    testContext,
                    testPersonality,
                    lowRandomDifficulty
                );
                const highRandomEvals = skillEvaluator.evaluateSkillUsage(
                    testContext,
                    testPersonality,
                    highRandomDifficulty
                );

                if (lowRandomEvals.length > 0) {
                    lowRandomResults.push(lowRandomEvals[0].score);
                }
                if (highRandomEvals.length > 0) {
                    highRandomResults.push(highRandomEvals[0].score);
                }
            }

            // 高ランダム設定の方が結果の分散が大きいかチェック
            const lowRandomVariance = calculateVariance(lowRandomResults);
            const highRandomVariance = calculateVariance(highRandomResults);

            expect(highRandomVariance).toBeGreaterThan(lowRandomVariance);
        });
    });
});

// ヘルパー関数
function calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
}

describe('AIController Skill Integration', () => {
    let aiController: TestAIController;
    let mockSkillSystem: MockSkillSystem;
    let testContext: AIContext;

    class TestAIController extends AIController {
        async makeDecision(context: AIContext) {
            const actions = this.getValidActions(context);
            return actions.length > 0 ? actions[0] : {
                type: 'wait' as any,
                priority: 0,
                reasoning: 'No valid actions'
            };
        }

        evaluatePosition(position: any, context: AIContext) {
            return 50;
        }

        getPriority(context: AIContext) {
            return 50;
        }
    }

    beforeEach(() => {
        mockSkillSystem = new MockSkillSystem();
        const integration: AISystemIntegration = {
            skillSystem: mockSkillSystem as any
        };

        const config: AIControllerConfig = {
            thinkingTimeLimit: 2000,
            enableAILogging: false,
            randomFactor: 0.1,
            npcPriorityMultiplier: 2.0
        };

        aiController = new TestAIController(
            createTestUnit('ai1', 'enemy'),
            createTestPersonality(),
            {
                thinkingDepth: 3,
                randomnessFactor: 0.2,
                mistakeProbability: 0.1,
                reactionTime: 1000,
                skillUsageFrequency: 0.8,
                thinkingTimeLimit: 2000
            },
            config,
            integration
        );

        testContext = createTestContext();
    });

    test('should include skill actions in valid actions', async () => {
        const actions = (aiController as any).getValidActions(testContext);

        const skillActions = actions.filter((action: any) => action.type === 'skill');
        expect(skillActions.length).toBeGreaterThan(0);
    });

    test('should evaluate skill actions properly', async () => {
        const actions = (aiController as any).getValidActions(testContext);
        const skillActions = actions.filter((action: any) => action.type === 'skill');

        for (const action of skillActions) {
            expect(action.priority).toBeGreaterThan(0);
            expect(action.skillId).toBeDefined();
            expect(action.reasoning).toBeDefined();
        }
    });

    test('should make skill-based decisions', async () => {
        const decision = await aiController.decideAction(testContext);

        expect(decision).toBeDefined();
        expect(decision.type).toBeDefined();
        expect(decision.priority).toBeGreaterThanOrEqual(0);
    });

    test('should check MP requirements for skills', () => {
        // MP不足の状況を作る
        testContext.currentCharacter!.currentMP = 10;

        const canUseFireball = (aiController as any).canUseSkill('fireball', testContext);
        const canUseHeal = (aiController as any).canUseSkill('heal', testContext);

        expect(canUseFireball).toBe(false); // MP不足
        expect(canUseHeal).toBe(false); // MP不足
    });

    test('should get available skills for AI', () => {
        const availableSkills = (aiController as any).getAvailableSkillsForAI(testContext);

        expect(availableSkills).toBeDefined();
        expect(Array.isArray(availableSkills)).toBe(true);
    });
});