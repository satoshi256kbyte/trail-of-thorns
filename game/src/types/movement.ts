/**
 * Movement system type definitions and utilities
 * Defines core data structures for the character movement system
 */

import { Unit, Position } from './gameplay';

/**
 * Current state of the movement system
 */
export interface MovementState {
  selectedCharacter: Unit | null;
  movementRange: Position[];
  currentPath: Position[];
  isMoving: boolean;
  movementMode: 'none' | 'selecting' | 'moving';
}

/**
 * Terrain cost configuration for different terrain types
 */
export interface TerrainCost {
  [terrainType: string]: {
    movementCost: number;
    isPassable: boolean;
  };
}

/**
 * Configuration for movement animations
 */
export interface MovementAnimationConfig {
  moveSpeed: number; // pixels per second
  turnSpeed: number; // rotation speed in radians per second
  easing: string; // Phaser easing function name
  stepDelay: number; // delay between tile movements in milliseconds
}

/**
 * Movement validation and execution errors
 */
export enum MovementError {
  CHARACTER_ALREADY_MOVED = 'CHARACTER_ALREADY_MOVED',
  DESTINATION_UNREACHABLE = 'DESTINATION_UNREACHABLE',
  DESTINATION_OCCUPIED = 'DESTINATION_OCCUPIED',
  INSUFFICIENT_MOVEMENT_POINTS = 'INSUFFICIENT_MOVEMENT_POINTS',
  INVALID_CHARACTER_SELECTION = 'INVALID_CHARACTER_SELECTION',
  MOVEMENT_IN_PROGRESS = 'MOVEMENT_IN_PROGRESS',
  INVALID_POSITION = 'INVALID_POSITION',
  PATH_BLOCKED = 'PATH_BLOCKED',
  INVALID_ACTION = 'INVALID_ACTION',
}

/**
 * Movement error details for user feedback
 */
export interface MovementErrorDetails {
  error: MovementError;
  message: string;
  position?: Position;
  character?: Unit;
}

/**
 * Position utility functions for grid coordinate operations
 */
export class PositionUtils {
  /**
   * Check if two positions are equal
   */
  static equals(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }

  /**
   * Calculate Manhattan distance between two positions
   */
  static manhattanDistance(pos1: Position, pos2: Position): number {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }

  /**
   * Calculate Euclidean distance between two positions
   */
  static euclideanDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get adjacent positions (4-directional)
   */
  static getAdjacentPositions(position: Position): Position[] {
    return [
      { x: position.x, y: position.y - 1 }, // North
      { x: position.x + 1, y: position.y }, // East
      { x: position.x, y: position.y + 1 }, // South
      { x: position.x - 1, y: position.y }, // West
    ];
  }

  /**
   * Get all positions within a given range (Manhattan distance)
   */
  static getPositionsInRange(center: Position, range: number): Position[] {
    const positions: Position[] = [];

    for (let x = center.x - range; x <= center.x + range; x++) {
      for (let y = center.y - range; y <= center.y + range; y++) {
        const pos = { x, y };
        if (this.manhattanDistance(center, pos) <= range) {
          positions.push(pos);
        }
      }
    }

    return positions;
  }

  /**
   * Check if a position is within map boundaries
   */
  static isValidPosition(position: Position, mapWidth: number, mapHeight: number): boolean {
    return position.x >= 0 && position.x < mapWidth && position.y >= 0 && position.y < mapHeight;
  }

  /**
   * Convert position to string key for maps/sets
   */
  static toKey(position: Position): string {
    return `${position.x},${position.y}`;
  }

  /**
   * Convert string key back to position
   */
  static fromKey(key: string): Position {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }

  /**
   * Create a copy of a position
   */
  static clone(position: Position): Position {
    return { x: position.x, y: position.y };
  }

  /**
   * Add two positions together
   */
  static add(pos1: Position, pos2: Position): Position {
    return { x: pos1.x + pos2.x, y: pos1.y + pos2.y };
  }

  /**
   * Subtract second position from first
   */
  static subtract(pos1: Position, pos2: Position): Position {
    return { x: pos1.x - pos2.x, y: pos1.y - pos2.y };
  }

  /**
   * Get direction vector from one position to another
   */
  static getDirection(from: Position, to: Position): Position {
    const diff = this.subtract(to, from);
    const length = Math.sqrt(diff.x * diff.x + diff.y * diff.y);

    if (length === 0) {
      return { x: 0, y: 0 };
    }

    return { x: diff.x / length, y: diff.y / length };
  }
}
