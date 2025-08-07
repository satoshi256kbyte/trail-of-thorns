/**
 * BattleUIIntegration test suite
 * Tests the integration between battle system and UI components
 */

import * as Phaser from 'phaser';
import { BattleUIIntegration } from '../../../game/src/ui/BattleUIIntegration';
import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { MapRenderer } from '../../../game/src/rendering/MapRenderer';
import { UIManager } from '../../../game/src/ui/UIManager';
import { Unit, Position } from '../../../game/src/types/gameplay';
import { BattleResult, BattleError, DamageType } from '../../../game/src/types/battle';

// Mock Phaser scene
const mockScene = {
  add: {
    container: jest.fn().mockReturnValue({
      setScrollFactor: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      add: jest.fn(),
      setVisible: jest.fn(),
      removeAll: jest.fn(),
    }),
    graphics: jest.fn().mockReturnValue({
      fillStyle: jest.fn().mockReturnThis(),
      fillRoundedRect: jest.fn().mockReturnThis(),
      lineStyle: jest.fn().mockReturnThis(),
      strokeRoundedRect: jest.fn().mockReturnThis(),
    }),
    text: jest.fn().mockReturnValue({
      setOrigin: jest.fn().mockReturnThis(),
      setText: jest.fn().mockReturnThis(),
      setColor: jest.fn().mockReturnThis(),
      setInteractive: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
    }),
  },
  cameras: {
    main: {
      width: 800,
      height: 600,
    },
  },
  time: {
    delayedCall: jest.fn(),
  },
  tweens: {
    add: jest.fn(),
  },
  events: {
    emit: jest.fn(),
  },
} as any;

// Mock battle system
const mockBattleSystem = {
  on: jest.fn(),
  removeAllListeners: jest.fn(),
  emit: jest.fn(),
} as any;

// Mock map renderer
const mockMapRenderer = {
  highlightAttackRange: jest.fn(),
  highlightBattleTarget: jest.fn(),
  showEnemyThreatRanges: jest.fn(),
  clearHighlights: jest.fn(),
  tileToWorldPosition: jest.fn().mockReturnValue({ x: 100, y: 100 }),
} as any;

// Mock UI manager
const mockUIManager = {
  showBattleStatus: jest.fn(),
  hideBattleStatus: jest.fn(),
  showDamageNumber: jest.fn(),
  showExperienceGained: jest.fn(),
  showBattleResult: jest.fn(),
  hideBattleResult: jest.fn(),
  showErrorNotification: jest.fn(),
  hideErrorNotification: jest.fn(),
} as any;

// Test data
const mockUnit: Unit = {
  id: 'test-unit',
  name: 'Test Unit',
  position: { x: 5, y: 5 },
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
  faction: 'player',
  hasActed: false,
  hasMoved: false,
  equipment: {},
  sprite: {
    x: 160,
    y: 160,
  } as any,
};

const mockBattleResult: BattleResult = {
  attacker: mockUnit,
  target: { ...mockUnit, id: 'target-unit', name: 'Target Unit' },
  weapon: {
    id: 'test-sword',
    name: 'Test Sword',
    type: 'sword' as any,
    attackPower: 10,
    range: 1,
    rangePattern: {
      type: 'single',
      range: 1,
      pattern: [{ x: 0, y: -1 }],
    },
    element: 'none' as any,
    criticalRate: 10,
    accuracy: 90,
    specialEffects: [],
    description: 'A test sword',
  },
  baseDamage: 15,
  finalDamage: 15,
  modifiers: [],
  isCritical: false,
  isEvaded: false,
  experienceGained: 10,
  targetDefeated: false,
  effectsApplied: [],
  timestamp: Date.now(),
};

describe('BattleUIIntegration', () => {
  let battleUIIntegration: BattleUIIntegration;

  beforeEach(() => {
    jest.clearAllMocks();

    battleUIIntegration = new BattleUIIntegration(
      mockScene,
      mockBattleSystem,
      mockMapRenderer,
      mockUIManager
    );
  });

  afterEach(() => {
    if (battleUIIntegration) {
      battleUIIntegration.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const config = battleUIIntegration.getConfig();

      expect(config.autoUpdateUI).toBe(true);
      expect(config.showDamageNumbers).toBe(true);
      expect(config.showExperienceNotifications).toBe(true);
      expect(config.showBattleStatus).toBe(true);
      expect(config.showBattleResults).toBe(true);
      expect(config.autoHideDelay).toBe(3000);
    });

    test('should initialize with custom configuration', () => {
      const customConfig = {
        autoUpdateUI: false,
        showDamageNumbers: false,
        autoHideDelay: 5000,
      };

      const customIntegration = new BattleUIIntegration(
        mockScene,
        mockBattleSystem,
        mockMapRenderer,
        mockUIManager,
        customConfig
      );

      const config = customIntegration.getConfig();

      expect(config.autoUpdateUI).toBe(false);
      expect(config.showDamageNumbers).toBe(false);
      expect(config.autoHideDelay).toBe(5000);
      expect(config.showBattleStatus).toBe(true); // Should keep default

      customIntegration.destroy();
    });

    test('should setup event listeners on battle system', () => {
      expect(mockBattleSystem.on).toHaveBeenCalledWith('attack-initiated', expect.any(Function));
      expect(mockBattleSystem.on).toHaveBeenCalledWith('attack-range-shown', expect.any(Function));
      expect(mockBattleSystem.on).toHaveBeenCalledWith('target-selected', expect.any(Function));
      expect(mockBattleSystem.on).toHaveBeenCalledWith('battle-complete', expect.any(Function));
      expect(mockBattleSystem.on).toHaveBeenCalledWith('battle-error', expect.any(Function));
    });

    test('should initialize as active', () => {
      battleUIIntegration.initialize();

      expect(battleUIIntegration.isActive()).toBe(true);
      expect(battleUIIntegration.getCurrentPhase()).toBe('idle');
    });
  });

  describe('Battle Event Handling', () => {
    beforeEach(() => {
      battleUIIntegration.initialize();
    });

    test('should handle attack initiation', () => {
      const attackData = {
        attacker: mockUnit,
        weapon: mockBattleResult.weapon,
        validTargets: [mockUnit],
        attackRange: [
          { x: 4, y: 5 },
          { x: 6, y: 5 },
        ],
      };

      // Simulate attack initiated event
      const onAttackInitiated = mockBattleSystem.on.mock.calls.find(
        call => call[0] === 'attack-initiated'
      )[1];

      onAttackInitiated(attackData);

      expect(mockUIManager.showBattleStatus).toHaveBeenCalledWith('Test Unit preparing to attack');
      expect(battleUIIntegration.getCurrentPhase()).toBe('range_display');
    });

    test('should handle attack range display', () => {
      const rangeData = {
        attacker: mockUnit,
        weapon: mockBattleResult.weapon,
        rangePositions: [
          { x: 4, y: 5 },
          { x: 6, y: 5 },
        ],
        rangeCount: 2,
      };

      // Simulate attack range shown event
      const onAttackRangeShown = mockBattleSystem.on.mock.calls.find(
        call => call[0] === 'attack-range-shown'
      )[1];

      onAttackRangeShown(rangeData);

      expect(mockMapRenderer.highlightAttackRange).toHaveBeenCalledWith(
        rangeData.rangePositions,
        mockUnit.position
      );
      expect(mockUIManager.showBattleStatus).toHaveBeenCalledWith('Select target for Test Unit');
    });

    test('should handle target selection', () => {
      const targetData = {
        attacker: mockUnit,
        target: mockBattleResult.target,
        weapon: mockBattleResult.weapon,
        battleResult: mockBattleResult,
      };

      // Simulate target selected event
      const onTargetSelected = mockBattleSystem.on.mock.calls.find(
        call => call[0] === 'target-selected'
      )[1];

      onTargetSelected(targetData);

      expect(mockMapRenderer.highlightBattleTarget).toHaveBeenCalledWith(
        mockBattleResult.target.position
      );
      expect(mockUIManager.showBattleStatus).toHaveBeenCalledWith('Test Unit attacks Target Unit!');
      expect(battleUIIntegration.getCurrentPhase()).toBe('battle_execution');
    });

    test('should handle battle completion', () => {
      const battleData = {
        battleResult: mockBattleResult,
        attacker: mockUnit,
        target: mockBattleResult.target,
        weapon: mockBattleResult.weapon,
      };

      // Simulate battle complete event
      const onBattleComplete = mockBattleSystem.on.mock.calls.find(
        call => call[0] === 'battle-complete'
      )[1];

      onBattleComplete(battleData);

      expect(mockUIManager.showDamageNumber).toHaveBeenCalledWith(100, 80, 15, false, false);
      expect(mockUIManager.showExperienceGained).toHaveBeenCalledWith(100, 60, 10);
      expect(mockUIManager.showBattleResult).toHaveBeenCalledWith(
        expect.objectContaining({
          damage: 15,
          isCritical: false,
          isEvaded: false,
          experienceGained: 10,
          targetDefeated: false,
          attacker: 'Test Unit',
          target: 'Target Unit',
        })
      );
      expect(battleUIIntegration.getCurrentPhase()).toBe('idle');
    });

    test('should handle attack cancellation', () => {
      const cancelData = {
        attacker: mockUnit,
        reason: 'user_cancelled',
      };

      // Simulate attack cancelled event
      const onAttackCancelled = mockBattleSystem.on.mock.calls.find(
        call => call[0] === 'attack-cancelled'
      )[1];

      onAttackCancelled(cancelData);

      expect(mockMapRenderer.clearHighlights).toHaveBeenCalled();
      expect(mockUIManager.hideBattleStatus).toHaveBeenCalled();
      expect(battleUIIntegration.getCurrentPhase()).toBe('idle');
    });

    test('should handle battle errors', () => {
      const errorDetails = {
        error: BattleError.OUT_OF_RANGE,
        message: 'Target is out of range',
        context: {
          attacker: mockUnit,
          target: mockBattleResult.target,
          phase: 'target_selection' as any,
        },
        timestamp: Date.now(),
        recoverable: true,
        suggestedAction: 'Move closer to target',
      };

      // Simulate battle error event
      const onBattleError = mockBattleSystem.on.mock.calls.find(
        call => call[0] === 'battle-error'
      )[1];

      onBattleError(errorDetails);

      expect(mockUIManager.showErrorNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Target is out of range',
          type: 'warning',
          duration: 4000,
        })
      );
      expect(mockMapRenderer.clearHighlights).toHaveBeenCalled();
      expect(mockUIManager.hideBattleStatus).toHaveBeenCalled();
      expect(battleUIIntegration.getCurrentPhase()).toBe('idle');
    });
  });

  describe('Manual Control Methods', () => {
    beforeEach(() => {
      battleUIIntegration.initialize();
    });

    test('should manually show attack range', () => {
      const positions = [
        { x: 4, y: 5 },
        { x: 6, y: 5 },
      ];
      const attackerPosition = { x: 5, y: 5 };

      battleUIIntegration.showAttackRange(positions, attackerPosition);

      expect(mockMapRenderer.highlightAttackRange).toHaveBeenCalledWith(
        positions,
        attackerPosition
      );
    });

    test('should manually show target selection', () => {
      const targetPosition = { x: 6, y: 5 };
      const areaPositions = [
        { x: 7, y: 5 },
        { x: 6, y: 6 },
      ];

      battleUIIntegration.showTargetSelection(targetPosition, areaPositions);

      expect(mockMapRenderer.highlightBattleTarget).toHaveBeenCalledWith(
        targetPosition,
        areaPositions
      );
    });

    test('should manually show enemy threats', () => {
      const threatRanges = new Map([
        [
          'enemy1',
          [
            { x: 3, y: 3 },
            { x: 4, y: 3 },
          ],
        ],
        [
          'enemy2',
          [
            { x: 7, y: 7 },
            { x: 8, y: 7 },
          ],
        ],
      ]);

      battleUIIntegration.showEnemyThreats(threatRanges);

      expect(mockMapRenderer.showEnemyThreatRanges).toHaveBeenCalledWith(threatRanges);
    });

    test('should clear battle highlights', () => {
      battleUIIntegration.clearBattleHighlights();

      expect(mockMapRenderer.clearHighlights).toHaveBeenCalled();
    });

    test('should show battle status', () => {
      battleUIIntegration.showBattleStatus('Custom battle message');

      expect(mockUIManager.showBattleStatus).toHaveBeenCalledWith('Custom battle message');
    });

    test('should hide battle status', () => {
      battleUIIntegration.hideBattleStatus();

      expect(mockUIManager.hideBattleStatus).toHaveBeenCalled();
    });

    test('should show damage at position', () => {
      const position = { x: 5, y: 5 };

      battleUIIntegration.showDamageAtPosition(position, 25, DamageType.CRITICAL);

      expect(mockUIManager.showDamageNumber).toHaveBeenCalledWith(100, 80, 25, true, false);
    });

    test('should show experience at position', () => {
      const position = { x: 5, y: 5 };

      battleUIIntegration.showExperienceAtPosition(position, 15);

      expect(mockUIManager.showExperienceGained).toHaveBeenCalledWith(100, 60, 15);
    });

    test('should show error notification', () => {
      battleUIIntegration.showError('Custom error message', 'warning', 5000);

      expect(mockUIManager.showErrorNotification).toHaveBeenCalledWith({
        message: 'Custom error message',
        type: 'warning',
        duration: 5000,
      });
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        showDamageNumbers: false,
        autoHideDelay: 5000,
      };

      battleUIIntegration.updateConfig(newConfig);

      const config = battleUIIntegration.getConfig();
      expect(config.showDamageNumbers).toBe(false);
      expect(config.autoHideDelay).toBe(5000);
      expect(config.showBattleStatus).toBe(true); // Should keep existing value
    });

    test('should disable UI updates when autoUpdateUI is false', () => {
      battleUIIntegration.updateConfig({ autoUpdateUI: false });

      const attackData = {
        attacker: mockUnit,
        weapon: mockBattleResult.weapon,
        validTargets: [mockUnit],
        attackRange: [{ x: 4, y: 5 }],
      };

      // Simulate attack initiated event
      const onAttackInitiated = mockBattleSystem.on.mock.calls.find(
        call => call[0] === 'attack-initiated'
      )[1];

      onAttackInitiated(attackData);

      expect(mockUIManager.showBattleStatus).not.toHaveBeenCalled();
    });

    test('should disable damage numbers when showDamageNumbers is false', () => {
      battleUIIntegration.updateConfig({ showDamageNumbers: false });

      const position = { x: 5, y: 5 };
      battleUIIntegration.showDamageAtPosition(position, 25, DamageType.PHYSICAL);

      expect(mockUIManager.showDamageNumber).not.toHaveBeenCalled();
    });
  });

  describe('Error Message Translation', () => {
    test('should translate battle errors to user-friendly messages', () => {
      const errorCases = [
        { error: BattleError.INVALID_ATTACKER, expected: 'Cannot attack with this unit' },
        { error: BattleError.OUT_OF_RANGE, expected: 'Target is out of range' },
        { error: BattleError.ALREADY_ACTED, expected: 'Unit has already acted this turn' },
        { error: BattleError.NO_WEAPON_EQUIPPED, expected: 'No weapon equipped' },
      ];

      errorCases.forEach(({ error, expected }) => {
        // Create a fresh integration for each test case
        const freshIntegration = new BattleUIIntegration(
          mockScene,
          mockBattleSystem,
          mockMapRenderer,
          mockUIManager
        );

        const errorDetails = {
          error,
          message: 'Technical error message',
          context: { attacker: mockUnit, phase: 'target_selection' as any },
          timestamp: Date.now(),
          recoverable: true,
        };

        // Find the battle error handler from the fresh integration
        const battleErrorCall = mockBattleSystem.on.mock.calls.find(
          call => call[0] === 'battle-error'
        );

        if (battleErrorCall && battleErrorCall[1]) {
          const onBattleError = battleErrorCall[1];
          onBattleError(errorDetails);

          expect(mockUIManager.showErrorNotification).toHaveBeenCalledWith(
            expect.objectContaining({
              message: expected,
            })
          );
        }

        freshIntegration.destroy();
        jest.clearAllMocks();
      });
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should clean up resources on destroy', () => {
      battleUIIntegration.initialize();
      battleUIIntegration.destroy();

      expect(mockBattleSystem.removeAllListeners).toHaveBeenCalled();
      expect(mockMapRenderer.clearHighlights).toHaveBeenCalled();
      expect(mockUIManager.hideBattleStatus).toHaveBeenCalled();
      expect(mockUIManager.hideBattleResult).toHaveBeenCalled();
      expect(mockUIManager.hideErrorNotification).toHaveBeenCalled();
      expect(battleUIIntegration.isActive()).toBe(false);
      expect(battleUIIntegration.getCurrentPhase()).toBe('idle');
    });
  });
});
