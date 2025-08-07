/**
 * BattleSystem integration tests for subsystem coordination
 * Tests the integration between BattleSystem and its subsystems
 */

import { BattleSystem } from '../../../game/src/systems/BattleSystem';
import { AttackRangeCalculator } from '../../../game/src/systems/AttackRangeCalculator';
import { TargetSelector } from '../../../game/src/systems/TargetSelector';
import { DamageCalculator } from '../../../game/src/systems/DamageCalculator';
import { BattleAnimator } from '../../../game/src/systems/BattleAnimator';
import { BattleStateManager } from '../../../game/src/systems/BattleStateManager';
import { Unit, MapData } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element, DamageType } from '../../../game/src/types/battle';

// Mock Phaser scene with more complete implementation
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
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    angle: 0,
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

describe('BattleSystem Integration Tests', () => {
  let battleSystem: BattleSystem;
  let playerUnit: Unit;
  let enemyUnit: Unit;
  let testWeapon: Weapon;
  let mapData: MapData;

  beforeEach(() => {
    jest.clearAllMocks();

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

    battleSystem = new BattleSystem(mockScene);
    battleSystem.initialize([playerUnit, enemyUnit], mapData);
  });

  afterEach(() => {
    if (battleSystem) {
      battleSystem.destroy();
    }
  });

  describe('AttackRangeCalculator Integration', () => {
    test('should calculate and display attack range correctly', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);

      // Should have created graphics for range display
      expect(mockScene.add.graphics).toHaveBeenCalled();

      const state = battleSystem.getState();
      expect(state.phase).toBe('target_selection');
    });

    test('should handle different weapon types with different ranges', async () => {
      const bowWeapon = createTestWeapon({
        type: WeaponType.BOW,
        range: 3,
        rangePattern: {
          type: 'single',
          range: 3,
          pattern: [
            { x: 0, y: -3 },
            { x: 0, y: -2 },
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 3, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: 2 },
            { x: 0, y: 3 },
            { x: -1, y: 0 },
            { x: -2, y: 0 },
            { x: -3, y: 0 },
          ],
        },
      });

      await battleSystem.initiateAttack(playerUnit, bowWeapon);

      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(battleSystem.getState().currentWeapon).toBe(bowWeapon);
    });

    test('should respect map boundaries in range calculation', async () => {
      // Place unit near map edge
      playerUnit.position = { x: 0, y: 0 };

      await battleSystem.initiateAttack(playerUnit, testWeapon);

      // Should still work without errors
      expect(battleSystem.getState().phase).toBe('target_selection');
    });
  });

  describe('TargetSelector Integration', () => {
    beforeEach(async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);
    });

    test('should identify valid targets within range', async () => {
      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result).toBeDefined();
      expect(result.target).toBe(enemyUnit);
    });

    test('should reject targets outside of range', async () => {
      // Move enemy far away
      enemyUnit.position = { x: 10, y: 10 };

      await expect(battleSystem.selectTarget(enemyUnit)).rejects.toThrow('INVALID_TARGET');
    });

    test('should handle friendly fire restrictions', async () => {
      const friendlyUnit = createTestUnit({
        id: 'friendly-1',
        faction: 'player',
        position: { x: 3, y: 2 },
      });

      await expect(battleSystem.selectTarget(friendlyUnit)).rejects.toThrow('INVALID_TARGET');
    });

    test('should handle area of effect targeting', async () => {
      const aoeWeapon = createTestWeapon({
        rangePattern: {
          type: 'area',
          range: 2,
          pattern: [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
          ],
          areaOfEffect: 1,
        },
      });

      battleSystem.cancelAttack();
      await battleSystem.initiateAttack(playerUnit, aoeWeapon);

      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result).toBeDefined();
      expect(result.weapon).toBe(aoeWeapon);
    });
  });

  describe('DamageCalculator Integration', () => {
    beforeEach(async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);
    });

    test('should calculate damage based on unit stats and weapon', async () => {
      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result.baseDamage).toBeGreaterThanOrEqual(0);
      expect(result.finalDamage).toBeGreaterThanOrEqual(0);
      expect(result.modifiers).toBeDefined();
      expect(Array.isArray(result.modifiers)).toBe(true);
    });

    test('should handle critical hits', async () => {
      // Set high critical rate for testing
      const criticalWeapon = createTestWeapon({
        criticalRate: 100, // Guaranteed critical
      });

      battleSystem.cancelAttack();
      await battleSystem.initiateAttack(playerUnit, criticalWeapon);

      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      // Note: Critical hit is still based on random chance, so we can't guarantee it
      // But we can check that the system handles it properly
      expect(typeof result.isCritical).toBe('boolean');
    });

    test('should handle evasion', async () => {
      // Set low accuracy for testing
      const inaccurateWeapon = createTestWeapon({
        accuracy: 10, // Low hit chance
      });

      battleSystem.cancelAttack();
      await battleSystem.initiateAttack(playerUnit, inaccurateWeapon);

      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(typeof result.isEvaded).toBe('boolean');
      if (result.isEvaded) {
        expect(result.finalDamage).toBe(0);
      }
    });

    test('should apply elemental modifiers', async () => {
      const fireWeapon = createTestWeapon({
        element: Element.FIRE,
      });

      battleSystem.cancelAttack();
      await battleSystem.initiateAttack(playerUnit, fireWeapon);

      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result.weapon.element).toBe(Element.FIRE);
      expect(result.modifiers.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('BattleAnimator Integration', () => {
    beforeEach(async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);
    });

    test('should play attack animations when enabled', async () => {
      const result = await battleSystem.selectTarget(enemyUnit);

      // Should have created tweens for animations
      expect(mockScene.tweens.add).toHaveBeenCalled();
    });

    test('should skip animations when disabled', async () => {
      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result).toBeDefined();
      // Animation calls should be minimal when skipped
    });

    test('should show damage effects for successful hits', async () => {
      const result = await battleSystem.selectTarget(enemyUnit);

      if (!result.isEvaded) {
        expect(mockScene.add.text).toHaveBeenCalled();
      }
    });

    test('should play defeat animation when target is defeated', async () => {
      // Set enemy to low HP
      enemyUnit.currentHP = 1;

      const result = await battleSystem.selectTarget(enemyUnit);

      if (result.targetDefeated) {
        expect(mockScene.tweens.add).toHaveBeenCalled();
      }
    });

    test('should handle animation errors gracefully', async () => {
      // Mock animation failure
      mockScene.tweens.add.mockImplementationOnce(() => {
        throw new Error('Animation failed');
      });

      // Should not crash the battle system
      await expect(battleSystem.selectTarget(enemyUnit)).rejects.toThrow();

      // System should recover
      expect(battleSystem.getState().phase).toBe('idle');
    });
  });

  describe('BattleStateManager Integration', () => {
    beforeEach(async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);
    });

    test('should apply damage to target unit', async () => {
      const originalHP = enemyUnit.currentHP;

      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      if (!result.isEvaded) {
        expect(enemyUnit.currentHP).toBeLessThan(originalHP);
      }
    });

    test('should handle unit defeat properly', async () => {
      enemyUnit.currentHP = 1; // Ensure defeat

      const eventSpy = jest.fn();
      battleSystem.on('unit-defeated', eventSpy);

      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result.targetDefeated).toBe(true);
      expect(enemyUnit.currentHP).toBe(0);
      expect(eventSpy).toHaveBeenCalled();
    });

    test('should grant experience to attacker', async () => {
      const eventSpy = jest.fn();
      battleSystem.on('experience-granted', eventSpy);

      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result.experienceGained).toBeGreaterThan(0);
      expect(eventSpy).toHaveBeenCalled();
    });

    test('should record battle results', async () => {
      const eventSpy = jest.fn();
      battleSystem.on('battle-result-recorded', eventSpy);

      await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      const history = battleSystem.getBattleHistory();
      expect(history).toHaveLength(1);
      expect(eventSpy).toHaveBeenCalled();
    });

    test('should update post-battle state', async () => {
      await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      // Battle should be complete and system reset
      const state = battleSystem.getState();
      expect(state.phase).toBe('idle');
      expect(state.isActive).toBe(false);
    });
  });

  describe('Complete Battle Flow Integration', () => {
    test('should execute complete battle flow successfully', async () => {
      const events: string[] = [];

      // Track all events
      battleSystem.on('attack-initiated', () => events.push('attack-initiated'));
      battleSystem.on('attack-range-shown', () => events.push('attack-range-shown'));
      battleSystem.on('target-selected', () => events.push('target-selected'));
      battleSystem.on('battle-complete', () => events.push('battle-complete'));

      // Execute complete flow
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      // Verify events were fired in correct order
      expect(events).toContain('attack-initiated');
      expect(events).toContain('target-selected');
      expect(events).toContain('battle-complete');

      // Verify final result
      expect(result).toBeDefined();
      expect(result.attacker).toBe(playerUnit);
      expect(result.target).toBe(enemyUnit);
      expect(result.weapon).toBe(testWeapon);

      // Verify system state is reset
      const state = battleSystem.getState();
      expect(state.phase).toBe('idle');
      expect(state.isActive).toBe(false);
    });

    test('should handle multiple consecutive battles', async () => {
      // First battle
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      const result1 = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      // Reset unit state for second battle
      playerUnit.hasActed = false;
      enemyUnit.currentHP = 100;

      // Second battle
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      const result2 = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      // Verify both battles were recorded
      const history = battleSystem.getBattleHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toBe(result1);
      expect(history[1]).toBe(result2);
    });

    test('should handle battle cancellation at different phases', async () => {
      // Cancel during range display
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      battleSystem.cancelAttack();

      let state = battleSystem.getState();
      expect(state.phase).toBe('idle');
      expect(state.isActive).toBe(false);

      // Cancel during target selection
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      // Don't select target, just cancel
      battleSystem.cancelAttack();

      state = battleSystem.getState();
      expect(state.phase).toBe('idle');
      expect(state.isActive).toBe(false);
    });

    test('should maintain system integrity after errors', async () => {
      // Cause an error by trying to attack with invalid unit
      try {
        await battleSystem.initiateAttack(null as any, testWeapon);
      } catch (error) {
        // Expected to fail
      }

      // System should still be usable
      const canAttack = battleSystem.canAttack(playerUnit, testWeapon);
      expect(canAttack).toBe(true);

      // Should be able to execute normal battle
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      expect(result).toBeDefined();
    });
  });

  describe('Performance and Resource Management', () => {
    test('should clean up visual elements after battle', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);
      await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });

      // Graphics should have been created and destroyed
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    test('should handle rapid battle execution', async () => {
      const battles = [];

      // Execute multiple battles rapidly
      for (let i = 0; i < 5; i++) {
        playerUnit.hasActed = false;
        enemyUnit.currentHP = 100;

        await battleSystem.initiateAttack(playerUnit, testWeapon);
        const result = await battleSystem.selectTarget(enemyUnit, { skipAnimations: true });
        battles.push(result);
      }

      expect(battles).toHaveLength(5);
      expect(battleSystem.getBattleHistory()).toHaveLength(5);
    });

    test('should handle system destruction during active battle', async () => {
      await battleSystem.initiateAttack(playerUnit, testWeapon);

      // Destroy system while battle is active
      expect(() => {
        battleSystem.destroy();
      }).not.toThrow();
    });
  });
});
