/**
 * 仲間化システム エンドツーエンド ワークフローテスト
 *
 * 実際のゲームプレイフローに沿った完全な仲間化ワークフローをテストします。
 */

import { GameplayScene } from '../../game/src/scenes/GameplayScene';
import { RecruitmentSystem } from '../../game/src/systems/recruitment/RecruitmentSystem';
import { BattleSystem } from '../../game/src/systems/BattleSystem';
import { CharacterManager } from '../../game/src/systems/CharacterManager';
import { GameStateManager } from '../../game/src/systems/GameStateManager';
import { UIManager } from '../../game/src/ui/UIManager';
import { Unit, StageData, Position } from '../../game/src/types';

// テスト用のモックデータ
const createCompleteStageData = (): StageData => ({
  id: 'recruitment-test-stage',
  name: 'Recruitment Test Stage',
  mapData: {
    width: 15,
    height: 15,
    tiles: Array(15)
      .fill(null)
      .map(() => Array(15).fill({ type: 'grass', movementCost: 1 })),
  },
  playerUnits: [
    {
      id: 'protagonist',
      name: 'Hero',
      position: { x: 2, y: 2 },
      stats: { maxHP: 120, maxMP: 60, attack: 25, defense: 20, speed: 12, movement: 4 },
      currentHP: 120,
      currentMP: 60,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    },
    {
      id: 'ally-mage',
      name: 'Mage',
      position: { x: 1, y: 2 },
      stats: { maxHP: 80, maxMP: 100, attack: 30, defense: 10, speed: 8, movement: 3 },
      currentHP: 80,
      currentMP: 100,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    },
  ],
  enemyUnits: [
    {
      id: 'recruitable-knight',
      name: 'Enemy Knight',
      position: { x: 8, y: 8 },
      stats: { maxHP: 100, maxMP: 40, attack: 22, defense: 25, speed: 10, movement: 3 },
      currentHP: 100,
      currentMP: 40,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
      isRecruitable: true,
      recruitmentConditions: [
        {
          id: 'protagonist_attack',
          type: 'specific_attacker',
          description: '主人公で攻撃して撃破する',
          parameters: { attackerId: 'protagonist' },
        },
        {
          id: 'hp_low',
          type: 'hp_threshold',
          description: 'HPが25%以下の状態で撃破する',
          parameters: { threshold: 0.25 },
        },
      ],
    },
    {
      id: 'regular-enemy',
      name: 'Regular Enemy',
      position: { x: 10, y: 6 },
      stats: { maxHP: 80, maxMP: 20, attack: 18, defense: 15, speed: 9, movement: 3 },
      currentHP: 80,
      currentMP: 20,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
      isRecruitable: false,
    },
    {
      id: 'boss-enemy',
      name: 'Stage Boss',
      position: { x: 12, y: 12 },
      stats: { maxHP: 200, maxMP: 80, attack: 35, defense: 30, speed: 6, movement: 2 },
      currentHP: 200,
      currentMP: 80,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
      isRecruitable: false,
      isBoss: true,
    },
  ],
  victoryConditions: [{ type: 'defeat_boss', targetId: 'boss-enemy' }],
});

describe('仲間化システム E2E ワークフローテスト', () => {
  let gameplayScene: GameplayScene;
  let recruitmentSystem: RecruitmentSystem;
  let battleSystem: BattleSystem;
  let characterManager: CharacterManager;
  let gameStateManager: GameStateManager;
  let uiManager: UIManager;
  let stageData: StageData;

  beforeEach(() => {
    // 完全なゲーム環境をセットアップ
    gameplayScene = new GameplayScene();
    battleSystem = new BattleSystem();
    characterManager = new CharacterManager();
    gameStateManager = new GameStateManager();
    uiManager = new UIManager();

    recruitmentSystem = new RecruitmentSystem(battleSystem, characterManager, gameStateManager);

    stageData = createCompleteStageData();

    // ゲームシーンを初期化
    gameplayScene.loadStage(stageData);
    recruitmentSystem.initialize(stageData);
  });

  describe('完全な仲間化成功ワークフロー', () => {
    test('ステージ開始から仲間化完了までの完全フロー', async () => {
      // 1. ステージ開始時の状態確認
      expect(gameStateManager.getCurrentPlayer()).toBe('player');
      expect(characterManager.getPlayerUnits()).toHaveLength(2);
      expect(characterManager.getEnemyUnits()).toHaveLength(3);

      const recruitableUnits = recruitmentSystem.getRecruitableUnits();
      expect(recruitableUnits).toHaveLength(1);
      expect(recruitableUnits[0].id).toBe('recruitable-knight');

      // 2. 仲間化対象の選択と条件確認
      const targetKnight = characterManager.getUnitById('recruitable-knight');
      const protagonist = characterManager.getUnitById('protagonist');

      // プレイヤーが仲間化対象を選択
      gameplayScene.selectUnit(targetKnight);

      const conditions = recruitmentSystem.getRecruitmentConditions(targetKnight);
      expect(conditions).toHaveLength(2);
      expect(conditions[0].type).toBe('specific_attacker');
      expect(conditions[1].type).toBe('hp_threshold');

      // 3. 戦略的な位置取り（主人公を仲間化対象に近づける）
      const movePositions = [
        { x: 3, y: 3 },
        { x: 4, y: 4 },
        { x: 5, y: 5 },
        { x: 6, y: 6 },
        { x: 7, y: 7 },
      ];

      for (const position of movePositions) {
        gameplayScene.moveUnit(protagonist, position);
        gameStateManager.nextTurn();

        // 敵のターンをスキップ（簡略化）
        gameStateManager.nextTurn();
      }

      // 4. HPを閾値まで削る（味方魔法使いで攻撃）
      const allyMage = characterManager.getUnitById('ally-mage');

      // 魔法使いを仲間化対象に近づける
      gameplayScene.moveUnit(allyMage, { x: 7, y: 8 });

      // HPを25%まで削る攻撃を実行
      const damageToReduce = targetKnight.currentHP - targetKnight.stats.maxHP * 0.2; // 20%まで削る
      battleSystem.executeAttack(allyMage, targetKnight, damageToReduce);

      expect(targetKnight.currentHP).toBeLessThanOrEqual(targetKnight.stats.maxHP * 0.25);

      // 5. 仲間化条件の進捗確認
      const progress = recruitmentSystem.getRecruitmentProgress(targetKnight);
      expect(progress.conditionsMet[1]).toBe(true); // HP条件達成
      expect(progress.conditionsMet[0]).toBe(false); // まだ主人公で攻撃していない

      // 6. 主人公による最終攻撃（仲間化実行）
      const finalDamage = targetKnight.currentHP;
      const recruitmentResult = recruitmentSystem.processRecruitmentAttempt(
        protagonist,
        targetKnight,
        finalDamage
      );

      expect(recruitmentResult).toBe(true);
      expect(recruitmentSystem.isNPC(targetKnight)).toBe(true);
      expect(targetKnight.faction).toBe('npc');

      // 7. NPC状態の確認
      expect(targetKnight.hasActed).toBe(true);
      expect(targetKnight.hasMoved).toBe(true);
      expect(recruitmentSystem.canAct(targetKnight)).toBe(false);

      // 8. 敵AIがNPCを優先攻撃することを確認
      const regularEnemy = characterManager.getUnitById('regular-enemy');
      const targetPriorities = [
        {
          unit: protagonist,
          priority: recruitmentSystem.getTargetPriority(regularEnemy, protagonist),
        },
        { unit: allyMage, priority: recruitmentSystem.getTargetPriority(regularEnemy, allyMage) },
        {
          unit: targetKnight,
          priority: recruitmentSystem.getTargetPriority(regularEnemy, targetKnight),
        },
      ];

      const highestPriority = Math.max(...targetPriorities.map(t => t.priority));
      const npcPriority = targetPriorities.find(t => t.unit.id === 'recruitable-knight')?.priority;

      expect(npcPriority).toBe(highestPriority);
      expect(npcPriority).toBe(Number.MAX_SAFE_INTEGER);

      // 9. NPCを保護しながらボス撃破
      const boss = characterManager.getUnitById('boss-enemy');

      // ボスを撃破（簡略化）
      battleSystem.executeAttack(protagonist, boss, boss.currentHP);

      expect(boss.currentHP).toBe(0);
      gameStateManager.setVictoryConditionMet(true);

      // 10. ステージクリア時の仲間化完了処理
      const survivingNPCs = recruitmentSystem.getSurvivingNPCs();
      expect(survivingNPCs).toHaveLength(1);
      expect(survivingNPCs[0].id).toBe('recruitable-knight');

      const recruitedUnits = recruitmentSystem.completeRecruitment();
      expect(recruitedUnits).toHaveLength(1);

      const recruitedKnight = recruitedUnits[0];
      expect(recruitedKnight.faction).toBe('player');
      expect(recruitedKnight.isRecruited).toBe(true);

      // 11. 次ステージでの使用可能性確認
      const availableUnits = characterManager.getAvailableUnits();
      const recruitedUnit = availableUnits.find(unit => unit.id === 'recruitable-knight');

      expect(recruitedUnit).toBeDefined();
      expect(recruitedUnit?.faction).toBe('player');
      expect(characterManager.isPlayerUnit(recruitedUnit!)).toBe(true);
    });
  });

  describe('仲間化失敗ワークフロー', () => {
    test('NPC撃破による仲間化失敗フロー', async () => {
      const targetKnight = characterManager.getUnitById('recruitable-knight');
      const protagonist = characterManager.getUnitById('protagonist');

      // 1. 仲間化条件を満たしてNPC化
      recruitmentSystem.processRecruitmentAttempt(
        protagonist,
        targetKnight,
        targetKnight.currentHP
      );
      expect(recruitmentSystem.isNPC(targetKnight)).toBe(true);

      // 2. 敵がNPCを攻撃して撃破
      const regularEnemy = characterManager.getUnitById('regular-enemy');
      battleSystem.executeAttack(regularEnemy, targetKnight, targetKnight.currentHP);

      expect(targetKnight.currentHP).toBe(0);

      // 3. ステージクリア時に仲間化失敗を確認
      const boss = characterManager.getUnitById('boss-enemy');
      battleSystem.executeAttack(protagonist, boss, boss.currentHP);
      gameStateManager.setVictoryConditionMet(true);

      const survivingNPCs = recruitmentSystem.getSurvivingNPCs();
      expect(survivingNPCs).toHaveLength(0);

      const recruitedUnits = recruitmentSystem.completeRecruitment();
      expect(recruitedUnits).toHaveLength(0);

      // 4. 失敗メッセージの確認
      const recruitmentResult = recruitmentSystem.getRecruitmentResult(targetKnight);
      expect(recruitmentResult.success).toBe(false);
      expect(recruitmentResult.reason).toBe('NPC was defeated');
    });

    test('仲間化条件未達成による失敗フロー', async () => {
      const targetKnight = characterManager.getUnitById('recruitable-knight');
      const allyMage = characterManager.getUnitById('ally-mage'); // 主人公以外

      // 1. 条件を満たさない攻撃者で撃破を試行
      const result = recruitmentSystem.processRecruitmentAttempt(
        allyMage,
        targetKnight,
        targetKnight.currentHP
      );

      expect(result).toBe(false);
      expect(recruitmentSystem.isNPC(targetKnight)).toBe(false);
      expect(targetKnight.currentHP).toBe(0); // 通常の撃破

      // 2. 仲間化失敗の確認
      const recruitmentResult = recruitmentSystem.getRecruitmentResult(targetKnight);
      expect(recruitmentResult.success).toBe(false);
      expect(recruitmentResult.reason).toBe('Recruitment conditions not met');
    });
  });

  describe('複数仲間化ワークフロー', () => {
    test('複数キャラクターの同時仲間化フロー', async () => {
      // 追加の仲間化可能敵を作成
      const secondRecruitableEnemy = {
        id: 'recruitable-archer',
        name: 'Enemy Archer',
        position: { x: 5, y: 10 },
        stats: { maxHP: 90, maxMP: 30, attack: 28, defense: 18, speed: 14, movement: 4 },
        currentHP: 90,
        currentMP: 30,
        faction: 'enemy' as const,
        hasActed: false,
        hasMoved: false,
        isRecruitable: true,
        recruitmentConditions: [
          {
            id: 'mage_attack',
            type: 'specific_attacker',
            description: '魔法使いで攻撃して撃破する',
            parameters: { attackerId: 'ally-mage' },
          },
        ],
      };

      characterManager.addUnit(secondRecruitableEnemy);
      recruitmentSystem.initialize(stageData);

      const targetKnight = characterManager.getUnitById('recruitable-knight');
      const targetArcher = characterManager.getUnitById('recruitable-archer');
      const protagonist = characterManager.getUnitById('protagonist');
      const allyMage = characterManager.getUnitById('ally-mage');

      // 1. 両方の敵をNPC化
      recruitmentSystem.processRecruitmentAttempt(
        protagonist,
        targetKnight,
        targetKnight.currentHP
      );
      recruitmentSystem.processRecruitmentAttempt(allyMage, targetArcher, targetArcher.currentHP);

      expect(recruitmentSystem.isNPC(targetKnight)).toBe(true);
      expect(recruitmentSystem.isNPC(targetArcher)).toBe(true);

      // 2. 両方のNPCが生存した状態でステージクリア
      const boss = characterManager.getUnitById('boss-enemy');
      battleSystem.executeAttack(protagonist, boss, boss.currentHP);
      gameStateManager.setVictoryConditionMet(true);

      // 3. 複数仲間化の完了確認
      const survivingNPCs = recruitmentSystem.getSurvivingNPCs();
      expect(survivingNPCs).toHaveLength(2);

      const recruitedUnits = recruitmentSystem.completeRecruitment();
      expect(recruitedUnits).toHaveLength(2);

      const recruitedIds = recruitedUnits.map(unit => unit.id);
      expect(recruitedIds).toContain('recruitable-knight');
      expect(recruitedIds).toContain('recruitable-archer');
    });
  });

  describe('UI/UXワークフロー', () => {
    test('プレイヤーの仲間化体験フロー', async () => {
      const targetKnight = characterManager.getUnitById('recruitable-knight');
      const protagonist = characterManager.getUnitById('protagonist');

      // 1. 仲間化対象選択時のUI表示
      const uiSpy = jest.spyOn(recruitmentSystem, 'showRecruitmentConditions');
      gameplayScene.selectUnit(targetKnight);

      expect(uiSpy).toHaveBeenCalledWith(targetKnight, expect.any(Array));

      // 2. 条件進捗のリアルタイム更新
      const progressSpy = jest.spyOn(recruitmentSystem, 'updateRecruitmentProgress');

      // HP条件を満たす
      targetKnight.currentHP = targetKnight.stats.maxHP * 0.2;
      recruitmentSystem.checkRecruitmentEligibility(protagonist, targetKnight);

      expect(progressSpy).toHaveBeenCalled();

      // 3. 仲間化成功時の演出
      const successSpy = jest.spyOn(recruitmentSystem, 'showRecruitmentSuccess');

      recruitmentSystem.processRecruitmentAttempt(
        protagonist,
        targetKnight,
        targetKnight.currentHP
      );
      recruitmentSystem.completeRecruitment();

      expect(successSpy).toHaveBeenCalledWith(targetKnight);

      // 4. NPC状態の視覚的フィードバック
      const npcIndicatorSpy = jest.spyOn(recruitmentSystem, 'showNPCIndicator');
      expect(npcIndicatorSpy).toHaveBeenCalledWith(targetKnight);
    });
  });

  describe('エラーハンドリングワークフロー', () => {
    test('システムエラー発生時の回復フロー', async () => {
      const targetKnight = characterManager.getUnitById('recruitable-knight');
      const protagonist = characterManager.getUnitById('protagonist');

      // 1. 戦闘システムエラーをシミュレート
      jest.spyOn(battleSystem, 'executeAttack').mockImplementationOnce(() => {
        throw new Error('Battle system error');
      });

      // 2. エラー発生時の適切な処理
      expect(() => {
        recruitmentSystem.processRecruitmentAttempt(protagonist, targetKnight, 50);
      }).not.toThrow();

      // 3. エラー状態からの回復
      expect(recruitmentSystem.getSystemStatus()).toBe('error');

      recruitmentSystem.recoverFromError();

      expect(recruitmentSystem.getSystemStatus()).toBe('ready');

      // 4. 回復後の正常動作確認
      jest.restoreAllMocks();

      const result = recruitmentSystem.processRecruitmentAttempt(
        protagonist,
        targetKnight,
        targetKnight.currentHP
      );

      expect(result).toBe(true);
    });
  });

  describe('パフォーマンスワークフロー', () => {
    test('大規模戦闘での仲間化システムパフォーマンス', async () => {
      // 大量の敵ユニットを追加
      const largeEnemyForce = Array.from({ length: 20 }, (_, i) => ({
        id: `enemy-${i}`,
        name: `Enemy ${i}`,
        position: { x: i % 10, y: Math.floor(i / 10) + 5 },
        stats: { maxHP: 80, maxMP: 20, attack: 18, defense: 15, speed: 9, movement: 3 },
        currentHP: 80,
        currentMP: 20,
        faction: 'enemy' as const,
        hasActed: false,
        hasMoved: false,
        isRecruitable: i % 3 === 0, // 3体に1体が仲間化可能
      }));

      largeEnemyForce.forEach(enemy => characterManager.addUnit(enemy));
      recruitmentSystem.initialize(stageData);

      const protagonist = characterManager.getUnitById('protagonist');
      const startTime = performance.now();

      // 全ての敵に対して仲間化判定を実行
      const enemies = characterManager.getEnemyUnits();
      enemies.forEach(enemy => {
        if (enemy.isRecruitable) {
          recruitmentSystem.checkRecruitmentEligibility(protagonist, enemy);
        }
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // パフォーマンス要件: 20体の敵に対する処理が50ms以内
      expect(processingTime).toBeLessThan(50);

      // メモリ使用量の確認
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // 200MB以下
    });
  });
});
