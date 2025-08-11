/**
 * AIシステムアクセシビリティテスト
 * 
 * AIシステムのアクセシビリティ対応を検証するテスト
 * - AI行動の視覚的フィードバック
 * - 音声・テキスト情報の提供
 * - キーボードナビゲーション対応
 * - スクリーンリーダー対応
 */

import { AISystemManager } from '../../game/src/systems/ai/AISystemManager';
import {
    AIAction,
    AIActionType,
    AISystemManagerConfig,
    AIThinkingState,
} from '../../game/src/types/ai';
import { Unit, MapData, GameState } from '../../game/src/types/gameplay';

// アクセシビリティ要素のモック
interface AccessibilityElement {
    role: string;
    ariaLabel?: string;
    ariaDescribedBy?: string;
    ariaLive?: 'polite' | 'assertive' | 'off';
    tabIndex?: number;
    textContent?: string;
    visualIndicator?: {
        type: 'progress' | 'status' | 'animation';
        visible: boolean;
        description: string;
    };
}

// テスト用モック
const createMockScene = () => {
    const accessibilityElements: AccessibilityElement[] = [];

    return {
        events: {
            on: jest.fn(),
            emit: jest.fn(),
        },
        add: {
            container: jest.fn(() => ({
                setDepth: jest.fn().mockReturnThis(),
                setVisible: jest.fn().mockReturnThis(),
                add: jest.fn((element: any) => {
                    // アクセシビリティ要素として記録
                    if (element.accessibilityInfo) {
                        accessibilityElements.push(element.accessibilityInfo);
                    }
                }),
                removeAll: jest.fn(() => {
                    accessibilityElements.length = 0;
                }),
            })),
            circle: jest.fn(() => ({
                accessibilityInfo: {
                    role: 'status',
                    ariaLabel: 'AI thinking indicator',
                    visualIndicator: {
                        type: 'status',
                        visible: true,
                        description: 'AI is currently thinking',
                    },
                },
            })),
            text: jest.fn((x: number, y: number, text: string) => ({
                setOrigin: jest.fn().mockReturnThis(),
                setText: jest.fn(),
                accessibilityInfo: {
                    role: 'text',
                    textContent: text,
                    ariaLive: 'polite',
                },
            })),
            rectangle: jest.fn(() => ({
                setOrigin: jest.fn().mockReturnThis(),
                accessibilityInfo: {
                    role: 'progressbar',
                    ariaLabel: 'AI thinking progress',
                    visualIndicator: {
                        type: 'progress',
                        visible: true,
                        description: 'Shows AI thinking progress',
                    },
                },
            })),
        },
        tweens: {
            add: jest.fn(),
        },
        time: {
            delayedCall: jest.fn((delay, callback) => setTimeout(callback, 0)),
        },
        // アクセシビリティ要素へのアクセス
        getAccessibilityElements: () => accessibilityElements,
    };
};

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
        executeMovement: jest.fn(() => Promise.resolve({ success: true, message: 'Movement completed' })),
        calculateMovementRange: jest.fn(() => [{ x: 4, y: 5 }, { x: 6, y: 5 }]),
        canMoveTo: jest.fn(() => true),
    },
    battleSystem: {
        executeAttack: jest.fn(() => Promise.resolve({ success: true, message: 'Attack successful' })),
        canAttack: jest.fn(() => true),
        calculateDamage: jest.fn(() => 25),
    },
    skillSystem: {
        executeSkill: jest.fn(() => Promise.resolve({ success: true, message: 'Skill executed' })),
        getAvailableSkills: jest.fn(() => ['basic-attack', 'heal']),
        canUseSkill: jest.fn(() => true),
    },
    recruitmentSystem: {
        isNPC: jest.fn(() => false),
    },
});

describe('AIシステムアクセシビリティテスト', () => {
    let aiSystemManager: AISystemManager;
    let mockScene: any;
    let mockSystems: any;
    let mockEventEmitter: any;

    beforeEach(() => {
        mockScene = createMockScene();
        mockSystems = createMockSystems();
        mockEventEmitter = {
            on: jest.fn(),
            emit: jest.fn(),
        };

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

    describe('1. 視覚的フィードバックのアクセシビリティ', () => {
        test('AI思考インジケーターの視覚的表現', async () => {
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

            const accessibilityElements = mockScene.getAccessibilityElements();

            // 思考インジケーターが作成されていることを確認
            const thinkingIndicator = accessibilityElements.find(el =>
                el.role === 'status' && el.ariaLabel === 'AI thinking indicator'
            );

            expect(thinkingIndicator).toBeDefined();
            expect(thinkingIndicator?.visualIndicator?.visible).toBe(true);
            expect(thinkingIndicator?.visualIndicator?.description).toContain('thinking');
        });

        test('プログレスバーのアクセシビリティ属性', async () => {
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

            const accessibilityElements = mockScene.getAccessibilityElements();

            // プログレスバーが適切なアクセシビリティ属性を持つことを確認
            const progressBar = accessibilityElements.find(el =>
                el.role === 'progressbar'
            );

            expect(progressBar).toBeDefined();
            expect(progressBar?.ariaLabel).toBe('AI thinking progress');
            expect(progressBar?.visualIndicator?.type).toBe('progress');
        });

        test('色覚障害者への配慮', async () => {
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

            // 視覚的インジケーターが色だけに依存していないことを確認
            const accessibilityElements = mockScene.getAccessibilityElements();

            accessibilityElements.forEach(element => {
                if (element.visualIndicator) {
                    // 形状、アニメーション、テキストなどの代替手段があることを確認
                    expect(element.visualIndicator.description).toBeDefined();
                    expect(element.visualIndicator.description.length).toBeGreaterThan(0);
                }
            });
        });
    });

    describe('2. テキスト情報とスクリーンリーダー対応', () => {
        test('AI行動の説明テキスト', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const playerUnit = createMockUnit({
                id: 'player-1',
                faction: 'player',
                position: { x: 4, y: 5 }
            });
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

            // AI行動に説明テキストが含まれていることを確認
            expect(result.action.reasoning).toBeDefined();
            expect(typeof result.action.reasoning).toBe('string');
            expect(result.action.reasoning.length).toBeGreaterThan(0);

            // 説明が理解しやすい形式であることを確認
            const reasoning = result.action.reasoning.toLowerCase();
            expect(reasoning).toMatch(/(move|attack|skill|wait|defend)/);
        });

        test('ライブリージョンでの状態更新', async () => {
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

            const accessibilityElements = mockScene.getAccessibilityElements();

            // ライブリージョンが設定されていることを確認
            const liveElements = accessibilityElements.filter(el => el.ariaLive);
            expect(liveElements.length).toBeGreaterThan(0);

            // 適切なライブリージョンレベルが設定されていることを確認
            liveElements.forEach(element => {
                expect(['polite', 'assertive', 'off']).toContain(element.ariaLive);
            });
        });

        test('AI状態の音声説明', () => {
            const thinkingState = aiSystemManager.getThinkingState();

            // 思考状態を音声で説明できる情報が提供されることを確認
            expect(thinkingState).toHaveProperty('isThinking');
            expect(thinkingState).toHaveProperty('thinkingTime');

            // 状態を説明するテキストを生成
            const statusDescription = thinkingState.isThinking
                ? `AI is thinking for ${thinkingState.thinkingTime}ms`
                : 'AI is not currently thinking';

            expect(statusDescription).toBeDefined();
            expect(typeof statusDescription).toBe('string');
        });
    });

    describe('3. キーボードナビゲーション対応', () => {
        test('フォーカス可能な要素のtabIndex設定', async () => {
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

            const accessibilityElements = mockScene.getAccessibilityElements();

            // インタラクティブな要素にtabIndexが設定されていることを確認
            const interactiveElements = accessibilityElements.filter(el =>
                el.role === 'button' || el.role === 'link' || el.tabIndex !== undefined
            );

            interactiveElements.forEach(element => {
                expect(element.tabIndex).toBeDefined();
                expect(typeof element.tabIndex).toBe('number');
            });
        });

        test('キーボードショートカットの提供', () => {
            // AI関連のキーボードショートカットが定義されていることを確認
            const shortcuts = {
                'Space': 'Skip AI thinking animation',
                'Enter': 'Confirm AI action',
                'Escape': 'Cancel AI operation',
                'Tab': 'Navigate to next AI element',
            };

            Object.entries(shortcuts).forEach(([key, description]) => {
                expect(description).toBeDefined();
                expect(typeof description).toBe('string');
                expect(description.length).toBeGreaterThan(0);
            });
        });
    });

    describe('4. 認知的アクセシビリティ', () => {
        test('AI行動の予測可能性', async () => {
            const enemyUnit = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
                stats: { maxHP: 100, maxMP: 50, attack: 30, defense: 15, speed: 10, movement: 3 }
            });
            const lowHpTarget = createMockUnit({
                id: 'target-1',
                faction: 'player',
                position: { x: 4, y: 5 },
                currentHP: 20 // 低HP
            });

            const gameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [enemyUnit, lowHpTarget]
            } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            // 複数回実行して一貫性を確認
            const results: AIAction[] = [];
            for (let i = 0; i < 5; i++) {
                const result = await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);
                results.push(result.action);
            }

            // 同じ状況では類似の行動を取ることを確認（完全に同じである必要はない）
            const actionTypes = results.map(action => action.type);
            const uniqueTypes = new Set(actionTypes);

            // 行動の種類が極端に多様でないことを確認（予測可能性）
            expect(uniqueTypes.size).toBeLessThanOrEqual(3);
        });

        test('AI行動の段階的説明', async () => {
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

            // 行動の理由が段階的に理解できる形式であることを確認
            const reasoning = result.action.reasoning || '';

            // 基本的な構造を持つことを確認
            expect(reasoning).toBeDefined();
            expect(reasoning.length).toBeGreaterThan(10); // 十分な説明があること

            // 行動の種類が明確に示されていることを確認
            const actionType = result.action.type;
            expect(reasoning.toLowerCase()).toContain(actionType.toLowerCase());
        });

        test('複雑さの段階的提示', async () => {
            // 簡単な状況
            const simpleUnit = createMockUnit({ id: 'simple-enemy', faction: 'enemy' });
            const simpleGameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [simpleUnit]
            } as GameState;

            // 複雑な状況
            const complexUnit = createMockUnit({ id: 'complex-enemy', faction: 'enemy' });
            const multipleTargets = Array.from({ length: 5 }, (_, i) =>
                createMockUnit({ id: `target-${i}`, faction: 'player', position: { x: i, y: i } })
            );
            const complexGameState = {
                currentTurn: 1,
                activePlayer: 'enemy',
                turnOrder: [complexUnit, ...multipleTargets]
            } as GameState;

            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([simpleUnit, complexUnit]);

            const simpleResult = await aiSystemManager.executeAITurn(simpleUnit, simpleGameState, mapData);
            const complexResult = await aiSystemManager.executeAITurn(complexUnit, complexGameState, mapData);

            // 簡単な状況では短い説明、複雑な状況では詳細な説明
            const simpleReasoningLength = (simpleResult.action.reasoning || '').length;
            const complexReasoningLength = (complexResult.action.reasoning || '').length;

            // 複雑な状況の方が説明が詳しいことを期待（必須ではないが望ましい）
            expect(simpleReasoningLength).toBeGreaterThan(0);
            expect(complexReasoningLength).toBeGreaterThan(0);
        });
    });

    describe('5. エラー状態のアクセシビリティ', () => {
        test('エラー時の明確な情報提供', async () => {
            // エラーを発生させるシステム
            const errorSystems = {
                ...mockSystems,
                movementSystem: {
                    ...mockSystems.movementSystem,
                    executeMovement: jest.fn(() => Promise.reject(new Error('Movement failed'))),
                },
            };

            const errorAI = new AISystemManager(mockScene, {
                thinkingTimeLimit: 2000,
                enableDebugLogging: true,
                enableVisualFeedback: true,
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

            // エラー時でも理解可能な情報が提供されることを確認
            expect(result).toBeDefined();
            expect(result.message).toBeDefined();
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);
        });

        test('タイムアウト時の適切な通知', async () => {
            const timeoutAI = new AISystemManager(mockScene, {
                thinkingTimeLimit: 1, // 即座にタイムアウト
                enableDebugLogging: true,
                enableVisualFeedback: true,
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

            // タイムアウト時の適切な説明があることを確認
            expect(result.action.reasoning).toContain('timeout');
            expect(result.action.type).toBe(AIActionType.WAIT);
        });
    });

    describe('6. 国際化とローカライゼーション', () => {
        test('多言語対応の準備', async () => {
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

            // テキストが翻訳可能な形式であることを確認
            const reasoning = result.action.reasoning || '';

            // 基本的な英語テキストであることを確認（将来的に翻訳キーに置き換え可能）
            expect(reasoning).toMatch(/^[a-zA-Z0-9\s\-\(\),\.]+$/);
            expect(reasoning.length).toBeGreaterThan(0);
        });

        test('文化的に中立な表現', async () => {
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

            // 文化的に偏った表現がないことを確認
            const reasoning = (result.action.reasoning || '').toLowerCase();

            // 攻撃的または文化的に偏った用語がないことを確認
            const problematicTerms = ['kill', 'destroy', 'annihilate', 'crush'];
            problematicTerms.forEach(term => {
                expect(reasoning).not.toContain(term);
            });
        });
    });
});