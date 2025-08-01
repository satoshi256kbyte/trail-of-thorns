/**
 * GameStateManager - Manages turn-based gameplay state and progression
 * 
 * This class handles:
 * - Turn order calculation based on character speed
 * - Turn progression and player switching
 * - Unit selection and current player tracking
 * - Game state validation and transitions
 */

import { Unit, GameState, GameplayError, GameplayErrorResult } from '../types/gameplay';

export class GameStateManager {
    private gameState: GameState;
    private eventEmitter?: Phaser.Events.EventEmitter;

    constructor(eventEmitter?: Phaser.Events.EventEmitter) {
        this.eventEmitter = eventEmitter;
        this.gameState = this.createInitialGameState();
    }

    /**
     * Creates the initial game state
     */
    private createInitialGameState(): GameState {
        return {
            currentTurn: 1,
            activePlayer: 'player',
            phase: 'select',
            selectedUnit: undefined,
            gameResult: null,
            turnOrder: [],
            activeUnitIndex: 0
        };
    }

    /**
     * Initialize turn order based on character speed stats
     * Units with higher speed act first, with ties broken by faction (player first)
     * 
     * @param units Array of all units in the battle
     * @returns GameplayErrorResult indicating success or failure
     */
    initializeTurnOrder(units: Unit[]): GameplayErrorResult {
        try {
            if (!Array.isArray(units) || units.length === 0) {
                return {
                    success: false,
                    error: GameplayError.INVALID_STAGE_DATA,
                    message: 'Units array is empty or invalid'
                };
            }

            // Validate all units
            for (const unit of units) {
                if (!unit || typeof unit.stats?.speed !== 'number' || unit.stats.speed <= 0) {
                    return {
                        success: false,
                        error: GameplayError.CHARACTER_LOAD_FAILED,
                        message: `Invalid unit or speed stat: ${unit?.id || 'unknown'}`
                    };
                }
            }

            // Sort units by speed (descending), with player units taking priority in ties
            const sortedUnits = [...units].sort((a, b) => {
                // Primary sort: speed (higher first)
                if (a.stats.speed !== b.stats.speed) {
                    return b.stats.speed - a.stats.speed;
                }

                // Secondary sort: faction (player first)
                if (a.faction !== b.faction) {
                    return a.faction === 'player' ? -1 : 1;
                }

                // Tertiary sort: unit ID for consistency
                return a.id.localeCompare(b.id);
            });

            // Reset unit action states
            sortedUnits.forEach(unit => {
                unit.hasActed = false;
                unit.hasMoved = false;
            });

            // Update game state
            this.gameState.turnOrder = sortedUnits;
            this.gameState.activeUnitIndex = 0;
            this.gameState.currentTurn = 1;
            this.gameState.activePlayer = sortedUnits[0]?.faction || 'player';
            this.gameState.phase = 'select';
            this.gameState.selectedUnit = undefined;
            this.gameState.gameResult = null;

            // Emit turn order initialized event
            this.eventEmitter?.emit('turn-order-initialized', {
                turnOrder: this.gameState.turnOrder,
                activeUnit: this.getActiveUnit()
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to initialize turn order',
                details: error
            };
        }
    }

    /**
     * Advance to the next turn
     * Handles turn progression and player switching
     * 
     * @returns GameplayErrorResult indicating success or failure
     */
    nextTurn(): GameplayErrorResult {
        try {
            if (this.gameState.turnOrder.length === 0) {
                return {
                    success: false,
                    error: GameplayError.INVALID_TURN_STATE,
                    message: 'No units in turn order'
                };
            }

            // Mark current unit as having acted
            const currentUnit = this.getActiveUnit();
            if (currentUnit) {
                currentUnit.hasActed = true;
            }

            // Move to next unit in turn order
            this.gameState.activeUnitIndex++;

            // Check if we've completed a full round
            if (this.gameState.activeUnitIndex >= this.gameState.turnOrder.length) {
                this.startNewRound();
            } else {
                // Update active player based on current unit
                const nextUnit = this.getActiveUnit();
                if (nextUnit) {
                    this.gameState.activePlayer = nextUnit.faction;
                    this.gameState.phase = nextUnit.faction === 'player' ? 'select' : 'enemy';
                }
            }

            // Clear selected unit when switching players
            if (this.gameState.activePlayer === 'enemy') {
                this.gameState.selectedUnit = undefined;
            }

            // Emit turn changed event
            this.eventEmitter?.emit('turn-changed', {
                currentTurn: this.gameState.currentTurn,
                activePlayer: this.gameState.activePlayer,
                activeUnit: this.getActiveUnit(),
                phase: this.gameState.phase
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to advance turn',
                details: error
            };
        }
    }

    /**
     * Start a new round (all units have acted)
     */
    private startNewRound(): void {
        this.gameState.currentTurn++;
        this.gameState.activeUnitIndex = 0;

        // Reset all unit action states for the new round
        this.gameState.turnOrder.forEach(unit => {
            unit.hasActed = false;
            unit.hasMoved = false;
        });

        // Set active player based on first unit in turn order
        const firstUnit = this.getActiveUnit();
        if (firstUnit) {
            this.gameState.activePlayer = firstUnit.faction;
            this.gameState.phase = firstUnit.faction === 'player' ? 'select' : 'enemy';
        }

        // Emit new round event
        this.eventEmitter?.emit('new-round-started', {
            currentTurn: this.gameState.currentTurn,
            activePlayer: this.gameState.activePlayer,
            activeUnit: firstUnit
        });
    }

    /**
     * Select a unit (for player turns)
     * 
     * @param unit Unit to select
     * @returns GameplayErrorResult indicating success or failure
     */
    selectUnit(unit: Unit | null): GameplayErrorResult {
        try {
            // Allow deselection with null
            if (unit === null) {
                this.gameState.selectedUnit = undefined;
                this.eventEmitter?.emit('unit-deselected');
                return { success: true };
            }

            // Validate unit selection
            if (!unit) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: 'Unit is undefined'
                };
            }

            // Only allow selecting player units during player turns
            if (this.gameState.activePlayer === 'player' && unit.faction !== 'player') {
                return {
                    success: false,
                    error: GameplayError.INVALID_ACTION,
                    message: 'Cannot select enemy unit during player turn'
                };
            }

            // Don't allow selecting units that have already acted
            if (unit.hasActed && this.gameState.activePlayer === 'player') {
                return {
                    success: false,
                    error: GameplayError.INVALID_ACTION,
                    message: 'Unit has already acted this turn'
                };
            }

            this.gameState.selectedUnit = unit;
            this.gameState.phase = 'select';

            // Emit unit selected event
            this.eventEmitter?.emit('unit-selected', {
                selectedUnit: unit,
                canAct: !unit.hasActed,
                canMove: !unit.hasMoved
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_ACTION,
                message: 'Failed to select unit',
                details: error
            };
        }
    }

    /**
     * Get the current active player
     * 
     * @returns Current active player ('player' or 'enemy')
     */
    getCurrentPlayer(): 'player' | 'enemy' {
        return this.gameState.activePlayer;
    }

    /**
     * Get the currently active unit (whose turn it is)
     * 
     * @returns Currently active unit or undefined
     */
    getActiveUnit(): Unit | undefined {
        if (this.gameState.activeUnitIndex >= 0 &&
            this.gameState.activeUnitIndex < this.gameState.turnOrder.length) {
            return this.gameState.turnOrder[this.gameState.activeUnitIndex];
        }
        return undefined;
    }

    /**
     * Get the currently selected unit
     * 
     * @returns Currently selected unit or undefined
     */
    getSelectedUnit(): Unit | undefined {
        return this.gameState.selectedUnit;
    }

    /**
     * Get the current game state (read-only copy)
     * 
     * @returns Copy of current game state
     */
    getGameState(): Readonly<GameState> {
        return { ...this.gameState };
    }

    /**
     * Get the current turn number
     * 
     * @returns Current turn number
     */
    getCurrentTurn(): number {
        return this.gameState.currentTurn;
    }

    /**
     * Get the current game phase
     * 
     * @returns Current game phase
     */
    getCurrentPhase(): GameState['phase'] {
        return this.gameState.phase;
    }

    /**
     * Set the game phase
     * 
     * @param phase New game phase
     * @returns GameplayErrorResult indicating success or failure
     */
    setPhase(phase: GameState['phase']): GameplayErrorResult {
        try {
            const validPhases: GameState['phase'][] = ['select', 'move', 'action', 'enemy', 'victory', 'defeat'];

            if (!validPhases.includes(phase)) {
                return {
                    success: false,
                    error: GameplayError.INVALID_TURN_STATE,
                    message: `Invalid phase: ${phase}`
                };
            }

            this.gameState.phase = phase;

            // Emit phase changed event
            this.eventEmitter?.emit('phase-changed', {
                phase: phase,
                activePlayer: this.gameState.activePlayer,
                activeUnit: this.getActiveUnit()
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to set phase',
                details: error
            };
        }
    }

    /**
     * Set the game result (victory/defeat)
     * 
     * @param result Game result
     * @returns GameplayErrorResult indicating success or failure
     */
    setGameResult(result: 'victory' | 'defeat' | null): GameplayErrorResult {
        try {
            this.gameState.gameResult = result;

            if (result) {
                this.gameState.phase = result;

                // Emit game ended event
                this.eventEmitter?.emit('game-ended', {
                    result: result,
                    currentTurn: this.gameState.currentTurn
                });
            }

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to set game result',
                details: error
            };
        }
    }

    /**
     * Check if it's currently a player's turn
     * 
     * @returns True if it's a player turn
     */
    isPlayerTurn(): boolean {
        return this.gameState.activePlayer === 'player';
    }

    /**
     * Check if it's currently an enemy's turn
     * 
     * @returns True if it's an enemy turn
     */
    isEnemyTurn(): boolean {
        return this.gameState.activePlayer === 'enemy';
    }

    /**
     * Check if the game has ended
     * 
     * @returns True if game has ended (victory or defeat)
     */
    isGameEnded(): boolean {
        return this.gameState.gameResult !== null;
    }

    /**
     * Get all units that haven't acted this turn
     * 
     * @returns Array of units that can still act
     */
    getUnitsCanAct(): Unit[] {
        return this.gameState.turnOrder.filter(unit => !unit.hasActed);
    }

    /**
     * Get all player units
     * 
     * @returns Array of player units
     */
    getPlayerUnits(): Unit[] {
        return this.gameState.turnOrder.filter(unit => unit.faction === 'player');
    }

    /**
     * Get all enemy units
     * 
     * @returns Array of enemy units
     */
    getEnemyUnits(): Unit[] {
        return this.gameState.turnOrder.filter(unit => unit.faction === 'enemy');
    }

    /**
     * Reset the game state to initial values
     */
    reset(): void {
        this.gameState = this.createInitialGameState();
        this.eventEmitter?.emit('game-state-reset');
    }

    /**
     * Update a unit in the turn order (for when unit properties change)
     * 
     * @param updatedUnit Updated unit data
     * @returns GameplayErrorResult indicating success or failure
     */
    updateUnit(updatedUnit: Unit): GameplayErrorResult {
        try {
            const index = this.gameState.turnOrder.findIndex(unit => unit.id === updatedUnit.id);

            if (index === -1) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: `Unit not found in turn order: ${updatedUnit.id}`
                };
            }

            this.gameState.turnOrder[index] = updatedUnit;

            // Update selected unit if it's the same unit
            if (this.gameState.selectedUnit?.id === updatedUnit.id) {
                this.gameState.selectedUnit = updatedUnit;
            }

            // Emit unit updated event
            this.eventEmitter?.emit('unit-updated', {
                unit: updatedUnit,
                isSelected: this.gameState.selectedUnit?.id === updatedUnit.id,
                isActive: this.getActiveUnit()?.id === updatedUnit.id
            });

            return { success: true };

        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to update unit',
                details: error
            };
        }
    }
}