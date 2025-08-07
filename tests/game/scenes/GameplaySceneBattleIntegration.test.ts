/**
 * GameplayScene Battle Integration Tests
 *
 * Tests the integration of the battle system with GameplayScene,
 * including input processing, UI updates, and turn management.
 */

import { GameplayScene } from '../../../game/src/scenes/GameplayScene';
import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { GameStateManager } from '../../../game/src/systems/GameStateManager';
import { UIManager } from '../../../game/src/ui/UIManager';
import { InputHandler } from '../../../game/src/input/InputHandler';
import { Unit, StageData, MapData } from '../../../game/src/types/gameplay';
import { BattleResult } from '../../../game/src/types/battle';

// Mock Phaser
const mockScene = {
  add: {
    graphics: jest.fn(() => ({
      fillStyle: jest.fn().mockReturnThis(),
      fillRect: jest.fn().mockReturnThis(),
      lineStyle: jest.fn().mockReturnThis(),
      strokeRect: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
    })),
    text: jest.fn(() => ({
      setOrigin: jest.fn().mockReturnThis(),
      setText: jest.fn().mockReturnThis(),
      setColor: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
    })),
    container: jest.fn(() => ({
      add: jest.fn(),
      setVisible: jest.fn(),
      setScrollFactor: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
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
    emit: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  input: {
    on: jest.fn(),
    off: jest.fn(),
    keyboard: {
      on: jest.fn(),
      off: jest.fn(),
    },
  },
  time: {
    delayedCall: jest.fn(),
  },
  tweens: {
    add: jest.fn(),
  },
  data: {
    set: jest.fn(),
    get: jest.fn(),
    removeAll: jest.fn(),
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
  load: {
    json: jest.fn(),
    on: jest.fn(),
  },
} as any;

describe('GameplayScene Battle Integration', () => {
  let gameplayScene: GameplayScene;
  let mockBattleSystem: jest.Mocked<BattleSystem>;
  let mockGameStateManager: jest.Mocked<GameStateManager>;
  let mockUIManager: jest.Mocked<UIManager>;
  let mockInputHandler: jest.Mocked<InputHandler>;

  const createMockUnit = (
    id: string,
    faction: 'player' | 'enemy',
    position = { x: 1, y: 1 }
  ): Unit => ({
    id,
    name: `Test ${id}`,
    position,
    stats: {
      maxHP: 100,
      maxMP: 50,
      attack: 20,
      defense: 15,
      speed: 10,
      movement: 3,
    },
    currentHP: 100,
    currentMP: 50,
    faction,
    hasActed: false,
    hasMoved: false,
  });

  const createMockStageData = (): StageData => ({
    id: 'test-stage',
    name: 'Test Stage',
    description: 'Test stage for battle integration',
    mapData: {
      width: 12,
      height: 8,
      tileSize: 32,
      tiles: Array(8)
        .fill(null)
        .map(() => Array(12).fill({ type: 'grass', movementCost: 1 })),
    } as MapData,
    playerUnits: [
      createMockUnit('player-1', 'player', { x: 1, y: 6 }),
      createMockUnit('player-2', 'player', { x: 2, y: 6 }),
    ],
    enemyUnits: [
      createMockUnit('enemy-1', 'enemy', { x: 9, y: 1 }),
      createMockUnit('enemy-2', 'enemy', { x: 10, y: 1 }),
    ],
    victoryConditions: [{ type: 'defeat_all', description: 'Defeat all enemies' }],
  });

  beforeEach(() => {
    // Create mocks
    mockBattleSystem = {
      initialize: jest.fn(),
      initiateAttack: jest.fn(),
      selectTarget: jest.fn(),
      cancelAttack: jest.fn(),
      canAttack: jest.fn(),
      isActive: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn(),
    } as any;

    mockGameStateManager = {
      getSelectedUnit: jest.fn(),
      selectUnit: jest.fn(),
      updateUnit: jest.fn(),
      nextTurn: jest.fn().mockReturnValue({ success: true }),
      isPlayerTurn: jest.fn(),
      setGameResult: jest.fn(),
    } as any;

    mockUIManager = {
      showActionMenu: jest.fn(),
      hideActionMenu: jest.fn(),
      showBattleStatus: jest.fn(),
      hideBattleStatus: jest.fn(),
      showBattleResult: jest.fn(),
      hideBattleResult: jest.fn(),
      showErrorNotification: jest.fn(),
      hideErrorNotification: jest.fn(),
      showDamageNumber: jest.fn(),
      showExperienceGained: jest.fn(),
    } as any;

    mockInputHandler = {
      enable: jest.fn(),
      disable: jest.fn(),
      setCharacterSelectionCallback: jest.fn(),
      setTileSelectionCallback: jest.fn(),
    } as any;

    const mockMovementSystem = {
      canCharacterMove: jest.fn().mockReturnValue(true),
      updateUnits: jest.fn(),
    } as any;

    const mockCharacterManager = {
      updateCharacterPosition: jest.fn(),
    } as any;

    // Create GameplayScene instance
    gameplayScene = new GameplayScene();

    // Inject mocks (this would normally be done through dependency injection)
    (gameplayScene as any).battleSystem = mockBattleSystem;
    (gameplayScene as any).gameStateManager = mockGameStateManager;
    (gameplayScene as any).uiManager = mockUIManager;
    (gameplayScene as any).inputHandler = mockInputHandler;
    (gameplayScene as any).movementSystem = mockMovementSystem;
    (gameplayScene as any).characterManager = mockCharacterManager;
    (gameplayScene as any).stageData = createMockStageData();
    (gameplayScene as any).isInitialized = true;
    (gameplayScene as any).isBattleActive = false;
    (gameplayScene as any).battleInputLocked = false;
    (gameplayScene as any).cameras = mockScene.cameras;
  });

  describe('Action Menu Integration', () => {
    test('should show action menu with attack option for player units', () => {
      const playerUnit = createMockUnit('player-1', 'player');
      mockGameStateManager.isPlayerTurn.mockReturnValue(true);
      mockBattleSystem.canAttack.mockReturnValue(true);

      // Call the private method through reflection
      (gameplayScene as any).showActionMenuForUnit(playerUnit);

      expect(mockUIManager.showActionMenu).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ text: 'Attack', action: 'attack', enabled: true }),
        ])
      );
    });

    test('should disable attack option when unit cannot attack', () => {
      const playerUnit = createMockUnit('player-1', 'player');
      playerUnit.hasActed = true;
      mockGameStateManager.isPlayerTurn.mockReturnValue(true);
      mockBattleSystem.canAttack.mockReturnValue(false);

      (gameplayScene as any).showActionMenuForUnit(playerUnit);

      expect(mockUIManager.showActionMenu).toHaveBeenCalledWith(
        expect.not.arrayContaining([expect.objectContaining({ text: 'Attack', enabled: true })])
      );
    });
  });

  describe('Attack Action Handling', () => {
    test('should initiate attack when attack action is selected', async () => {
      const playerUnit = createMockUnit('player-1', 'player');
      mockGameStateManager.getSelectedUnit.mockReturnValue(playerUnit);
      mockBattleSystem.canAttack.mockReturnValue(true);
      mockBattleSystem.initiateAttack.mockResolvedValue(undefined);

      await (gameplayScene as any).handleAttackAction(playerUnit);

      expect(mockBattleSystem.initiateAttack).toHaveBeenCalledWith(playerUnit);
      expect(mockUIManager.hideActionMenu).toHaveBeenCalled();
      expect(mockUIManager.showBattleStatus).toHaveBeenCalledWith('Select Attack Target');
      expect((gameplayScene as any).isBattleActive).toBe(true);
      expect((gameplayScene as any).battleInputLocked).toBe(true);
    });

    test('should show error when unit cannot attack', async () => {
      const playerUnit = createMockUnit('player-1', 'player');
      mockBattleSystem.canAttack.mockReturnValue(false);

      await (gameplayScene as any).handleAttackAction(playerUnit);

      expect(mockBattleSystem.initiateAttack).not.toHaveBeenCalled();
      expect(mockUIManager.showErrorNotification).toHaveBeenCalledWith({
        message: 'This unit cannot attack',
        type: 'error',
        duration: 2000,
      });
    });

    test('should handle attack initiation failure', async () => {
      const playerUnit = createMockUnit('player-1', 'player');
      mockBattleSystem.canAttack.mockReturnValue(true);
      mockBattleSystem.initiateAttack.mockRejectedValue(new Error('Attack failed'));

      await (gameplayScene as any).handleAttackAction(playerUnit);

      expect(mockUIManager.showErrorNotification).toHaveBeenCalledWith({
        message: 'Failed to initiate attack',
        type: 'error',
        duration: 2000,
      });
      expect((gameplayScene as any).isBattleActive).toBe(false);
      expect((gameplayScene as any).battleInputLocked).toBe(false);
    });
  });

  describe('Battle Target Selection', () => {
    test('should handle target selection during battle', () => {
      const targetUnit = createMockUnit('enemy-1', 'enemy');
      const mockBattleResult: BattleResult = {
        attacker: createMockUnit('player-1', 'player'),
        target: targetUnit,
        weapon: {} as any,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 10,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      (gameplayScene as any).isBattleActive = true;
      mockBattleSystem.isActive.mockReturnValue(true);
      mockBattleSystem.selectTarget.mockResolvedValue(mockBattleResult);

      (gameplayScene as any).handleCharacterSelectionWithBattle(targetUnit, {});

      expect(mockBattleSystem.selectTarget).toHaveBeenCalledWith(targetUnit);
    });

    test('should show error for invalid battle target', async () => {
      const targetUnit = createMockUnit('enemy-1', 'enemy');

      (gameplayScene as any).isBattleActive = true;
      mockBattleSystem.isActive.mockReturnValue(true);
      mockBattleSystem.selectTarget.mockRejectedValue(new Error('Invalid target'));

      await (gameplayScene as any).handleCharacterSelectionWithBattle(targetUnit, {});

      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockUIManager.showErrorNotification).toHaveBeenCalledWith({
        message: 'Invalid target',
        type: 'error',
        duration: 2000,
      });
    });
  });

  describe('Battle Completion', () => {
    test('should handle successful battle completion', () => {
      const attacker = createMockUnit('player-1', 'player');
      const target = createMockUnit('enemy-1', 'enemy');
      const mockBattleResult: BattleResult = {
        attacker,
        target,
        weapon: {} as any,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: true,
        isEvaded: false,
        experienceGained: 15,
        targetDefeated: true,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      const battleCompleteData = { battleResult: mockBattleResult };

      (gameplayScene as any).handleBattleComplete(battleCompleteData);

      expect(mockUIManager.showDamageNumber).toHaveBeenCalled();
      expect(mockUIManager.showExperienceGained).toHaveBeenCalled();
      expect(mockUIManager.showBattleResult).toHaveBeenCalledWith({
        damage: 25,
        isCritical: true,
        isEvaded: false,
        experienceGained: 15,
        targetDefeated: true,
        attacker: attacker.name,
        target: target.name,
      });
      expect(mockGameStateManager.updateUnit).toHaveBeenCalledWith(
        expect.objectContaining({ hasActed: true })
      );
    });

    test('should handle evaded attack', () => {
      const attacker = createMockUnit('player-1', 'player');
      const target = createMockUnit('enemy-1', 'enemy');
      const mockBattleResult: BattleResult = {
        attacker,
        target,
        weapon: {} as any,
        baseDamage: 20,
        finalDamage: 0,
        modifiers: [],
        isCritical: false,
        isEvaded: true,
        experienceGained: 5,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      const battleCompleteData = { battleResult: mockBattleResult };

      (gameplayScene as any).handleBattleComplete(battleCompleteData);

      expect(mockUIManager.showDamageNumber).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        0,
        false,
        false
      );
    });
  });

  describe('Battle Cancellation', () => {
    test('should handle battle cancellation', () => {
      (gameplayScene as any).isBattleActive = true;
      (gameplayScene as any).battleInputLocked = true;

      (gameplayScene as any).handleBattleCancelled({ reason: 'user_cancelled' });

      expect(mockUIManager.showErrorNotification).toHaveBeenCalledWith({
        message: 'Attack cancelled',
        type: 'info',
        duration: 1500,
      });
      expect((gameplayScene as any).isBattleActive).toBe(false);
      expect((gameplayScene as any).battleInputLocked).toBe(false);
    });

    test('should cancel battle on escape key during battle', () => {
      (gameplayScene as any).isBattleActive = true;
      mockBattleSystem.isActive.mockReturnValue(true);

      (gameplayScene as any).handleBattleShortcuts('ESCAPE', {});

      expect(mockBattleSystem.cancelAttack).toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('should handle attack shortcut (A key)', () => {
      const playerUnit = createMockUnit('player-1', 'player');
      mockGameStateManager.getSelectedUnit.mockReturnValue(playerUnit);
      mockBattleSystem.canAttack.mockReturnValue(true);
      mockBattleSystem.initiateAttack.mockResolvedValue(undefined);
      (gameplayScene as any).isBattleActive = false;

      const handleAttackActionSpy = jest.spyOn(gameplayScene as any, 'handleAttackAction');

      (gameplayScene as any).handleBattleShortcuts('A', {});

      expect(handleAttackActionSpy).toHaveBeenCalledWith(playerUnit);
    });

    test('should not trigger attack shortcut during active battle', () => {
      const playerUnit = createMockUnit('player-1', 'player');
      mockGameStateManager.getSelectedUnit.mockReturnValue(playerUnit);
      (gameplayScene as any).isBattleActive = true;

      const handleAttackActionSpy = jest.spyOn(gameplayScene as any, 'handleAttackAction');

      (gameplayScene as any).handleBattleShortcuts('A', {});

      expect(handleAttackActionSpy).not.toHaveBeenCalled();
    });
  });

  describe('Game End Conditions', () => {
    test('should detect victory when all enemies are defeated', () => {
      const stageData = createMockStageData();
      stageData.enemyUnits.forEach(unit => (unit.currentHP = 0));
      (gameplayScene as any).stageData = stageData;

      (gameplayScene as any).checkGameEndConditions();

      expect(mockGameStateManager.setGameResult).toHaveBeenCalledWith('victory');
    });

    test('should detect defeat when all players are defeated', () => {
      const stageData = createMockStageData();
      stageData.playerUnits.forEach(unit => (unit.currentHP = 0));
      (gameplayScene as any).stageData = stageData;

      (gameplayScene as any).checkGameEndConditions();

      expect(mockGameStateManager.setGameResult).toHaveBeenCalledWith('defeat');
    });

    test('should not end game when both sides have living units', () => {
      const stageData = createMockStageData();
      (gameplayScene as any).stageData = stageData;

      (gameplayScene as any).checkGameEndConditions();

      expect(mockGameStateManager.setGameResult).not.toHaveBeenCalled();
    });
  });

  describe('Input Exclusivity', () => {
    test('should disable normal input during battle', async () => {
      const playerUnit = createMockUnit('player-1', 'player');
      mockBattleSystem.canAttack.mockReturnValue(true);
      mockBattleSystem.initiateAttack.mockResolvedValue(undefined);

      await (gameplayScene as any).handleAttackAction(playerUnit);

      expect((gameplayScene as any).battleInputLocked).toBe(true);
      expect((gameplayScene as any).isBattleActive).toBe(true);

      // Test that input is disabled when battle attack is initiated
      (gameplayScene as any).handleBattleAttackInitiated({ attacker: playerUnit });

      expect(mockInputHandler.disable).toHaveBeenCalled();
      expect(mockInputHandler.enable).toHaveBeenCalled(); // Re-enabled for battle input
    });

    test('should restore normal input after battle completion', () => {
      const mockBattleResult: BattleResult = {
        attacker: createMockUnit('player-1', 'player'),
        target: createMockUnit('enemy-1', 'enemy'),
        weapon: {} as any,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 10,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      (gameplayScene as any).isBattleActive = true;
      (gameplayScene as any).battleInputLocked = true;

      (gameplayScene as any).handleBattleComplete({ battleResult: mockBattleResult });

      expect((gameplayScene as any).isBattleActive).toBe(false);
      expect((gameplayScene as any).battleInputLocked).toBe(false);
      expect(mockInputHandler.enable).toHaveBeenCalled();
    });
  });

  describe('Turn Management Integration', () => {
    test('should advance turn after battle completion', done => {
      const mockBattleResult: BattleResult = {
        attacker: createMockUnit('player-1', 'player'),
        target: createMockUnit('enemy-1', 'enemy'),
        weapon: {} as any,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 10,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      mockGameStateManager.nextTurn.mockReturnValue({ success: true });

      (gameplayScene as any).handleBattleComplete({ battleResult: mockBattleResult });

      // Check that nextTurn is called after timeout
      setTimeout(() => {
        expect(mockGameStateManager.nextTurn).toHaveBeenCalled();
        done();
      }, 1100);
    });

    test('should handle turn advancement failure', done => {
      const mockBattleResult: BattleResult = {
        attacker: createMockUnit('player-1', 'player'),
        target: createMockUnit('enemy-1', 'enemy'),
        weapon: {} as any,
        baseDamage: 20,
        finalDamage: 25,
        modifiers: [],
        isCritical: false,
        isEvaded: false,
        experienceGained: 10,
        targetDefeated: false,
        effectsApplied: [],
        timestamp: Date.now(),
      };

      mockGameStateManager.nextTurn.mockReturnValue({
        success: false,
        message: 'Turn advancement failed',
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (gameplayScene as any).handleBattleComplete({ battleResult: mockBattleResult });

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to advance turn after battle:',
          'Turn advancement failed'
        );
        consoleSpy.mockRestore();
        done();
      }, 1100);
    });
  });
});
