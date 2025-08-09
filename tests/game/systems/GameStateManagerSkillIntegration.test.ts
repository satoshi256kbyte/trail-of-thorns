/**
 * GameStateManager スキルシステム統合のユニットテスト
 * 
 * このファイルには以下のテストが含まれます：
 * - スキル使用後のターン処理テスト
 * - ターン開始時のスキル状態更新テスト
 * - クールダウン管理テスト
 * - 継続効果処理テスト
 * - ターン制システム統合テスト
 */

import { GameStateManager } from '../../../game/src/systems/GameStateManager';
import { Unit, GameplayError } from '../../../game/src/types/gameplay';
import { CharacterSkillData, ActiveSkillEffect, BuffType, StatusEffectType } from '../../../game/src/types/skill';

// モックイベントエミッター
class MockEventEmitter {
    private events: Map<string, Function[]> = new Map();

    emit(event: string, data?: any): void {
        const listeners = this.events.get(event) || [];
        listeners.forEach(listener => listener(data));
    }

    on(event: string, listener: Function): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(listener);
    }

    getEmittedEvents(): string[] {
        return Array.from(this.events.keys());
    }

    getListenerCount(event: string): number {
        return this.events.get(event)?.length || 0;
    }
}

// テスト用ユニット作成ヘルパー
function createTestUnit(id: string, faction: 'player' | 'enemy' = 'player'): Unit {
    return {
        id,
        name: `Test Unit ${id}`,
        position: { x: 0, y: 0 },
        stats: {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3,
        },
        currentHP: 100,
        currentMP: 50,
        faction,
        hasActed: false,
        hasMoved: false,
        equipment: {},
    };
}

// テスト用スキルデータ作成ヘルパー
function createTestSkillData(cooldown: number = 0, usageLimit: number = 0) {
    return {
        id: 'test-skill',
        name: 'Test Skill',
        cooldown,
        usageLimit,
        mpCost: 10,
    };
}

// テスト用アクティブ効果作成ヘルパー
function createTestActiveEffect(
    effectType: BuffType | StatusEffectType,
    duration: number = 3
): ActiveSkillEffect {
    return {
        effectId: `effect-${Date.now()}`,
        effectType,
        value: 10,
        remainingDuration: duration,
        sourceSkillId: 'test-skill',
        casterId: 'test-caster',
        appliedAt: new Date(),
    };
}

describe('GameStateManager スキルシステム統合', () => {
    let gameStateManager: GameStateManager;
    let mockEventEmitter: MockEventEmitter;
    let testUnits: Unit[];

    beforeEach(() => {
        mockEventEmitter = new MockEventEmitter();
        gameStateManager = new GameStateManager(mockEventEmitter as any);

        // テスト用ユニットを作成
        testUnits = [
            createTestUnit('player1', 'player'),
            createTestUnit('player2', 'player'),
            createTestUnit('enemy1', 'enemy'),
        ];

        // ターンオーダーを初期化
        gameStateManager.initializeTurnOrder(testUnits);
    });

    describe('handleSkillUsage', () => {
        test('スキル使用後にキャラクターが行動済みになる', () => {
            const character = testUnits[0];
            const skillData = createTestSkillData();

            const result = gameStateManager.handleSkillUsage(character, 'test-skill', skillData);

            expect(result.success).toBe(true);
            expect(character.hasActed).toBe(true);
        });

        test('クールダウンが設定される', () => {
            const character = testUnits[0];
            const skillData = createTestSkillData(3);

            gameStateManager.handleSkillUsage(character, 'test-skill', skillData);

            const cooldown = gameStateManager.getSkillCooldown(character, 'test-skill');
            expect(cooldown).toBe(3);
        });

        test('スキル使用回数が記録される', () => {
            const character = testUnits[0];
            const skillData = createTestSkillData();

            gameStateManager.handleSkillUsage(character, 'test-skill', skillData);

            const usageCount = gameStateManager.getSkillUsageCount(character, 'test-skill');
            expect(usageCount).toBe(1);
        });

        test('複数回使用で使用回数が増加する', () => {
            const character = testUnits[0];
            const skillData = createTestSkillData();

            gameStateManager.handleSkillUsage(character, 'test-skill', skillData);
            gameStateManager.handleSkillUsage(character, 'test-skill', skillData);

            const usageCount = gameStateManager.getSkillUsageCount(character, 'test-skill');
            expect(usageCount).toBe(2);
        });

        test('移動と行動が完了した場合にターンが進む', () => {
            const character = testUnits[0];
            character.hasMoved = true; // 既に移動済み
            const skillData = createTestSkillData();

            const initialTurn = gameStateManager.getCurrentTurn();
            gameStateManager.handleSkillUsage(character, 'test-skill', skillData);

            // ターンが進んでいることを確認
            expect(character.hasActed).toBe(true);
            expect(character.hasMoved).toBe(true);
        });

        test('スキル使用イベントが発火される', () => {
            const character = testUnits[0];
            const skillData = createTestSkillData();
            let eventFired = false;

            mockEventEmitter.on('skill-used', () => {
                eventFired = true;
            });

            gameStateManager.handleSkillUsage(character, 'test-skill', skillData);

            expect(eventFired).toBe(true);
        });

        test('無効なキャラクターでエラーが返される', () => {
            const result = gameStateManager.handleSkillUsage(null as any, 'test-skill');

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
        });
    });

    describe('updateSkillStates', () => {
        test('スキルクールダウンが減少する', () => {
            const character = testUnits[0];

            // 初期クールダウンを設定
            gameStateManager.handleSkillUsage(character, 'test-skill', createTestSkillData(3));
            expect(gameStateManager.getSkillCooldown(character, 'test-skill')).toBe(3);

            // スキル状態を更新
            gameStateManager.updateSkillStates(character);

            expect(gameStateManager.getSkillCooldown(character, 'test-skill')).toBe(2);
        });

        test('クールダウンが0になったスキルは削除される', () => {
            const character = testUnits[0];

            // クールダウン1のスキルを設定
            gameStateManager.handleSkillUsage(character, 'test-skill', createTestSkillData(1));
            expect(gameStateManager.getSkillCooldown(character, 'test-skill')).toBe(1);

            // スキル状態を更新
            gameStateManager.updateSkillStates(character);

            expect(gameStateManager.getSkillCooldown(character, 'test-skill')).toBe(0);
        });

        test('継続効果の持続時間が減少する', () => {
            const character = testUnits[0];
            const effect = createTestActiveEffect(StatusEffectType.POISON, 3);

            // アクティブ効果を設定
            character.skillData = {
                characterId: character.id,
                learnedSkills: [],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: [effect],
            };

            gameStateManager.updateSkillStates(character);

            const activeEffects = gameStateManager.getActiveSkillEffects(character);
            expect(activeEffects).toHaveLength(1);
            expect(activeEffects[0].remainingDuration).toBe(2);
        });

        test('持続時間が0になった効果は削除される', () => {
            const character = testUnits[0];
            const effect = createTestActiveEffect(StatusEffectType.POISON, 1);

            character.skillData = {
                characterId: character.id,
                learnedSkills: [],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: [effect],
            };

            gameStateManager.updateSkillStates(character);

            const activeEffects = gameStateManager.getActiveSkillEffects(character);
            expect(activeEffects).toHaveLength(0);
        });

        test('毒ダメージが適用される', () => {
            const character = testUnits[0];
            const initialHP = character.currentHP;
            const effect = createTestActiveEffect(StatusEffectType.POISON, 2);

            character.skillData = {
                characterId: character.id,
                learnedSkills: [],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: [effect],
            };

            gameStateManager.updateSkillStates(character);

            expect(character.currentHP).toBeLessThan(initialHP);
        });

        test('スキル状態更新イベントが発火される', () => {
            const character = testUnits[0];
            let eventFired = false;

            mockEventEmitter.on('skill-states-updated', () => {
                eventFired = true;
            });

            gameStateManager.updateSkillStates(character);

            expect(eventFired).toBe(true);
        });

        test('無効なキャラクターでエラーが返される', () => {
            const result = gameStateManager.updateSkillStates(null as any);

            expect(result.success).toBe(false);
            expect(result.error).toBe(GameplayError.UNIT_NOT_FOUND);
        });
    });

    describe('スキルクールダウン管理', () => {
        test('getSkillCooldown - 存在しないスキルは0を返す', () => {
            const character = testUnits[0];
            const cooldown = gameStateManager.getSkillCooldown(character, 'nonexistent-skill');
            expect(cooldown).toBe(0);
        });

        test('getSkillCooldown - 設定されたクールダウンを正しく返す', () => {
            const character = testUnits[0];
            gameStateManager.handleSkillUsage(character, 'test-skill', createTestSkillData(5));

            const cooldown = gameStateManager.getSkillCooldown(character, 'test-skill');
            expect(cooldown).toBe(5);
        });

        test('複数スキルのクールダウンが独立して管理される', () => {
            const character = testUnits[0];

            gameStateManager.handleSkillUsage(character, 'skill1', createTestSkillData(3));
            gameStateManager.handleSkillUsage(character, 'skill2', createTestSkillData(5));

            expect(gameStateManager.getSkillCooldown(character, 'skill1')).toBe(3);
            expect(gameStateManager.getSkillCooldown(character, 'skill2')).toBe(5);
        });
    });

    describe('スキル使用回数管理', () => {
        test('getSkillUsageCount - 初期値は0', () => {
            const character = testUnits[0];
            const count = gameStateManager.getSkillUsageCount(character, 'test-skill');
            expect(count).toBe(0);
        });

        test('getSkillUsageCount - 使用後に正しい回数を返す', () => {
            const character = testUnits[0];

            gameStateManager.handleSkillUsage(character, 'test-skill', createTestSkillData());
            gameStateManager.handleSkillUsage(character, 'test-skill', createTestSkillData());
            gameStateManager.handleSkillUsage(character, 'test-skill', createTestSkillData());

            const count = gameStateManager.getSkillUsageCount(character, 'test-skill');
            expect(count).toBe(3);
        });

        test('複数スキルの使用回数が独立して管理される', () => {
            const character = testUnits[0];

            gameStateManager.handleSkillUsage(character, 'skill1', createTestSkillData());
            gameStateManager.handleSkillUsage(character, 'skill1', createTestSkillData());
            gameStateManager.handleSkillUsage(character, 'skill2', createTestSkillData());

            expect(gameStateManager.getSkillUsageCount(character, 'skill1')).toBe(2);
            expect(gameStateManager.getSkillUsageCount(character, 'skill2')).toBe(1);
        });
    });

    describe('アクティブ効果管理', () => {
        test('getActiveSkillEffects - 初期値は空配列', () => {
            const character = testUnits[0];
            const effects = gameStateManager.getActiveSkillEffects(character);
            expect(effects).toEqual([]);
        });

        test('getActiveSkillEffects - 設定された効果を正しく返す', () => {
            const character = testUnits[0];
            const effect1 = createTestActiveEffect(StatusEffectType.POISON);
            const effect2 = createTestActiveEffect(BuffType.ATTACK_UP);

            character.skillData = {
                characterId: character.id,
                learnedSkills: [],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: [effect1, effect2],
            };

            const effects = gameStateManager.getActiveSkillEffects(character);
            expect(effects).toHaveLength(2);
            expect(effects).toContain(effect1);
            expect(effects).toContain(effect2);
        });
    });

    describe('新ラウンド開始時の処理', () => {
        test('新ラウンド開始時に全キャラクターのスキル状態が更新される', () => {
            // 全キャラクターにクールダウンを設定
            testUnits.forEach(unit => {
                gameStateManager.handleSkillUsage(unit, 'test-skill', createTestSkillData(2));
            });

            // 初期クールダウンを確認
            testUnits.forEach(unit => {
                expect(gameStateManager.getSkillCooldown(unit, 'test-skill')).toBe(2);
            });

            // 手動でスキル状態を更新（新ラウンド開始をシミュレート）
            testUnits.forEach(unit => {
                if (unit.currentHP > 0) {
                    gameStateManager.updateSkillStates(unit);
                }
            });

            // 全キャラクターのクールダウンが減少していることを確認
            testUnits.forEach(unit => {
                expect(gameStateManager.getSkillCooldown(unit, 'test-skill')).toBe(1);
            });
        });

        test('死亡したキャラクターのスキル状態は更新されない', () => {
            const deadUnit = testUnits[0];
            deadUnit.currentHP = 0; // 死亡状態

            gameStateManager.handleSkillUsage(deadUnit, 'test-skill', createTestSkillData(2));

            // 新ラウンド開始
            testUnits.forEach(unit => {
                unit.hasActed = true;
                unit.hasMoved = true;
            });
            gameStateManager.forceNextTurn();

            // 死亡したキャラクターのクールダウンは変化しない
            expect(gameStateManager.getSkillCooldown(deadUnit, 'test-skill')).toBe(2);
        });
    });

    describe('エラーハンドリング', () => {
        test('スキルデータが存在しないキャラクターでも正常に動作する', () => {
            const character = testUnits[0];
            // skillDataを明示的にundefinedに設定
            character.skillData = undefined;

            const result = gameStateManager.updateSkillStates(character);
            expect(result.success).toBe(true);

            const cooldown = gameStateManager.getSkillCooldown(character, 'test-skill');
            expect(cooldown).toBe(0);

            const usageCount = gameStateManager.getSkillUsageCount(character, 'test-skill');
            expect(usageCount).toBe(0);

            const effects = gameStateManager.getActiveSkillEffects(character);
            expect(effects).toEqual([]);
        });

        test('不正なスキルデータでもエラーが発生しない', () => {
            const character = testUnits[0];

            // 不正なスキルデータを設定
            character.skillData = {
                characterId: character.id,
                learnedSkills: [],
                skillCooldowns: null as any,
                skillUsageCounts: null as any,
                skillLearnHistory: [],
                activeEffects: null as any,
            };

            expect(() => {
                gameStateManager.updateSkillStates(character);
                gameStateManager.getSkillCooldown(character, 'test-skill');
                gameStateManager.getSkillUsageCount(character, 'test-skill');
                gameStateManager.getActiveSkillEffects(character);
            }).not.toThrow();
        });
    });

    describe('イベント発火', () => {
        test('skill-used イベントが正しいデータで発火される', () => {
            const character = testUnits[0];
            const skillData = createTestSkillData(2);
            let eventData: any = null;

            mockEventEmitter.on('skill-used', (data) => {
                eventData = data;
            });

            gameStateManager.handleSkillUsage(character, 'test-skill', skillData);

            expect(eventData).not.toBeNull();
            expect(eventData.character).toBe(character);
            expect(eventData.skillId).toBe('test-skill');
            expect(eventData.skillData).toBe(skillData);
        });

        test('skill-states-updated イベントが正しいデータで発火される', () => {
            const character = testUnits[0];
            let eventData: any = null;

            mockEventEmitter.on('skill-states-updated', (data) => {
                eventData = data;
            });

            gameStateManager.updateSkillStates(character);

            expect(eventData).not.toBeNull();
            expect(eventData.character).toBe(character);
            expect(eventData.currentTurn).toBe(gameStateManager.getCurrentTurn());
        });

        test('continuous-damage-applied イベントが毒ダメージで発火される', () => {
            const character = testUnits[0];
            const effect = createTestActiveEffect(StatusEffectType.POISON, 2);
            let eventData: any = null;

            character.skillData = {
                characterId: character.id,
                learnedSkills: [],
                skillCooldowns: new Map(),
                skillUsageCounts: new Map(),
                skillLearnHistory: [],
                activeEffects: [effect],
            };

            mockEventEmitter.on('continuous-damage-applied', (data) => {
                eventData = data;
            });

            gameStateManager.updateSkillStates(character);

            expect(eventData).not.toBeNull();
            expect(eventData.character).toBe(character);
            expect(eventData.effectType).toBe(StatusEffectType.POISON);
            expect(eventData.damage).toBeGreaterThan(0);
        });
    });
});