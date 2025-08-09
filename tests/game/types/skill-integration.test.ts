/**
 * スキルシステム型定義の統合テスト
 * 既存システムとの型互換性を検証
 */

import {
    SkillData,
    SkillType,
    TargetType,
    DamageType,
    SkillUsabilityError,
    CharacterSkillData
} from '../../../game/src/types/skill';
import { Position } from '../../../game/src/types/gameplay';

describe('Skill System Integration Tests', () => {
    describe('Type Compatibility', () => {
        test('should be compatible with existing Position type', () => {
            const position: Position = { x: 5, y: 3 };

            // スキルシステムでPositionを使用
            const skillData: SkillData = {
                id: 'test',
                name: 'テスト',
                description: 'テスト用',
                skillType: SkillType.ATTACK,
                targetType: TargetType.SINGLE_ENEMY,
                range: 2,
                areaOfEffect: { shape: 'single', size: 1 },
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

            expect(position.x).toBe(5);
            expect(position.y).toBe(3);
            expect(skillData.range).toBe(2);
        });

        test('should handle skill data serialization', () => {
            const skillData: SkillData = {
                id: 'fireball',
                name: 'ファイアボール',
                description: '火の玉を放つ',
                skillType: SkillType.ATTACK,
                targetType: TargetType.SINGLE_ENEMY,
                range: 3,
                areaOfEffect: { shape: 'single', size: 1 },
                effects: [{
                    type: 'damage',
                    value: 50,
                    damageType: DamageType.MAGICAL
                }],
                usageCondition: {
                    mpCost: 10,
                    cooldown: 2,
                    usageLimit: 0,
                    levelRequirement: 5
                },
                learnCondition: {
                    level: 5,
                    prerequisiteSkills: ['basic_magic']
                },
                animation: {
                    castAnimation: 'fire_cast',
                    effectAnimation: 'fireball_effect',
                    duration: 1500
                }
            };

            // JSONシリアライゼーション/デシリアライゼーションのテスト
            const serialized = JSON.stringify(skillData);
            const deserialized = JSON.parse(serialized) as SkillData;

            expect(deserialized.id).toBe('fireball');
            expect(deserialized.skillType).toBe(SkillType.ATTACK);
            expect(deserialized.effects[0].damageType).toBe(DamageType.MAGICAL);
            expect(deserialized.learnCondition.prerequisiteSkills).toContain('basic_magic');
        });

        test('should handle character skill data with Maps', () => {
            const characterSkillData: CharacterSkillData = {
                characterId: 'player1',
                learnedSkills: ['fireball', 'heal', 'shield'],
                skillCooldowns: new Map([
                    ['fireball', 2],
                    ['heal', 0],
                    ['shield', 1]
                ]),
                skillUsageCounts: new Map([
                    ['fireball', 5],
                    ['heal', 3],
                    ['shield', 2]
                ]),
                skillLearnHistory: [
                    {
                        skillId: 'fireball',
                        learnedAtLevel: 5,
                        learnedAt: new Date('2024-01-15'),
                        learnMethod: 'level_up'
                    },
                    {
                        skillId: 'heal',
                        learnedAtLevel: 3,
                        learnedAt: new Date('2024-01-10'),
                        learnMethod: 'level_up'
                    }
                ],
                activeEffects: []
            };

            // Map操作のテスト
            expect(characterSkillData.skillCooldowns.has('fireball')).toBe(true);
            expect(characterSkillData.skillCooldowns.get('fireball')).toBe(2);
            expect(characterSkillData.skillUsageCounts.get('heal')).toBe(3);

            // 配列操作のテスト
            expect(characterSkillData.learnedSkills).toHaveLength(3);
            expect(characterSkillData.skillLearnHistory).toHaveLength(2);
            expect(characterSkillData.skillLearnHistory[0].skillId).toBe('fireball');
        });

        test('should validate error handling types', () => {
            const errors = [
                SkillUsabilityError.INSUFFICIENT_MP,
                SkillUsabilityError.SKILL_ON_COOLDOWN,
                SkillUsabilityError.INVALID_TARGET,
                SkillUsabilityError.OUT_OF_RANGE,
                SkillUsabilityError.USAGE_LIMIT_EXCEEDED
            ];

            errors.forEach(error => {
                expect(typeof error).toBe('string');
                expect(error.length).toBeGreaterThan(0);
            });

            // エラーメッセージのマッピングテスト
            const errorMessages: Record<SkillUsabilityError, string> = {
                [SkillUsabilityError.INSUFFICIENT_MP]: 'MP不足です',
                [SkillUsabilityError.SKILL_ON_COOLDOWN]: 'スキルはクールダウン中です',
                [SkillUsabilityError.USAGE_LIMIT_EXCEEDED]: '使用回数制限に達しています',
                [SkillUsabilityError.LEVEL_REQUIREMENT_NOT_MET]: 'レベル要件を満たしていません',
                [SkillUsabilityError.WEAPON_REQUIREMENT_NOT_MET]: '武器要件を満たしていません',
                [SkillUsabilityError.JOB_REQUIREMENT_NOT_MET]: '職業要件を満たしていません',
                [SkillUsabilityError.INVALID_TARGET]: '無効な対象です',
                [SkillUsabilityError.OUT_OF_RANGE]: '射程外です',
                [SkillUsabilityError.SKILL_NOT_FOUND]: 'スキルが見つかりません',
                [SkillUsabilityError.CHARACTER_ALREADY_ACTED]: 'キャラクターは既に行動済みです',
                [SkillUsabilityError.CHARACTER_STATUS_PREVENTS_USE]: '状態異常により使用できません'
            };

            expect(errorMessages[SkillUsabilityError.INSUFFICIENT_MP]).toBe('MP不足です');
            expect(errorMessages[SkillUsabilityError.SKILL_ON_COOLDOWN]).toBe('スキルはクールダウン中です');
        });
    });

    describe('Data Validation', () => {
        test('should validate skill data structure', () => {
            const isValidSkillData = (data: any): data is SkillData => {
                return (
                    typeof data.id === 'string' &&
                    typeof data.name === 'string' &&
                    typeof data.description === 'string' &&
                    Object.values(SkillType).includes(data.skillType) &&
                    Object.values(TargetType).includes(data.targetType) &&
                    typeof data.range === 'number' &&
                    data.areaOfEffect !== undefined &&
                    Array.isArray(data.effects) &&
                    data.usageCondition !== undefined &&
                    data.learnCondition !== undefined &&
                    data.animation !== undefined
                );
            };

            const validData = {
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

            const invalidData = {
                id: 'invalid',
                name: 'Invalid',
                // 必要なプロパティが不足
            };

            expect(isValidSkillData(validData)).toBe(true);
            expect(isValidSkillData(invalidData)).toBe(false);
        });

        test('should handle complex skill configurations', () => {
            const complexSkill: SkillData = {
                id: 'meteor_storm',
                name: 'メテオストーム',
                description: '広範囲に隕石を降らせる最上級魔法',
                skillType: SkillType.ATTACK,
                targetType: TargetType.AREA_ENEMY,
                range: 5,
                areaOfEffect: {
                    shape: 'circle',
                    size: 3,
                    minRange: 1
                },
                effects: [
                    {
                        type: 'damage',
                        value: 120,
                        damageType: DamageType.MAGICAL
                    },
                    {
                        type: 'debuff',
                        value: 25,
                        duration: 3,
                        buffType: 'defense_down' as any,
                        successRate: 80
                    }
                ],
                usageCondition: {
                    mpCost: 50,
                    cooldown: 8,
                    usageLimit: 2,
                    levelRequirement: 25,
                    weaponRequirement: ['legendary_staff'],
                    jobRequirement: 'archmage'
                },
                learnCondition: {
                    level: 25,
                    prerequisiteSkills: ['fireball', 'meteor', 'area_magic'],
                    jobRequirement: 'archmage',
                    requiredItems: ['meteor_scroll']
                },
                animation: {
                    castAnimation: 'meteor_cast',
                    effectAnimation: 'meteor_storm',
                    hitAnimation: 'meteor_impact',
                    duration: 4000,
                    soundEffect: 'meteor_sound'
                },
                icon: 'meteor_storm_icon',
                aiPriority: 10
            };

            expect(complexSkill.effects).toHaveLength(2);
            expect(complexSkill.areaOfEffect.minRange).toBe(1);
            expect(complexSkill.usageCondition.weaponRequirement).toContain('legendary_staff');
            expect(complexSkill.learnCondition.requiredItems).toContain('meteor_scroll');
            expect(complexSkill.aiPriority).toBe(10);
        });
    });
});