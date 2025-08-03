/**
 * Unit tests for movement system types and utilities
 */

import {
  Position,
  MovementState,
  TerrainCost,
  MovementAnimationConfig,
  MovementError,
  MovementErrorDetails,
  PositionUtils,
} from '../../../game/src/types/movement';
import { Unit } from '../../../game/src/types/gameplay';

describe('Movement Types', () => {
  describe('MovementState', () => {
    it('should have correct structure', () => {
      const mockUnit: Unit = {
        id: 'test-unit',
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
        faction: 'player',
        hasActed: false,
        hasMoved: false,
      };

      const movementState: MovementState = {
        selectedCharacter: mockUnit,
        movementRange: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        currentPath: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        isMoving: false,
        movementMode: 'selecting',
      };

      expect(movementState.selectedCharacter).toBe(mockUnit);
      expect(movementState.movementRange).toHaveLength(2);
      expect(movementState.currentPath).toHaveLength(2);
      expect(movementState.isMoving).toBe(false);
      expect(movementState.movementMode).toBe('selecting');
    });

    it('should allow null selectedCharacter', () => {
      const movementState: MovementState = {
        selectedCharacter: null,
        movementRange: [],
        currentPath: [],
        isMoving: false,
        movementMode: 'none',
      };

      expect(movementState.selectedCharacter).toBeNull();
      expect(movementState.movementMode).toBe('none');
    });
  });

  describe('TerrainCost', () => {
    it('should define terrain costs correctly', () => {
      const terrainCost: TerrainCost = {
        grass: { movementCost: 1, isPassable: true },
        forest: { movementCost: 2, isPassable: true },
        mountain: { movementCost: 3, isPassable: true },
        water: { movementCost: 0, isPassable: false },
        wall: { movementCost: 0, isPassable: false },
      };

      expect(terrainCost.grass.movementCost).toBe(1);
      expect(terrainCost.grass.isPassable).toBe(true);
      expect(terrainCost.water.isPassable).toBe(false);
      expect(terrainCost.mountain.movementCost).toBe(3);
    });
  });

  describe('MovementAnimationConfig', () => {
    it('should have correct animation properties', () => {
      const config: MovementAnimationConfig = {
        moveSpeed: 200,
        turnSpeed: Math.PI,
        easing: 'Power2',
        stepDelay: 100,
      };

      expect(config.moveSpeed).toBe(200);
      expect(config.turnSpeed).toBe(Math.PI);
      expect(config.easing).toBe('Power2');
      expect(config.stepDelay).toBe(100);
    });
  });

  describe('MovementError enum', () => {
    it('should contain all expected error types', () => {
      expect(MovementError.CHARACTER_ALREADY_MOVED).toBe('CHARACTER_ALREADY_MOVED');
      expect(MovementError.DESTINATION_UNREACHABLE).toBe('DESTINATION_UNREACHABLE');
      expect(MovementError.DESTINATION_OCCUPIED).toBe('DESTINATION_OCCUPIED');
      expect(MovementError.INSUFFICIENT_MOVEMENT_POINTS).toBe('INSUFFICIENT_MOVEMENT_POINTS');
      expect(MovementError.INVALID_CHARACTER_SELECTION).toBe('INVALID_CHARACTER_SELECTION');
      expect(MovementError.MOVEMENT_IN_PROGRESS).toBe('MOVEMENT_IN_PROGRESS');
      expect(MovementError.INVALID_POSITION).toBe('INVALID_POSITION');
      expect(MovementError.PATH_BLOCKED).toBe('PATH_BLOCKED');
    });
  });

  describe('MovementErrorDetails', () => {
    it('should structure error details correctly', () => {
      const errorDetails: MovementErrorDetails = {
        error: MovementError.DESTINATION_UNREACHABLE,
        message: 'The selected destination is not reachable',
        position: { x: 5, y: 5 },
      };

      expect(errorDetails.error).toBe(MovementError.DESTINATION_UNREACHABLE);
      expect(errorDetails.message).toBe('The selected destination is not reachable');
      expect(errorDetails.position).toEqual({ x: 5, y: 5 });
    });
  });
});

describe('PositionUtils', () => {
  describe('equals', () => {
    it('should return true for equal positions', () => {
      const pos1: Position = { x: 5, y: 3 };
      const pos2: Position = { x: 5, y: 3 };

      expect(PositionUtils.equals(pos1, pos2)).toBe(true);
    });

    it('should return false for different positions', () => {
      const pos1: Position = { x: 5, y: 3 };
      const pos2: Position = { x: 5, y: 4 };

      expect(PositionUtils.equals(pos1, pos2)).toBe(false);
    });
  });

  describe('manhattanDistance', () => {
    it('should calculate correct Manhattan distance', () => {
      const pos1: Position = { x: 0, y: 0 };
      const pos2: Position = { x: 3, y: 4 };

      expect(PositionUtils.manhattanDistance(pos1, pos2)).toBe(7);
    });

    it('should return 0 for same position', () => {
      const pos: Position = { x: 5, y: 5 };

      expect(PositionUtils.manhattanDistance(pos, pos)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const pos1: Position = { x: -2, y: -3 };
      const pos2: Position = { x: 1, y: 2 };

      expect(PositionUtils.manhattanDistance(pos1, pos2)).toBe(8);
    });
  });

  describe('euclideanDistance', () => {
    it('should calculate correct Euclidean distance', () => {
      const pos1: Position = { x: 0, y: 0 };
      const pos2: Position = { x: 3, y: 4 };

      expect(PositionUtils.euclideanDistance(pos1, pos2)).toBe(5);
    });

    it('should return 0 for same position', () => {
      const pos: Position = { x: 5, y: 5 };

      expect(PositionUtils.euclideanDistance(pos, pos)).toBe(0);
    });
  });

  describe('getAdjacentPositions', () => {
    it('should return 4 adjacent positions', () => {
      const center: Position = { x: 5, y: 5 };
      const adjacent = PositionUtils.getAdjacentPositions(center);

      expect(adjacent).toHaveLength(4);
      expect(adjacent).toContainEqual({ x: 5, y: 4 }); // North
      expect(adjacent).toContainEqual({ x: 6, y: 5 }); // East
      expect(adjacent).toContainEqual({ x: 5, y: 6 }); // South
      expect(adjacent).toContainEqual({ x: 4, y: 5 }); // West
    });

    it('should handle edge positions', () => {
      const corner: Position = { x: 0, y: 0 };
      const adjacent = PositionUtils.getAdjacentPositions(corner);

      expect(adjacent).toHaveLength(4);
      expect(adjacent).toContainEqual({ x: 0, y: -1 });
      expect(adjacent).toContainEqual({ x: 1, y: 0 });
      expect(adjacent).toContainEqual({ x: 0, y: 1 });
      expect(adjacent).toContainEqual({ x: -1, y: 0 });
    });
  });

  describe('getPositionsInRange', () => {
    it('should return positions within Manhattan distance', () => {
      const center: Position = { x: 2, y: 2 };
      const positions = PositionUtils.getPositionsInRange(center, 1);

      expect(positions).toContainEqual({ x: 2, y: 2 }); // Center
      expect(positions).toContainEqual({ x: 1, y: 2 }); // West
      expect(positions).toContainEqual({ x: 3, y: 2 }); // East
      expect(positions).toContainEqual({ x: 2, y: 1 }); // North
      expect(positions).toContainEqual({ x: 2, y: 3 }); // South
      expect(positions).toHaveLength(5);
    });

    it('should return only center for range 0', () => {
      const center: Position = { x: 5, y: 5 };
      const positions = PositionUtils.getPositionsInRange(center, 0);

      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual(center);
    });

    it('should return correct count for range 2', () => {
      const center: Position = { x: 0, y: 0 };
      const positions = PositionUtils.getPositionsInRange(center, 2);

      // Range 2 should include 13 positions in diamond shape
      expect(positions.length).toBe(13);
      expect(positions).toContainEqual({ x: 0, y: 0 });
      expect(positions).toContainEqual({ x: 2, y: 0 });
      expect(positions).toContainEqual({ x: 0, y: 2 });
      expect(positions).toContainEqual({ x: -2, y: 0 });
      expect(positions).toContainEqual({ x: 0, y: -2 });
    });
  });

  describe('isValidPosition', () => {
    it('should return true for valid positions', () => {
      expect(PositionUtils.isValidPosition({ x: 0, y: 0 }, 10, 10)).toBe(true);
      expect(PositionUtils.isValidPosition({ x: 5, y: 7 }, 10, 10)).toBe(true);
      expect(PositionUtils.isValidPosition({ x: 9, y: 9 }, 10, 10)).toBe(true);
    });

    it('should return false for invalid positions', () => {
      expect(PositionUtils.isValidPosition({ x: -1, y: 0 }, 10, 10)).toBe(false);
      expect(PositionUtils.isValidPosition({ x: 0, y: -1 }, 10, 10)).toBe(false);
      expect(PositionUtils.isValidPosition({ x: 10, y: 0 }, 10, 10)).toBe(false);
      expect(PositionUtils.isValidPosition({ x: 0, y: 10 }, 10, 10)).toBe(false);
    });
  });

  describe('toKey and fromKey', () => {
    it('should convert position to key and back', () => {
      const position: Position = { x: 15, y: 23 };
      const key = PositionUtils.toKey(position);
      const restored = PositionUtils.fromKey(key);

      expect(key).toBe('15,23');
      expect(restored).toEqual(position);
    });

    it('should handle negative coordinates', () => {
      const position: Position = { x: -5, y: -10 };
      const key = PositionUtils.toKey(position);
      const restored = PositionUtils.fromKey(key);

      expect(key).toBe('-5,-10');
      expect(restored).toEqual(position);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const original: Position = { x: 10, y: 20 };
      const copy = PositionUtils.clone(original);

      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);

      copy.x = 30;
      expect(original.x).toBe(10);
    });
  });

  describe('add', () => {
    it('should add positions correctly', () => {
      const pos1: Position = { x: 3, y: 5 };
      const pos2: Position = { x: 2, y: -1 };
      const result = PositionUtils.add(pos1, pos2);

      expect(result).toEqual({ x: 5, y: 4 });
    });
  });

  describe('subtract', () => {
    it('should subtract positions correctly', () => {
      const pos1: Position = { x: 10, y: 8 };
      const pos2: Position = { x: 3, y: 2 };
      const result = PositionUtils.subtract(pos1, pos2);

      expect(result).toEqual({ x: 7, y: 6 });
    });
  });

  describe('getDirection', () => {
    it('should calculate normalized direction vector', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 3, y: 4 };
      const direction = PositionUtils.getDirection(from, to);

      expect(direction.x).toBeCloseTo(0.6);
      expect(direction.y).toBeCloseTo(0.8);
    });

    it('should return zero vector for same positions', () => {
      const pos: Position = { x: 5, y: 5 };
      const direction = PositionUtils.getDirection(pos, pos);

      expect(direction).toEqual({ x: 0, y: 0 });
    });

    it('should handle cardinal directions', () => {
      const center: Position = { x: 0, y: 0 };

      // North
      const north = PositionUtils.getDirection(center, { x: 0, y: -1 });
      expect(north.x).toBeCloseTo(0);
      expect(north.y).toBeCloseTo(-1);

      // East
      const east = PositionUtils.getDirection(center, { x: 1, y: 0 });
      expect(east.x).toBeCloseTo(1);
      expect(east.y).toBeCloseTo(0);
    });
  });
});
