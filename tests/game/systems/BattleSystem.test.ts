/**
 * BattleSystem integration tests
 * Tests the main battle system controller and its coordination of subsystems
 */

import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { Unit, MapData } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element, BattleError } from '../../../game/src/types/battle';

// Mock Phaser scene
const mockScene = {
  add: {
    graphics: jest.fn(() => ({
      fillStyle: jest.fn(),
      lineStyle: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      destroy: jest.fn(),
    })),
    group: jest.fn(() => ({
      add: jest.fn(),
      clear: jest.fn(),
      destroy: jest.fn(),
      children: {
        entries: [],
      },
    })),
    text: jest.fn(() => ({
      setOrigin: jest.fn(),
      destroy: jest.fn(),
      x: 0,
      y: 0,
    })),
    container: jest.fn(() => ({
      add: jest.fn(),
      setAlpha: jest.fn(),
      setPosition: jest.fn(),
      destroy: jest.fn(),
      getByName: jest.fn(() => ({
        fillColor: 0,
        width: 32,
      })),
    })),
    circle: jest.fn(() => ({
      destroy: jest.fn(),
    })),
    rectangle: jest.fn(() => ({
      setName: jest.fn(),
      setStrokeStyle: jest.fn(),
    })),
  },
  tweens: {
    add: jest.fn(config => {
      // Simulate immediate completion for testing
      if (config.onComplete) {
        setTimeout(config.onComplete, 0);
      }
      return { destroy: jest.fn() };
    }),
    createTimeline: jest.fn(() => ({
      add: jest.fn(),
      play: jest.fn(),
    })),
    killTweensOf: jest.fn(),
  },
  cameras: {
    main: {
      shake: jest.fn(),
    },
  },
  time: {
    delayedCall: jest.fn(),
  },
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
} as any;

// Test data factories
const createTestUnit = (overrides: Partial<Unit> = {}): Unit => ({
  id: 'test-unit-1',
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
  sprite: {
    x: 160,
    y: 160,
    setAlpha: jest.fn(),
    setTint: jest.fn(),
  } as any,
  ...overrides,
});

const createTestWeapon = (overrides: Partial<Weapon> = {}): Weapon => ({
  id: 'test-sword',
  name: 'Test Sword',
  type: WeaponType.SWORD,
  attackPower: 15,
  range: 1,
  rangePattern: {
    type: 'single',
    range: 1,
    pattern: [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ],
  },
  element: Element.NONE,
  criticalRate: 10,
  accuracy: 90,
  specialEffects: [],
  description: 'A test sword',
  ...overrides,
});

const createTestMapData = (): MapData => ({
  width: 10,
  height: 10,
  tiles: Array(10)
    .fill(null)
    .map(() => Array(10).fill({ type: 'grass', movementCost: 1 })),
  units: [],
});

describe('BattleSystem', () => {
  let battleSystem: BattleSystem;
  let playerUnit: Unit;
  let enemyUnit: Unit;
  let testWeapon: Weapon;
  let mapData: MapData;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create test data
    playerUnit = createTestUnit({
      id: 'player-1',
      name: 'Player Unit',
      faction: 'player',
      position: { x: 2, y: 2 },
    });

    enemyUnit = createTestUnit({
      id: 'enemy-1',
      name: 'Enemy Unit',
      faction: 'enemy',
      position: { x: 3, y: 2 },
    });

    testWeapon = createTestWeapon();
    mapData = createTestMapData();

    // Create battle system
    battleSystem = new BattleSystem(mockScene);
    battleSystem.initialize([playerUnit, enemyUnit], mapData);
  });

  afterEach(() => {
    if (battleSystem) {
      battleSystem.destroy();
    }
  });

  describe('Initialization', () => {
    test('should initialize with units and map data', () => {
      const newBattleSystem = new BattleSystem(mockScene);
      const units = [playerUnit, enemyUnit];

      newBattleSystem.initialize(units, mapData);

      expect(newBattleSystem.getState().phase).toBe('idle');
      expect(newBattleSystem.isActive()).toBe(false);

      newBattleSystem.destroy();
    });

    test('should initialize with default configuration', () => {
      const config = battleSystem.getConfig();

      expect(config.enableAnimations).toBe(true);
      expect(config.enableSoundEffects).toBe(true);
      expect(config.battleSpeed).toBe(1.0);
      expect(config.enableBattleLogging).toBe(true);
    });

    test('should accept custom configuration', () => {
      const customConfig = {
        enableAnimations: false,
        battleSpeed: 2.0,
        enableBattleLogging: false,
      };

      const customBattleSystem = new BattleSystem(mockScene, customConfig);
      const config = customBattleSystem.getConfig();

      expect(config.enableAnimations).toBe(false);
      expect(config.battleSpeed).toBe(2.0);
      expect(config.enableBattleLogging).toBe(false);
      expect(config.enableSoundEffects).toBe(true); // Should keep default

      customBattleSystem.destroy();
    });
  });

  describe('Attack Initiation', () => {
    test('should initiate attack successfully', async () => {
      const eventSpy = jest.fn();
      battleSystem.on('attack-initiated', eventSpy);

      await battleSystem.initiateAttack(playerUnit, testWeapon);

      const state = battleSystem.getState();
      expect(state.phase).toBe('target_selection');
      expect(state.currentAttacker).toBe(playerUnit);
      expect(state.currentWeapon).toBe(testWeapon);
      expect(state.isActive).toBe(true);
      expect(eventSpy).toHaveBeenCalled();
    });

    test('should reject attack from defeated unit', async () => {
      playerUnit.currentHP = 0;

      await expect(battleSystem.initiateAttack(playerUnit, testWeapon)).rejects.toThrow(
        'INVALID_ATTACKER'
      );
    });

    test('should reject attack from unit that has already acted', async () => {
      playerUnit.hasActed = true;

      await expect(battleSystem.initiateAttack(playerUnit, testWeapon)).rejects.toThrow(
        'ALREADY_ACTED'
      );
    });

    test('should reject attack without weapon', async () => {
      await expect(battleSystem.initiateAttack(playerUnit)).rejects.toThrow('NO_WEAPON_EQUIPPED');
    });

    test('should show attack range visually', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);

      expect(mockScene.add.graphics).toHaveBeenCalled();
    });
  });

  describe('Attack Range Display', () => {
    test('should show attack range for weapon', () => {
      const eventSpy = jest.fn();
      battleSystem.on('attack-range-shown', eventSpy);

      battleSystem.showAttackRange(playerUnit, testWeapon);

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          attacker: playerUnit,
          weapon: testWeapon,
          rangePositions: expect.any(Array),
        })
      );
    });

    test('should clear previous range highlights', async () => {
      // Show range twice
      battleSystem.showAttackRange(playerUnit, testWeapon);
      battleSystem.showAttackRange(playerUnit, testWeapon);

      // Should have called graphics creation multiple times
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(2);
    });

    test('should handle range calculation errors gracefully', () => {
      const invalidWeapon = { ...testWeapon, range: -1 };

      expect(() => {
        battleSystem.showAttackRange(playerUnit, invalidWeapon as Weapon);
      }).not.toThrow();
    });
  });

  describe('Target Selection and Battle Execution', () => {
    beforeEach(async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);
    });

    test('should select target and execute battle', async () => {
      const eventSpy = jest.fn();
      battleSystem.on('target-selected', eventSpy);
      battleSystem.on('battle-complete', eventSpy);

      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result).toBeDefined();
      expect(result.attacker).toBe(playerUnit);
      expect(result.target).toBe(enemyUnit);
      expect(result.weapon).toBe(testWeapon);
      expect(typeof result.finalDamage).toBe('number');
      expect(typeof result.isCritical).toBe('boolean');
      expect(typeof result.isEvaded).toBe('boolean');
      expect(eventSpy).toHaveBeenCalledTimes(2);
    });

    test('should reject invalid target selection', async () => {
      const invalidTarget = createTestUnit({
        id: 'invalid-target',
        position: { x: 10, y: 10 }, // Far away
      });

      await expect(battleSystem.selectTarget(invalidTarget)).rejects.toThrow('INVALID_TARGET');
    });

    test('should handle battle execution with animations', async () => {
      const result = await battleSystem.selectTarget(enemyUnit);

      expect(result).toBeDefined();
      expect(result.finalDamage).toBeGreaterThanOrEqual(0);
    });

    test('should apply damage to target', async () => {
      const originalHP = enemyUnit.currentHP;

      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      if (!result.isEvaded) {
        expect(enemyUnit.currentHP).toBeLessThan(originalHP);
      }
    });

    test('should grant experience to attacker', async () => {
      const eventSpy = jest.fn();
      battleSystem.on('experience-granted', eventSpy);

      await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(eventSpy).toHaveBeenCalled();
    });

    test('should handle target defeat', async () => {
      // Set enemy to low HP to ensure defeat
      enemyUnit.currentHP = 1;

      const eventSpy = jest.fn();
      battleSystem.on('unit-defeated', eventSpy);

      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result.targetDefeated).toBe(true);
      expect(enemyUnit.currentHP).toBe(0);
      expect(eventSpy).toHaveBeenCalled();
    });

    test('should record battle result in history', async () => {
      await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      const history = battleSystem.getBattleHistory();
      expect(history).toHaveLength(1);
      expect(history[0].attacker).toBe(playerUnit);
      expect(history[0].target).toBe(enemyUnit);
    });
  });

  describe('Attack Cancellation', () => {
    test('should cancel attack and reset state', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);

      const eventSpy = jest.fn();
      battleSystem.on('attack-cancelled', eventSpy);

      battleSystem.cancelAttack();

      const state = battleSystem.getState();
      expect(state.phase).toBe('idle');
      expect(state.isActive).toBe(false);
      expect(state.currentAttacker).toBeNull();
      expect(state.currentWeapon).toBeNull();
      expect(eventSpy).toHaveBeenCalled();
    });

    test('should handle cancellation when no attack is active', () => {
      expect(() => {
        battleSystem.cancelAttack();
      }).not.toThrow();
    });
  });

  describe('Attack Capability Check', () => {
    test('should return true for valid attacker', () => {
      const canAttack = battleSystem.canAttack(playerUnit, testWeapon);
      expect(canAttack).toBe(true);
    });

    test('should return false for defeated unit', () => {
      playerUnit.currentHP = 0;
      const canAttack = battleSystem.canAttack(playerUnit, testWeapon);
      expect(canAttack).toBe(false);
    });

    test('should return false for unit that has acted', () => {
      playerUnit.hasActed = true;
      const canAttack = battleSystem.canAttack(playerUnit, testWeapon);
      expect(canAttack).toBe(false);
    });

    test('should return false for unit without weapon', () => {
      const canAttack = battleSystem.canAttack(playerUnit);
      expect(canAttack).toBe(false);
    });

    test('should return false when no valid targets exist', () => {
      // Move enemy far away
      enemyUnit.position = { x: 10, y: 10 };

      const canAttack = battleSystem.canAttack(playerUnit, testWeapon);
      expect(canAttack).toBe(false);
    });

    test('should handle broken weapon', () => {
      const brokenWeapon = { ...testWeapon, durability: 0 };
      const canAttack = battleSystem.canAttack(playerUnit, brokenWeapon);
      expect(canAttack).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should emit error events on battle system errors', async () => {
      const errorSpy = jest.fn();
      battleSystem.on('battle-error', errorSpy);

      // Try to select target without initiating attack
      try {
        await battleSystem.selectTarget(enemyUnit);
      } catch (error) {
        // Expected to throw
      }

      expect(errorSpy).toHaveBeenCalled();
    });

    test('should reset state on error', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);

      // Force an error by trying to select invalid target
      try {
        await battleSystem.selectTarget(createTestUnit({ position: { x: 10, y: 10 } }));
      } catch (error) {
        // Expected to throw
      }

      const state = battleSystem.getState();
      expect(state.phase).toBe('idle');
      expect(state.isActive).toBe(false);
    });

    test('should provide error details with context', async () => {
      const errorSpy = jest.fn();
      battleSystem.on('battle-error', errorSpy);

      try {
        await battleSystem.selectTarget(enemyUnit); // No attack initiated
      } catch (error) {
        // Expected to throw
      }

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.any(String),
          context: expect.any(Object),
          timestamp: expect.any(Number),
          recoverable: expect.any(Boolean),
          suggestedAction: expect.any(String),
        })
      );
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        enableAnimations: false,
        battleSpeed: 2.0,
      };

      const eventSpy = jest.fn();
      battleSystem.on('config-updated', eventSpy);

      battleSystem.updateConfig(newConfig);

      const config = battleSystem.getConfig();
      expect(config.enableAnimations).toBe(false);
      expect(config.battleSpeed).toBe(2.0);
      expect(eventSpy).toHaveBeenCalledWith(config);
    });
  });

  describe('State Management', () => {
    test('should track battle system state correctly', async () => {
      // Initial state
      expect(battleSystem.isActive()).toBe(false);
      expect(battleSystem.isAnimating()).toBe(false);

      // After initiating attack
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      expect(battleSystem.isActive()).toBe(true);

      // After cancelling
      battleSystem.cancelAttack();
      expect(battleSystem.isActive()).toBe(false);
    });

    test('should maintain battle history', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      const history = battleSystem.getBattleHistory();
      expect(history).toHaveLength(1);

      // Execute another battle
      playerUnit.hasActed = false; // Reset for second battle
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      const updatedHistory = battleSystem.getBattleHistory();
      expect(updatedHistory).toHaveLength(2);
    });
  });

  describe('Subsystem Integration', () => {
    test('should coordinate with AttackRangeCalculator', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);

      // Should have calculated attack range
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    test('should coordinate with TargetSelector', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);

      // Should be able to select valid target
      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });
      expect(result).toBeDefined();
    });

    test('should coordinate with DamageCalculator', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result.baseDamage).toBeGreaterThanOrEqual(0);
      expect(result.finalDamage).toBeGreaterThanOrEqual(0);
      expect(result.modifiers).toBeDefined();
    });

    test('should coordinate with BattleStateManager', async () => {
      const eventSpy = jest.fn();
      battleSystem.on('battle-result-recorded', eventSpy);

      await battleSystem.initiateAttack(playerUnit, testWeapon);
      await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should clean up resources on destroy', () => {
      battleSystem.destroy();

      const state = battleSystem.getState();
      expect(state.phase).toBe('idle');
      expect(state.isActive).toBe(false);
    });

    test('should handle destroy when battle is active', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);

      expect(() => {
        battleSystem.destroy();
      }).not.toThrow();
    });
  });
});
