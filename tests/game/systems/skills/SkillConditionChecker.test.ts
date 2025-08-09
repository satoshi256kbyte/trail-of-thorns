/**
 * SkillConditionChecker のユニットテスト
 * 
 * スキル使用条件判定システムの包括的なテストを実施
 */

import {
    SkillConditionChecker,
    ExtendedSkillUsabilityResult,
    ConditionCheckDetail
} from '../../../../game/src/systems/skills/SkillConditionChecker';

import {
    SkillData,
    SkillType,
    TargetType,
    DamageType,
    HealType,
    BuffType,
    StatusEffectType,
    SkillUsabilityError,
    Position,
    CharacterSkillData
} from '../../../../game/src/types/skill';

import { AttackSkill, HealSkill, BuffSkill } from '../../../../game/src/systems/skills/Skill';

// モックデータの作成
const createMockSkillData = (overrides: Partial<SkillData> = {}): SkillData => ({
    id: 'test-skill',
    name: 'テストスキル',
    description: 'テスト用のスキル',
    skillType: SkillType.ATTACK,
    targetType: TargetType.SINGLE_ENEMY,
    range: 2,
    areaOfEffect: {
        shape: 'single',
        size: 0
    },
    effects: [{
        type: 'damage',
        value: 100,
        damageType: DamageType.PHYSICAL
    }],
    usageCondition: {
        mpCost: 10,
        cooldown: 3,
        usageLimit: 0,
        levelRequirement: 1,
        weaponRequirement: [],
        allowedStatuses: []
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

const createMockCharacterData = (overrides: any = {}) => ({
    id: 'test-character',
    level: 5,
    currentMP: 50,
    currentHP: 100,
    position: { x: 5, y: 5 },
    faction: 'player' as const,
    hasActed: false,
    job: 'warrior',
    equipment: {
        weapon: 'sword',
        armor: 'leather',
        accessory: 'ring'
    },
    statusEffects: [],
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        magicAttack: 10,
        magicDefense: 12,
        speed: 8
    },
    ...overrides
});

const createMockBattlefieldState = (characters: any[] = []) => {
    const characterMap = new Map(characters.map(char => [char.id, char]));
    const positionMap = new Map(characters.map(char => [`${char.position.x},${char.position.y}`, char]));

    return {
        getCharacter: (id: string) => characterMap.get(id),
        getCharacterAt: (position: Position) => positionMap.get(`${position.x},${position.y}`),
        getCurrentPlayer: () => 'test-character',
        getCurrentTurn: () => 10,
        isValidPosition: (position: Position) => position.x >= 0 && position.x < 20 && position.y >= 0 && position.y < 20,
        isObstacle: (position: Position) => false
    };
};

const createMockCharacterSkillData = (overrides: Partial<CharacterSkillData> = {}): CharacterSkillData => ({
    characterId: 'test-character',
    learnedSkills: ['test-skill'],
    skillCooldowns: new Map(),
    skillUsageCounts: new Map(),
    skillLearnHistory: [],
    activeEffects: [],
    ...overrides
});

describe('SkillConditionChecker', () => {
    let conditionChecker: SkillConditionChecker;
    let mockSkill: AttackSkill;
    let mockCharacter: any;
    let mockBattlefield: any;
    let mockCharacterSkillData: CharacterSkillData;

    beforeEach(() => {
        conditionChecker = new SkillConditionChecker();

        const skillData = createMockSkillData();
        mockSkill = new AttackSkill(skillData);

        mockCharacter = createMockCharacterData();

        const enemy = createMockCharacterData({
            id: 'enemy-1',
            faction: 'enemy',
            position: { x: 6, y: 5 }
        });

        mockBattlefield = createMockBattlefieldState([mockCharacter, enemy]);
        mockCharacterSkillData = createMockCharacterSkillData();
    });

    describe('canUseSkill', () => {
        test('全ての条件を満たす場合、使用可能と判定される', () => {
            const result = conditionChecker.canUseSkill(
                mockSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(true);
            expect(result.message).toBe('スキルを使用できます');
            expect(result.conditionDetails).toBeDefined();
            expect(result.validTargets).toBeDefined();
            expect(result.conditionDetails!.every(detail => detail.passed)).toBe(true);
        });

        test('キャラクターが見つからない場合、エラーが返される', () => {
            const result = conditionChecker.canUseSkill(
                mockSkill,
                'non-existent-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.SKILL_NOT_FOUND);
            expect(result.message).toBe('キャラクターが見つかりません');
        });

        test('MP不足の場合、使用不可と判定される', () => {
            mockCharacter.currentMP = 5; // スキルのMP消費量(10)より少ない

            const result = conditionChecker.canUseSkill(
                mockSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.INSUFFICIENT_MP);
            expect(result.missingMP).toBe(5);

            const mpDetail = result.conditionDetails!.find(d => d.condition === 'mp_requirement');
            expect(mpDetail!.passed).toBe(false);
            expect(mpDetail!.currentValue).toBe(5);
            expect(mpDetail!.requiredValue).toBe(10);
        });

        test('レベル不足の場合、使用不可と判定される', () => {
            const skillData = createMockSkillData({
                usageCondition: {
                    ...createMockSkillData().usageCondition,
                    levelRequirement: 10
                }
            });
            const highLevelSkill = new AttackSkill(skillData);

            const result = conditionChecker.canUseSkill(
                highLevelSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.LEVEL_REQUIREMENT_NOT_MET);

            const levelDetail = result.conditionDetails!.find(d => d.condition === 'level_requirement');
            expect(levelDetail!.passed).toBe(false);
            expect(levelDetail!.currentValue).toBe(5);
            expect(levelDetail!.requiredValue).toBe(10);
        });

        test('武器要件を満たしていない場合、使用不可と判定される', () => {
            const skillData = createMockSkillData({
                usageCondition: {
                    ...createMockSkillData().usageCondition,
                    weaponRequirement: ['staff', 'wand']
                }
            });
            const magicSkill = new AttackSkill(skillData);

            const result = conditionChecker.canUseSkill(
                magicSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.WEAPON_REQUIREMENT_NOT_MET);

            const equipmentDetail = result.conditionDetails!.find(d => d.condition === 'equipment_requirement');
            expect(equipmentDetail!.passed).toBe(false);
            expect(equipmentDetail!.message).toContain('staff, wand');
        });

        test('職業要件を満たしていない場合、使用不可と判定される', () => {
            const skillData = createMockSkillData({
                usageCondition: {
                    ...createMockSkillData().usageCondition,
                    jobRequirement: 'mage'
                }
            });
            const mageSkill = new AttackSkill(skillData);

            const result = conditionChecker.canUseSkill(
                mageSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.JOB_REQUIREMENT_NOT_MET);

            const jobDetail = result.conditionDetails!.find(d => d.condition === 'job_requirement');
            expect(jobDetail!.passed).toBe(false);
            expect(jobDetail!.message).toContain('mage');
        });

        test('クールダウン中の場合、使用不可と判定される', () => {
            // スキルを最近使用したことにする
            mockCharacterSkillData.skillCooldowns.set('test-skill', 8); // 現在ターン10 - 使用ターン8 = 2ターン経過
            // クールダウンは3ターンなので、まだ1ターン残っている

            const result = conditionChecker.canUseSkill(
                mockSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.SKILL_ON_COOLDOWN);
            expect(result.remainingCooldown).toBe(1);

            const cooldownDetail = result.conditionDetails!.find(d => d.condition === 'cooldown');
            expect(cooldownDetail!.passed).toBe(false);
            expect(cooldownDetail!.currentValue).toBe(1);
        });

        test('使用回数制限に達している場合、使用不可と判定される', () => {
            const skillData = createMockSkillData({
                usageCondition: {
                    ...createMockSkillData().usageCondition,
                    usageLimit: 2
                }
            });
            const limitedSkill = new AttackSkill(skillData);

            // 既に2回使用済み
            mockCharacterSkillData.skillUsageCounts.set('test-skill', 2);

            const result = conditionChecker.canUseSkill(
                limitedSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.USAGE_LIMIT_EXCEEDED);
            expect(result.remainingUses).toBe(0);

            const usageDetail = result.conditionDetails!.find(d => d.condition === 'usage_limit');
            expect(usageDetail!.passed).toBe(false);
            expect(usageDetail!.currentValue).toBe(0);
        });

        test('既に行動済みの場合、使用不可と判定される', () => {
            mockCharacter.hasActed = true;

            const result = conditionChecker.canUseSkill(
                mockSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.CHARACTER_ALREADY_ACTED);

            const actionDetail = result.conditionDetails!.find(d => d.condition === 'action_status');
            expect(actionDetail!.passed).toBe(false);
            expect(actionDetail!.message).toBe('このキャラクターは既に行動済みです');
        });

        test('状態異常により使用不可の場合、適切に判定される', () => {
            mockCharacter.statusEffects = [{
                type: StatusEffectType.PARALYSIS,
                remainingDuration: 2
            }];

            const result = conditionChecker.canUseSkill(
                mockSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.CHARACTER_STATUS_PREVENTS_USE);

            const statusDetail = result.conditionDetails!.find(d => d.condition === 'status_effects');
            expect(statusDetail!.passed).toBe(false);
            expect(statusDetail!.message).toContain('paralysis');
        });

        test('射程外の場合、使用不可と判定される', () => {
            const result = conditionChecker.canUseSkill(
                mockSkill,
                'test-character',
                { x: 10, y: 10 }, // 距離10、射程2なので射程外
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.OUT_OF_RANGE);

            const rangeDetail = result.conditionDetails!.find(d => d.condition === 'range');
            expect(rangeDetail!.passed).toBe(false);
            expect(rangeDetail!.currentValue).toBe(10);
            expect(rangeDetail!.requiredValue).toBe(2);
        });

        test('有効な対象がいない場合、使用不可と判定される', () => {
            // 敵がいない位置を指定
            const result = conditionChecker.canUseSkill(
                mockSkill,
                'test-character',
                { x: 7, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.INVALID_TARGET);

            const targetDetail = result.conditionDetails!.find(d => d.condition === 'target_validity');
            expect(targetDetail!.passed).toBe(false);
            expect(targetDetail!.message).toBe('有効な対象がいません');
        });
    });

    describe('getValidTargets', () => {
        test('射程内の有効な対象位置を正しく取得する', () => {
            const validTargets = conditionChecker.getValidTargets(
                mockSkill,
                { x: 5, y: 5 },
                mockBattlefield
            );

            expect(validTargets).toContainEqual({ x: 6, y: 5 });
            expect(validTargets.length).toBeGreaterThan(0);
        });

        test('射程外の位置は含まれない', () => {
            const validTargets = conditionChecker.getValidTargets(
                mockSkill,
                { x: 5, y: 5 },
                mockBattlefield
            );

            // 射程2なので、距離3以上の位置は含まれない
            expect(validTargets).not.toContainEqual({ x: 9, y: 5 });
            expect(validTargets).not.toContainEqual({ x: 5, y: 9 });
        });

        test('マップ境界外の位置は含まれない', () => {
            const edgeCharacter = createMockCharacterData({
                id: 'edge-character',
                position: { x: 0, y: 0 }
            });

            const edgeBattlefield = createMockBattlefieldState([edgeCharacter]);

            const validTargets = conditionChecker.getValidTargets(
                mockSkill,
                { x: 0, y: 0 },
                edgeBattlefield
            );

            // 負の座標は含まれない
            expect(validTargets.every(pos => pos.x >= 0 && pos.y >= 0)).toBe(true);
        });
    });

    describe('isValidTarget', () => {
        test('攻撃スキルの場合、敵が有効な対象となる', () => {
            const enemy = createMockCharacterData({
                id: 'enemy',
                faction: 'enemy'
            });

            const isValid = conditionChecker.isValidTarget(mockSkill, mockCharacter, enemy);
            expect(isValid).toBe(true);
        });

        test('攻撃スキルの場合、味方は無効な対象となる', () => {
            const ally = createMockCharacterData({
                id: 'ally',
                faction: 'player'
            });

            const isValid = conditionChecker.isValidTarget(mockSkill, mockCharacter, ally);
            expect(isValid).toBe(false);
        });

        test('回復スキルの場合、味方が有効な対象となる', () => {
            const healSkillData = createMockSkillData({
                skillType: SkillType.HEAL,
                targetType: TargetType.SINGLE_ALLY,
                effects: [{
                    type: 'heal',
                    value: 50,
                    healType: HealType.FIXED
                }]
            });
            const healSkill = new HealSkill(healSkillData);

            const ally = createMockCharacterData({
                id: 'ally',
                faction: 'player',
                currentHP: 50 // 回復が必要
            });

            const isValid = conditionChecker.isValidTarget(healSkill, mockCharacter, ally);
            expect(isValid).toBe(true);
        });

        test('自己対象スキルの場合、自分のみが有効な対象となる', () => {
            const selfSkillData = createMockSkillData({
                targetType: TargetType.SELF
            });
            const selfSkill = new AttackSkill(selfSkillData);

            const isValidSelf = conditionChecker.isValidTarget(selfSkill, mockCharacter, mockCharacter);
            expect(isValidSelf).toBe(true);

            const ally = createMockCharacterData({
                id: 'ally',
                faction: 'player'
            });
            const isValidAlly = conditionChecker.isValidTarget(selfSkill, mockCharacter, ally);
            expect(isValidAlly).toBe(false);
        });

        test('死亡キャラクターは通常無効な対象となる', () => {
            const deadEnemy = createMockCharacterData({
                id: 'dead-enemy',
                faction: 'enemy',
                currentHP: 0
            });

            const isValid = conditionChecker.isValidTarget(mockSkill, mockCharacter, deadEnemy);
            expect(isValid).toBe(false);
        });
    });

    describe('クールダウン管理', () => {
        test('setSkillCooldown でクールダウンが設定される', () => {
            conditionChecker.setSkillCooldown('test-skill', 'test-character', 5);

            const characterData = conditionChecker.getCharacterSkillData('test-character');
            expect(characterData!.skillCooldowns.get('test-skill')).toBe(5);
        });

        test('incrementSkillUsage で使用回数が増加する', () => {
            conditionChecker.incrementSkillUsage('test-skill', 'test-character');
            conditionChecker.incrementSkillUsage('test-skill', 'test-character');

            const characterData = conditionChecker.getCharacterSkillData('test-character');
            expect(characterData!.skillUsageCounts.get('test-skill')).toBe(2);
        });

        test('updateCooldowns でクールダウンが更新される', () => {
            conditionChecker.setSkillCooldown('test-skill', 'test-character', 5);
            conditionChecker.updateCooldowns('test-character', 6);

            const characterData = conditionChecker.getCharacterSkillData('test-character');
            expect(characterData!.skillCooldowns.has('test-skill')).toBe(false);
        });

        test('resetUsageCounts で使用回数がリセットされる', () => {
            conditionChecker.incrementSkillUsage('test-skill', 'test-character');
            conditionChecker.resetUsageCounts('test-character');

            const characterData = conditionChecker.getCharacterSkillData('test-character');
            expect(characterData!.skillUsageCounts.get('test-skill') || 0).toBe(0);
        });
    });

    describe('特殊ケース', () => {
        test('沈黙状態では魔法系スキルが使用不可', () => {
            const healSkillData = createMockSkillData({
                skillType: SkillType.HEAL,
                targetType: TargetType.SINGLE_ALLY
            });
            const healSkill = new HealSkill(healSkillData);

            mockCharacter.statusEffects = [{
                type: StatusEffectType.SILENCE,
                remainingDuration: 2
            }];

            const result = conditionChecker.canUseSkill(
                healSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.CHARACTER_STATUS_PREVENTS_USE);
        });

        test('許可された状態異常中でもスキルが使用可能', () => {
            const skillData = createMockSkillData({
                usageCondition: {
                    ...createMockSkillData().usageCondition,
                    allowedStatuses: [StatusEffectType.POISON]
                }
            });
            const poisonResistantSkill = new AttackSkill(skillData);

            mockCharacter.statusEffects = [{
                type: StatusEffectType.POISON,
                remainingDuration: 2
            }];

            const result = conditionChecker.canUseSkill(
                poisonResistantSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            expect(result.canUse).toBe(true);
        });

        test('使用回数制限が0（無制限）の場合、常に使用可能', () => {
            const skillData = createMockSkillData({
                usageCondition: {
                    ...createMockSkillData().usageCondition,
                    usageLimit: 0 // 無制限
                }
            });
            const unlimitedSkill = new AttackSkill(skillData);

            // 大量に使用済みでも問題なし
            mockCharacterSkillData.skillUsageCounts.set('test-skill', 999);

            const result = conditionChecker.canUseSkill(
                unlimitedSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            const usageDetail = result.conditionDetails!.find(d => d.condition === 'usage_limit');
            expect(usageDetail!.passed).toBe(true);
            expect(usageDetail!.message).toBe('使用回数制限はありません');
        });

        test('武器要件が空の場合、装備チェックをパスする', () => {
            const skillData = createMockSkillData({
                usageCondition: {
                    ...createMockSkillData().usageCondition,
                    weaponRequirement: []
                }
            });
            const noWeaponSkill = new AttackSkill(skillData);

            const result = conditionChecker.canUseSkill(
                noWeaponSkill,
                'test-character',
                { x: 6, y: 5 },
                mockBattlefield,
                mockCharacterSkillData
            );

            const equipmentDetail = result.conditionDetails!.find(d => d.condition === 'equipment_requirement');
            expect(equipmentDetail!.passed).toBe(true);
            expect(equipmentDetail!.message).toBe('装備要件はありません');
        });
    });

    describe('推奨対象システム', () => {
        test('攻撃スキルの場合、HPの低い敵が推奨される', () => {
            const weakEnemy = createMockCharacterData({
                id: 'weak-enemy',
                faction: 'enemy',
                position: { x: 6, y: 5 },
                currentHP: 20 // 低HP
            });

            const strongEnemy = createMockCharacterData({
                id: 'strong-enemy',
                faction: 'enemy',
                position: { x: 7, y: 5 },
                currentHP: 100 // 高HP
            });

            const battlefield = createMockBattlefieldState([mockCharacter, weakEnemy, strongEnemy]);

            const result = conditionChecker.canUseSkill(
                mockSkill,
                'test-character',
                { x: 6, y: 5 },
                battlefield,
                mockCharacterSkillData
            );

            expect(result.recommendedTargets).toBeDefined();
            expect(result.recommendedTargets!.length).toBeGreaterThan(0);
        });
    });
});