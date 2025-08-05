/**
 * Integration tests for AttackRangeCalculator
 * Tests integration with MapRenderer and battle system components
 */

import { AttackRangeCalculator } from '../../../game/src/systems/AttackRangeCalculator';
import { MapRenderer } from '../../../game/src/rendering/MapRenderer';
import { Position, Unit, MapData, UnitStats, MapLayer } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, Element } from '../../../game/src/types/battle';
import { TerrainCost } from '../../../game/src/types/movement';

// Mock Phaser Scene for MapRenderer
class MockScene {
    add = {
        graphics: () => ({
            setDepth: () => ({}),
            clear: () => ({}),
            lineStyle: () => ({}),
            moveTo: () => ({}),
            lineTo: () => ({}),
            strokePath: () => ({}),
            fillStyle: () => ({}),
            fillRect: () => ({}),
            setVisible: () => ({}),
            destroy: () => ({}),
        }),
    };

    make = {
        tilemap: () => ({
            addTilesetImage: () => ({}),
            createLayer: () => ({
                setAlpha: () => ({}),
                setDepth: () => ({}),
            }),
            destroy: () => ({}),
        }),
    };
}

describe('AttackRangeCalculator Integration Tests', () => {
    let calculator: AttackRangeCalculator;
    let mapRenderer: MapRenderer;
    let mockScene: MockScene;
    let testMapData: MapData;
    let testUnit: Unit;

    beforeEach(async () => {
        mockScene = new MockScene();

        // Create test map data with terrain layers
        const terrainLayer: MapLayer = {
            name: 'terrain',
            type: 'terrain',
            data: [
                [0, 0, 0, 6, 0, 0, 0, 0, 0, 0], // Row 0 - wall at x=3
                [0, 0, 0, 6, 0, 0, 0, 0, 0, 0], // Row 1 - wall at x=3
                [0, 0, 0, 6, 0, 0, 0, 0, 0, 0], // Row 2 - wall at x=3
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Row 3 - clear
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Row 4 - clear
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Row 5 - clear
                [0, 0, 0, 0, 0, 4, 4, 4, 0, 0], // Row 6 - difficult terrain
                [0, 0, 0, 0, 0, 4, 4, 4, 0, 0], // Row 7 - difficult terrain
                [0, 0, 0, 0, 0, 4, 4, 4, 0, 0], // Row 8 - difficult terrain
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Row 9 - clear
            ],
            visible: true,
            opacity: 1.0,
        };

        testMapData = {
            width: 10,
            height: 10,
            tileSize: 32,
            layers: [terrainLayer],
            playerSpawns: [{ x: 1, y: 1 }],
            enemySpawns: [{ x: 8, y: 8 }],
        };

        // Create terrain costs
        const terrainCosts: TerrainCost = {
            '0': { movementCost: 1, isPassable: true },  // Normal ground
            '4': { movementCost: 2, isPassable: true },  // Difficult terrain
            '6': { movementCost: 1, isPassable: false }, // Impassable wall
        };

        // Create MapRenderer
        mapRenderer = new MapRenderer(mockScene as any, {}, terrainCosts);
        await mapRenderer.loadMap(testMapData);

        // Create AttackRangeCalculator with MapRenderer
        calculator = new AttackRangeCalculator(mapRenderer);

        // Create test unit
        const testStats: UnitStats = {
            maxHP: 100,
            maxMP: 50,
            attack: 20,
            defense: 15,
            speed: 10,
            movement: 3,
        };

        testUnit = {
            id: 'test-unit',
            name: 'Test Unit',
            position: { x: 5, y: 5 },
            stats: testStats,
            currentHP: 100,
            currentMP: 50,
            faction: 'player',
            hasActed: false,
            hasMoved: false,
        };
    });

    describe('Integration with MapRenderer', () => {
        test('should respect terrain passability in range calculations', () => {
            const bow: Weapon = {
                id: 'test-bow',
                name: 'Test Bow',
                type: WeaponType.BOW,
                attackPower: 20,
                range: 5,
                rangePattern: { type: 'single', range: 5, pattern: [] },
                element: Element.NONE,
                criticalRate: 15,
                accuracy: 85,
                specialEffects: [],
                description: 'A test bow',
            };

            // Position unit to shoot across the wall
            testUnit.position = { x: 2, y: 1 };

            const result = calculator.calculateAttackRange(testUnit, bow, testMapData);

            // Should not be able to attack through the wall at x=3
            const blockedPosition = { x: 4, y: 1 }; // Behind the wall
            expect(result.validPositions).not.toContainEqual(blockedPosition);
            expect(result.blockedPositions).toContainEqual(blockedPosition);
        });

        test('should allow attacks to passable difficult terrain', () => {
            const bow: Weapon = {
                id: 'test-bow',
                name: 'Test Bow',
                type: WeaponType.BOW,
                attackPower: 20,
                range: 3,
                rangePattern: { type: 'single', range: 3, pattern: [] },
                element: Element.NONE,
                criticalRate: 15,
                accuracy: 85,
                specialEffects: [],
                description: 'A test bow',
            };

            // Position unit to attack difficult terrain
            testUnit.position = { x: 5, y: 4 };

            const result = calculator.calculateAttackRange(testUnit, bow, testMapData);

            // Should be able to attack difficult terrain (it's passable)
            const difficultTerrainPosition = { x: 5, y: 6 };
            expect(result.validPositions).toContainEqual(difficultTerrainPosition);
        });

        test('should handle line of sight blocking correctly', () => {
            const bow: Weapon = {
                id: 'test-bow',
                name: 'Test Bow',
                type: WeaponType.BOW,
                attackPower: 20,
                range: 6,
                rangePattern: { type: 'single', range: 6, pattern: [] },
                element: Element.NONE,
                criticalRate: 15,
                accuracy: 85,
                specialEffects: [],
                description: 'A test bow',
            };

            // Position unit on one side of the wall
            testUnit.position = { x: 1, y: 1 };

            const result = calculator.calculateAttackRange(testUnit, bow, testMapData);

            // Should not be able to attack positions behind the wall
            const behindWallPositions = [
                { x: 5, y: 1 },
                { x: 6, y: 1 },
                { x: 7, y: 1 },
            ];

            behindWallPositions.forEach(pos => {
                expect(result.validPositions).not.toContainEqual(pos);
            });

            // Should be able to attack positions not blocked by the wall
            const clearPositions = [
                { x: 1, y: 3 },
                { x: 2, y: 4 },
                { x: 0, y: 2 },
            ];

            clearPositions.forEach(pos => {
                expect(result.validPositions).toContainEqual(pos);
            });
        });

        test('should work with unit collision detection', () => {
            const bow: Weapon = {
                id: 'test-bow',
                name: 'Test Bow',
                type: WeaponType.BOW,
                attackPower: 20,
                range: 3,
                rangePattern: { type: 'single', range: 3, pattern: [] },
                element: Element.NONE,
                criticalRate: 15,
                accuracy: 85,
                specialEffects: [],
                description: 'A test bow',
            };

            // Create additional units
            const enemyUnit: Unit = {
                id: 'enemy-unit',
                name: 'Enemy Unit',
                position: { x: 6, y: 5 },
                stats: testUnit.stats,
                currentHP: 100,
                currentMP: 50,
                faction: 'enemy',
                hasActed: false,
                hasMoved: false,
            };

            // Update map renderer with unit positions
            mapRenderer.updateUnitPositions([testUnit, enemyUnit]);

            // Enable unit blocking for this test
            calculator.updateConfig({ enableUnitBlocking: true });

            const result = calculator.calculateAttackRange(testUnit, bow, testMapData);

            // Should still be able to attack the enemy unit's position
            expect(result.validPositions).toContainEqual({ x: 6, y: 5 });

            // But if we check line of sight through the unit, it should be blocked
            const blocked = calculator.isAttackBlocked({ x: 5, y: 5 }, { x: 7, y: 5 });
            expect(blocked).toBe(true);
        });
    });

    describe('Area of Effect Integration', () => {
        test('should calculate AoE with terrain considerations', () => {
            const fireballStaff: Weapon = {
                id: 'fireball-staff',
                name: 'Fireball Staff',
                type: WeaponType.STAFF,
                attackPower: 25,
                range: 4,
                rangePattern: {
                    type: 'area',
                    range: 4,
                    pattern: [],
                    areaOfEffect: 2
                },
                element: Element.FIRE,
                criticalRate: 5,
                accuracy: 95,
                specialEffects: [],
                description: 'Staff that casts fireballs',
            };

            // Target the difficult terrain area
            const targetPosition = { x: 6, y: 7 };
            const aoePositions = calculator.calculateAreaOfEffect(targetPosition, fireballStaff, testMapData);

            // Should include positions within AoE radius
            expect(aoePositions).toContainEqual({ x: 6, y: 7 }); // Center
            expect(aoePositions).toContainEqual({ x: 5, y: 7 }); // West
            expect(aoePositions).toContainEqual({ x: 7, y: 7 }); // East
            expect(aoePositions).toContainEqual({ x: 6, y: 6 }); // North
            expect(aoePositions).toContainEqual({ x: 6, y: 8 }); // South

            // All positions should be within map bounds
            aoePositions.forEach(pos => {
                expect(pos.x).toBeGreaterThanOrEqual(0);
                expect(pos.x).toBeLessThan(testMapData.width);
                expect(pos.y).toBeGreaterThanOrEqual(0);
                expect(pos.y).toBeLessThan(testMapData.height);
            });
        });

        test('should handle AoE at map edges', () => {
            const explosiveAxe: Weapon = {
                id: 'explosive-axe',
                name: 'Explosive Axe',
                type: WeaponType.AXE,
                attackPower: 30,
                range: 2,
                rangePattern: {
                    type: 'area',
                    range: 2,
                    pattern: [],
                    areaOfEffect: 1
                },
                element: Element.FIRE,
                criticalRate: 10,
                accuracy: 85,
                specialEffects: [],
                description: 'Axe with explosive effect',
            };

            // Target near map edge
            const edgePosition = { x: 0, y: 0 };
            const aoePositions = calculator.calculateAreaOfEffect(edgePosition, explosiveAxe, testMapData);

            // Should only include positions within map bounds
            aoePositions.forEach(pos => {
                expect(pos.x).toBeGreaterThanOrEqual(0);
                expect(pos.y).toBeGreaterThanOrEqual(0);
            });

            // Should include valid adjacent positions
            expect(aoePositions).toContainEqual({ x: 0, y: 0 }); // Center
            expect(aoePositions).toContainEqual({ x: 1, y: 0 }); // East
            expect(aoePositions).toContainEqual({ x: 0, y: 1 }); // South

            // Note: Southeast (1,1) has Manhattan distance 2, so it might not be included with AoE radius 1
            // Let's check what positions are actually included
            expect(aoePositions.length).toBeGreaterThanOrEqual(3); // At least center + 2 adjacent

            // Should not include out-of-bounds positions
            expect(aoePositions).not.toContainEqual({ x: -1, y: 0 });
            expect(aoePositions).not.toContainEqual({ x: 0, y: -1 });
        });
    });

    describe('Complex Weapon Patterns', () => {
        test('should handle spear attacks through terrain', () => {
            const longSpear: Weapon = {
                id: 'long-spear',
                name: 'Long Spear',
                type: WeaponType.SPEAR,
                attackPower: 22,
                range: 4,
                rangePattern: { type: 'line', range: 4, pattern: [] },
                element: Element.NONE,
                criticalRate: 8,
                accuracy: 88,
                specialEffects: [],
                description: 'A long spear',
            };

            // Position unit to attack through the wall
            testUnit.position = { x: 1, y: 1 };

            const result = calculator.calculateAttackRange(testUnit, longSpear, testMapData);

            // Should not be able to attack through the wall in the east direction
            expect(result.validPositions).not.toContainEqual({ x: 4, y: 1 });
            expect(result.validPositions).not.toContainEqual({ x: 5, y: 1 });

            // But should be able to attack in other directions
            expect(result.validPositions).toContainEqual({ x: 1, y: 0 }); // North
            expect(result.validPositions).toContainEqual({ x: 1, y: 2 }); // South
            expect(result.validPositions).toContainEqual({ x: 0, y: 1 }); // West
        });

        test('should handle cross pattern with obstacles', () => {
            const magicStaff: Weapon = {
                id: 'magic-staff',
                name: 'Magic Staff',
                type: WeaponType.STAFF,
                attackPower: 18,
                range: 3,
                rangePattern: { type: 'cross', range: 3, pattern: [] },
                element: Element.LIGHT,
                criticalRate: 5,
                accuracy: 95,
                specialEffects: [],
                description: 'A magic staff',
            };

            // Position unit to cast across terrain
            testUnit.position = { x: 5, y: 3 };

            const result = calculator.calculateAttackRange(testUnit, magicStaff, testMapData);

            // Should be able to attack in cross pattern where not blocked
            expect(result.validPositions).toContainEqual({ x: 5, y: 2 }); // North
            expect(result.validPositions).toContainEqual({ x: 5, y: 1 }); // North 2
            expect(result.validPositions).toContainEqual({ x: 5, y: 4 }); // South
            expect(result.validPositions).toContainEqual({ x: 5, y: 5 }); // South 2

            // East and west should work normally
            expect(result.validPositions).toContainEqual({ x: 6, y: 3 }); // East
            expect(result.validPositions).toContainEqual({ x: 4, y: 3 }); // West
        });
    });

    describe('Performance and Edge Cases', () => {
        test('should handle large maps efficiently', async () => {
            // Create a larger map
            const largeMapData: MapData = {
                width: 50,
                height: 50,
                tileSize: 32,
                layers: [{
                    name: 'terrain',
                    type: 'terrain',
                    data: Array(50).fill(null).map(() => Array(50).fill(0)),
                    visible: true,
                    opacity: 1.0,
                }],
                playerSpawns: [{ x: 25, y: 25 }],
                enemySpawns: [{ x: 45, y: 45 }],
            };

            // Create a new MapRenderer for the large map
            const largeMapRenderer = new MapRenderer(mockScene as any);
            await largeMapRenderer.loadMap(largeMapData);

            // Create calculator with the large map renderer
            const largeMapCalculator = new AttackRangeCalculator(largeMapRenderer);

            const longRangeBow: Weapon = {
                id: 'long-range-bow',
                name: 'Long Range Bow',
                type: WeaponType.BOW,
                attackPower: 20,
                range: 15,
                rangePattern: { type: 'single', range: 15, pattern: [] },
                element: Element.NONE,
                criticalRate: 15,
                accuracy: 85,
                specialEffects: [],
                description: 'A long range bow',
            };

            testUnit.position = { x: 25, y: 25 };

            const startTime = Date.now();
            const result = largeMapCalculator.calculateAttackRange(testUnit, longRangeBow, largeMapData);
            const endTime = Date.now();

            // Should complete in reasonable time (less than 100ms)
            expect(endTime - startTime).toBeLessThan(100);

            // Should have calculated a reasonable number of positions
            expect(result.validPositions.length).toBeGreaterThan(100);
            expect(result.validPositions.length).toBeLessThan(1000);
        });

        test('should handle multiple units on map', () => {
            const units: Unit[] = [];

            // Create multiple units
            for (let i = 0; i < 10; i++) {
                units.push({
                    id: `unit-${i}`,
                    name: `Unit ${i}`,
                    position: { x: i, y: i },
                    stats: testUnit.stats,
                    currentHP: 100,
                    currentMP: 50,
                    faction: i % 2 === 0 ? 'player' : 'enemy',
                    hasActed: false,
                    hasMoved: false,
                });
            }

            // Update map renderer with all units
            mapRenderer.updateUnitPositions(units);

            const bow: Weapon = {
                id: 'test-bow',
                name: 'Test Bow',
                type: WeaponType.BOW,
                attackPower: 20,
                range: 5,
                rangePattern: { type: 'single', range: 5, pattern: [] },
                element: Element.NONE,
                criticalRate: 15,
                accuracy: 85,
                specialEffects: [],
                description: 'A test bow',
            };

            testUnit.position = { x: 5, y: 5 };

            const result = calculator.calculateAttackRange(testUnit, bow, testMapData);

            // Should still calculate range correctly with multiple units
            expect(result.validPositions.length).toBeGreaterThan(0);
            expect(result.attacker).toBe(testUnit);
        });
    });

    describe('Configuration Integration', () => {
        test('should respect maxCalculationRange in complex scenarios', () => {
            // Set a very low max calculation range
            calculator.updateConfig({ maxCalculationRange: 3 });

            const longRangeBow: Weapon = {
                id: 'long-range-bow',
                name: 'Long Range Bow',
                type: WeaponType.BOW,
                attackPower: 20,
                range: 10, // Higher than max calculation range
                rangePattern: { type: 'single', range: 10, pattern: [] },
                element: Element.NONE,
                criticalRate: 15,
                accuracy: 85,
                specialEffects: [],
                description: 'A long range bow',
            };

            const result = calculator.calculateAttackRange(testUnit, longRangeBow, testMapData);

            // Should be limited by maxCalculationRange
            const maxDistance = Math.max(
                ...result.validPositions.map(pos =>
                    Math.abs(pos.x - testUnit.position.x) + Math.abs(pos.y - testUnit.position.y)
                )
            );

            expect(maxDistance).toBeLessThanOrEqual(3);
        });

        test('should handle diagonal attack configuration', () => {
            // Disable diagonal attacks
            calculator.updateConfig({ diagonalAttackAllowed: false });

            const sword: Weapon = {
                id: 'test-sword',
                name: 'Test Sword',
                type: WeaponType.SWORD,
                attackPower: 25,
                range: 1,
                rangePattern: { type: 'custom', range: 1, pattern: [] },
                element: Element.NONE,
                criticalRate: 10,
                accuracy: 90,
                specialEffects: [],
                description: 'A test sword',
            };

            const result = calculator.calculateAttackRange(testUnit, sword, testMapData);

            // Should only include 4 cardinal directions
            expect(result.validPositions).toHaveLength(4);

            const expectedPositions = [
                { x: 5, y: 4 }, // North
                { x: 6, y: 5 }, // East
                { x: 5, y: 6 }, // South
                { x: 4, y: 5 }, // West
            ];

            expectedPositions.forEach(pos => {
                expect(result.validPositions).toContainEqual(pos);
            });

            // Should not include diagonal positions
            const diagonalPositions = [
                { x: 4, y: 4 }, // Northwest
                { x: 6, y: 4 }, // Northeast
                { x: 6, y: 6 }, // Southeast
                { x: 4, y: 6 }, // Southwest
            ];

            diagonalPositions.forEach(pos => {
                expect(result.validPositions).not.toContainEqual(pos);
            });
        });
    });
});