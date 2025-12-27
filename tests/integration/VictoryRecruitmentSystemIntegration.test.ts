/**
 * VictoryConditionSystem と RecruitmentSystem の統合テスト
 * 
 * 要件8.1, 8.2, 8.3, 8.4のテスト
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { VictoryConditionSystem } from '../../game/src/systems/victory/VictoryConditionSystem';
import { RewardDistributor } from '../../game/src/systems/victory/RewardDistributor';
import { Unit, GameState } from '../../game/src/types/gameplay';
import { StageRewards, RecruitmentReward } from '../../game/src/types/reward';
import { ObjectiveType } from '../../game/src/types/victory';

// モックシーンの作成
const createMockScene = (): any => {
  return {
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
    add: {
      existing: vi.fn(),
    },
    time: {
      addEvent: vi.fn(),
    },
  };
};

// モックRecruitmentSystemの作成
const createMockRecruitmentSystem = () => {
  const recruitedUnits: any[] = [];
  
  return {
    completeRecruitment: vi.fn((allUnits: Unit[]) => {
      // NPCユニットを仲間化済みとして返す
      const npcUnits = allUnits.filter(u => u.faction === 'npc');
      const recruited = npcUnits.map(unit => ({
        unit: {
          ...unit,
          faction: 'player', // 次ステージで使用可能に設定
          hasActed: false,
          hasMoved: false,
        },
        recruitmentId: `recruitment-${unit.id}-${Date.now()}`,
        recruitedAt: Date.now(),
        conditions: [],
      }));
      
      recruitedUnits.push(...recruited);
      return recruited;
    }),
    saveRecruitmentCompletion: vi.fn(async (units: any[]) => {
      return { success: true };
    }),
    getAvailableRecruitedCharacters: vi.fn(() => recruitedUnits),
  };
};

// モックユニットの作成
const createMockUnit = (id: string, name: string, faction: 'player' | 'enemy' | 'npc' = 'player'): Unit => ({
  id,
  name,
  position: { x: 0, y: 0 },
  stats: {
    maxHP: 100,
    maxMP: 50,
    attack: 20,
    defense: 15,
    speed: 10,
    movement: 3,
    attackRange: 1,
  },
  currentHP: 100,
  currentMP: 50,
  level: 1,
  experience: 0,
  faction,
  hasActed: false,
  hasMoved: false,
  statusEffects: [],
});

describe('VictoryConditionSystem と RecruitmentSystem の統合', () => {
  let victorySystem: VictoryConditionSystem;
  let rewardDistributor: RewardDistributor;
  let mockRecruitmentSystem: any;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    mockRecruitmentSystem = createMockRecruitmentSystem();
    
    victorySystem = new VictoryConditionSystem(mockScene, {
      enableDebugLogs: false,
      autoCheckConditions: false,
    });
    
    rewardDistributor = new RewardDistributor({
      enableRecruitmentRewards: true,
      debugMode: false,
    });
    
    // RecruitmentSystemを設定
    victorySystem.setRecruitmentSystem(mockRecruitmentSystem);
    rewardDistributor.setRecruitmentSystem(mockRecruitmentSystem);
  });

  describe('要件8.1: ステージクリア時の仲間化状態取得', () => {
    test('ステージクリア時にRecruitmentSystemから仲間化状態を取得する', async () => {
      // ステージデータを初期化
      const stageData = {
        id: 'test-stage-1',
        name: 'Test Stage',
        description: 'Test stage for recruitment',
        objectives: [
          {
            id: 'obj-1',
            type: ObjectiveType.DEFEAT_BOSS,
            description: 'Defeat the boss',
            isRequired: true,
            isComplete: false,
            progress: { current: 0, target: 1, percentage: 0 },
            targetData: { bossId: 'boss-1' },
          },
        ],
        victoryConditions: [
          {
            id: 'victory-1',
            type: 'defeat_boss' as any,
            description: 'Defeat the boss',
            isRequired: true,
            evaluate: () => true,
          },
        ],
        defeatConditions: [],
        bosses: [],
        baseExperienceReward: 100,
        targetTurns: 10,
        maxTurns: 20,
      };
      
      victorySystem.initialize(stageData);
      
      // ユニットを作成（NPCユニットを含む）
      const playerUnit = createMockUnit('player-1', 'Player 1', 'player');
      const npcUnit1 = createMockUnit('npc-1', 'Recruited NPC 1', 'npc');
      const npcUnit2 = createMockUnit('npc-2', 'Recruited NPC 2', 'npc');
      const allUnits = [playerUnit, npcUnit1, npcUnit2];
      
      // ゲーム状態を作成
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };
      
      // ステージクリア処理を実行
      const result = await victorySystem.handleStageComplete(gameState, allUnits);
      
      // RecruitmentSystemのcompleteRecruitmentが呼ばれたことを確認
      expect(mockRecruitmentSystem.completeRecruitment).toHaveBeenCalledWith(allUnits);
      
      // 仲間化報酬が計算されていることを確認
      expect(result.rewards.recruitmentRewards).toBeDefined();
      expect(result.rewards.recruitmentRewards.length).toBe(2);
      
      // パフォーマンスデータに仲間化成功数が記録されていることを確認
      expect(result.performance.recruitmentSuccesses).toBe(2);
    });

    test('RecruitmentSystemが設定されていない場合でもエラーにならない', async () => {
      // RecruitmentSystemを設定しない
      const victorySystemWithoutRecruitment = new VictoryConditionSystem(mockScene);
      
      const stageData = {
        id: 'test-stage-2',
        name: 'Test Stage 2',
        description: 'Test stage without recruitment',
        objectives: [
          {
            id: 'obj-1',
            type: ObjectiveType.DEFEAT_ALL_ENEMIES,
            description: 'Defeat all enemies',
            isRequired: true,
            isComplete: false,
            progress: { current: 0, target: 1, percentage: 0 },
          },
        ],
        victoryConditions: [
          {
            id: 'victory-1',
            type: 'defeat_all_enemies' as any,
            description: 'Defeat all enemies',
            isRequired: true,
            evaluate: () => true,
          },
        ],
        defeatConditions: [],
        bosses: [],
        baseExperienceReward: 100,
        targetTurns: 10,
        maxTurns: 20,
      };
      
      victorySystemWithoutRecruitment.initialize(stageData);
      
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };
      
      // エラーなく完了することを確認
      const result = await victorySystemWithoutRecruitment.handleStageComplete(gameState, []);
      
      expect(result).toBeDefined();
      expect(result.performance.recruitmentSuccesses).toBe(0);
    });
  });

  describe('要件8.2: 仲間化成功キャラクターの完了処理', () => {
    test('仲間化報酬処理で完了処理が実行される', async () => {
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [
          {
            characterId: 'npc-1',
            characterName: 'Recruited Character 1',
            recruitmentBonus: 50,
          },
          {
            characterId: 'npc-2',
            characterName: 'Recruited Character 2',
            recruitmentBonus: 50,
          },
        ],
        clearRatingBonus: {
          rating: 'A' as any,
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };
      
      const result = await rewardDistributor.processRecruitmentRewards(rewards);
      
      // 処理が成功したことを確認
      expect(result.success).toBe(true);
      expect(result.processedCharacters).toHaveLength(2);
      expect(result.processedCharacters).toContain('npc-1');
      expect(result.processedCharacters).toContain('npc-2');
      
      // セーブ処理が呼ばれたことを確認
      expect(mockRecruitmentSystem.saveRecruitmentCompletion).toHaveBeenCalled();
    });

    test('仲間化報酬がない場合は成功として扱う', async () => {
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [],
        clearRatingBonus: {
          rating: 'B' as any,
          experienceMultiplier: 1.0,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };
      
      const result = await rewardDistributor.processRecruitmentRewards(rewards);
      
      expect(result.success).toBe(true);
      expect(result.processedCharacters).toHaveLength(0);
    });
  });

  describe('要件8.3: 次ステージでの使用可能状態設定', () => {
    test('仲間化したキャラクターがfaction=playerに設定される', async () => {
      const stageData = {
        id: 'test-stage-3',
        name: 'Test Stage 3',
        description: 'Test stage for faction change',
        objectives: [
          {
            id: 'obj-1',
            type: ObjectiveType.DEFEAT_BOSS,
            description: 'Defeat the boss',
            isRequired: true,
            isComplete: false,
            progress: { current: 0, target: 1, percentage: 0 },
            targetData: { bossId: 'boss-1' },
          },
        ],
        victoryConditions: [
          {
            id: 'victory-1',
            type: 'defeat_boss' as any,
            description: 'Defeat the boss',
            isRequired: true,
            evaluate: () => true,
          },
        ],
        defeatConditions: [],
        bosses: [],
        baseExperienceReward: 100,
        targetTurns: 10,
        maxTurns: 20,
      };
      
      victorySystem.initialize(stageData);
      
      const npcUnit = createMockUnit('npc-1', 'NPC to Recruit', 'npc');
      const allUnits = [npcUnit];
      
      const gameState: GameState = {
        currentTurn: 5,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };
      
      await victorySystem.handleStageComplete(gameState, allUnits);
      
      // completeRecruitmentの戻り値を確認
      const recruitedUnits = mockRecruitmentSystem.completeRecruitment.mock.results[0].value;
      
      expect(recruitedUnits).toBeDefined();
      expect(recruitedUnits.length).toBe(1);
      expect(recruitedUnits[0].unit.faction).toBe('player');
      expect(recruitedUnits[0].unit.hasActed).toBe(false);
      expect(recruitedUnits[0].unit.hasMoved).toBe(false);
    });
  });

  describe('要件8.4: 仲間化報酬の計算と表示', () => {
    test('仲間化ボーナスが記録される', async () => {
      const bonusEventSpy = vi.fn();
      rewardDistributor.on('recruitment_bonus_awarded', bonusEventSpy);
      
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [
          {
            characterId: 'npc-1',
            characterName: 'Recruited Character',
            recruitmentBonus: 75,
          },
        ],
        clearRatingBonus: {
          rating: 'S' as any,
          experienceMultiplier: 1.5,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };
      
      await rewardDistributor.processRecruitmentRewards(rewards);
      
      // ボーナスイベントが発行されたことを確認
      expect(bonusEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          characterId: 'npc-1',
          characterName: 'Recruited Character',
          bonusAmount: 75,
        })
      );
    });

    test('仲間化報酬処理完了イベントが発行される', async () => {
      const completionEventSpy = vi.fn();
      rewardDistributor.on('recruitment_rewards_processed', completionEventSpy);
      
      const rewards: StageRewards = {
        baseExperience: 100,
        bossRewards: [],
        recruitmentRewards: [
          {
            characterId: 'npc-1',
            characterName: 'Character 1',
            recruitmentBonus: 50,
          },
          {
            characterId: 'npc-2',
            characterName: 'Character 2',
            recruitmentBonus: 50,
          },
        ],
        clearRatingBonus: {
          rating: 'A' as any,
          experienceMultiplier: 1.2,
          additionalRewards: [],
        },
        itemRewards: [],
        specialRewards: [],
      };
      
      await rewardDistributor.processRecruitmentRewards(rewards);
      
      // 完了イベントが発行されたことを確認
      expect(completionEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          processedCharacters: ['npc-1', 'npc-2'],
          totalRecruitments: 2,
        })
      );
    });
  });

  describe('統合シナリオ: 完全なステージクリアフロー', () => {
    test('ステージクリアから報酬配布までの完全なフロー', async () => {
      // ステージデータを初期化
      const stageData = {
        id: 'integration-stage',
        name: 'Integration Test Stage',
        description: 'Full integration test',
        objectives: [
          {
            id: 'obj-1',
            type: ObjectiveType.DEFEAT_BOSS,
            description: 'Defeat the boss',
            isRequired: true,
            isComplete: false,
            progress: { current: 0, target: 1, percentage: 0 },
            targetData: { bossId: 'boss-1' },
          },
        ],
        victoryConditions: [
          {
            id: 'victory-1',
            type: 'defeat_boss' as any,
            description: 'Defeat the boss',
            isRequired: true,
            evaluate: () => true,
          },
        ],
        defeatConditions: [],
        bosses: [],
        baseExperienceReward: 200,
        targetTurns: 10,
        maxTurns: 20,
      };
      
      victorySystem.initialize(stageData);
      
      // ユニットを作成
      const playerUnit = createMockUnit('player-1', 'Hero', 'player');
      const npcUnit1 = createMockUnit('npc-1', 'Recruited Ally 1', 'npc');
      const npcUnit2 = createMockUnit('npc-2', 'Recruited Ally 2', 'npc');
      const allUnits = [playerUnit, npcUnit1, npcUnit2];
      
      const gameState: GameState = {
        currentTurn: 8,
        activePlayer: 'player',
        phase: 'select',
        gameResult: null,
        turnOrder: [],
        activeUnitIndex: 0,
      };
      
      // ステージクリア処理
      const stageResult = await victorySystem.handleStageComplete(gameState, allUnits);
      
      // ステージクリア結果を確認
      expect(stageResult.stageId).toBe('integration-stage');
      expect(stageResult.performance.recruitmentSuccesses).toBe(2);
      expect(stageResult.rewards.recruitmentRewards.length).toBe(2);
      
      // 報酬配布処理
      const distributionResult = await rewardDistributor.processRecruitmentRewards(
        stageResult.rewards
      );
      
      // 報酬配布結果を確認
      expect(distributionResult.success).toBe(true);
      expect(distributionResult.processedCharacters).toHaveLength(2);
      
      // RecruitmentSystemのメソッドが正しく呼ばれたことを確認
      expect(mockRecruitmentSystem.completeRecruitment).toHaveBeenCalledTimes(1);
      expect(mockRecruitmentSystem.saveRecruitmentCompletion).toHaveBeenCalled();
    });
  });
});
