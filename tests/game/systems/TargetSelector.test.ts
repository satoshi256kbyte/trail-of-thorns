/**
 * Unit tests for TargetSelector class
 * Tests target selection functionality, validation, and area attack handling
 */

import { TargetSelector } from '../../../game/src/systems/TargetSelector';
import { AttackRangeCalculator } from '../../../game/src/systems/AttackRangeCalculator';
import { Unit, Position, MapData } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element, BattleError } from '../../../game/src/types/battle';

describe('TargetSelector', () => {
  let targetSelector: TargetSelector;
  let mockAttackRangeCalculator: jest.Mocked<AttackRangeCalculator>;
  let mockAttacker: Unit;
  let mockTarget: Unit;
  let mockEnemyTarget: Unit;
  let mockWeapon: Weapon;
  let mockAreaWeapon: Weapon;
  let mockAllUnits: Unit[];
  let mockMapData: MapData;

  beforeEach(() => {
    // Create mock AttackRangeCalculator
    mockAttackRangeCalculator = {
      calculateAttackRange: jest.fn(),
      calculateAreaOfEffect: jest.fn(),
      isAttackBlocked: jest.fn(),
      getWeaponRangePattern: jest.fn(),
      setMapRenderer: jest.fn(),
      updateConfig: jest.fn(),
      getConfig: jest.fn(),
      getAttackingPositions: jest.fn(),
      calculateThreatRange: jest.fn(),
      isPositionThreatened: jest.fn(),
    } as any;

    // Create mock units
    mockAttacker = {
      id: 'attacker-1',
      name: 'Test Attacker',
      position: { x: 5, y: 5 },
      stats: { maxHP: 100, maxMP: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    mockTarget = {
      id: 'target-1',
      name: 'Test Target',
      position: { x: 6, y: 5 },
      stats: { maxHP: 80, maxMP: 30, attack: 15, defense: 12, speed: 8, movement: 2 },
      currentHP: 80,
      currentMP: 30,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    mockEnemyTarget = {
      id: 'enemy-1',
      name: 'Test Enemy',
      position: { x: 7, y: 5 },
      stats: { maxHP: 60, maxMP: 20, attack: 18, defense: 10, speed: 12, movement: 4 },
      currentHP: 60,
      currentMP: 20,
      faction: 'enemy',
      hasActed: false,
      hasMoved: false,
    };

    // Create mock weapons
    mockWeapon = {
      id: 'sword-1',
      name: 'Test Sword',
      type: WeaponType.SWORD,
      attackPower: 25,
      range: 1,
      rangePattern: {
        type: 'single',
        range: 1,
        pattern: [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ],
      },
      element: Element.NONE,
      criticalRate: 10,
      accuracy: 90,
      specialEffects: [],
      description: 'A basic sword',
    };

    mockAreaWeapon = {
      id: 'staff-1',
      name: 'Area Staff',
      type: WeaponType.STAFF,
      attackPower: 20,
      range: 3,
      rangePattern: {
        type: 'area',
        range: 3,
        pattern: [{ x: 0, y: 0 }],
        areaOfEffect: 1,
      },
      element: Element.FIRE,
      criticalRate: 5,
      accuracy: 85,
      specialEffects: [],
      description: 'A staff with area effect',
    };

    mockAllUnits = [mockAttacker, mockTarget, mockEnemyTarget];

    mockMapData = {
      width: 20,
      height: 20,
      tileSize: 32,
      layers: [],
      playerSpawns: [],
      enemySpawns: [],
    };

    // Create TargetSelector instance
    targetSelector = new TargetSelector(mockAttackRangeCalculator);

    // Setup default mock behaviors
    mockAttackRangeCalculator.calculateAttackRange.mockReturnValue({
      validPositions: [
        { x: 6, y: 5 },
        { x: 7, y: 5 },
        { x: 4, y: 5 },
        { x: 5, y: 4 },
        { x: 5, y: 6 },
      ],
      blockedPositions: [],
      weapon: mockWeapon,
      attacker: mockAttacker,
    });

    mockAttackRangeCalculator.calculateAreaOfEffect.mockReturnValue([
      { x: 7, y: 5 },
      { x: 6, y: 5 },
      { x: 8, y: 5 },
      { x: 7, y: 4 },
      { x: 7, y: 6 },
    ]);

    mockAttackRangeCalculator.isAttackBlocked.mockReturnValue(false);
  });

  describe('Constructor and Initialization', () => {
    test('should create TargetSelector with default configuration', () => {
      const selector = new TargetSelector(mockAttackRangeCalculator);
      const config = selector.getConfig();

      expect(config.allowFriendlyFire).toBe(false);
      expect(config.requireLineOfSight).toBe(true);
      expect(config.highlightAreaTargets).toBe(true);
      expect(config.maxTargetsPerAttack).toBe(10);
    });

    test('should create TargetSelector with custom configuration', () => {
      const customConfig = {
        allowFriendlyFire: true,
        requireLineOfSight: false,
        maxTargetsPerAttack: 5,
      };

      const selector = new TargetSelector(mockAttackRangeCalculator, customConfig);
      const config = selector.getConfig();

      expect(config.allowFriendlyFire).toBe(true);
      expect(config.requireLineOfSight).toBe(false);
      expect(config.highlightAreaTargets).toBe(true); // default value
      expect(config.maxTargetsPerAttack).toBe(5);
    });
  });

  describe('initializeSelection', () => {
    test('should initialize selection successfully with valid inputs', () => {
      const result = targetSelector.initializeSelection(
        mockAttacker,
        mockWeapon,
        mockAllUnits,
        mockMapData
      );

      expect(mockAttackRangeCalculator.calculateAttackRange).toHaveBeenCalledWith(
        mockAttacker,
        mockWeapon,
        mockMapData
      );

      expect(result.validTargets).toHaveLength(1); // Only enemy target should be valid
      expect(result.validTargets[0].id).toBe('enemy-1');
      expect(result.selectedTarget).toBeUndefined();
      expect(result.areaTargets).toHaveLength(0);
      expect(result.attackRange).toHaveLength(5);
    });

    test('should throw error for invalid attacker', () => {
      const invalidAttacker = { ...mockAttacker, currentHP: 0 };

      expect(() => {
        targetSelector.initializeSelection(invalidAttacker, mockWeapon, mockAllUnits, mockMapData);
      }).toThrow('INVALID_ATTACKER');
    });

    test('should throw error for attacker who has already acted', () => {
      const actedAttacker = { ...mockAttacker, hasActed: true };

      expect(() => {
        targetSelector.initializeSelection(actedAttacker, mockWeapon, mockAllUnits, mockMapData);
      }).toThrow('ALREADY_ACTED');
    });

    test('should throw error for null weapon', () => {
      expect(() => {
        targetSelector.initializeSelection(mockAttacker, null as any, mockAllUnits, mockMapData);
      }).toThrow('NO_WEAPON_EQUIPPED');
    });

    test('should throw error for broken weapon', () => {
      const brokenWeapon = { ...mockWeapon, durability: 0 };

      expect(() => {
        targetSelector.initializeSelection(mockAttacker, brokenWeapon, mockAllUnits, mockMapData);
      }).toThrow('WEAPON_BROKEN');
    });
  });

  describe('getValidTargets', () => {
    beforeEach(() => {
      targetSelector.initializeSelection(mockAttacker, mockWeapon, mockAllUnits, mockMapData);
    });

    test('should return only enemy targets by default', () => {
      const attackRange = [
        { x: 6, y: 5 },
        { x: 7, y: 5 },
      ];
      const validTargets = targetSelector.getValidTargets(mockAttacker, attackRange);

      expect(validTargets).toHaveLength(1);
      expect(validTargets[0].faction).toBe('enemy');
      expect(validTargets[0].id).toBe('enemy-1');
    });

    test('should exclude attacker from valid targets', () => {
      const attackRange = [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 7, y: 5 },
      ];
      const validTargets = targetSelector.getValidTargets(mockAttacker, attackRange);

      expect(validTargets.every(target => target.id !== mockAttacker.id)).toBe(true);
    });

    test('should exclude targets outside attack range', () => {
      const limitedRange = [{ x: 6, y: 5 }]; // Only includes friendly target position
      const validTargets = targetSelector.getValidTargets(mockAttacker, limitedRange);

      expect(validTargets).toHaveLength(0); // No enemy targets in range
    });

    test('should exclude defeated targets', () => {
      const defeatedEnemy = { ...mockEnemyTarget, currentHP: 0 };
      const unitsWithDefeated = [mockAttacker, mockTarget, defeatedEnemy];

      targetSelector.initializeSelection(mockAttacker, mockWeapon, unitsWithDefeated, mockMapData);
      const attackRange = [{ x: 7, y: 5 }];
      const validTargets = targetSelector.getValidTargets(mockAttacker, attackRange);

      expect(validTargets).toHaveLength(0);
    });

    test('should include friendly targets when friendly fire is allowed', () => {
      const friendlyFireSelector = new TargetSelector(mockAttackRangeCalculator, {
        allowFriendlyFire: true,
      });

      friendlyFireSelector.initializeSelection(mockAttacker, mockWeapon, mockAllUnits, mockMapData);
      const attackRange = [
        { x: 6, y: 5 },
        { x: 7, y: 5 },
      ];
      const validTargets = friendlyFireSelector.getValidTargets(mockAttacker, attackRange);

      expect(validTargets).toHaveLength(2); // Both friendly and enemy targets
      expect(validTargets.some(target => target.faction === 'player')).toBe(true);
      expect(validTargets.some(target => target.faction === 'enemy')).toBe(true);
    });

    test('should exclude blocked targets when line of sight is required', () => {
      mockAttackRangeCalculator.isAttackBlocked.mockReturnValue(true);

      const attackRange = [{ x: 7, y: 5 }];
      const validTargets = targetSelector.getValidTargets(mockAttacker, attackRange);

      expect(validTargets).toHaveLength(0);
      expect(mockAttackRangeCalculator.isAttackBlocked).toHaveBeenCalledWith(
        mockAttacker.position,
        mockEnemyTarget.position
      );
    });
  });

  describe('selectTarget', () => {
    beforeEach(() => {
      targetSelector.initializeSelection(mockAttacker, mockWeapon, mockAllUnits, mockMapData);
    });

    test('should select valid target successfully', () => {
      const result = targetSelector.selectTarget(mockEnemyTarget);

      expect(result).toBe(true);

      const selectionState = targetSelector.getSelectionState();
      expect(selectionState.selectedTarget?.id).toBe('enemy-1');
      expect(selectionState.areaTargets).toHaveLength(1);
      expect(selectionState.areaTargets[0].id).toBe('enemy-1');
    });

    test('should throw error when selecting invalid target', () => {
      expect(() => {
        targetSelector.selectTarget(mockTarget); // Friendly target
      }).toThrow('INVALID_TARGET');
    });

    test('should throw error when no selection is active', () => {
      targetSelector.clearSelection();

      expect(() => {
        targetSelector.selectTarget(mockEnemyTarget);
      }).toThrow('No active target selection');
    });

    test('should calculate area targets for area weapons', () => {
      // Initialize with area weapon
      targetSelector.initializeSelection(mockAttacker, mockAreaWeapon, mockAllUnits, mockMapData);

      // Add more units for area effect testing
      const additionalEnemy = {
        ...mockEnemyTarget,
        id: 'enemy-2',
        position: { x: 8, y: 5 },
      };
      const unitsWithArea = [...mockAllUnits, additionalEnemy];

      targetSelector.initializeSelection(mockAttacker, mockAreaWeapon, unitsWithArea, mockMapData);
      targetSelector.selectTarget(mockEnemyTarget);

      const selectionState = targetSelector.getSelectionState();
      expect(mockAttackRangeCalculator.calculateAreaOfEffect).toHaveBeenCalledWith(
        mockEnemyTarget.position,
        mockAreaWeapon,
        mockMapData
      );
      expect(selectionState.areaTargets.length).toBeGreaterThan(0);
    });
  });

  describe('getAreaTargets', () => {
    test('should return units within area of effect', () => {
      const centerPosition = { x: 7, y: 5 };
      const additionalEnemy = {
        ...mockEnemyTarget,
        id: 'enemy-2',
        position: { x: 8, y: 5 },
      };
      const unitsWithArea = [...mockAllUnits, additionalEnemy];

      targetSelector.initializeSelection(mockAttacker, mockAreaWeapon, unitsWithArea, mockMapData);

      const areaTargets = targetSelector.getAreaTargets(centerPosition, mockAreaWeapon);

      expect(mockAttackRangeCalculator.calculateAreaOfEffect).toHaveBeenCalledWith(
        centerPosition,
        mockAreaWeapon,
        mockMapData
      );
      expect(areaTargets.length).toBeGreaterThan(0);
      expect(areaTargets.every(target => target.id !== mockAttacker.id)).toBe(true);
    });

    test('should exclude attacker from area targets', () => {
      const centerPosition = mockAttacker.position;

      // Mock area effect to include attacker position
      mockAttackRangeCalculator.calculateAreaOfEffect.mockReturnValue([
        mockAttacker.position,
        mockEnemyTarget.position,
      ]);

      targetSelector.initializeSelection(mockAttacker, mockAreaWeapon, mockAllUnits, mockMapData);
      const areaTargets = targetSelector.getAreaTargets(centerPosition, mockAreaWeapon);

      expect(areaTargets.every(target => target.id !== mockAttacker.id)).toBe(true);
    });

    test('should respect max targets per attack limit', () => {
      const limitedSelector = new TargetSelector(mockAttackRangeCalculator, {
        maxTargetsPerAttack: 1,
      });

      // Create many enemy units
      const manyEnemies = Array.from({ length: 5 }, (_, i) => ({
        ...mockEnemyTarget,
        id: `enemy-${i}`,
        position: { x: 7 + i, y: 5 },
      }));

      const allUnitsWithMany = [mockAttacker, ...manyEnemies];

      // Mock area effect to include all enemies
      mockAttackRangeCalculator.calculateAreaOfEffect.mockReturnValue(
        manyEnemies.map(enemy => enemy.position)
      );

      limitedSelector.initializeSelection(
        mockAttacker,
        mockAreaWeapon,
        allUnitsWithMany,
        mockMapData
      );
      const areaTargets = limitedSelector.getAreaTargets({ x: 7, y: 5 }, mockAreaWeapon);

      expect(areaTargets).toHaveLength(1); // Limited by maxTargetsPerAttack
    });

    test('should include friendly units when friendly fire is allowed', () => {
      const friendlyFireSelector = new TargetSelector(mockAttackRangeCalculator, {
        allowFriendlyFire: true,
      });

      // Mock area effect to include friendly target
      mockAttackRangeCalculator.calculateAreaOfEffect.mockReturnValue([
        mockTarget.position,
        mockEnemyTarget.position,
      ]);

      friendlyFireSelector.initializeSelection(
        mockAttacker,
        mockAreaWeapon,
        mockAllUnits,
        mockMapData
      );
      const areaTargets = friendlyFireSelector.getAreaTargets({ x: 6, y: 5 }, mockAreaWeapon);

      expect(areaTargets.some(target => target.faction === 'player')).toBe(true);
    });
  });

  describe('clearSelection', () => {
    test('should reset selection state', () => {
      // Initialize and select target
      targetSelector.initializeSelection(mockAttacker, mockWeapon, mockAllUnits, mockMapData);
      targetSelector.selectTarget(mockEnemyTarget);

      // Verify selection is active
      let selectionState = targetSelector.getSelectionState();
      expect(selectionState.isSelectionActive).toBe(true);
      expect(selectionState.selectedTarget).not.toBeNull();

      // Clear selection
      targetSelector.clearSelection();

      // Verify selection is cleared
      selectionState = targetSelector.getSelectionState();
      expect(selectionState.isSelectionActive).toBe(false);
      expect(selectionState.selectedTarget).toBeNull();
      expect(selectionState.attacker).toBeNull();
      expect(selectionState.weapon).toBeNull();
      expect(selectionState.validTargets).toHaveLength(0);
      expect(selectionState.areaTargets).toHaveLength(0);
      expect(selectionState.attackRange).toHaveLength(0);
    });
  });

  describe('canTargetUnit', () => {
    test('should return true for valid targets', () => {
      targetSelector.initializeSelection(mockAttacker, mockWeapon, mockAllUnits, mockMapData);

      expect(targetSelector.canTargetUnit(mockEnemyTarget)).toBe(true);
      expect(targetSelector.canTargetUnit(mockTarget)).toBe(false); // Friendly unit
    });

    test('should return false when no selection is active', () => {
      expect(targetSelector.canTargetUnit(mockEnemyTarget)).toBe(false);
    });
  });

  describe('getOptimalTarget', () => {
    let nearEnemy: Unit;
    let farEnemy: Unit;
    let weakEnemy: Unit;
    let strongEnemy: Unit;

    beforeEach(() => {
      nearEnemy = {
        ...mockEnemyTarget,
        id: 'near-enemy',
        position: { x: 6, y: 5 },
        currentHP: 50,
      };

      farEnemy = {
        ...mockEnemyTarget,
        id: 'far-enemy',
        position: { x: 8, y: 8 },
        currentHP: 60,
      };

      weakEnemy = {
        ...mockEnemyTarget,
        id: 'weak-enemy',
        position: { x: 7, y: 5 },
        currentHP: 20,
      };

      strongEnemy = {
        ...mockEnemyTarget,
        id: 'strong-enemy',
        position: { x: 7, y: 6 },
        currentHP: 100,
      };

      const allEnemies = [mockAttacker, nearEnemy, farEnemy, weakEnemy, strongEnemy];

      // Mock attack range to include all enemies
      mockAttackRangeCalculator.calculateAttackRange.mockReturnValue({
        validPositions: [
          { x: 6, y: 5 },
          { x: 8, y: 8 },
          { x: 7, y: 5 },
          { x: 7, y: 6 },
        ],
        blockedPositions: [],
        weapon: mockWeapon,
        attacker: mockAttacker,
      });

      targetSelector.initializeSelection(mockAttacker, mockWeapon, allEnemies, mockMapData);
    });

    test('should return nearest target by default', () => {
      const optimal = targetSelector.getOptimalTarget();
      expect(optimal?.id).toBe('near-enemy');
    });

    test('should return nearest target when specified', () => {
      const optimal = targetSelector.getOptimalTarget('nearest');
      expect(optimal?.id).toBe('near-enemy');
    });

    test('should return weakest target when specified', () => {
      const optimal = targetSelector.getOptimalTarget('weakest');
      expect(optimal?.id).toBe('weak-enemy');
    });

    test('should return strongest target when specified', () => {
      const optimal = targetSelector.getOptimalTarget('strongest');
      expect(optimal?.id).toBe('strong-enemy');
    });

    test('should return random target when specified', () => {
      const optimal = targetSelector.getOptimalTarget('random');
      expect(optimal).not.toBeNull();
      expect(['near-enemy', 'far-enemy', 'weak-enemy', 'strong-enemy']).toContain(optimal?.id);
    });

    test('should return null when no valid targets exist', () => {
      targetSelector.clearSelection();
      const optimal = targetSelector.getOptimalTarget();
      expect(optimal).toBeNull();
    });
  });

  describe('getTargetableUnitsFromPosition', () => {
    test('should return targetable units from specific position', () => {
      const position = { x: 6, y: 5 };
      const faction = 'player';

      const targetableUnits = targetSelector.getTargetableUnitsFromPosition(
        position,
        mockWeapon,
        faction
      );

      expect(mockAttackRangeCalculator.calculateAttackRange).toHaveBeenCalledWith(
        expect.objectContaining({
          position,
          faction,
        }),
        mockWeapon,
        undefined
      );

      expect(targetableUnits).toBeDefined();
    });
  });

  describe('hasValidTargets and getValidTargetCount', () => {
    test('should return correct target availability and count', () => {
      targetSelector.initializeSelection(mockAttacker, mockWeapon, mockAllUnits, mockMapData);

      expect(targetSelector.hasValidTargets()).toBe(true);
      expect(targetSelector.getValidTargetCount()).toBe(1);
    });

    test('should return false and 0 when no valid targets exist', () => {
      const onlyFriendlyUnits = [mockAttacker, mockTarget];
      targetSelector.initializeSelection(mockAttacker, mockWeapon, onlyFriendlyUnits, mockMapData);

      expect(targetSelector.hasValidTargets()).toBe(false);
      expect(targetSelector.getValidTargetCount()).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration correctly', () => {
      const newConfig = {
        allowFriendlyFire: true,
        maxTargetsPerAttack: 3,
      };

      targetSelector.updateConfig(newConfig);
      const config = targetSelector.getConfig();

      expect(config.allowFriendlyFire).toBe(true);
      expect(config.maxTargetsPerAttack).toBe(3);
      expect(config.requireLineOfSight).toBe(true); // Should retain original value
    });
  });

  describe('getCurrentSelection', () => {
    test('should return current selection result', () => {
      targetSelector.initializeSelection(mockAttacker, mockWeapon, mockAllUnits, mockMapData);
      targetSelector.selectTarget(mockEnemyTarget);

      const currentSelection = targetSelector.getCurrentSelection();

      expect(currentSelection.validTargets).toHaveLength(1);
      expect(currentSelection.selectedTarget?.id).toBe('enemy-1');
      expect(currentSelection.areaTargets).toHaveLength(1);
      expect(currentSelection.attackRange).toHaveLength(5);
    });

    test('should return empty selection when not initialized', () => {
      const currentSelection = targetSelector.getCurrentSelection();

      expect(currentSelection.validTargets).toHaveLength(0);
      expect(currentSelection.selectedTarget).toBeUndefined();
      expect(currentSelection.areaTargets).toHaveLength(0);
      expect(currentSelection.attackRange).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty unit list', () => {
      const result = targetSelector.initializeSelection(mockAttacker, mockWeapon, [], mockMapData);

      expect(result.validTargets).toHaveLength(0);
    });

    test('should handle units at same position', () => {
      const samePositionEnemy = {
        ...mockEnemyTarget,
        id: 'same-pos-enemy',
        position: { ...mockAttacker.position },
      };

      const unitsWithSamePos = [mockAttacker, samePositionEnemy];

      // Mock attack range to include attacker position
      mockAttackRangeCalculator.calculateAttackRange.mockReturnValue({
        validPositions: [mockAttacker.position],
        blockedPositions: [],
        weapon: mockWeapon,
        attacker: mockAttacker,
      });

      targetSelector.initializeSelection(mockAttacker, mockWeapon, unitsWithSamePos, mockMapData);

      expect(targetSelector.hasValidTargets()).toBe(true);
      expect(targetSelector.getValidTargetCount()).toBe(1);
    });

    test('should handle weapon without area of effect', () => {
      const noAoeWeapon = {
        ...mockWeapon,
        rangePattern: {
          ...mockWeapon.rangePattern,
          areaOfEffect: undefined,
        },
      };

      targetSelector.initializeSelection(mockAttacker, noAoeWeapon, mockAllUnits, mockMapData);
      targetSelector.selectTarget(mockEnemyTarget);

      const selectionState = targetSelector.getSelectionState();
      expect(selectionState.areaTargets).toHaveLength(1);
      expect(selectionState.areaTargets[0].id).toBe('enemy-1');
    });
  });
});
