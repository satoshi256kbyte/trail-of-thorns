/**
 * OptimizedNPCStateManager - Performance-optimized NPC state management
 * 
 * This class extends the base NPCStateManager with performance optimizations:
 * - Efficient data structures for fast lookups
 * - Batch operations for multiple NPCs
 * - Memory pooling for NPC state objects
 * - Spatial indexing for position-based queries
 * - Lazy evaluation of expensive operations
 */

import { NPCStateManager, NPCConversionResult, NPCDamageResult } from './NPCStateManager';
import {
    NPCState,
    NPCVisualState,
    RecruitmentError,
    RecruitmentUtils
} from '../../types/recruitment';
import { Unit, Position } from '../../types/gameplay';

export interface NPCIndex {
    /** Index by unit ID for O(1) lookups */
    byId: Map<string, NPCState>;
    /** Index by recruitment ID */
    byRecruitmentId: Map<string, string>; // recruitmentId -> unitId
    /** Index by conversion turn */
    byTurn: Map<number, Set<string>>; // turn -> Set<unitId>
    /** Index by faction */
    byFaction: Map<string, Set<string>>; // faction -> Set<unitId>
    /** Spatial index for position-based queries */
    spatial: SpatialIndex;
}

export interface SpatialIndex {
    /** Grid-based spatial index for fast position queries */
    grid: Map<string, Set<string>>; // "x,y" -> Set<unitId>
    /** Grid cell size for spatial indexing */
    cellSize: number;
}

export interface NPCStatePool {
    /** Pool of reusable NPC state objects */
    available: NPCState[];
    /** Pool of reusable visual state objects */
    visualStates: NPCVisualState[];
    /** Maximum pool size */
    maxSize: number;
    /** Current pool usage statistics */
    stats: {
        created: number;
        reused: number;
        poolHits: number;
        poolMisses: number;
    };
}

export interface BatchOperation {
    /** Type of batch operation */
    type: 'convert' | 'damage' | 'update' | 'remove';
    /** Units to operate on */
    units: Unit[];
    /** Additional parameters */
    params?: any;
}

export interface OptimizationMetrics {
    /** Average lookup time in milliseconds */
    averageLookupTime: number;
    /** Memory usage in bytes */
    memoryUsage: number;
    /** Number of spatial index cells */
    spatialCells: number;
    /** Pool efficiency (0-1) */
    poolEfficiency: number;
    /** Index fragmentation (0-1) */
    indexFragmentation: number;
}

/**
 * Performance-optimized NPC state manager
 */
export class OptimizedNPCStateManager extends NPCStateManager {
    private npcIndex: NPCIndex;
    private statePool: NPCStatePool;
    private batchQueue: BatchOperation[];
    private metrics: OptimizationMetrics;
    private lookupTimes: number[];

    // Optimization configuration
    private readonly SPATIAL_CELL_SIZE = 64; // pixels
    private readonly MAX_POOL_SIZE = 50;
    private readonly BATCH_SIZE = 10;
    private readonly METRICS_SAMPLE_SIZE = 100;

    constructor(
        scene?: Phaser.Scene,
        config?: any,
        eventEmitter?: Phaser.Events.EventEmitter
    ) {
        super(scene, config, eventEmitter);

        this.npcIndex = this.initializeIndex();
        this.statePool = this.initializePool();
        this.batchQueue = [];
        this.metrics = this.initializeMetrics();
        this.lookupTimes = [];
    }

    /**
     * Initialize optimized index structures
     */
    private initializeIndex(): NPCIndex {
        return {
            byId: new Map(),
            byRecruitmentId: new Map(),
            byTurn: new Map(),
            byFaction: new Map(),
            spatial: {
                grid: new Map(),
                cellSize: this.SPATIAL_CELL_SIZE
            }
        };
    }

    /**
     * Initialize object pool
     */
    private initializePool(): NPCStatePool {
        return {
            available: [],
            visualStates: [],
            maxSize: this.MAX_POOL_SIZE,
            stats: {
                created: 0,
                reused: 0,
                poolHits: 0,
                poolMisses: 0
            }
        };
    }

    /**
     * Initialize performance metrics
     */
    private initializeMetrics(): OptimizationMetrics {
        return {
            averageLookupTime: 0,
            memoryUsage: 0,
            spatialCells: 0,
            poolEfficiency: 0,
            indexFragmentation: 0
        };
    }

    /**
     * Convert unit to NPC with optimized indexing
     */
    convertToNPC(unit: Unit, recruitmentId: string, currentTurn: number): NPCConversionResult {
        const startTime = performance.now();

        try {
            // Call parent implementation
            const result = super.convertToNPC(unit, recruitmentId, currentTurn);

            if (result.success && result.npcState) {
                // Add to optimized indexes
                this.addToIndexes(unit.id, result.npcState, unit);

                // Update metrics
                this.recordLookupTime(performance.now() - startTime);
                this.updateMetrics();
            }

            return result;

        } catch (error) {
            return {
                success: false,
                error: RecruitmentError.SYSTEM_ERROR,
                message: 'Error in optimized NPC conversion'
            };
        }
    }

    /**
     * Optimized NPC state lookup
     */
    getNPCState(unit: Unit): NPCState | undefined {
        const startTime = performance.now();

        try {
            // Use optimized index for O(1) lookup
            const npcState = this.npcIndex.byId.get(unit.id);

            this.recordLookupTime(performance.now() - startTime);
            return npcState;

        } catch (error) {
            console.error('Error in optimized NPC state lookup:', error);
            return undefined;
        }
    }

    /**
     * Batch convert multiple units to NPCs
     */
    batchConvertToNPC(units: Unit[], recruitmentIds: string[], currentTurn: number): NPCConversionResult[] {
        const results: NPCConversionResult[] = [];
        const startTime = performance.now();

        try {
            // Validate input
            if (units.length !== recruitmentIds.length) {
                throw new Error('Units and recruitment IDs arrays must have same length');
            }

            // Process all units synchronously for simplicity
            for (let i = 0; i < units.length; i++) {
                const result = this.convertToNPC(units[i], recruitmentIds[i], currentTurn);
                results.push(result);
            }

            // Update metrics for batch operation
            this.recordLookupTime(performance.now() - startTime);
            this.updateMetrics();

            return results;

        } catch (error) {
            console.error('Error in batch NPC conversion:', error);
            return units.map(() => ({
                success: false,
                error: RecruitmentError.SYSTEM_ERROR,
                message: 'Batch conversion failed'
            }));
        }
    }

    /**
     * Get NPCs by recruitment ID (optimized lookup)
     */
    getNPCByRecruitmentId(recruitmentId: string): NPCState | undefined {
        const startTime = performance.now();

        try {
            const unitId = this.npcIndex.byRecruitmentId.get(recruitmentId);
            if (!unitId) {
                return undefined;
            }

            const npcState = this.npcIndex.byId.get(unitId);
            this.recordLookupTime(performance.now() - startTime);
            return npcState;

        } catch (error) {
            console.error('Error getting NPC by recruitment ID:', error);
            return undefined;
        }
    }

    /**
     * Get NPCs converted in a specific turn
     */
    getNPCsByTurn(turn: number): NPCState[] {
        const startTime = performance.now();

        try {
            const unitIds = this.npcIndex.byTurn.get(turn);
            if (!unitIds) {
                return [];
            }

            const npcs: NPCState[] = [];
            for (const unitId of unitIds) {
                const npcState = this.npcIndex.byId.get(unitId);
                if (npcState) {
                    npcs.push(npcState);
                }
            }

            this.recordLookupTime(performance.now() - startTime);
            return npcs;

        } catch (error) {
            console.error('Error getting NPCs by turn:', error);
            return [];
        }
    }

    /**
     * Get NPCs by original faction
     */
    getNPCsByFaction(faction: string): NPCState[] {
        const startTime = performance.now();

        try {
            const unitIds = this.npcIndex.byFaction.get(faction);
            if (!unitIds) {
                return [];
            }

            const npcs: NPCState[] = [];
            for (const unitId of unitIds) {
                const npcState = this.npcIndex.byId.get(unitId);
                if (npcState) {
                    npcs.push(npcState);
                }
            }

            this.recordLookupTime(performance.now() - startTime);
            return npcs;

        } catch (error) {
            console.error('Error getting NPCs by faction:', error);
            return [];
        }
    }

    /**
     * Get NPCs within a spatial area (optimized spatial query)
     */
    getNPCsInArea(center: Position, radius: number): { unitId: string; npcState: NPCState }[] {
        const startTime = performance.now();

        try {
            const results: { unitId: string; npcState: NPCState }[] = [];
            const cellSize = this.npcIndex.spatial.cellSize;

            // Calculate grid cells to check
            const minX = Math.floor((center.x - radius) / cellSize);
            const maxX = Math.floor((center.x + radius) / cellSize);
            const minY = Math.floor((center.y - radius) / cellSize);
            const maxY = Math.floor((center.y + radius) / cellSize);

            // Check each relevant grid cell
            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    const cellKey = `${x},${y}`;
                    const unitIds = this.npcIndex.spatial.grid.get(cellKey);

                    if (unitIds) {
                        for (const unitId of unitIds) {
                            const npcState = this.npcIndex.byId.get(unitId);
                            if (npcState) {
                                // TODO: In a real implementation, we'd need unit position
                                // For now, assume all units in cell are within radius
                                results.push({ unitId, npcState });
                            }
                        }
                    }
                }
            }

            this.recordLookupTime(performance.now() - startTime);
            return results;

        } catch (error) {
            console.error('Error getting NPCs in area:', error);
            return [];
        }
    }

    /**
     * Remove NPC state with index cleanup
     */
    removeNPCState(unit: Unit): boolean {
        const startTime = performance.now();

        try {
            const npcState = this.npcIndex.byId.get(unit.id);
            if (!npcState) {
                return false;
            }

            // Remove from all indexes
            this.removeFromIndexes(unit.id, npcState, unit);

            // Return state to pool
            this.returnStateToPool(npcState);

            // Call parent cleanup
            const result = super.removeNPCState(unit);

            this.recordLookupTime(performance.now() - startTime);
            this.updateMetrics();

            return result;

        } catch (error) {
            console.error('Error removing NPC state:', error);
            return false;
        }
    }

    /**
     * Clear all NPC states with optimized cleanup
     */
    clearAllNPCStates(): void {
        const startTime = performance.now();

        try {
            // Return all states to pool before clearing
            for (const npcState of this.npcIndex.byId.values()) {
                this.returnStateToPool(npcState);
            }

            // Clear all indexes
            this.npcIndex.byId.clear();
            this.npcIndex.byRecruitmentId.clear();
            this.npcIndex.byTurn.clear();
            this.npcIndex.byFaction.clear();
            this.npcIndex.spatial.grid.clear();

            // Call parent cleanup
            super.clearAllNPCStates();

            this.recordLookupTime(performance.now() - startTime);
            this.updateMetrics();

        } catch (error) {
            console.error('Error clearing all NPC states:', error);
        }
    }

    /**
     * Add NPC to all relevant indexes
     */
    private addToIndexes(unitId: string, npcState: NPCState, unit: Unit): void {
        // Add to primary index
        this.npcIndex.byId.set(unitId, npcState);

        // Add to recruitment ID index
        if (npcState.recruitmentId) {
            this.npcIndex.byRecruitmentId.set(npcState.recruitmentId, unitId);
        }

        // Add to turn index
        const turnSet = this.npcIndex.byTurn.get(npcState.convertedAt) || new Set();
        turnSet.add(unitId);
        this.npcIndex.byTurn.set(npcState.convertedAt, turnSet);

        // Add to faction index
        const factionSet = this.npcIndex.byFaction.get(npcState.originalFaction) || new Set();
        factionSet.add(unitId);
        this.npcIndex.byFaction.set(npcState.originalFaction, factionSet);

        // Add to spatial index
        if (unit.position) {
            this.addToSpatialIndex(unitId, unit.position);
        }
    }

    /**
     * Remove NPC from all indexes
     */
    private removeFromIndexes(unitId: string, npcState: NPCState, unit: Unit): void {
        // Remove from primary index
        this.npcIndex.byId.delete(unitId);

        // Remove from recruitment ID index
        if (npcState.recruitmentId) {
            this.npcIndex.byRecruitmentId.delete(npcState.recruitmentId);
        }

        // Remove from turn index
        const turnSet = this.npcIndex.byTurn.get(npcState.convertedAt);
        if (turnSet) {
            turnSet.delete(unitId);
            if (turnSet.size === 0) {
                this.npcIndex.byTurn.delete(npcState.convertedAt);
            }
        }

        // Remove from faction index
        const factionSet = this.npcIndex.byFaction.get(npcState.originalFaction);
        if (factionSet) {
            factionSet.delete(unitId);
            if (factionSet.size === 0) {
                this.npcIndex.byFaction.delete(npcState.originalFaction);
            }
        }

        // Remove from spatial index
        if (unit.position) {
            this.removeFromSpatialIndex(unitId, unit.position);
        }
    }

    /**
     * Add unit to spatial index
     */
    private addToSpatialIndex(unitId: string, position: Position): void {
        const cellSize = this.npcIndex.spatial.cellSize;
        const cellX = Math.floor(position.x / cellSize);
        const cellY = Math.floor(position.y / cellSize);
        const cellKey = `${cellX},${cellY}`;

        const cellSet = this.npcIndex.spatial.grid.get(cellKey) || new Set();
        cellSet.add(unitId);
        this.npcIndex.spatial.grid.set(cellKey, cellSet);
    }

    /**
     * Remove unit from spatial index
     */
    private removeFromSpatialIndex(unitId: string, position: Position): void {
        const cellSize = this.npcIndex.spatial.cellSize;
        const cellX = Math.floor(position.x / cellSize);
        const cellY = Math.floor(position.y / cellSize);
        const cellKey = `${cellX},${cellY}`;

        const cellSet = this.npcIndex.spatial.grid.get(cellKey);
        if (cellSet) {
            cellSet.delete(unitId);
            if (cellSet.size === 0) {
                this.npcIndex.spatial.grid.delete(cellKey);
            }
        }
    }

    /**
     * Get NPC state from pool or create new one
     */
    private getStateFromPool(): NPCState {
        if (this.statePool.available.length > 0) {
            const state = this.statePool.available.pop()!;
            this.statePool.stats.reused++;
            this.statePool.stats.poolHits++;
            return state;
        }

        this.statePool.stats.created++;
        this.statePool.stats.poolMisses++;

        return {
            convertedAt: 0,
            remainingHP: 0,
            isProtected: false,
            visualState: this.getVisualStateFromPool(),
            originalFaction: 'enemy',
            recruitmentId: ''
        };
    }

    /**
     * Get visual state from pool or create new one
     */
    private getVisualStateFromPool(): NPCVisualState {
        if (this.statePool.visualStates.length > 0) {
            return this.statePool.visualStates.pop()!;
        }

        return RecruitmentUtils.createDefaultNPCVisualState();
    }

    /**
     * Return NPC state to pool for reuse
     */
    private returnStateToPool(npcState: NPCState): void {
        if (this.statePool.available.length < this.statePool.maxSize) {
            // Reset state for reuse
            npcState.convertedAt = 0;
            npcState.remainingHP = 0;
            npcState.isProtected = false;
            npcState.originalFaction = 'enemy';
            npcState.recruitmentId = '';

            this.statePool.available.push(npcState);

            // Return visual state to pool
            if (this.statePool.visualStates.length < this.statePool.maxSize) {
                this.statePool.visualStates.push(npcState.visualState);
            }
        }
    }

    /**
     * Record lookup time for performance monitoring
     */
    private recordLookupTime(time: number): void {
        this.lookupTimes.push(time);

        // Keep only recent samples
        if (this.lookupTimes.length > this.METRICS_SAMPLE_SIZE) {
            this.lookupTimes.shift();
        }
    }

    /**
     * Update performance metrics
     */
    private updateMetrics(): void {
        // Calculate average lookup time
        if (this.lookupTimes.length > 0) {
            const sum = this.lookupTimes.reduce((a, b) => a + b, 0);
            this.metrics.averageLookupTime = sum / this.lookupTimes.length;
        }

        // Calculate memory usage
        this.metrics.memoryUsage = this.calculateMemoryUsage();

        // Update spatial cells count
        this.metrics.spatialCells = this.npcIndex.spatial.grid.size;

        // Calculate pool efficiency
        const totalPoolRequests = this.statePool.stats.poolHits + this.statePool.stats.poolMisses;
        this.metrics.poolEfficiency = totalPoolRequests > 0
            ? this.statePool.stats.poolHits / totalPoolRequests
            : 0;

        // Calculate index fragmentation
        this.metrics.indexFragmentation = this.calculateIndexFragmentation();
    }

    /**
     * Calculate estimated memory usage
     */
    private calculateMemoryUsage(): number {
        let totalSize = 0;

        // NPC states
        totalSize += this.npcIndex.byId.size * 200; // Estimated size per NPC state

        // Indexes
        totalSize += this.npcIndex.byRecruitmentId.size * 50;
        totalSize += this.npcIndex.byTurn.size * 100;
        totalSize += this.npcIndex.byFaction.size * 100;
        totalSize += this.npcIndex.spatial.grid.size * 50;

        // Pool
        totalSize += this.statePool.available.length * 200;
        totalSize += this.statePool.visualStates.length * 100;

        return totalSize;
    }

    /**
     * Calculate index fragmentation (0 = no fragmentation, 1 = high fragmentation)
     */
    private calculateIndexFragmentation(): number {
        let totalSets = 0;
        let totalElements = 0;
        let emptyOrSmallSets = 0;

        // Check turn index fragmentation
        for (const turnSet of this.npcIndex.byTurn.values()) {
            totalSets++;
            totalElements += turnSet.size;
            if (turnSet.size <= 1) {
                emptyOrSmallSets++;
            }
        }

        // Check faction index fragmentation
        for (const factionSet of this.npcIndex.byFaction.values()) {
            totalSets++;
            totalElements += factionSet.size;
            if (factionSet.size <= 1) {
                emptyOrSmallSets++;
            }
        }

        // Check spatial index fragmentation
        for (const spatialSet of this.npcIndex.spatial.grid.values()) {
            totalSets++;
            totalElements += spatialSet.size;
            if (spatialSet.size <= 1) {
                emptyOrSmallSets++;
            }
        }

        return totalSets > 0 ? emptyOrSmallSets / totalSets : 0;
    }

    /**
     * Get optimization metrics
     */
    getOptimizationMetrics(): OptimizationMetrics {
        this.updateMetrics();
        return { ...this.metrics };
    }

    /**
     * Get pool statistics
     */
    getPoolStatistics(): NPCStatePool['stats'] {
        return { ...this.statePool.stats };
    }

    /**
     * Optimize indexes and clean up fragmentation
     */
    optimizeIndexes(): void {
        // Clean up empty sets in turn index
        for (const [turn, turnSet] of this.npcIndex.byTurn.entries()) {
            if (turnSet.size === 0) {
                this.npcIndex.byTurn.delete(turn);
            }
        }

        // Clean up empty sets in faction index
        for (const [faction, factionSet] of this.npcIndex.byFaction.entries()) {
            if (factionSet.size === 0) {
                this.npcIndex.byFaction.delete(faction);
            }
        }

        // Clean up empty sets in spatial index
        for (const [cellKey, spatialSet] of this.npcIndex.spatial.grid.entries()) {
            if (spatialSet.size === 0) {
                this.npcIndex.spatial.grid.delete(cellKey);
            }
        }

        this.updateMetrics();
    }

    /**
     * Destroy optimized manager and cleanup resources
     */
    destroy(): void {
        // Clear all indexes
        this.clearAllNPCStates();

        // Clear pools
        this.statePool.available = [];
        this.statePool.visualStates = [];

        // Clear metrics
        this.lookupTimes = [];

        // Call parent destroy
        super.destroy();
    }
}