/**
 * スキル基底クラスと基本スキル種別クラスのユニットテスト
 */

import {
    AttackSkill,
    HealSkill,
    BuffSkill,
    DebuffSkill,
    StatusSkill
} from '../../../../game/src/systems/skills/Skill';
import {
    SkillData,
    SkillType,
    TargetType,
    DamageType,
    HealType,
    BuffType,
    StatusEffectType,
    SkillExecutionContext,
    Position
} from '../../../../game/src/types/skill';

// =============================================================================
// テスト用モックデータ
// =============================================================================

const createMockCharacter = (overrides: any = {}) => ({
    id: 'test-character',
    position: { x: 5, y: 5 },
    currentHP: 80,
    currentMP: 50,
    level: 10,
    hasActed: false,
    faction: 'player',
    stats: {
        maxHP: 100,
        maxMP: 60,
        attack: 25,
        defense: 15,
        magicAttack: 20,
        magicDefense: 12
    },
    activeBuffs: [],
    activeDebuffs: [],
    statusEffects: [],
    ...overrides
});

const createMockBattlefield = (characters: any[] = []) => ({
    characters: new Map(characters.map(char => [char.id, char])),
    getCharacter: function (id: string) {
        return this.characters.get(id);
    },
    getCharacterAt: function (position: Position) {
        return Array.from(this.characters.values()).find(char =>
            char.position.x === position.x && char.position.y === position.y
        );
    },
    getCurrentPlayer: function () {
        return 'test-character';
    }
});

const createMockSkillData = (overrides: Partial<SkillData> = {}): SkillData => ({
    id: 'test-skill',
    name: 'テストスキル',
    description: 'テスト用のスキル',
    skillType: SkillType.ATTACK,
    targetType: TargetType.SINGLE_ENEMY,
    range: 2,
    areaOfEffect: {
        shape: 'single',
        size: 1
    },
    effects: [{
        type: 'damage',
        value: 1.5,
        damageType: DamageType.PHYSICAL
    }],
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

// =============================================================================
// AttackSkill テスト
// =============================================================================

describe('AttackSkill', () => {
    let attackSkill: AttackSkill;
    let mockCaster: any;
    let mockTarget: any;
    let mockBattlefield: any;

    beforeEach(() => {
        const skillData = createMockSkillData({
            skillType: SkillType.ATTACK,
            targetType: TargetType.SINGLE_ENEMY,
            effects: [{
                type: 'damage',
                value: 1.5,
                damageType: DamageType.PHYSICAL
            }]
        });

        attackSkill = new AttackSkill(skillData);
        mockCaster = createMockCharacter({ id: 'caster', faction: 'player' });
        mockTarget = createMockCharacter({ id: 'target', faction: 'enemy', position: { x: 6, y: 5 } });
        mockBattlefield = createMockBattlefield([mockCaster, mockTarget]);
    });

    test('should create AttackSkill with correct properties', () => {
        expect(attackSkill.skillType).toBe(SkillType.ATTACK);
        expect(attackSkill.damageMultiplier).toBe(1.5);
        expect(attackSkill.damageType).toBe(DamageType.PHYSICAL);
        expect(attackSkill.hitCount).toBe(1);
    });

    test('should execute attack skill successfully', async () => {
        const context: SkillExecutionContext = {
            caster: 'caster',
            skillId: 'test-skill',
            targetPosition: { x: 6, y: 5 },
            battlefieldState: mockBattlefield,
            currentTurn: 1,
            executionTime: new Date()
        };

        const result = await attackSkill.execute(context);

        expect(result.success).toBe(true);
        expect(result.targets).toContain('target');
        expect(result.effects).toHaveLength(1);
        expect(result.effects[0].effectType).toBe('damage');
        expect(result.effects[0].actualValue).toBeGreaterThan(0);
        expect(mockCaster.currentMP).toBe(40); // 50 - 10
    });

    test('should fail when MP is insufficient', () => {
        mockCaster.currentMP = 5;

        const result = attackSkill.canUse('caster', { x: 6, y: 5 }, mockBattlefield);

        expect(result.canUse).toBe(false);
        expect(result.error).toBe('insufficient_mp');
        expect(result.missingMP).toBe(5);
    });

    test('should fail when target is out of range', () => {
        const result = attackSkill.canUse('caster', { x: 10, y: 10 }, mockBattlefield);

        expect(result.canUse).toBe(false);
        expect(result.error).toBe('out_of_range');
    });

    test('should get valid targets within range', () => {
        // getCurrentPlayerが'caster'を返すようにモックを更新
        mockBattlefield.getCurrentPlayer = () => 'caster';

        const validTargets = attackSkill.getValidTargets({ x: 5, y: 5 }, mockBattlefield);

        expect(validTargets).toContainEqual({ x: 6, y: 5 });
    });
});

// =============================================================================
// HealSkill テスト
// =============================================================================

describe('HealSkill', () => {
    let healSkill: HealSkill;
    let mockCaster: any;
    let mockTarget: any;
    let mockBattlefield: any;

    beforeEach(() => {
        const skillData = createMockSkillData({
            skillType: SkillType.HEAL,
            targetType: TargetType.SINGLE_ALLY,
            effects: [{
                type: 'heal',
                value: 30,
                healType: HealType.FIXED
            }]
        });

        healSkill = new HealSkill(skillData);
        mockCaster = createMockCharacter({ id: 'caster', faction: 'player' });
        mockTarget = createMockCharacter({
            id: 'target',
            faction: 'player',
            position: { x: 6, y: 5 },
            currentHP: 50 // 負傷状態
        });
        mockBattlefield = createMockBattlefield([mockCaster, mockTarget]);
    });

    test('should create HealSkill with correct properties', () => {
        expect(healSkill.skillType).toBe(SkillType.HEAL);
        expect(healSkill.healAmount).toBe(30);
        expect(healSkill.healType).toBe(HealType.FIXED);
    });

    test('should execute heal skill successfully', async () => {
        const context: SkillExecutionContext = {
            caster: 'caster',
            skillId: 'test-skill',
            targetPosition: { x: 6, y: 5 },
            battlefieldState: mockBattlefield,
            currentTurn: 1,
            executionTime: new Date()
        };

        const initialHP = mockTarget.currentHP;
        const result = await healSkill.execute(context);

        expect(result.success).toBe(true);
        expect(result.targets).toContain('target');
        expect(result.effects).toHaveLength(1);
        expect(result.effects[0].effectType).toBe('heal');
        expect(mockTarget.currentHP).toBeGreaterThan(initialHP);
    });

    test('should fail when no valid heal target exists', () => {
        mockTarget.currentHP = mockTarget.stats.maxHP; // 満タン状態

        const result = healSkill.canUse('caster', { x: 6, y: 5 }, mockBattlefield);

        expect(result.canUse).toBe(false);
        expect(result.error).toBe('invalid_target');
    });

    test('should not exceed max HP when healing', async () => {
        mockTarget.currentHP = 95; // ほぼ満タン

        const context: SkillExecutionContext = {
            caster: 'caster',
            skillId: 'test-skill',
            targetPosition: { x: 6, y: 5 },
            battlefieldState: mockBattlefield,
            currentTurn: 1,
            executionTime: new Date()
        };

        await healSkill.execute(context);

        expect(mockTarget.currentHP).toBe(mockTarget.stats.maxHP);
    });
});

// =============================================================================
// BuffSkill テスト
// =============================================================================

describe('BuffSkill', () => {
    let buffSkill: BuffSkill;
    let mockCaster: any;
    let mockTarget: any;
    let mockBattlefield: any;

    beforeEach(() => {
        const skillData = createMockSkillData({
            skillType: SkillType.BUFF,
            targetType: TargetType.SINGLE_ALLY,
            effects: [{
                type: 'buff',
                value: 10,
                duration: 3,
                buffType: BuffType.ATTACK_UP
            }]
        });

        buffSkill = new BuffSkill(skillData);
        mockCaster = createMockCharacter({ id: 'caster', faction: 'player' });
        mockTarget = createMockCharacter({
            id: 'target',
            faction: 'player',
            position: { x: 6, y: 5 }
        });
        mockBattlefield = createMockBattlefield([mockCaster, mockTarget]);
    });

    test('should create BuffSkill with correct properties', () => {
        expect(buffSkill.skillType).toBe(SkillType.BUFF);
        expect(buffSkill.buffType).toBe(BuffType.ATTACK_UP);
        expect(buffSkill.buffValue).toBe(10);
        expect(buffSkill.duration).toBe(3);
    });

    test('should execute buff skill successfully', async () => {
        const context: SkillExecutionContext = {
            caster: 'caster',
            skillId: 'test-skill',
            targetPosition: { x: 6, y: 5 },
            battlefieldState: mockBattlefield,
            currentTurn: 1,
            executionTime: new Date()
        };

        const result = await buffSkill.execute(context);

        expect(result.success).toBe(true);
        expect(result.targets).toContain('target');
        expect(result.effects).toHaveLength(1);
        expect(result.effects[0].effectType).toBe('buff');
        expect(mockTarget.activeBuffs).toHaveLength(1);
        expect(mockTarget.activeBuffs[0].type).toBe(BuffType.ATTACK_UP);
    });
});

// =============================================================================
// DebuffSkill テスト
// =============================================================================

describe('DebuffSkill', () => {
    let debuffSkill: DebuffSkill;
    let mockCaster: any;
    let mockTarget: any;
    let mockBattlefield: any;

    beforeEach(() => {
        const skillData = createMockSkillData({
            skillType: SkillType.DEBUFF,
            targetType: TargetType.SINGLE_ENEMY,
            effects: [{
                type: 'debuff',
                value: 5,
                duration: 2,
                buffType: BuffType.DEFENSE_DOWN,
                successRate: 100 // テスト用に100%成功
            }]
        });

        debuffSkill = new DebuffSkill(skillData);
        mockCaster = createMockCharacter({ id: 'caster', faction: 'player' });
        mockTarget = createMockCharacter({
            id: 'target',
            faction: 'enemy',
            position: { x: 6, y: 5 }
        });
        mockBattlefield = createMockBattlefield([mockCaster, mockTarget]);
    });

    test('should create DebuffSkill with correct properties', () => {
        expect(debuffSkill.skillType).toBe(SkillType.DEBUFF);
        expect(debuffSkill.debuffType).toBe(BuffType.DEFENSE_DOWN);
        expect(debuffSkill.debuffValue).toBe(5);
        expect(debuffSkill.duration).toBe(2);
        expect(debuffSkill.successRate).toBe(100);
    });

    test('should execute debuff skill successfully', async () => {
        const context: SkillExecutionContext = {
            caster: 'caster',
            skillId: 'test-skill',
            targetPosition: { x: 6, y: 5 },
            battlefieldState: mockBattlefield,
            currentTurn: 1,
            executionTime: new Date()
        };

        const result = await debuffSkill.execute(context);

        expect(result.success).toBe(true);
        expect(result.targets).toContain('target');
        expect(result.effects).toHaveLength(1);
        expect(result.effects[0].effectType).toBe('debuff');
        expect(result.effects[0].success).toBe(true);
        expect(mockTarget.activeDebuffs).toHaveLength(1);
    });
});

// =============================================================================
// StatusSkill テスト
// =============================================================================

describe('StatusSkill', () => {
    let statusSkill: StatusSkill;
    let mockCaster: any;
    let mockTarget: any;
    let mockBattlefield: any;

    beforeEach(() => {
        const skillData = createMockSkillData({
            skillType: SkillType.STATUS,
            targetType: TargetType.SINGLE_ENEMY,
            effects: [{
                type: 'status',
                value: 5,
                duration: 3,
                statusType: StatusEffectType.POISON,
                successRate: 100 // テスト用に100%成功
            }]
        });

        statusSkill = new StatusSkill(skillData);
        mockCaster = createMockCharacter({ id: 'caster', faction: 'player' });
        mockTarget = createMockCharacter({
            id: 'target',
            faction: 'enemy',
            position: { x: 6, y: 5 }
        });
        mockBattlefield = createMockBattlefield([mockCaster, mockTarget]);
    });

    test('should create StatusSkill with correct properties', () => {
        expect(statusSkill.skillType).toBe(SkillType.STATUS);
        expect(statusSkill.statusType).toBe(StatusEffectType.POISON);
        expect(statusSkill.effectValue).toBe(5);
        expect(statusSkill.duration).toBe(3);
        expect(statusSkill.successRate).toBe(100);
    });

    test('should execute status skill successfully', async () => {
        const context: SkillExecutionContext = {
            caster: 'caster',
            skillId: 'test-skill',
            targetPosition: { x: 6, y: 5 },
            battlefieldState: mockBattlefield,
            currentTurn: 1,
            executionTime: new Date()
        };

        const result = await statusSkill.execute(context);

        expect(result.success).toBe(true);
        expect(result.targets).toContain('target');
        expect(result.effects).toHaveLength(1);
        expect(result.effects[0].effectType).toBe('status');
        expect(result.effects[0].success).toBe(true);
        expect(mockTarget.statusEffects).toHaveLength(1);
        expect(mockTarget.statusEffects[0].type).toBe(StatusEffectType.POISON);
    });
});

// =============================================================================
// 共通機能テスト
// =============================================================================

describe('Skill Base Functionality', () => {
    let attackSkill: AttackSkill;
    let mockBattlefield: any;

    beforeEach(() => {
        const skillData = createMockSkillData();
        attackSkill = new AttackSkill(skillData);
        mockBattlefield = createMockBattlefield([]);
    });

    test('should calculate distance correctly', () => {
        const pos1 = { x: 0, y: 0 };
        const pos2 = { x: 3, y: 4 };

        // マンハッタン距離のテスト
        const distance = (attackSkill as any).calculateDistance(pos1, pos2);
        expect(distance).toBe(7); // |3-0| + |4-0| = 7
    });

    test('should get affected positions for single target', () => {
        const targetPosition = { x: 5, y: 5 };
        const positions = attackSkill.getAffectedPositions(targetPosition);

        expect(positions).toHaveLength(1);
        expect(positions[0]).toEqual(targetPosition);
    });

    test('should get affected positions for cross shape', () => {
        const skillData = createMockSkillData({
            areaOfEffect: {
                shape: 'cross',
                size: 1
            }
        });
        const crossSkill = new AttackSkill(skillData);
        const targetPosition = { x: 5, y: 5 };
        const positions = crossSkill.getAffectedPositions(targetPosition);

        expect(positions).toHaveLength(5); // 中心 + 上下左右
        expect(positions).toContainEqual({ x: 5, y: 5 }); // 中心
        expect(positions).toContainEqual({ x: 6, y: 5 }); // 右
        expect(positions).toContainEqual({ x: 4, y: 5 }); // 左
        expect(positions).toContainEqual({ x: 5, y: 6 }); // 下
        expect(positions).toContainEqual({ x: 5, y: 4 }); // 上
    });
});