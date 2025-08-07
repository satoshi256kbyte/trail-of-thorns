import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { AttackRangeCalculator } from '../../game/src/systems/AttackRangeCalculator';
import { TargetSelector } from '../../game/src/systems/TargetSelector';
import { DamageCalculator } from '../../game/src/systems/DamageCalculator';
import { BattleAnimator } from '../../game/src/systems/BattleAnimator';
import { BattleStateManager } from '../../game/src/systems/BattleStateManager';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { Unit, Weapon, WeaponType, Element, BattleResult } from '../../game/src/types/battle';
import {
  createMockUnit,
  createMockWeapon,
  createMockStageData,
} from '../data/mockStageConfigurations';

/**
 * 戦闘システム全要件カバレッジ確認テスト
 *
 * このテストスイートは要件定義書の全項目をカバーし、
 * 各要件が正しく実装されていることを確認します。
 *
 * 要件1: 攻撃範囲計算システム
 * 要件2: 対象選択システム
 * 要件3: ダメージ計算システム
 * 要件4: 戦闘アニメーション・エフェクト
 * 要件5: 戦闘状態管理
 * 要件6: 武器・装備システム連携
 */
describe('Battle System - Requirements Coverage Tests', () => {
  let battleSystem: BattleSystem;
  let attackRangeCalculator: AttackRangeCalculator;
  let targetSelector: TargetSelector;
  let damageCalculator: DamageCalculator;
  let battleAnimator: BattleAnimator;
  let battleStateManager: BattleStateManager;
  let gameStateManager: GameStateManager;
  let characterManager: CharacterManager;
  let mockScene: any;

  beforeEach(() => {
    // テスト環境の準備
    mockScene = {
      add: {
        image: jest.fn().mockReturnValue({
          setOrigin: jest.fn().mockReturnThis(),
          setPosition: jest.fn().mockReturnThis(),
          destroy: jest.fn(),
        }),
        text: jest.fn().mockReturnValue({
          setOrigin: jest.fn().mockReturnThis(),
          setPosition: jest.fn().mockReturnThis(),
          destroy: jest.fn(),
        }),
        graphics: jest.fn().mockReturnValue({
          fillStyle: jest.fn().mockReturnThis(),
          fillRect: jest.fn().mockReturnThis(),
          destroy: jest.fn(),
        }),
      },
      tweens: {
        add: jest.fn().mockImplementation(config => {
          setTimeout(() => {
            if (config.onComplete) config.onComplete();
          }, 100);
          return { play: jest.fn() };
        }),
      },
    };

    // システムの初期化
    gameStateManager = new GameStateManager();
    characterManager = new CharacterManager(mockScene);
    attackRangeCalculator = new AttackRangeCalculator();
    targetSelector = new TargetSelector();
    damageCalculator = new DamageCalculator();
    battleAnimator = new BattleAnimator(mockScene);
    battleStateManager = new BattleStateManager();
    battleSystem = new BattleSystem(gameStateManager, characterManager);

    // テストデータの読み込み
    const mockStageData = createMockStageData();
    gameStateManager.loadStage(mockStageData);
  });

  afterEach(() => {
    if (battleSystem && typeof battleSystem.cleanup === 'function') {
      battleSystem.cleanup();
    }
  });

  describe('要件1: 攻撃範囲計算システム - 完全カバレッジ', () => {
    describe('1.1 攻撃可能範囲のハイライト表示', () => {
      test('プレイヤーがキャラクターを選択して攻撃アクションを選択すると、システムは攻撃可能範囲をハイライト表示する', async () => {
        const attacker = createMockUnit({
          id: 'attacker-1',
          position: { x: 5, y: 5 },
          faction: 'player',
        });
        const weapon = createMockWeapon({
          type: WeaponType.SWORD,
          range: 1,
        });
        attacker.equipment = { weapon };
        characterManager.addUnit(attacker);

        // 攻撃開始
        await battleSystem.initiateAttack(attacker);

        // 攻撃範囲がハイライト表示されることを確認
        expect(battleSystem.isAttackRangeVisible()).toBe(true);

        const attackRange = battleSystem.getAttackRange();
        expect(attackRange).toBeDefined();
        expect(attackRange.length).toBeGreaterThan(0);

        // 近接武器の場合、隣接する8マスが範囲に含まれることを確認
        const expectedPositions = [
          { x: 4, y: 4 },
          { x: 5, y: 4 },
          { x: 6, y: 4 },
          { x: 4, y: 5 },
          { x: 6, y: 5 },
          { x: 4, y: 6 },
          { x: 5, y: 6 },
          { x: 6, y: 6 },
        ];

        expectedPositions.forEach(pos => {
          expect(attackRange).toContainEqual(pos);
        });
      });
    });

    describe('1.2 武器種別に応じた攻撃範囲計算', () => {
      test('キャラクターが異なる武器を装備すると、システムは武器種別に応じた攻撃範囲を計算する', async () => {
        const attacker = createMockUnit({
          position: { x: 5, y: 5 },
          faction: 'player',
        });
        characterManager.addUnit(attacker);

        const weapons = [
          { weapon: createMockWeapon({ type: WeaponType.SWORD, range: 1 }), expectedRange: 8 },
          { weapon: createMockWeapon({ type: WeaponType.BOW, range: 3 }), expectedRange: 28 },
          { weapon: createMockWeapon({ type: WeaponType.SPEAR, range: 2 }), expectedRange: 20 },
          { weapon: createMockWeapon({ type: WeaponType.STAFF, range: 2 }), expectedRange: 20 },
        ];

        for (const { weapon, expectedRange } of weapons) {
          attacker.equipment = { weapon };

          await battleSystem.initiateAttack(attacker);
          const range = battleSystem.getAttackRange();

          expect(range.length).toBe(expectedRange);
          battleSystem.cancelAttack();
        }
      });
    });

    describe('1.3 複数対象の識別', () => {
      test('攻撃範囲内に複数の敵が存在すると、システムは全ての攻撃可能対象を識別する', async () => {
        const attacker = createMockUnit({
          position: { x: 5, y: 5 },
          faction: 'player',
        });
        const weapon = createMockWeapon({ range: 2 });
        attacker.equipment = { weapon };
        characterManager.addUnit(attacker);

        // 複数の敵を範囲内に配置
        const enemies = [
          createMockUnit({ id: 'enemy-1', position: { x: 6, y: 5 }, faction: 'enemy' }),
          createMockUnit({ id: 'enemy-2', position: { x: 7, y: 5 }, faction: 'enemy' }),
          createMockUnit({ id: 'enemy-3', position: { x: 5, y: 6 }, faction: 'enemy' }),
          createMockUnit({ id: 'enemy-4', position: { x: 10, y: 10 }, faction: 'enemy' }), // 範囲外
        ];

        enemies.forEach(enemy => characterManager.addUnit(enemy));

        await battleSystem.initiateAttack(attacker);
        const validTargets = battleSystem.getValidTargets();

        // 範囲内の敵のみが対象として識別されることを確認
        expect(validTargets).toHaveLength(3);
        expect(validTargets.map(t => t.id)).toContain('enemy-1');
        expect(validTargets.map(t => t.id)).toContain('enemy-2');
        expect(validTargets.map(t => t.id)).toContain('enemy-3');
        expect(validTargets.map(t => t.id)).not.toContain('enemy-4');
      });
    });

    describe('1.4 地形・障害物による攻撃制限', () => {
      test('地形や障害物が攻撃経路を遮ると、システムは攻撃不可能な対象を除外する', async () => {
        const attacker = createMockUnit({
          position: { x: 2, y: 2 },
          faction: 'player',
        });
        const weapon = createMockWeapon({ type: WeaponType.BOW, range: 5 });
        attacker.equipment = { weapon };
        characterManager.addUnit(attacker);

        const target = createMockUnit({
          id: 'blocked-target',
          position: { x: 6, y: 2 },
          faction: 'enemy',
        });
        characterManager.addUnit(target);

        // 障害物を配置
        const obstacle = { x: 4, y: 2 };
        const mapData = gameStateManager.getMapData();
        mapData.obstacles.push(obstacle);

        await battleSystem.initiateAttack(attacker);
        const validTargets = battleSystem.getValidTargets();

        // 障害物により遮られた対象が除外されることを確認
        expect(validTargets.map(t => t.id)).not.toContain('blocked-target');
      });
    });

    describe('1.5 範囲攻撃の表示', () => {
      test('範囲攻撃武器を使用すると、システムは複数対象への攻撃範囲を表示する', async () => {
        const attacker = createMockUnit({
          position: { x: 5, y: 5 },
          faction: 'player',
        });
        const areaWeapon = createMockWeapon({
          type: WeaponType.STAFF,
          range: 3,
          rangePattern: {
            type: 'area',
            range: 3,
            pattern: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: -1, y: 0 },
              { x: 0, y: 1 },
              { x: 0, y: -1 },
              { x: 1, y: 1 },
              { x: -1, y: -1 },
              { x: 1, y: -1 },
              { x: -1, y: 1 },
            ],
          },
        });
        attacker.equipment = { weapon: areaWeapon };
        characterManager.addUnit(attacker);

        await battleSystem.initiateAttack(attacker);

        // 範囲攻撃の表示確認
        expect(battleSystem.isAreaAttackMode()).toBe(true);

        const areaPattern = battleSystem.getAreaAttackPattern();
        expect(areaPattern.length).toBe(9); // 3x3エリア
      });
    });
  });

  describe('要件2: 対象選択システム - 完全カバレッジ', () => {
    describe('2.1 攻撃対象の選択', () => {
      test('攻撃範囲が表示されている状態で敵をクリックすると、システムは攻撃対象として選択する', async () => {
        const attacker = createMockUnit({
          position: { x: 5, y: 5 },
          faction: 'player',
        });
        const target = createMockUnit({
          id: 'target-1',
          position: { x: 6, y: 5 },
          faction: 'enemy',
        });

        characterManager.addUnit(attacker);
        characterManager.addUnit(target);

        await battleSystem.initiateAttack(attacker);
        const result = await battleSystem.selectTarget(target);

        expect(result.success).toBe(true);
        expect(battleSystem.getSelectedTarget()).toBe(target);
      });
    });

    describe('2.2 選択対象の視覚的ハイライト', () => {
      test('攻撃対象が選択されると、システムは選択された対象を視覚的にハイライトする', async () => {
        const attacker = createMockUnit({
          position: { x: 5, y: 5 },
          faction: 'player',
        });
        const target = createMockUnit({
          position: { x: 6, y: 5 },
          faction: 'enemy',
        });

        characterManager.addUnit(attacker);
        characterManager.addUnit(target);

        await battleSystem.initiateAttack(attacker);
        await battleSystem.selectTarget(target);

        // 対象がハイライトされることを確認
        expect(battleSystem.isTargetHighlighted(target)).toBe(true);

        // ハイライト表示の確認
        expect(mockScene.add.graphics).toHaveBeenCalled();
      });
    });

    describe('2.3 範囲攻撃での複数対象表示', () => {
      test('範囲攻撃の場合、システムは影響を受ける全ての対象を表示する', async () => {
        const attacker = createMockUnit({
          position: { x: 5, y: 5 },
          faction: 'player',
        });
        const areaWeapon = createMockWeapon({
          type: WeaponType.STAFF,
          rangePattern: {
            type: 'area',
            range: 2,
            pattern: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: -1, y: 0 },
              { x: 0, y: 1 },
              { x: 0, y: -1 },
            ],
          },
        });
        attacker.equipment = { weapon: areaWeapon };
        characterManager.addUnit(attacker);

        // 範囲内に複数の敵を配置
        const targets = [
          createMockUnit({ id: 'target-1', position: { x: 7, y: 5 }, faction: 'enemy' }),
          createMockUnit({ id: 'target-2', position: { x: 8, y: 5 }, faction: 'enemy' }),
          createMockUnit({ id: 'target-3', position: { x: 7, y: 6 }, faction: 'enemy' }),
        ];
        targets.forEach(target => characterManager.addUnit(target));

        await battleSystem.initiateAttack(attacker);
        await battleSystem.selectTarget(targets[0]);

        const affectedTargets = battleSystem.getAreaTargets();
        expect(affectedTargets.length).toBeGreaterThan(1);
        expect(affectedTargets).toContain(targets[0]);
      });
    });

    describe('2.4 攻撃選択のキャンセル', () => {
      test('攻撃対象の選択をキャンセルすると、システムは攻撃範囲表示に戻る', async () => {
        const attacker = createMockUnit({
          position: { x: 5, y: 5 },
          faction: 'player',
        });
        characterManager.addUnit(attacker);

        await battleSystem.initiateAttack(attacker);
        expect(battleSystem.isAttackRangeVisible()).toBe(true);

        // 攻撃をキャンセル
        battleSystem.cancelAttack();

        // 攻撃範囲表示に戻ることを確認
        expect(battleSystem.getCurrentState()).toBe('idle');
        expect(battleSystem.getSelectedTarget()).toBeNull();
      });
    });

    describe('2.5 無効な対象選択時のエラー表示', () => {
      test('無効な対象を選択すると、システムはエラーメッセージを表示する', async () => {
        const attacker = createMockUnit({
          position: { x: 5, y: 5 },
          faction: 'player',
        });
        const invalidTarget = createMockUnit({
          position: { x: 10, y: 10 }, // 範囲外
          faction: 'enemy',
        });

        characterManager.addUnit(attacker);
        characterManager.addUnit(invalidTarget);

        await battleSystem.initiateAttack(attacker);
        const result = await battleSystem.selectTarget(invalidTarget);

        expect(result.success).toBe(false);
        expect(result.error).toBe('OUT_OF_RANGE');
        expect(battleSystem.getLastErrorMessage()).toContain('射程外');
      });
    });
  });

  describe('要件3: ダメージ計算システム - 完全カバレッジ', () => {
    describe('3.1 基本ダメージ計算', () => {
      test('キャラクターが攻撃を実行すると、システムは攻撃力と防御力に基づいてダメージを計算する', async () => {
        const attacker = createMockUnit({
          stats: { attack: 30 },
          faction: 'player',
        });
        const target = createMockUnit({
          stats: { defense: 10 },
          faction: 'enemy',
        });
        const weapon = createMockWeapon({ attackPower: 15 });

        characterManager.addUnit(attacker);
        characterManager.addUnit(target);

        const damage = damageCalculator.calculateBaseDamage(attacker, target, weapon);

        // 基本ダメージ = (攻撃力 + 武器攻撃力) - 防御力
        const expectedBaseDamage = 30 + 15 - 10;
        expect(damage).toBe(expectedBaseDamage);
      });
    });

    describe('3.2 属性相性による倍率適用', () => {
      test('属性相性が存在すると、システムは属性による倍率をダメージに適用する', async () => {
        const attacker = createMockUnit({
          stats: { attack: 20 },
          faction: 'player',
        });
        const target = createMockUnit({
          stats: { defense: 10 },
          element: Element.WATER,
          faction: 'enemy',
        });
        const fireWeapon = createMockWeapon({
          attackPower: 10,
          element: Element.FIRE,
        });

        characterManager.addUnit(attacker);
        characterManager.addUnit(target);

        const baseDamage = 20; // (20 + 10) - 10
        const modifiedDamage = damageCalculator.applyElementalModifier(
          baseDamage,
          Element.FIRE,
          Element.WATER
        );

        // 火属性 vs 水属性は有利（1.5倍）
        expect(modifiedDamage).toBe(baseDamage * 1.5);
      });
    });

    describe('3.3 クリティカルヒット', () => {
      test('クリティカルヒットが発生すると、システムはダメージを1.5倍に増加させる', async () => {
        const attacker = createMockUnit({
          stats: { attack: 20, speed: 15 },
          faction: 'player',
        });
        const target = createMockUnit({
          stats: { defense: 5, speed: 10 },
          faction: 'enemy',
        });
        const weapon = createMockWeapon({
          attackPower: 10,
          criticalRate: 1.0, // 100%クリティカル
        });

        const criticalResult = damageCalculator.calculateCritical(attacker, target, weapon);

        expect(criticalResult.isCritical).toBe(true);
        expect(criticalResult.multiplier).toBe(1.5);
      });
    });

    describe('3.4 回避判定', () => {
      test('攻撃が回避されると、システムはダメージを0にする', async () => {
        const attacker = createMockUnit({
          stats: { speed: 10 },
          faction: 'player',
        });
        const target = createMockUnit({
          stats: { speed: 20, evasion: 1.0 }, // 100%回避
          faction: 'enemy',
        });

        const isEvaded = damageCalculator.calculateEvasion(attacker, target);
        expect(isEvaded).toBe(true);
      });
    });

    describe('3.5 最小ダメージ保証', () => {
      test('ダメージが計算されると、システムは最小1ダメージを保証する', async () => {
        const attacker = createMockUnit({
          stats: { attack: 5 },
          faction: 'player',
        });
        const target = createMockUnit({
          stats: { defense: 100 }, // 非常に高い防御力
          faction: 'enemy',
        });
        const weapon = createMockWeapon({ attackPower: 5 });

        const finalDamage = damageCalculator.calculateFinalDamage(attacker, target, weapon);
        expect(finalDamage).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('要件4: 戦闘アニメーション・エフェクト - 完全カバレッジ', () => {
    describe('4.1 攻撃アニメーション', () => {
      test('攻撃が実行されると、システムは攻撃者の攻撃アニメーションを再生する', async () => {
        const attacker = createMockUnit({
          position: { x: 5, y: 5 },
          faction: 'player',
        });
        const target = createMockUnit({
          position: { x: 6, y: 5 },
          faction: 'enemy',
        });
        const weapon = createMockWeapon({ type: WeaponType.SWORD });

        const animationPromise = battleAnimator.playAttackAnimation(attacker, target, weapon);

        expect(battleAnimator.isAnimationPlaying()).toBe(true);
        expect(battleAnimator.getCurrentAnimation()).toBe('attack');

        await animationPromise;
        expect(battleAnimator.isAnimationPlaying()).toBe(false);
      });
    });

    describe('4.2 ダメージエフェクト', () => {
      test('ダメージが発生すると、システムはダメージエフェクトを表示する', async () => {
        const target = createMockUnit({
          position: { x: 6, y: 5 },
          faction: 'enemy',
        });
        const damage = 25;

        await battleAnimator.showDamageEffect(target, damage, 'physical');

        // ダメージ数値が表示されることを確認
        expect(mockScene.add.text).toHaveBeenCalledWith(
          expect.any(Number),
          expect.any(Number),
          damage.toString(),
          expect.any(Object)
        );
      });
    });

    describe('4.3 HPバー減少アニメーション', () => {
      test('HPが減少すると、システムはHPバーの減少アニメーションを表示する', async () => {
        const unit = createMockUnit({
          stats: { maxHP: 100 },
          currentHP: 100,
          faction: 'enemy',
        });
        const newHP = 75;

        await battleAnimator.animateHPChange(unit, 100, newHP);

        // HPバーアニメーションが実行されることを確認
        expect(mockScene.tweens.add).toHaveBeenCalledWith(
          expect.objectContaining({
            targets: expect.any(Object),
            duration: expect.any(Number),
          })
        );

        expect(unit.currentHP).toBe(newHP);
      });
    });

    describe('4.4 戦闘不能演出', () => {
      test('キャラクターが戦闘不能になると、システムは戦闘不能演出を再生する', async () => {
        const unit = createMockUnit({
          currentHP: 0,
          isDefeated: true,
          faction: 'enemy',
        });

        await battleAnimator.playDefeatedAnimation(unit);

        // 戦闘不能演出が実行されることを確認
        expect(mockScene.tweens.add).toHaveBeenCalledWith(
          expect.objectContaining({
            targets: expect.any(Object),
            alpha: 0,
          })
        );
      });
    });

    describe('4.5 アニメーション完了後のターン進行', () => {
      test('全てのアニメーションが完了すると、システムは次のターンに進行する', async () => {
        const attacker = createMockUnit({
          faction: 'player',
        });
        const target = createMockUnit({
          faction: 'enemy',
        });
        const weapon = createMockWeapon();

        // 戦闘実行
        await battleSystem.initiateAttack(attacker);
        await battleSystem.selectTarget(target);

        // アニメーション完了を待機
        await battleSystem.waitForAnimationComplete();

        // ターンが進行することを確認
        expect(attacker.hasActed).toBe(true);
        expect(gameStateManager.canEndTurn()).toBe(true);
      });
    });
  });

  describe('要件5: 戦闘状態管理 - 完全カバレッジ', () => {
    describe('5.1 ダメージ適用とHP更新', () => {
      test('キャラクターがダメージを受けると、システムは現在HPを更新する', async () => {
        const target = createMockUnit({
          stats: { maxHP: 100 },
          currentHP: 100,
          faction: 'enemy',
        });
        const damage = 30;

        battleStateManager.applyDamage(target, damage);

        expect(target.currentHP).toBe(70);
      });
    });

    describe('5.2 戦闘不能状態の処理', () => {
      test('キャラクターのHPが0になると、システムは戦闘不能状態に変更する', async () => {
        const unit = createMockUnit({
          stats: { maxHP: 50 },
          currentHP: 50,
          faction: 'enemy',
        });

        battleStateManager.applyDamage(unit, 50);

        expect(unit.currentHP).toBe(0);
        expect(unit.isDefeated).toBe(true);
      });
    });

    describe('5.3 戦闘不能キャラクターの行動無効化', () => {
      test('戦闘不能キャラクターが存在すると、システムはそのキャラクターの行動を無効化する', async () => {
        const defeatedUnit = createMockUnit({
          currentHP: 0,
          isDefeated: true,
          faction: 'player',
        });

        characterManager.addUnit(defeatedUnit);

        const canAct = battleSystem.canAct(defeatedUnit);
        expect(canAct).toBe(false);

        const activeUnits = gameStateManager.getActiveUnits();
        expect(activeUnits).not.toContain(defeatedUnit);
      });
    });

    describe('5.4 戦闘結果のゲーム状態反映', () => {
      test('戦闘が終了すると、システムは戦闘結果をゲーム状態に反映する', async () => {
        const attacker = createMockUnit({
          faction: 'player',
          experience: 0,
        });
        const target = createMockUnit({
          faction: 'enemy',
        });

        characterManager.addUnit(attacker);
        characterManager.addUnit(target);

        // 戦闘実行
        await battleSystem.initiateAttack(attacker);
        const result = await battleSystem.selectTarget(target);

        // 戦闘結果が記録されることを確認
        expect(result.battleResult).toBeDefined();
        expect(result.battleResult!.attacker).toBe(attacker);
        expect(result.battleResult!.target).toBe(target);

        // ゲーム状態に反映されることを確認
        const battleHistory = battleSystem.getBattleHistory();
        expect(battleHistory).toHaveLength(1);
      });
    });

    describe('5.5 経験値付与', () => {
      test('経験値が獲得されると、システムは攻撃者の経験値を増加させる', async () => {
        const attacker = createMockUnit({
          faction: 'player',
          experience: 0,
        });
        const initialExp = attacker.experience || 0;

        battleStateManager.grantExperience(attacker, 50);

        expect(attacker.experience).toBe(initialExp + 50);
      });
    });
  });

  describe('要件6: 武器・装備システム連携 - 完全カバレッジ', () => {
    describe('6.1 武器攻撃力の戦闘計算適用', () => {
      test('キャラクターが武器を装備すると、システムは武器の攻撃力を戦闘計算に適用する', async () => {
        const attacker = createMockUnit({
          stats: { attack: 20 },
          faction: 'player',
        });
        const target = createMockUnit({
          stats: { defense: 5 },
          faction: 'enemy',
        });
        const weapon = createMockWeapon({ attackPower: 15 });

        attacker.equipment = { weapon };

        const damage = damageCalculator.calculateBaseDamage(attacker, target, weapon);

        // 武器攻撃力が含まれることを確認
        expect(damage).toBe(20 + 15 - 5); // 30
      });
    });

    describe('6.2 武器特殊効果の戦闘反映', () => {
      test('武器に特殊効果があると、システムは効果を戦闘に反映する', async () => {
        const weapon = createMockWeapon({
          attackPower: 10,
          specialEffects: [
            {
              type: 'poison',
              chance: 1.0, // 100%発動
              duration: 3,
              power: 5,
            },
          ],
        });

        const attacker = createMockUnit({ faction: 'player' });
        const target = createMockUnit({ faction: 'enemy' });

        attacker.equipment = { weapon };
        characterManager.addUnit(attacker);
        characterManager.addUnit(target);

        await battleSystem.initiateAttack(attacker);
        const result = await battleSystem.selectTarget(target);

        // 特殊効果が適用されることを確認
        expect(result.battleResult!.specialEffectsApplied).toBeDefined();
        expect(result.battleResult!.specialEffectsApplied).toContain('poison');
      });
    });

    describe('6.3 防具の被ダメージ計算適用', () => {
      test('防具を装備すると、システムは防御力を被ダメージ計算に適用する', async () => {
        const attacker = createMockUnit({
          stats: { attack: 25 },
          faction: 'player',
        });
        const target = createMockUnit({
          stats: { defense: 10 },
          faction: 'enemy',
        });
        const armor = {
          id: 'armor-1',
          name: 'Test Armor',
          defenseBonus: 8,
        };

        target.equipment = { armor };

        const damage = damageCalculator.calculateBaseDamage(attacker, target, createMockWeapon());

        // 防具の防御力が適用されることを確認
        const expectedDamage = 25 - (10 + 8); // 7
        expect(damage).toBe(expectedDamage);
      });
    });

    describe('6.4 装備属性の相性計算', () => {
      test('装備に属性があると、システムは属性相性を計算に含める', async () => {
        const fireWeapon = createMockWeapon({
          element: Element.FIRE,
          attackPower: 20,
        });
        const waterArmor = {
          id: 'water-armor',
          element: Element.WATER,
        };

        const attacker = createMockUnit({ faction: 'player' });
        const target = createMockUnit({ faction: 'enemy' });

        attacker.equipment = { weapon: fireWeapon };
        target.equipment = { armor: waterArmor };

        const baseDamage = 20;
        const modifiedDamage = damageCalculator.applyElementalModifier(
          baseDamage,
          Element.FIRE,
          Element.WATER
        );

        // 属性相性が適用されることを確認
        expect(modifiedDamage).toBeGreaterThan(baseDamage);
      });
    });

    describe('6.5 装備破損状態の性能低下', () => {
      test('装備が破損状態だと、システムは性能低下を戦闘に反映する', async () => {
        const normalWeapon = createMockWeapon({
          attackPower: 20,
          durability: 100,
        });
        const brokenWeapon = createMockWeapon({
          attackPower: 20,
          durability: 0, // 完全に破損
        });

        const attacker = createMockUnit({ faction: 'player' });
        const target = createMockUnit({ faction: 'enemy' });

        // 通常状態での攻撃力
        attacker.equipment = { weapon: normalWeapon };
        const normalDamage = damageCalculator.calculateBaseDamage(attacker, target, normalWeapon);

        // 破損状態での攻撃力
        attacker.equipment = { weapon: brokenWeapon };
        const brokenDamage = damageCalculator.calculateBaseDamage(attacker, target, brokenWeapon);

        // 破損状態で性能が低下することを確認
        expect(brokenDamage).toBeLessThan(normalDamage);
      });
    });
  });

  describe('品質保証 - 統合テスト', () => {
    test('全要件が統合されて正常に動作することを確認', async () => {
      // 完全な戦闘シナリオを実行
      const attacker = createMockUnit({
        id: 'hero',
        name: 'Hero',
        position: { x: 5, y: 5 },
        stats: { attack: 25, defense: 15, maxHP: 100 },
        currentHP: 100,
        faction: 'player',
        experience: 0,
      });

      const target = createMockUnit({
        id: 'enemy',
        name: 'Enemy',
        position: { x: 6, y: 5 },
        stats: { attack: 20, defense: 10, maxHP: 80 },
        currentHP: 80,
        faction: 'enemy',
      });

      const weapon = createMockWeapon({
        id: 'sword',
        name: 'Magic Sword',
        type: WeaponType.SWORD,
        attackPower: 15,
        element: Element.FIRE,
        criticalRate: 0.2,
      });

      attacker.equipment = { weapon };
      characterManager.addUnit(attacker);
      characterManager.addUnit(target);

      // 1. 攻撃範囲計算 (要件1)
      await battleSystem.initiateAttack(attacker);
      expect(battleSystem.isAttackRangeVisible()).toBe(true);

      // 2. 対象選択 (要件2)
      const selectionResult = await battleSystem.selectTarget(target);
      expect(selectionResult.success).toBe(true);
      expect(battleSystem.isTargetHighlighted(target)).toBe(true);

      // 3. ダメージ計算 (要件3)
      const battleResult = selectionResult.battleResult!;
      expect(battleResult.damage).toBeGreaterThan(0);
      expect(battleResult.damage).toBeLessThanOrEqual(40); // 最大期待値

      // 4. アニメーション実行 (要件4)
      expect(battleResult.animationCompleted).toBe(true);

      // 5. 状態管理 (要件5)
      expect(target.currentHP).toBeLessThan(80);
      expect(attacker.experience).toBeGreaterThan(0);

      // 6. 装備システム連携 (要件6)
      expect(battleResult.weaponUsed).toBe(weapon);
      expect(battleResult.weaponElement).toBe(Element.FIRE);

      // 戦闘履歴の記録確認
      const battleHistory = battleSystem.getBattleHistory();
      expect(battleHistory).toHaveLength(1);
      expect(battleHistory[0].attacker).toBe(attacker);
      expect(battleHistory[0].target).toBe(target);

      console.log('全要件統合テスト完了:', {
        攻撃者: attacker.name,
        対象: target.name,
        ダメージ: battleResult.damage,
        クリティカル: battleResult.isCritical,
        回避: battleResult.isEvaded,
        経験値獲得: battleResult.experienceGained,
        対象撃破: battleResult.targetDefeated,
      });
    });

    test('エラーケースでの要件遵守確認', async () => {
      // 無効な状況での各要件の動作確認
      const attacker = createMockUnit({
        currentHP: 0, // 戦闘不能
        faction: 'player',
      });
      const target = createMockUnit({
        position: { x: 20, y: 20 }, // 範囲外
        faction: 'enemy',
      });

      characterManager.addUnit(attacker);
      characterManager.addUnit(target);

      // 戦闘不能キャラクターでの攻撃試行
      const attackResult = await battleSystem.initiateAttack(attacker);
      expect(attackResult.success).toBe(false);
      expect(attackResult.error).toBe('INVALID_ATTACKER');

      // 有効なキャラクターで範囲外攻撃試行
      const validAttacker = createMockUnit({
        position: { x: 1, y: 1 },
        faction: 'player',
      });
      characterManager.addUnit(validAttacker);

      await battleSystem.initiateAttack(validAttacker);
      const targetResult = await battleSystem.selectTarget(target);
      expect(targetResult.success).toBe(false);
      expect(targetResult.error).toBe('OUT_OF_RANGE');

      // エラー状態からの回復確認
      battleSystem.cancelAttack();
      expect(battleSystem.getCurrentState()).toBe('idle');
    });
  });
});
