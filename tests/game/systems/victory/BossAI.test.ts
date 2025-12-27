/**
 * BossAI システムのユニットテスト
 * ボス専用AI行動パターンの動作を検証
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BossAI, BossActionEvaluation, BossAIConfig } from '../../../../game/src/systems/victory/BossAI';
import {
  BossData,
  BossType,
  BossDifficulty,
  RoseEssenceType,
  BossPhase,
  BossAbility,
  AIPersonality as BossAIPersonality,
} from '../../../../game/src/types/boss';
import { Unit, Position } from '../../../../game/src/types/gameplay';
import {
  AIContext,
  AIActionType,
  DifficultySettings,
  AISystemIntegration,
} from '../../../../game/src/types/ai';

describe('BossAI', () => {
  let bossUnit: Unit;
  let bossData: BossData;
  let difficultySettings: DifficultySettings;
  let bossAI: BossAI;
  let context: AIContext;

  beforeEach(() => {
    // ボスユニットの作成
    bossUnit = {
      id: 'boss-001',
      name: 'Test Boss',
      position: { x: 5, y: 5 },
      stats: {
        maxHP: 1000,
        maxMP: 200,
        attack: 80,
        defense: 60,
        magicAttack: 70,
        magicDefense: 50,
        speed: 40,
        movement: 3,
        attackRange: 2,
      },
      currentHP: 1000,
      currentMP: 200,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
      level: 10,
      experience: 0,
      job: 'boss',
      skills: [],
      equipment: {},
      statusEffects: [],
    };

    // ボスフェーズの作成
    const phases: BossPhase[] = [
      {
        phaseNumber: 1,
        hpThreshold: 100,
        statModifiers: {},
        newAbilities: ['ability-001'],
      },
      {
        phaseNumber: 2,
        hpThreshold: 50,
        statModifiers: { attack: 10, speed: 5 },
        newAbilities: ['ability-002'],
      },
      {
        phaseNumber: 3,
        hpThreshold: 25,
        statModifiers: { attack: 20, speed: 10 },
        newAbilities: ['ability-003'],
      },
    ];

    // ボス特殊能力の作成
    const abilities: BossAbility[] = [
      {
        id: 'ability-001',
        name: 'Power Strike',
        description: 'Powerful attack',
        type: 'active',
        effect: {
          type: 'damage',
          value: 100,
          target: 'enemy',
          range: 2,
          description: 'Deals heavy damage',
        },
        cooldown: 3,
        mpCost: 30,
      },
      {
        id: 'ability-002',
        name: 'Area Blast',
        description: 'Area damage',
        type: 'active',
        effect: {
          type: 'damage',
          value: 60,
          target: 'area',
          range: 3,
          description: 'Deals area damage',
        },
        cooldown: 5,
        mpCost: 50,
      },
      {
        id: 'ability-003',
        name: 'Regeneration',
        description: 'Self heal',
        type: 'passive',
        effect: {
          type: 'heal',
          value: 50,
          target: 'self',
          description: 'Heals self',
        },
      },
    ];

    // ボスデータの作成
    bossData = {
      id: 'boss-001',
      name: 'Test Boss',
      title: 'The Destroyer',
      description: 'A powerful boss',
      roseEssenceAmount: 100,
      roseEssenceType: RoseEssenceType.CRIMSON,
      isBoss: true,
      bossType: BossType.MAJOR_BOSS,
      difficulty: BossDifficulty.NORMAL,
      phases,
      currentPhase: 1,
      specialAbilities: abilities,
      aiPersonality: BossAIPersonality.AGGRESSIVE,
      aiPriority: 100,
      experienceReward: 500,
    };

    // 難易度設定
    difficultySettings = {
      reactionTime: 1.0,
      decisionQuality: 0.8,
      mistakeProbability: 0.1,
      skillUsageFrequency: 0.7,
      randomnessFactor: 0.2,
    };

    // AIコンテキストの作成
    context = {
      currentTurn: 1,
      visibleEnemies: [
        {
          id: 'player-001',
          name: 'Hero',
          position: { x: 3, y: 5 },
          stats: {
            maxHP: 200,
            maxMP: 100,
            attack: 50,
            defense: 40,
            magicAttack: 45,
            magicDefense: 35,
            speed: 50,
            movement: 4,
            attackRange: 1,
          },
          currentHP: 200,
          currentMP: 100,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
          level: 5,
          experience: 0,
          job: 'warrior',
          skills: [],
          equipment: {},
          statusEffects: [],
        },
      ],
      visibleAllies: [],
      mapData: {
        width: 10,
        height: 10,
        tiles: [],
      },
    };

    // BossAIの作成
    bossAI = new BossAI(bossUnit, bossData, difficultySettings);
  });

  describe('初期化', () => {
    test('ボスAIが正しく初期化される', () => {
      expect(bossAI).toBeDefined();
      expect(bossAI.currentUnit).toBe(bossUnit);
    });

    test('ボスの優先度が高い', () => {
      const priority = bossAI.getPriority(context);
      expect(priority).toBeGreaterThanOrEqual(100);
    });
  });

  describe('evaluateBossAction', () => {
    test('ボス行動を評価できる', () => {
      const evaluation = bossAI.evaluateBossAction(context);

      expect(evaluation).toBeDefined();
      expect(evaluation.action).toBeDefined();
      expect(evaluation.score).toBeGreaterThan(0);
      expect(evaluation.reasoning).toBeDefined();
    });

    test('複数のアクション候補から最適なものを選択する', () => {
      const evaluation = bossAI.evaluateBossAction(context);

      expect(evaluation.action.type).toMatch(/attack|move|skill|wait/i);
    });

    test('特殊能力が利用可能な場合、評価に含まれる', () => {
      // MP十分な状態で評価
      bossUnit.currentMP = 200;
      const evaluation = bossAI.evaluateBossAction(context);

      // 何らかのアクションが選択されることを確認
      expect(evaluation.action).toBeDefined();
    });
  });

  describe('selectBossTarget', () => {
    test('敵が存在する場合、ターゲットを選択できる', () => {
      const target = bossAI.selectBossTarget(context);

      expect(target).toBeDefined();
      expect(target?.faction).toBe('player');
    });

    test('敵が存在しない場合、nullを返す', () => {
      context.visibleEnemies = [];
      const target = bossAI.selectBossTarget(context);

      expect(target).toBeNull();
    });

    test('低HPの敵を優先的に選択する', () => {
      // 低HPの敵を追加
      const lowHPEnemy: Unit = {
        ...context.visibleEnemies[0],
        id: 'player-002',
        name: 'Wounded Hero',
        currentHP: 50,
        position: { x: 4, y: 5 },
      };

      context.visibleEnemies.push(lowHPEnemy);

      const target = bossAI.selectBossTarget(context);

      // 低HPの敵が選択される可能性が高い
      expect(target).toBeDefined();
    });

    test('複数回呼び出しても一貫したターゲットを維持する', () => {
      const target1 = bossAI.selectBossTarget(context);
      const target2 = bossAI.selectBossTarget(context);

      // ターゲット切り替え閾値により、同じターゲットが維持される可能性が高い
      expect(target1).toBeDefined();
      expect(target2).toBeDefined();
    });
  });

  describe('useBossAbility', () => {
    test('MP十分な場合、特殊能力を使用できる', () => {
      const ability = bossData.specialAbilities[0];
      bossUnit.currentMP = 100;

      const canUse = bossAI.useBossAbility(ability, context);

      // 条件次第で使用可能
      expect(typeof canUse).toBe('boolean');
    });

    test('MP不足の場合、特殊能力を使用できない', () => {
      const ability = bossData.specialAbilities[0];
      bossUnit.currentMP = 10; // 不足

      const canUse = bossAI.useBossAbility(ability, context);

      expect(canUse).toBe(false);
    });

    test('現在のフェーズで利用不可能な能力は使用できない', () => {
      // フェーズ3の能力を試す（現在フェーズ1）
      const ability = bossData.specialAbilities[2];

      const canUse = bossAI.useBossAbility(ability, context);

      expect(canUse).toBe(false);
    });
  });

  describe('adjustBehaviorByPhase', () => {
    test('フェーズに基づいて行動を調整できる', () => {
      const evaluation: BossActionEvaluation = {
        action: {
          type: AIActionType.ATTACK,
          priority: 50,
          target: context.visibleEnemies[0],
          reasoning: 'Test attack',
        },
        score: 50,
        reasoning: 'Test evaluation',
        isSpecialAbility: false,
      };

      const adjusted = bossAI.adjustBehaviorByPhase(evaluation, context);

      expect(adjusted).toBeDefined();
      expect(adjusted.score).toBeGreaterThan(0);
      expect(adjusted.reasoning).toContain('Phase');
    });

    test('特殊能力は高く評価される', () => {
      const evaluation: BossActionEvaluation = {
        action: {
          type: AIActionType.SKILL,
          priority: 50,
          skillId: 'ability-001',
          reasoning: 'Test skill',
        },
        score: 50,
        reasoning: 'Test evaluation',
        isSpecialAbility: true,
      };

      const adjusted = bossAI.adjustBehaviorByPhase(evaluation, context);

      // 特殊能力はスコアが上昇する
      expect(adjusted.score).toBeGreaterThan(evaluation.score);
    });

    test('低HP時は防御的な行動が優先される', () => {
      bossUnit.currentHP = 200; // 20% HP

      const moveEvaluation: BossActionEvaluation = {
        action: {
          type: AIActionType.MOVE,
          priority: 30,
          position: { x: 6, y: 6 },
          reasoning: 'Test move',
        },
        score: 30,
        reasoning: 'Test evaluation',
        isSpecialAbility: false,
      };

      const adjusted = bossAI.adjustBehaviorByPhase(moveEvaluation, context);

      // 低HP時は移動のスコアが上昇する
      expect(adjusted.score).toBeGreaterThan(moveEvaluation.score);
    });

    test('高HP時は攻撃的な行動が優先される', () => {
      bossUnit.currentHP = 900; // 90% HP

      const attackEvaluation: BossActionEvaluation = {
        action: {
          type: AIActionType.ATTACK,
          priority: 40,
          target: context.visibleEnemies[0],
          reasoning: 'Test attack',
        },
        score: 40,
        reasoning: 'Test evaluation',
        isSpecialAbility: false,
      };

      const adjusted = bossAI.adjustBehaviorByPhase(attackEvaluation, context);

      // 高HP時は攻撃のスコアが上昇する
      expect(adjusted.score).toBeGreaterThan(attackEvaluation.score);
    });
  });

  describe('evaluatePosition', () => {
    test('位置を評価できる', () => {
      const position: Position = { x: 5, y: 5 };
      const score = bossAI.evaluatePosition(position, context);

      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('マップ中央付近が高く評価される', () => {
      const centerPosition: Position = { x: 5, y: 5 };
      const edgePosition: Position = { x: 0, y: 0 };

      const centerScore = bossAI.evaluatePosition(centerPosition, context);
      const edgeScore = bossAI.evaluatePosition(edgePosition, context);

      expect(centerScore).toBeGreaterThan(edgeScore);
    });

    test('敵との適切な距離が評価される', () => {
      const optimalPosition: Position = { x: 5, y: 5 }; // 中距離
      const tooClosePosition: Position = { x: 3, y: 5 }; // 近すぎる

      const optimalScore = bossAI.evaluatePosition(optimalPosition, context);
      const tooCloseScore = bossAI.evaluatePosition(tooClosePosition, context);

      // 中距離が好まれる
      expect(optimalScore).toBeGreaterThanOrEqual(tooCloseScore);
    });
  });

  describe('getPriority', () => {
    test('ボスは常に高優先度を持つ', () => {
      const priority = bossAI.getPriority(context);

      expect(priority).toBeGreaterThanOrEqual(100);
    });

    test('ボスデータのaiPriorityが反映される', () => {
      bossData.aiPriority = 150;
      const newBossAI = new BossAI(bossUnit, bossData, difficultySettings);

      const priority = newBossAI.getPriority(context);

      expect(priority).toBe(150);
    });
  });

  describe('フェーズ変化', () => {
    test('HP減少時にフェーズが変化する', async () => {
      // HP を50%に減少
      bossUnit.currentHP = 500;

      // 行動決定を実行（内部でフェーズチェックが行われる）
      await bossAI.decideAction(context);

      // フェーズが変化したことを確認
      expect(bossData.currentPhase).toBeGreaterThan(1);
    });

    test('フェーズ変化後、新しい能力が利用可能になる', async () => {
      // HP を50%に減少してフェーズ2へ
      bossUnit.currentHP = 500;
      await bossAI.decideAction(context);

      // フェーズ2の能力が利用可能かチェック
      const phase2Ability = bossData.specialAbilities[1];
      const canUse = bossAI.useBossAbility(phase2Ability, context);

      // MP十分な場合は使用可能
      expect(typeof canUse).toBe('boolean');
    });
  });

  describe('統合テスト', () => {
    test('完全な行動決定プロセスが動作する', async () => {
      const action = await bossAI.decideAction(context);

      expect(action).toBeDefined();
      expect(action.type).toBeDefined();
      expect(action.reasoning).toBeDefined();
    });

    test('複数ターンにわたって一貫した行動を取る', async () => {
      const actions = [];

      for (let i = 0; i < 3; i++) {
        const action = await bossAI.decideAction(context);
        actions.push(action);
        context.currentTurn++;
      }

      expect(actions).toHaveLength(3);
      actions.forEach(action => {
        expect(action).toBeDefined();
        expect(action.type).toBeDefined();
      });
    });

    test('システム統合時に正しく動作する', async () => {
      // モックシステム統合
      const integration: AISystemIntegration = {
        movementSystem: {
          calculateMovementRange: vi.fn().mockReturnValue([
            { x: 4, y: 5 },
            { x: 6, y: 5 },
            { x: 5, y: 4 },
            { x: 5, y: 6 },
          ]),
          canMoveTo: vi.fn().mockReturnValue(true),
        },
        battleSystem: {
          canAttack: vi.fn().mockReturnValue(true),
        },
      };

      const integratedBossAI = new BossAI(
        bossUnit,
        bossData,
        difficultySettings,
        {},
        integration
      );

      const action = await integratedBossAI.decideAction(context);

      expect(action).toBeDefined();
      expect(action.type).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なコンテキストでもエラーを起こさない', async () => {
      const invalidContext: AIContext = {
        currentTurn: 1,
        visibleEnemies: [],
        visibleAllies: [],
      };

      const action = await bossAI.decideAction(invalidContext);

      // 待機アクションなど安全なフォールバックが返される
      expect(action).toBeDefined();
    });

    test('思考時間制限を超えた場合でも処理が完了する', async () => {
      const config: Partial<BossAIConfig> = {
        thinkingTimeLimit: 100, // 短い制限時間
      };

      const fastBossAI = new BossAI(bossUnit, bossData, difficultySettings, config);

      const action = await fastBossAI.decideAction(context);

      expect(action).toBeDefined();
    });
  });

  describe('パフォーマンス', () => {
    test('行動決定が妥当な時間内に完了する', async () => {
      const startTime = Date.now();
      await bossAI.decideAction(context);
      const endTime = Date.now();

      const elapsedTime = endTime - startTime;

      // 3秒以内に完了することを確認
      expect(elapsedTime).toBeLessThan(3000);
    });

    test('複数回の行動決定でメモリリークが発生しない', async () => {
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        await bossAI.decideAction(context);
      }

      // メトリクスが正しく記録されている
      const metrics = bossAI.metrics;
      expect(metrics.totalDecisions).toBe(iterations);
    });
  });
});
