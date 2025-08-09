/**
 * SkillExecutor ユニットテスト
 */

import * as Phaser from 'phaser';
import { SkillExecutor } from '../../../../game/src/systems/skills/SkillExecutor';
import { SkillManager } from '../../../../game/src/systems/skills/SkillManager';
import { SkillConditionChecker } from '../../../../game/src/systems/skills/SkillConditionChecker';
import {
    SkillData,
    SkillType,
    TargetType,
    DamageType,
    HealType,
    BuffType,
    SkillExecutionContext,
    SkillUsabilityError,
    Position
} from '../../../../game/src/types/skill';

// モッククラス
class MockScene extends Phaser.Events.EventEmitter {
    add = {
        graphics: jest.fn(() => ({
            fillStyle: jest.fn(),
            lineStyle: jest.fn(),
            fillRect: jest.fn(),
            strokeRect: jest.fn()
        }))
    };
}

class MockAnimator {
    playCastAnimation = jest.fn().mockResolvedValue(undefined);
    playSkillAnimation = jest.fn().mockResolvedValue(undefined);
    playHitEffect = jest.fn().mockResolvedValue(undefined);
    showContinuousEffect = jest.fn();
    clearEffects = jest.fn();
}

// テストデータ作成ヘルパー
function createMockSkillData(overrides: Partial<SkillData> = {}): SkillData {
    return {
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
            value: 50,
            damageType: DamageType.PHYSICAL
        }],
        usageCondition: {
            mpCost: 10,
            cooldown: 2,
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
    };
}

function createMockCharacter(overrides: any = {}) {
    return {
        id: 'test-character',
        name: 'テストキャラクター',
        level: 5,
        currentHP: 100,
        currentMP: 50,
        position: { x: 0, y: 0 },
        faction: 'player',
        hasActed: false,
        stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 10,
            magicAttack: 15,
            magicDefense: 8,
            speed: 12
        },
        ...overrides
    };
}

function createMockBattlefieldState() {
    const characters = new Map();
    const characterPositions = new Map();

    return {
        getCharacter: jest.fn((id: string) => characters.get(id)),
        getCharacterAt: jest.fn((position: Position) => {
            const key = `${position.x},${position.y}`;
            return characterPositions.get(key);
        }),
        getCurrentPlayer: jest.fn(() => 'player1'),
        getCurrentTurn: jest.fn(() => 1),
        updateCharacterState: jest.fn(),
        applyDamage: jest.fn(() => true),
        applyHealing: jest.fn(() => true),
        applyStatusEffect: jest.fn(() => true),
        removeStatusEffect: jest.fn(() => true),
        // テスト用のヘルパーメソッド
        _setCharacter: (id: string, character: any) => characters.set(id, character),
        _setCharacterAt: (position: Position, character: any) => {
            const key = `${position.x},${position.y}`;
            characterPositions.set(key, character);
        }
    };
}

describe('SkillExecutor', () => {
    let skillExecutor: SkillExecutor;
    let skillManager: SkillManager;
    let conditionChecker: SkillConditionChecker;
    let mockScene: MockScene;
    let mockAnimator: MockAnimator;
    let mockBattlefield: any;

    beforeEach(() => {
        mockScene = new MockScene();
        skillManager = new SkillManager();
        conditionChecker = new SkillConditionChecker();
        mockAnimator = new MockAnimator();
        mockBattlefield = createMockBattlefieldState();

        skillExecutor = new SkillExecutor(
            mockScene as any,
            skillManager,
            conditionChecker,
            {
                enableAnimations: true,
                enableDebugLogging: false
            }
        );

        skillExecutor.setAnimator(mockAnimator as unknown);
    });

    afterEach(() => {
        skillExecutor.destroy();
    });

    describe('executeSkill', () => {
        it('攻撃スキルを正常に実行できる', async () => {
            // テストデータ準備
            const skillData = createMockSkillData({
                id: 'attack-skill',
                skillType: SkillType.ATTACK
            });
            const caster = createMockCharacter({ id: 'caster', currentMP: 20 });
            const target = createMockCharacter({ id: 'target', faction: 'enemy', position: { x: 1, y: 0 } });

            // スキルを登録
            skillManager.registerSkill(skillData);

            // 戦場状態を設定
            mockBattlefield._setCharacter('caster', caster);
            mockBattlefield._setCharacterAt({ x: 1, y: 0 }, target);

            // 実行コンテキストを作成
            const context: SkillExecutionContext = {
                caster: 'caster',
                skillId: 'attack-skill',
                targetPosition: { x: 1, y: 0 },
                battlefieldState: mockBattlefield,
                currentTurn: 1,
                executionTime: new Date()
            };

            // スキル実行
            const result = await skillExecutor.executeSkill(context);

            // 結果検証
            expect(result.success).toBe(true);
            expect(result.mpCost).toBe(10);
            expect(result.targets).toContain('target');
            expect(result.effects).toHaveLength(1);
            expect(result.effects[0].effectType).toBe('damage');
            expect(result.effects[0].success).toBe(true);

            // MP消費確認
            expect(caster.currentMP).toBe(10); // 20 - 10

            // アニメーション実行確認
            expect(mockAnimator.playCastAnimation).toHaveBeenCalled();
            expect(mockAnimator.playSkillAnimation).toHaveBeenCalled();
        });

        it('MP不足の場合は実行に失敗する', async () => {
            // テストデータ準備
            const skillData = createMockSkillData({
                usageCondition: {
                    mpCost: 30,
                    cooldown: 0,
                    usageLimit: 0,
                    levelRequirement: 1
                }
            });
            const caster = createMockCharacter({ id: 'caster', currentMP: 10 }); // MP不足

            // スキルを登録
            skillManager.registerSkill(skillData);

            // 戦場状態を設定
            mockBattlefield._setCharacter('caster', caster);

            // 実行コンテキストを作成
            const context: SkillExecutionContext = {
                caster: 'caster',
                skillId: 'test-skill',
                targetPosition: { x: 1, y: 0 },
                battlefieldState: mockBattlefield,
                currentTurn: 1,
                executionTime: new Date()
            };

            // スキル実行
            const result = await skillExecutor.executeSkill(context);

            // 結果検証
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.INSUFFICIENT_MP);
            expect(result.errorMessage).toContain('MP不足');
        });

        it('存在しないスキルの場合は実行に失敗する', async () => {
            // 戦場状態を設定
            const caster = createMockCharacter({ id: 'caster' });
            mockBattlefield._setCharacter('caster', caster);

            // 実行コンテキストを作成
            const context: SkillExecutionContext = {
                caster: 'caster',
                skillId: 'non-existent-skill',
                targetPosition: { x: 1, y: 0 },
                battlefieldState: mockBattlefield,
                currentTurn: 1,
                executionTime: new Date()
            };

            // スキル実行
            const result = await skillExecutor.executeSkill(context);

            // 結果検証
            expect(result.success).toBe(false);
            expect(result.error).toBe(SkillUsabilityError.SKILL_NOT_FOUND);
        });
    });

    describe('状態管理', () => {
        it('実行状態を正しく管理する', () => {
            // 初期状態確認
            const state = skillExecutor.getExecutionState();
            expect(state.phase).toBe('idle');
            expect(state.currentSkill).toBeNull();
            expect(state.isAnimating).toBe(false);
        });

        it('resetで状態をクリアできる', () => {
            // リセット実行
            skillExecutor.reset();

            // 状態確認
            const state = skillExecutor.getExecutionState();
            expect(state.phase).toBe('idle');
            expect(state.currentSkill).toBeNull();
            expect(skillExecutor.getExecutionHistory()).toHaveLength(0);
        });
    });
});