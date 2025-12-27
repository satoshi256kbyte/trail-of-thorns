/**
 * CharacterLossManager統合テスト
 * RewardDistributorとCharacterLossManagerの統合を検証
 * 
 * 要件9.1, 9.2, 9.3, 9.4のテスト
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { RewardDistributor } from '../../game/src/systems/victory/RewardDistributor';
import { CharacterLossManager } from '../../game/src/systems/CharacterLossManager';
import { StageRewards } from '../../game/src/types/reward';
import { Unit } from '../../game/src/types/gameplay';
import { LostCharacter, LossCause, LossCauseType } from '../../game/src/types/characterLoss';

describe('CharacterLossManager Integration with RewardDistributor', () => {
  let rewardDistributor: RewardDistributor;
  let characterLossManager: CharacterLossManager;
  let mockScene: any;
  let mockPlayerUnits: Unit[];
  let mockRewards: StageRewards;

  beforeEach(() => {
    // モックシーンを作成
    mockScene = {
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

    // CharacterLossManagerを初期化
    characterLossManager = new CharacterLossManager(mockScene, {
      enableAutoLossProcessing: true,
      enableDangerWarnings: true,
      enableRecruitmentIntegration: true,
      enableLossLogging: false, // テスト中はログを無効化
    });

    // RewardDistributorを初期化
    rewardDistributor = new RewardDistributor({
      enableExperienceDistribution: false, // ExperienceSystemが設定されていないので無効化
      enableRoseEssenceDistribution: false, // JobSystemが設定されていないので無効化
      enableRecruitmentRewards: false, // RecruitmentSystemが設定されていないので無効化
      enableItemRewards: false, // InventorySystemが設定されていないので無効化
      debugMode: false,
    });

    // CharacterLossManagerをRewardDistributorに設定
    rewardDistributor.setCharacterLossManager(characterLossManager);

    // モックプレイヤーユニットを作成
    mockPlayerUnits = [
      {
        id: 'player-1',
        name: 'テストヒーロー',
        position: { x: 0, y: 0 },
        currentHP: 100,
        stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
        currentMP: 50,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      } as Unit,
      {
        id: 'player-2',
        name: 'テストウォリアー',
        position: { x: 1, y: 0 },
        currentHP: 120,
        stats: { maxHP: 120, maxMP: 30, attack: 25, defense: 20, speed: 8, movement: 3 },
        currentMP: 30,
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      } as Unit,
    ];

    // モック報酬を作成
    mockRewards = {
      baseExperience: 100,
      bossRewards: [],
      recruitmentRewards: [],
      clearRatingBonus: {
        rating: 'A' as any,
        experienceMultiplier: 1.2,
        additionalRewards: [],
      },
      itemRewards: [],
      specialRewards: [],
    };

    // 章を初期化
    characterLossManager.initializeChapter('test-chapter-1', mockPlayerUnits);
  });

  afterEach(() => {
    // クリーンアップ
    rewardDistributor.destroy();
    characterLossManager.destroy();
    
    // localStorageをクリア
    localStorage.clear();
  });

  describe('要件9.1: ステージクリア時のロスト状態取得', () => {
    test('ロストしたキャラクターがいない場合、空の配列を返す', async () => {
      // 報酬を配布
      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      // 検証
      expect(result.success).toBe(true);
      expect(result.details.lostCharacters).toEqual([]);
      expect(result.details.lostCharactersCount).toBe(0);
    });

    test('ロストしたキャラクターがいる場合、ロスト状態を取得する', async () => {
      // キャラクターをロストさせる
      const lostUnit = mockPlayerUnits[0];
      const lossCause: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵の攻撃により撃破',
        sourceId: 'enemy-1',
        sourceName: 'テスト敵',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(lostUnit, lossCause);

      // 報酬を配布
      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      // 検証
      expect(result.success).toBe(true);
      expect(result.details.lostCharacters).toContain('player-1');
      expect(result.details.lostCharactersCount).toBe(1);
    });

    test('複数のキャラクターがロストした場合、すべてのロスト状態を取得する', async () => {
      // 複数のキャラクターをロストさせる
      const lossCause1: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵1の攻撃により撃破',
        sourceId: 'enemy-1',
        sourceName: 'テスト敵1',
        timestamp: Date.now(),
      };

      const lossCause2: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵2の攻撃により撃破',
        sourceId: 'enemy-2',
        sourceName: 'テスト敵2',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(mockPlayerUnits[0], lossCause1);
      await characterLossManager.processCharacterLoss(mockPlayerUnits[1], lossCause2);

      // 報酬を配布
      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      // 検証
      expect(result.success).toBe(true);
      expect(result.details.lostCharacters).toContain('player-1');
      expect(result.details.lostCharacters).toContain('player-2');
      expect(result.details.lostCharactersCount).toBe(2);
    });
  });

  describe('要件9.2: ロスト状態の報酬画面表示', () => {
    test('ロスト状態取得イベントが発行される', async () => {
      // イベントリスナーを設定
      const eventSpy = vi.fn();
      rewardDistributor.on('character_loss_state_retrieved', eventSpy);

      // キャラクターをロストさせる
      const lostUnit = mockPlayerUnits[0];
      const lossCause: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵の攻撃により撃破',
        sourceId: 'enemy-1',
        sourceName: 'テスト敵',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(lostUnit, lossCause);

      // 報酬を配布
      await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      // 検証
      expect(eventSpy).toHaveBeenCalled();
      const eventData = eventSpy.mock.calls[0][0];
      expect(eventData.lostCount).toBe(1);
      expect(eventData.lostCharacterIds).toContain('player-1');
      expect(eventData.lostCharacters).toHaveLength(1);
    });

    test('RewardUIが設定されている場合、ロスト情報を表示する', async () => {
      // モックRewardUIを作成
      const mockRewardUI = {
        showLostCharactersInfo: vi.fn(),
      };

      rewardDistributor.setRewardUI(mockRewardUI);

      // キャラクターをロストさせる
      const lostUnit = mockPlayerUnits[0];
      const lossCause: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵の攻撃により撃破',
        sourceId: 'enemy-1',
        sourceName: 'テスト敵',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(lostUnit, lossCause);

      // 報酬を配布
      await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      // 検証
      expect(mockRewardUI.showLostCharactersInfo).toHaveBeenCalled();
      const lostCharacters = mockRewardUI.showLostCharactersInfo.mock.calls[0][0];
      expect(lostCharacters).toHaveLength(1);
      expect(lostCharacters[0].characterId).toBe('player-1');
    });
  });

  describe('要件9.3: 次ステージへのロスト状態引き継ぎ', () => {
    test('ステージクリア時にロスト状態が保存される', async () => {
      // キャラクターをロストさせる
      const lostUnit = mockPlayerUnits[0];
      const lossCause: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵の攻撃により撃破',
        sourceId: 'enemy-1',
        sourceName: 'テスト敵',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(lostUnit, lossCause);

      // 報酬を配布（内部でsaveChapterStateが呼ばれる）
      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      // 検証: ロスト状態が保存されていることを確認
      expect(result.success).toBe(true);
      
      // localStorageに保存されていることを確認
      const storageKey = 'character_loss_test-chapter-1';
      const savedData = localStorage.getItem(storageKey);
      expect(savedData).not.toBeNull();

      if (savedData) {
        const parsedData = JSON.parse(savedData);
        expect(parsedData.lostCharacters).toBeDefined();
        expect(Object.keys(parsedData.lostCharacters)).toContain('player-1');
      }
    });

    test('保存されたロスト状態を次ステージで読み込める', async () => {
      // キャラクターをロストさせる
      const lostUnit = mockPlayerUnits[0];
      const lossCause: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵の攻撃により撃破',
        sourceId: 'enemy-1',
        sourceName: 'テスト敵',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(lostUnit, lossCause);

      // 報酬を配布して保存
      await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      // 新しいCharacterLossManagerを作成して状態を読み込む
      const newCharacterLossManager = new CharacterLossManager(mockScene, {
        enableAutoLossProcessing: true,
        enableLossLogging: false,
      });

      const loadResult = newCharacterLossManager.loadChapterState('test-chapter-1');

      // 検証
      expect(loadResult.success).toBe(true);
      expect(newCharacterLossManager.isCharacterLost('player-1')).toBe(true);
      expect(newCharacterLossManager.isCharacterLost('player-2')).toBe(false);

      // クリーンアップ
      newCharacterLossManager.destroy();
    });
  });

  describe('要件9.4: 敗北条件判定時のロスト状態考慮', () => {
    test('全プレイヤーキャラクターがロストした場合、ゲームオーバー状態を検出する', async () => {
      // すべてのプレイヤーキャラクターをロストさせる
      const lossCause1: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵1の攻撃により撃破',
        sourceId: 'enemy-1',
        sourceName: 'テスト敵1',
        timestamp: Date.now(),
      };

      const lossCause2: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵2の攻撃により撃破',
        sourceId: 'enemy-2',
        sourceName: 'テスト敵2',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(mockPlayerUnits[0], lossCause1);
      await characterLossManager.processCharacterLoss(mockPlayerUnits[1], lossCause2);

      // ゲームオーバー状態を確認
      expect(characterLossManager.isGameOver()).toBe(true);

      const gameOverInfo = characterLossManager.getGameOverInfo();
      expect(gameOverInfo).not.toBeNull();
      expect(gameOverInfo?.reason).toBe('all_characters_lost');
      expect(gameOverInfo?.totalLosses).toBe(2);
    });

    test('一部のキャラクターがロストした場合、ゲームオーバーではない', async () => {
      // 1人だけロストさせる
      const lossCause: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵の攻撃により撃破',
        sourceId: 'enemy-1',
        sourceName: 'テスト敵',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(mockPlayerUnits[0], lossCause);

      // ゲームオーバー状態を確認
      expect(characterLossManager.isGameOver()).toBe(false);
      expect(characterLossManager.getGameOverInfo()).toBeNull();
    });

    test('ロスト状態を考慮したパーティ編成検証', async () => {
      // キャラクターをロストさせる
      const lostUnit = mockPlayerUnits[0];
      const lossCause: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵の攻撃により撃破',
        sourceId: 'enemy-1',
        sourceName: 'テスト敵',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(lostUnit, lossCause);

      // パーティ編成を検証
      const validationResult = characterLossManager.validatePartyComposition(['player-1', 'player-2']);

      // 検証
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0].characterId).toBe('player-1');
      expect(validationResult.errors[0].type).toBe('lost_character');
    });
  });

  describe('エラーハンドリング', () => {
    test('CharacterLossManagerが設定されていない場合でもエラーにならない', async () => {
      // CharacterLossManagerを設定しないRewardDistributorを作成
      const distributorWithoutLossManager = new RewardDistributor({
        enableExperienceDistribution: false,
        enableRoseEssenceDistribution: false,
        enableRecruitmentRewards: false,
        enableItemRewards: false,
        debugMode: false,
      });

      // 報酬を配布
      const result = await distributorWithoutLossManager.distributeRewards(mockRewards, mockPlayerUnits);

      // 検証
      expect(result.success).toBe(true);
      expect(result.details.lostCharacters).toEqual([]);
      expect(result.details.lostCharactersCount).toBe(0);

      // クリーンアップ
      distributorWithoutLossManager.destroy();
    });

    test('ロスト状態の保存に失敗してもエラーを記録して続行する', async () => {
      // saveChapterStateが失敗するようにモック
      const originalSaveChapterState = characterLossManager.saveChapterState.bind(characterLossManager);
      characterLossManager.saveChapterState = vi.fn().mockReturnValue({
        success: false,
        message: 'Test save failure',
      });

      // キャラクターをロストさせる
      const lostUnit = mockPlayerUnits[0];
      const lossCause: LossCause = {
        type: LossCauseType.BATTLE_DEFEAT,
        description: 'テスト敵の攻撃により撃破',
        sourceId: 'enemy-1',
        sourceName: 'テスト敵',
        timestamp: Date.now(),
      };

      await characterLossManager.processCharacterLoss(lostUnit, lossCause);

      // 報酬を配布
      const result = await rewardDistributor.distributeRewards(mockRewards, mockPlayerUnits);

      // 検証: エラーが記録されているが、処理は続行される
      expect(result.details.lostCharacters).toContain('player-1');
      expect(result.details.lostCharactersCount).toBe(1);

      // モックを元に戻す
      characterLossManager.saveChapterState = originalSaveChapterState;
    });
  });
});
