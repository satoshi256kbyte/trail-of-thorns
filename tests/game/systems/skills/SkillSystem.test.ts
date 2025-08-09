/**
 * SkillSystemメインコントローラーの統合テスト
 */

import * as Phaser from 'phaser';
import { SkillSystem, SkillSystemConfig } from '../../../../game/src/systems/skills/SkillSystem';
import {
    SkillData,
    SkillType,
    TargetType,
    DamageType,
    Position,
    SkillUsabilityError
} from '../../../../game/src/types/skill';

// モックシーンクラス
class MockScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MockScene' });
    }

    create() {
        // モック実装
    }
}

// モックファクトリー
class MockGameObjectFactory {
    container(x: number, y: number): any {
        const mockContainer = {
            setScrollFactor: () => mockContainer,
            setDepth: () => mockContainer,
            setVisible: () => mockContainer,
            add: () => ({}),
            getBounds: () => ({ contains: () => false }),
            setPosition: () => mockContainer,
            setAlpha: () => mockContainer,
            list: [],
            visible: true
        };
        return mockContainer;
    }

    graphics(): any {
        const mockGraphics = {
            fillStyle: () => mockGraphics,
            fillRoundedRect: () => mockGraphics,
            lineStyle: () => mockGraphics,
            strokeRoundedRect: () => mockGraphics,
            strokeRect: () => mockGraphics,
            fillRect: () => mockGraphics,
            clear: () => mockGraphics,
            setVisible: () => mockGraphics,
            setAlpha: () => mockGraphics,
            setScrollFactor: () => mockGraphics,
            setDepth: () => mockGraphics,
            beginPath: () => mockGraphics,
            moveTo: () => mockGraphics,
            lineTo: () => mockGraphics,
            strokePath: () => mockGraphics,
            visible: true
        };
        return mockGraphics;
    }

    text(x: number, y: number, text: string, style?: any): any {
        return {
            setOrigin: () => ({}),
            setInteractive: () => ({
                on: () => ({})
            }),
            on: () => ({}),
            setColor: () => ({}),
            destroy: () => ({})
        };
    }
}

// モック戦場状態
class MockBattlefieldState {
    private characters: Map<string, any> = new Map();
    private currentTurn: number = 1;

    addCharacter(id: string, data: any) {
        this.characters.set(id, data);
    }

    getCharacter(id: string): any {
        return this.characters.get(id);
    }

    getCharacterAt(position: Position): any {
        for (const character of this.characters.values()) {
            if (character.position.x === position.x && character.position.y === position.y) {
                return character;
            }
        }
        return null;
    }

    getCurrentPlayer(): string {
        return 'player';
    }

    getCurrentTurn(): number {
        return this.currentTurn;
    }

    setCurrentTurn(turn: number) {
        this.currentTurn = turn;
    }

    updateCharacterState(characterId: string, updates: any): void {
        const character = this.characters.get(characterId);
        if (character) {
            Object.assign(character, updates);
        }
    }

    isValidPosition(position: Position): boolean {
        return position.x >= 0 && position.x < 10 && position.y >= 0 && position.y < 10;
    }

    isObstacle(position: Position): boolean {
        return false; // 簡単のため障害物なし
    }
}

describe('SkillSystem', () => {
    let skillSystem: SkillSystem;
    let mockScene: MockScene;
    let mockBattlefield: MockBattlefieldState;

    // テスト用スキルデータ
    const testSkillData: SkillData = {
        id: 'test_attack',
        name: 'テスト攻撃',
        description: 'テスト用の攻撃スキル',
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
            damageType: DamageType.PHYSICAL,
            successRate: 100
        }],
        usageCondition: {
            mpCost: 10,
            cooldown: 0,
            usageLimit: 0,
            levelRequirement: 1,
            weaponRequirement: ['sword'],
            allowedStatuses: []
        },
        learnCondition: {
            level: 1
        },
        animation: {
            castAnimation: 'cast_attack',
            effectAnimation: 'effect_attack',
            duration: 1000
        }
    };

    const healSkillData: SkillData = {
        id: 'test_heal',
        name: 'テスト回復',
        description: 'テスト用の回復スキル',
        skillType: SkillType.HEAL,
        targetType: TargetType.SINGLE_ALLY,
        range: 3,
        areaOfEffect: {
            shape: 'single',
            size: 1
        },
        effects: [{
            type: 'heal',
            value: 30,
            successRate: 100
        }],
        usageCondition: {
            mpCost: 15,
            cooldown: 2,
            usageLimit: 5,
            levelRequirement: 2
        },
        learnCondition: {
            level: 2
        },
        animation: {
            castAnimation: 'cast_heal',
            effectAnimation: 'effect_heal',
            duration: 800
        }
    };

    beforeEach(() => {
        // モックシーンを作成
        mockScene = new MockScene();

        // モックファクトリーを設定
        (mockScene as any).add = new MockGameObjectFactory();
        (mockScene as any).input = {
            keyboard: {
                on: () => ({})
            },
            on: () => ({})
        };
        (mockScene as any).events = new Phaser.Events.EventEmitter();
        (mockScene as any).tweens = {
            add: () => ({})
        };
        (mockScene as any).time = {
            delayedCall: () => ({})
        };
        (mockScene as any).scale = {
            on: () => ({})
        };

        // モック戦場状態を作成
        mockBattlefield = new MockBattlefieldState();

        // テスト用キャラクターを追加
        mockBattlefield.addCharacter('player1', {
            id: 'player1',
            level: 5,
            currentMP: 50,
            currentHP: 80,
            position: { x: 2, y: 2 },
            faction: 'player',
            hasActed: false,
            job: 'warrior',
            equipment: {
                weapon: 'sword'
            },
            stats: {
                maxHP: 100,
                maxMP: 60,
                attack: 25,
                defense: 20,
                magicAttack: 10,
                magicDefense: 15,
                speed: 12
            }
        });

        mockBattlefield.addCharacter('enemy1', {
            id: 'enemy1',
            level: 3,
            currentMP: 20,
            currentHP: 60,
            position: { x: 4, y: 3 },
            faction: 'enemy',
            hasActed: false,
            stats: {
                maxHP: 70,
                maxMP: 30,
                attack: 20,
                defense: 15,
                magicAttack: 8,
                magicDefense: 12,
                speed: 10
            }
        });

        // SkillSystemを作成
        const skillSystemConfig: Partial<SkillSystemConfig> = {
            debugMode: true,
            execution: {
                enableAnimations: false,
                enableSoundEffects: false,
                enableDebugLogging: true
            }
        };

        skillSystem = new SkillSystem(mockScene, skillSystemConfig);
        skillSystem.setBattlefieldState(mockBattlefield);
    });

    afterEach(() => {
        if (skillSystem) {
            skillSystem.destroy();
        }
    });

    describe('初期化', () => {
        test('SkillSystemが正しく初期化される', () => {
            expect(skillSystem).toBeDefined();
            expect(skillSystem.getSystemState().initialized).toBe(true);
            expect(skillSystem.getSystemState().currentPhase).toBe('idle');
            expect(skillSystem.getSystemState().isExecuting).toBe(false);
        });

        test('サブシステムが正しく統合される', () => {
            // スキル登録テスト
            const result = skillSystem.registerSkill(testSkillData);
            expect(result.success).toBe(true);

            // キャラクターにスキルを習得させる
            const learnResult = skillSystem.learnSkill('player1', 'test_attack', mockBattlefield.getCharacter('player1'));
            expect(learnResult.success).toBe(true);
        });
    });

    describe('スキル登録と管理', () => {
        test('スキルを正しく登録できる', () => {
            const result = skillSystem.registerSkill(testSkillData);
            expect(result.success).toBe(true);
            expect(result.message).toContain('テスト攻撃');
        });

        test('重複するスキルIDの登録を拒否する', () => {
            skillSystem.registerSkill(testSkillData);
            const result = skillSystem.registerSkill(testSkillData);
            expect(result.success).toBe(false);
            expect(result.message).toContain('既に登録されています');
        });

        test('無効なスキルデータの登録を拒否する', () => {
            const invalidSkillData = { ...testSkillData };
            delete (invalidSkillData as any).name;

            const result = skillSystem.registerSkill(invalidSkillData);
            expect(result.success).toBe(false);
        });
    });

    describe('使用可能スキル取得', () => {
        beforeEach(() => {
            // テスト用スキルを登録
            skillSystem.registerSkill(testSkillData);
            skillSystem.registerSkill(healSkillData);

            // キャラクターにスキルを習得させる
            const character = mockBattlefield.getCharacter('player1');
            skillSystem.learnSkill('player1', 'test_attack', character);
            skillSystem.learnSkill('player1', 'test_heal', character);
        });

        test('使用可能なスキル一覧を取得できる', () => {
            const availableSkills = skillSystem.getAvailableSkills('player1');

            expect(availableSkills).toHaveLength(2);
            expect(availableSkills[0].skill.id).toBe('test_attack');
            expect(availableSkills[0].enabled).toBe(true);
            expect(availableSkills[0].usability.canUse).toBe(true);
        });

        test('フィルター条件で絞り込める', () => {
            const attackSkills = skillSystem.getAvailableSkills('player1', {
                skillType: SkillType.ATTACK
            });

            expect(attackSkills).toHaveLength(1);
            expect(attackSkills[0].skill.skillType).toBe(SkillType.ATTACK);

            const healSkills = skillSystem.getAvailableSkills('player1', {
                skillType: SkillType.HEAL
            });

            expect(healSkills).toHaveLength(1);
            expect(healSkills[0].skill.skillType).toBe(SkillType.HEAL);
        });

        test('使用不可スキルが正しく識別される', () => {
            // MPを不足させる
            const character = mockBattlefield.getCharacter('player1');
            character.currentMP = 5;

            const availableSkills = skillSystem.getAvailableSkills('player1');
            const attackSkill = availableSkills.find(s => s.skill.id === 'test_attack');
            const healSkill = availableSkills.find(s => s.skill.id === 'test_heal');

            expect(attackSkill?.enabled).toBe(false); // MP不足
            expect(healSkill?.enabled).toBe(false); // MP不足
        });

        test('推奨度が正しく計算される', () => {
            const availableSkills = skillSystem.getAvailableSkills('player1');

            // 攻撃スキルの方が推奨度が高いはず
            const attackSkill = availableSkills.find(s => s.skill.id === 'test_attack');
            const healSkill = availableSkills.find(s => s.skill.id === 'test_heal');

            expect(attackSkill?.recommendation).toBeGreaterThan(healSkill?.recommendation || 0);
        });
    });

    describe('スキル使用フロー', () => {
        beforeEach(() => {
            // テスト用スキルを登録・習得
            skillSystem.registerSkill(testSkillData);
            const character = mockBattlefield.getCharacter('player1');
            skillSystem.learnSkill('player1', 'test_attack', character);
        });

        test('スキルを直接実行できる（UIスキップ）', async () => {
            const targetPosition: Position = { x: 4, y: 3 };

            const result = await skillSystem.useSkill(
                'test_attack',
                'player1',
                targetPosition,
                true // UIスキップ
            );

            expect(result.success).toBe(true);
            expect(result.result).toBeDefined();
            expect(result.result?.success).toBe(true);
            expect(result.flowStats).toBeDefined();
        });

        test('存在しないスキルの使用を拒否する', async () => {
            const result = await skillSystem.useSkill(
                'nonexistent_skill',
                'player1',
                { x: 4, y: 3 },
                true
            );

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe('skill_not_found');
            expect(result.error?.phase).toBe('validation');
        });

        test('使用条件を満たさないスキルの使用を拒否する', async () => {
            // MPを不足させる
            const character = mockBattlefield.getCharacter('player1');
            character.currentMP = 5;

            const result = await skillSystem.useSkill(
                'test_attack',
                'player1',
                { x: 4, y: 3 },
                true
            );

            expect(result.success).toBe(false);
            expect(result.result?.success).toBe(false);
        });

        test('同時実行を防ぐ', async () => {
            const targetPosition: Position = { x: 4, y: 3 };

            // 最初の実行を開始（完了を待たない）
            const promise1 = skillSystem.useSkill('test_attack', 'player1', targetPosition, true);

            // 2番目の実行を試行
            const result2 = await skillSystem.useSkill('test_attack', 'player1', targetPosition, true);

            expect(result2.success).toBe(false);
            expect(result2.error?.type).toBe('system_busy');

            // 最初の実行を完了
            const result1 = await promise1;
            expect(result1.success).toBe(true);
        });
    });

    describe('統計とパフォーマンス', () => {
        beforeEach(() => {
            skillSystem.registerSkill(testSkillData);
            const character = mockBattlefield.getCharacter('player1');
            skillSystem.learnSkill('player1', 'test_attack', character);
        });

        test('パフォーマンスメトリクスが記録される', async () => {
            const initialMetrics = skillSystem.getPerformanceMetrics();
            expect(initialMetrics.size).toBe(0);

            await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);

            const updatedMetrics = skillSystem.getPerformanceMetrics();
            expect(updatedMetrics.size).toBeGreaterThan(0);
            expect(updatedMetrics.has('avg_total_time')).toBe(true);
            expect(updatedMetrics.has('avg_execution_time')).toBe(true);
        });

        test('実行履歴が記録される', async () => {
            const initialHistory = skillSystem.getExecutionHistory();
            expect(initialHistory).toHaveLength(0);

            await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);

            const updatedHistory = skillSystem.getExecutionHistory();
            expect(updatedHistory).toHaveLength(1);
            expect(updatedHistory[0].success).toBe(true);
        });

        test('スキル統計が更新される', async () => {
            await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);

            const stats = skillSystem.getSkillStatistics('test_attack');
            expect(stats).toBeDefined();
            expect(stats?.totalUsageCount).toBe(1);
            expect(stats?.successCount).toBe(1);
        });

        test('実行履歴の上限が守られる', async () => {
            // 大量の実行を行う（テスト用に少ない回数で）
            for (let i = 0; i < 5; i++) {
                await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);
            }

            const history = skillSystem.getExecutionHistory(3);
            expect(history).toHaveLength(3);
        });
    });

    describe('エラーハンドリング', () => {
        test('予期しないエラーを適切に処理する', async () => {
            // 無効な戦場状態を設定
            skillSystem.setBattlefieldState(null);

            const result = await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('エラー状態が正しく記録される', async () => {
            // エラーを発生させる
            skillSystem.setBattlefieldState(null);
            await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);

            const systemState = skillSystem.getSystemState();
            expect(systemState.errorState).toBeDefined();
            expect(systemState.errorState?.hasError).toBe(true);
        });
    });

    describe('システム状態管理', () => {
        test('システム状態が正しく更新される', async () => {
            skillSystem.registerSkill(testSkillData);
            const character = mockBattlefield.getCharacter('player1');
            skillSystem.learnSkill('player1', 'test_attack', character);

            const initialState = skillSystem.getSystemState();
            expect(initialState.currentPhase).toBe('idle');
            expect(initialState.isExecuting).toBe(false);

            // 実行中の状態確認は非同期処理のため困難だが、
            // 完了後の状態は確認できる
            await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);

            const finalState = skillSystem.getSystemState();
            expect(finalState.currentPhase).toBe('idle');
            expect(finalState.isExecuting).toBe(false);
            expect(finalState.lastExecutionResult).toBeDefined();
        });

        test('リセット機能が正しく動作する', async () => {
            skillSystem.registerSkill(testSkillData);
            const character = mockBattlefield.getCharacter('player1');
            skillSystem.learnSkill('player1', 'test_attack', character);

            await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);

            // リセット前の状態確認
            expect(skillSystem.getExecutionHistory()).toHaveLength(1);
            expect(skillSystem.getPerformanceMetrics().size).toBeGreaterThan(0);

            // リセット実行
            skillSystem.reset();

            // リセット後の状態確認
            const state = skillSystem.getSystemState();
            expect(state.currentPhase).toBe('idle');
            expect(state.isExecuting).toBe(false);
            expect(state.activeCaster).toBeUndefined();
            expect(state.selectedSkill).toBeUndefined();
            expect(skillSystem.getExecutionHistory()).toHaveLength(0);
            expect(skillSystem.getPerformanceMetrics().size).toBe(0);
        });
    });

    describe('イベント統合', () => {
        test('スキル実行完了イベントが発火される', async () => {
            skillSystem.registerSkill(testSkillData);
            const character = mockBattlefield.getCharacter('player1');
            skillSystem.learnSkill('player1', 'test_attack', character);

            let eventFired = false;
            skillSystem.on('skill-executed', () => {
                eventFired = true;
            });

            await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);

            expect(eventFired).toBe(true);
        });

        test('戦闘システム更新イベントが転送される', async () => {
            skillSystem.registerSkill(testSkillData);
            const character = mockBattlefield.getCharacter('player1');
            skillSystem.learnSkill('player1', 'test_attack', character);

            let battleUpdateEventFired = false;
            skillSystem.on('battle-system-update', () => {
                battleUpdateEventFired = true;
            });

            await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);

            expect(battleUpdateEventFired).toBe(true);
        });

        test('ターンシステム更新イベントが転送される', async () => {
            skillSystem.registerSkill(testSkillData);
            const character = mockBattlefield.getCharacter('player1');
            skillSystem.learnSkill('player1', 'test_attack', character);

            let turnUpdateEventFired = false;
            skillSystem.on('turn-system-update', () => {
                turnUpdateEventFired = true;
            });

            await skillSystem.useSkill('test_attack', 'player1', { x: 4, y: 3 }, true);

            expect(turnUpdateEventFired).toBe(true);
        });
    });
});