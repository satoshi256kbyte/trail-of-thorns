/**
 * SkillManager のユニットテスト
 */

import {
    SkillManager,
    SkillManagerError,
    SkillManagerResult,
    SkillLearnResult
} from '../../../../game/src/systems/skills/SkillManager';

import {
    SkillData,
    SkillType,
    TargetType,
    DamageType,
    HealType,
    BuffType,
    StatusEffectType,
    CharacterSkillData
} from '../../../../game/src/types/skill';

describe('SkillManager', () => {
    let skillManager: SkillManager;

    // テスト用のスキルデータ
    const createMockSkillData = (overrides: Partial<SkillData> = {}): SkillData => ({
        id: 'test-skill-001',
        name: 'テストスキル',
        description: 'テスト用のスキルです',
        skillType: SkillType.ATTACK,
        targetType: TargetType.SINGLE_ENEMY,
        range: 1,
        areaOfEffect: {
            shape: 'single',
            size: 1
        },
        effects: [
            {
                type: 'damage',
                value: 100,
                damageType: DamageType.PHYSICAL
            }
        ],
        usageCondition: {
            mpCost: 10,
            cooldown: 0,
            usageLimit: 0,
            levelRequirement: 1
        },
        learnCondition: {
            level: 1
        },
        animation: {
            castAnimation: 'cast',
            effectAnimation: 'effect',
            duration: 1000
        },
        ...overrides
    });

    // テスト用のキャラクターデータ
    const createMockCharacterData = (overrides: any = {}) => ({
        id: 'test-character-001',
        name: 'テストキャラクター',
        level: 5,
        job: 'warrior',
        inventory: [],
        ...overrides
    });

    beforeEach(() => {
        skillManager = new SkillManager();
    });

    describe('registerSkill', () => {
        test('有効なスキルデータで正常に登録できる', () => {
            const skillData = createMockSkillData();
            const result = skillManager.registerSkill(skillData);

            expect(result.success).toBe(true);
            expect(result.message).toContain('テストスキル');
            expect(skillManager.getSkillCount()).toBe(1);
        });

        test('同じIDのスキルを重複登録しようとするとエラーになる', () => {
            const skillData = createMockSkillData();

            // 1回目の登録は成功
            const firstResult = skillManager.registerSkill(skillData);
            expect(firstResult.success).toBe(true);

            // 2回目の登録は失敗
            const secondResult = skillManager.registerSkill(skillData);
            expect(secondResult.success).toBe(false);
            expect(secondResult.error).toBe(SkillManagerError.SKILL_ALREADY_REGISTERED);
        });

        test('無効なスキルデータでエラーになる', () => {
            const invalidSkillData = createMockSkillData({
                id: '', // 無効なID
                name: ''  // 無効な名前
            });

            const result = skillManager.registerSkill(invalidSkillData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.INVALID_SKILL_DATA);
        });

        test('無効なスキル種別でエラーになる', () => {
            const invalidSkillData = createMockSkillData({
                skillType: 'invalid_type' as SkillType
            });

            const result = skillManager.registerSkill(invalidSkillData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.INVALID_SKILL_DATA);
        });

        test('負の射程でエラーになる', () => {
            const invalidSkillData = createMockSkillData({
                range: -1
            });

            const result = skillManager.registerSkill(invalidSkillData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.INVALID_SKILL_DATA);
        });

        test('効果が設定されていない場合エラーになる', () => {
            const invalidSkillData = createMockSkillData({
                effects: []
            });

            const result = skillManager.registerSkill(invalidSkillData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.INVALID_SKILL_DATA);
        });

        test('負のMP消費量でエラーになる', () => {
            const invalidSkillData = createMockSkillData({
                usageCondition: {
                    mpCost: -10,
                    cooldown: 0,
                    usageLimit: 0,
                    levelRequirement: 1
                }
            });

            const result = skillManager.registerSkill(invalidSkillData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.INVALID_SKILL_DATA);
        });
    });

    describe('getSkill', () => {
        test('登録済みのスキルを取得できる', () => {
            const skillData = createMockSkillData();
            skillManager.registerSkill(skillData);

            const skill = skillManager.getSkill(skillData.id);
            expect(skill).not.toBeNull();
            expect(skill!.id).toBe(skillData.id);
            expect(skill!.name).toBe(skillData.name);
        });

        test('存在しないスキルIDでnullが返される', () => {
            const skill = skillManager.getSkill('non-existent-skill');
            expect(skill).toBeNull();
        });
    });

    describe('getSkillData', () => {
        test('登録済みのスキルデータを取得できる', () => {
            const skillData = createMockSkillData();
            skillManager.registerSkill(skillData);

            const retrievedData = skillManager.getSkillData(skillData.id);
            expect(retrievedData).not.toBeNull();
            expect(retrievedData!.id).toBe(skillData.id);
            expect(retrievedData!.name).toBe(skillData.name);
        });

        test('存在しないスキルIDでnullが返される', () => {
            const skillData = skillManager.getSkillData('non-existent-skill');
            expect(skillData).toBeNull();
        });
    });

    describe('getAllSkills', () => {
        beforeEach(() => {
            // 複数のスキルを登録
            const attackSkill = createMockSkillData({
                id: 'attack-skill',
                name: '攻撃スキル',
                skillType: SkillType.ATTACK
            });

            const healSkill = createMockSkillData({
                id: 'heal-skill',
                name: '回復スキル',
                skillType: SkillType.HEAL,
                targetType: TargetType.SINGLE_ALLY
            });

            const buffSkill = createMockSkillData({
                id: 'buff-skill',
                name: 'バフスキル',
                skillType: SkillType.BUFF,
                usageCondition: {
                    mpCost: 5,
                    cooldown: 0,
                    usageLimit: 0,
                    levelRequirement: 3
                }
            });

            skillManager.registerSkill(attackSkill);
            skillManager.registerSkill(healSkill);
            skillManager.registerSkill(buffSkill);
        });

        test('全スキルを取得できる', () => {
            const allSkills = skillManager.getAllSkills();
            expect(allSkills).toHaveLength(3);
        });

        test('スキル種別でフィルタリングできる', () => {
            const attackSkills = skillManager.getAllSkills({
                skillType: SkillType.ATTACK
            });
            expect(attackSkills).toHaveLength(1);
            expect(attackSkills[0].skillType).toBe(SkillType.ATTACK);
        });

        test('対象種別でフィルタリングできる', () => {
            const allyTargetSkills = skillManager.getAllSkills({
                targetType: TargetType.SINGLE_ALLY
            });
            expect(allyTargetSkills).toHaveLength(1);
            expect(allyTargetSkills[0].targetType).toBe(TargetType.SINGLE_ALLY);
        });

        test('最小レベルでフィルタリングできる', () => {
            const highLevelSkills = skillManager.getAllSkills({
                minLevel: 3
            });
            expect(highLevelSkills).toHaveLength(1);
            expect(highLevelSkills[0].usageCondition.levelRequirement).toBeGreaterThanOrEqual(3);
        });
    });

    describe('getCharacterSkills', () => {
        test('キャラクターが習得しているスキルを取得できる', () => {
            const skillData = createMockSkillData();
            const characterData = createMockCharacterData();

            skillManager.registerSkill(skillData);
            skillManager.learnSkill(characterData.id, skillData.id, characterData);

            const characterSkills = skillManager.getCharacterSkills(characterData.id);
            expect(characterSkills).toHaveLength(1);
            expect(characterSkills[0].id).toBe(skillData.id);
        });

        test('存在しないキャラクターで空配列が返される', () => {
            const characterSkills = skillManager.getCharacterSkills('non-existent-character');
            expect(characterSkills).toHaveLength(0);
        });
    });

    describe('canLearnSkill', () => {
        let skillData: SkillData;
        let characterData: any;

        beforeEach(() => {
            skillData = createMockSkillData({
                learnCondition: {
                    level: 5,
                    jobRequirement: 'warrior'
                }
            });
            characterData = createMockCharacterData({
                level: 5,
                job: 'warrior'
            });
            skillManager.registerSkill(skillData);
        });

        test('条件を満たしている場合、習得可能と判定される', () => {
            const result = skillManager.canLearnSkill(characterData.id, skillData.id, characterData);
            expect(result.success).toBe(true);
        });

        test('レベルが不足している場合、習得不可と判定される', () => {
            characterData.level = 3;
            const result = skillManager.canLearnSkill(characterData.id, skillData.id, characterData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.LEARN_CONDITION_NOT_MET);
            expect(result.message).toContain('レベル5以上が必要');
        });

        test('職業要件を満たしていない場合、習得不可と判定される', () => {
            characterData.job = 'mage';
            const result = skillManager.canLearnSkill(characterData.id, skillData.id, characterData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.LEARN_CONDITION_NOT_MET);
            expect(result.message).toContain('職業「warrior」が必要');
        });

        test('存在しないスキルIDでエラーになる', () => {
            const result = skillManager.canLearnSkill(characterData.id, 'non-existent-skill', characterData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.SKILL_NOT_FOUND);
        });

        test('既に習得済みのスキルで習得不可と判定される', () => {
            // 先にスキルを習得
            skillManager.learnSkill(characterData.id, skillData.id, characterData);

            // 再度習得しようとする
            const result = skillManager.canLearnSkill(characterData.id, skillData.id, characterData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.SKILL_ALREADY_LEARNED);
        });

        test('前提スキルが不足している場合、習得不可と判定される', () => {
            // 前提スキルを設定
            const prerequisiteSkill = createMockSkillData({
                id: 'prerequisite-skill',
                name: '前提スキル'
            });
            skillManager.registerSkill(prerequisiteSkill);

            const advancedSkill = createMockSkillData({
                id: 'advanced-skill',
                name: '上級スキル',
                learnCondition: {
                    level: 1,
                    prerequisiteSkills: ['prerequisite-skill']
                }
            });
            skillManager.registerSkill(advancedSkill);

            const result = skillManager.canLearnSkill(characterData.id, advancedSkill.id, characterData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.LEARN_CONDITION_NOT_MET);
            expect(result.message).toContain('前提スキル');
        });

        test('必要アイテムが不足している場合、習得不可と判定される', () => {
            const itemRequiredSkill = createMockSkillData({
                id: 'item-required-skill',
                learnCondition: {
                    level: 1,
                    requiredItems: ['skill-book']
                }
            });
            skillManager.registerSkill(itemRequiredSkill);

            const result = skillManager.canLearnSkill(characterData.id, itemRequiredSkill.id, characterData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.LEARN_CONDITION_NOT_MET);
            expect(result.message).toContain('アイテム「skill-book」が必要');
        });
    });

    describe('learnSkill', () => {
        let skillData: SkillData;
        let characterData: any;

        beforeEach(() => {
            skillData = createMockSkillData();
            characterData = createMockCharacterData();
            skillManager.registerSkill(skillData);
        });

        test('条件を満たしている場合、スキルを習得できる', () => {
            const result = skillManager.learnSkill(characterData.id, skillData.id, characterData);
            expect(result.success).toBe(true);
            expect(result.learnedSkill).not.toBeUndefined();
            expect(result.learnRecord).not.toBeUndefined();
            expect(result.learnRecord!.skillId).toBe(skillData.id);
        });

        test('習得後、キャラクターのスキルリストに追加される', () => {
            skillManager.learnSkill(characterData.id, skillData.id, characterData);

            const characterSkills = skillManager.getCharacterSkills(characterData.id);
            expect(characterSkills).toHaveLength(1);
            expect(characterSkills[0].id).toBe(skillData.id);
        });

        test('習得記録が正しく保存される', () => {
            const result = skillManager.learnSkill(characterData.id, skillData.id, characterData, 'level_up');

            const characterSkillData = skillManager.getCharacterSkillData(characterData.id);
            expect(characterSkillData).not.toBeNull();
            expect(characterSkillData!.skillLearnHistory).toHaveLength(1);

            const learnRecord = characterSkillData!.skillLearnHistory[0];
            expect(learnRecord.skillId).toBe(skillData.id);
            expect(learnRecord.learnedAtLevel).toBe(characterData.level);
            expect(learnRecord.learnMethod).toBe('level_up');
        });

        test('条件を満たしていない場合、習得に失敗する', () => {
            characterData.level = 0; // レベル要件を満たさない

            const result = skillManager.learnSkill(characterData.id, skillData.id, characterData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.LEARN_CONDITION_NOT_MET);
        });
    });

    describe('スキル統計情報', () => {
        let skillData: SkillData;

        beforeEach(() => {
            skillData = createMockSkillData();
            skillManager.registerSkill(skillData);
        });

        test('初期統計情報を取得できる', () => {
            const stats = skillManager.getSkillStatistics(skillData.id);
            expect(stats).not.toBeNull();
            expect(stats!.totalUsageCount).toBe(0);
            expect(stats!.successCount).toBe(0);
            expect(stats!.failureCount).toBe(0);
        });

        test('統計情報を更新できる', () => {
            skillManager.updateSkillStatistics(skillData.id, true, 150, true);

            const stats = skillManager.getSkillStatistics(skillData.id);
            expect(stats!.totalUsageCount).toBe(1);
            expect(stats!.successCount).toBe(1);
            expect(stats!.failureCount).toBe(0);
            expect(stats!.averageDamage).toBe(150);
            expect(stats!.maxDamage).toBe(150);
            expect(stats!.criticalCount).toBe(1);
            expect(stats!.lastUsedAt).toBeInstanceOf(Date);
        });

        test('複数回の統計更新で平均ダメージが正しく計算される', () => {
            skillManager.updateSkillStatistics(skillData.id, true, 100);
            skillManager.updateSkillStatistics(skillData.id, true, 200);

            const stats = skillManager.getSkillStatistics(skillData.id);
            expect(stats!.averageDamage).toBe(150);
            expect(stats!.maxDamage).toBe(200);
        });
    });

    describe('データ整合性チェック', () => {
        test('循環参照のある前提スキルでエラーになる', () => {
            // スキルAがスキルBを前提とし、スキルBがスキルAを前提とする循環参照
            const skillA = createMockSkillData({
                id: 'skill-a',
                learnCondition: {
                    prerequisiteSkills: ['skill-b']
                }
            });

            const skillB = createMockSkillData({
                id: 'skill-b',
                learnCondition: {
                    prerequisiteSkills: ['skill-a']
                }
            });

            // スキルBを先に登録
            skillManager.registerSkill(skillB);

            // スキルAの登録で循環参照エラーが発生
            const result = skillManager.registerSkill(skillA);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.DATA_INTEGRITY_ERROR);
            expect(result.message).toContain('循環参照');
        });
    });

    describe('ユーティリティメソッド', () => {
        test('getSkillCount で登録済みスキル数を取得できる', () => {
            expect(skillManager.getSkillCount()).toBe(0);

            skillManager.registerSkill(createMockSkillData({ id: 'skill-1' }));
            expect(skillManager.getSkillCount()).toBe(1);

            skillManager.registerSkill(createMockSkillData({ id: 'skill-2' }));
            expect(skillManager.getSkillCount()).toBe(2);
        });

        test('getCharacterCount でキャラクター数を取得できる', () => {
            expect(skillManager.getCharacterCount()).toBe(0);

            const skillData = createMockSkillData();
            skillManager.registerSkill(skillData);

            skillManager.learnSkill('character-1', skillData.id, createMockCharacterData({ id: 'character-1' }));
            expect(skillManager.getCharacterCount()).toBe(1);

            skillManager.learnSkill('character-2', skillData.id, createMockCharacterData({ id: 'character-2' }));
            expect(skillManager.getCharacterCount()).toBe(2);
        });

        test('clear で全データをクリアできる', () => {
            const skillData = createMockSkillData();
            const characterData = createMockCharacterData();

            skillManager.registerSkill(skillData);
            skillManager.learnSkill(characterData.id, skillData.id, characterData);

            expect(skillManager.getSkillCount()).toBe(1);
            expect(skillManager.getCharacterCount()).toBe(1);

            skillManager.clear();

            expect(skillManager.getSkillCount()).toBe(0);
            expect(skillManager.getCharacterCount()).toBe(0);
            expect(skillManager.getSkill(skillData.id)).toBeNull();
        });
    });

    describe('エラーハンドリング', () => {
        test('不正なデータでスキル登録時に適切なエラーが返される', () => {
            const invalidData = {} as SkillData;

            const result = skillManager.registerSkill(invalidData);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.INVALID_SKILL_DATA);
            expect(result.message).toBeTruthy();
        });

        test('存在しないスキルの統計情報取得でnullが返される', () => {
            const stats = skillManager.getSkillStatistics('non-existent-skill');
            expect(stats).toBeNull();
        });

        test('キャラクターデータがnullの場合適切なエラーが返される', () => {
            const skillData = createMockSkillData();
            skillManager.registerSkill(skillData);

            const result = skillManager.canLearnSkill('character-1', skillData.id, null);
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillManagerError.CHARACTER_NOT_FOUND);
        });
    });
});