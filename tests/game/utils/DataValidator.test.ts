/**
 * Unit tests for DataValidator
 * Tests validation logic and error scenarios
 */

import { DataValidator, ValidationResult, MapBoundsResult } from '../../../game/src/utils/DataValidator';
import { StageData, MapData, Unit, Position, VictoryCondition, UnitStats, MapLayer } from '../../../game/src/types/gameplay';

describe('DataValidator', () => {
    // Test data fixtures
    const createValidPosition = (x: number = 5, y: number = 5): Position => ({ x, y });

    const createValidUnitStats = (): UnitStats => ({
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3
    });

    const createValidUnit = (id: string = 'unit1', faction: 'player' | 'enemy' = 'player', x: number = 5, y: number = 5): Unit => ({
        id,
        name: `Test ${faction} Unit`,
        position: createValidPosition(x, y),
        stats: createValidUnitStats(),
        currentHP: 100,
        currentMP: 50,
        faction,
        hasActed: false,
        hasMoved: false
    });

    const createValidMapLayer = (type: MapLayer['type'] = 'background'): MapLayer => ({
        name: `Test ${type} Layer`,
        type,
        data: Array(10).fill(null).map(() => Array(10).fill(0)),
        visible: true,
        opacity: 1.0
    });

    const createValidMapData = (): MapData => ({
        width: 10,
        height: 10,
        tileSize: 32,
        layers: [
            createValidMapLayer('background'),
            createValidMapLayer('terrain')
        ],
        playerSpawns: [createValidPosition(1, 1), createValidPosition(2, 1)],
        enemySpawns: [createValidPosition(8, 8), createValidPosition(9, 8)]
    });

    const createValidVictoryCondition = (): VictoryCondition => ({
        type: 'defeat_all',
        description: 'Defeat all enemy units'
    });

    const createValidStageData = (): StageData => ({
        id: 'test-stage-001',
        name: 'Test Stage',
        description: 'A test stage for validation',
        mapData: createValidMapData(),
        playerUnits: [
            createValidUnit('player1', 'player', 1, 1),
            createValidUnit('player2', 'player', 2, 1)
        ],
        enemyUnits: [
            createValidUnit('enemy1', 'enemy', 8, 8),
            createValidUnit('enemy2', 'enemy', 9, 8)
        ],
        victoryConditions: [createValidVictoryCondition()]
    });

    describe('validateStageData', () => {
        it('should validate correct stage data', () => {
            const stageData = createValidStageData();
            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject null or undefined stage data', () => {
            const result1 = DataValidator.validateStageData(null);
            const result2 = DataValidator.validateStageData(undefined);

            expect(result1.isValid).toBe(false);
            expect(result1.errors).toContain('Invalid stage data structure');
            expect(result2.isValid).toBe(false);
            expect(result2.errors).toContain('Invalid stage data structure');
        });

        it('should reject stage data with missing required fields', () => {
            const stageData = createValidStageData();
            delete (stageData as any).id;

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Stage ID cannot be empty');
        });

        it('should reject stage data with empty ID', () => {
            const stageData = createValidStageData();
            stageData.id = '';

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Stage ID cannot be empty');
        });

        it('should reject stage data with empty name', () => {
            const stageData = createValidStageData();
            stageData.name = '';

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Stage name cannot be empty');
        });

        it('should warn about empty description', () => {
            const stageData = createValidStageData();
            stageData.description = '';

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Stage description is empty');
        });

        it('should warn about special characters in ID', () => {
            const stageData = createValidStageData();
            stageData.id = 'test@stage#001';

            const result = DataValidator.validateStageData(stageData);

            expect(result.warnings).toContain('Stage ID contains special characters that may cause issues');
        });

        it('should reject stage data with no player units', () => {
            const stageData = createValidStageData();
            stageData.playerUnits = [];

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('No player units defined');
        });

        it('should reject stage data with no enemy units', () => {
            const stageData = createValidStageData();
            stageData.enemyUnits = [];

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('No enemy units defined');
        });

        it('should reject stage data with duplicate unit IDs', () => {
            const stageData = createValidStageData();
            stageData.playerUnits[1].id = stageData.playerUnits[0].id;

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('Duplicate player unit IDs'))).toBe(true);
        });

        it('should reject stage data with units out of bounds', () => {
            const stageData = createValidStageData();
            stageData.playerUnits[0].position = { x: 15, y: 15 }; // Out of 10x10 map

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('position is out of bounds'))).toBe(true);
        });

        it('should reject stage data with overlapping unit positions', () => {
            const stageData = createValidStageData();
            stageData.playerUnits[1].position = stageData.playerUnits[0].position;

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('Unit position overlap'))).toBe(true);
        });

        it('should warn about very small maps', () => {
            const stageData = createValidStageData();
            stageData.mapData.width = 3;
            stageData.mapData.height = 3;
            // Update layers to match new dimensions
            stageData.mapData.layers.forEach(layer => {
                layer.data = Array(3).fill(null).map(() => Array(3).fill(0));
            });

            const result = DataValidator.validateStageData(stageData);

            expect(result.warnings).toContain('Map is very small (less than 5x5), gameplay may be limited');
        });

        it('should warn about very large maps', () => {
            const stageData = createValidStageData();
            stageData.mapData.width = 60;
            stageData.mapData.height = 60;
            // Update layers to match new dimensions
            stageData.mapData.layers.forEach(layer => {
                layer.data = Array(60).fill(null).map(() => Array(60).fill(0));
            });

            const result = DataValidator.validateStageData(stageData);

            expect(result.warnings).toContain('Map is very large (more than 50x50), performance may be affected');
        });
    });

    describe('validateMapBounds', () => {
        const mapData = createValidMapData();

        it('should validate position within bounds', () => {
            const position = createValidPosition(5, 5);
            const result = DataValidator.validateMapBounds(position, mapData);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject position with negative coordinates', () => {
            const position = createValidPosition(-1, 5);
            const result = DataValidator.validateMapBounds(position, mapData);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('X coordinate -1 is out of bounds');
        });

        it('should reject position beyond map width', () => {
            const position = createValidPosition(10, 5); // Map is 10 wide (0-9)
            const result = DataValidator.validateMapBounds(position, mapData);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('X coordinate 10 is out of bounds');
        });

        it('should reject position beyond map height', () => {
            const position = createValidPosition(5, 10); // Map is 10 high (0-9)
            const result = DataValidator.validateMapBounds(position, mapData);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Y coordinate 10 is out of bounds');
        });

        it('should reject invalid position structure', () => {
            const result = DataValidator.validateMapBounds(null as any, mapData);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Invalid position structure');
        });

        it('should validate edge positions', () => {
            const positions = [
                createValidPosition(0, 0),
                createValidPosition(9, 9),
                createValidPosition(0, 9),
                createValidPosition(9, 0)
            ];

            positions.forEach(position => {
                const result = DataValidator.validateMapBounds(position, mapData);
                expect(result.isValid).toBe(true);
            });
        });
    });

    describe('map layer validation', () => {
        it('should reject layers with mismatched dimensions', () => {
            const stageData = createValidStageData();
            stageData.mapData.layers[0].data = Array(5).fill(null).map(() => Array(10).fill(0)); // Wrong height

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('height mismatch'))).toBe(true);
        });

        it('should reject layers with mismatched row width', () => {
            const stageData = createValidStageData();
            stageData.mapData.layers[0].data[0] = Array(5).fill(0); // Wrong width for first row

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('width mismatch'))).toBe(true);
        });

        it('should warn about missing background layer', () => {
            const stageData = createValidStageData();
            stageData.mapData.layers = [createValidMapLayer('terrain')]; // No background

            const result = DataValidator.validateStageData(stageData);

            expect(result.warnings).toContain('No background layer found');
        });

        it('should warn about missing terrain layer', () => {
            const stageData = createValidStageData();
            stageData.mapData.layers = [createValidMapLayer('background')]; // No terrain

            const result = DataValidator.validateStageData(stageData);

            expect(result.warnings).toContain('No terrain layer found');
        });
    });

    describe('spawn point validation', () => {
        it('should reject stage with no player spawns', () => {
            const stageData = createValidStageData();
            stageData.mapData.playerSpawns = [];

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('No player spawn points defined');
        });

        it('should reject stage with no enemy spawns', () => {
            const stageData = createValidStageData();
            stageData.mapData.enemySpawns = [];

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('No enemy spawn points defined');
        });

        it('should reject spawn points out of bounds', () => {
            const stageData = createValidStageData();
            stageData.mapData.playerSpawns[0] = { x: 15, y: 15 }; // Out of bounds

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('Player spawn 0 is out of bounds'))).toBe(true);
        });

        it('should reject overlapping spawn points', () => {
            const stageData = createValidStageData();
            stageData.mapData.enemySpawns[0] = stageData.mapData.playerSpawns[0]; // Same position

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('Spawn point overlap'))).toBe(true);
        });
    });

    describe('victory condition validation', () => {
        it('should reject reach_position condition without position', () => {
            const stageData = createValidStageData();
            stageData.victoryConditions = [{
                type: 'reach_position',
                description: 'Reach the target'
                // Missing position
            }];

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('missing position'))).toBe(true);
        });

        it('should reject reach_position condition with out-of-bounds position', () => {
            const stageData = createValidStageData();
            stageData.victoryConditions = [{
                type: 'reach_position',
                position: { x: 15, y: 15 }, // Out of bounds
                description: 'Reach the target'
            }];

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('position out of bounds'))).toBe(true);
        });

        it('should reject protect_unit condition without target', () => {
            const stageData = createValidStageData();
            stageData.victoryConditions = [{
                type: 'protect_unit',
                description: 'Protect the unit'
                // Missing target
            }];

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('missing target unit ID'))).toBe(true);
        });

        it('should reject protect_unit condition with non-existent target', () => {
            const stageData = createValidStageData();
            stageData.victoryConditions = [{
                type: 'protect_unit',
                target: 'non-existent-unit',
                description: 'Protect the unit'
            }];

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('references non-existent unit'))).toBe(true);
        });

        it('should reject survive_turns condition with invalid turn count', () => {
            const stageData = createValidStageData();
            stageData.victoryConditions = [{
                type: 'survive_turns',
                turns: 0, // Invalid
                description: 'Survive for turns'
            }];

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('invalid turn count'))).toBe(true);
        });
    });

    describe('unit validation', () => {
        it('should reject unit with wrong faction', () => {
            const stageData = createValidStageData();
            stageData.playerUnits[0].faction = 'enemy'; // Wrong faction

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('has incorrect faction'))).toBe(true);
        });

        it('should reject unit with invalid speed', () => {
            const stageData = createValidStageData();
            stageData.playerUnits[0].stats.speed = 0; // Invalid speed

            const result = DataValidator.validateStageData(stageData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('has invalid speed'))).toBe(true);
        });

        it('should warn about very high HP', () => {
            const stageData = createValidStageData();
            stageData.playerUnits[0].stats.maxHP = 10000; // Very high HP

            const result = DataValidator.validateStageData(stageData);

            expect(result.warnings.some(warning => warning.includes('has very high HP'))).toBe(true);
        });

        it('should warn about very high movement', () => {
            const stageData = createValidStageData();
            stageData.playerUnits[0].stats.movement = 15; // Very high movement

            const result = DataValidator.validateStageData(stageData);

            expect(result.warnings.some(warning => warning.includes('has very high movement'))).toBe(true);
        });
    });

    describe('balance validation', () => {
        it('should warn about enemy units significantly outnumbering players', () => {
            const stageData = createValidStageData();
            // Add many enemy units
            for (let i = 3; i <= 10; i++) {
                stageData.enemyUnits.push(createValidUnit(`enemy${i}`, 'enemy', i % 10, 7 + Math.floor(i / 10)));
            }

            const result = DataValidator.validateStageData(stageData);

            expect(result.warnings.some(warning => warning.includes('significantly outnumber player units'))).toBe(true);
        });

        it('should warn about insufficient spawn points', () => {
            const stageData = createValidStageData();
            // Add more units than spawn points
            stageData.playerUnits.push(createValidUnit('player3', 'player', 3, 1));
            stageData.playerUnits.push(createValidUnit('player4', 'player', 4, 1));

            const result = DataValidator.validateStageData(stageData);

            expect(result.warnings.some(warning => warning.includes('More player units'))).toBe(true);
        });
    });

    describe('validatePositionArray', () => {
        const mapData = createValidMapData();

        it('should validate array of valid positions', () => {
            const positions = [
                createValidPosition(1, 1),
                createValidPosition(5, 5),
                createValidPosition(9, 9)
            ];

            const result = DataValidator.validatePositionArray(positions, mapData);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject array with invalid positions', () => {
            const positions = [
                createValidPosition(1, 1),
                createValidPosition(15, 15), // Out of bounds
                createValidPosition(5, 5)
            ];

            const result = DataValidator.validatePositionArray(positions, mapData);

            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('Position 1 is invalid'))).toBe(true);
        });
    });

    describe('isValidStageDataStructure', () => {
        it('should return true for valid stage data', () => {
            const stageData = createValidStageData();
            const result = DataValidator.isValidStageDataStructure(stageData);

            expect(result).toBe(true);
        });

        it('should return false for invalid stage data', () => {
            const result = DataValidator.isValidStageDataStructure(null);

            expect(result).toBe(false);
        });
    });
});