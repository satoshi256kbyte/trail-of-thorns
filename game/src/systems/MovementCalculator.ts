/**
 * MovementCalculator - Calculates movement ranges and costs for units
 *
 * This class implements the core movement calculation logic using a flood-fill algorithm
 * to determine reachable positions based on unit movement stats and terrain costs.
 */

import { Unit, Position, MapData, MapLayer } from '../types/gameplay';
import { TerrainCost, MovementError } from '../types/movement';
import { PositionUtils } from '../types/movement';
import { MapRenderer } from '../rendering/MapRenderer';

/**
 * Default terrain cost configuration
 * Terrain types are identified by tile IDs in the terrain layer
 */
const DEFAULT_TERRAIN_COSTS: TerrainCost = {
  '0': { movementCost: 1, isPassable: true }, // Normal ground
  '1': { movementCost: 1, isPassable: true }, // Normal ground (alt)
  '2': { movementCost: 1, isPassable: true }, // Normal ground (alt2)
  '3': { movementCost: 1, isPassable: true }, // Normal ground (alt3)
  '4': { movementCost: 2, isPassable: true }, // Difficult terrain (forest/hills)
  '5': { movementCost: 3, isPassable: true }, // Very difficult terrain (mountains)
  '6': { movementCost: 1, isPassable: false }, // Impassable terrain (walls)
  '7': { movementCost: 1, isPassable: false }, // Impassable terrain (water)
  '8': { movementCost: 1, isPassable: false }, // Impassable terrain (void)
  '9': { movementCost: 1, isPassable: false }, // Impassable terrain (obstacles)
};

/**
 * Node used in flood-fill algorithm for movement calculation
 */
interface MovementNode {
  position: Position;
  costFromStart: number;
}

/**
 * Cache entry for movement calculations
 */
interface MovementCacheEntry {
  characterId: string;
  position: Position;
  movementPoints: number;
  mapHash: string;
  occupiedHash: string;
  result: Position[];
  timestamp: number;
}

/**
 * Cache entry for movement cost calculations
 */
interface MovementCostCacheEntry {
  from: Position;
  to: Position;
  mapHash: string;
  cost: number;
  timestamp: number;
}

/**
 * Performance monitoring data
 */
interface PerformanceMetrics {
  calculationCount: number;
  totalCalculationTime: number;
  cacheHits: number;
  cacheMisses: number;
  averageCalculationTime: number;
  largestMapSize: number;
  maxCalculationTime: number;
}

/**
 * MovementCalculator handles all movement range and cost calculations
 */
export class MovementCalculator {
  private terrainCosts: TerrainCost;
  private mapRenderer: MapRenderer | null = null;

  // Performance optimization: caching
  private movementRangeCache = new Map<string, MovementCacheEntry>();
  private movementCostCache = new Map<string, MovementCostCacheEntry>();
  private readonly CACHE_TTL = 5000; // 5 seconds cache TTL
  private readonly MAX_CACHE_SIZE = 100; // Maximum cache entries

  // Performance monitoring
  private performanceMetrics: PerformanceMetrics = {
    calculationCount: 0,
    totalCalculationTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageCalculationTime: 0,
    largestMapSize: 0,
    maxCalculationTime: 0,
  };

  constructor(terrainCosts?: TerrainCost) {
    this.terrainCosts = terrainCosts || DEFAULT_TERRAIN_COSTS;

    // Set up cache cleanup interval
    setInterval(() => this.cleanupCache(), 10000); // Cleanup every 10 seconds
  }

  /**
   * Set the map renderer for terrain and collision detection
   * @param mapRenderer - MapRenderer instance
   */
  setMapRenderer(mapRenderer: MapRenderer): void {
    this.mapRenderer = mapRenderer;
  }

  /**
   * Calculate all positions reachable by a unit within their movement range
   * Uses flood-fill algorithm to explore all possible paths
   *
   * @param character - The unit to calculate movement for
   * @param map - The map data containing terrain information
   * @param occupiedPositions - Positions occupied by other units (optional)
   * @returns Array of positions the unit can reach
   */
  calculateMovementRange(
    character: Unit,
    map: MapData,
    occupiedPositions: Position[] = []
  ): Position[] {
    if (!character || !map) {
      return [];
    }

    const startTime = performance.now();

    // Check cache first
    const cacheKey = this.generateMovementRangeCacheKey(character, map, occupiedPositions);
    const cachedResult = this.getFromMovementRangeCache(cacheKey);

    if (cachedResult) {
      this.performanceMetrics.cacheHits++;
      return cachedResult;
    }

    this.performanceMetrics.cacheMisses++;
    this.performanceMetrics.calculationCount++;

    // Update performance metrics
    const mapSize = map.width * map.height;
    if (mapSize > this.performanceMetrics.largestMapSize) {
      this.performanceMetrics.largestMapSize = mapSize;
    }

    const maxMovement = character.stats.movement;
    const startPosition = character.position;

    let reachablePositions: Position[];

    // Use MapRenderer for collision detection if available
    if (this.mapRenderer) {
      reachablePositions = this.calculateMovementRangeWithRenderer(character, map);
    } else {
      // Fallback to original implementation
      const occupiedSet = new Set(occupiedPositions.map(pos => PositionUtils.toKey(pos)));

      // Remove the character's own position from occupied positions
      occupiedSet.delete(PositionUtils.toKey(startPosition));

      const visited = new Set<string>();
      const queue: MovementNode[] = [];
      reachablePositions = [];

      // Start flood-fill from character's current position
      queue.push({ position: startPosition, costFromStart: 0 });

      while (queue.length > 0) {
        const current = queue.shift()!;
        const positionKey = PositionUtils.toKey(current.position);

        // Skip if already visited
        if (visited.has(positionKey)) {
          continue;
        }

        visited.add(positionKey);

        // Add to reachable positions if within movement range
        if (current.costFromStart <= maxMovement) {
          reachablePositions.push(PositionUtils.clone(current.position));

          // Explore adjacent positions
          const adjacentPositions = PositionUtils.getAdjacentPositions(current.position);

          for (const nextPosition of adjacentPositions) {
            const nextPositionKey = PositionUtils.toKey(nextPosition);

            // Skip if already visited or position is occupied
            if (visited.has(nextPositionKey) || occupiedSet.has(nextPositionKey)) {
              continue;
            }

            // Skip if position is outside map bounds
            if (!PositionUtils.isValidPosition(nextPosition, map.width, map.height)) {
              continue;
            }

            // Calculate movement cost to this position
            const movementCost = this.getMovementCost(current.position, nextPosition, map);

            // Skip if terrain is impassable
            if (movementCost === -1) {
              continue;
            }

            const totalCost = current.costFromStart + movementCost;

            // Only add to queue if within movement range
            if (totalCost <= maxMovement) {
              queue.push({
                position: nextPosition,
                costFromStart: totalCost,
              });
            }
          }
        }
      }
    }

    // Update performance metrics
    const calculationTime = performance.now() - startTime;
    this.performanceMetrics.totalCalculationTime += calculationTime;
    this.performanceMetrics.averageCalculationTime =
      this.performanceMetrics.totalCalculationTime / this.performanceMetrics.calculationCount;

    if (calculationTime > this.performanceMetrics.maxCalculationTime) {
      this.performanceMetrics.maxCalculationTime = calculationTime;
    }

    // Cache the result
    this.cacheMovementRangeResult(cacheKey, character, map, occupiedPositions, reachablePositions);

    return reachablePositions;
  }

  /**
   * Calculate movement range using MapRenderer for enhanced collision detection
   * @param character - The unit to calculate movement for
   * @param map - The map data containing terrain information
   * @returns Array of positions the unit can reach
   */
  private calculateMovementRangeWithRenderer(character: Unit, map: MapData): Position[] {
    const maxMovement = character.stats.movement;
    const startPosition = character.position;

    const visited = new Set<string>();
    const queue: MovementNode[] = [];
    const reachablePositions: Position[] = [];

    // Start flood-fill from character's current position
    queue.push({ position: startPosition, costFromStart: 0 });

    while (queue.length > 0) {
      const current = queue.shift()!;
      const positionKey = PositionUtils.toKey(current.position);

      // Skip if already visited
      if (visited.has(positionKey)) {
        continue;
      }

      visited.add(positionKey);

      // Add to reachable positions if within movement range
      if (current.costFromStart <= maxMovement) {
        reachablePositions.push(PositionUtils.clone(current.position));

        // Explore adjacent positions
        const adjacentPositions = PositionUtils.getAdjacentPositions(current.position);

        for (const nextPosition of adjacentPositions) {
          const nextPositionKey = PositionUtils.toKey(nextPosition);

          // Skip if already visited
          if (visited.has(nextPositionKey)) {
            continue;
          }

          // Skip if position is blocked (terrain or unit collision)
          if (this.mapRenderer!.isPositionBlocked(nextPosition, character)) {
            continue;
          }

          // Calculate movement cost using MapRenderer
          const movementCost = this.mapRenderer!.getTerrainMovementCost(
            current.position,
            nextPosition
          );

          // Skip if terrain is impassable
          if (movementCost === -1) {
            continue;
          }

          const totalCost = current.costFromStart + movementCost;

          // Only add to queue if within movement range
          if (totalCost <= maxMovement) {
            queue.push({
              position: nextPosition,
              costFromStart: totalCost,
            });
          }
        }
      }
    }

    return reachablePositions;
  }

  /**
   * Get the movement cost between two adjacent positions
   *
   * @param from - Starting position
   * @param to - Destination position
   * @param map - Map data containing terrain information
   * @returns Movement cost (positive number) or -1 if impassable
   */
  getMovementCost(from: Position, to: Position, map: MapData): number {
    // Check cache first for cost calculations
    const costCacheKey = this.generateMovementCostCacheKey(from, to, map);
    const cachedCost = this.getFromMovementCostCache(costCacheKey);

    if (cachedCost !== null) {
      return cachedCost;
    }

    let cost: number;

    // Use MapRenderer if available for enhanced terrain detection
    if (this.mapRenderer) {
      cost = this.mapRenderer.getTerrainMovementCost(from, to);
    } else {
      // Fallback to original implementation
      // Validate positions
      if (!PositionUtils.isValidPosition(to, map.width, map.height)) {
        cost = -1;
      } else {
        // Get terrain type at destination
        const terrainType = this.getTerrainTypeAt(to, map);
        const terrainConfig = this.terrainCosts[terrainType.toString()];

        // Use default if terrain type not configured
        if (!terrainConfig) {
          cost = this.terrainCosts['0'].movementCost;
        } else if (!terrainConfig.isPassable) {
          // Return -1 for impassable terrain
          cost = -1;
        } else {
          cost = terrainConfig.movementCost;
        }
      }
    }

    // Cache the result
    this.cacheMovementCostResult(costCacheKey, from, to, map, cost);

    return cost;
  }

  /**
   * Check if a specific position is reachable by a unit
   *
   * @param character - The unit to check movement for
   * @param position - The position to check
   * @param map - Map data containing terrain information
   * @param occupiedPositions - Positions occupied by other units (optional)
   * @returns True if the position is reachable, false otherwise
   */
  isPositionReachable(
    character: Unit,
    position: Position,
    map: MapData,
    occupiedPositions: Position[] = []
  ): boolean {
    if (!character || !map || !position) {
      return false;
    }

    // Quick bounds check
    if (!PositionUtils.isValidPosition(position, map.width, map.height)) {
      return false;
    }

    // Use MapRenderer for enhanced collision detection if available
    if (this.mapRenderer) {
      // Check if position is blocked (but allow destination to be occupied)
      if (
        this.mapRenderer.isPositionBlocked(position, character) &&
        !PositionUtils.equals(character.position, position)
      ) {
        // Allow moving to positions occupied by other units (for attack/interaction)
        if (!this.mapRenderer.isTerrainPassable(position)) {
          return false;
        }
      }
    } else {
      // Fallback: Check if position is occupied by another unit
      const occupiedSet = new Set(occupiedPositions.map(pos => PositionUtils.toKey(pos)));

      if (occupiedSet.has(PositionUtils.toKey(position))) {
        return false;
      }
    }

    // If it's the character's current position, it's always reachable
    if (PositionUtils.equals(character.position, position)) {
      return true;
    }

    // Calculate reachable positions and check if target is included
    const reachablePositions = this.calculateMovementRange(character, map, occupiedPositions);
    return reachablePositions.some(pos => PositionUtils.equals(pos, position));
  }

  /**
   * Get the minimum movement cost to reach a specific position
   * Uses a simplified pathfinding approach
   *
   * @param character - The unit to calculate cost for
   * @param destination - The target position
   * @param map - Map data containing terrain information
   * @param occupiedPositions - Positions occupied by other units (optional)
   * @returns Movement cost or -1 if unreachable
   */
  getMovementCostToPosition(
    character: Unit,
    destination: Position,
    map: MapData,
    occupiedPositions: Position[] = []
  ): number {
    if (!this.isPositionReachable(character, destination, map, occupiedPositions)) {
      return -1;
    }

    // If it's the current position, cost is 0
    if (PositionUtils.equals(character.position, destination)) {
      return 0;
    }

    // Use flood-fill to find minimum cost path
    const occupiedSet = new Set(occupiedPositions.map(pos => PositionUtils.toKey(pos)));
    occupiedSet.delete(PositionUtils.toKey(character.position));

    const visited = new Map<string, number>();
    const queue: MovementNode[] = [];

    queue.push({ position: character.position, costFromStart: 0 });

    while (queue.length > 0) {
      const current = queue.shift()!;
      const positionKey = PositionUtils.toKey(current.position);

      // Skip if we've found a better path to this position
      if (visited.has(positionKey) && visited.get(positionKey)! <= current.costFromStart) {
        continue;
      }

      visited.set(positionKey, current.costFromStart);

      // Check if we've reached the destination
      if (PositionUtils.equals(current.position, destination)) {
        return current.costFromStart;
      }

      // Explore adjacent positions
      const adjacentPositions = PositionUtils.getAdjacentPositions(current.position);

      for (const nextPosition of adjacentPositions) {
        const nextPositionKey = PositionUtils.toKey(nextPosition);

        // Skip if position is occupied (except destination)
        if (occupiedSet.has(nextPositionKey) && !PositionUtils.equals(nextPosition, destination)) {
          continue;
        }

        // Skip if position is outside map bounds
        if (!PositionUtils.isValidPosition(nextPosition, map.width, map.height)) {
          continue;
        }

        const movementCost = this.getMovementCost(current.position, nextPosition, map);

        // Skip if terrain is impassable
        if (movementCost === -1) {
          continue;
        }

        const totalCost = current.costFromStart + movementCost;

        // Skip if exceeds movement range
        if (totalCost > character.stats.movement) {
          continue;
        }

        // Skip if we've already found a better path to this position
        if (visited.has(nextPositionKey) && visited.get(nextPositionKey)! <= totalCost) {
          continue;
        }

        queue.push({
          position: nextPosition,
          costFromStart: totalCost,
        });
      }
    }

    return -1; // Destination not reachable
  }

  /**
   * Update terrain cost configuration
   *
   * @param terrainCosts - New terrain cost configuration
   */
  setTerrainCosts(terrainCosts: TerrainCost): void {
    this.terrainCosts = { ...terrainCosts };
  }

  /**
   * Get current terrain cost configuration
   *
   * @returns Current terrain cost configuration
   */
  getTerrainCosts(): TerrainCost {
    const copy: TerrainCost = {};
    for (const key in this.terrainCosts) {
      copy[key] = { ...this.terrainCosts[key] };
    }
    return copy;
  }

  /**
   * Get terrain type at a specific position
   *
   * @param position - Position to check
   * @param map - Map data
   * @returns Terrain type ID
   */
  private getTerrainTypeAt(position: Position, map: MapData): number {
    // Find terrain layer
    const terrainLayer = map.layers.find(layer => layer.type === 'terrain');

    if (!terrainLayer || !terrainLayer.data) {
      return 0; // Default terrain type
    }

    // Validate position bounds
    if (
      position.y < 0 ||
      position.y >= terrainLayer.data.length ||
      position.x < 0 ||
      position.x >= terrainLayer.data[position.y].length
    ) {
      return 0; // Default terrain type for out-of-bounds
    }

    return terrainLayer.data[position.y][position.x];
  }

  /**
   * Validate movement calculation inputs
   *
   * @param character - Unit to validate
   * @param map - Map to validate
   * @returns Validation result
   */
  private validateInputs(character: Unit, map: MapData): { valid: boolean; error?: MovementError } {
    if (!character) {
      return { valid: false, error: MovementError.INVALID_CHARACTER_SELECTION };
    }

    if (!map) {
      return { valid: false, error: MovementError.INVALID_POSITION };
    }

    if (!PositionUtils.isValidPosition(character.position, map.width, map.height)) {
      return { valid: false, error: MovementError.INVALID_POSITION };
    }

    if (character.stats.movement <= 0) {
      return { valid: false, error: MovementError.INSUFFICIENT_MOVEMENT_POINTS };
    }

    return { valid: true };
  }

  /**
   * Generate cache key for movement range calculations
   */
  private generateMovementRangeCacheKey(
    character: Unit,
    map: MapData,
    occupiedPositions: Position[]
  ): string {
    const mapHash = this.generateMapHash(map);
    const occupiedHash = this.generateOccupiedPositionsHash(occupiedPositions);
    return `${character.id}_${PositionUtils.toKey(character.position)}_${character.stats.movement}_${mapHash}_${occupiedHash}`;
  }

  /**
   * Generate cache key for movement cost calculations
   */
  private generateMovementCostCacheKey(from: Position, to: Position, map: MapData): string {
    const mapHash = this.generateMapHash(map);
    return `${PositionUtils.toKey(from)}_${PositionUtils.toKey(to)}_${mapHash}`;
  }

  /**
   * Generate hash for map data
   */
  private generateMapHash(map: MapData): string {
    // Simple hash based on map dimensions and terrain layer
    const terrainLayer = map.layers.find(layer => layer.type === 'terrain');
    if (!terrainLayer || !terrainLayer.data) {
      return `${map.width}x${map.height}`;
    }

    // Create a simple hash from terrain data
    let hash = `${map.width}x${map.height}`;
    for (let y = 0; y < Math.min(terrainLayer.data.length, 10); y++) {
      for (let x = 0; x < Math.min(terrainLayer.data[y].length, 10); x++) {
        hash += `_${terrainLayer.data[y][x]}`;
      }
    }
    return hash;
  }

  /**
   * Generate hash for occupied positions
   */
  private generateOccupiedPositionsHash(occupiedPositions: Position[]): string {
    if (occupiedPositions.length === 0) {
      return 'empty';
    }

    return occupiedPositions
      .map(pos => PositionUtils.toKey(pos))
      .sort()
      .join('_');
  }

  /**
   * Get result from movement range cache
   */
  private getFromMovementRangeCache(cacheKey: string): Position[] | null {
    const entry = this.movementRangeCache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.movementRangeCache.delete(cacheKey);
      return null;
    }

    return entry.result.map(pos => PositionUtils.clone(pos));
  }

  /**
   * Get result from movement cost cache
   */
  private getFromMovementCostCache(cacheKey: string): number | null {
    const entry = this.movementCostCache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.movementCostCache.delete(cacheKey);
      return null;
    }

    return entry.cost;
  }

  /**
   * Cache movement range calculation result
   */
  private cacheMovementRangeResult(
    cacheKey: string,
    character: Unit,
    map: MapData,
    occupiedPositions: Position[],
    result: Position[]
  ): void {
    // Enforce cache size limit
    if (this.movementRangeCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheEntry(this.movementRangeCache);
    }

    const entry: MovementCacheEntry = {
      characterId: character.id,
      position: PositionUtils.clone(character.position),
      movementPoints: character.stats.movement,
      mapHash: this.generateMapHash(map),
      occupiedHash: this.generateOccupiedPositionsHash(occupiedPositions),
      result: result.map(pos => PositionUtils.clone(pos)),
      timestamp: Date.now(),
    };

    this.movementRangeCache.set(cacheKey, entry);
  }

  /**
   * Cache movement cost calculation result
   */
  private cacheMovementCostResult(
    cacheKey: string,
    from: Position,
    to: Position,
    map: MapData,
    cost: number
  ): void {
    // Enforce cache size limit
    if (this.movementCostCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheEntry(this.movementCostCache);
    }

    const entry: MovementCostCacheEntry = {
      from: PositionUtils.clone(from),
      to: PositionUtils.clone(to),
      mapHash: this.generateMapHash(map),
      cost: cost,
      timestamp: Date.now(),
    };

    this.movementCostCache.set(cacheKey, entry);
  }

  /**
   * Evict oldest cache entry to maintain cache size limit
   */
  private evictOldestCacheEntry(cache: Map<string, any>): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();

    for (const [key, entry] of cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();

    // Clean movement range cache
    for (const [key, entry] of this.movementRangeCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.movementRangeCache.delete(key);
      }
    }

    // Clean movement cost cache
    for (const [key, entry] of this.movementCostCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.movementCostCache.delete(key);
      }
    }
  }

  /**
   * Clear all caches (useful for testing or when map changes significantly)
   */
  public clearCache(): void {
    this.movementRangeCache.clear();
    this.movementCostCache.clear();
  }

  /**
   * Get performance metrics for monitoring
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Reset performance metrics
   */
  public resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      calculationCount: 0,
      totalCalculationTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageCalculationTime: 0,
      largestMapSize: 0,
      maxCalculationTime: 0,
    };
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStatistics(): {
    movementRangeCacheSize: number;
    movementCostCacheSize: number;
    cacheHitRate: number;
    totalCacheEntries: number;
  } {
    const totalRequests = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.performanceMetrics.cacheHits / totalRequests : 0;

    return {
      movementRangeCacheSize: this.movementRangeCache.size,
      movementCostCacheSize: this.movementCostCache.size,
      cacheHitRate: cacheHitRate,
      totalCacheEntries: this.movementRangeCache.size + this.movementCostCache.size,
    };
  }
}
