/**
 * AIシステム視覚的回帰テスト
 * 
 * AIシステムの視覚的要素の回帰テスト
 * - AI思考インジケーターの表示
 * - プログレスバーのアニメーション
 * - 行動プレビューの表示
 * - エラー状態の視覚表現
 */

import { AISystemManager } from '../../game/src/systems/ai/AISystemManager';
import {
    AIAction,
    AIActionType,
    AISystemManagerConfig,
} from '../../game/src/types/ai';
import { Unit, MapData, GameState } from '../../game/src/types/gameplay';

// 視覚的要素のスナップショット
interface VisualSnapshot {
    timestamp: number;
    elements: Array<{
        type: string;
        position: { x: number; y: number };
        size: { width: number; height: number };
        style: {
            color?: string;
            backgroundColor?: string;
            opacity?: number;
            visible?: boolean;
        };
        animation?: {
            type: string;
            duration: number;
            easing: string;
        };
        content?: string;
    }>;
}

// 視覚的要素のモック
class MockVisualElement {
    public type: string;
    public position: { x: number; y: number };
    public size: { width: number; height: number };
    public style: any;
    public animation?: any;
    public content?: string;
    public visible: boolean = true;

    constructor(type: string, x: number = 0, y: number = 0) {
        this.type = type;
        this.position = { x, y };
        this.size = { width: 0, height: 0 };
        this.style = {};
    }

    setPosition(x: number, y: number): this {
        this.position = { x, y };
        return this;
    }

    setSize(width: number, height: number): this {
        this.size = { width, height };
        return this;
    }

    setStyle(style: any): this {
        this.style = { ...this.style, ...style };
        return this;
    }

    setVisible(visible: boolean): this {
        this.visible = visible;
        this.style.visible = visible;
        return this;
    }

    setContent(content: string): this {
        this.content = content;
        return this;
    }

    animate(config: any): this {
        this.animation = config;
        return this;
    }

    toSnapshot() {
        return {
            type: this.type,
            position: this.position,
            size: this.size,
            style: this.style,
            animation: this.animation,
            content: this.content,
        };
    }
}

// テスト用モック
const createMockScene = () => {
    const visualElements: MockVisualElement[] = [];

    return {
        events: {
            on: jest.fn(),
            emit: jest.fn(),
        },
        add: {
            container: jest.fn((x: number = 0, y: number = 0) => {
                const container = new MockVisualElement('container', x, y);
                visualElements.push(container);

                return {
                    setDepth: jest.fn().mockReturnThis(),
                    setVisible: jest.fn((visible: boolean) => {
                        container.setVisible(visible);
                        return container;
                    }),
                    add: jest.fn((element: MockVisualElement) => {
                        visualElements.push(element);
                    }),
                    removeAll: jest.fn((destroyChildren: boolean = false) => {
                        if (destroyChildren) {
                            visualElements.length = 0;
                        }
                    }),
                    element: container,
                };
            }),
            circle: jest.fn((x: number, y: number, radius: number, color: number, alpha: number = 1) => {
                const circle = new MockVisualElement('circle', x, y)
                    .setSize(radius * 2, radius * 2)
                    .setStyle({
                        backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
                        opacity: alpha
                    });
                visualElements.push(circle);
                return circle;
            }),
            text: jest.fn((x: number, y: number, text: string, style: any = {}) => {
                const textElement = new MockVisualElement('text', x, y)
                    .setContent(text)
                    .setStyle(style);
                visualElements.push(textElement);

                return {
                    ...textElement,
                    setOrigin: jest.fn((originX: number, originY: number = originX) => {
                        textElement.setStyle({ originX, originY });
                        return textElement;
                    }),
                    setText: jest.fn((newText: string) => {
                        textElement.setContent(newText);
                    }),
                };
            }),
            rectangle: jest.fn((x: number, y: number, width: number, height: number, color: number, alpha: number = 1) => {
                const rectangle = new MockVisualElement('rectangle', x, y)
                    .setSize(width, height)
                    .setStyle({
                        backgroundColor: `#${color.toString(16).padStart(6, '0')}`,
                        opacity: alpha
                    });
                visualElements.push(rectangle);

                return {
                    ...rectangle,
                    setOrigin: jest.fn((originX: number, originY: number = originX) => {
                        rectangle.setStyle({ originX, originY });
                        return rectangle;
                    }),
                };
            }),
            graphics: jest.fn(() => {
                const graphics = new MockVisualElement('graphics');
                visualElements.push(graphics);

                return {
                    fillStyle: jest.fn((color: number, alpha: number = 1) => {
                        graphics.setStyle({ fillColor: `#${color.toString(16).padStart(6, '0')}`, fillAlpha: alpha });
                        return graphics;
                    }),
                    fillRect: jest.fn((x: number, y: number, width: number, height: number) => {
                        graphics.setPosition(x, y).setSize(width, height);
                        return graphics;
                    }),
                    lineStyle: jest.fn((width: number, color: number, alpha: number = 1) => {
                        graphics.setStyle({ lineWidth: width, lineColor: `#${color.toString(16).padStart(6, '0')}`, lineAlpha: alpha });
                        return graphics;
                    }),
                    strokeCircle: jest.fn((x: number, y: number, radius: number) => {
                        graphics.setPosition(x, y).setSize(radius * 2, radius * 2);
                        return graphics;
                    }),
                    setScrollFactor: jest.fn(() => graphics),
                    setDepth: jest.fn(() => graphics),
                };
            }),
        },
        tweens: {
            add: jest.fn((config: any) => {
                // アニメーション設定を記録
                if (config.targets) {
                    const targets = Array.isArray(config.targets) ? config.targets : [config.targets];
                    targets.forEach((target: any) => {
                        if (target instanceof MockVisualElement) {
                            target.animate({
                                type: 'tween',
                                duration: config.duration || 1000,
                                easing: config.ease || 'Linear',
                                properties: Object.keys(config).filter(key =>
                                    !['targets', 'duration', 'ease', 'onComplete', 'onUpdate'].includes(key)
                                ),
                            });
                        }
                    });
                }
            }),
        },
        time: {
            delayedCall: jest.fn((delay, callback) => setTimeout(callback, 0)),
        },
        // 視覚的要素へのアクセス
        getVisualElements: () => visualElements,
        takeSnapshot: (): VisualSnapshot => ({
            timestamp: Date.now(),
            elements: visualElements.map(el => el.toSnapshot()),
        }),
        clearVisualElements: () => {
            visualElements.length = 0;
        },
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

describe('AIシステム視覚的回帰テスト', () => {
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
            enableDebugLogging: false,
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

    afterEach(() => {
        mockScene.clearVisualElements();
    });

    describe('1. AI思考インジケーターの視覚的表現', () => {
        test('思考インジケーターの基本表示', async () => {
            const enemyUnit = createMockUnit({ id: 'enemy-1', faction: 'enemy' });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            // 実行前のスナップショット
            const beforeSnapshot = mockScene.takeSnapshot();

            await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            // 実行後のスナップショット
            const afterSnapshot = mockScene.takeSnapshot();

            // 思考インジケーターが作成されたことを確認
            expect(afterSnapshot.elements.length).toBeGreaterThan(beforeSnapshot.elements.length);

            // コンテナが作成されていることを確認
            const containers = afterSnapshot.elements.filter(el => el.type === 'container');
            expect(containers.length).toBeGreaterThan(0);

            // 円形インジケーターが作成されていることを確認
            const circles = afterSnapshot.elements.filter(el => el.type === 'circle');
            expect(circles.length).toBeGreaterThan(0);

            // 適切な位置に配置されていることを確認
            const unitScreenPos = {
                x: enemyUnit.position.x * 32 + 16, // tileSize * position + offset
                y: enemyUnit.position.y * 32 + 16 - 40, // above unit
            };

            const thinkingIndicator = containers.find(el =>
                Math.abs(el.position.x - unitScreenPos.x) < 5 &&
                Math.abs(el.position.y - unitScreenPos.y) < 5
            );

            expect(thinkingIndicator).toBeDefined();
        });

        test('思考インジケーターのスタイル一貫性', async () => {
            const enemies = [
                createMockUnit({ id: 'enemy-1', faction: 'enemy', position: { x: 2, y: 2 } }),
                createMockUnit({ id: 'enemy-2', faction: 'enemy', position: { x: 7, y: 7 } }),
            ];

            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: enemies } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers(enemies);

            const snapshots: VisualSnapshot[] = [];

            // 各敵のAI実行時のスナップショットを取得
            for (const enemy of enemies) {
                mockScene.clearVisualElements();
                await aiSystemManager.executeAITurn(enemy, gameState, mapData);
                snapshots.push(mockScene.takeSnapshot());
            }

            // 全てのスナップショットで一貫したスタイルが使用されていることを確認
            const circleElements = snapshots.map(snapshot =>
                snapshot.elements.filter(el => el.type === 'circle')
            );

            // 全てのスナップショットで円形要素が存在することを確認
            circleElements.forEach(circles => {
                expect(circles.length).toBeGreaterThan(0);
            });

            // 色とサイズの一貫性を確認
            if (circleElements.length > 1) {
                const firstCircle = circleElements[0][0];
                circleElements.slice(1).forEach(circles => {
                    const circle = circles[0];
                    expect(circle.style.backgroundColor).toBe(firstCircle.style.backgroundColor);
                    expect(circle.size.width).toBe(firstCircle.size.width);
                    expect(circle.size.height).toBe(firstCircle.size.height);
                });
            }
        });

        test('思考インジケーターのアニメーション', async () => {
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

            const snapshot = mockScene.takeSnapshot();

            // アニメーションが設定された要素があることを確認
            const animatedElements = snapshot.elements.filter(el => el.animation);
            expect(animatedElements.length).toBeGreaterThan(0);

            // アニメーション設定の確認
            animatedElements.forEach(element => {
                expect(element.animation).toHaveProperty('type');
                expect(element.animation).toHaveProperty('duration');
                expect(element.animation.duration).toBeGreaterThan(0);
            });

            // tweenアニメーションが呼び出されたことを確認
            expect(mockScene.tweens.add).toHaveBeenCalled();
        });
    });

    describe('2. プログレスバーの視覚的表現', () => {
        test('プログレスバーの基本構造', async () => {
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

            const snapshot = mockScene.takeSnapshot();

            // プログレスバー要素（背景と前景）が作成されていることを確認
            const rectangles = snapshot.elements.filter(el => el.type === 'rectangle');
            expect(rectangles.length).toBeGreaterThanOrEqual(2); // 背景と前景

            // プログレスバーのサイズが適切であることを確認
            rectangles.forEach(rect => {
                expect(rect.size.width).toBeGreaterThan(0);
                expect(rect.size.height).toBeGreaterThan(0);
                expect(rect.size.height).toBeLessThan(rect.size.width); // 横長であること
            });
        });

        test('プログレスバーのアニメーション進行', async () => {
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

            // プログレスバーのアニメーションが設定されていることを確認
            expect(mockScene.tweens.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    width: expect.any(Number),
                    duration: expect.any(Number),
                    ease: expect.any(String),
                })
            );
        });

        test('プログレスバーの色とスタイル', async () => {
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

            const snapshot = mockScene.takeSnapshot();
            const rectangles = snapshot.elements.filter(el => el.type === 'rectangle');

            // プログレスバーの色が設定されていることを確認
            rectangles.forEach(rect => {
                expect(rect.style.backgroundColor).toBeDefined();
                expect(rect.style.backgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
            });

            // 背景と前景で異なる色が使用されていることを確認
            if (rectangles.length >= 2) {
                expect(rectangles[0].style.backgroundColor).not.toBe(rectangles[1].style.backgroundColor);
            }
        });
    });

    describe('3. テキスト表示の視覚的品質', () => {
        test('思考状態テキストの表示', async () => {
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

            const snapshot = mockScene.takeSnapshot();
            const textElements = snapshot.elements.filter(el => el.type === 'text');

            expect(textElements.length).toBeGreaterThan(0);

            // テキスト内容が適切であることを確認
            textElements.forEach(textEl => {
                expect(textEl.content).toBeDefined();
                expect(textEl.content?.length).toBeGreaterThan(0);
            });
        });

        test('テキストのスタイル一貫性', async () => {
            const enemies = [
                createMockUnit({ id: 'enemy-1', faction: 'enemy' }),
                createMockUnit({ id: 'enemy-2', faction: 'enemy' }),
            ];

            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: enemies } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers(enemies);

            const textSnapshots: any[] = [];

            for (const enemy of enemies) {
                mockScene.clearVisualElements();
                await aiSystemManager.executeAITurn(enemy, gameState, mapData);
                const snapshot = mockScene.takeSnapshot();
                const textElements = snapshot.elements.filter(el => el.type === 'text');
                textSnapshots.push(textElements);
            }

            // 全てのテキスト要素で一貫したスタイルが使用されていることを確認
            if (textSnapshots.length > 1 && textSnapshots[0].length > 0) {
                const referenceStyle = textSnapshots[0][0].style;

                textSnapshots.slice(1).forEach(textElements => {
                    if (textElements.length > 0) {
                        const style = textElements[0].style;
                        expect(style.fontSize).toBe(referenceStyle.fontSize);
                        expect(style.color).toBe(referenceStyle.color);
                    }
                });
            }
        });
    });

    describe('4. レイアウトと配置の一貫性', () => {
        test('要素の相対位置関係', async () => {
            const enemyUnit = createMockUnit({
                id: 'enemy-1',
                faction: 'enemy',
                position: { x: 5, y: 5 }
            });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [enemyUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([enemyUnit]);

            await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);

            const snapshot = mockScene.takeSnapshot();

            // ユニットの画面位置を計算
            const unitScreenX = enemyUnit.position.x * 32 + 16;
            const unitScreenY = enemyUnit.position.y * 32 + 16;

            // 思考インジケーターがユニットの上に配置されていることを確認
            const containers = snapshot.elements.filter(el => el.type === 'container');
            expect(containers.length).toBeGreaterThan(0);

            const thinkingContainer = containers[0];
            expect(thinkingContainer.position.x).toBeCloseTo(unitScreenX, 10);
            expect(thinkingContainer.position.y).toBeLessThan(unitScreenY); // ユニットより上
        });

        test('画面境界での配置調整', async () => {
            // 画面端のユニット
            const edgeUnit = createMockUnit({
                id: 'edge-enemy',
                faction: 'enemy',
                position: { x: 0, y: 0 } // 左上端
            });
            const gameState = { currentTurn: 1, activePlayer: 'enemy', turnOrder: [edgeUnit] } as GameState;
            const mapData = {
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
            } as MapData;

            aiSystemManager.createAIControllers([edgeUnit]);

            await aiSystemManager.executeAITurn(edgeUnit, gameState, mapData);

            const snapshot = mockScene.takeSnapshot();

            // 要素が画面内に配置されていることを確認
            snapshot.elements.forEach(element => {
                expect(element.position.x).toBeGreaterThanOrEqual(0);
                expect(element.position.y).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('5. エラー状態の視覚的表現', () => {
        test('タイムアウト時の視覚的フィードバック', async () => {
            const timeoutAI = new AISystemManager(mockScene, {
                thinkingTimeLimit: 1, // 即座にタイムアウト
                enableDebugLogging: false,
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

            await timeoutAI.executeAITurn(enemyUnit, gameState, mapData);

            // タイムアウト後も適切にクリーンアップされていることを確認
            const snapshot = mockScene.takeSnapshot();

            // 視覚要素が適切に削除されていることを確認
            // （実際の実装では、タイムアウト時に視覚要素をクリーンアップする）
            expect(mockScene.add.container().removeAll).toHaveBeenCalled();
        });

        test('エラー状態での視覚的一貫性', async () => {
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
                enableDebugLogging: false,
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

            await errorAI.executeAITurn(enemyUnit, gameState, mapData);

            // エラー時でも視覚要素が適切に処理されていることを確認
            expect(mockScene.add.container().removeAll).toHaveBeenCalled();
        });
    });

    describe('6. パフォーマンスと最適化', () => {
        test('視覚要素の効率的な管理', async () => {
            const enemies = Array.from({ length: 10 }, (_, i) =>
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

            // 複数のAI実行
            for (let i = 0; i < 5; i++) {
                await aiSystemManager.executeAITurn(enemies[i], gameState, mapData);

                const snapshot = mockScene.takeSnapshot();

                // 視覚要素の数が適切に管理されていることを確認
                expect(snapshot.elements.length).toBeLessThan(50); // 過度に多くならない

                // 前回の要素がクリーンアップされていることを確認
                mockScene.clearVisualElements();
            }
        });

        test('アニメーションの最適化', async () => {
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
            await aiSystemManager.executeAITurn(enemyUnit, gameState, mapData);
            const endTime = performance.now();

            // 視覚効果の処理時間が適切であることを確認
            expect(endTime - startTime).toBeLessThan(100); // 100ms以内

            // 適切な数のアニメーションが作成されていることを確認
            const tweenCalls = (mockScene.tweens.add as jest.Mock).mock.calls.length;
            expect(tweenCalls).toBeGreaterThan(0);
            expect(tweenCalls).toBeLessThan(10); // 過度に多くない
        });
    });
});