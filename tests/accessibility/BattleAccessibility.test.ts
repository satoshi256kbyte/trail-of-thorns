import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { InputHandler } from '../../game/src/input/InputHandler';
import { UIManager } from '../../game/src/ui/UIManager';
import { BattleAnimator } from '../../game/src/systems/BattleAnimator';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { Unit, Weapon, WeaponType, Element } from '../../game/src/types/battle';
import { createMockUnit, createMockWeapon, createMockStageData } from '../data/mockStageConfigurations';

/**
 * 戦闘システムのアクセシビリティテスト
 * 
 * このテストスイートは以下をカバーします：
 * - キーボード操作による戦闘システムアクセス
 * - 視覚的フィードバックの品質
 * - 色覚異常対応
 * - スクリーンリーダー対応
 * - 操作の代替手段提供
 */
describe('Battle System - Accessibility Tests', () => {
    let gameplayScene: GameplayScene;
    let battleSystem: BattleSystem;
    let inputHandler: InputHandler;
    let uiManager: UIManager;
    let battleAnimator: BattleAnimator;
    let gameStateManager: GameStateManager;
    let characterManager: CharacterManager;
    let mockScene: any;

    beforeEach(() => {
        // アクセシビリティテスト用のモックシーン
        mockScene = {
            add: {
                image: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setPosition: jest.fn().mockReturnThis(),
                    setScale: jest.fn().mockReturnThis(),
                    setAlpha: jest.fn().mockReturnThis(),
                    setTint: jest.fn().mockReturnThis(),
                    setVisible: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                text: jest.fn().mockReturnValue({
                    setOrigin: jest.fn().mockReturnThis(),
                    setPosition: jest.fn().mockReturnThis(),
                    setStyle: jest.fn().mockReturnThis(),
                    setText: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                }),
                graphics: jest.fn().mockReturnValue({
                    fillStyle: jest.fn().mockReturnThis(),
                    fillRect: jest.fn().mockReturnThis(),
                    strokeLineShape: jest.fn().mockReturnThis(),
                    setAlpha: jest.fn().mockReturnThis(),
                    destroy: jest.fn()
                })
            },
            input: {
                keyboard: {
                    on: jest.fn(),
                    off: jest.fn(),
                    addKey: jest.fn().mockReturnValue({
                        on: jest.fn(),
                        isDown: false
                    })
                },
                on: jest.fn(),
                off: jest.fn()
            },
            tweens: {
                add: jest.fn().mockImplementation((config) => {
                    setTimeout(() => {
                        if (config.onComplete) config.onComplete();
                    }, config.duration || 100);
                    return { play: jest.fn(), stop: jest.fn() };
                })
            },
            sound: {
                add: jest.fn().mockReturnValue({
                    play: jest.fn(),
                    stop: jest.fn(),
                    setVolume: jest.fn()
                })
            }
        };

        // システムの初期化
        gameStateManager = new GameStateManager();
        characterManager = new CharacterManager();
        inputHandler = new InputHandler(mockScene);
        uiManager = new UIManager(mockScene);
        battleAnimator = new BattleAnimator(mockScene);
        battleSystem = new BattleSystem(gameStateManager, characterManager);

        gameplayScene = new GameplayScene();
        gameplayScene.battleSystem = battleSystem;
        gameplayScene.inputHandler = inputHandler;
        gameplayScene.uiManager = uiManager;
        gameplayScene.battleAnimator = battleAnimator;

        // テストデータの準備
        const mockStageData = createMockStageData();
        gameplayScene.loadStage(mockStageData);
    });

    afterEach(() => {
        gameplayScene.cleanup();
    });

    describe('キーボード操作による戦闘アクセス', () => {
        test('キーボードのみでの完全な戦闘フロー', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];

            // 1. キャラクター選択（数字キー）
            const selectResult = await inputHandler.handleKeyPress('1');
            expect(selectResult.success).toBe(true);
            expect(gameplayScene.getSelectedUnit()).toBe(playerUnit);

            // 2. 攻撃アクション選択（Aキー）
            const attackResult = await inputHandler.handleKeyPress('a');
            expect(attackResult.success).toBe(true);
            expect(battleSystem.isAttackRangeVisible()).toBe(true);

            // 3. 対象選択（方向キー + Enter）
            await inputHandler.handleKeyPress('ArrowRight');
            await inputHandler.handleKeyPress('ArrowDown');
            const targetResult = await inputHandler.handleKeyPress('Enter');
            expect(targetResult.success).toBe(true);

            // 4. 戦闘実行確認
            expect(enemyUnit.currentHP).toBeLessThan(enemyUnit.stats.maxHP);

            // 5. 音声フィードバックの確認
            expect(mockScene.sound.add).toHaveBeenCalledWith('battle_hit');
        });

        test('キーボードショートカットの網羅性', async () => {
            const shortcuts = [
                { key: '1', action: 'selectUnit1', description: 'ユニット1選択' },
                { key: '2', action: 'selectUnit2', description: 'ユニット2選択' },
                { key: 'a', action: 'attack', description: '攻撃' },
                { key: 'm', action: 'move', description: '移動' },
                { key: 'w', action: 'wait', description: '待機' },
                { key: 'Escape', action: 'cancel', description: 'キャンセル' },
                { key: 'Tab', action: 'nextUnit', description: '次のユニット' },
                { key: 'Space', action: 'confirm', description: '決定' },
                { key: 'h', action: 'help', description: 'ヘルプ' },
                { key: 'i', action: 'info', description: '情報表示' }
            ];

            for (const shortcut of shortcuts) {
                const result = await inputHandler.handleKeyPress(shortcut.key);
                expect(result.action).toBe(shortcut.action);

                // ヘルプテキストが提供されることを確認
                const helpText = inputHandler.getKeyboardHelp(shortcut.key);
                expect(helpText).toContain(shortcut.description);
            }
        });

        test('方向キーによるナビゲーション', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];
            await gameplayScene.handleUnitClick(playerUnit.id);
            await gameplayScene.handleAttackAction();

            // 初期カーソル位置
            let cursorPosition = inputHandler.getCursorPosition();
            expect(cursorPosition).toEqual(playerUnit.position);

            // 方向キーでカーソル移動
            await inputHandler.handleKeyPress('ArrowRight');
            cursorPosition = inputHandler.getCursorPosition();
            expect(cursorPosition.x).toBe(playerUnit.position.x + 1);

            await inputHandler.handleKeyPress('ArrowDown');
            cursorPosition = inputHandler.getCursorPosition();
            expect(cursorPosition.y).toBe(playerUnit.position.y + 1);

            // カーソル位置の視覚的フィードバック確認
            expect(uiManager.isCursorVisible()).toBe(true);
            expect(uiManager.getCursorPosition()).toEqual(cursorPosition);
        });

        test('キーボードアクセシビリティ設定', async () => {
            // キーリピート設定
            inputHandler.setKeyRepeatDelay(500);
            inputHandler.setKeyRepeatRate(100);

            // 長押し検出
            const longPressResult = await inputHandler.simulateLongPress('ArrowRight', 1000);
            expect(longPressResult.repeatCount).toBeGreaterThan(5);

            // キー組み合わせ
            const comboResult = await inputHandler.handleKeyCombo(['Ctrl', 'a']);
            expect(comboResult.action).toBe('selectAll');

            // カスタムキーバインド
            inputHandler.setCustomKeyBinding('q', 'quickAttack');
            const customResult = await inputHandler.handleKeyPress('q');
            expect(customResult.action).toBe('quickAttack');
        });
    });

    describe('視覚的フィードバックの品質', () => {
        test('高コントラスト表示対応', async () => {
            // 高コントラストモードを有効化
            uiManager.setHighContrastMode(true);

            const playerUnit = characterManager.getPlayerUnits()[0];
            await gameplayScene.handleUnitClick(playerUnit.id);
            await gameplayScene.handleAttackAction();

            // 攻撃範囲のハイライトが高コントラストであることを確認
            const rangeHighlight = uiManager.getAttackRangeHighlight();
            expect(rangeHighlight.fillColor).toBe('#FFFFFF'); // 白色
            expect(rangeHighlight.strokeColor).toBe('#000000'); // 黒色
            expect(rangeHighlight.strokeWidth).toBeGreaterThanOrEqual(3); // 太い境界線

            // 選択されたユニットのハイライト確認
            const unitHighlight = uiManager.getUnitHighlight(playerUnit.id);
            expect(unitHighlight.contrast).toBeGreaterThanOrEqual(7); // WCAG AA準拠
        });

        test('フォントサイズとテキスト可読性', async () => {
            // 大きなフォントサイズ設定
            uiManager.setFontScale(1.5);

            const playerUnit = characterManager.getPlayerUnits()[0];
            await gameplayScene.handleUnitClick(playerUnit.id);

            // ユニット情報表示のフォントサイズ確認
            const unitInfo = uiManager.getUnitInfoDisplay(playerUnit.id);
            expect(unitInfo.fontSize).toBeGreaterThanOrEqual(18); // 最小18px

            // ダメージ数値のフォントサイズ確認
            await battleSystem.initiateAttack(playerUnit);
            const enemyUnit = characterManager.getEnemyUnits()[0];
            await battleSystem.selectTarget(enemyUnit);

            const damageText = uiManager.getLastDamageText();
            expect(damageText.fontSize).toBeGreaterThanOrEqual(24); // ダメージは大きく表示
            expect(damageText.strokeThickness).toBeGreaterThanOrEqual(2); // アウトライン有り
        });

        test('アニメーション速度調整', async () => {
            // アニメーション速度を遅く設定
            battleAnimator.setAnimationSpeed(0.5);

            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];

            const startTime = performance.now();
            await battleSystem.initiateAttack(playerUnit);
            await battleSystem.selectTarget(enemyUnit);
            const endTime = performance.now();

            const animationDuration = endTime - startTime;

            // アニメーションが通常の2倍の時間をかけていることを確認
            expect(animationDuration).toBeGreaterThan(2000); // 2秒以上

            // アニメーション無効化オプション
            battleAnimator.setAnimationsEnabled(false);

            const fastStartTime = performance.now();
            await battleSystem.initiateAttack(playerUnit);
            await battleSystem.selectTarget(enemyUnit);
            const fastEndTime = performance.now();

            const fastDuration = fastEndTime - fastStartTime;
            expect(fastDuration).toBeLessThan(100); // 即座に完了
        });
    });

    describe('色覚異常対応', () => {
        test('色覚異常対応の色選択', async () => {
            // 色覚異常対応モードを有効化
            uiManager.setColorBlindMode('deuteranopia'); // 緑色盲

            const elements = [
                { element: Element.FIRE, expectedColor: '#FF6B35' }, // オレンジ系
                { element: Element.WATER, expectedColor: '#4ECDC4' }, // シアン系
                { element: Element.EARTH, expectedColor: '#45B7D1' }, // 青系
                { element: Element.LIGHT, expectedColor: '#FFA07A' }, // サーモン系
                { element: Element.DARK, expectedColor: '#9B59B6' }   // 紫系
            ];

            for (const { element, expectedColor } of elements) {
                const color = uiManager.getElementColor(element);
                expect(color).toBe(expectedColor);

                // コントラスト比の確認
                const contrast = uiManager.calculateContrast(color, '#FFFFFF');
                expect(contrast).toBeGreaterThanOrEqual(4.5); // WCAG AA準拠
            }
        });

        test('パターンとシンボルによる区別', async () => {
            uiManager.setColorBlindMode('protanopia'); // 赤色盲

            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];

            // ユニットの区別にパターンが使用されることを確認
            const playerPattern = uiManager.getUnitPattern(playerUnit);
            const enemyPattern = uiManager.getUnitPattern(enemyUnit);

            expect(playerPattern.type).toBe('solid'); // プレイヤーは実線
            expect(enemyPattern.type).toBe('striped'); // 敵は縞模様

            // HP状態の視覚的区別
            playerUnit.currentHP = playerUnit.stats.maxHP * 0.3; // 30%
            const hpIndicator = uiManager.getHPIndicator(playerUnit);

            expect(hpIndicator.pattern).toBe('warning'); // 警告パターン
            expect(hpIndicator.symbol).toBe('!'); // 警告シンボル
        });

        test('属性効果の視覚的区別', async () => {
            const fireWeapon = createMockWeapon({
                element: Element.FIRE,
                attackPower: 20
            });

            const playerUnit = characterManager.getPlayerUnits()[0];
            playerUnit.equipment = { weapon: fireWeapon };

            await battleSystem.initiateAttack(playerUnit);
            const enemyUnit = characterManager.getEnemyUnits()[0];
            await battleSystem.selectTarget(enemyUnit);

            // 属性エフェクトにパターンが使用されることを確認
            const elementEffect = battleAnimator.getLastElementEffect();
            expect(elementEffect.pattern).toBe('flame'); // 炎パターン
            expect(elementEffect.symbol).toBe('🔥'); // 炎シンボル
            expect(elementEffect.animation).toBe('flicker'); // 点滅アニメーション
        });
    });

    describe('スクリーンリーダー対応', () => {
        test('ARIA属性とセマンティックマークアップ', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];

            // ユニット情報のARIA属性確認
            const unitElement = uiManager.getUnitElement(playerUnit.id);
            expect(unitElement.getAttribute('role')).toBe('button');
            expect(unitElement.getAttribute('aria-label')).toContain(playerUnit.name);
            expect(unitElement.getAttribute('aria-describedby')).toBe(`unit-${playerUnit.id}-stats`);

            // 戦闘状態のライブリージョン
            await gameplayScene.handleUnitClick(playerUnit.id);
            const liveRegion = uiManager.getLiveRegion();
            expect(liveRegion.getAttribute('aria-live')).toBe('polite');
            expect(liveRegion.textContent).toContain(`${playerUnit.name}が選択されました`);
        });

        test('音声による状態通知', async () => {
            // 音声通知を有効化
            uiManager.setAudioFeedbackEnabled(true);

            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];

            // ユニット選択時の音声通知
            await gameplayScene.handleUnitClick(playerUnit.id);
            expect(mockScene.sound.add).toHaveBeenCalledWith('unit_selected');

            // 攻撃実行時の音声通知
            await battleSystem.initiateAttack(playerUnit);
            await battleSystem.selectTarget(enemyUnit);

            expect(mockScene.sound.add).toHaveBeenCalledWith('attack_executed');
            expect(mockScene.sound.add).toHaveBeenCalledWith('damage_dealt');

            // 音声説明の内容確認
            const audioDescription = uiManager.getLastAudioDescription();
            expect(audioDescription).toContain(`${playerUnit.name}が${enemyUnit.name}を攻撃`);
            expect(audioDescription).toContain('ダメージ');
        });

        test('キーボードフォーカス管理', async () => {
            const playerUnits = characterManager.getPlayerUnits();

            // 初期フォーカス
            expect(inputHandler.getFocusedElement()).toBe(playerUnits[0]);

            // Tabキーでフォーカス移動
            await inputHandler.handleKeyPress('Tab');
            expect(inputHandler.getFocusedElement()).toBe(playerUnits[1] || playerUnits[0]);

            // Shift+Tabで逆方向移動
            await inputHandler.handleKeyCombo(['Shift', 'Tab']);
            expect(inputHandler.getFocusedElement()).toBe(playerUnits[0]);

            // フォーカスの視覚的表示
            const focusedElement = uiManager.getFocusedElementHighlight();
            expect(focusedElement.visible).toBe(true);
            expect(focusedElement.strokeWidth).toBeGreaterThanOrEqual(3);
        });
    });

    describe('操作の代替手段提供', () => {
        test('マウス操作の代替キーボード操作', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];

            // マウスクリックの代替：数字キー選択
            await inputHandler.handleKeyPress('1');
            expect(gameplayScene.getSelectedUnit()).toBe(playerUnit);

            // マウスドラッグの代替：方向キー + Shift
            await inputHandler.handleKeyPress('a'); // 攻撃モード
            await inputHandler.handleKeyCombo(['Shift', 'ArrowRight']);
            await inputHandler.handleKeyCombo(['Shift', 'ArrowDown']);

            const targetArea = inputHandler.getSelectedArea();
            expect(targetArea).toContain(enemyUnit.position);

            // マウスホバーの代替：方向キー移動
            await inputHandler.handleKeyPress('ArrowRight');
            const hoveredUnit = inputHandler.getHoveredUnit();
            expect(hoveredUnit).toBe(enemyUnit);

            // ツールチップ表示
            const tooltip = uiManager.getTooltip();
            expect(tooltip.visible).toBe(true);
            expect(tooltip.content).toContain(enemyUnit.name);
        });

        test('ジェスチャー操作の代替', async () => {
            // ピンチズームの代替：+/-キー
            await inputHandler.handleKeyPress('+');
            expect(gameplayScene.getCameraZoom()).toBeGreaterThan(1.0);

            await inputHandler.handleKeyPress('-');
            expect(gameplayScene.getCameraZoom()).toBeLessThan(1.0);

            // スワイプの代替：Ctrl+方向キー
            const initialCameraPos = gameplayScene.getCameraPosition();
            await inputHandler.handleKeyCombo(['Ctrl', 'ArrowRight']);
            const newCameraPos = gameplayScene.getCameraPosition();

            expect(newCameraPos.x).toBeGreaterThan(initialCameraPos.x);

            // 長押しの代替：スペースキー長押し
            const longPressResult = await inputHandler.simulateLongPress('Space', 1000);
            expect(longPressResult.action).toBe('contextMenu');
        });

        test('複雑な操作の簡略化', async () => {
            // ワンクリック攻撃モード
            uiManager.setQuickActionMode(true);

            const playerUnit = characterManager.getPlayerUnits()[0];
            const enemyUnit = characterManager.getEnemyUnits()[0];

            // 通常は「選択→攻撃→対象選択」の3ステップ
            // 簡略化モードでは「対象選択」の1ステップ
            await inputHandler.handleKeyPress('q'); // クイック攻撃
            await inputHandler.handleKeyPress('ArrowRight'); // 対象選択
            await inputHandler.handleKeyPress('Enter'); // 実行

            expect(enemyUnit.currentHP).toBeLessThan(enemyUnit.stats.maxHP);

            // オートターゲット機能
            uiManager.setAutoTargetEnabled(true);

            await inputHandler.handleKeyPress('1'); // ユニット選択
            await inputHandler.handleKeyPress('a'); // 攻撃
            // 自動的に最適な対象が選択される

            const autoTarget = battleSystem.getAutoSelectedTarget();
            expect(autoTarget).toBeDefined();
            expect(autoTarget.faction).toBe('enemy');
        });
    });

    describe('ユーザビリティとフィードバック', () => {
        test('操作ガイダンスの提供', async () => {
            // 初回プレイ時のガイダンス
            uiManager.setTutorialMode(true);

            const playerUnit = characterManager.getPlayerUnits()[0];
            await gameplayScene.handleUnitClick(playerUnit.id);

            // ガイダンスメッセージの表示確認
            const guidance = uiManager.getCurrentGuidance();
            expect(guidance.visible).toBe(true);
            expect(guidance.message).toContain('攻撃するには');
            expect(guidance.keyboardHint).toContain('Aキー');

            // 次のステップのヒント
            await inputHandler.handleKeyPress('a');
            const nextGuidance = uiManager.getCurrentGuidance();
            expect(nextGuidance.message).toContain('対象を選択');
            expect(nextGuidance.keyboardHint).toContain('方向キー');
        });

        test('エラー時の分かりやすいフィードバック', async () => {
            const playerUnit = characterManager.getPlayerUnits()[0];
            playerUnit.hasActed = true; // 既に行動済み

            // 無効な操作を試行
            const result = await gameplayScene.handleUnitClick(playerUnit.id);
            expect(result.success).toBe(false);

            // エラーメッセージの確認
            const errorMessage = uiManager.getErrorMessage();
            expect(errorMessage.visible).toBe(true);
            expect(errorMessage.text).toContain('既に行動済み');
            expect(errorMessage.suggestion).toContain('他のユニットを選択');

            // 音声でのエラー通知
            expect(mockScene.sound.add).toHaveBeenCalledWith('error_notification');

            // 代替操作の提案
            const alternatives = uiManager.getAlternativeActions();
            expect(alternatives).toContain('他のユニットを選択 (数字キー)');
            expect(alternatives).toContain('ターン終了 (Enterキー)');
        });

        test('進行状況の明確な表示', async () => {
            const playerUnits = characterManager.getPlayerUnits();
            const enemyUnits = characterManager.getEnemyUnits();

            // ターン進行状況の表示
            const turnInfo = uiManager.getTurnInfo();
            expect(turnInfo.currentPlayer).toBe('player');
            expect(turnInfo.turnNumber).toBe(1);
            expect(turnInfo.remainingActions).toBe(playerUnits.length);

            // ユニット行動状況の表示
            const unitStatus = uiManager.getUnitStatusSummary();
            expect(unitStatus.ready).toBe(playerUnits.length);
            expect(unitStatus.acted).toBe(0);
            expect(unitStatus.total).toBe(playerUnits.length);

            // 戦闘進行度の表示
            const battleProgress = uiManager.getBattleProgress();
            expect(battleProgress.playerUnitsRemaining).toBe(playerUnits.length);
            expect(battleProgress.enemyUnitsRemaining).toBe(enemyUnits.length);
            expect(battleProgress.completionPercentage).toBe(0);
        });
    });
});