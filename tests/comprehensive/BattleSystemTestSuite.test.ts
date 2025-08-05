import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { AttackRangeCalculator } from '../../game/src/systems/AttackRangeCalculator';
import { TargetSelector } from '../../game/src/systems/TargetSelector';
import { DamageCalculator } from '../../game/src/systems/DamageCalculator';
import { BattleAnimator } from '../../game/src/systems/BattleAnimator';
import { BattleStateManager } from '../../game/src/systems/BattleStateManager';
import { BattleErrorHandler } from '../../game/src/systems/BattleErrorHandler';
import { BattlePerformanceManager } from '../../game/src/systems/BattlePerformanceManager';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { Unit, Position, Weapon, BattleResult, Element, WeaponType } from '../../game/src/types/battle';
import { createMockUnit, createMockWeapon, createMockStageData } from '../data/mockStageConfigurations';

/**
 * 戦闘システム全体の包括的統合テストスイート
 * 
 * このテストスイートは以下をカバーします：
 * - 戦闘システム全体の統合テスト
 * - エンドツーエンドの戦闘ワークフロー
 * - 全要件のカバレッジ確認
 * - システム間の連携テスト
 */
describe('BattleSystem - Comprehensive Integration Test Suite', () => {
    let battleSystem: BattleSystem;
    let gameStateManager: GameStateManager;
    let characterManager: CharacterManager;
    let mockAttacker: Unit;
    let mockTarget: Unit;
    let mockWeapon: Weapon;
    let mockStageData: any;

    beforeEach(() => {
        // モックデータの準備
        mockStageData = createMockStageData();

        // システムの初期化
        gameStateManager = new GameStateManager();
        characterManager = new CharacterManager();
        battleSystem = new BattleSystem(gameStateManager, characterManager);

        // テスト用キャラクターとアイテムの準備
        mockAttacker = createMockUnit({
            id: 'attacker-1',
            name: 'Test Attacker',
            position: { x: 2, y: 2 },
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
            faction: 'player',
            hasActed: false,
            hasMoved: false
        });

        mockTarget = createMockUnit({
            id: 'target-1',
            name: 'Test Target',
            position: { x: 3, y: 2 },
            stats: {
                maxHP: 80,
                maxMP: 30,
                attack: 20,
                defense: 12,
                speed: 10,
                movement: 2
            },
            currentHP: 80,
            currentMP: 30,
            faction: 'enemy',
            hasActed: false,
            hasMoved: false
        });

        mockWeapon = createMockWeapon({
            id: 'sword-1',
            name: 'Test Sword',
            type: WeaponType.SWORD,
            attackPower: 15,
            range: 1,
            element: Element.NONE,
            criticalRate: 0.1,
            accuracy: 0.9
        });

        // キャラクターをシステムに登録
        characterManager.addUnit(mockAttacker);
        characterManager.addUnit(mockTarget);

        // ステージデータの読み込み
        gameStateManager.loadStage(mockStageData);
    });

    afterEach(() => {
        battleSystem.cleanup();
    });

    describe('要件1: 攻撃範囲計算システム - 統合テスト', () => {
        test('1.1 攻撃範囲表示から対象選択までの完全フロー', async () => {
            // 攻撃開始
            await battleSystem.initiateAttack(mockAttacker);

            // 攻撃範囲が表示されることを確認
            expect(battleSystem.isAttackRangeVisible()).toBe(true);

            // 攻撃可能範囲内に対象が含まれることを確認
            const attackRange = battleSystem.getAttackRange();
            expect(attackRange).toContainEqual(mockTarget.position);

            // 武器種別に応じた範囲計算の確認
            const expectedRange = battleSystem.calculateExpectedRange(mockAttacker, mockWeapon);
            expect(attackRange).toEqual(expectedRange);
        });

        test('1.2 複数武器種別での範囲計算統合テスト', async () => {
            const weapons = [
                createMockWeapon({ type: WeaponType.SWORD, range: 1 }),
                createMockWeapon({ type: WeaponType.BOW, range: 3 }),
                createMockWeapon({ type: WeaponType.SPEAR, range: 2 }),
                createMockWeapon({ type: WeaponType.STAFF, range: 2 })
            ];

            for (const weapon of weapons) {
                mockAttacker.equipment = { weapon };
                await battleSystem.initiateAttack(mockAttacker);

                const range = battleSystem.getAttackRange();
                expect(range.length).toBeGreaterThan(0);
                expect(battleSystem.isValidAttackRange(range, weapon)).toBe(true);

                battleSystem.cancelAttack();
            }
        });

        test('1.3 障害物による攻撃阻害の統合確認', async () => {
            // 障害物を配置
            const obstaclePosition = { x: 2, y: 3 };
            mockStageData.mapData.obstacles.push(obstaclePosition);
            gameStateManager.loadStage(mockStageData);

            // 遠距離攻撃武器を装備
            mockAttacker.equipment = { weapon: createMockWeapon({ type: WeaponType.BOW, range: 4 }) };

            // 障害物の向こう側に対象を配置
            mockTarget.position = { x: 2, y: 4 };

            await battleSystem.initiateAttack(mockAttacker);

            // 障害物により攻撃が阻害されることを確認
            const validTargets = battleSystem.getValidTargets();
            expect(validTargets).not.toContain(mockTarget);
        });
    });

    describe('要件2: 対象選択システム - 統合テスト', () => {
        test('2.1 対象選択から攻撃実行までの完全フロー', async () => {
            await battleSystem.initiateAttack(mockAttacker);

            // 対象選択
            const selectionResult = await battleSystem.selectTarget(mockTarget);
            expect(selectionResult.success).toBe(true);

            // 選択された対象がハイライトされることを確認
            expect(battleSystem.getSelectedTarget()).toBe(mockTarget);
            expect(battleSystem.isTargetHighlighted(mockTarget)).toBe(true);
        });

        test('2.2 範囲攻撃での複数対象選択テスト', async () => {
            // 範囲攻撃武器を装備
            const areaWeapon = createMockWeapon({
                type: WeaponType.STAFF,
                range: 2,
                rangePattern: {
                    type: 'area',
                    range: 2,
                    pattern: [
                        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 },
                        { x: 0, y: 1 }, { x: 0, y: -1 }
                    ]
                }
            });

            mockAttacker.equipment = { weapon: areaWeapon };

            // 複数の敵を配置
            const enemy2 = createMockUnit({
                id: 'enemy-2',
                position: { x: 4, y: 2 },
                faction: 'enemy'
            });
            characterManager.addUnit(enemy2);

            await battleSystem.initiateAttack(mockAttacker);
            await battleSystem.selectTarget(mockTarget);

            // 範囲内の全対象が選択されることを確認
            const affectedTargets = battleSystem.getAreaTargets();
            expect(affectedTargets.length).toBeGreaterThan(1);
            expect(affectedTargets).toContain(mockTarget);
        });

        test('2.3 無効な対象選択時のエラーハンドリング', async () => {
            await battleSystem.initiateAttack(mockAttacker);

            // 範囲外の対象を選択
            const outOfRangeTarget = createMockUnit({
                id: 'out-of-range',
                position: { x: 10, y: 10 },
                faction: 'enemy'
            });

            const result = await battleSystem.selectTarget(outOfRangeTarget);
            expect(result.success).toBe(false);
            expect(result.error).toBe('OUT_OF_RANGE');

            // エラーメッセージが表示されることを確認
            expect(battleSystem.getLastErrorMessage()).toContain('射程外');
        });
    });

    describe('要件3: ダメージ計算システム - 統合テスト', () => {
        test('3.1 基本ダメージ計算から最終ダメージまでの完全フロー', async () => {
            await battleSystem.initiateAttack(mockAttacker);
            const result = await battleSystem.selectTarget(mockTarget);

            expect(result.battleResult).toBeDefined();
            const battleResult = result.battleResult!;

            // ダメージが適切に計算されていることを確認
            expect(battleResult.damage).toBeGreaterThan(0);
            expect(battleResult.damage).toBeLessThanOrEqual(mockAttacker.stats.attack + mockWeapon.attackPower);

            // 最小ダメージが保証されていることを確認
            expect(battleResult.damage).toBeGreaterThanOrEqual(1);
        });

        test('3.2 属性相性による倍率適用の統合テスト', async () => {
            // 火属性武器と水属性敵の組み合わせ
            const fireWeapon = createMockWeapon({
                element: Element.FIRE,
                attackPower: 20
            });
            mockAttacker.equipment = { weapon: fireWeapon };
            mockTarget.element = Element.WATER;

            await battleSystem.initiateAttack(mockAttacker);
            const result = await battleSystem.selectTarget(mockTarget);

            // 属性相性による倍率が適用されていることを確認
            expect(result.battleResult!.elementalMultiplier).toBeGreaterThan(1.0);
            expect(result.battleResult!.damage).toBeGreaterThan(20); // 基本攻撃力より高い
        });

        test('3.3 クリティカルヒットの統合テスト', async () => {
            // クリティカル率100%の武器を使用
            const criticalWeapon = createMockWeapon({
                criticalRate: 1.0,
                attackPower: 20
            });
            mockAttacker.equipment = { weapon: criticalWeapon };

            await battleSystem.initiateAttack(mockAttacker);
            const result = await battleSystem.selectTarget(mockTarget);

            // クリティカルヒットが発生していることを確認
            expect(result.battleResult!.isCritical).toBe(true);
            expect(result.battleResult!.damage).toBeGreaterThanOrEqual(30); // 1.5倍以上
        });

        test('3.4 回避判定の統合テスト', async () => {
            // 回避率100%の対象を設定
            mockTarget.stats.evasion = 1.0;

            await battleSystem.initiateAttack(mockAttacker);
            const result = await battleSystem.selectTarget(mockTarget);

            // 攻撃が回避されていることを確認
            expect(result.battleResult!.isEvaded).toBe(true);
            expect(result.battleResult!.damage).toBe(0);
        });
    });

    describe('要件4: 戦闘アニメーション・エフェクト - 統合テスト', () => {
        test('4.1 攻撃アニメーションから完了までの完全フロー', async () => {
            const animationPromise = battleSystem.executeAttackWithAnimation(mockAttacker, mockTarget, mockWeapon);

            // アニメーションが開始されることを確認
            expect(battleSystem.isAnimationPlaying()).toBe(true);

            // アニメーション完了を待機
            const result = await animationPromise;

            // アニメーションが完了していることを確認
            expect(battleSystem.isAnimationPlaying()).toBe(false);
            expect(result.animationCompleted).toBe(true);
        });

        test('4.2 ダメージエフェクトとHPバー更新の同期テスト', async () => {
            const initialHP = mockTarget.currentHP;

            await battleSystem.initiateAttack(mockAttacker);
            const result = await battleSystem.selectTarget(mockTarget);

            // HPが減少していることを確認
            expect(mockTarget.currentHP).toBeLessThan(initialHP);

            // HPバーアニメーションが実行されていることを確認
            expect(battleSystem.isHPBarAnimating(mockTarget)).toBe(true);

            // アニメーション完了後にHPバーが正しい値を表示することを確認
            await battleSystem.waitForAnimationComplete();
            expect(battleSystem.getDisplayedHP(mockTarget)).toBe(mockTarget.currentHP);
        });

        test('4.3 戦闘不能演出の統合テスト', async () => {
            // 対象のHPを1に設定
            mockTarget.currentHP = 1;

            // 高威力攻撃で戦闘不能にする
            const powerfulWeapon = createMockWeapon({
                attackPower: 100
            });
            mockAttacker.equipment = { weapon: powerfulWeapon };

            await battleSystem.initiateAttack(mockAttacker);
            const result = await battleSystem.selectTarget(mockTarget);

            // 戦闘不能になっていることを確認
            expect(result.battleResult!.targetDefeated).toBe(true);
            expect(mockTarget.currentHP).toBe(0);

            // 戦闘不能演出が実行されることを確認
            expect(battleSystem.isDefeatedAnimationPlaying(mockTarget)).toBe(true);
        });
    });

    describe('要件5: 戦闘状態管理 - 統合テスト', () => {
        test('5.1 ダメージ適用から状態更新までの完全フロー', async () => {
            const initialHP = mockTarget.currentHP;
            const initialExp = mockAttacker.experience || 0;

            await battleSystem.initiateAttack(mockAttacker);
            const result = await battleSystem.selectTarget(mockTarget);

            // ダメージが適用されていることを確認
            expect(mockTarget.currentHP).toBeLessThan(initialHP);

            // 攻撃者が経験値を獲得していることを確認
            expect(mockAttacker.experience).toBeGreaterThan(initialExp);

            // 戦闘結果が記録されていることを確認
            const battleHistory = battleSystem.getBattleHistory();
            expect(battleHistory).toHaveLength(1);
            expect(battleHistory[0].attacker).toBe(mockAttacker);
            expect(battleHistory[0].target).toBe(mockTarget);
        });

        test('5.2 戦闘不能状態の処理と行動無効化', async () => {
            // 対象を戦闘不能にする
            mockTarget.currentHP = 1;
            const lethalWeapon = createMockWeapon({ attackPower: 100 });
            mockAttacker.equipment = { weapon: lethalWeapon };

            await battleSystem.initiateAttack(mockAttacker);
            await battleSystem.selectTarget(mockTarget);

            // 戦闘不能状態になっていることを確認
            expect(mockTarget.currentHP).toBe(0);
            expect(mockTarget.isDefeated).toBe(true);

            // 行動が無効化されていることを確認
            expect(battleSystem.canAct(mockTarget)).toBe(false);
            expect(gameStateManager.getActiveUnits()).not.toContain(mockTarget);
        });

        test('5.3 経験値付与システムの統合テスト', async () => {
            const initialLevel = mockAttacker.level || 1;
            const initialExp = mockAttacker.experience || 0;

            // 複数回攻撃を実行
            for (let i = 0; i < 5; i++) {
                const enemy = createMockUnit({
                    id: `enemy-${i}`,
                    position: { x: 3 + i, y: 2 },
                    faction: 'enemy',
                    currentHP: 10
                });
                characterManager.addUnit(enemy);

                await battleSystem.initiateAttack(mockAttacker);
                await battleSystem.selectTarget(enemy);
            }

            // 経験値が増加していることを確認
            expect(mockAttacker.experience).toBeGreaterThan(initialExp);

            // レベルアップが発生する可能性を確認
            if (mockAttacker.experience >= battleSystem.getExpRequiredForNextLevel(mockAttacker)) {
                expect(mockAttacker.level).toBeGreaterThan(initialLevel);
            }
        });
    });

    describe('要件6: 武器・装備システム連携 - 統合テスト', () => {
        test('6.1 武器による攻撃力・属性の戦闘計算への適用', async () => {
            const weapons = [
                createMockWeapon({ attackPower: 10, element: Element.FIRE }),
                createMockWeapon({ attackPower: 20, element: Element.WATER }),
                createMockWeapon({ attackPower: 15, element: Element.EARTH })
            ];

            const results: BattleResult[] = [];

            for (const weapon of weapons) {
                // 対象のHPをリセット
                mockTarget.currentHP = mockTarget.stats.maxHP;
                mockAttacker.equipment = { weapon };

                await battleSystem.initiateAttack(mockAttacker);
                const result = await battleSystem.selectTarget(mockTarget);
                results.push(result.battleResult!);
            }

            // 武器の攻撃力が反映されていることを確認
            expect(results[1].damage).toBeGreaterThan(results[0].damage); // 20 > 10
            expect(results[1].damage).toBeGreaterThan(results[2].damage); // 20 > 15

            // 属性が正しく適用されていることを確認
            results.forEach((result, index) => {
                expect(result.weaponElement).toBe(weapons[index].element);
            });
        });

        test('6.2 装備破損状態での性能低下', async () => {
            const normalWeapon = createMockWeapon({ attackPower: 20, durability: 100 });
            const brokenWeapon = createMockWeapon({ attackPower: 20, durability: 0 });

            // 通常状態での攻撃
            mockTarget.currentHP = mockTarget.stats.maxHP;
            mockAttacker.equipment = { weapon: normalWeapon };
            await battleSystem.initiateAttack(mockAttacker);
            const normalResult = await battleSystem.selectTarget(mockTarget);

            // 破損状態での攻撃
            mockTarget.currentHP = mockTarget.stats.maxHP;
            mockAttacker.equipment = { weapon: brokenWeapon };
            await battleSystem.initiateAttack(mockAttacker);
            const brokenResult = await battleSystem.selectTarget(mockTarget);

            // 破損状態で性能が低下していることを確認
            expect(brokenResult.battleResult!.damage).toBeLessThan(normalResult.battleResult!.damage);
        });
    });

    describe('エラーハンドリング - 統合テスト', () => {
        test('戦闘エラーの検出と回復処理', async () => {
            // 無効な攻撃者でのエラー
            const invalidAttacker = createMockUnit({
                id: 'invalid',
                currentHP: 0,
                faction: 'player'
            });

            const result = await battleSystem.initiateAttack(invalidAttacker);
            expect(result.success).toBe(false);
            expect(result.error).toBe('INVALID_ATTACKER');

            // エラー後の状態回復を確認
            expect(battleSystem.getCurrentState()).toBe('idle');
            expect(battleSystem.getSelectedTarget()).toBeNull();
        });

        test('戦闘中断時の状態復旧', async () => {
            await battleSystem.initiateAttack(mockAttacker);

            // 戦闘を中断
            battleSystem.cancelAttack();

            // 状態が正しく復旧されていることを確認
            expect(battleSystem.getCurrentState()).toBe('idle');
            expect(battleSystem.isAttackRangeVisible()).toBe(false);
            expect(battleSystem.getSelectedTarget()).toBeNull();
        });
    });

    describe('パフォーマンス - 統合テスト', () => {
        test('大規模戦闘でのパフォーマンス確認', async () => {
            // 多数の敵を配置
            const enemies: Unit[] = [];
            for (let i = 0; i < 20; i++) {
                const enemy = createMockUnit({
                    id: `enemy-${i}`,
                    position: { x: 5 + (i % 5), y: 5 + Math.floor(i / 5) },
                    faction: 'enemy'
                });
                enemies.push(enemy);
                characterManager.addUnit(enemy);
            }

            const startTime = performance.now();

            // 範囲攻撃で複数の敵を攻撃
            const areaWeapon = createMockWeapon({
                type: WeaponType.STAFF,
                range: 10,
                rangePattern: {
                    type: 'area',
                    range: 3,
                    pattern: Array.from({ length: 49 }, (_, i) => ({
                        x: (i % 7) - 3,
                        y: Math.floor(i / 7) - 3
                    }))
                }
            });

            mockAttacker.equipment = { weapon: areaWeapon };
            await battleSystem.initiateAttack(mockAttacker);
            await battleSystem.selectTarget(enemies[0]);

            const endTime = performance.now();
            const executionTime = endTime - startTime;

            // 実行時間が許容範囲内であることを確認（2秒以内）
            expect(executionTime).toBeLessThan(2000);
        });
    });

    describe('全要件カバレッジ確認', () => {
        test('要件1-6の全機能が統合されて動作することを確認', async () => {
            // 完全な戦闘フローを実行
            const testScenario = async () => {
                // 1. 攻撃範囲計算
                await battleSystem.initiateAttack(mockAttacker);
                expect(battleSystem.isAttackRangeVisible()).toBe(true);

                // 2. 対象選択
                const selectionResult = await battleSystem.selectTarget(mockTarget);
                expect(selectionResult.success).toBe(true);

                // 3. ダメージ計算
                const battleResult = selectionResult.battleResult!;
                expect(battleResult.damage).toBeGreaterThan(0);

                // 4. アニメーション実行
                expect(battleResult.animationCompleted).toBe(true);

                // 5. 状態管理
                expect(mockTarget.currentHP).toBeLessThan(mockTarget.stats.maxHP);
                expect(mockAttacker.experience).toBeGreaterThan(0);

                // 6. 装備システム連携
                expect(battleResult.weaponUsed).toBe(mockWeapon);

                return true;
            };

            const result = await testScenario();
            expect(result).toBe(true);
        });
    });
});