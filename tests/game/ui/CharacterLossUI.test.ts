/**
 * CharacterLossUI unit tests
 * Tests all UI functionality for character loss system
 */

import * as Phaser from 'phaser';
import {
  CharacterLossUI,
  ICharacterLossUI,
  CharacterLossUIConfig,
} from '../../../game/src/ui/CharacterLossUI';
import { Unit } from '../../../game/src/types/gameplay';
import {
  LostCharacter,
  LossCause,
  LossCauseType,
  ChapterLossSummary,
  PartyValidationResult,
  PartyValidationError,
  PartyValidationWarning,
  CharacterLossError,
  CharacterLossErrorDetails,
} from '../../../game/src/types/characterLoss';

// Mock Phaser scene
class MockScene extends Phaser.Events.EventEmitter {
  public add: any;
  public cameras: any;
  public scale: any;
  public time: any;
  public tweens: any;
  public events: Phaser.Events.EventEmitter;

  constructor() {
    super();
    this.events = new Phaser.Events.EventEmitter();

    // Mock events with proper methods
    this.events.on = jest.fn();
    this.events.off = jest.fn();
    this.events.emit = jest.fn();

    // Mock add methods
    this.add = {
      container: jest.fn().mockReturnValue({
        setDepth: jest.fn().mockReturnThis(),
        setVisible: jest.fn().mockReturnThis(),
        add: jest.fn().mockReturnThis(),
        removeAll: jest.fn().mockReturnThis(),
        setPosition: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      }),
      graphics: jest.fn().mockReturnValue({
        fillStyle: jest.fn().mockReturnThis(),
        fillRoundedRect: jest.fn().mockReturnThis(),
        lineStyle: jest.fn().mockReturnThis(),
        strokeRoundedRect: jest.fn().mockReturnThis(),
        strokeCircle: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      }),
      text: jest.fn().mockReturnValue({
        setOrigin: jest.fn().mockReturnThis(),
        setInteractive: jest.fn().mockReturnThis(),
        setBackgroundColor: jest.fn().mockReturnThis(),
        setText: jest.fn().mockReturnThis(),
        setColor: jest.fn().mockReturnThis(),
        setAlpha: jest.fn().mockReturnThis(),
        setScale: jest.fn().mockReturnThis(),
        clearTint: jest.fn().mockReturnThis(),
        setTint: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        on: jest.fn().mockReturnThis(),
        x: 100,
        y: 100,
      }),
      sprite: jest.fn().mockReturnValue({
        setAlpha: jest.fn().mockReturnThis(),
        setTint: jest.fn().mockReturnThis(),
        clearTint: jest.fn().mockReturnThis(),
        setInteractive: jest.fn().mockReturnThis(),
        getWorldTransformMatrix: jest.fn().mockReturnValue({ tx: 100, ty: 100 }),
        destroy: jest.fn(),
        x: 100,
        y: 100,
      }),
    };

    // Mock cameras
    this.cameras = {
      main: {
        width: 1024,
        height: 768,
      },
    };

    // Mock scale with proper event emitter
    this.scale = new Phaser.Events.EventEmitter();
    this.scale.on = jest.fn();
    this.scale.off = jest.fn();
    this.scale.emit = jest.fn();

    // Mock time
    this.time = {
      delayedCall: jest.fn(),
    };

    // Mock tweens
    this.tweens = {
      add: jest.fn().mockImplementation(config => {
        // Immediately call onComplete if provided
        if (config.onComplete) {
          setTimeout(config.onComplete, 0);
        }
        return { destroy: jest.fn() };
      }),
    };
  }
}

describe('CharacterLossUI', () => {
  let mockScene: MockScene;
  let characterLossUI: CharacterLossUI;
  let mockConfig: Partial<CharacterLossUIConfig>;

  // Test data
  const mockUnit: Unit = {
    id: 'test-unit-1',
    name: 'Test Hero',
    position: { x: 5, y: 5 },
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

  const mockLostCharacter: LostCharacter = {
    characterId: 'test-unit-1',
    name: 'Test Hero',
    lostAt: Date.now(),
    turn: 5,
    cause: {
      type: LossCauseType.BATTLE_DEFEAT,
      sourceId: 'enemy-1',
      sourceName: 'Orc Warrior',
      damageAmount: 50,
      description: 'Orc Warriorの攻撃により撃破',
      timestamp: Date.now(),
    },
    level: 10,
    wasRecruited: false,
    position: { x: 5, y: 5 },
  };

  const mockChapterSummary: ChapterLossSummary = {
    chapterId: 'test-chapter',
    chapterName: 'Test Chapter',
    totalCharacters: 4,
    lostCharacters: [mockLostCharacter],
    survivedCharacters: ['unit-2', 'unit-3', 'unit-4'],
    chapterDuration: 300000,
    totalTurns: 15,
    isPerfectClear: false,
    completedAt: Date.now(),
  };

  beforeEach(() => {
    mockScene = new MockScene();
    mockConfig = {
      enableGrayoutEffects: true,
      enableLossReasonTooltips: true,
      enableStageSelectionDisplay: true,
      enableConfirmationDialogs: true,
      tooltipDisplayDuration: 3000,
      animationDuration: 300,
      uiDepth: 2000,
    };

    characterLossUI = new CharacterLossUI(mockScene as any, mockConfig);
  });

  afterEach(() => {
    characterLossUI.destroy();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default config when no config provided', () => {
      const defaultUI = new CharacterLossUI(mockScene as any);
      expect(defaultUI).toBeDefined();
      defaultUI.destroy();
    });

    test('should create all required containers', () => {
      expect(mockScene.add.container).toHaveBeenCalledTimes(6); // 6 containers
    });

    test('should set up event listeners', () => {
      expect(mockScene.events.on).toHaveBeenCalledWith('shutdown', expect.any(Function));
      expect(mockScene.events.on).toHaveBeenCalledWith('destroy', expect.any(Function));
      expect(mockScene.scale.on).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('Party Composition Display', () => {
    test('should update party composition display with lost characters', () => {
      const characters = [mockUnit];
      const lostCharacters = [mockLostCharacter];

      const eventSpy = jest.fn();
      characterLossUI.on('party-composition-updated', eventSpy);

      characterLossUI.updatePartyCompositionDisplay(characters, lostCharacters);

      expect(eventSpy).toHaveBeenCalledWith({
        totalCharacters: 1,
        lostCharacters: 1,
        displayStates: expect.any(Array),
      });
    });

    test('should handle empty character arrays', () => {
      expect(() => {
        characterLossUI.updatePartyCompositionDisplay([], []);
      }).not.toThrow();
    });

    test('should emit party-composition-updated event', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('party-composition-updated', eventSpy);

      characterLossUI.updatePartyCompositionDisplay([mockUnit], []);

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('Character Grayout Effects', () => {
    beforeEach(() => {
      // Register a mock sprite
      const mockSprite = mockScene.add.sprite();
      characterLossUI.registerCharacterSprite('test-unit-1', mockSprite as any);
    });

    test('should apply grayout effect to lost characters', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('grayout-effect-applied', eventSpy);

      characterLossUI.showCharacterGrayoutEffect('test-unit-1', true);

      expect(mockScene.tweens.add).toHaveBeenCalled();

      // Wait for tween completion
      setTimeout(() => {
        expect(eventSpy).toHaveBeenCalledWith({
          characterId: 'test-unit-1',
          isLost: true,
          alpha: 0.3,
        });
      }, 10);
    });

    test('should remove grayout effect from available characters', () => {
      characterLossUI.showCharacterGrayoutEffect('test-unit-1', false);

      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    test('should handle missing sprite gracefully', () => {
      expect(() => {
        characterLossUI.showCharacterGrayoutEffect('non-existent-unit', true);
      }).not.toThrow();
    });

    test('should skip effect when disabled in config', () => {
      const disabledUI = new CharacterLossUI(mockScene as any, {
        enableGrayoutEffects: false,
      });

      disabledUI.showCharacterGrayoutEffect('test-unit-1', true);

      expect(mockScene.tweens.add).not.toHaveBeenCalled();
      disabledUI.destroy();
    });
  });

  describe('Character Selection Feedback', () => {
    beforeEach(() => {
      const mockSprite = mockScene.add.sprite();
      characterLossUI.registerCharacterSprite('test-unit-1', mockSprite as any);
    });

    test('should show selection denied feedback for lost characters', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('selection-feedback-shown', eventSpy);

      characterLossUI.showCharacterSelectionFeedback('test-unit-1', false, 'Character is lost');

      expect(mockScene.add.text).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith({
        characterId: 'test-unit-1',
        canSelect: false,
        reason: 'Character is lost',
      });
    });

    test('should show selection allowed feedback for available characters', () => {
      characterLossUI.showCharacterSelectionFeedback('test-unit-1', true);

      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    test('should show tooltip when loss reason tooltips are enabled', () => {
      const tooltipSpy = jest.fn();
      characterLossUI.on('loss-reason-tooltip-shown', tooltipSpy);

      characterLossUI.showCharacterSelectionFeedback('test-unit-1', false, 'Test reason');

      expect(tooltipSpy).toHaveBeenCalled();
    });
  });

  describe('Loss Reason Tooltips', () => {
    test('should show loss reason tooltip', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('loss-reason-tooltip-shown', eventSpy);

      const position = { x: 100, y: 100 };
      const reason = 'Test loss reason';

      characterLossUI.showLossReasonTooltip('test-unit-1', position, reason);

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith({
        characterId: 'test-unit-1',
        reason,
        position,
      });
    });

    test('should hide loss reason tooltip', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('loss-reason-tooltip-hidden', eventSpy);

      // First show a tooltip
      characterLossUI.showLossReasonTooltip('test-unit-1', { x: 100, y: 100 }, 'Test reason');

      // Then hide it
      characterLossUI.hideLossReasonTooltip('test-unit-1');

      expect(mockScene.tweens.add).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith({ characterId: 'test-unit-1' });
    });

    test('should hide all tooltips', () => {
      // Show multiple tooltips
      characterLossUI.showLossReasonTooltip('unit-1', { x: 100, y: 100 }, 'Reason 1');
      characterLossUI.showLossReasonTooltip('unit-2', { x: 200, y: 200 }, 'Reason 2');

      characterLossUI.hideAllTooltips();

      // Should have called tweens for hiding both tooltips
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    test('should skip tooltip when disabled in config', () => {
      const disabledUI = new CharacterLossUI(mockScene as any, {
        enableLossReasonTooltips: false,
      });

      disabledUI.showLossReasonTooltip('test-unit-1', { x: 100, y: 100 }, 'Test reason');

      // Should not create tooltip elements
      expect(mockScene.add.container).toHaveBeenCalledTimes(6); // Only initial containers
      disabledUI.destroy();
    });
  });

  describe('Stage Selection Loss Count Display', () => {
    test('should update stage selection loss count', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('stage-selection-loss-count-updated', eventSpy);

      characterLossUI.updateStageSelectionLossCount(2, 5);

      expect(eventSpy).toHaveBeenCalledWith({
        totalCharacters: 5,
        lostCharacters: 2,
        lossPercentage: 40,
        displayText: 'ロスト: 2/5 (40%)',
        warningLevel: 'medium',
      });
    });

    test('should show perfect clear when no losses', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('stage-selection-loss-count-updated', eventSpy);

      characterLossUI.updateStageSelectionLossCount(0, 5);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          lossPercentage: 0,
          displayText: '全員生存 (5/5)',
          warningLevel: 'none',
        })
      );
    });

    test('should show stage selection warning', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('stage-selection-warning-shown', eventSpy);

      characterLossUI.showStageSelectionWarning('high', 'Many characters lost!');

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith({
        warningLevel: 'high',
        message: 'Many characters lost!',
      });
    });

    test('should skip display when disabled in config', () => {
      const disabledUI = new CharacterLossUI(mockScene as any, {
        enableStageSelectionDisplay: false,
      });

      disabledUI.updateStageSelectionLossCount(2, 5);

      // Should not create additional UI elements
      expect(mockScene.add.container).toHaveBeenCalledTimes(6); // Only initial containers
      disabledUI.destroy();
    });
  });

  describe('Party Validation Display', () => {
    test('should show party validation result with errors', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('party-validation-result-shown', eventSpy);

      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'lost_character',
            characterId: 'test-unit-1',
            message: 'Character is lost',
            severity: 'error',
          },
        ],
        warnings: [],
        availableCharacters: ['unit-2', 'unit-3'],
        lostCharacters: [mockLostCharacter],
        totalAvailable: 2,
      };

      characterLossUI.showPartyValidationResult(validationResult);

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(validationResult);
    });

    test('should hide party validation display', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('party-validation-display-hidden', eventSpy);

      characterLossUI.hidePartyValidationDisplay();

      expect(eventSpy).toHaveBeenCalled();
    });

    test('should not show display for valid parties with no errors or warnings', () => {
      const validationResult: PartyValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        availableCharacters: ['unit-1', 'unit-2'],
        lostCharacters: [],
        totalAvailable: 2,
      };

      characterLossUI.showPartyValidationResult(validationResult);

      // Should not create additional UI elements for valid parties
      expect(mockScene.add.container).toHaveBeenCalledTimes(6); // Only initial containers
    });
  });

  describe('Chapter Completion Summary', () => {
    test('should show chapter completion summary', async () => {
      const eventSpy = jest.fn();
      characterLossUI.on('chapter-completion-summary-shown', eventSpy);

      await characterLossUI.showChapterCompletionSummary(mockChapterSummary);

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(mockChapterSummary);
    });

    test('should show perfect clear summary', async () => {
      const perfectSummary: ChapterLossSummary = {
        ...mockChapterSummary,
        lostCharacters: [],
        isPerfectClear: true,
      };

      await characterLossUI.showChapterCompletionSummary(perfectSummary);

      expect(mockScene.add.container).toHaveBeenCalled();
    });

    test('should handle summary dismissal', async () => {
      const eventSpy = jest.fn();
      characterLossUI.on('chapter-summary-dismissed', eventSpy);

      await characterLossUI.showChapterCompletionSummary(mockChapterSummary);

      // Simulate continue button click
      const continueButton = mockScene.add.text();
      const clickHandler = continueButton.on.mock.calls.find(call => call[0] === 'pointerdown')[1];
      clickHandler();

      expect(eventSpy).toHaveBeenCalledWith(mockChapterSummary);
    });
  });

  describe('Game Over Screen', () => {
    test('should show game over screen', async () => {
      const gameOverData = {
        reason: 'all_characters_lost',
        totalLosses: 3,
        chapterId: 'test-chapter',
        lostCharacters: [mockLostCharacter],
        chapterDuration: 120000,
      };

      const eventSpy = jest.fn();
      characterLossUI.on('game-over-screen-shown', eventSpy);

      await characterLossUI.showGameOverScreen(gameOverData);

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.tweens.add).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(gameOverData);
    });

    test('should handle game over dismissal', async () => {
      const gameOverData = {
        reason: 'all_characters_lost',
        totalLosses: 2,
        chapterId: 'test-chapter',
        lostCharacters: [mockLostCharacter],
      };

      const eventSpy = jest.fn();
      characterLossUI.on('game-over-dismissed', eventSpy);

      await characterLossUI.showGameOverScreen(gameOverData);

      // Simulate restart button click
      const restartButton = mockScene.add.text();
      const clickHandler = restartButton.on.mock.calls.find(call => call[0] === 'pointerdown')[1];
      clickHandler();

      expect(eventSpy).toHaveBeenCalledWith(gameOverData);
    });

    test('should show game over with multiple lost characters', async () => {
      const gameOverData = {
        reason: 'all_characters_lost',
        totalLosses: 6,
        chapterId: 'test-chapter',
        lostCharacters: Array(6)
          .fill(null)
          .map((_, i) => ({
            ...mockLostCharacter,
            characterId: `char-${i}`,
            name: `Character ${i}`,
          })),
      };

      await characterLossUI.showGameOverScreen(gameOverData);

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.stringContaining('...他 1 名'),
        expect.any(Object)
      );
    });
  });

  describe('Error Message Display', () => {
    test('should show error message', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('error-message-shown', eventSpy);

      const error: CharacterLossErrorDetails = {
        error: CharacterLossError.UI_UPDATE_FAILED,
        message: 'Test error message',
        context: {
          characterId: 'test-unit-1',
          turn: 5,
          phase: 'test_phase',
          additionalData: {},
        },
        timestamp: Date.now(),
        recoverable: true,
        suggestedAction: 'Retry operation',
      };

      characterLossUI.showErrorMessage(error);

      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.time.delayedCall).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(error);
    });

    test('should hide error message', () => {
      const eventSpy = jest.fn();
      characterLossUI.on('error-message-hidden', eventSpy);

      characterLossUI.hideErrorMessage();

      expect(eventSpy).toHaveBeenCalled();
    });

    test('should auto-hide error message after timeout', () => {
      const error: CharacterLossErrorDetails = {
        error: CharacterLossError.UI_UPDATE_FAILED,
        message: 'Test error',
        context: {
          characterId: '',
          turn: 1,
          phase: 'test',
          additionalData: {},
        },
        timestamp: Date.now(),
        recoverable: true,
      };

      characterLossUI.showErrorMessage(error);

      expect(mockScene.time.delayedCall).toHaveBeenCalledWith(5000, expect.any(Function));
    });
  });

  describe('Character Sprite Management', () => {
    test('should register character sprite', () => {
      const mockSprite = mockScene.add.sprite();

      expect(() => {
        characterLossUI.registerCharacterSprite('test-unit-1', mockSprite as any);
      }).not.toThrow();
    });

    test('should unregister character sprite', () => {
      const mockSprite = mockScene.add.sprite();
      characterLossUI.registerCharacterSprite('test-unit-1', mockSprite as any);

      expect(() => {
        characterLossUI.unregisterCharacterSprite('test-unit-1');
      }).not.toThrow();
    });
  });

  describe('Event Handling', () => {
    test('should handle scene shutdown', () => {
      const hideTooltipsSpy = jest.spyOn(characterLossUI, 'hideAllTooltips');

      mockScene.events.emit('shutdown');

      expect(hideTooltipsSpy).toHaveBeenCalled();
    });

    test('should handle scene destroy', () => {
      const destroySpy = jest.spyOn(characterLossUI, 'destroy');

      mockScene.events.emit('destroy');

      expect(destroySpy).toHaveBeenCalled();
    });

    test('should handle scene resize', () => {
      const gameSize = { width: 1280, height: 720 };

      expect(() => {
        mockScene.scale.emit('resize', gameSize);
      }).not.toThrow();
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should destroy cleanly', () => {
      expect(() => {
        characterLossUI.destroy();
      }).not.toThrow();
    });

    test('should handle multiple destroy calls', () => {
      characterLossUI.destroy();

      expect(() => {
        characterLossUI.destroy();
      }).not.toThrow();
    });

    test('should clean up all resources on destroy', () => {
      // Register some sprites and show some tooltips
      const mockSprite = mockScene.add.sprite();
      characterLossUI.registerCharacterSprite('test-unit-1', mockSprite as any);
      characterLossUI.showLossReasonTooltip('test-unit-1', { x: 100, y: 100 }, 'Test reason');

      characterLossUI.destroy();

      // Verify cleanup
      expect(mockScene.events.off).toHaveBeenCalled();
      expect(mockScene.scale.off).toHaveBeenCalled();
    });
  });

  describe('Configuration Handling', () => {
    test('should respect configuration settings', () => {
      const customConfig: Partial<CharacterLossUIConfig> = {
        enableGrayoutEffects: false,
        enableLossReasonTooltips: false,
        enableStageSelectionDisplay: false,
        tooltipDisplayDuration: 5000,
        animationDuration: 500,
      };

      const customUI = new CharacterLossUI(mockScene as any, customConfig);

      // Test that disabled features don't create UI elements
      customUI.showCharacterGrayoutEffect('test-unit-1', true);
      customUI.showLossReasonTooltip('test-unit-1', { x: 100, y: 100 }, 'Test');
      customUI.updateStageSelectionLossCount(1, 5);

      // Should not have created additional UI elements
      expect(mockScene.tweens.add).not.toHaveBeenCalled();

      customUI.destroy();
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully in updatePartyCompositionDisplay', () => {
      // Mock an error in the scene
      mockScene.add.container.mockImplementationOnce(() => {
        throw new Error('Mock error');
      });

      expect(() => {
        characterLossUI.updatePartyCompositionDisplay([mockUnit], []);
      }).not.toThrow();
    });

    test('should handle errors gracefully in showLossReasonTooltip', () => {
      // Mock an error in the scene
      mockScene.add.container.mockImplementationOnce(() => {
        throw new Error('Mock error');
      });

      expect(() => {
        characterLossUI.showLossReasonTooltip('test-unit-1', { x: 100, y: 100 }, 'Test');
      }).not.toThrow();
    });

    test('should handle errors gracefully in showChapterCompletionSummary', async () => {
      // Mock an error in the scene
      mockScene.add.container.mockImplementationOnce(() => {
        throw new Error('Mock error');
      });

      await expect(
        characterLossUI.showChapterCompletionSummary(mockChapterSummary)
      ).rejects.toThrow();
    });
  });

  describe('UI State Management', () => {
    test('should track UI visibility states correctly', () => {
      // Initially all should be hidden
      expect(characterLossUI['isPartyCompositionVisible']).toBe(false);
      expect(characterLossUI['isStageSelectionVisible']).toBe(false);
      expect(characterLossUI['isValidationDisplayVisible']).toBe(false);
      expect(characterLossUI['isErrorVisible']).toBe(false);

      // Show party composition
      characterLossUI.updatePartyCompositionDisplay([mockUnit], []);
      expect(characterLossUI['isPartyCompositionVisible']).toBe(true);

      // Show stage selection
      characterLossUI.updateStageSelectionLossCount(1, 5);
      expect(characterLossUI['isStageSelectionVisible']).toBe(true);

      // Show validation display
      const validationResult: PartyValidationResult = {
        isValid: false,
        errors: [{ type: 'lost_character', message: 'Test error', severity: 'error' }],
        warnings: [],
        availableCharacters: [],
        lostCharacters: [],
        totalAvailable: 0,
      };
      characterLossUI.showPartyValidationResult(validationResult);
      expect(characterLossUI['isValidationDisplayVisible']).toBe(true);

      // Hide validation display
      characterLossUI.hidePartyValidationDisplay();
      expect(characterLossUI['isValidationDisplayVisible']).toBe(false);
    });
  });
});
