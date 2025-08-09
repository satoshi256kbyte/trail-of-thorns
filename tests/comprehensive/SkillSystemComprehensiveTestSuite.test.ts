/**
 * スキルシステム包括的テストスイート
 * 
 * このテストファイルは以下をテストします：
 * - スキルシステム全体の統合テスト
 * - 全要件のカバレッジ確認
 * - システム間の連携テスト
 * - エラーハンドリングの包括的テスト
 * - パフォーマンステスト
 */

import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { SkillManager } from '../../game/src/systems/skills/SkillManager';
import { SkillExecutor } from '../../game/src/systems/skills/SkillExecutor';
import { SkillConditionChecker } from '../../game/src/systems/skills/SkillConditionChecker';
import { SkillUI } from '../../game/src/systems/skills/SkillUI';
import { SkillDataLoader } from '../../game/src/systems/skills/SkillDataLoader';
import { SkillErrorHandler } from '../../game/src/systems/skills/SkillErrorHandler';
import {
    SkillData,
    SkillType,
    TargetType,
    SkillUsabilityError,
    Position,
    SkillExecutionContext,
    CharacterSkillData
} from '../../game/src/types/skill';

// Phaserのモック
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            add: jest.fn(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        graphics: jest.fn().mockReturnValue({
            fillStyle: jest.fn().mockReturnThis(),
            fillRoundedRect: jest.fn().mockReturnThis(),
            lineStyle: jest.fn().mockReturnThis(),
            strokeRoundedRect: jest.fn().mockReturnThis(),
            clear: jest.fn().mockReturnThis(),
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            setAlpha: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        }),
        text: jest.fn().mockReturnValue({
            setOrigin: jest.fn().mockReturnThis(),
            setInteractive: jest.fn().mockReturnThis(),
            on: jest.fn(),
            setColor: jest.fn().mockReturnThis(),
            destroy: jest.fn()
        })
    },
    events: {
        on: jest.fn(),
        emit: jest.fn(),
        removeAllListeners: jest.fn()
    },
    input: {
        keyboard: {
            on: jest.fn(),
            addKey: jest.fn().mockReturnValue({
                once: jest.fn(),
                destroy: jest.fn()
            })
        },
        on: jest.fn()
    },
    tweens: {
        add: jest.fn().mockReturnValue({
            destroy: jest.fn()
        })
    },
    time: {
        delayedCall: jest.fn()
    },
    cameras: {
        main: {
            width: 800,
            height: 600,
            scrollX: 0,
            scrollY: 0,
            zoom: 1
        }
    }
};

// テスト用スキルデータ
const createTestSkillData = (id: string, overrides: Partial<SkillData> = {}): SkillData => ({
    id,
    name: `Test Skill ${id}`,
    description: `Test skill description for ${id}`,
    skillType: SkillType.ATTACK,
    targetType: TargetType.SINGLE_ENEMY,
    range: 1,
    areaOfEffect: {
        shape: 'single',
        size: 1
    },
    effects: [{
        type: 'damage',
        value: 50,
        duration: 0
    }],
    usageCondition: {
        mpCost: 10,
        cooldown: 0,
        usageLimit: 0,
        levelRequirement: 1,
        weaponRequirement: [],
        jobRequirement: undefined
    },
    learnCondition: {
        level: 1,
        prerequisiteSkills: [],
        jobRequirement: undefined
    },
    animation: {
        castAnimation: 'cast',
        effectAnimation: 'effect',
        duration: 1000
    },
    ...overrides
});

// テスト用キャラクターデータ
const createTestCharacterData = (id: string): CharacterSkillData => ({
    characterId: id,
    learnedSkills: [],
    skillCooldowns: new Map(),
    skillUsageCounts: new Map(),
    skillLearnHistory: [],
    activeEffects: []
});

// テスト用戦場状態
const createTestBattlefieldState = () => ({
    getCurrentTurn: jest.fn().mockReturnValue(1),
    getCharacterAt: jest.fn().mockReturnValue(null),
    getCharacterById: jest.fn().mockReturnValue({
        id: 'test-character',
        position: { x: 1, y: 1 },
        stats: { maxHP: 100, maxMP: 50, attack: 25, defense: 15, speed: 12, movement: 3 },
        currentHP: 100,
        currentMP: 50,
        faction: 'player'
    }),
    isValidPosition: jest.fn().mockReturnValue(true),
    getUnitsInRange: jest.fn().mockReturnValue([]),
    updateCharacter: jest.fn(),
    applyDamage: jest.fn(),
    applyHealing: jest.fn(),
    applyStatusEffect: jest.fn()
});

describe('SkillSystem Comprehensive Test Suite', () => {
    let skillSystem: SkillSystem;
    let mockBattlefield: any;

    beforeEach(() => {
        mockBattlefield = createTestBattlefieldState();
        skillSystem = new SkillSystem(mockScene as any, {
            debugMode: true,
            performanceMonitoring: true,
            autoErrorRecovery: true
        });
        skillSystem.setBattlefieldState(mockBattlefield);
    });

    afterEach(() => {
        if (skillSystem) {
            skillSystem.destroy();
        }
    });

    describe('要件1: スキルシステム基盤', () => {
        test('1.1 スキルデータの適切な管理', () => {
            const skillData = createTestSkillData('test-skill-1');
            const result = skillSystem.registerSkill(skillData);

            expect(result.success).toBe(true);
            expect(result.skillId).toBe('test-skill-1');
        });

        test('1.2 スキル効果の適切な発動', async () => {
            const skillData = createTestSkillData('attack-skill', {
                skillType: SkillType.ATTACK,
                effects: [{ type: 'damage', value: 50, duration: 0 }]
            });

            skillSystem.registerSkill(skillData);
            skillSystem.learnSkill('test-character', 'attack-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'attack-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.effects).toBeDefined();
        });

        test('1.3 MP消費の正しい処理', async () => {
            const skillData = createTestSkillData('mp-skill', {
                usageCondition: { ...createTestSkillData('').usageCondition, mpCost: 20 }
            });

            skillSystem.registerSkill(skillData);
            skillSystem.learnSkill('test-character', 'mp-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'mp-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.mpCost).toBe(20);
        });

        test('1.4 使用条件の適切なチェック', () => {
            const skillData = createTestSkillData('level-skill', {
                usageCondition: { ...createTestSkillData('').usageCondition, levelRequirement: 10 }
            });

            skillSystem.registerSkill(skillData);
            skillSystem.learnSkill('test-character', 'level-skill', createTestCharacterData('test-character'));

            const availableSkills = skillSystem.getAvailableSkills('test-character');
            const levelSkill = availableSkills.find(s => s.skill.id === 'level-skill');

            expect(levelSkill?.enabled).toBe(false);
            expect(levelSkill?.usability.error).toBe(SkillUsabilityError.LEVEL_REQUIREMENT_NOT_MET);
        });

        test('1.5 JSONデータの正しい解析', () => {
            const skillData = createTestSkillData('json-skill');
            const result = skillSystem.registerSkill(skillData);

            expect(result.success).toBe(true);
            expect(result.validationErrors).toHaveLength(0);
        });
    });

    describe('要件2: スキル種別と効果', () => {
        test('2.1 攻撃スキルの強力なダメージ', async () => {
            const attackSkill = createTestSkillData('strong-attack', {
                skillType: SkillType.ATTACK,
                effects: [{ type: 'damage', value: 100, duration: 0 }]
            });

            skillSystem.registerSkill(attackSkill);
            skillSystem.learnSkill('test-character', 'strong-attack', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'strong-attack',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.effects[0]?.actualValue).toBeGreaterThan(50); // 通常攻撃より強力
        });

        test('2.2 回復スキルのHP回復', async () => {
            const healSkill = createTestSkillData('heal', {
                skillType: SkillType.HEAL,
                targetType: TargetType.SINGLE_ALLY,
                effects: [{ type: 'heal', value: 50, duration: 0 }]
            });

            skillSystem.registerSkill(healSkill);
            skillSystem.learnSkill('test-character', 'heal', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'heal',
                'test-character',
                { x: 1, y: 1 }, // 自分自身
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.effects[0]?.effectType).toBe('heal');
        });

        test('2.3 バフスキルの能力値向上', async () => {
            const buffSkill = createTestSkillData('buff', {
                skillType: SkillType.BUFF,
                targetType: TargetType.SINGLE_ALLY,
                effects: [{ type: 'buff', value: 20, duration: 3 }]
            });

            skillSystem.registerSkill(buffSkill);
            skillSystem.learnSkill('test-character', 'buff', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'buff',
                'test-character',
                { x: 1, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.effects[0]?.effectType).toBe('buff');
        });

        test('2.4 デバフスキルの能力値低下', async () => {
            const debuffSkill = createTestSkillData('debuff', {
                skillType: SkillType.DEBUFF,
                targetType: TargetType.SINGLE_ENEMY,
                effects: [{ type: 'debuff', value: -15, duration: 2 }]
            });

            skillSystem.registerSkill(debuffSkill);
            skillSystem.learnSkill('test-character', 'debuff', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'debuff',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.effects[0]?.effectType).toBe('debuff');
        });

        test('2.5 状態異常スキルの状態異常付与', async () => {
            const statusSkill = createTestSkillData('poison', {
                skillType: SkillType.STATUS,
                targetType: TargetType.SINGLE_ENEMY,
                effects: [{ type: 'status', value: 10, duration: 3 }]
            });

            skillSystem.registerSkill(statusSkill);
            skillSystem.learnSkill('test-character', 'poison', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'poison',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.effects[0]?.effectType).toBe('status');
        });
    });

    describe('要件3: スキル使用条件と制限', () => {
        test('3.1 MP不足時の使用禁止', () => {
            const mpSkill = createTestSkillData('expensive-skill', {
                usageCondition: { ...createTestSkillData('').usageCondition, mpCost: 100 }
            });

            skillSystem.registerSkill(mpSkill);
            skillSystem.learnSkill('test-character', 'expensive-skill', createTestCharacterData('test-character'));

            const availableSkills = skillSystem.getAvailableSkills('test-character');
            const expensiveSkill = availableSkills.find(s => s.skill.id === 'expensive-skill');

            expect(expensiveSkill?.enabled).toBe(false);
            expect(expensiveSkill?.usability.error).toBe(SkillUsabilityError.INSUFFICIENT_MP);
        });

        test('3.2 レベル制限の適用', () => {
            const levelSkill = createTestSkillData('high-level-skill', {
                usageCondition: { ...createTestSkillData('').usageCondition, levelRequirement: 50 }
            });

            skillSystem.registerSkill(levelSkill);
            skillSystem.learnSkill('test-character', 'high-level-skill', createTestCharacterData('test-character'));

            const availableSkills = skillSystem.getAvailableSkills('test-character');
            const highLevelSkill = availableSkills.find(s => s.skill.id === 'high-level-skill');

            expect(highLevelSkill?.enabled).toBe(false);
            expect(highLevelSkill?.usability.error).toBe(SkillUsabilityError.LEVEL_REQUIREMENT_NOT_MET);
        });

        test('3.3 使用回数制限の適用', async () => {
            const limitedSkill = createTestSkillData('limited-skill', {
                usageCondition: { ...createTestSkillData('').usageCondition, usageLimit: 1 }
            });

            skillSystem.registerSkill(limitedSkill);
            skillSystem.learnSkill('test-character', 'limited-skill', createTestCharacterData('test-character'));

            // 1回目の使用
            const result1 = await skillSystem.useSkill(
                'limited-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );
            expect(result1.success).toBe(true);

            // 2回目の使用（制限に引っかかる）
            const availableSkills = skillSystem.getAvailableSkills('test-character');
            const limitedSkillItem = availableSkills.find(s => s.skill.id === 'limited-skill');

            expect(limitedSkillItem?.enabled).toBe(false);
            expect(limitedSkillItem?.usability.error).toBe(SkillUsabilityError.USAGE_LIMIT_EXCEEDED);
        });

        test('3.4 クールダウンの適用', async () => {
            const cooldownSkill = createTestSkillData('cooldown-skill', {
                usageCondition: { ...createTestSkillData('').usageCondition, cooldown: 3 }
            });

            skillSystem.registerSkill(cooldownSkill);
            skillSystem.learnSkill('test-character', 'cooldown-skill', createTestCharacterData('test-character'));

            // 1回目の使用
            const result1 = await skillSystem.useSkill(
                'cooldown-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );
            expect(result1.success).toBe(true);

            // すぐに2回目の使用（クールダウン中）
            const availableSkills = skillSystem.getAvailableSkills('test-character');
            const cooldownSkillItem = availableSkills.find(s => s.skill.id === 'cooldown-skill');

            expect(cooldownSkillItem?.enabled).toBe(false);
            expect(cooldownSkillItem?.usability.error).toBe(SkillUsabilityError.SKILL_ON_COOLDOWN);
        });

        test('3.5 武器要件の適用', () => {
            const weaponSkill = createTestSkillData('sword-skill', {
                usageCondition: {
                    ...createTestSkillData('').usageCondition,
                    weaponRequirement: ['sword']
                }
            });

            skillSystem.registerSkill(weaponSkill);
            skillSystem.learnSkill('test-character', 'sword-skill', createTestCharacterData('test-character'));

            const availableSkills = skillSystem.getAvailableSkills('test-character');
            const swordSkill = availableSkills.find(s => s.skill.id === 'sword-skill');

            expect(swordSkill?.enabled).toBe(false);
            expect(swordSkill?.usability.error).toBe(SkillUsabilityError.WEAPON_REQUIREMENT_NOT_MET);
        });
    });

    describe('要件4: スキル効果範囲と対象選択', () => {
        test('4.1 単体対象スキルの対象制限', async () => {
            const singleSkill = createTestSkillData('single-skill', {
                targetType: TargetType.SINGLE_ENEMY,
                areaOfEffect: { shape: 'single', size: 1 }
            });

            skillSystem.registerSkill(singleSkill);
            skillSystem.learnSkill('test-character', 'single-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'single-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.targets).toHaveLength(1);
        });

        test('4.2 範囲攻撃スキルの複数対象', async () => {
            const areaSkill = createTestSkillData('area-skill', {
                targetType: TargetType.AREA_ENEMY,
                areaOfEffect: { shape: 'square', size: 2 }
            });

            // 複数の敵を配置
            mockBattlefield.getUnitsInRange.mockReturnValue([
                { id: 'enemy1', position: { x: 2, y: 1 } },
                { id: 'enemy2', position: { x: 3, y: 1 } }
            ]);

            skillSystem.registerSkill(areaSkill);
            skillSystem.learnSkill('test-character', 'area-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'area-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.targets.length).toBeGreaterThan(1);
        });

        test('4.3 全体攻撃スキルの全敵対象', async () => {
            const allSkill = createTestSkillData('all-skill', {
                targetType: TargetType.ALL_ENEMIES
            });

            mockBattlefield.getUnitsInRange.mockReturnValue([
                { id: 'enemy1', position: { x: 2, y: 1 } },
                { id: 'enemy2', position: { x: 3, y: 1 } },
                { id: 'enemy3', position: { x: 4, y: 1 } }
            ]);

            skillSystem.registerSkill(allSkill);
            skillSystem.learnSkill('test-character', 'all-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'all-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.targets).toHaveLength(3);
        });

        test('4.4 自己対象スキルの使用者限定', async () => {
            const selfSkill = createTestSkillData('self-skill', {
                targetType: TargetType.SELF
            });

            skillSystem.registerSkill(selfSkill);
            skillSystem.learnSkill('test-character', 'self-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'self-skill',
                'test-character',
                { x: 1, y: 1 }, // 自分の位置
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.targets).toContain('test-character');
        });

        test('4.5 味方対象スキルの味方限定', async () => {
            const allySkill = createTestSkillData('ally-skill', {
                targetType: TargetType.SINGLE_ALLY
            });

            mockBattlefield.getCharacterAt.mockReturnValue({
                id: 'ally-character',
                faction: 'player'
            });

            skillSystem.registerSkill(allySkill);
            skillSystem.learnSkill('test-character', 'ally-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'ally-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.targets).toContain('ally-character');
        });
    });

    describe('要件5: スキルUI・視覚表現', () => {
        test('5.1 スキル選択UIの表示', () => {
            skillSystem.registerSkill(createTestSkillData('ui-skill'));
            skillSystem.learnSkill('test-character', 'ui-skill', createTestCharacterData('test-character'));

            const availableSkills = skillSystem.getAvailableSkills('test-character');

            expect(availableSkills).toHaveLength(1);
            expect(availableSkills[0].skill.id).toBe('ui-skill');
            expect(availableSkills[0].displayText).toContain('ui-skill');
        });

        test('5.2 効果範囲の視覚的表示', () => {
            const rangeSkill = createTestSkillData('range-skill', {
                range: 3,
                areaOfEffect: { shape: 'circle', size: 2 }
            });

            skillSystem.registerSkill(rangeSkill);

            // 効果範囲の計算をテスト
            const skill = skillSystem['skillManager'].getSkill('range-skill');
            const affectedPositions = skill?.getAffectedPositions({ x: 5, y: 5 });

            expect(affectedPositions).toBeDefined();
            expect(affectedPositions!.length).toBeGreaterThan(1);
        });

        test('5.3 スキル発動アニメーション', async () => {
            const animSkill = createTestSkillData('anim-skill', {
                animation: {
                    castAnimation: 'cast-anim',
                    effectAnimation: 'effect-anim',
                    duration: 2000
                }
            });

            skillSystem.registerSkill(animSkill);
            skillSystem.learnSkill('test-character', 'anim-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'anim-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });

        test('5.4 スキル詳細情報の表示', () => {
            const detailSkill = createTestSkillData('detail-skill', {
                description: 'Detailed skill description',
                usageCondition: { ...createTestSkillData('').usageCondition, mpCost: 25 }
            });

            skillSystem.registerSkill(detailSkill);
            skillSystem.learnSkill('test-character', 'detail-skill', createTestCharacterData('test-character'));

            const availableSkills = skillSystem.getAvailableSkills('test-character');
            const detailSkillItem = availableSkills.find(s => s.skill.id === 'detail-skill');

            expect(detailSkillItem?.skill.description).toBe('Detailed skill description');
            expect(detailSkillItem?.displayText).toContain('MP:25');
        });

        test('5.5 使用不可理由の明確な表示', () => {
            const unavailableSkill = createTestSkillData('unavailable-skill', {
                usageCondition: { ...createTestSkillData('').usageCondition, mpCost: 200 }
            });

            skillSystem.registerSkill(unavailableSkill);
            skillSystem.learnSkill('test-character', 'unavailable-skill', createTestCharacterData('test-character'));

            const availableSkills = skillSystem.getAvailableSkills('test-character');
            const unavailableSkillItem = availableSkills.find(s => s.skill.id === 'unavailable-skill');

            expect(unavailableSkillItem?.enabled).toBe(false);
            expect(unavailableSkillItem?.usability.message).toContain('MP');
            expect(unavailableSkillItem?.displayText).toContain('[使用不可]');
        });
    });

    describe('要件6: 戦闘システム統合', () => {
        test('6.1 戦闘フローの中断なし処理', async () => {
            const battleSkill = createTestSkillData('battle-skill');

            skillSystem.registerSkill(battleSkill);
            skillSystem.learnSkill('test-character', 'battle-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'battle-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.flowStats?.totalTime).toBeDefined();
            expect(result.flowStats!.totalTime).toBeGreaterThan(0);
        });

        test('6.2 ダメージ計算システムの活用', async () => {
            const damageSkill = createTestSkillData('damage-skill', {
                effects: [{ type: 'damage', value: 75, duration: 0 }]
            });

            skillSystem.registerSkill(damageSkill);
            skillSystem.learnSkill('test-character', 'damage-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'damage-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(mockBattlefield.applyDamage).toHaveBeenCalled();
        });

        test('6.3 キャラクター状態の適切な更新', async () => {
            const stateSkill = createTestSkillData('state-skill');

            skillSystem.registerSkill(stateSkill);
            skillSystem.learnSkill('test-character', 'state-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'state-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(mockBattlefield.updateCharacter).toHaveBeenCalled();
        });

        test('6.4 ターン制システムへの制御返却', async () => {
            const turnSkill = createTestSkillData('turn-skill');

            skillSystem.registerSkill(turnSkill);
            skillSystem.learnSkill('test-character', 'turn-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'turn-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            // ターンシステム更新イベントが発火されることを確認
            expect(mockScene.events.emit).toHaveBeenCalledWith(
                'turn-system-update',
                expect.any(Object)
            );
        });

        test('6.5 継続効果の持続時間管理', async () => {
            const continuousSkill = createTestSkillData('continuous-skill', {
                effects: [{ type: 'buff', value: 10, duration: 5 }]
            });

            skillSystem.registerSkill(continuousSkill);
            skillSystem.learnSkill('test-character', 'continuous-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'continuous-skill',
                'test-character',
                { x: 1, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.effects[0]?.effectType).toBe('buff');
            expect(mockBattlefield.applyStatusEffect).toHaveBeenCalled();
        });
    });

    describe('要件7: データ管理と拡張性', () => {
        test('7.1 JSONスキーマによるデータ検証', () => {
            const validSkillData = createTestSkillData('valid-skill');
            const result = skillSystem.registerSkill(validSkillData);

            expect(result.success).toBe(true);
            expect(result.validationErrors).toHaveLength(0);
        });

        test('7.2 コード変更なしでのデータ追加', () => {
            const newSkillData = createTestSkillData('new-skill', {
                name: 'New Dynamic Skill',
                skillType: SkillType.SPECIAL
            });

            const result = skillSystem.registerSkill(newSkillData);

            expect(result.success).toBe(true);
            expect(result.skillId).toBe('new-skill');
        });

        test('7.3 参照整合性のチェック', () => {
            const skillWithPrereq = createTestSkillData('prereq-skill', {
                learnCondition: {
                    level: 1,
                    prerequisiteSkills: ['basic-attack'],
                    jobRequirement: undefined
                }
            });

            const result = skillSystem.registerSkill(skillWithPrereq);

            expect(result.success).toBe(true);
            // 前提スキルの存在チェックは学習時に行われる
        });

        test('7.4 設定値変更によるバランス調整', () => {
            const balanceSkill = createTestSkillData('balance-skill', {
                effects: [{ type: 'damage', value: 100, duration: 0 }]
            });

            skillSystem.registerSkill(balanceSkill);

            // 設定値を変更してバランス調整
            const adjustedSkill = createTestSkillData('balance-skill', {
                effects: [{ type: 'damage', value: 80, duration: 0 }]
            });

            const result = skillSystem.registerSkill(adjustedSkill);

            expect(result.success).toBe(true);
            expect(result.skillId).toBe('balance-skill');
        });

        test('7.5 データエラー時の適切なエラーメッセージ', () => {
            const invalidSkillData = {
                ...createTestSkillData('invalid-skill'),
                skillType: 'invalid-type' as any
            };

            const result = skillSystem.registerSkill(invalidSkillData);

            expect(result.success).toBe(false);
            expect(result.validationErrors.length).toBeGreaterThan(0);
            expect(result.validationErrors[0]).toContain('skillType');
        });
    });

    describe('要件8: パフォーマンスと最適化', () => {
        test('8.1 1フレーム以内での効果計算完了', async () => {
            const perfSkill = createTestSkillData('perf-skill');

            skillSystem.registerSkill(perfSkill);
            skillSystem.learnSkill('test-character', 'perf-skill', createTestCharacterData('test-character'));

            const startTime = performance.now();
            const result = await skillSystem.useSkill(
                'perf-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );
            const endTime = performance.now();

            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeLessThan(16.67); // 1フレーム = 16.67ms
        });

        test('8.2 60fps維持のアニメーション', async () => {
            const animSkill = createTestSkillData('anim-perf-skill', {
                animation: { castAnimation: 'cast', effectAnimation: 'effect', duration: 1000 }
            });

            skillSystem.registerSkill(animSkill);
            skillSystem.learnSkill('test-character', 'anim-perf-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'anim-perf-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.flowStats?.animationTime).toBeDefined();
        });

        test('8.3 複数スキル効果の効率的処理', async () => {
            const multiSkill = createTestSkillData('multi-skill', {
                effects: [
                    { type: 'damage', value: 50, duration: 0 },
                    { type: 'debuff', value: -10, duration: 3 },
                    { type: 'status', value: 5, duration: 2 }
                ]
            });

            skillSystem.registerSkill(multiSkill);
            skillSystem.learnSkill('test-character', 'multi-skill', createTestCharacterData('test-character'));

            const startTime = performance.now();
            const result = await skillSystem.useSkill(
                'multi-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );
            const endTime = performance.now();

            expect(result.success).toBe(true);
            expect(result.result?.effects).toHaveLength(3);
            expect(endTime - startTime).toBeLessThan(50); // 効率的な処理
        });

        test('8.4 スキルデータキャッシュの最適化', () => {
            const cacheSkill = createTestSkillData('cache-skill');

            // 初回登録
            const result1 = skillSystem.registerSkill(cacheSkill);
            expect(result1.success).toBe(true);

            // キャッシュからの取得
            const performanceMetrics = skillSystem.getPerformanceMetrics();
            expect(performanceMetrics).toBeDefined();
        });

        test('8.5 メモリリークの防止', () => {
            const memorySkill = createTestSkillData('memory-skill');

            skillSystem.registerSkill(memorySkill);
            skillSystem.learnSkill('test-character', 'memory-skill', createTestCharacterData('test-character'));

            // システムをリセット
            skillSystem.reset();

            // メモリがクリアされていることを確認
            const systemState = skillSystem.getSystemState();
            expect(systemState.currentPhase).toBe('idle');
            expect(systemState.activeCaster).toBeUndefined();
        });
    });

    describe('要件9: エラーハンドリングと堅牢性', () => {
        test('9.1 無効なスキル使用時の適切なエラーメッセージ', async () => {
            const result = await skillSystem.useSkill(
                'non-existent-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe('skill_not_found');
            expect(result.error?.message).toContain('non-existent-skill');
        });

        test('9.2 破損データでのデフォルト値動作継続', () => {
            const corruptedSkill = {
                id: 'corrupted-skill',
                name: 'Corrupted Skill',
                // 必要なプロパティが不足
            } as any;

            const result = skillSystem.registerSkill(corruptedSkill);

            expect(result.success).toBe(false);
            expect(result.validationErrors.length).toBeGreaterThan(0);
        });

        test('9.3 スキル効果適用失敗時の状態復旧', async () => {
            const failSkill = createTestSkillData('fail-skill');

            // 戦場状態でエラーを発生させる
            mockBattlefield.applyDamage.mockImplementation(() => {
                throw new Error('Battle system error');
            });

            skillSystem.registerSkill(failSkill);
            skillSystem.learnSkill('test-character', 'fail-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'fail-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe('execution_error');

            // システム状態が復旧していることを確認
            const systemState = skillSystem.getSystemState();
            expect(systemState.currentPhase).toBe('idle');
        });

        test('9.4 アニメーションエラー時の効果のみ適用', async () => {
            const animErrorSkill = createTestSkillData('anim-error-skill');

            // アニメーションでエラーを発生させる
            mockScene.tweens.add.mockImplementation(() => {
                throw new Error('Animation error');
            });

            skillSystem.registerSkill(animErrorSkill);
            skillSystem.learnSkill('test-character', 'anim-error-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'anim-error-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            // アニメーションエラーでも効果は適用される
            expect(result.success).toBe(true);
            expect(result.result?.effects).toBeDefined();
        });

        test('9.5 予期しないエラーの適切なログ記録', async () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            const errorSkill = createTestSkillData('error-skill');

            // 予期しないエラーを発生させる
            mockBattlefield.getCurrentTurn.mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            skillSystem.registerSkill(errorSkill);
            skillSystem.learnSkill('test-character', 'error-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'error-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(false);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[SkillSystem]'),
                expect.any(String)
            );

            consoleLogSpy.mockRestore();
        });
    });

    describe('要件10: テスト可能性とデバッグ支援', () => {
        test('10.1 単体テスト可能な設計', () => {
            const testSkill = createTestSkillData('test-design-skill');

            const result = skillSystem.registerSkill(testSkill);

            expect(result.success).toBe(true);
            expect(typeof skillSystem.getSystemState).toBe('function');
            expect(typeof skillSystem.getPerformanceMetrics).toBe('function');
        });

        test('10.2 期待値との比較可能性', async () => {
            const compareSkill = createTestSkillData('compare-skill', {
                effects: [{ type: 'damage', value: 100, duration: 0 }]
            });

            skillSystem.registerSkill(compareSkill);
            skillSystem.learnSkill('test-character', 'compare-skill', createTestCharacterData('test-character'));

            const result = await skillSystem.useSkill(
                'compare-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(true);
            expect(result.result?.effects[0]?.actualValue).toBeCloseTo(100, 0);
        });

        test('10.3 デバッグモード時の詳細ログ出力', () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

            const debugSkill = createTestSkillData('debug-skill');
            skillSystem.registerSkill(debugSkill);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('[SkillSystem]'),
                expect.any(String)
            );

            consoleLogSpy.mockRestore();
        });

        test('10.4 統計情報の提供', async () => {
            const statsSkill = createTestSkillData('stats-skill');

            skillSystem.registerSkill(statsSkill);
            skillSystem.learnSkill('test-character', 'stats-skill', createTestCharacterData('test-character'));

            await skillSystem.useSkill(
                'stats-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            const statistics = skillSystem.getSkillStatistics('stats-skill');
            expect(statistics).toBeDefined();
            expect(statistics?.totalUsageCount).toBeGreaterThan(0);
        });

        test('10.5 コンソールコマンドの提供', () => {
            // デバッグモードでのコンソールコマンド機能をテスト
            const systemState = skillSystem.getSystemState();
            const performanceMetrics = skillSystem.getPerformanceMetrics();
            const executionHistory = skillSystem.getExecutionHistory(5);

            expect(systemState).toBeDefined();
            expect(performanceMetrics).toBeDefined();
            expect(executionHistory).toBeDefined();
            expect(Array.isArray(executionHistory)).toBe(true);
        });
    });

    describe('システム統合テスト', () => {
        test('全サブシステムの連携動作', async () => {
            // 複数のスキルを登録
            const skills = [
                createTestSkillData('attack-1', { skillType: SkillType.ATTACK }),
                createTestSkillData('heal-1', { skillType: SkillType.HEAL }),
                createTestSkillData('buff-1', { skillType: SkillType.BUFF })
            ];

            skills.forEach(skill => {
                const result = skillSystem.registerSkill(skill);
                expect(result.success).toBe(true);
                skillSystem.learnSkill('test-character', skill.id, createTestCharacterData('test-character'));
            });

            // 各スキルを順次使用
            for (const skill of skills) {
                const result = await skillSystem.useSkill(
                    skill.id,
                    'test-character',
                    { x: 2, y: 1 },
                    true
                );
                expect(result.success).toBe(true);
            }

            // システム状態の確認
            const systemState = skillSystem.getSystemState();
            expect(systemState.initialized).toBe(true);

            // パフォーマンスメトリクスの確認
            const metrics = skillSystem.getPerformanceMetrics();
            expect(metrics.size).toBeGreaterThan(0);

            // 実行履歴の確認
            const history = skillSystem.getExecutionHistory();
            expect(history.length).toBe(3);
        });

        test('エラー回復機能の動作', async () => {
            const errorSkill = createTestSkillData('error-recovery-skill');

            skillSystem.registerSkill(errorSkill);
            skillSystem.learnSkill('test-character', 'error-recovery-skill', createTestCharacterData('test-character'));

            // エラーを発生させる
            mockBattlefield.updateCharacter.mockImplementationOnce(() => {
                throw new Error('Test error');
            });

            const result = await skillSystem.useSkill(
                'error-recovery-skill',
                'test-character',
                { x: 2, y: 1 },
                true
            );

            expect(result.success).toBe(false);

            // エラー回復後の状態確認
            const systemState = skillSystem.getSystemState();
            expect(systemState.currentPhase).toBe('idle');
            expect(systemState.isExecuting).toBe(false);
        });
    });
});