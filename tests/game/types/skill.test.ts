/**
 * スキルシステム型定義のユニットテスト
 */

import {
    SkillType,
    TargetType,
    DamageType,
    HealType,
    BuffType,
    StatusEffectType,
    SkillUsabilityError,
    SkillData,
    SkillEffect,
    SkillResult,
    SkillUsabilityResult,
    CharacterSkillData,
    SkillExecutionContext,
    Skill,
    Position,
    AreaOfEffect,
    SkillUsageCondition,
    SkillLearnCondition,
    SkillAnimation,
    ActiveSkillEffect,
    SkillLearnRecord
} from '../../../game/src/types/skill';

describe('Skill System Type Definitions', () => {
    describe('Enums', () => {
        test('SkillType enum should have correct values', () => {
            expect(SkillType.ATTACK).toBe('attack');
            expect(SkillType.HEAL).toBe('heal');
            expect(SkillType.BUFF).toBe('buff');
            expect(SkillType.DEBUFF).toBe('debuff');
            expect(SkillType.STATUS).toBe('status');
            expect(SkillType.SPECIAL).toBe('special');
        });

        test('TargetType enum should have correct values', () => {
            expect(TargetType.SELF).toBe('self');
            expect(TargetType.SINGLE_ENEMY).toBe('single_enemy');
            expect(TargetType.SINGLE_ALLY).toBe('single_ally');
            expect(TargetType.ALL_ENEMIES).toBe('all_enemies');
            expect(TargetType.ALL_ALLIES).toBe('all_allies');
        });

        test('DamageType enum should have correct values', () => {
            expect(DamageType.PHYSICAL).toBe('physical');
            expect(DamageType.MAGICAL).toBe('magical');
            expect(DamageType.TRUE).toBe('true');
            expect(DamageType.HEAL).toBe('heal');
        });

        test('SkillUsabilityError enum should have correct values', () => {
            expect(SkillUsabilityError.INSUFFICIENT_MP).toBe('insufficient_mp');
            expect(SkillUsabilityError.SKILL_ON_COOLDOWN).toBe('skill_on_cooldown');
            expect(SkillUsabilityError.INVALID_TARGET).toBe('invalid_target');
            expect(SkillUsabilityError.OUT_OF_RANGE).toBe('out_of_range');
        });
    });

    describe('Interface Validation', () => {
        test('SkillData interface should accept valid data', () => {
            const validSkillData: SkillData = {
                id: 'fireball',
                name: 'ファイアボール',
                description: '火の玉を放つ攻撃魔法',
                skillType: SkillType.ATTACK,
                targetType: TargetType.SINGLE_ENEMY,
                range: 3,
                areaOfEffect: {
                    shape: 'single',
                    size: 1
                },
                effects: [{
                    type: 'damage',
                    value: 50,
                    damageType: DamageType.MAGICAL
                }],
                usageCondition: {
                    mpCost: 10,
                    cooldown: 0,
                    usageLimit: 0,
                    levelRequirement: 5
                },
                learnCondition: {
                    level: 5
                },
                animation: {
                    castAnimation: 'cast_fire',
                    effectAnimation: 'fireball_effect',
                    duration: 1000
                }
            };

            expect(validSkillData.id).toBe('fireball');
            expect(validSkillData.skillType).toBe(SkillType.ATTACK);
            expect(validSkillData.effects).toHaveLength(1);
            expect(validSkillData.effects[0].type).toBe('damage');
        });

        test('SkillEffect interface should support different effect types', () => {
            const damageEffect: SkillEffect = {
                type: 'damage',
                value: 100,
                damageType: DamageType.PHYSICAL
            };

            const healEffect: SkillEffect = {
                type: 'heal',
                value: 50,
                healType: HealType.FIXED
            };

            const buffEffect: SkillEffect = {
                type: 'buff',
                value: 20,
                duration: 3,
                buffType: BuffType.ATTACK_UP
            };

            const statusEffect: SkillEffect = {
                type: 'status',
                value: 1,
                duration: 2,
                statusType: StatusEffectType.POISON,
                successRate: 80
            };

            expect(damageEffect.type).toBe('damage');
            expect(healEffect.type).toBe('heal');
            expect(buffEffect.type).toBe('buff');
            expect(statusEffect.type).toBe('status');
            expect(statusEffect.successRate).toBe(80);
        });

        test('SkillResult interface should contain execution results', () => {
            const skillResult: SkillResult = {
                success: true,
                targets: ['enemy1', 'enemy2'],
                effects: [
                    {
                        targetId: 'enemy1',
                        effectType: 'damage',
                        actualValue: 95,
                        isCritical: true,
                        success: true
                    },
                    {
                        targetId: 'enemy2',
                        effectType: 'damage',
                        actualValue: 80,
                        success: true
                    }
                ],
                mpCost: 15
            };

            expect(skillResult.success).toBe(true);
            expect(skillResult.targets).toHaveLength(2);
            expect(skillResult.effects[0].isCritical).toBe(true);
            expect(skillResult.effects[1].actualValue).toBe(80);
        });

        test('SkillUsabilityResult interface should indicate usability', () => {
            const canUseResult: SkillUsabilityResult = {
                canUse: true,
                remainingUses: 5
            };

            const cannotUseResult: SkillUsabilityResult = {
                canUse: false,
                error: SkillUsabilityError.INSUFFICIENT_MP,
                message: 'MP不足です',
                missingMP: 5
            };

            expect(canUseResult.canUse).toBe(true);
            expect(cannotUseResult.canUse).toBe(false);
            expect(cannotUseResult.error).toBe(SkillUsabilityError.INSUFFICIENT_MP);
            expect(cannotUseResult.missingMP).toBe(5);
        });

        test('CharacterSkillData interface should manage character skill state', () => {
            const characterSkillData: CharacterSkillData = {
                characterId: 'player1',
                learnedSkills: ['fireball', 'heal', 'shield'],
                skillCooldowns: new Map([
                    ['fireball', 2],
                    ['heal', 0]
                ]),
                skillUsageCounts: new Map([
                    ['fireball', 3],
                    ['heal', 1]
                ]),
                skillLearnHistory: [
                    {
                        skillId: 'fireball',
                        learnedAtLevel: 5,
                        learnedAt: new Date('2024-01-01'),
                        learnMethod: 'level_up'
                    }
                ],
                activeEffects: [
                    {
                        effectId: 'buff1',
                        effectType: BuffType.ATTACK_UP,
                        value: 20,
                        remainingDuration: 3,
                        sourceSkillId: 'bless',
                        casterId: 'ally1',
                        appliedAt: new Date()
                    }
                ]
            };

            expect(characterSkillData.learnedSkills).toContain('fireball');
            expect(characterSkillData.skillCooldowns.get('fireball')).toBe(2);
            expect(characterSkillData.skillUsageCounts.get('heal')).toBe(1);
            expect(characterSkillData.skillLearnHistory).toHaveLength(1);
            expect(characterSkillData.activeEffects[0].effectType).toBe(BuffType.ATTACK_UP);
        });
    });

    describe('Skill Base Class', () => {
        // テスト用のスキル実装
        class TestSkill extends Skill {
            async execute(context: SkillExecutionContext): Promise<SkillResult> {
                return {
                    success: true,
                    targets: ['test'],
                    effects: [],
                    mpCost: this.usageCondition.mpCost
                };
            }

            canUse(casterId: string, targetPosition: Position, battlefieldState: any): SkillUsabilityResult {
                return { canUse: true };
            }

            getValidTargets(casterPosition: Position, battlefieldState: any): Position[] {
                return [{ x: 0, y: 0 }];
            }
        }

        test('Skill base class should provide data access', () => {
            const skillData: SkillData = {
                id: 'test_skill',
                name: 'テストスキル',
                description: 'テスト用のスキル',
                skillType: SkillType.ATTACK,
                targetType: TargetType.SINGLE_ENEMY,
                range: 2,
                areaOfEffect: { shape: 'single', size: 1 },
                effects: [{ type: 'damage', value: 30 }],
                usageCondition: {
                    mpCost: 5,
                    cooldown: 1,
                    usageLimit: 0,
                    levelRequirement: 1
                },
                learnCondition: { level: 1 },
                animation: {
                    castAnimation: 'test_cast',
                    effectAnimation: 'test_effect',
                    duration: 500
                }
            };

            const skill = new TestSkill(skillData);

            expect(skill.id).toBe('test_skill');
            expect(skill.name).toBe('テストスキル');
            expect(skill.skillType).toBe(SkillType.ATTACK);
            expect(skill.range).toBe(2);
            expect(skill.usageCondition.mpCost).toBe(5);
        });

        test('getAffectedPositions should calculate area correctly', () => {
            const skillData: SkillData = {
                id: 'area_skill',
                name: 'エリアスキル',
                description: 'エリア攻撃スキル',
                skillType: SkillType.ATTACK,
                targetType: TargetType.AREA_ENEMY,
                range: 3,
                areaOfEffect: { shape: 'cross', size: 1 },
                effects: [{ type: 'damage', value: 40 }],
                usageCondition: {
                    mpCost: 8,
                    cooldown: 2,
                    usageLimit: 0,
                    levelRequirement: 3
                },
                learnCondition: { level: 3 },
                animation: {
                    castAnimation: 'area_cast',
                    effectAnimation: 'area_effect',
                    duration: 800
                }
            };

            const skill = new TestSkill(skillData);
            const targetPosition = { x: 5, y: 5 };
            const affectedPositions = skill.getAffectedPositions(targetPosition);

            // 十字形状なので中心 + 上下左右1マスずつ = 5マス
            expect(affectedPositions).toHaveLength(5);
            expect(affectedPositions).toContainEqual({ x: 5, y: 5 }); // 中心
            expect(affectedPositions).toContainEqual({ x: 6, y: 5 }); // 右
            expect(affectedPositions).toContainEqual({ x: 4, y: 5 }); // 左
            expect(affectedPositions).toContainEqual({ x: 5, y: 6 }); // 下
            expect(affectedPositions).toContainEqual({ x: 5, y: 4 }); // 上
        });

        test('getAffectedPositions should handle different shapes', () => {
            const createSkillWithShape = (shape: string, size: number): TestSkill => {
                const skillData: SkillData = {
                    id: 'shape_test',
                    name: 'シェイプテスト',
                    description: 'シェイプテスト用',
                    skillType: SkillType.ATTACK,
                    targetType: TargetType.AREA_ENEMY,
                    range: 3,
                    areaOfEffect: { shape: shape as any, size },
                    effects: [{ type: 'damage', value: 30 }],
                    usageCondition: {
                        mpCost: 5,
                        cooldown: 0,
                        usageLimit: 0,
                        levelRequirement: 1
                    },
                    learnCondition: { level: 1 },
                    animation: {
                        castAnimation: 'test',
                        effectAnimation: 'test',
                        duration: 100
                    }
                };
                return new TestSkill(skillData);
            };

            // 単体対象
            const singleSkill = createSkillWithShape('single', 1);
            expect(singleSkill.getAffectedPositions({ x: 0, y: 0 })).toHaveLength(1);

            // 正方形範囲
            const squareSkill = createSkillWithShape('square', 1);
            const squarePositions = squareSkill.getAffectedPositions({ x: 0, y: 0 });
            expect(squarePositions).toHaveLength(9); // 3x3の正方形

            // 円形範囲
            const circleSkill = createSkillWithShape('circle', 1);
            const circlePositions = circleSkill.getAffectedPositions({ x: 0, y: 0 });
            expect(circlePositions.length).toBeGreaterThan(0);
            expect(circlePositions.length).toBeLessThanOrEqual(9);
        });
    });

    describe('Type Safety', () => {
        test('should enforce correct enum usage', () => {
            const effect: SkillEffect = {
                type: 'damage',
                value: 50,
                damageType: DamageType.PHYSICAL // 正しい列挙値
            };

            expect(effect.damageType).toBe('physical');
        });

        test('should handle optional properties correctly', () => {
            const basicEffect: SkillEffect = {
                type: 'damage',
                value: 30
                // オプショナルプロパティは省略可能
            };

            const detailedEffect: SkillEffect = {
                type: 'status',
                value: 1,
                duration: 3,
                statusType: StatusEffectType.POISON,
                successRate: 75
            };

            expect(basicEffect.duration).toBeUndefined();
            expect(detailedEffect.duration).toBe(3);
            expect(detailedEffect.successRate).toBe(75);
        });

        test('should validate Map usage in CharacterSkillData', () => {
            const cooldowns = new Map<string, number>();
            cooldowns.set('fireball', 3);
            cooldowns.set('heal', 0);

            const usageCounts = new Map<string, number>();
            usageCounts.set('fireball', 5);

            const characterData: CharacterSkillData = {
                characterId: 'test',
                learnedSkills: ['fireball', 'heal'],
                skillCooldowns: cooldowns,
                skillUsageCounts: usageCounts,
                skillLearnHistory: [],
                activeEffects: []
            };

            expect(characterData.skillCooldowns.get('fireball')).toBe(3);
            expect(characterData.skillCooldowns.get('heal')).toBe(0);
            expect(characterData.skillUsageCounts.get('fireball')).toBe(5);
            expect(characterData.skillUsageCounts.get('nonexistent')).toBeUndefined();
        });
    });

    describe('Complex Data Structures', () => {
        test('should handle nested skill effects', () => {
            const complexSkillData: SkillData = {
                id: 'complex_skill',
                name: '複合スキル',
                description: '複数の効果を持つスキル',
                skillType: SkillType.SPECIAL,
                targetType: TargetType.AREA_ANY,
                range: 2,
                areaOfEffect: { shape: 'circle', size: 2 },
                effects: [
                    {
                        type: 'damage',
                        value: 60,
                        damageType: DamageType.MAGICAL
                    },
                    {
                        type: 'debuff',
                        value: 15,
                        duration: 3,
                        buffType: BuffType.DEFENSE_DOWN,
                        successRate: 90
                    },
                    {
                        type: 'status',
                        value: 1,
                        duration: 2,
                        statusType: StatusEffectType.POISON,
                        successRate: 70
                    }
                ],
                usageCondition: {
                    mpCost: 25,
                    cooldown: 5,
                    usageLimit: 3,
                    levelRequirement: 15,
                    weaponRequirement: ['staff', 'wand']
                },
                learnCondition: {
                    level: 15,
                    prerequisiteSkills: ['fireball', 'poison_dart'],
                    jobRequirement: 'mage'
                },
                animation: {
                    castAnimation: 'complex_cast',
                    effectAnimation: 'complex_effect',
                    hitAnimation: 'complex_hit',
                    duration: 2000,
                    soundEffect: 'complex_sound'
                },
                aiPriority: 8
            };

            expect(complexSkillData.effects).toHaveLength(3);
            expect(complexSkillData.effects[0].type).toBe('damage');
            expect(complexSkillData.effects[1].type).toBe('debuff');
            expect(complexSkillData.effects[2].type).toBe('status');
            expect(complexSkillData.usageCondition.weaponRequirement).toContain('staff');
            expect(complexSkillData.learnCondition.prerequisiteSkills).toContain('fireball');
        });

        test('should handle skill execution context', () => {
            const context: SkillExecutionContext = {
                caster: 'player1',
                skillId: 'fireball',
                targetPosition: { x: 5, y: 3 },
                battlefieldState: {
                    units: [],
                    terrain: []
                },
                currentTurn: 15,
                executionTime: new Date()
            };

            expect(context.caster).toBe('player1');
            expect(context.targetPosition.x).toBe(5);
            expect(context.currentTurn).toBe(15);
            expect(context.executionTime).toBeInstanceOf(Date);
        });
    });
});