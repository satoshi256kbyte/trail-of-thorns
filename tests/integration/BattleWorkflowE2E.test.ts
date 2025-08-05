import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { InputHandler } from '../../game/src/input/InputHandler';
import { UIManager } from '../../game/src/ui/UIManager';
import { Unit, Position, Weapon, WeaponType, Element } from '../../game/src/types/battle';
import { createMockUnit, createMockWeapon, createMockStageData } from '../data/mockStageConfigurations';

/**
 * 戦闘システムのエンドツーエンドワークフローテスト
 * 
 * 実際のゲームプレイフローに沿った統合テスト：
 * - ユーザー入力から戦闘完了まで
 * - UI操作とシステム連携
 * - 複数ターンにわたる戦闘フロー
 * - エラーケースでの回復
 */
describe('Battle System - End-to-End Workflow Tests', () => {
    let gameplayScene: GameplayScene;
    let battleSystem: BattleSystem;
    let gameStateManager: GameStateManager;
    let characterManager: CharacterManager;
    let inputHandler: InputHandler;
    let uiManager: UIManager;
    let mockStageData: any;

    beforeEach(async () => {
        // モックPhaserシーンの準備
        const mockScene = {
            add: {
                image: jest.fn().mockReturnValue({ setOrigin: jest.fn() }),
                text: jest.fn().mockReturnValue({ setOrigin: jest.fn() }),
                graphics: jest.fn().mockReturnValue({
                    fillStyle: jest.fn(),
                    fillRect: jest.fn(),
                    strokeLineShape: jest.fn()
                })
            },
            input: {
                on: jest.fn(),
                off: jest.fn()
            },
            cameras: {
                main: {
                    scrollX: 0,
                    scrollY: 0,
                    zoom: 1
                }
            },
            time: {
                delayedCall: jest.fn()
            }
        };

        // システムの初期化
        gameStateManager = new GameStateManager();
        characterManager = new CharacterManager();
        inputHandler = new InputHandler(mockScene as any);
        uiManager = new UIManager(mockScene as any);
        battleSystem = new BattleSystem(gameStateManager, characterManager);

        gameplayScene = new GameplayScene();
        gameplayScene.battleSystem = battleSystem;
        gameplayScene.gameStateManager = gameStateManager;
        gameplayScene.characterManager = characterManager;
        gameplayScene.inputHandler = inputHandler;
        gameplayScene.uiManager = uiManager;

        // テストデータの準備
        mockStageData = createMockStageData();
        await gameplayScene.loadStage(mockStageData);
    });

    afterEach(() => {
        gameplayScene.cleanup();
    });

    describe('基本戦闘ワークフロー', () => {
        test('プレイヤーターン: キャラクター選択から攻撃完了まで', async () => {
            // 1. ゲーム開始 - プレイヤーターン
            expect(gameStateManager.getCurrentPlayer()).toBe('player');

            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];

            // 2. キャラクター選択（マウスクリック）
            const selectResult = await gameplayScene.handleUnitClick(playerUnit.id);
            expect(selectResult.success).toBe(true);
            expect(gameplayScene.getSelectedUnit()).toBe(playerUnit);

            // 3. 攻撃アクション選択
            const attackResult = await gameplayScene.handleAttackAction();
            expect(attackResult.success).toBe(true);
            expect(battleSystem.isAttackRangeVisible()).toBe(true);

            // 4. 攻撃対象選択（マウスクリック）
            const targetResult = await gameplayScene.handleTargetClick(enemyUnit.id);
            expect(targetResult.success).toBe(true);

            // 5. 戦闘実行とアニメーション
            expect(battleSystem.isAnimationPlaying()).toBe(true);
            await battleSystem.waitForAnimationComplete();

            // 6. 戦闘結果の確認
            expect(enemyUnit.currentHP).toBeLessThan(enemyUnit.stats.maxHP);
            expect(playerUnit.hasActed).toBe(true);

            // 7. ターン終了
            expect(gameStateManager.getCurrentPlayer()).toBe('enemy');
        });

        test('敵ターン: AI思考から攻撃実行まで', async () => {
            // プレイヤーターンを終了して敵ターンに移行
            const playerUnit = characterManager.getPlayerUnits()[0];
            playerUnit.hasActed = true;
            gameStateManager.endPlayerTurn();

            expect(gameStateManager.getCurrentPlayer()).toBe('enemy');

            const enemyUnit = characterManager.getEnemyUnits()[0];
            const initialPlayerHP = playerUnit.currentHP;

            // AI思考と行動実行
            const aiActionResult = await gameplayScene.executeEnemyTurn();
            expect(aiActionResult.success).toBe(true);

            // 敵の攻撃が実行されたことを確認
            if (aiActionResult.actionTaken === 'attack') {
                expect(playerUnit.currentHP).toBeLessThan(initialPlayerHP);
            }

            // ターンが再びプレイヤーに戻ることを確認
            expect(gameStateManager.getCurrentPlayer()).toBe('player');
        });

        test('複数ターンにわたる戦闘フロー', async () => {
            let turnCount = 0;
            const maxTurns = 10;

            while (!gameStateManager.isGameOver() && turnCount < maxTurns) {
                turnCount++;

                if (gameStateManager.getCurrentPlayer() === 'player') {
                    // プレイヤーターンの実行
                    const playerUnits = characterManager.getActivePlayerUnits();

                    for (const unit of playerUnits) {
                        if (!unit.hasActed) {
                            await gameplayScene.handleUnitClick(unit.id);

                            // 攻撃可能な敵がいる場合は攻撃
                            const enemies = characterManager.getActiveEnemyUnits();
                            if (enemies.length > 0) {
                                await gameplayScene.handleAttackAction();
                                await gameplayScene.handleTargetClick(enemies[0].id);
                                await battleSystem.waitForAnimationComplete();
                            } else {
                                // 敵がいない場合は待機
                                await gameplayScene.handleWaitAction();
                            }
                            break;
                        }
                    }

                    // 全プレイヤーユニットが行動完了したらターン終了
                    if (playerUnits.every(unit => unit.hasActed)) {
                        gameStateManager.endPlayerTurn();
                    }
                } else {
                    // 敵ターンの実行
                    await gameplayScene.executeEnemyTurn();
                }
            }

            // ゲームが適切に進行したことを確認
            expect(turnCount).toBeGreaterThan(1);
            expect(turnCount).toBeLessThan(maxTurns); // 無限ループしていない
        });
    });

    describe('UI操作とシステム連携', () => {
        test('攻撃範囲表示とUI更新の連携', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];

            // キャラクター選択
            await gameplayScene.handleUnitClick(playerUnit.id);

            // 攻撃アクション選択
            await gameplayScene.handleAttackAction();

            // UI要素の表示確認
            expect(uiManager.isAttackRangeVisible()).toBe(true);
            expect(uiManager.isActionMenuVisible()).toBe(true);
            expect(uiManager.getSelectedUnitInfo()).toEqual({
                id: playerUnit.id,
                name: playerUnit.name,
                hp: playerUnit.currentHP,
                mp: playerUnit.currentMP
            });

            // 攻撃キャンセル
            await gameplayScene.handleCancelAction();

            // UI要素が非表示になることを確認
            expect(uiManager.isAttackRangeVisible()).toBe(false);
            expect(uiManager.isActionMenuVisible()).toBe(false);
        });

        test('戦闘結果表示とUI更新', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];
            const initialExp = playerUnit.experience || 0;

            // 戦闘実行
            await gameplayScene.handleUnitClick(playerUnit.id);
            await gameplayScene.handleAttackAction();
            await gameplayScene.handleTargetClick(enemyUnit.id);
            await battleSystem.waitForAnimationComplete();

            // 戦闘結果UIの表示確認
            expect(uiManager.isBattleResultVisible()).toBe(true);

            const battleResult = uiManager.getBattleResultInfo();
            expect(battleResult.damage).toBeGreaterThan(0);
            expect(battleResult.experienceGained).toBeGreaterThan(0);

            // 経験値表示の更新確認
            expect(uiManager.getUnitExperience(playerUnit.id)).toBe(playerUnit.experience);
            expect(playerUnit.experience).toBeGreaterThan(initialExp);
        });

        test('キーボードショートカットでの戦闘操作', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];

            // キャラクター選択（数字キー）
            await inputHandler.handleKeyPress('1');
            expect(gameplayScene.getSelectedUnit()).toBe(playerUnit);

            // 攻撃アクション（Aキー）
            await inputHandler.handleKeyPress('a');
            expect(battleSystem.isAttackRangeVisible()).toBe(true);

            // 対象選択（方向キー + Enter）
            await inputHandler.handleKeyPress('ArrowRight');
            await inputHandler.handleKeyPress('Enter');

            // 戦闘が実行されることを確認
            expect(battleSystem.isAnimationPlaying()).toBe(true);
            await battleSystem.waitForAnimationComplete();

            expect(enemyUnit.currentHP).toBeLessThan(enemyUnit.stats.maxHP);
        });
    });

    describe('エラーケースでの回復', () => {
        test('無効な操作時のエラーハンドリングと回復', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];

            // 既に行動済みのキャラクターを選択
            playerUnit.hasActed = true;

            const result = await gameplayScene.handleUnitClick(playerUnit.id);
            expect(result.success).toBe(false);
            expect(result.error).toBe('ALREADY_ACTED');

            // エラーメッセージが表示されることを確認
            expect(uiManager.isErrorMessageVisible()).toBe(true);
            expect(uiManager.getErrorMessage()).toContain('既に行動済み');

            // 状態が正しく維持されることを確認
            expect(gameplayScene.getSelectedUnit()).toBeNull();
            expect(battleSystem.getCurrentState()).toBe('idle');
        });

        test('戦闘中の接続エラーシミュレーション', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];

            // 戦闘開始
            await gameplayScene.handleUnitClick(playerUnit.id);
            await gameplayScene.handleAttackAction();

            // 接続エラーをシミュレート
            battleSystem.simulateConnectionError();

            const result = await gameplayScene.handleTargetClick(enemyUnit.id);
            expect(result.success).toBe(false);
            expect(result.error).toBe('CONNECTION_ERROR');

            // エラー回復処理
            await battleSystem.recoverFromError();

            // 状態が正しく復旧されることを確認
            expect(battleSystem.getCurrentState()).toBe('idle');
            expect(gameplayScene.getSelectedUnit()).toBeNull();
            expect(uiManager.isAttackRangeVisible()).toBe(false);
        });

        test('メモリ不足時の緊急処理', async () => {
            // メモリ不足をシミュレート
            const originalMemoryUsage = process.memoryUsage().heapUsed;

            // 大量のオブジェクトを作成してメモリを消費
            const memoryConsumers: any[] = [];
            for (let i = 0; i < 1000; i++) {
                memoryConsumers.push(new Array(10000).fill(Math.random()));
            }

            // メモリ使用量の監視
            const currentMemoryUsage = process.memoryUsage().heapUsed;
            const memoryIncrease = currentMemoryUsage - originalMemoryUsage;

            if (memoryIncrease > 100 * 1024 * 1024) { // 100MB以上増加
                // 緊急クリーンアップの実行
                await battleSystem.emergencyCleanup();

                // ガベージコレクション実行
                global.gc?.();

                // メモリが解放されることを確認
                const afterCleanupMemory = process.memoryUsage().heapUsed;
                expect(afterCleanupMemory).toBeLessThan(currentMemoryUsage);
            }

            // システムが正常に動作することを確認
            const playerUnit = characterManager.getPlayerUnits()[0];
            const result = await gameplayScene.handleUnitClick(playerUnit.id);
            expect(result.success).toBe(true);
        });
    });

    describe('パフォーマンス監視', () => {
        test('戦闘フロー実行時間の監視', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];

            const startTime = performance.now();

            // 完全な戦闘フローを実行
            await gameplayScene.handleUnitClick(playerUnit.id);
            await gameplayScene.handleAttackAction();
            await gameplayScene.handleTargetClick(enemyUnit.id);
            await battleSystem.waitForAnimationComplete();

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // 実行時間が許容範囲内であることを確認（5秒以内）
            expect(executionTime).toBeLessThan(5000);

            // パフォーマンスメトリクスの記録
            const metrics = battleSystem.getPerformanceMetrics();
            expect(metrics.averageFrameTime).toBeLessThan(16.67); // 60fps維持
            expect(metrics.memoryUsage).toBeLessThan(512 * 1024 * 1024); // 512MB以下
        });

        test('連続戦闘でのメモリリーク検出', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // 100回の戦闘を実行
            for (let i = 0; i < 100; i++) {
                const playerUnit = characterManager.getPlayerUnits()[0];
                const enemyUnit = createMockUnit({
                    id: `enemy-${i}`,
                    position: { x: 3, y: 2 },
                    faction: 'enemy',
                    currentHP: 10
                });

                characterManager.addUnit(enemyUnit);

                await gameplayScene.handleUnitClick(playerUnit.id);
                await gameplayScene.handleAttackAction();
                await gameplayScene.handleTargetClick(enemyUnit.id);
                await battleSystem.waitForAnimationComplete();

                // 敵を削除
                characterManager.removeUnit(enemyUnit.id);
            }

            // ガベージコレクション実行
            global.gc?.();

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // メモリ増加が許容範囲内であることを確認（50MB以下）
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
    });

    describe('ゲーム終了条件', () => {
        test('勝利条件達成時のフロー', async () => {
            // 全ての敵を撃破
            const enemies = characterManager.getEnemyUnits();
            const playerUnit = characterManager.getPlayerUnits()[0];

            for (const enemy of enemies) {
                enemy.currentHP = 1; // 一撃で倒せるように設定

                await gameplayScene.handleUnitClick(playerUnit.id);
                await gameplayScene.handleAttackAction();
                await gameplayScene.handleTargetClick(enemy.id);
                await battleSystem.waitForAnimationComplete();

                // プレイヤーユニットの行動状態をリセット
                playerUnit.hasActed = false;
            }

            // 勝利条件が達成されることを確認
            expect(gameStateManager.isVictory()).toBe(true);
            expect(gameStateManager.isGameOver()).toBe(true);

            // 勝利画面が表示されることを確認
            expect(uiManager.isVictoryScreenVisible()).toBe(true);

            // 報酬が計算されることを確認
            const rewards = gameStateManager.calculateRewards();
            expect(rewards.experience).toBeGreaterThan(0);
            expect(rewards.roseEssence).toBeGreaterThan(0);
        });

        test('敗北条件達成時のフロー', async () => {
            // 全てのプレイヤーユニットを撃破
            const players = characterManager.getPlayerUnits();

            for (const player of players) {
                player.currentHP = 0;
                player.isDefeated = true;
            }

            // 敗北条件が達成されることを確認
            expect(gameStateManager.isDefeat()).toBe(true);
            expect(gameStateManager.isGameOver()).toBe(true);

            // 敗北画面が表示されることを確認
            expect(uiManager.isDefeatScreenVisible()).toBe(true);

            // リトライオプションが提供されることを確認
            expect(uiManager.isRetryOptionVisible()).toBe(true);
        });
    });
});