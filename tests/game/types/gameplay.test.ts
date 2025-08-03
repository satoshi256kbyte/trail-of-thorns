/**
 * Unit tests for gameplay type definitions and validation functions
 */

import {
  Position,
  UnitStats,
  Unit,
  MapLayer,
  MapData,
  VictoryCondition,
  StageData,
  GameState,
  GameplayError,
  TypeValidators,
} from '../../../game/src/types/gameplay';

describe('TypeValidators', () => {
  describe('isValidPosition', () => {
    it('should validate correct position objects', () => {
      const validPositions: Position[] = [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: -5, y: 3 },
        { x: 1.5, y: 2.7 },
      ];

      validPositions.forEach(pos => {
        expect(TypeValidators.isValidPosition(pos)).toBe(true);
      });
    });

    it('should reject invalid position objects', () => {
      const invalidPositions = [
        null,
        undefined,
        {},
        { x: 5 },
        { y: 5 },
        { x: 'invalid', y: 5 },
        { x: 5, y: 'invalid' },
        { x: NaN, y: 5 },
        { x: 5, y: Infinity },
      ];

      invalidPositions.forEach(pos => {
        expect(TypeValidators.isValidPosition(pos)).toBe(false);
      });
    });
  });

  describe('isValidUnitStats', () => {
    it('should validate correct unit stats', () => {
      const validStats: UnitStats[] = [
        {
          maxHP: 100,
          maxMP: 50,
          attack: 25,
          defense: 20,
          speed: 15,
          movement: 3,
        },
        {
          maxHP: 1,
          maxMP: 0,
          attack: 0,
          defense: 0,
          speed: 1,
          movement: 1,
        },
      ];

      validStats.forEach(stats => {
        expect(TypeValidators.isValidUnitStats(stats)).toBe(true);
      });
    });

    it('should reject invalid unit stats', () => {
      const invalidStats = [
        null,
        undefined,
        {},
        { maxHP: 0, maxMP: 50, attack: 25, defense: 20, speed: 15, movement: 3 }, // maxHP must be > 0
        { maxHP: 100, maxMP: -1, attack: 25, defense: 20, speed: 15, movement: 3 }, // maxMP must be >= 0
        { maxHP: 100, maxMP: 50, attack: -1, defense: 20, speed: 15, movement: 3 }, // attack must be >= 0
        { maxHP: 100, maxMP: 50, attack: 25, defense: -1, speed: 15, movement: 3 }, // defense must be >= 0
        { maxHP: 100, maxMP: 50, attack: 25, defense: 20, speed: 0, movement: 3 }, // speed must be > 0
        { maxHP: 100, maxMP: 50, attack: 25, defense: 20, speed: 15, movement: 0 }, // movement must be > 0
        { maxHP: 'invalid', maxMP: 50, attack: 25, defense: 20, speed: 15, movement: 3 },
      ];

      invalidStats.forEach(stats => {
        expect(TypeValidators.isValidUnitStats(stats)).toBe(false);
      });
    });
  });

  describe('isValidUnit', () => {
    const validUnitStats: UnitStats = {
      maxHP: 100,
      maxMP: 50,
      attack: 25,
      defense: 20,
      speed: 15,
      movement: 3,
    };

    it('should validate correct unit objects', () => {
      const validUnits: Unit[] = [
        {
          id: 'player1',
          name: 'Hero',
          position: { x: 0, y: 0 },
          stats: validUnitStats,
          currentHP: 100,
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
        {
          id: 'enemy1',
          name: 'Goblin',
          position: { x: 5, y: 5 },
          stats: validUnitStats,
          currentHP: 50,
          currentMP: 0,
          faction: 'enemy',
          hasActed: true,
          hasMoved: true,
        },
      ];

      validUnits.forEach(unit => {
        expect(TypeValidators.isValidUnit(unit)).toBe(true);
      });
    });

    it('should reject invalid unit objects', () => {
      const invalidUnits = [
        null,
        undefined,
        {},
        {
          // missing required fields
          id: 'test',
        },
        {
          id: 'test',
          name: 'Test',
          position: { x: 0, y: 0 },
          stats: validUnitStats,
          currentHP: 150, // exceeds maxHP
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
        {
          id: 'test',
          name: 'Test',
          position: { x: 0, y: 0 },
          stats: validUnitStats,
          currentHP: 100,
          currentMP: 60, // exceeds maxMP
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
        {
          id: 'test',
          name: 'Test',
          position: { x: 0, y: 0 },
          stats: validUnitStats,
          currentHP: -10, // negative HP
          currentMP: 50,
          faction: 'player',
          hasActed: false,
          hasMoved: false,
        },
        {
          id: 'test',
          name: 'Test',
          position: { x: 0, y: 0 },
          stats: validUnitStats,
          currentHP: 100,
          currentMP: 50,
          faction: 'invalid', // invalid faction
          hasActed: false,
          hasMoved: false,
        },
      ];

      invalidUnits.forEach(unit => {
        expect(TypeValidators.isValidUnit(unit)).toBe(false);
      });
    });
  });

  describe('isValidMapLayer', () => {
    it('should validate correct map layer objects', () => {
      const validLayers: MapLayer[] = [
        {
          name: 'background',
          type: 'background',
          data: [
            [1, 2, 3],
            [4, 5, 6],
          ],
          visible: true,
          opacity: 1.0,
        },
        {
          name: 'terrain',
          type: 'terrain',
          data: [
            [0, 0],
            [1, 1],
          ],
          visible: false,
          opacity: 0.5,
        },
      ];

      validLayers.forEach(layer => {
        expect(TypeValidators.isValidMapLayer(layer)).toBe(true);
      });
    });

    it('should reject invalid map layer objects', () => {
      const invalidLayers = [
        null,
        undefined,
        {},
        {
          name: 'test',
          type: 'invalid', // invalid type
          data: [[1, 2]],
          visible: true,
          opacity: 1.0,
        },
        {
          name: 'test',
          type: 'background',
          data: [['invalid', 2]], // non-numeric data
          visible: true,
          opacity: 1.0,
        },
        {
          name: 'test',
          type: 'background',
          data: [[1, 2]],
          visible: true,
          opacity: 1.5, // opacity > 1
        },
        {
          name: 'test',
          type: 'background',
          data: [[1, 2]],
          visible: true,
          opacity: -0.1, // opacity < 0
        },
      ];

      invalidLayers.forEach(layer => {
        expect(TypeValidators.isValidMapLayer(layer)).toBe(false);
      });
    });
  });

  describe('isValidMapData', () => {
    const validLayer: MapLayer = {
      name: 'background',
      type: 'background',
      data: [
        [1, 2],
        [3, 4],
      ],
      visible: true,
      opacity: 1.0,
    };

    it('should validate correct map data objects', () => {
      const validMapData: MapData[] = [
        {
          width: 10,
          height: 10,
          tileSize: 32,
          layers: [validLayer],
          playerSpawns: [{ x: 0, y: 0 }],
          enemySpawns: [{ x: 9, y: 9 }],
        },
      ];

      validMapData.forEach(mapData => {
        expect(TypeValidators.isValidMapData(mapData)).toBe(true);
      });
    });

    it('should reject invalid map data objects', () => {
      const invalidMapData = [
        null,
        undefined,
        {},
        {
          width: 0, // width must be > 0
          height: 10,
          tileSize: 32,
          layers: [validLayer],
          playerSpawns: [{ x: 0, y: 0 }],
          enemySpawns: [{ x: 9, y: 9 }],
        },
        {
          width: 10,
          height: 10,
          tileSize: 32,
          layers: [], // empty layers array
          playerSpawns: [{ x: 0, y: 0 }],
          enemySpawns: [{ x: 9, y: 9 }],
        },
      ];

      invalidMapData.forEach(mapData => {
        expect(TypeValidators.isValidMapData(mapData)).toBe(false);
      });
    });
  });

  describe('isValidVictoryCondition', () => {
    it('should validate correct victory condition objects', () => {
      const validConditions: VictoryCondition[] = [
        {
          type: 'defeat_all',
          description: 'Defeat all enemies',
        },
        {
          type: 'reach_position',
          position: { x: 10, y: 10 },
          description: 'Reach the exit',
        },
        {
          type: 'survive_turns',
          turns: 10,
          description: 'Survive for 10 turns',
        },
        {
          type: 'protect_unit',
          target: 'npc1',
          description: 'Protect the VIP',
        },
      ];

      validConditions.forEach(condition => {
        expect(TypeValidators.isValidVictoryCondition(condition)).toBe(true);
      });
    });

    it('should reject invalid victory condition objects', () => {
      const invalidConditions = [
        null,
        undefined,
        {},
        {
          type: 'invalid_type',
          description: 'Invalid',
        },
        {
          type: 'survive_turns',
          turns: 0, // turns must be > 0
          description: 'Invalid turns',
        },
        {
          type: 'defeat_all',
          // missing description
        },
      ];

      invalidConditions.forEach(condition => {
        expect(TypeValidators.isValidVictoryCondition(condition)).toBe(false);
      });
    });
  });

  describe('isValidStageData', () => {
    const validUnit: Unit = {
      id: 'test1',
      name: 'Test Unit',
      position: { x: 0, y: 0 },
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 25,
        defense: 20,
        speed: 15,
        movement: 3,
      },
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    const validMapData: MapData = {
      width: 10,
      height: 10,
      tileSize: 32,
      layers: [
        {
          name: 'background',
          type: 'background',
          data: [
            [1, 2],
            [3, 4],
          ],
          visible: true,
          opacity: 1.0,
        },
      ],
      playerSpawns: [{ x: 0, y: 0 }],
      enemySpawns: [{ x: 9, y: 9 }],
    };

    it('should validate correct stage data objects', () => {
      const validStageData: StageData = {
        id: 'stage1',
        name: 'Test Stage',
        description: 'A test stage',
        mapData: validMapData,
        playerUnits: [validUnit],
        enemyUnits: [{ ...validUnit, id: 'enemy1', faction: 'enemy' }],
        victoryConditions: [
          {
            type: 'defeat_all',
            description: 'Defeat all enemies',
          },
        ],
      };

      expect(TypeValidators.isValidStageData(validStageData)).toBe(true);
    });

    it('should reject invalid stage data objects', () => {
      const invalidStageData = [
        null,
        undefined,
        {},
        {
          id: 'stage1',
          name: 'Test Stage',
          description: 'A test stage',
          mapData: validMapData,
          playerUnits: [], // empty player units
          enemyUnits: [{ ...validUnit, id: 'enemy1', faction: 'enemy' }],
          victoryConditions: [
            {
              type: 'defeat_all',
              description: 'Defeat all enemies',
            },
          ],
        },
        {
          id: 'stage1',
          name: 'Test Stage',
          description: 'A test stage',
          mapData: validMapData,
          playerUnits: [validUnit],
          enemyUnits: [], // empty enemy units
          victoryConditions: [
            {
              type: 'defeat_all',
              description: 'Defeat all enemies',
            },
          ],
        },
      ];

      invalidStageData.forEach(stageData => {
        expect(TypeValidators.isValidStageData(stageData)).toBe(false);
      });
    });
  });

  describe('isValidGameState', () => {
    const validUnit: Unit = {
      id: 'test1',
      name: 'Test Unit',
      position: { x: 0, y: 0 },
      stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 25,
        defense: 20,
        speed: 15,
        movement: 3,
      },
      currentHP: 100,
      currentMP: 50,
      faction: 'player',
      hasActed: false,
      hasMoved: false,
    };

    it('should validate correct game state objects', () => {
      const validGameStates: GameState[] = [
        {
          currentTurn: 1,
          activePlayer: 'player',
          phase: 'select',
          gameResult: null,
          turnOrder: [validUnit],
          activeUnitIndex: 0,
        },
        {
          currentTurn: 5,
          activePlayer: 'enemy',
          phase: 'enemy',
          selectedUnit: validUnit,
          gameResult: 'victory',
          turnOrder: [validUnit],
          activeUnitIndex: 0,
        },
      ];

      validGameStates.forEach(gameState => {
        expect(TypeValidators.isValidGameState(gameState)).toBe(true);
      });
    });

    it('should reject invalid game state objects', () => {
      const invalidGameStates = [
        null,
        undefined,
        {},
        {
          currentTurn: 0, // must be >= 1
          activePlayer: 'player',
          phase: 'select',
          gameResult: null,
          turnOrder: [validUnit],
          activeUnitIndex: 0,
        },
        {
          currentTurn: 1,
          activePlayer: 'invalid', // invalid player
          phase: 'select',
          gameResult: null,
          turnOrder: [validUnit],
          activeUnitIndex: 0,
        },
        {
          currentTurn: 1,
          activePlayer: 'player',
          phase: 'invalid', // invalid phase
          gameResult: null,
          turnOrder: [validUnit],
          activeUnitIndex: 0,
        },
        {
          currentTurn: 1,
          activePlayer: 'player',
          phase: 'select',
          gameResult: null,
          turnOrder: [],
          activeUnitIndex: -1, // invalid index
        },
      ];

      invalidGameStates.forEach(gameState => {
        expect(TypeValidators.isValidGameState(gameState)).toBe(false);
      });
    });
  });

  describe('GameplayError enum', () => {
    it('should contain all expected error types', () => {
      const expectedErrors = [
        'INVALID_STAGE_DATA',
        'CHARACTER_LOAD_FAILED',
        'MAP_LOAD_FAILED',
        'INVALID_ACTION',
        'CAMERA_BOUNDS_ERROR',
        'INVALID_POSITION',
        'UNIT_NOT_FOUND',
        'INVALID_TURN_STATE',
      ];

      expectedErrors.forEach(errorType => {
        expect(GameplayError[errorType as keyof typeof GameplayError]).toBeDefined();
      });
    });

    it('should have string values matching the keys', () => {
      expect(GameplayError.INVALID_STAGE_DATA).toBe('INVALID_STAGE_DATA');
      expect(GameplayError.CHARACTER_LOAD_FAILED).toBe('CHARACTER_LOAD_FAILED');
      expect(GameplayError.MAP_LOAD_FAILED).toBe('MAP_LOAD_FAILED');
      expect(GameplayError.INVALID_ACTION).toBe('INVALID_ACTION');
      expect(GameplayError.CAMERA_BOUNDS_ERROR).toBe('CAMERA_BOUNDS_ERROR');
      expect(GameplayError.INVALID_POSITION).toBe('INVALID_POSITION');
      expect(GameplayError.UNIT_NOT_FOUND).toBe('UNIT_NOT_FOUND');
      expect(GameplayError.INVALID_TURN_STATE).toBe('INVALID_TURN_STATE');
    });
  });
});
