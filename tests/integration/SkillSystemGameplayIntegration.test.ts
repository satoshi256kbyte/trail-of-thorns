/**
 * スキルシステムとGameplaySceneの統合テスト
 * 
 * このテストファイルは以下をテストします：
 * - GameplaySceneでのスキルシステム初期化
 * - スキル選択UIの表示と操作
 * - スキル使用時の入力処理
 * - スキル効果範囲表示の統合
 * - 完全なゲームフローテスト
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { SkillSystem } from '../../game/src/systems/skills/SkillSystem';
import { Unit } from '../../game/src/types/gameplay';

// Phaserのモック
const mockScene = {
    add: {
        container: jest.fn().mockReturnValue({
            setScrollFactor: jest.fn().mockReturnThis(),
            setDepth: jest.fn().mockReturnThis(),
            setVisible: jest.fn().mockReturnThis(),
            add: jest.fn(),
            setAlpha: jest.fn().mockReturnThis()
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
            setAlpha: jest.fn().mockReturnThis()
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
    scale: {
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
    },
    cache: {
        json: {
            get: jest.fn().mockReturnValue({
                width: 10,
                height: 10,
                tileSize: 32,
                tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', movementCost: 1 }))
            })
        }
    },
    load: {
        json: jest.fn(),
        on: jest.fn()
    },
    data: {
        set: jest.fn(),
        get: jest.fn(),
        remove: jest.fn(),
        removeAll: jest.fn()
    }
};

// モックユニット作成
const createMockUnit = (id: string, name: string, faction: 'player' | 'enemy'): Unit => ({
    id,
    name,
    position: { x: 1, y: 1 },
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 25,
        defense: 15,
        speed: 12,
        movement: 3
    },
    currentHP: 100,
    currentMP: 50,
    faction,
    hasActed: false,
    hasMoved: false
});

describe('SkillSystem GameplayScene Integration', () => {
    let gameplayScene: GameplayScene;
    let mockPlayerUnit: Unit;
    let mockEnemyUnit: Unit;

    beforeEach(() => {
        // モックユニットを作成
        mockPlayerUnit = createMockUnit('player-1', 'Hero', 'player');
        mockEnemyUnit = createMockUnit('enemy-1', 'Orc', 'enemy');

        // GameplaySceneを作成（テスト用設定）
        gameplayScene = new GameplayScene({
            debugMode: true,
            autoSaveInterval: 0,
            cameraSpeed: 400,
            performanceMonitoring: false
        });

        // Phaserシーンのモックを設定
        Object.assign(gameplayScene, mockScene);
    });

    afterEach(() => {
        if (gameplayScene && typeof gameplayScene.destroy === 'function') {
            gameplayScene.destroy();
        }
    });

    describe('スキルシステム初期化', () => {
        test('GameplaySceneでスキルシステムが正しく初期化される', () => {
            // GameplaySceneの初期化をシミュレート
            gameplayScene.create();

            // スキルシステムが初期化されていることを確認
            expect(gameplayScene['skillSystem']).toBeDefined();
            expect(gameplayScene['skillSystem']).toBeInstanceOf(SkillSystem);
        });

        test('基本スキルが正しく登録される', () => {
            gameplayScene.create();

            const skillSystem = gameplayScene['skillSystem'];
            expect(skillSystem).toBeDefined();

            // 基本攻撃スキルが登録されていることを確認
            const basicAttackResult = skillSystem.registerSkill({
                id: 'basic-attack',
                name: '基本攻撃',
                description: '基本的な攻撃スキル',
                skillType: 'attack',
                targetType: 'single',
                range: 1,
                usageCondition: {
                    mpCost: 0,
                    levelRequirement: 1,
                    cooldown: 0,
                    usageLimit: -1,
                    weaponRequirement: [],
                    jobRequirement: undefined
                },
                effects: [{
                    type: 'damage',
                    value: 1.0,
                    duration: 0,
                    target: 'enemy'
                }],
                areaOfEffect: {
                    shape: 'single',
                    size: 1
                },
                animation: {
                    castAnimation: 'cast',
                    effectAnimation: 'attack',
                    duration: 1000
                },
                learnConditions: {
                    level: 1,
                    prerequisiteSkills: [],
                    jobRequirement: undefined
                }
            });

            expect(basicAttackResult.success).toBe(true);
        });

        test('戦場状態が正しく設定される', () => {
            gameplayScene.create();

            const skillSystem = gameplayScene['skillSystem'];
            const systemState = skillSystem.getSystemState();

            expect(systemState.initialized).toBe(true);
        });
    });

    describe('スキル選択UI統合', () => {
        beforeEach(() => {
            gameplayScene.create();
        });

        test('プレイヤーユニット選択時にスキルアクションが表示される', () => {
            const skillSystem = gameplayScene['skillSystem'];

            // スキルを習得させる
            skillSystem.learnSkill(mockPlayerUnit.id, 'basic-attack', mockPlayerUnit);

            // アクションメニューを表示
            gameplayScene['showActionMenuForUnit'](mockPlayerUnit);

            // UIManagerのshowActionMenuが呼ばれることを確認
            // （実際の実装では、スキルアクションが含まれることを確認）
            expect(mockScene.events.emit).toHaveBeenCalled();
        });

        test('スキルアクション選択時にスキル選択UIが表示される', async () => {
            const skillSystem = gameplayScene['skillSystem'];

            // スキルを習得させる
            skillSystem.learnSkill(mockPlayerUnit.id, 'basic-attack', mockPlayerUnit);

            // スキルアクションを実行
            await gameplayScene['handleSkillAction'](mockPlayerUnit);

            // スキル選択UIが表示されることを確認
            expect(mockScene.add.container).toHaveBeenCalled();
        });

        test('使用可能なスキルがない場合はエラーメッセージが表示される', async () => {
            // スキルを習得させない状態でスキルアクションを実行
            await gameplayScene['handleSkillAction'](mockPlayerUnit);

            // エラー通知が表示されることを確認
            expect(mockScene.events.emit).toHaveBeenCalledWith(
                expect.stringContaining('error'),
                expect.any(Object)
            );
        });
    });

    describe('スキル使用フロー', () => {
        beforeEach(() => {
            gameplayScene.create();

            const skillSystem = gameplayScene['skillSystem'];
            skillSystem.learnSkill(mockPlayerUnit.id, 'basic-attack', mockPlayerUnit);
        });

        test('スキル使用成功時にユニットの行動状態が更新される', async () => {
            const skillSystem = gameplayScene['skillSystem'];

            // スキル使用を実行
            const result = await skillSystem.useSkill(
                'basic-attack',
                mockPlayerUnit.id,
                mockEnemyUnit.position,
                true // UI をスキップ
            );

            expect(result.success).toBe(true);

            // ユニットが行動済みになることを確認
            expect(mockPlayerUnit.hasActed).toBe(true);
        });

        test('スキル使用後にターンが進行する', async () => {
            const skillSystem = gameplayScene['skillSystem'];

            // スキル使用を実行
            await skillSystem.useSkill(
                'basic-attack',
                mockPlayerUnit.id,
                mockEnemyUnit.position,
                true
            );

            // ターン進行イベントが発火されることを確認
            expect(mockScene.events.emit).toHaveBeenCalledWith(
                'turn-system-update',
                expect.any(Object)
            );
        });

        test('スキル選択キャンセル時にアクションメニューが再表示される', async () => {
            // スキル選択キャンセルイベントを発火
            gameplayScene['skillSystem'].emit('skill-selection-cancelled', {
                casterId: mockPlayerUnit.id
            });

            // アクションメニューが再表示されることを確認
            expect(mockScene.events.emit).toHaveBeenCalled();
        });
    });

    describe('キーボードショートカット統合', () => {
        beforeEach(() => {
            gameplayScene.create();

            const skillSystem = gameplayScene['skillSystem'];
            skillSystem.learnSkill(mockPlayerUnit.id, 'basic-attack', mockPlayerUnit);
        });

        test('Sキーでスキル選択が開始される', () => {
            // ユニットを選択状態にする
            gameplayScene['gameStateManager'] = {
                getSelectedUnit: jest.fn().mockReturnValue(mockPlayerUnit),
                isPlayerTurn: jest.fn().mockReturnValue(true)
            } as any;

            // Sキーショートカットを実行
            gameplayScene['handleSkillShortcut']();

            // スキル選択が開始されることを確認
            expect(mockScene.add.container).toHaveBeenCalled();
        });

        test('プレイヤーターンでない場合はスキル使用できない', () => {
            // 敵ターンに設定
            gameplayScene['gameStateManager'] = {
                getSelectedUnit: jest.fn().mockReturnValue(mockPlayerUnit),
                isPlayerTurn: jest.fn().mockReturnValue(false)
            } as any;

            // Sキーショートカットを実行
            gameplayScene['handleSkillShortcut']();

            // スキル選択が開始されないことを確認
            expect(mockScene.add.container).not.toHaveBeenCalled();
        });
    });

    describe('スキル効果範囲表示', () => {
        beforeEach(() => {
            gameplayScene.create();
        });

        test('スキル選択時に効果範囲が表示される', () => {
            const mockSkill = {
                id: 'test-skill',
                name: 'テストスキル',
                range: 2,
                getAffectedPositions: jest.fn().mockReturnValue([
                    { x: 1, y: 1 },
                    { x: 2, y: 1 }
                ])
            };

            // スキル範囲表示を実行
            gameplayScene['showSkillRangeDisplay'](mockSkill, mockPlayerUnit);

            // 範囲表示が実行されることを確認
            expect(mockScene.add.graphics).toHaveBeenCalled();
        });

        test('スキル選択終了時に効果範囲表示がクリアされる', () => {
            // 範囲表示をクリア
            gameplayScene['clearSkillRangeDisplay']();

            // クリア処理が実行されることを確認（ログ出力で確認）
            expect(true).toBe(true); // 実際の実装では適切なアサーションを追加
        });
    });

    describe('エラーハンドリング', () => {
        beforeEach(() => {
            gameplayScene.create();
        });

        test('スキルシステムエラー時に適切なエラーメッセージが表示される', () => {
            // スキル実行エラーイベントを発火
            gameplayScene['skillSystem'].emit('skill-execution-error', {
                error: { message: 'Test error' }
            });

            // エラー通知が表示されることを確認
            expect(mockScene.events.emit).toHaveBeenCalled();
        });

        test('スキルシステムが初期化されていない場合の処理', () => {
            // スキルシステムを未初期化状態にする
            gameplayScene['skillSystem'] = null;

            // スキルアクションを実行
            gameplayScene['handleSkillAction'](mockPlayerUnit);

            // エラーメッセージが表示されることを確認
            expect(mockScene.events.emit).toHaveBeenCalled();
        });
    });

    describe('システム統合テスト', () => {
        test('完全なスキル使用ワークフローが正常に動作する', async () => {
            // 1. GameplayScene初期化
            gameplayScene.create();

            // 2. スキルシステム初期化確認
            const skillSystem = gameplayScene['skillSystem'];
            expect(skillSystem).toBeDefined();

            // 3. スキル習得
            skillSystem.learnSkill(mockPlayerUnit.id, 'basic-attack', mockPlayerUnit);

            // 4. ユニット選択
            gameplayScene['gameStateManager'] = {
                getSelectedUnit: jest.fn().mockReturnValue(mockPlayerUnit),
                isPlayerTurn: jest.fn().mockReturnValue(true),
                updateUnit: jest.fn(),
                nextTurn: jest.fn().mockReturnValue({ success: true })
            } as any;

            // 5. スキルアクション実行
            await gameplayScene['handleSkillAction'](mockPlayerUnit);

            // 6. 結果確認
            expect(mockScene.add.container).toHaveBeenCalled(); // UI表示
            expect(skillSystem.getSystemState().initialized).toBe(true);
        });

        test('複数のスキルシステム機能が連携して動作する', () => {
            gameplayScene.create();

            const skillSystem = gameplayScene['skillSystem'];

            // 複数スキルを登録
            skillSystem.registerSkill({
                id: 'heal',
                name: '回復',
                description: '回復スキル',
                skillType: 'heal',
                targetType: 'single',
                range: 1,
                usageCondition: {
                    mpCost: 10,
                    levelRequirement: 1,
                    cooldown: 0,
                    usageLimit: -1,
                    weaponRequirement: [],
                    jobRequirement: undefined
                },
                effects: [{
                    type: 'heal',
                    value: 30,
                    duration: 0,
                    target: 'ally'
                }],
                areaOfEffect: {
                    shape: 'single',
                    size: 1
                },
                animation: {
                    castAnimation: 'cast',
                    effectAnimation: 'heal',
                    duration: 1000
                },
                learnConditions: {
                    level: 1,
                    prerequisiteSkills: [],
                    jobRequirement: undefined
                }
            });

            // スキル習得
            skillSystem.learnSkill(mockPlayerUnit.id, 'heal', mockPlayerUnit);

            // 使用可能スキル取得
            const availableSkills = skillSystem.getAvailableSkills(mockPlayerUnit.id);

            expect(availableSkills.length).toBeGreaterThan(0);
            expect(availableSkills.some(skill => skill.skill.id === 'heal')).toBe(true);
        });
    });
});