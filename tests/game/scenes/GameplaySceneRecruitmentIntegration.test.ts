/**
 * GameplayScene Recruitment Integration Tests
 *
 * Tests the integration of the recruitment system with GameplayScene,
 * including character selection, battle integration, and stage completion.
 */

import { GameplayScene } from '../../../game/src/scenes/GameplayScene';
import { Unit, StageData } from '../../../game/src/types/gameplay';
import { RecruitmentResult, RecruitmentStatus } from '../../../game/src/types/recruitment';
import { BattleResult } from '../../../game/src/types/battle';

// Mock Phaser
const mockScene = {
  add: {
    container: jest.fn(() => ({
      add: jest.fn(),
      setScrollFactor: jest.fn(() => ({ setDepth: jest.fn(() => ({ setVisible: jest.fn() })) })),
      setDepth: jest.fn(() => ({ setVisible: jest.fn() })),
      setVisible: jest.fn(),
      destroy: jest.fn(),
    })),
    graphics: jest.fn(() => ({
      fillStyle: jest.fn(() => ({
        fillRoundedRect: jest.fn(() => ({
          lineStyle: jest.fn(() => ({ strokeRoundedRect: jest.fn() })),
        })),
      })),
      clear: jest.fn(() => ({ fillStyle: jest.fn(() => ({ fillRoundedRect: jest.fn() })) })),
    })),
    text: jest.fn(() => ({
      setOrigin: jest.fn(() => ({ setColor: jest.fn() })),
      setText: jest.fn(),
      setColor: jest.fn(),
      destroy: jest.fn(),
    })),
  },
  cameras: {
    main: {
      width: 1024,
      height: 768,
      scrollX: 0,
      scrollY: 0,
      zoom: 1,
    },
  },
  events: {
    on: jest.fn(),
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  time: {
    delayedCall: jest.fn(),
  },
  tweens: {
    add: jest.fn(),
  },
  load: {
    json: jest.fn(),
    on: jest.fn(),
  },
  cache: {
    json: {
      get: jest.fn(() => ({
        width: 12,
        height: 8,
        tileSize: 32,
        tiles: Array(8)
          .fill(null)
          .map(() => Array(12).fill({ type: 'grass', movementCost: 1 })),
      })),
    },
  },
  data: {
    set: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn(),
  },
  input: {
    keyboard: {
      addKey: jest.fn(() => ({ once: jest.fn() })),
    },
  },
};

// Mock the required managers
jest.mock('../../../game/src/systems/GameStateManager');
jest.mock('../../../game/src/systems/CameraController');
jest.mock('../../../game/src/ui/UIManager');
jest.mock('../../../game/src/input/InputHandler');
jest.mock('../../../game/src/rendering/MapRenderer');
jest.mock('../../../game/src/systems/CharacterManager');
jest.mock('../../../game/src/debug/DebugManager');
jest.mock('../../../game/src/systems/MovementSystem');
jest.mock('../../../game/src/systems/BattleSystem');
jest.mock('../../../game/src/systems/recruitment/RecruitmentSystem');
jest.mock('../../../game/src/systems/recruitment/RecruitmentUI');

describe('GameplayScene Recruitment Integration', () => {
  let gameplayScene: GameplayScene;
  let mockStageData: StageData;
  let mockPlayerUnit: Unit;
  let mockEnemyUnit: Unit;

  beforeEach(() => {
    // Create mock units
    mockPlayerUnit = {
      id: 'player-1',
      name: 'Hero',
      position: { x: 1, y: 6 },
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 25,
        defense: 15,
        speed: 12,
        movement: 3,
      },
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    mockEnemyUnit = {
      id: 'enemy-1',
      name: 'Orc Warrior',
      position: { x: 9, y: 1 },
      stats: {
        maxHP: 90,
        maxMP: 20,
        attack: 20,
        defense: 12,
        speed: 8,
        movement: 2,
      },
      currentHP: 90,
      currentMP: 20,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
      metadata: {
        recruitment: {
          conditions: [
            {
              id: 'specific_attacker',
              type: 'specific_attacker',
              description: '主人公で攻撃して撃破する',
              parameters: {
                attackerId: 'player-1',
              },
            },
          ],
          priority: 80,
          description: 'オークの戦士を仲間にする',
          rewards: [],
        },
      },
    };

    // Create mock stage data
    mockStageData = {
      id: 'test-stage',
      name: 'Test Stage',
      description: 'A test stage for recruitment',
      mapData: {
        width: 12,
        height: 8,
        tileSize: 32,
        tiles: Array(8)
          .fill(null)
          .map(() => Array(12).fill({ type: 'grass', movementCost: 1 })),
      },
      playerUnits: [mockPlayerUnit],
      enemyUnits: [mockEnemyUnit],
      victoryConditions: [
        {
          type: 'defeat_all',
          description: 'Defeat all enemy units',
        },
      ],
    };

    // Create GameplayScene instance
    gameplayScene = new GameplayScene();

    // Mock the scene property
    (gameplayScene as any).scene = mockScene;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Recruitment System Initialization', () => {
    test('should initialize recruitment system with stage data', () => {
      // Mock the recruitment system
      const mockRecruitmentSystem = {
        initialize: jest.fn(() => ({
          success: true,
          message: 'Recruitment system initialized with 1 recruitable characters',
        })),
        getRecruitmentConditions: jest.fn(() => []),
        isNPC: jest.fn(() => false),
      };

      // Mock the character manager
      const mockCharacterManager = {
        loadCharacters: jest.fn(() => ({ success: true })),
        updateCharacterPosition: jest.fn(),
        updateCharacterFaction: jest.fn(),
      };

      // Mock other required managers
      const mockDebugManager = {
        setCharacters: jest.fn(),
      };

      const mockMovementSystem = {
        updateUnits: jest.fn(),
      };

      const mockBattleSystem = {
        initialize: jest.fn(),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;
      (gameplayScene as any).characterManager = mockCharacterManager;
      (gameplayScene as any).debugManager = mockDebugManager;
      (gameplayScene as any).movementSystem = mockMovementSystem;
      (gameplayScene as any).battleSystem = mockBattleSystem;

      // Call the private method to setup characters
      (gameplayScene as any).stageData = mockStageData;
      (gameplayScene as any).setupCharacters();

      // Verify recruitment system was initialized
      expect(mockRecruitmentSystem.initialize).toHaveBeenCalledWith(mockStageData);
    });

    test('should handle recruitment system initialization failure gracefully', () => {
      const mockRecruitmentSystem = {
        initialize: jest.fn(() => ({
          success: false,
          message: 'Failed to initialize recruitment system',
        })),
        getRecruitmentConditions: jest.fn(() => []),
        isNPC: jest.fn(() => false),
      };

      // Mock the character manager
      const mockCharacterManager = {
        loadCharacters: jest.fn(() => ({ success: true })),
        updateCharacterPosition: jest.fn(),
        updateCharacterFaction: jest.fn(),
      };

      // Mock other required managers
      const mockDebugManager = {
        setCharacters: jest.fn(),
      };

      const mockMovementSystem = {
        updateUnits: jest.fn(),
      };

      const mockBattleSystem = {
        initialize: jest.fn(),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;
      (gameplayScene as any).characterManager = mockCharacterManager;
      (gameplayScene as any).debugManager = mockDebugManager;
      (gameplayScene as any).movementSystem = mockMovementSystem;
      (gameplayScene as any).battleSystem = mockBattleSystem;

      // Mock console.warn to verify warning is logged
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      (gameplayScene as any).stageData = mockStageData;
      (gameplayScene as any).setupCharacters();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize recruitment system:',
        'Failed to initialize recruitment system'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Character Selection with Recruitment', () => {
    test('should show recruitment conditions when selecting recruitable enemy', () => {
      const mockRecruitmentSystem = {
        getRecruitmentConditions: jest.fn(() => [
          {
            id: 'specific_attacker',
            type: 'specific_attacker',
            description: '主人公で攻撃して撃破する',
            parameters: { attackerId: 'player-1' },
          },
        ]),
        getRecruitmentProgress: jest.fn(() => ({
          characterId: 'enemy-1',
          conditions: [],
          conditionProgress: [false],
          overallProgress: 0,
          isEligible: false,
        })),
        isNPC: jest.fn(() => false),
      };

      const mockRecruitmentUI = {
        showRecruitmentConditions: jest.fn(),
        updateRecruitmentProgress: jest.fn(),
      };

      const mockGameStateManager = {
        getSelectedUnit: jest.fn(() => mockPlayerUnit),
        getCurrentTurn: jest.fn(() => 1),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;
      (gameplayScene as any).recruitmentUI = mockRecruitmentUI;
      (gameplayScene as any).gameStateManager = mockGameStateManager;

      // Call the method to show recruitment conditions
      (gameplayScene as any).showRecruitmentConditionsIfApplicable(mockEnemyUnit);

      // Verify recruitment conditions were shown
      expect(mockRecruitmentSystem.getRecruitmentConditions).toHaveBeenCalledWith(mockEnemyUnit);
      expect(mockRecruitmentUI.showRecruitmentConditions).toHaveBeenCalledWith(
        mockEnemyUnit,
        expect.any(Array)
      );
      expect(mockRecruitmentUI.updateRecruitmentProgress).toHaveBeenCalled();
    });

    test('should not show recruitment conditions for player units', () => {
      const mockRecruitmentSystem = {
        getRecruitmentConditions: jest.fn(() => []),
        isNPC: jest.fn(() => false),
      };

      const mockRecruitmentUI = {
        showRecruitmentConditions: jest.fn(),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;
      (gameplayScene as any).recruitmentUI = mockRecruitmentUI;

      // Call with player unit
      (gameplayScene as any).showRecruitmentConditionsIfApplicable(mockPlayerUnit);

      // Verify no recruitment conditions were shown
      expect(mockRecruitmentUI.showRecruitmentConditions).not.toHaveBeenCalled();
    });

    test('should not show recruitment conditions for non-recruitable enemies', () => {
      const mockRecruitmentSystem = {
        getRecruitmentConditions: jest.fn(() => []), // No conditions = not recruitable
        isNPC: jest.fn(() => false),
      };

      const mockRecruitmentUI = {
        showRecruitmentConditions: jest.fn(),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;
      (gameplayScene as any).recruitmentUI = mockRecruitmentUI;

      // Call with enemy unit that has no recruitment conditions
      (gameplayScene as any).showRecruitmentConditionsIfApplicable(mockEnemyUnit);

      // Verify no recruitment conditions were shown
      expect(mockRecruitmentUI.showRecruitmentConditions).not.toHaveBeenCalled();
    });
  });

  describe('Battle Integration with Recruitment', () => {
    test('should process recruitment attempt when enemy is defeated', () => {
      const mockBattleResult: BattleResult = {
        attacker: mockPlayerUnit,
        target: mockEnemyUnit,
        finalDamage: 90,
        isCritical: false,
        isEvaded: false,
        targetDefeated: true,
        experienceGained: 50,
        levelUp: false,
      };

      const mockRecruitmentResult: RecruitmentResult = {
        success: true,
        conditionsMet: [true],
        nextAction: 'convert_to_npc' as any,
        message: 'Recruitment successful',
      };

      const mockRecruitmentSystem = {
        getRecruitmentConditions: jest.fn(() => [
          {
            id: 'specific_attacker',
            type: 'specific_attacker',
            description: '主人公で攻撃して撃破する',
            parameters: { attackerId: 'player-1' },
          },
        ]),
        processRecruitmentAttempt: jest.fn(() => mockRecruitmentResult),
        isNPC: jest.fn(() => false),
      };

      const mockGameStateManager = {
        getCurrentTurn: jest.fn(() => 1),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;
      (gameplayScene as any).gameStateManager = mockGameStateManager;

      // Call the recruitment processing method
      const result = (gameplayScene as any).processRecruitmentAttempt(
        mockPlayerUnit,
        mockEnemyUnit,
        90,
        mockBattleResult
      );

      // Verify recruitment attempt was processed
      expect(mockRecruitmentSystem.processRecruitmentAttempt).toHaveBeenCalledWith(
        mockPlayerUnit,
        mockEnemyUnit,
        90,
        mockBattleResult,
        1
      );
      expect(result).toEqual(mockRecruitmentResult);
    });

    test('should not process recruitment for player units', () => {
      const mockBattleResult: BattleResult = {
        attacker: mockEnemyUnit,
        target: mockPlayerUnit,
        finalDamage: 50,
        isCritical: false,
        isEvaded: false,
        targetDefeated: true,
        experienceGained: 0,
        levelUp: false,
      };

      const mockRecruitmentSystem = {
        processRecruitmentAttempt: jest.fn(),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;

      // Call with player unit as target
      const result = (gameplayScene as any).processRecruitmentAttempt(
        mockEnemyUnit,
        mockPlayerUnit,
        50,
        mockBattleResult
      );

      // Verify no recruitment attempt was made
      expect(mockRecruitmentSystem.processRecruitmentAttempt).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test('should not process recruitment for non-recruitable enemies', () => {
      const mockBattleResult: BattleResult = {
        attacker: mockPlayerUnit,
        target: mockEnemyUnit,
        finalDamage: 90,
        isCritical: false,
        isEvaded: false,
        targetDefeated: true,
        experienceGained: 50,
        levelUp: false,
      };

      const mockRecruitmentSystem = {
        getRecruitmentConditions: jest.fn(() => []), // No conditions = not recruitable
        processRecruitmentAttempt: jest.fn(),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;

      // Call with non-recruitable enemy
      const result = (gameplayScene as any).processRecruitmentAttempt(
        mockPlayerUnit,
        mockEnemyUnit,
        90,
        mockBattleResult
      );

      // Verify no recruitment attempt was made
      expect(mockRecruitmentSystem.processRecruitmentAttempt).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('NPC State Management', () => {
    test('should prevent control of NPC units', () => {
      const mockNPCUnit = { ...mockEnemyUnit, id: 'npc-1' };

      const mockRecruitmentSystem = {
        isNPC: jest.fn(() => true),
      };

      const mockUIManager = {
        showNotification: jest.fn(),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;
      (gameplayScene as any).uiManager = mockUIManager;

      // Check if unit can be controlled
      const canControl = (gameplayScene as any).canControlUnit(mockNPCUnit);

      // Verify NPC cannot be controlled
      expect(canControl).toBe(false);
      expect(mockRecruitmentSystem.isNPC).toHaveBeenCalledWith(mockNPCUnit);
      expect(mockUIManager.showNotification).toHaveBeenCalledWith({
        message: `${mockNPCUnit.name} is in NPC state and cannot act`,
        type: 'info',
        duration: 2000,
      });
    });

    test('should allow control of non-NPC units', () => {
      const mockRecruitmentSystem = {
        isNPC: jest.fn(() => false),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;

      // Check if unit can be controlled
      const canControl = (gameplayScene as any).canControlUnit(mockPlayerUnit);

      // Verify unit can be controlled
      expect(canControl).toBe(true);
      expect(mockRecruitmentSystem.isNPC).toHaveBeenCalledWith(mockPlayerUnit);
    });
  });

  describe('Stage Completion with Recruitment', () => {
    test('should complete recruitment when stage is cleared', () => {
      const mockRecruitedUnits = [{ ...mockEnemyUnit, faction: 'player' as const }];

      // Create stage data with no living enemies (all converted to NPCs)
      const mockStageDataWithNPCs = {
        ...mockStageData,
        enemyUnits: [{ ...mockEnemyUnit, currentHP: 90 }], // Enemy is alive but will be NPC
      };

      const mockRecruitmentSystem = {
        completeRecruitment: jest.fn(() =>
          mockRecruitedUnits.map(unit => ({
            unit,
            recruitmentId: 'recruit-1',
            recruitedAt: Date.now(),
            conditions: [],
          }))
        ),
        isNPC: jest.fn(() => true), // All enemies are NPCs
      };

      const mockGameStateManager = {
        setGameResult: jest.fn(),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;
      (gameplayScene as any).gameStateManager = mockGameStateManager;
      (gameplayScene as any).stageData = mockStageDataWithNPCs;

      // Mock console.log to avoid output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Call stage completion check
      (gameplayScene as any).checkStageCompletionWithRecruitment();

      // Verify recruitment completion was called
      expect(mockRecruitmentSystem.completeRecruitment).toHaveBeenCalledWith([
        ...mockStageDataWithNPCs.playerUnits,
        ...mockStageDataWithNPCs.enemyUnits,
      ]);
      expect(mockGameStateManager.setGameResult).toHaveBeenCalledWith('victory');

      consoleSpy.mockRestore();
    });

    test('should handle recruitment completion with recruited units', () => {
      const mockRecruitedUnits = [{ ...mockEnemyUnit, faction: 'player' as const }];
      const mockFailedUnits = ['enemy-2'];

      const mockCharacterManager = {
        updateCharacterFaction: jest.fn(),
      };

      const mockRecruitmentUI = {
        hideNPCIndicator: jest.fn(),
      };

      const mockUIManager = {
        showNotification: jest.fn(),
      };

      (gameplayScene as any).characterManager = mockCharacterManager;
      (gameplayScene as any).recruitmentUI = mockRecruitmentUI;
      (gameplayScene as any).uiManager = mockUIManager;
      (gameplayScene as any).stageData = mockStageData;

      // Call recruitment completion handler
      (gameplayScene as any).handleStageRecruitmentCompletion(mockRecruitedUnits, mockFailedUnits);

      // Verify recruited units were added to player units
      expect(mockStageData.playerUnits).toContain(mockRecruitedUnits[0]);
      expect(mockCharacterManager.updateCharacterFaction).toHaveBeenCalledWith(
        mockRecruitedUnits[0].id,
        'player'
      );
      expect(mockUIManager.showNotification).toHaveBeenCalledWith({
        message: '1 character(s) recruited!',
        type: 'success',
        duration: 3000,
      });
    });
  });

  describe('Victory Conditions with NPCs', () => {
    test('should consider NPCs when checking victory conditions', () => {
      const mockNPCUnit = { ...mockEnemyUnit, id: 'npc-1' };
      const mockStageDataWithNPC = {
        ...mockStageData,
        enemyUnits: [mockNPCUnit],
      };

      const mockRecruitmentSystem = {
        isNPC: jest.fn(unit => unit.id === 'npc-1'),
        completeRecruitment: jest.fn(() => []),
      };

      const mockGameStateManager = {
        setGameResult: jest.fn(),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;
      (gameplayScene as any).gameStateManager = mockGameStateManager;
      (gameplayScene as any).stageData = mockStageDataWithNPC;

      // Call victory condition check
      (gameplayScene as any).checkGameEndConditions();

      // Verify victory was triggered (NPC doesn't count as enemy)
      expect(mockGameStateManager.setGameResult).toHaveBeenCalledWith('victory');
    });

    test('should not trigger victory if non-NPC enemies remain', () => {
      const mockRecruitmentSystem = {
        isNPC: jest.fn(() => false),
      };

      const mockGameStateManager = {
        setGameResult: jest.fn(),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;
      (gameplayScene as any).gameStateManager = mockGameStateManager;
      (gameplayScene as any).stageData = mockStageData;

      // Call victory condition check
      (gameplayScene as any).checkGameEndConditions();

      // Verify victory was not triggered (enemy still alive)
      expect(mockGameStateManager.setGameResult).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle recruitment system errors gracefully', () => {
      const mockRecruitmentSystem = {
        getRecruitmentConditions: jest.fn(() => {
          throw new Error('Recruitment system error');
        }),
        isNPC: jest.fn(() => false),
      };

      (gameplayScene as any).recruitmentSystem = mockRecruitmentSystem;

      // Mock console.error to verify error is logged
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Call method that should handle error
      (gameplayScene as any).showRecruitmentConditionsIfApplicable(mockEnemyUnit);

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error showing recruitment conditions:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should provide user-friendly error messages', () => {
      const testCases = [
        { error: 'INVALID_TARGET', expected: 'このキャラクターは仲間にできません' },
        { error: 'CONDITIONS_NOT_MET', expected: '仲間化条件を満たしていません' },
        { error: 'NPC_ALREADY_DEFEATED', expected: 'NPCが撃破されました' },
        { error: 'SYSTEM_ERROR', expected: 'システムエラーが発生しました' },
        { error: 'UNKNOWN_ERROR', expected: '仲間化に失敗しました' },
      ];

      testCases.forEach(({ error, expected }) => {
        const result = (gameplayScene as any).getRecruitmentErrorMessage(error);
        expect(result).toBe(expected);
      });
    });
  });
});
