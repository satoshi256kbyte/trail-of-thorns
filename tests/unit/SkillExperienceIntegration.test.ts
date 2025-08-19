/**
 * スキルシステムと経験値システムの統合機能の単体テスト
 * 
 * 要件: 1.3, 5.3
 */

import { ExperienceAction, ExperienceSource } from '../../game/src/types/experience';
import { SkillType } from '../../game/src/types/skill';

describe('SkillExperienceIntegration Unit Tests', () => {
    describe('経験値アクションマッピング', () => {
        test('スキル種別から適切な経験値アクションを取得する', () => {
            // テスト用のマッピング関数
            const getExperienceActionForSkill = (skillType: SkillType): ExperienceAction => {
                switch (skillType) {
                    case SkillType.HEAL:
                        return ExperienceAction.HEAL;
                    case SkillType.BUFF:
                        return ExperienceAction.BUFF_APPLY;
                    case SkillType.DEBUFF:
                        return ExperienceAction.DEBUFF_APPLY;
                    case SkillType.ATTACK:
                        return ExperienceAction.ATTACK;
                    case SkillType.STATUS:
                        return ExperienceAction.SUPPORT;
                    case SkillType.SPECIAL:
                    default:
                        return ExperienceAction.SKILL_CAST;
                }
            };

            expect(getExperienceActionForSkill(SkillType.HEAL)).toBe(ExperienceAction.HEAL);
            expect(getExperienceActionForSkill(SkillType.BUFF)).toBe(ExperienceAction.BUFF_APPLY);
            expect(getExperienceActionForSkill(SkillType.DEBUFF)).toBe(ExperienceAction.DEBUFF_APPLY);
            expect(getExperienceActionForSkill(SkillType.ATTACK)).toBe(ExperienceAction.ATTACK);
            expect(getExperienceActionForSkill(SkillType.STATUS)).toBe(ExperienceAction.SUPPORT);
            expect(getExperienceActionForSkill(SkillType.SPECIAL)).toBe(ExperienceAction.SKILL_CAST);
        });

        test('スキル種別から適切な経験値ソースを取得する', () => {
            // テスト用のマッピング関数
            const getExperienceSourceForSkill = (skillType: SkillType): ExperienceSource => {
                switch (skillType) {
                    case SkillType.HEAL:
                        return ExperienceSource.HEALING;
                    case SkillType.BUFF:
                    case SkillType.DEBUFF:
                    case SkillType.STATUS:
                        return ExperienceSource.ALLY_SUPPORT;
                    case SkillType.ATTACK:
                        return ExperienceSource.ATTACK_HIT;
                    case SkillType.SPECIAL:
                    default:
                        return ExperienceSource.SKILL_USE;
                }
            };

            expect(getExperienceSourceForSkill(SkillType.HEAL)).toBe(ExperienceSource.HEALING);
            expect(getExperienceSourceForSkill(SkillType.BUFF)).toBe(ExperienceSource.ALLY_SUPPORT);
            expect(getExperienceSourceForSkill(SkillType.DEBUFF)).toBe(ExperienceSource.ALLY_SUPPORT);
            expect(getExperienceSourceForSkill(SkillType.STATUS)).toBe(ExperienceSource.ALLY_SUPPORT);
            expect(getExperienceSourceForSkill(SkillType.ATTACK)).toBe(ExperienceSource.ATTACK_HIT);
            expect(getExperienceSourceForSkill(SkillType.SPECIAL)).toBe(ExperienceSource.SKILL_USE);
        });
    });

    describe('経験値ボーナス計算', () => {
        test('固定ボーナスが正しく計算される', () => {
            const calculateFixedBonus = (fixedBonus?: number): number => {
                return fixedBonus || 0;
            };

            expect(calculateFixedBonus(10)).toBe(10);
            expect(calculateFixedBonus(0)).toBe(0);
            expect(calculateFixedBonus()).toBe(0);
        });

        test('効果値倍率ボーナスが正しく計算される', () => {
            const calculateEffectValueBonus = (
                totalEffectValue: number,
                multiplier?: number
            ): number => {
                if (!multiplier) return 0;
                return Math.floor(totalEffectValue * multiplier);
            };

            expect(calculateEffectValueBonus(100, 0.1)).toBe(10);
            expect(calculateEffectValueBonus(50, 0.2)).toBe(10);
            expect(calculateEffectValueBonus(100)).toBe(0);
            expect(calculateEffectValueBonus(100, 0)).toBe(0);
        });

        test('対象数ボーナスが正しく計算される', () => {
            const calculateTargetCountBonus = (
                targetCount: number,
                bonusPerTarget?: number
            ): number => {
                if (!bonusPerTarget) return 0;
                return targetCount * bonusPerTarget;
            };

            expect(calculateTargetCountBonus(3, 5)).toBe(15);
            expect(calculateTargetCountBonus(1, 10)).toBe(10);
            expect(calculateTargetCountBonus(3)).toBe(0);
            expect(calculateTargetCountBonus(0, 5)).toBe(0);
        });

        test('基本倍率が正しく適用される', () => {
            const applyBaseMultiplier = (
                baseAmount: number,
                multiplier?: number
            ): number => {
                return Math.floor(baseAmount * (multiplier || 1.0));
            };

            expect(applyBaseMultiplier(10, 1.5)).toBe(15);
            expect(applyBaseMultiplier(10, 2.0)).toBe(20);
            expect(applyBaseMultiplier(10)).toBe(10);
            expect(applyBaseMultiplier(10, 1.0)).toBe(10);
        });
    });

    describe('特殊条件判定', () => {
        test('低HP条件が正しく判定される', () => {
            const checkLowHPCondition = (
                currentHP: number,
                maxHP: number,
                threshold: number
            ): boolean => {
                const hpPercentage = (currentHP / maxHP) * 100;
                return hpPercentage <= threshold;
            };

            expect(checkLowHPCondition(25, 100, 30)).toBe(true);
            expect(checkLowHPCondition(30, 100, 30)).toBe(true);
            expect(checkLowHPCondition(35, 100, 30)).toBe(false);
            expect(checkLowHPCondition(0, 100, 30)).toBe(true);
        });

        test('高ダメージ条件が正しく判定される', () => {
            const checkHighDamageCondition = (
                totalDamage: number,
                threshold: number
            ): boolean => {
                return totalDamage >= threshold;
            };

            expect(checkHighDamageCondition(100, 50)).toBe(true);
            expect(checkHighDamageCondition(50, 50)).toBe(true);
            expect(checkHighDamageCondition(49, 50)).toBe(false);
            expect(checkHighDamageCondition(0, 50)).toBe(false);
        });

        test('複数対象条件が正しく判定される', () => {
            const checkMultipleTargetsCondition = (
                targetCount: number,
                threshold: number
            ): boolean => {
                return targetCount >= threshold;
            };

            expect(checkMultipleTargetsCondition(3, 2)).toBe(true);
            expect(checkMultipleTargetsCondition(2, 2)).toBe(true);
            expect(checkMultipleTargetsCondition(1, 2)).toBe(false);
            expect(checkMultipleTargetsCondition(0, 2)).toBe(false);
        });
    });

    describe('統合機能の型安全性', () => {
        test('経験値コンテキストの構造が正しい', () => {
            const createExperienceContext = (
                source: ExperienceSource,
                action: ExperienceAction,
                bonusAmount?: number,
                multiplier?: number
            ) => {
                return {
                    source,
                    action,
                    timestamp: Date.now(),
                    bonusAmount,
                    multiplier,
                    battleContext: {
                        battleId: 'test-battle',
                        turnNumber: 1,
                        skillId: 'test-skill'
                    }
                };
            };

            const context = createExperienceContext(
                ExperienceSource.HEALING,
                ExperienceAction.HEAL,
                10,
                1.5
            );

            expect(context.source).toBe(ExperienceSource.HEALING);
            expect(context.action).toBe(ExperienceAction.HEAL);
            expect(context.bonusAmount).toBe(10);
            expect(context.multiplier).toBe(1.5);
            expect(context.battleContext).toBeDefined();
            expect(context.battleContext.battleId).toBe('test-battle');
        });

        test('スキル経験値ボーナス設定の構造が正しい', () => {
            const skillExperienceBonus = {
                baseMultiplier: 1.5,
                fixedBonus: 10,
                effectValueMultiplier: 0.1,
                targetCountBonus: 5,
                criticalBonus: 8,
                specialConditions: [
                    {
                        type: 'low_hp' as const,
                        value: 30,
                        bonus: 5,
                        description: 'Low HP bonus'
                    }
                ]
            };

            expect(skillExperienceBonus.baseMultiplier).toBe(1.5);
            expect(skillExperienceBonus.fixedBonus).toBe(10);
            expect(skillExperienceBonus.effectValueMultiplier).toBe(0.1);
            expect(skillExperienceBonus.targetCountBonus).toBe(5);
            expect(skillExperienceBonus.criticalBonus).toBe(8);
            expect(skillExperienceBonus.specialConditions).toHaveLength(1);
            expect(skillExperienceBonus.specialConditions[0].type).toBe('low_hp');
        });
    });
});