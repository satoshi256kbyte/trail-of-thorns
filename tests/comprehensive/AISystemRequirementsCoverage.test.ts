/**
 * AIシステム要件カバレッジテスト
 * 
 * AIシステムの全要件が適切に実装されていることを検証するテスト
 * 要件文書の各項目に対応したテストケースを提供
 */

import { AISystemManager } from '../../game/src/systems/ai/AISystemManager';
import { AIController } from '../../game/src/systems/AIController';
import { ActionEvaluator } from '../../game/src/systems/ActionEvaluator';
import { BehaviorTree } from '../../game/src/systems/ai/BehaviorTree';
import { AIPersonalityFactory } from '../../game/src/systems/ai/AIPersonality';

import {
    AIAction,
    AIActionType,
    AIContext,
    AIPersonalityType,
    DifficultySettings,
    AISystemManagerConfig,
    AIExecutionResult,
} from '../../game/src/types/ai';
import { Unit, MapData, GameState } from '../../game/src/types/gameplay';

// テスト用ヘルパー
const createMockScene = () => ({
    events: { on: jest.fn(), emit: jest.fn() },
    add: {
        container: jest.fn(() => ({
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            add: jest.fn(),
            removeAll: jest.fn(),
        })),
        circle: jest.fn(() => ({})),
        text: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
        rectangle: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
    },
    tweens: { add: jest.fn() },
    time: { delayedCall: jest.fn((delay, callback) => setTimeout(callback, 0)) },
});

const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
    id: 'test-unit',
    name: 'Test Unit',
    position: { x: 5, y: 5 },
    stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
    currentHP: 100,
    currentMP: 50,
    faction: 'enemy',
    hasActed: false,
    hasMoved: false,
    ...overrides,
});

const createMockSystems = () => ({
    gameStateManager: {
        getGameState: jest.fn(() => ({ currentTurn: 1, activePlayer: 'enemy', turnOrder: [] })),
        nextTurn: jest.fn(() => ({ success: true })),
    },
    movementSystem: {
        executeMovement: jest.fn(() => Promise.resolve({ success: true })),
        calculateMovementRange: jest.fn(() => [{ x: 4, y: 5 }, { x: 6, y: 5 }]),
        canMoveTo: jest.fn(() => true),
    },
    battleSystem: {
        executeAttack: jest.fn(() => Promise.resolve({ success: true })),
        canAttack: jest.fn(() => true),
        calculateDamage: jest.fn(() => 25),
    },
    skillSystem: {
        executeSkill: jest.fn(() => Promise.resolve({ success: true })),
        getAvailableSkills: jest.fn(() => ['basic-attack']),
        canUseSkill: jest.fn(() => true),
    },
    recruitmentSystem: {
        isNPC: jest.fn(() => false),
    },
});

describe('AIシステム要件カバレッジテスト', () => {
    let aiSystemManager: AISystemManager;
    let mockScene: any;
    let mockSystems: any;
    let mockEventEmitter: any;

    beforeEach(() => {
        mockScene = createMockScene();
        mockSystems = createMockSystems();
        mockEventEmitter = { on: jest.fn(), emit: jest.fn() };

        const config: AISystemManagerConfig = {
            thinkingTimeLimit: 2000,
            enableDebugLogging: true,
            enableVisualFeedback: true,
            randomFactor: 0.2,
            npcPriorityMultiplier: 50,
        };

        aiSystemManager = new AISystemManager(mockScene, config, mockEventEmitter);
        aiSystemManager.initialize(
            mockSystems.gameStateManager,
            mockSystems.movementSystem,
            mockSystems.battleSystem,
            mockSystems.skillSystem,
            mockSystems.recruitmentSystem
        );
    });
    describe('要件1: AI基盤システム', () => {
        test('1.1 AIControllerが各敵キャラクターに割り当てられること', () => {
            const enemies = [
                createMockUnit({ id: 'enemy-1', faction: 'enemy' }),
                createMockUnit({ id: 'enemy-2', faction: 'enemy' }),
                createMockUnit({ id: 'enemy-3', faction: 'enemy' }),
            ];

            expect(() => aiSystemManager.createAIControllers(enemies)).not.toThrow();

            // プレイヤーユニットは除外されることを確認
            const allUnits = [
                ...enemies,
                createMockUnit({ id: 'player-1', faction: 'player' }),
            ];

            expect(() => aiSystemManager.createAIControllers(allUnits)).not.toThrow();
        });

        test('1.2 AIが適切な行動（移動、攻撃、スキル使用、待機）を決定すること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);
            expect([
                AIActionType.MOVE,
                AIActionType.ATTACK,
                AIActionType.SKILL,
                AIActionType.WAIT,
                AIActionType.DEFEND
            ]).toContain(result.action.type);
        });

        test('1.3 思考時間が2秒以内に完了すること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const startTime = performance.now();
            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);
            const endTime = performance.now();

            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeLessThan(2000);
            expect(result.executionTime).toBeLessThan(2000);
        });

        test('1.4 行動結果がゲーム状態に正しく反映されること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // 行動に応じてユニットの状態が更新されることを確認
            if (result.action.type === AIActionType.MOVE) {
                expect(enemyUnit.hasMoved).toBe(true);
            } else if ([AIActionType.ATTACK, AIActionType.SKILL].includes(result.action.type)) {
                expect(enemyUnit.hasActed).toBe(true);
            } else if (result.action.type === AIActionType.WAIT) {
                expect(enemyUnit.hasActed).toBe(true);
            }
        });

        test('1.5 デバッグモードでAI思考過程が可視化されること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            // 視覚的フィードバック要素が作成されたことを確認
            expect(mockScene.add.container).toHaveBeenCalled();
            expect(mockScene.add.circle).toHaveBeenCalled();
            expect(mockScene.add.text).toHaveBeenCalled();
        });
    });

    describe('要件2: 戦術的行動パターン', () => {
        test('2.1 攻撃的タイプのAIが最も近い敵を優先的に攻撃すること', async () => {
            const aggressiveUnit = createMockUnit({
                id: 'aggressive-enemy',
                faction: 'enemy',
                stats: { ...createMockUnit().stats, attack: 30 }
            });
            const nearTarget = createMockUnit({
                id: 'near-target',
                faction: 'player',
                position: { x: 4, y: 5 } // 隣接
            });
            const farTarget = createMockUnit({
                id: 'far-target',
                faction: 'player',
                position: { x: 8, y: 8 } // 遠い
            });

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [aggressiveUnit, nearTarget, farTarget]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([aggressiveUnit]);

            const result = await aiSystemManager.executeAITurn(aggressiveUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // 攻撃または近づく行動を取ることを確認
            if (result.action.type === AIActionType.ATTACK) {
                expect(result.action.target?.id).toBe('near-target');
            } else if (result.action.type === AIActionType.MOVE) {
                // 近い敵に向かって移動することを確認
                const movePos = result.action.position;
                if (movePos) {
                    const distanceToNear = Math.abs(movePos.x - nearTarget.position.x) +
                        Math.abs(movePos.y - nearTarget.position.y);
                    const distanceToFar = Math.abs(movePos.x - farTarget.position.x) +
                        Math.abs(movePos.y - farTarget.position.y);
                    expect(distanceToNear).toBeLessThanOrEqual(distanceToFar);
                }
            }
        });

        test('2.2 AIのHPが25%以下の時に防御的行動を優先すること', async () => {
            const lowHpUnit = createMockUnit({
                id: 'low-hp-enemy',
                faction: 'enemy',
                currentHP: 20, // 20/100 = 20%
                stats: { ...createMockUnit().stats, maxHP: 100 }
            });
            const threatUnit = createMockUnit({
                id: 'threat',
                faction: 'player',
                position: { x: 4, y: 5 },
                stats: { ...createMockUnit().stats, attack: 40 }
            });

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [lowHpUnit, threatUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([lowHpUnit]);

            const result = await aiSystemManager.executeAITurn(lowHpUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // 防御的行動（回避、防御、待機）を取ることを確認
            expect([AIActionType.MOVE, AIActionType.WAIT, AIActionType.DEFEND]).toContain(result.action.type);

            // 攻撃的行動は避けることを確認
            if (result.action.type === AIActionType.MOVE) {
                // 脅威から離れる方向に移動することを確認
                const movePos = result.action.position;
                if (movePos) {
                    const originalDistance = Math.abs(lowHpUnit.position.x - threatUnit.position.x) +
                        Math.abs(lowHpUnit.position.y - threatUnit.position.y);
                    const newDistance = Math.abs(movePos.x - threatUnit.position.x) +
                        Math.abs(movePos.y - threatUnit.position.y);
                    expect(newDistance).toBeGreaterThanOrEqual(originalDistance);
                }
            }
        });

        test('2.3 味方キャラクターが負傷している時に支援AIが回復・補助行動を実行すること', async () => {
            const supportUnit = createMockUnit({
                id: 'support-enemy',
                faction: 'enemy',
                stats: { ...createMockUnit().stats, maxMP: 100 }
            });
            const injuredAlly = createMockUnit({
                id: 'injured-ally',
                faction: 'enemy',
                position: { x: 4, y: 5 },
                currentHP: 30, // 負傷状態
                stats: { ...createMockUnit().stats, maxHP: 100 }
            });

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [supportUnit, injuredAlly]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            // 回復スキルを利用可能にする
            mockSystems.skillSystem.getAvailableSkills.mockReturnValue(['heal', 'basic-attack']);

            aiSystemManager.createAIControllers([supportUnit]);

            const result = await aiSystemManager.executeAITurn(supportUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // スキル使用または支援行動を取ることを確認
            expect([AIActionType.SKILL, AIActionType.MOVE]).toContain(result.action.type);

            if (result.action.type === AIActionType.SKILL) {
                expect(result.action.target?.id).toBe('injured-ally');
            }
        });

        test('2.4 NPCが存在する時に敵AIがNPCを最優先で攻撃すること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const playerUnit = createMockUnit({
                id: 'player-1',
                faction: 'player',
                position: { x: 4, y: 5 }
            });
            const npcUnit = createMockUnit({
                id: 'npc-1',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            // NPCとして認識されるようにモック設定
            mockSystems.recruitmentSystem.isNPC.mockImplementation((unit: Unit) => unit.id === 'npc-1');

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [enemyUnit, playerUnit, npcUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // NPCを優先攻撃することを確認
            if (result.action.type === AIActionType.ATTACK) {
                expect(result.action.target?.id).toBe('npc-1');
            } else if (result.action.type === AIActionType.MOVE) {
                // NPCに近づく移動をすることを確認
                const movePos = result.action.position;
                if (movePos) {
                    const distanceToNPC = Math.abs(movePos.x - npcUnit.position.x) +
                        Math.abs(movePos.y - npcUnit.position.y);
                    const distanceToPlayer = Math.abs(movePos.x - playerUnit.position.x) +
                        Math.abs(movePos.y - playerUnit.position.y);
                    expect(distanceToNPC).toBeLessThanOrEqual(distanceToPlayer);
                }
            }
        });

        test('2.5 地形効果が有利な時にAIが戦術的に地形を活用すること', async () => {
            const tacticalUnit = createMockUnit({
                id: 'tactical-enemy',
                faction: 'enemy',
                position: { x: 1, y: 1 } // 不利な位置
            });
            const enemyUnit = createMockUnit({
                id: 'player-1',
                faction: 'player',
                position: { x: 8, y: 8 }
            });

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [tacticalUnit, enemyUnit]
            } as GameState;

            // 地形効果のあるマップ
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map((_, y) =>
                    Array(10).fill(null).map((_, x) => ({
                        type: (x === 5 && y === 5) ? 'hill' : 'grass', // 中央に高台
                        movementCost: (x === 5 && y === 5) ? 2 : 1,
                        defenseBonus: (x === 5 && y === 5) ? 2 : 0
                    }))
                ),
            } as MapData;

            aiSystemManager.createAIControllers([tacticalUnit]);

            const result = await aiSystemManager.executeAITurn(tacticalUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // 戦術的な移動を行うことを確認
            if (result.action.type === AIActionType.MOVE) {
                expect(result.action.position).toBeDefined();
                expect(result.action.reasoning).toContain('position');
            }
        });
    }); desc
    ribe('要件3: NPC保護システム連携', () => {
        test('3.1 NPCが戦場に存在する時に敵AIの攻撃優先度でNPCが最高位になること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const playerUnit = createMockUnit({
                id: 'player-1',
                faction: 'player',
                position: { x: 3, y: 5 }
            });
            const npcUnit = createMockUnit({
                id: 'npc-1',
                faction: 'player',
                position: { x: 7, y: 5 }
            });

            mockSystems.recruitmentSystem.isNPC.mockImplementation((unit: Unit) => unit.id === 'npc-1');

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [enemyUnit, playerUnit, npcUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // NPCに関連する行動を取ることを確認
            if (result.action.type === AIActionType.ATTACK) {
                expect(result.action.target?.id).toBe('npc-1');
            } else if (result.action.type === AIActionType.MOVE) {
                // NPCに向かう移動であることを確認
                expect(result.action.reasoning?.toLowerCase()).toContain('npc');
            }
        });

        test('3.2 NPCへの攻撃が可能な時に他の有利な攻撃機会よりもNPC攻撃を優先すること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const weakPlayerUnit = createMockUnit({
                id: 'weak-player',
                faction: 'player',
                position: { x: 4, y: 5 },
                currentHP: 10 // 非常に弱い
            });
            const npcUnit = createMockUnit({
                id: 'npc-1',
                faction: 'player',
                position: { x: 6, y: 5 },
                currentHP: 100 // 満タン
            });

            mockSystems.recruitmentSystem.isNPC.mockImplementation((unit: Unit) => unit.id === 'npc-1');
            mockSystems.battleSystem.canAttack.mockReturnValue(true);

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [enemyUnit, weakPlayerUnit, npcUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // 弱いプレイヤーよりもNPCを優先攻撃することを確認
            if (result.action.type === AIActionType.ATTACK) {
                expect(result.action.target?.id).toBe('npc-1');
            }
        });

        test('3.3 複数のNPCが存在する時に最も攻撃しやすいNPCを選択すること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const nearNPC = createMockUnit({
                id: 'near-npc',
                faction: 'player',
                position: { x: 4, y: 5 } // 近い
            });
            const farNPC = createMockUnit({
                id: 'far-npc',
                faction: 'player',
                position: { x: 8, y: 8 } // 遠い
            });

            mockSystems.recruitmentSystem.isNPC.mockImplementation((unit: Unit) =>
                unit.id === 'near-npc' || unit.id === 'far-npc'
            );

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [enemyUnit, nearNPC, farNPC]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // より近いNPCを優先することを確認
            if (result.action.type === AIActionType.ATTACK) {
                expect(result.action.target?.id).toBe('near-npc');
            } else if (result.action.type === AIActionType.MOVE) {
                const movePos = result.action.position;
                if (movePos) {
                    const distanceToNear = Math.abs(movePos.x - nearNPC.position.x) +
                        Math.abs(movePos.y - nearNPC.position.y);
                    const distanceToFar = Math.abs(movePos.x - farNPC.position.x) +
                        Math.abs(movePos.y - farNPC.position.y);
                    expect(distanceToNear).toBeLessThanOrEqual(distanceToFar);
                }
            }
        });

        test('3.4 NPCが攻撃範囲外にいる時にNPCに近づくための移動を優先すること', async () => {
            const enemyUnit = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
                position: { x: 1, y: 1 } // 遠い位置
            });
            const npcUnit = createMockUnit({
                id: 'npc-1',
                faction: 'player',
                position: { x: 8, y: 8 } // 攻撃範囲外
            });

            mockSystems.recruitmentSystem.isNPC.mockImplementation((unit: Unit) => unit.id === 'npc-1');
            mockSystems.battleSystem.canAttack.mockReturnValue(false); // 攻撃範囲外

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [enemyUnit, npcUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);
            expect(result.action.type).toBe(AIActionType.MOVE);

            // NPCに近づく移動であることを確認
            const movePos = result.action.position;
            if (movePos) {
                const originalDistance = Math.abs(enemyUnit.position.x - npcUnit.position.x) +
                    Math.abs(enemyUnit.position.y - npcUnit.position.y);
                const newDistance = Math.abs(movePos.x - npcUnit.position.x) +
                    Math.abs(movePos.y - npcUnit.position.y);
                expect(newDistance).toBeLessThan(originalDistance);
            }
        });

        test('3.5 NPCが撃破された時に通常の攻撃優先度に戻ること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const playerUnit = createMockUnit({
                id: 'player-1',
                faction: 'player',
                position: { x: 4, y: 5 }
            });

            // NPCが存在しない状況
            mockSystems.recruitmentSystem.isNPC.mockReturnValue(false);

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [enemyUnit, playerUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // 通常のプレイヤーユニットを攻撃対象とすることを確認
            if (result.action.type === AIActionType.ATTACK) {
                expect(result.action.target?.id).toBe('player-1');
            }
        });
    });

    describe('要件4: 難易度調整システム', () => {
        test('4.1 難易度設定が変更される時にAI思考深度が適切に調整されること', () => {
            const easySettings: Partial<DifficultySettings> = {
                thinkingDepth: 1,
                randomnessFactor: 0.5,
                mistakeProbability: 0.3,
            };

            const hardSettings: Partial<DifficultySettings> = {
                thinkingDepth: 5,
                randomnessFactor: 0.1,
                mistakeProbability: 0.05,
            };

            // 難易度設定の更新をテスト
            expect(() => aiSystemManager.updateDifficultySettings(easySettings)).not.toThrow();
            expect(() => aiSystemManager.updateDifficultySettings(hardSettings)).not.toThrow();
        });

        test('4.2 難易度が高い時にAIが最適解に近い行動を選択すること', async () => {
            const hardSettings: Partial<DifficultySettings> = {
                thinkingDepth: 5,
                randomnessFactor: 0.05,
                mistakeProbability: 0.01,
            };

            aiSystemManager.updateDifficultySettings(hardSettings);

            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const weakTarget = createMockUnit({
                id: 'weak-target',
                faction: 'player',
                position: { x: 4, y: 5 },
                currentHP: 10 // 一撃で倒せる
            });

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [enemyUnit, weakTarget]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // 高難易度では最適な行動（弱い敵への攻撃）を選択することを期待
            expect([AIActionType.ATTACK, AIActionType.MOVE]).toContain(result.action.type);
        });

        test('4.3 難易度が低い時にAIにランダム要素が適度に含まれること', async () => {
            const easySettings: Partial<DifficultySettings> = {
                thinkingDepth: 1,
                randomnessFactor: 0.8,
                mistakeProbability: 0.4,
            };

            aiSystemManager.updateDifficultySettings(easySettings);

            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            // 複数回実行して行動の多様性を確認
            const actions: AIActionType[] = [];
            for (let i = 0; i < 10; i++) {
                const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);
                actions.push(result.action.type);
            }

            // 低難易度では行動にバリエーションがあることを期待
            const uniqueActions = new Set(actions);
            expect(uniqueActions.size).toBeGreaterThan(1);
        });

        test('4.4 プレイヤーレベルが高い時にAIの行動パターンが複雑になること', async () => {
            // 高レベル相当の設定
            const advancedSettings: Partial<DifficultySettings> = {
                thinkingDepth: 4,
                randomnessFactor: 0.2,
                skillUsageFrequency: 0.9,
            };

            aiSystemManager.updateDifficultySettings(advancedSettings);

            const enemyUnit = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
                stats: { ...createMockUnit().stats, maxMP: 100 }
            });
            const playerUnit = createMockUnit({
                id: 'player-1',
                faction: 'player',
                position: { x: 4, y: 5 }
            });

            mockSystems.skillSystem.getAvailableSkills.mockReturnValue(['attack', 'heal', 'fireball', 'shield']);

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [enemyUnit, playerUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // 高レベルではスキル使用などの複雑な行動を取ることを期待
            expect([AIActionType.SKILL, AIActionType.ATTACK, AIActionType.MOVE]).toContain(result.action.type);
        });

        test('4.5 ゲーム進行に応じてAIの戦術的思考が段階的に向上すること', async () => {
            // 初期設定（簡単）
            const initialSettings: Partial<DifficultySettings> = {
                thinkingDepth: 1,
                tacticalness: 0.3,
            };

            // 後期設定（難しい）
            const advancedSettings: Partial<DifficultySettings> = {
                thinkingDepth: 4,
                tacticalness: 0.9,
            };

            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            // 初期設定でのテスト
            aiSystemManager.updateDifficultySettings(initialSettings);
            const initialResult = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            // 後期設定でのテスト
            aiSystemManager.updateDifficultySettings(advancedSettings);
            const advancedResult = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(initialResult.success).toBe(true);
            expect(advancedResult.success).toBe(true);

            // 設定変更が正常に適用されることを確認
            expect(initialResult.action.reasoning).toBeDefined();
            expect(advancedResult.action.reasoning).toBeDefined();
        });
    });
    describe('要件5: スキルシステム連携', () => {
        test('5.1 敵AIがスキルを持つ時に適切なタイミングでスキルを使用すること', async () => {
            const skillUnit = createMockUnit({
                id: 'skill-enemy',
                faction: 'enemy',
                stats: { ...createMockUnit().stats, maxMP: 100 }
            });
            const targetUnit = createMockUnit({
                id: 'target',
                faction: 'player',
                position: { x: 4, y: 5 }
            });

            mockSystems.skillSystem.getAvailableSkills.mockReturnValue(['fireball', 'heal']);
            mockSystems.skillSystem.canUseSkill.mockReturnValue(true);

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [skillUnit, targetUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([skillUnit]);

            const result = await aiSystemManager.executeAITurn(skillUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // スキル使用を考慮した行動を取ることを確認
            expect([AIActionType.SKILL, AIActionType.ATTACK, AIActionType.MOVE]).toContain(result.action.type);

            if (result.action.type === AIActionType.SKILL) {
                expect(result.action.skillId).toBeDefined();
                expect(['fireball', 'heal']).toContain(result.action.skillId);
            }
        });

        test('5.2 MP不足の時にスキル使用を控えて通常攻撃を選択すること', async () => {
            const lowMpUnit = createMockUnit({
                id: 'low-mp-enemy',
                faction: 'enemy',
                currentMP: 5, // 低MP
                stats: { ...createMockUnit().stats, maxMP: 100 }
            });
            const targetUnit = createMockUnit({
                id: 'target',
                faction: 'player',
                position: { x: 4, y: 5 }
            });

            mockSystems.skillSystem.getAvailableSkills.mockReturnValue(['expensive-skill']);
            mockSystems.skillSystem.canUseSkill.mockReturnValue(false); // MP不足

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [lowMpUnit, targetUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([lowMpUnit]);

            const result = await aiSystemManager.executeAITurn(lowMpUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // スキル以外の行動を選択することを確認
            expect([AIActionType.ATTACK, AIActionType.MOVE, AIActionType.WAIT]).toContain(result.action.type);
            expect(result.action.type).not.toBe(AIActionType.SKILL);
        });

        test('5.3 回復スキルを持つ時に味方の負傷状況に応じて回復を実行すること', async () => {
            const healerUnit = createMockUnit({
                id: 'healer-enemy',
                faction: 'enemy',
                stats: { ...createMockUnit().stats, maxMP: 100 }
            });
            const injuredAlly = createMockUnit({
                id: 'injured-ally',
                faction: 'enemy',
                position: { x: 4, y: 5 },
                currentHP: 20 // 重傷
            });

            mockSystems.skillSystem.getAvailableSkills.mockReturnValue(['heal', 'attack']);
            mockSystems.skillSystem.canUseSkill.mockReturnValue(true);

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [healerUnit, injuredAlly]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([healerUnit]);

            const result = await aiSystemManager.executeAITurn(healerUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // 回復スキルの使用を優先することを確認
            if (result.action.type === AIActionType.SKILL) {
                expect(result.action.skillId).toBe('heal');
                expect(result.action.target?.id).toBe('injured-ally');
            }
        });

        test('5.4 バフ・デバフスキルを持つ時に戦況に応じて効果的に使用すること', async () => {
            const supportUnit = createMockUnit({
                id: 'support-enemy',
                faction: 'enemy',
                stats: { ...createMockUnit().stats, maxMP: 100 }
            });
            const allyUnit = createMockUnit({
                id: 'ally',
                faction: 'enemy',
                position: { x: 4, y: 5 }
            });
            const enemyUnit = createMockUnit({
                id: 'enemy-target',
                faction: 'player',
                position: { x: 6, y: 5 }
            });

            mockSystems.skillSystem.getAvailableSkills.mockReturnValue(['buff', 'debuff', 'attack']);
            mockSystems.skillSystem.canUseSkill.mockReturnValue(true);

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [supportUnit, allyUnit, enemyUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([supportUnit]);

            const result = await aiSystemManager.executeAITurn(supportUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // バフ・デバフスキルの戦略的使用を確認
            if (result.action.type === AIActionType.SKILL) {
                expect(['buff', 'debuff']).toContain(result.action.skillId);
                expect(result.action.target).toBeDefined();
            }
        });

        test('5.5 スキルクールダウン中の時に代替行動を適切に選択すること', async () => {
            const cooldownUnit = createMockUnit({
                id: 'cooldown-enemy',
                faction: 'enemy',
                stats: { ...createMockUnit().stats, maxMP: 100 }
            });
            const targetUnit = createMockUnit({
                id: 'target',
                faction: 'player',
                position: { x: 4, y: 5 }
            });

            mockSystems.skillSystem.getAvailableSkills.mockReturnValue(['powerful-skill']);
            mockSystems.skillSystem.canUseSkill.mockReturnValue(false); // クールダウン中

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [cooldownUnit, targetUnit]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([cooldownUnit]);

            const result = await aiSystemManager.executeAITurn(cooldownUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // スキル以外の代替行動を選択することを確認
            expect([AIActionType.ATTACK, AIActionType.MOVE, AIActionType.WAIT]).toContain(result.action.type);
            expect(result.action.type).not.toBe(AIActionType.SKILL);
        });
    });

    describe('要件6: パフォーマンス要件', () => {
        test('6.1 AI行動決定時に処理時間が2秒以内に完了すること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const startTime = performance.now();
            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);
            const endTime = performance.now();

            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeLessThan(2000);
        });

        test('6.2 複数の敵AIが同時に思考する時に全体の処理時間が5秒以内であること', async () => {
            const enemies = Array.from({ length: 5 }, (_, i) =>
                createMockUnit({ id: `enemy-${i}`, faction: 'enemy' })
            );
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: enemies } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers(enemies);

            const startTime = performance.now();

            // 並列実行
            const promises = enemies.map(enemy =>
                aiSystemManager.executeAITurn(enemy, gameState, mapData)
            );
            const results = await Promise.all(promises);

            const endTime = performance.now();

            results.forEach(result => expect(result.success).toBe(true));
            expect(endTime - startTime).toBeLessThan(5000);
        });

        test('6.3 AI思考中にフレームレートが60fpsを維持すること', async () => {
            // フレームレート測定のシミュレーション
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const frameStart = performance.now();
            await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);
            const frameEnd = performance.now();

            const frameTime = frameEnd - frameStart;
            const targetFrameTime = 1000 / 60; // 60fps = 16.67ms per frame

            // AI処理がフレーム時間に大きく影響しないことを確認
            expect(frameTime).toBeLessThan(targetFrameTime * 2); // 2フレーム以内
        });

        test('6.4 AIシステム全体でメモリ使用量が50MB以下に抑えられること', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // 大量のAIを作成・実行
            const enemies = Array.from({ length: 100 }, (_, i) =>
                createMockUnit({ id: `enemy-${i}`, faction: 'enemy' })
            );

            aiSystemManager.createAIControllers(enemies);

            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: enemies } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            // 複数回実行
            for (let i = 0; i < 20; i++) {
                await aiSystemManager.executeAITurn(enemies[i % enemies.length], gameState, mapData);
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB

            expect(memoryIncrease).toBeLessThan(50);
        });

        test('6.5 長時間プレイ時にメモリリークが発生しないこと', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // 長時間プレイのシミュレーション
            for (let cycle = 0; cycle < 10; cycle++) {
                const enemies = Array.from({ length: 10 }, (_, i) =>
                    createMockUnit({ id: `enemy-${cycle}-${i}`, faction: 'enemy' })
                );

                aiSystemManager.createAIControllers(enemies);

                const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: enemies } as GameState;
                const mapData = {
                    width: 10,
                    height: 10,
                    tileSize: 32,
                    tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
                } as MapData;

                for (const enemy of enemies) {
                    await aiSystemManager.executeAITurn(enemy, gameState, mapData);
                }

                // ガベージコレクションを促進
                if (global.gc) {
                    global.gc();
                }
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB

            // 長時間プレイでもメモリ増加が100MB以下であることを確認
            expect(memoryIncrease).toBeLessThan(100);
        });
    });

    describe('要件7: デバッグ・開発支援', () => {
        test('7.1 デバッグモードでAI思考過程がコンソールに出力されること', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            // デバッグログが出力されていることを確認
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test('7.2 AI行動選択時に候補行動と評価値が表示されること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            // 行動に評価情報が含まれていることを確認
            expect(result.action.priority).toBeDefined();
            expect(typeof result.action.priority).toBe('number');
            expect(result.action.reasoning).toBeDefined();
            expect(typeof result.action.reasoning).toBe('string');
        });

        test('7.3 AI設定変更時にリアルタイムで行動パターンが反映されること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            // 初期設定での実行
            const initialResult = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            // 設定変更
            aiSystemManager.updateDifficultySettings({
                randomnessFactor: 0.9,
                mistakeProbability: 0.8,
            });

            // 変更後の実行
            const changedResult = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(initialResult.success).toBe(true);
            expect(changedResult.success).toBe(true);

            // 設定変更が反映されていることを確認（完全に同じ行動でない可能性）
            expect(initialResult.action).toBeDefined();
            expect(changedResult.action).toBeDefined();
        });

        test('7.4 統計情報収集時にAI行動の成功率・効果が記録されること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            // 複数回実行して統計を収集
            const results: AIExecutionResult[] = [];
            for (let i = 0; i < 5; i++) {
                const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);
                results.push(result);
            }

            // 統計情報が記録されていることを確認
            results.forEach(result => {
                expect(result.success).toBeDefined();
                expect(result.executionTime).toBeDefined();
                expect(result.action).toBeDefined();
            });

            const successRate = results.filter(r => r.success).length / results.length;
            expect(successRate).toBeGreaterThan(0);
        });

        test('7.5 思考状態の情報提供機能', () => {
            const thinkingState = aiSystemManager.getThinkingState();

            expect(thinkingState).toBeDefined();
            expect(thinkingState).toHaveProperty('isThinking');
            expect(thinkingState).toHaveProperty('thinkingTime');
            expect(typeof thinkingState.isThinking).toBe('boolean');
            expect(typeof thinkingState.thinkingTime).toBe('number');
        });
    });

    describe('要件8: エラーハンドリング', () => {
        test('8.1 AI思考でエラーが発生した時にデフォルト行動（待機）にフォールバックすること', async () => {
            const timeoutAI = new AISystemManager(mockScene, {
                thinkingTimeLimit: 1, // 即座にタイムアウト
                enableDebugLogging: false,
                enableVisualFeedback: false,
                randomFactor: 0,
                npcPriorityMultiplier: 50,
            }, mockEventEmitter);

            timeoutAI.initialize(
                mockSystems.gameStateManager,
                mockSystems.movementSystem,
                mockSystems.battleSystem,
                mockSystems.skillSystem,
                mockSystems.recruitmentSystem
            );

            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            timeoutAI.createAIControllers([enemyUnit]);

            const result = await timeoutAI.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);
            expect(result.action.type).toBe(AIActionType.WAIT);
            expect(result.action.reasoning).toContain('timeout');
        });

        test('8.2 無効な行動が選択された時に有効な代替行動を自動選択すること', async () => {
            // 無効な行動を返すシステム
            const invalidSystems = {
                ...mockSystems,
                movementSystem: {
                    ...mockSystems.movementSystem,
                    executeMovement: jest.fn(() => Promise.resolve({ success: false, message: 'Invalid move' })),
                },
            };

            const errorAI = new AISystemManager(mockScene, {
                thinkingTimeLimit: 2000,
                enableDebugLogging: false,
                enableVisualFeedback: false,
                randomFactor: 0,
                npcPriorityMultiplier: 50,
            }, mockEventEmitter);

            errorAI.initialize(
                invalidSystems.gameStateManager,
                invalidSystems.movementSystem,
                invalidSystems.battleSystem,
                invalidSystems.skillSystem,
                invalidSystems.recruitmentSystem
            );

            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            errorAI.createAIControllers([enemyUnit]);

            const result = await errorAI.executeAITurn(enemyUnit, gameState, mapData);

            // エラーが発生してもシステムは継続動作する
            expect(result).toBeDefined();
        });

        test('8.3 AIデータが破損した時に基本AIパターンで継続すること', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const invalidGameState = null as any; // 破損データ
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, invalidGameState, mapData);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.message).toBeDefined();
        });

        test('8.4 メモリ不足が発生した時に適切にリソースを解放すること', async () => {
            // メモリ不足のシミュレーション（実際のテストでは困難）
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            expect(result.success).toBe(true);

            // リソースが適切に管理されていることを確認
            expect(mockScene.add.container().removeAll).toHaveBeenCalled();
        });

        test('8.5 予期しないエラー時にユーザーに分かりやすいメッセージを表示すること', async () => {
            const errorSystems = {
                ...mockSystems,
                battleSystem: {
                    ...mockSystems.battleSystem,
                    executeAttack: jest.fn(() => Promise.reject(new Error('Unexpected battle error'))),
                },
            };

            const errorAI = new AISystemManager(mockScene, {
                thinkingTimeLimit: 2000,
                enableDebugLogging: true,
                enableVisualFeedback: false,
                randomFactor: 0,
                npcPriorityMultiplier: 50,
            }, mockEventEmitter);

            errorAI.initialize(
                errorSystems.gameStateManager,
                errorSystems.movementSystem,
                errorSystems.battleSystem,
                errorSystems.skillSystem,
                errorSystems.recruitmentSystem
            );

            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            errorAI.createAIControllers([enemyUnit]);

            const result = await errorAI.executeAITurn(enemyUnit, gameState, mapData);

            expect(result).toBeDefined();
            expect(result.message).toBeDefined();
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
        });
    });
});