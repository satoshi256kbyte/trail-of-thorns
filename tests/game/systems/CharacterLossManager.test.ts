/**
 * CharacterLossManager unit tests
 * Tests the main controller for character loss system functionality
 */

import {
  CharacterLossManager,
  CharacterLossManagerConfig,
  SystemDependencies,
} from '../../../game/src/systems/CharacterLossManager';
import { CharacterLossState } from '../../../game/src/systems/CharacterLossState';
import { CharacterLossEffects } from '../../../game/src/systems/CharacterLossEffects';
import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { RecruitmentSystem } from '../../../game/src/systems/recruitment/RecruitmentSystem';
import { GameStateManager } from '../../../game/src/systems/GameStateManager';
import { Unit } from '../../../game/src/types/gameplay';
import {
  LossCause,
  LossCauseType,
  DangerLevel,
  CharacterLossError,
  CharacterLossUtils,
} from '../../../game/src/types/characterLoss';

// Mock Phaser
const mockScene = {
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  add: {
    graphics: jest.fn(() => ({
      fillStyle: jest.fn(),
      lineStyle: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
    })),
  },
} as any;

// Mock systems
const mockBattleSystem = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
} as any;

const mockRecruitmentSystem = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  handleNPCLoss: jest.fn(),
} as any;

const mockLossEffects = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  playLossAnimation: jest.fn().mockResolvedValue(undefined),
  showDangerEffect: jest.fn(),
  hideDangerEffect: jest.fn(),
  playChapterResetEffect: jest.fn().mockResolvedValue(undefined),
  clearAllEffects: jest.fn(),
  isEffectPlaying: jest.fn().mockReturnValue(false),
  updateEffects: jest.fn(),
} as any;

const mockGameStateManager = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  getCurrentTurn: jest.fn(() => 1),
  updateUnit: jest.fn(() => ({ success: true })),
  setGameResult: jest.fn(() => ({ success: true })),
} as any;

const mockEventEmitter = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
} as any;

// Helper function to create mock unit
const createMockUnit = (overrides: Partial<Unit> = {}): Unit => ({
  id: 'test-unit-1',
  name: 'Test Unit',
  position: { x: 0, y: 0 },
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
  level: 1,
  faction: 'player',
  hasActed: false,
  hasMoved: false,
  ...overrides,
});

// Helper function to create mock loss cause
const createMockLossCause = (overrides: Partial<LossCause> = {}): LossCause => ({
  type: LossCauseType.BATTLE_DEFEAT,
  sourceId: 'enemy-1',
  sourceName: 'Enemy Unit',
  damageAmount: 50,
  description: 'Defeated by enemy attack',
  timestamp: Date.now(),
  ...overrides,
});

describe('CharacterLossManager', () => {
  let manager: CharacterLossManager;
  let config: Partial<CharacterLossManagerConfig>;
  let dependencies: SystemDependencies;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup configuration
    config = {
      enableAutoLossProcessing: true,
      enableDangerWarnings: true,
      criticalHPThreshold: 25,
      highDangerHPThreshold: 50,
      enableRecruitmentIntegration: true,
      enableLossLogging: false, // Disable for tests
    };

    // Setup dependencies
    dependencies = {
      battleSystem: mockBattleSystem,
      recruitmentSystem: mockRecruitmentSystem,
      gameStateManager: mockGameStateManager,
      eventEmitter: mockEventEmitter,
    };

    // Create manager instance
    manager = new CharacterLossManager(mockScene, config, dependencies);
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
  });

  describe('Constructor and Initialization', () => {
    test('should create manager with default configuration', () => {
      const defaultManager = new CharacterLossManager(mockScene);

      expect(defaultManager).toBeDefined();
      expect(defaultManager.isInitialized()).toBe(false);
      expect(defaultManager.getCurrentChapterId()).toBeNull();

      defaultManager.destroy();
    });

    test('should create manager with custom configuration', () => {
      const customConfig = {
        enableAutoLossProcessing: false,
        criticalHPThreshold: 30,
      };

      const customManager = new CharacterLossManager(mockScene, customConfig);

      expect(customManager).toBeDefined();
      expect(customManager.getConfig().enableAutoLossProcessing).toBe(false);
      expect(customManager.getConfig().criticalHPThreshold).toBe(30);

      customManager.destroy();
    });

    test('should set up system dependencies', () => {
      expect(mockBattleSystem.on).toHaveBeenCalledWith('target-selected', expect.any(Function));
      expect(mockBattleSystem.on).toHaveBeenCalledWith('unit-defeated', expect.any(Function));
      expect(mockRecruitmentSystem.on).toHaveBeenCalledWith(
        'character-converted-to-npc',
        expect.any(Function)
      );
      expect(mockRecruitmentSystem.on).toHaveBeenCalledWith(
        'recruitment-failed',
        expect.any(Function)
      );
    });
  });

  describe('Chapter Initialization', () => {
    test('should initialize chapter successfully', () => {
      const units = [
        createMockUnit({ id: 'player-1', faction: 'player' }),
        createMockUnit({ id: 'enemy-1', faction: 'enemy' }),
      ];

      const result = manager.initializeChapter('chapter-1', units);

      expect(result.success).toBe(true);
      expect(result.message).toContain('chapter-1');
      expect(manager.isInitialized()).toBe(true);
      expect(manager.getCurrentChapterId()).toBe('chapter-1');
    });

    test('should fail to initialize with empty chapter ID', () => {
      const units = [createMockUnit()];

      const result = manager.initializeChapter('', units);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Chapter ID cannot be empty');
      expect(manager.isInitialized()).toBe(false);
    });

    test('should fail to initialize with invalid units', () => {
      const result = manager.initializeChapter('chapter-1', null as any);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Units must be an array');
      expect(manager.isInitialized()).toBe(false);
    });

    test('should emit chapter-initialized event', () => {
      const units = [createMockUnit()];
      const emitSpy = jest.spyOn(manager, 'emit');

      manager.initializeChapter('chapter-1', units);

      expect(emitSpy).toHaveBeenCalledWith('chapter-initialized', {
        chapterId: 'chapter-1',
        unitCount: 1,
        playerUnits: 1,
        enemyUnits: 0,
      });
    });
  });

  describe('Character Loss Processing', () => {
    beforeEach(() => {
      const units = [
        createMockUnit({ id: 'player-1', faction: 'player' }),
        createMockUnit({ id: 'enemy-1', faction: 'enemy' }),
      ];
      manager.initializeChapter('chapter-1', units);
    });

    test('should process character loss successfully', async () => {
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      const result = await manager.processCharacterLoss(unit, cause);

      expect(result).toBeDefined();
      expect(result.characterId).toBe('player-1');
      expect(result.cause).toEqual(cause);
      expect(manager.isCharacterLost('player-1')).toBe(true);
    });

    test('should fail to process loss without initialization', async () => {
      const uninitializedManager = new CharacterLossManager(mockScene);
      const unit = createMockUnit();
      const cause = createMockLossCause();

      await expect(uninitializedManager.processCharacterLoss(unit, cause)).rejects.toMatchObject({
        error: CharacterLossError.CHAPTER_NOT_INITIALIZED,
      });

      uninitializedManager.destroy();
    });

    test('should fail to process loss with invalid unit', async () => {
      const cause = createMockLossCause();

      await expect(manager.processCharacterLoss(null as any, cause)).rejects.toMatchObject({
        error: CharacterLossError.INVALID_CHARACTER,
      });
    });

    test('should fail to process loss with invalid cause', async () => {
      const unit = createMockUnit();
      const invalidCause = { invalid: 'cause' } as any;

      await expect(manager.processCharacterLoss(unit, invalidCause)).rejects.toMatchObject({
        error: CharacterLossError.INVALID_LOSS_CAUSE,
      });
    });

    test('should handle duplicate loss processing', async () => {
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      // Process loss first time
      const firstResult = await manager.processCharacterLoss(unit, cause);

      // Process loss second time (should return existing loss)
      const secondResult = await manager.processCharacterLoss(unit, cause);

      expect(firstResult.characterId).toBe(secondResult.characterId);
      expect(firstResult.lostAt).toBe(secondResult.lostAt);
    });

    test('should emit character-loss-processed event', async () => {
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();
      const emitSpy = jest.spyOn(manager, 'emit');

      await manager.processCharacterLoss(unit, cause);

      expect(emitSpy).toHaveBeenCalledWith('character-loss-processed', {
        unit,
        cause,
        lostCharacter: expect.any(Object),
        totalLosses: 1,
      });
    });

    test('should update game state after loss', async () => {
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      await manager.processCharacterLoss(unit, cause);

      expect(mockGameStateManager.updateUnit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'player-1',
          currentHP: 0,
        })
      );
    });

    test('should handle NPC loss with recruitment system', async () => {
      const npcUnit = createMockUnit({
        id: 'npc-1',
        faction: 'npc' as any,
        wasRecruited: true,
      });
      const cause = createMockLossCause();

      await manager.processCharacterLoss(npcUnit, cause);

      expect(mockRecruitmentSystem.handleNPCLoss).toHaveBeenCalledWith(npcUnit);
    });
  });

  describe('Danger Level Calculation', () => {
    test('should calculate danger level correctly', () => {
      const fullHPUnit = createMockUnit({
        currentHP: 100,
        stats: { ...createMockUnit().stats, maxHP: 100 },
      });
      const lowHPUnit = createMockUnit({
        currentHP: 20,
        stats: { ...createMockUnit().stats, maxHP: 100 },
      });
      const criticalHPUnit = createMockUnit({
        currentHP: 5,
        stats: { ...createMockUnit().stats, maxHP: 100 },
      });
      const deadUnit = createMockUnit({
        currentHP: 0,
        stats: { ...createMockUnit().stats, maxHP: 100 },
      });

      expect(manager.calculateDangerLevel(fullHPUnit)).toBe(DangerLevel.NONE);
      expect(manager.calculateDangerLevel(lowHPUnit)).toBe(DangerLevel.CRITICAL);
      expect(manager.calculateDangerLevel(criticalHPUnit)).toBe(DangerLevel.CRITICAL);
      expect(manager.calculateDangerLevel(deadUnit)).toBe(DangerLevel.CRITICAL);
    });

    test('should handle units without maxHP stat', () => {
      const unit = createMockUnit({ currentHP: 50 });
      delete (unit.stats as any).maxHP;

      const dangerLevel = manager.calculateDangerLevel(unit);

      expect(dangerLevel).toBe(DangerLevel.NONE); // Should use currentHP as maxHP
    });
  });

  describe('Character Status Queries', () => {
    beforeEach(() => {
      const units = [
        createMockUnit({ id: 'player-1', faction: 'player' }),
        createMockUnit({ id: 'player-2', faction: 'player' }),
        createMockUnit({ id: 'enemy-1', faction: 'enemy' }),
      ];
      manager.initializeChapter('chapter-1', units);
    });

    test('should check if character is lost', async () => {
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      expect(manager.isCharacterLost('player-1')).toBe(false);

      await manager.processCharacterLoss(unit, cause);

      expect(manager.isCharacterLost('player-1')).toBe(true);
      expect(manager.isCharacterLost('player-2')).toBe(false);
    });

    test('should get all lost characters', async () => {
      const unit1 = createMockUnit({ id: 'player-1' });
      const unit2 = createMockUnit({ id: 'player-2' });
      const cause = createMockLossCause();

      await manager.processCharacterLoss(unit1, cause);
      await manager.processCharacterLoss(unit2, cause);

      const lostCharacters = manager.getLostCharacters();

      expect(lostCharacters).toHaveLength(2);
      expect(lostCharacters.map(c => c.characterId)).toContain('player-1');
      expect(lostCharacters.map(c => c.characterId)).toContain('player-2');
    });

    test('should get available characters', async () => {
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      const initialAvailable = manager.getAvailableCharacters();
      expect(initialAvailable).toHaveLength(3);

      await manager.processCharacterLoss(unit, cause);

      const afterLossAvailable = manager.getAvailableCharacters();
      expect(afterLossAvailable).toHaveLength(2);
      expect(afterLossAvailable).not.toContain('player-1');
    });
  });

  describe('Party Validation', () => {
    beforeEach(() => {
      const units = [
        createMockUnit({ id: 'player-1', faction: 'player' }),
        createMockUnit({ id: 'player-2', faction: 'player' }),
        createMockUnit({ id: 'player-3', faction: 'player' }),
      ];
      manager.initializeChapter('chapter-1', units);
    });

    test('should validate party with no lost characters', () => {
      const party = ['player-1', 'player-2'];

      const result = manager.validatePartyComposition(party);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.availableCharacters).toHaveLength(3);
    });

    test('should invalidate party with lost characters', async () => {
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();
      await manager.processCharacterLoss(unit, cause);

      const party = ['player-1', 'player-2'];

      const result = manager.validatePartyComposition(party);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('lost_character');
      expect(result.errors[0].characterId).toBe('player-1');
    });

    test('should invalidate empty party', () => {
      const party: string[] = [];

      const result = manager.validatePartyComposition(party);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'insufficient_members')).toBe(true);
    });

    test('should add warnings for low available character count', async () => {
      // Lose two characters, leaving only one
      const unit1 = createMockUnit({ id: 'player-1' });
      const unit2 = createMockUnit({ id: 'player-2' });
      const cause = createMockLossCause();

      await manager.processCharacterLoss(unit1, cause);
      await manager.processCharacterLoss(unit2, cause);

      const party = ['player-3'];

      const result = manager.validatePartyComposition(party);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].severity).toBe('high');
    });
  });

  describe('Chapter Completion', () => {
    beforeEach(() => {
      const units = [
        createMockUnit({ id: 'player-1', faction: 'player' }),
        createMockUnit({ id: 'enemy-1', faction: 'enemy' }),
      ];
      manager.initializeChapter('chapter-1', units);
    });

    test('should complete chapter and return summary', () => {
      const summary = manager.completeChapter();

      expect(summary).toBeDefined();
      expect(summary.chapterId).toBe('chapter-1');
      expect(summary.isPerfectClear).toBe(true);
      expect(summary.lostCharacters).toHaveLength(0);
    });

    test('should complete chapter with losses', async () => {
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();
      await manager.processCharacterLoss(unit, cause);

      const summary = manager.completeChapter();

      expect(summary.isPerfectClear).toBe(false);
      expect(summary.lostCharacters).toHaveLength(1);
      expect(summary.lostCharacters[0].characterId).toBe('player-1');
    });

    test('should emit chapter-completed event', () => {
      const emitSpy = jest.spyOn(manager, 'emit');

      const summary = manager.completeChapter();

      expect(emitSpy).toHaveBeenCalledWith('chapter-completed', {
        summary,
        isPerfectClear: true,
        totalLosses: 0,
      });
    });

    test('should fail to complete uninitialized chapter', () => {
      const uninitializedManager = new CharacterLossManager(mockScene);

      expect(() => uninitializedManager.completeChapter()).toThrow();

      uninitializedManager.destroy();
    });
  });

  describe('Game Over Detection', () => {
    beforeEach(() => {
      const units = [
        createMockUnit({ id: 'player-1', faction: 'player' }),
        createMockUnit({ id: 'player-2', faction: 'player' }),
        createMockUnit({ id: 'enemy-1', faction: 'enemy' }),
      ];
      manager.initializeChapter('chapter-1', units);
    });

    test('should detect game over when all player characters are lost', async () => {
      const emitSpy = jest.spyOn(manager, 'emit');
      const unit1 = createMockUnit({ id: 'player-1' });
      const unit2 = createMockUnit({ id: 'player-2' });
      const cause = createMockLossCause();

      await manager.processCharacterLoss(unit1, cause);
      await manager.processCharacterLoss(unit2, cause);

      expect(mockGameStateManager.setGameResult).toHaveBeenCalledWith('defeat');

      // Check that the all-characters-lost event was emitted
      const allCharactersLostCalls = emitSpy.mock.calls.filter(
        call => call[0] === 'all-characters-lost'
      );
      expect(allCharactersLostCalls).toHaveLength(1);
      // The event should be emitted when the last player character is lost
      // The totalLosses count reflects the state at the time of the event
      expect(allCharactersLostCalls[0][1]).toMatchObject({
        chapterId: 'chapter-1',
      });
      expect(allCharactersLostCalls[0][1].totalLosses).toBeGreaterThan(0);
    });

    test('should not trigger game over when some player characters remain', async () => {
      const unit1 = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      await manager.processCharacterLoss(unit1, cause);

      expect(mockGameStateManager.setGameResult).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    test('should track processing state', async () => {
      const units = [createMockUnit({ id: 'player-1' })];
      manager.initializeChapter('chapter-1', units);

      expect(manager.isProcessingLoss()).toBe(false);
      expect(manager.getTotalLossesProcessed()).toBe(0);

      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      const processPromise = manager.processCharacterLoss(unit, cause);

      // Note: In a real scenario, we might check isProcessingLoss() during processing
      // but since our implementation is synchronous in tests, we check after

      await processPromise;

      expect(manager.isProcessingLoss()).toBe(false);
      expect(manager.getTotalLossesProcessed()).toBe(1);
    });

    test('should reset chapter state', () => {
      const units = [createMockUnit({ id: 'player-1' })];
      manager.initializeChapter('chapter-1', units);

      manager.resetChapterState();

      expect(manager.getTotalLossesProcessed()).toBe(0);
      expect(manager.isProcessingLoss()).toBe(false);
    });

    test('should get current state', () => {
      const state = manager.getState();

      expect(state).toHaveProperty('isInitialized');
      expect(state).toHaveProperty('currentChapterId');
      expect(state).toHaveProperty('isProcessingLoss');
      expect(state).toHaveProperty('lossesProcessed');
    });

    test('should get current configuration', () => {
      const config = manager.getConfig();

      expect(config).toHaveProperty('enableAutoLossProcessing');
      expect(config).toHaveProperty('enableDangerWarnings');
      expect(config).toHaveProperty('criticalHPThreshold');
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      const units = [createMockUnit({ id: 'player-1' })];
      manager.initializeChapter('chapter-1', units);
    });

    test('should handle battle target selected event', () => {
      const emitSpy = jest.spyOn(manager, 'emit');
      const targetUnit = createMockUnit({ currentHP: 20 }); // Low HP for danger warning

      // Simulate battle system event
      const battleEvent = {
        target: targetUnit,
        attacker: createMockUnit({ id: 'attacker' }),
      };

      // Manually trigger the event handler (since we can't easily trigger the actual event)
      (manager as any).onBattleTargetSelected(battleEvent);

      expect(emitSpy).toHaveBeenCalledWith('danger-warning', {
        unit: targetUnit,
        dangerLevel: DangerLevel.CRITICAL,
        attacker: battleEvent.attacker,
      });
    });

    test('should handle unit defeated event from battle system', async () => {
      const defeatedUnit = createMockUnit({ id: 'player-1' });
      const battleEvent = {
        unit: defeatedUnit,
        battleResult: {
          attacker: createMockUnit({ id: 'attacker', name: 'Attacker' }),
          finalDamage: 50,
          isCritical: false,
        },
      };

      // Manually trigger the event handler
      await (manager as any).onUnitDefeated(battleEvent);

      expect(manager.isCharacterLost('player-1')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully during loss processing', async () => {
      const units = [createMockUnit({ id: 'player-1' })];
      manager.initializeChapter('chapter-1', units);

      // Mock an error in the loss state
      const originalRecordLoss = CharacterLossState.prototype.recordLoss;
      CharacterLossState.prototype.recordLoss = jest.fn(() => {
        throw new Error('Test error');
      });

      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      await expect(manager.processCharacterLoss(unit, cause)).rejects.toMatchObject({
        error: CharacterLossError.LOSS_PROCESSING_FAILED,
      });

      expect(manager.isProcessingLoss()).toBe(false);

      // Restore original method
      CharacterLossState.prototype.recordLoss = originalRecordLoss;
    });

    test('should emit error events', async () => {
      const units = [createMockUnit({ id: 'player-1' })];
      manager.initializeChapter('chapter-1', units);

      const emitSpy = jest.spyOn(manager, 'emit');

      // Mock an error
      const originalRecordLoss = CharacterLossState.prototype.recordLoss;
      CharacterLossState.prototype.recordLoss = jest.fn(() => {
        throw new Error('Test error');
      });

      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      try {
        await manager.processCharacterLoss(unit, cause);
      } catch (error) {
        // Expected to throw
      }

      expect(emitSpy).toHaveBeenCalledWith('character-loss-error', {
        unit,
        cause,
        error: expect.any(Object),
      });

      // Restore original method
      CharacterLossState.prototype.recordLoss = originalRecordLoss;
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should clean up resources on destroy', () => {
      const removeAllListenersSpy = jest.spyOn(manager, 'removeAllListeners');

      manager.destroy();

      expect(removeAllListenersSpy).toHaveBeenCalled();
      expect(manager.isInitialized()).toBe(false);
    });

    test('should handle scene shutdown', () => {
      // Create manager with logging enabled for this test
      const loggingManager = new CharacterLossManager(mockScene, { enableLossLogging: true });
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Manually trigger scene shutdown
      (loggingManager as any).onSceneShutdown();

      // Should not throw errors
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CharacterLossManager] Scene shutting down')
      );

      logSpy.mockRestore();
      loggingManager.destroy();
    });
  });

  describe('Effects System Integration', () => {
    let managerWithEffects: CharacterLossManager;

    beforeEach(() => {
      const dependencies: SystemDependencies = {
        battleSystem: mockBattleSystem,
        recruitmentSystem: mockRecruitmentSystem,
        gameStateManager: mockGameStateManager,
        lossEffects: mockLossEffects,
      };

      managerWithEffects = new CharacterLossManager(mockScene, undefined, dependencies);

      const units = [
        createMockUnit({ id: 'player-1', faction: 'player' }),
        createMockUnit({ id: 'player-2', faction: 'player' }),
      ];
      managerWithEffects.initializeChapter('chapter-1', units);
    });

    afterEach(() => {
      managerWithEffects.destroy();
      jest.clearAllMocks();
    });

    test('should integrate with loss effects system', () => {
      expect(mockLossEffects.on).toHaveBeenCalledWith(
        'loss-animation-complete',
        expect.any(Function)
      );
      expect(mockLossEffects.on).toHaveBeenCalledWith('danger-effect-shown', expect.any(Function));
    });

    test('should play loss animation during character loss processing', async () => {
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      await managerWithEffects.processCharacterLoss(unit, cause);

      expect(mockLossEffects.playLossAnimation).toHaveBeenCalledWith(unit, cause);
    });

    test('should skip loss animation when skipAnimations option is true', async () => {
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();
      const options = { skipAnimations: true };

      await managerWithEffects.processCharacterLoss(unit, cause, options);

      expect(mockLossEffects.playLossAnimation).not.toHaveBeenCalled();
    });

    test('should show danger effects when danger level changes', () => {
      const unit = createMockUnit({ id: 'player-1', currentHP: 20 }); // Low HP for danger

      // Add unit to allUnits array so updateDangerLevels can process it
      (managerWithEffects as any).allUnits = [unit];

      // Manually trigger danger level update
      (managerWithEffects as any).updateDangerLevels();

      expect(mockLossEffects.showDangerEffect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'player-1' }),
        DangerLevel.CRITICAL
      );
    });

    test('should hide danger effects when danger level becomes none', () => {
      const unit = createMockUnit({ id: 'player-1', currentHP: 100 }); // Full HP

      // Add unit to allUnits array so updateDangerLevels can process it
      (managerWithEffects as any).allUnits = [unit];

      // First set a danger level
      (managerWithEffects as any).dangerLevels.set('player-1', DangerLevel.HIGH);

      // Then update to trigger hiding
      (managerWithEffects as any).updateDangerLevels();

      expect(mockLossEffects.hideDangerEffect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'player-1' })
      );
    });

    test('should play chapter reset effect and clear effects on chapter reset', async () => {
      await managerWithEffects.resetChapterState();

      expect(mockLossEffects.playChapterResetEffect).toHaveBeenCalled();
      expect(mockLossEffects.clearAllEffects).toHaveBeenCalled();
    });

    test('should handle loss animation complete event', () => {
      const emitSpy = jest.spyOn(managerWithEffects, 'emit');
      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      // Manually trigger the event handler
      (managerWithEffects as any).onLossAnimationComplete({ unit, cause });

      expect(emitSpy).toHaveBeenCalledWith('loss-animation-finished', { unit, cause });
    });

    test('should handle danger effect shown event', () => {
      const emitSpy = jest.spyOn(managerWithEffects, 'emit');
      const unit = createMockUnit({ id: 'player-1' });
      const dangerLevel = DangerLevel.HIGH;

      // Manually trigger the event handler
      (managerWithEffects as any).onDangerEffectShown({ unit, dangerLevel });

      expect(emitSpy).toHaveBeenCalledWith('danger-warning-displayed', { unit, dangerLevel });
    });

    test('should clear effects system on destroy', () => {
      managerWithEffects.destroy();

      expect(mockLossEffects.clearAllEffects).toHaveBeenCalled();
    });

    test('should work without effects system', async () => {
      // Create manager without effects system
      const managerWithoutEffects = new CharacterLossManager(mockScene);
      const units = [createMockUnit({ id: 'player-1' })];
      managerWithoutEffects.initializeChapter('chapter-1', units);

      const unit = createMockUnit({ id: 'player-1' });
      const cause = createMockLossCause();

      // Should not throw error even without effects system
      await expect(managerWithoutEffects.processCharacterLoss(unit, cause)).resolves.toBeDefined();

      managerWithoutEffects.destroy();
    });
  });
});
