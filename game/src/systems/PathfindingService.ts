/**
 * PathfindingService - A* pathfinding implementation for tactical movement
 *
 * This service implements the A* pathfinding algorithm to find optimal paths
 * between positions on the tactical grid, considering terrain costs and obstacles.
 */

import { Position, MapData, Unit } from '../types/gameplay';
import { TerrainCost, MovementError } from '../types/movement';
import { PositionUtils } from '../types/movement';
import { MapRenderer } from '../rendering/MapRenderer';

/**
 * Node used in A* pathfinding algorithm
 */
interface PathNode {
  position: Position;
  gScore: number; // Cost from start to this node
  hScore: number; // Heuristic cost from this node to goal
  fScore: number; // Total cost (gScore + hScore)
  parent?: PathNode; // Parent node for path reconstruction
}

/**
 * Priority queue implementation for A* algorithm
 * Uses a binary heap for efficient insertion and extraction
 */
class PriorityQueue<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compareFunction: (a: T, b: T) => number) {
    this.compare = compareFunction;
  }

  /**
   * Add an item to the queue
   */
  enqueue(item: T): void {
    this.items.push(item);
    this.heapifyUp(this.items.length - 1);
  }

  /**
   * Remove and return the item with highest priority
   */
  dequeue(): T | undefined {
    if (this.items.length === 0) {
      return undefined;
    }

    if (this.items.length === 1) {
      return this.items.pop();
    }

    const result = this.items[0];
    this.items[0] = this.items.pop()!;
    this.heapifyDown(0);
    return result;
  }

  /**
   * Check if the queue is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Get the number of items in the queue
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Check if the queue contains an item with the given position
   */
  contains(position: Position): boolean {
    return this.items.some(item => PositionUtils.equals((item as any).position, position));
  }

  /**
   * Update an item in the queue (used when we find a better path to a node)
   */
  updateItem(position: Position, newItem: T): boolean {
    const index = this.items.findIndex(item =>
      PositionUtils.equals((item as any).position, position)
    );

    if (index === -1) {
      return false;
    }

    this.items[index] = newItem;
    this.heapifyUp(index);
    this.heapifyDown(index);
    return true;
  }

  /**
   * Move item up the heap to maintain heap property
   */
  private heapifyUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (this.compare(this.items[index], this.items[parentIndex]) >= 0) {
        break;
      }

      [this.items[index], this.items[parentIndex]] = [this.items[parentIndex], this.items[index]];

      index = parentIndex;
    }
  }

  /**
   * Move item down the heap to maintain heap property
   */
  private heapifyDown(index: number): void {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (
        leftChild < this.items.length &&
        this.compare(this.items[leftChild], this.items[minIndex]) < 0
      ) {
        minIndex = leftChild;
      }

      if (
        rightChild < this.items.length &&
        this.compare(this.items[rightChild], this.items[minIndex]) < 0
      ) {
        minIndex = rightChild;
      }

      if (minIndex === index) {
        break;
      }

      [this.items[index], this.items[minIndex]] = [this.items[minIndex], this.items[index]];

      index = minIndex;
    }
  }
}

/**
 * Cache entry for pathfinding results
 */
interface PathfindingCacheEntry {
  start: Position;
  goal: Position;
  maxCost: number;
  mapHash: string;
  occupiedHash: string;
  path: Position[];
  timestamp: number;
}

/**
 * Performance metrics for pathfinding operations
 */
interface PathfindingPerformanceMetrics {
  pathfindingCount: number;
  totalPathfindingTime: number;
  cacheHits: number;
  cacheMisses: number;
  averagePathfindingTime: number;
  maxPathfindingTime: number;
  nodesExplored: number;
  averageNodesExplored: number;
  complexPathCount: number; // Paths requiring >100 nodes
}

/**
 * PathfindingService implements A* pathfinding for tactical movement
 */
export class PathfindingService {
  private terrainCosts: TerrainCost;
  private mapRenderer: MapRenderer | null = null;

  // Performance optimization: caching
  private pathfindingCache = new Map<string, PathfindingCacheEntry>();
  private readonly CACHE_TTL = 3000; // 3 seconds cache TTL (shorter than movement calc)
  private readonly MAX_CACHE_SIZE = 50; // Maximum cache entries

  // Performance monitoring
  private performanceMetrics: PathfindingPerformanceMetrics = {
    pathfindingCount: 0,
    totalPathfindingTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averagePathfindingTime: 0,
    maxPathfindingTime: 0,
    nodesExplored: 0,
    averageNodesExplored: 0,
    complexPathCount: 0,
  };

  constructor(terrainCosts?: TerrainCost) {
    this.terrainCosts = terrainCosts || this.getDefaultTerrainCosts();

    // Set up cache cleanup interval
    setInterval(() => this.cleanupCache(), 8000); // Cleanup every 8 seconds
  }

  /**
   * Set the map renderer for enhanced terrain and collision detection
   * @param mapRenderer - MapRenderer instance
   */
  setMapRenderer(mapRenderer: MapRenderer): void {
    this.mapRenderer = mapRenderer;
  }

  /**
   * Find the optimal path from start to goal using A* algorithm
   *
   * @param start - Starting position
   * @param goal - Goal position
   * @param map - Map data containing terrain information
   * @param maxCost - Maximum movement cost allowed
   * @param occupiedPositions - Positions occupied by other units (optional)
   * @param excludeUnit - Unit to exclude from collision checks (optional)
   * @returns Array of positions representing the path, or empty array if no path found
   */
  findPath(
    start: Position,
    goal: Position,
    map: MapData,
    maxCost: number,
    occupiedPositions: Position[] = [],
    excludeUnit?: Unit
  ): Position[] {
    const startTime = performance.now();

    // Check cache first
    const cacheKey = this.generatePathfindingCacheKey(start, goal, map, maxCost, occupiedPositions);
    const cachedResult = this.getFromPathfindingCache(cacheKey);

    if (cachedResult) {
      this.performanceMetrics.cacheHits++;
      return cachedResult;
    }

    this.performanceMetrics.cacheMisses++;
    this.performanceMetrics.pathfindingCount++;

    let path: Position[];
    let nodesExplored = 0;

    // Use enhanced pathfinding with MapRenderer if available
    if (this.mapRenderer) {
      const result = this.findPathWithRendererAndMetrics(start, goal, map, maxCost, excludeUnit);
      path = result.path;
      nodesExplored = result.nodesExplored;
    } else {
      // Fallback to original implementation
      const result = this.findPathOriginalWithMetrics(start, goal, map, maxCost, occupiedPositions);
      path = result.path;
      nodesExplored = result.nodesExplored;
    }

    // Update performance metrics
    const pathfindingTime = performance.now() - startTime;
    this.performanceMetrics.totalPathfindingTime += pathfindingTime;
    this.performanceMetrics.averagePathfindingTime =
      this.performanceMetrics.totalPathfindingTime / this.performanceMetrics.pathfindingCount;

    if (pathfindingTime > this.performanceMetrics.maxPathfindingTime) {
      this.performanceMetrics.maxPathfindingTime = pathfindingTime;
    }

    this.performanceMetrics.nodesExplored += nodesExplored;
    this.performanceMetrics.averageNodesExplored =
      this.performanceMetrics.nodesExplored / this.performanceMetrics.pathfindingCount;

    if (nodesExplored > 100) {
      this.performanceMetrics.complexPathCount++;
    }

    // Cache the result
    this.cachePathfindingResult(cacheKey, start, goal, map, maxCost, occupiedPositions, path);

    return path;
  }

  /**
   * Enhanced pathfinding using MapRenderer for collision detection with metrics
   */
  private findPathWithRendererAndMetrics(
    start: Position,
    goal: Position,
    map: MapData,
    maxCost: number,
    excludeUnit?: Unit
  ): { path: Position[]; nodesExplored: number } {
    let nodesExplored = 0;

    // Validate inputs
    if (!this.isValidPosition(start, map) || !this.isValidPosition(goal, map)) {
      return { path: [], nodesExplored };
    }

    if (maxCost <= 0) {
      return { path: [], nodesExplored };
    }

    // If start and goal are the same, return path with just the start position
    if (PositionUtils.equals(start, goal)) {
      return { path: [PositionUtils.clone(start)], nodesExplored };
    }

    // Check if goal is reachable (terrain must be passable)
    if (!this.mapRenderer!.isTerrainPassable(goal)) {
      return { path: [], nodesExplored };
    }

    // Initialize A* data structures
    const openSet = new PriorityQueue<PathNode>((a, b) => a.fScore - b.fScore);
    const closedSet = new Set<string>();
    const gScores = new Map<string, number>();
    const nodes = new Map<string, PathNode>();

    // Create start node
    const startNode: PathNode = {
      position: PositionUtils.clone(start),
      gScore: 0,
      hScore: this.calculateHeuristic(start, goal),
      fScore: 0,
    };
    startNode.fScore = startNode.gScore + startNode.hScore;

    const startKey = PositionUtils.toKey(start);
    gScores.set(startKey, 0);
    nodes.set(startKey, startNode);
    openSet.enqueue(startNode);

    while (!openSet.isEmpty()) {
      const currentNode = openSet.dequeue()!;
      const currentKey = PositionUtils.toKey(currentNode.position);
      nodesExplored++;

      // Early termination for complex paths to prevent performance issues
      if (nodesExplored > 500) {
        console.warn('PathfindingService: Early termination due to complexity (MapRenderer)');
        return { path: [], nodesExplored };
      }

      // Check if we've reached the goal
      if (PositionUtils.equals(currentNode.position, goal)) {
        return { path: this.reconstructPath(currentNode), nodesExplored };
      }

      // Move current node to closed set
      closedSet.add(currentKey);

      // Explore neighbors
      const neighbors = PositionUtils.getAdjacentPositions(currentNode.position);

      for (const neighborPos of neighbors) {
        const neighborKey = PositionUtils.toKey(neighborPos);

        // Skip if already evaluated
        if (closedSet.has(neighborKey)) {
          continue;
        }

        // Skip if position is blocked (except goal which can be occupied)
        const isGoal = PositionUtils.equals(neighborPos, goal);
        if (!isGoal && this.mapRenderer!.isPositionBlocked(neighborPos, excludeUnit)) {
          continue;
        }

        // Calculate movement cost using MapRenderer
        const movementCost = this.mapRenderer!.getTerrainMovementCost(
          currentNode.position,
          neighborPos
        );

        // Skip if terrain is impassable
        if (movementCost === -1) {
          continue;
        }

        const tentativeGScore = currentNode.gScore + movementCost;

        // Skip if this path exceeds maximum cost
        if (tentativeGScore > maxCost) {
          continue;
        }

        // Check if this is a better path to the neighbor
        const existingGScore = gScores.get(neighborKey);
        if (existingGScore !== undefined && tentativeGScore >= existingGScore) {
          continue;
        }

        // Create or update neighbor node
        const hScore = this.calculateHeuristic(neighborPos, goal);
        const neighborNode: PathNode = {
          position: PositionUtils.clone(neighborPos),
          gScore: tentativeGScore,
          hScore: hScore,
          fScore: tentativeGScore + hScore,
          parent: currentNode,
        };

        gScores.set(neighborKey, tentativeGScore);
        nodes.set(neighborKey, neighborNode);

        // Add to open set if not already there, or update if better path found
        if (!openSet.contains(neighborPos)) {
          openSet.enqueue(neighborNode);
        } else {
          openSet.updateItem(neighborPos, neighborNode);
        }
      }
    }

    // No path found
    return { path: [], nodesExplored };
  }

  /**
   * Original pathfinding implementation (fallback) with metrics
   */
  private findPathOriginalWithMetrics(
    start: Position,
    goal: Position,
    map: MapData,
    maxCost: number,
    occupiedPositions: Position[] = []
  ): { path: Position[]; nodesExplored: number } {
    let nodesExplored = 0;

    // Validate inputs
    if (!this.isValidPosition(start, map) || !this.isValidPosition(goal, map)) {
      return { path: [], nodesExplored };
    }

    if (maxCost <= 0) {
      return { path: [], nodesExplored };
    }

    // If start and goal are the same, return path with just the start position
    if (PositionUtils.equals(start, goal)) {
      return { path: [PositionUtils.clone(start)], nodesExplored };
    }

    // Convert occupied positions to a set for faster lookup
    const occupiedSet = new Set(occupiedPositions.map(pos => PositionUtils.toKey(pos)));

    // Goal position should be reachable even if occupied (unit can move to another unit's position)
    // but we need to check if the goal itself is passable terrain
    if (!this.isTerrainPassable(goal, map)) {
      return { path: [], nodesExplored };
    }

    // Initialize A* data structures
    const openSet = new PriorityQueue<PathNode>((a, b) => a.fScore - b.fScore);
    const closedSet = new Set<string>();
    const gScores = new Map<string, number>();
    const nodes = new Map<string, PathNode>();

    // Create start node
    const startNode: PathNode = {
      position: PositionUtils.clone(start),
      gScore: 0,
      hScore: this.calculateHeuristic(start, goal),
      fScore: 0,
    };
    startNode.fScore = startNode.gScore + startNode.hScore;

    const startKey = PositionUtils.toKey(start);
    gScores.set(startKey, 0);
    nodes.set(startKey, startNode);
    openSet.enqueue(startNode);

    while (!openSet.isEmpty()) {
      const currentNode = openSet.dequeue()!;
      const currentKey = PositionUtils.toKey(currentNode.position);
      nodesExplored++;

      // Early termination for complex paths to prevent performance issues
      if (nodesExplored > 500) {
        console.warn('PathfindingService: Early termination due to complexity (Original)');
        return { path: [], nodesExplored };
      }

      // Check if we've reached the goal
      if (PositionUtils.equals(currentNode.position, goal)) {
        return { path: this.reconstructPath(currentNode), nodesExplored };
      }

      // Move current node to closed set
      closedSet.add(currentKey);

      // Explore neighbors
      const neighbors = PositionUtils.getAdjacentPositions(currentNode.position);

      for (const neighborPos of neighbors) {
        const neighborKey = PositionUtils.toKey(neighborPos);

        // Skip if already evaluated
        if (closedSet.has(neighborKey)) {
          continue;
        }

        // Skip if position is invalid
        if (!this.isValidPosition(neighborPos, map)) {
          continue;
        }

        // Skip if position is occupied (except goal)
        if (occupiedSet.has(neighborKey) && !PositionUtils.equals(neighborPos, goal)) {
          continue;
        }

        // Calculate movement cost to this neighbor
        const movementCost = this.getMovementCost(currentNode.position, neighborPos, map);

        // Skip if terrain is impassable
        if (movementCost === -1) {
          continue;
        }

        const tentativeGScore = currentNode.gScore + movementCost;

        // Skip if this path exceeds maximum cost
        if (tentativeGScore > maxCost) {
          continue;
        }

        // Check if this is a better path to the neighbor
        const existingGScore = gScores.get(neighborKey);
        if (existingGScore !== undefined && tentativeGScore >= existingGScore) {
          continue;
        }

        // Create or update neighbor node
        const hScore = this.calculateHeuristic(neighborPos, goal);
        const neighborNode: PathNode = {
          position: PositionUtils.clone(neighborPos),
          gScore: tentativeGScore,
          hScore: hScore,
          fScore: tentativeGScore + hScore,
          parent: currentNode,
        };

        gScores.set(neighborKey, tentativeGScore);
        nodes.set(neighborKey, neighborNode);

        // Add to open set if not already there, or update if better path found
        if (!openSet.contains(neighborPos)) {
          openSet.enqueue(neighborNode);
        } else {
          openSet.updateItem(neighborPos, neighborNode);
        }
      }
    }

    // No path found
    return { path: [], nodesExplored };
  }

  /**
   * Find alternative paths when the direct path is blocked
   * @param start - Starting position
   * @param goal - Goal position
   * @param map - Map data
   * @param maxCost - Maximum movement cost
   * @param excludeUnit - Unit to exclude from collision checks
   * @returns Array of alternative paths
   */
  findAlternativePaths(
    start: Position,
    goal: Position,
    map: MapData,
    maxCost: number,
    excludeUnit?: Unit
  ): Position[][] {
    const paths: Position[][] = [];

    // Try direct path first
    const directPath = this.findPath(start, goal, map, maxCost, [], excludeUnit);
    if (directPath.length > 0) {
      paths.push(directPath);
    }

    // If MapRenderer is available, try alternative destinations near the goal
    if (this.mapRenderer && directPath.length === 0) {
      const alternatives = this.mapRenderer.findAlternativePositions(start, goal, excludeUnit);

      for (const altGoal of alternatives) {
        const altPath = this.findPath(start, altGoal, map, maxCost, [], excludeUnit);
        if (altPath.length > 0) {
          paths.push(altPath);
        }
      }
    }

    return paths;
  }

  /**
   * Calculate the total movement cost for a given path
   *
   * @param path - Array of positions representing the path
   * @param map - Map data containing terrain information
   * @returns Total movement cost, or -1 if path is invalid
   */
  calculatePathCost(path: Position[], map: MapData): number {
    if (!path || path.length === 0) {
      return 0;
    }

    if (path.length === 1) {
      return 0; // No movement required
    }

    let totalCost = 0;

    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1];
      const to = path[i];

      // Validate that positions are adjacent
      const distance = PositionUtils.manhattanDistance(from, to);
      if (distance !== 1) {
        return -1; // Invalid path - positions not adjacent
      }

      const movementCost = this.getMovementCost(from, to, map);
      if (movementCost === -1) {
        return -1; // Invalid path - impassable terrain
      }

      totalCost += movementCost;
    }

    return totalCost;
  }

  /**
   * Find multiple paths with different priorities (shortest, safest, etc.)
   *
   * @param start - Starting position
   * @param goal - Goal position
   * @param map - Map data
   * @param maxCost - Maximum movement cost
   * @param occupiedPositions - Occupied positions
   * @returns Object containing different path options
   */
  findMultiplePaths(
    start: Position,
    goal: Position,
    map: MapData,
    maxCost: number,
    occupiedPositions: Position[] = []
  ): {
    shortest: Position[];
    safest: Position[];
    direct: Position[];
  } {
    const shortest = this.findPath(start, goal, map, maxCost, occupiedPositions);

    // For now, return the same path for all options
    // In the future, we could implement different heuristics for different path types
    return {
      shortest: shortest,
      safest: shortest, // Could prioritize safer terrain
      direct: shortest, // Could prioritize more direct routes
    };
  }

  /**
   * Check if a path is valid and within movement range
   *
   * @param path - Path to validate
   * @param map - Map data
   * @param maxCost - Maximum allowed movement cost
   * @param occupiedPositions - Occupied positions
   * @returns True if path is valid, false otherwise
   */
  isPathValid(
    path: Position[],
    map: MapData,
    maxCost: number,
    occupiedPositions: Position[] = []
  ): boolean {
    if (!path || path.length === 0) {
      return false;
    }

    // Check path cost
    const pathCost = this.calculatePathCost(path, map);
    if (pathCost === -1 || pathCost > maxCost) {
      return false;
    }

    // Check for occupied positions (except the last position which is the destination)
    const occupiedSet = new Set(occupiedPositions.map(pos => PositionUtils.toKey(pos)));

    for (let i = 1; i < path.length - 1; i++) {
      if (occupiedSet.has(PositionUtils.toKey(path[i]))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update terrain cost configuration
   */
  setTerrainCosts(terrainCosts: TerrainCost): void {
    this.terrainCosts = { ...terrainCosts };
  }

  /**
   * Get current terrain cost configuration
   */
  getTerrainCosts(): TerrainCost {
    const copy: TerrainCost = {};
    for (const key in this.terrainCosts) {
      copy[key] = { ...this.terrainCosts[key] };
    }
    return copy;
  }

  /**
   * Calculate heuristic distance between two positions
   * Uses Manhattan distance as it's appropriate for grid-based movement
   */
  private calculateHeuristic(from: Position, to: Position): number {
    return PositionUtils.manhattanDistance(from, to);
  }

  /**
   * Reconstruct the path from goal to start using parent pointers
   */
  private reconstructPath(goalNode: PathNode): Position[] {
    const path: Position[] = [];
    let currentNode: PathNode | undefined = goalNode;

    while (currentNode) {
      path.unshift(PositionUtils.clone(currentNode.position));
      currentNode = currentNode.parent;
    }

    return path;
  }

  /**
   * Get movement cost between two adjacent positions
   */
  private getMovementCost(from: Position, to: Position, map: MapData): number {
    // Use MapRenderer if available
    if (this.mapRenderer) {
      return this.mapRenderer.getTerrainMovementCost(from, to);
    }

    // Fallback to original implementation
    // Validate positions are adjacent
    const distance = PositionUtils.manhattanDistance(from, to);
    if (distance !== 1) {
      return -1;
    }

    // Validate destination position
    if (!this.isValidPosition(to, map)) {
      return -1;
    }

    // Get terrain type at destination
    const terrainType = this.getTerrainTypeAt(to, map);
    const terrainConfig = this.terrainCosts[terrainType.toString()];

    // Use default if terrain type not configured
    if (!terrainConfig) {
      return this.terrainCosts['0'].movementCost;
    }

    // Return -1 for impassable terrain
    if (!terrainConfig.isPassable) {
      return -1;
    }

    return terrainConfig.movementCost;
  }

  /**
   * Check if a position is valid within map bounds
   */
  private isValidPosition(position: Position, map: MapData): boolean {
    return PositionUtils.isValidPosition(position, map.width, map.height);
  }

  /**
   * Check if terrain at position is passable
   */
  private isTerrainPassable(position: Position, map: MapData): boolean {
    // Use MapRenderer if available
    if (this.mapRenderer) {
      return this.mapRenderer.isTerrainPassable(position);
    }

    // Fallback to original implementation
    const terrainType = this.getTerrainTypeAt(position, map);
    const terrainConfig = this.terrainCosts[terrainType.toString()];

    if (!terrainConfig) {
      return this.terrainCosts['0'].isPassable;
    }

    return terrainConfig.isPassable;
  }

  /**
   * Get terrain type at a specific position
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
   * Get default terrain cost configuration
   */
  private getDefaultTerrainCosts(): TerrainCost {
    return {
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
  }

  /**
   * Generate cache key for pathfinding calculations
   */
  private generatePathfindingCacheKey(
    start: Position,
    goal: Position,
    map: MapData,
    maxCost: number,
    occupiedPositions: Position[]
  ): string {
    const mapHash = this.generateMapHash(map);
    const occupiedHash = this.generateOccupiedPositionsHash(occupiedPositions);
    return `${PositionUtils.toKey(start)}_${PositionUtils.toKey(goal)}_${maxCost}_${mapHash}_${occupiedHash}`;
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

    // Create a simple hash from terrain data (sample for performance)
    let hash = `${map.width}x${map.height}`;
    for (let y = 0; y < Math.min(terrainLayer.data.length, 8); y++) {
      for (let x = 0; x < Math.min(terrainLayer.data[y].length, 8); x++) {
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
   * Get result from pathfinding cache
   */
  private getFromPathfindingCache(cacheKey: string): Position[] | null {
    const entry = this.pathfindingCache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.pathfindingCache.delete(cacheKey);
      return null;
    }

    return entry.path.map(pos => PositionUtils.clone(pos));
  }

  /**
   * Cache pathfinding calculation result
   */
  private cachePathfindingResult(
    cacheKey: string,
    start: Position,
    goal: Position,
    map: MapData,
    maxCost: number,
    occupiedPositions: Position[],
    path: Position[]
  ): void {
    // Enforce cache size limit
    if (this.pathfindingCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheEntry();
    }

    const entry: PathfindingCacheEntry = {
      start: PositionUtils.clone(start),
      goal: PositionUtils.clone(goal),
      maxCost: maxCost,
      mapHash: this.generateMapHash(map),
      occupiedHash: this.generateOccupiedPositionsHash(occupiedPositions),
      path: path.map(pos => PositionUtils.clone(pos)),
      timestamp: Date.now(),
    };

    this.pathfindingCache.set(cacheKey, entry);
  }

  /**
   * Evict oldest cache entry to maintain cache size limit
   */
  private evictOldestCacheEntry(): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.pathfindingCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.pathfindingCache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();

    for (const [key, entry] of this.pathfindingCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.pathfindingCache.delete(key);
      }
    }
  }

  /**
   * Clear all caches (useful for testing or when map changes significantly)
   */
  public clearCache(): void {
    this.pathfindingCache.clear();
  }

  /**
   * Get performance metrics for monitoring
   */
  public getPerformanceMetrics(): PathfindingPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Reset performance metrics
   */
  public resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      pathfindingCount: 0,
      totalPathfindingTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averagePathfindingTime: 0,
      maxPathfindingTime: 0,
      nodesExplored: 0,
      averageNodesExplored: 0,
      complexPathCount: 0,
    };
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStatistics(): {
    pathfindingCacheSize: number;
    cacheHitRate: number;
    averagePathComplexity: number;
    complexPathPercentage: number;
  } {
    const totalRequests = this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.performanceMetrics.cacheHits / totalRequests : 0;
    const complexPathPercentage =
      this.performanceMetrics.pathfindingCount > 0
        ? this.performanceMetrics.complexPathCount / this.performanceMetrics.pathfindingCount
        : 0;

    return {
      pathfindingCacheSize: this.pathfindingCache.size,
      cacheHitRate: cacheHitRate,
      averagePathComplexity: this.performanceMetrics.averageNodesExplored,
      complexPathPercentage: complexPathPercentage,
    };
  }
}
