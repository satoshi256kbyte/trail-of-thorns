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
import { CharacterSkillData, ActiveSkillEffect, BuffType, StatusEffectType } from '../types/skill';

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
            activeUnitIndex: 0,
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
                    message: 'Units array is empty or invalid',
                };
            }

            // Validate all units
            for (const unit of units) {
                if (!unit || typeof unit.stats?.speed !== 'number' || unit.stats.speed <= 0) {
                    return {
                        success: false,
                        error: GameplayError.CHARACTER_LOAD_FAILED,
                        message: `Invalid unit or speed stat: ${unit?.id || 'unknown'}`,
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
                activeUnit: this.getActiveUnit(),
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to initialize turn order',
                details: error,
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
                    message: 'No units in turn order',
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
                phase: this.gameState.phase,
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to advance turn',
                details: error,
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

        // Handle skill states for new round
        this.handleNewRoundSkillStates();

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
            activeUnit: firstUnit,
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
                    message: 'Unit is undefined',
                };
            }

            // Only allow selecting player units during player turns
            if (this.gameState.activePlayer === 'player' && unit.faction !== 'player') {
                return {
                    success: false,
                    error: GameplayError.INVALID_ACTION,
                    message: 'Cannot select enemy unit during player turn',
                };
            }

            // Don't allow selecting units that have already acted
            if (unit.hasActed && this.gameState.activePlayer === 'player') {
                return {
                    success: false,
                    error: GameplayError.INVALID_ACTION,
                    message: 'Unit has already acted this turn',
                };
            }

            this.gameState.selectedUnit = unit;
            this.gameState.phase = 'select';

            // Emit unit selected event
            this.eventEmitter?.emit('unit-selected', {
                selectedUnit: unit,
                canAct: !unit.hasActed,
                canMove: !unit.hasMoved,
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_ACTION,
                message: 'Failed to select unit',
                details: error,
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
        if (
            this.gameState.activeUnitIndex >= 0 &&
            this.gameState.activeUnitIndex < this.gameState.turnOrder.length
        ) {
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
            const validPhases: GameState['phase'][] = [
                'select',
                'move',
                'action',
                'enemy',
                'ai_thinking',
                'victory',
                'defeat',
            ];

            if (!validPhases.includes(phase)) {
                return {
                    success: false,
                    error: GameplayError.INVALID_TURN_STATE,
                    message: `Invalid phase: ${phase}`,
                };
            }

            this.gameState.phase = phase;

            // Emit phase changed event
            this.eventEmitter?.emit('phase-changed', {
                phase: phase,
                activePlayer: this.gameState.activePlayer,
                activeUnit: this.getActiveUnit(),
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to set phase',
                details: error,
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
                    currentTurn: this.gameState.currentTurn,
                });
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to set game result',
                details: error,
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
                    message: `Unit not found in turn order: ${updatedUnit.id}`,
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
                isActive: this.getActiveUnit()?.id === updatedUnit.id,
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to update unit',
                details: error,
            };
        }
    }

    /**
     * Check if a character can move based on turn state
     *
     * @param character Character to check
     * @returns True if character can move, false otherwise
     */
    canCharacterMove(character: Unit): boolean {
        try {
            // Basic validation
            if (!character) {
                return false;
            }

            // Validate character structure
            if (!character.stats || typeof character.stats.movement !== 'number') {
                return false;
            }

            // Game must not be ended
            if (this.isGameEnded()) {
                return false;
            }

            // Character must be alive
            if (character.currentHP <= 0) {
                return false;
            }

            // Character must have movement points
            if (character.stats.movement <= 0) {
                return false;
            }

            // Character must not have already moved this turn
            if (character.hasMoved) {
                return false;
            }

            // For player characters, it must be player turn
            if (character.faction === 'player' && !this.isPlayerTurn()) {
                return false;
            }

            // For enemy characters, it must be enemy turn
            if (character.faction === 'enemy' && !this.isEnemyTurn()) {
                return false;
            }

            // Character must be in the turn order
            const isInTurnOrder = this.gameState.turnOrder.some(unit => unit.id === character.id);
            if (!isInTurnOrder) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking if character can move:', error);
            return false;
        }
    }

    /**
     * Mark a character as having moved and update movement flags
     *
     * @param character Character that completed movement
     * @returns GameplayErrorResult indicating success or failure
     */
    markCharacterMoved(character: Unit): GameplayErrorResult {
        try {
            if (!character) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: 'Character is null or undefined',
                };
            }

            // Find the character in turn order
            const unitIndex = this.gameState.turnOrder.findIndex(unit => unit.id === character.id);
            if (unitIndex === -1) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: `Character not found in turn order: ${character.id}`,
                };
            }

            // Update movement flag
            this.gameState.turnOrder[unitIndex].hasMoved = true;
            character.hasMoved = true;

            // Update selected unit if it's the same character
            if (this.gameState.selectedUnit?.id === character.id) {
                this.gameState.selectedUnit.hasMoved = true;
            }

            // Emit movement completed event
            this.eventEmitter?.emit('character-movement-completed', {
                character: character,
                canStillAct: !character.hasActed,
                turnComplete: character.hasActed && character.hasMoved,
            });

            // Check if we should advance turn automatically
            this.checkTurnAdvancement();

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to mark character as moved',
                details: error,
            };
        }
    }

    /**
     * Check if turn should advance automatically and do so if needed
     * This handles the logic for when all characters have moved/acted
     */
    private checkTurnAdvancement(): void {
        try {
            // Get the current active unit
            const activeUnit = this.getActiveUnit();
            if (!activeUnit) {
                return;
            }

            // If current unit has both moved and acted, advance to next turn
            if (activeUnit.hasMoved && activeUnit.hasActed) {
                this.nextTurn();
                return;
            }

            // For enemy turns, check if all enemy units have completed their turns
            if (this.isEnemyTurn()) {
                const enemyUnits = this.getEnemyUnits();
                const allEnemiesComplete = enemyUnits.every(
                    unit => unit.currentHP <= 0 || (unit.hasMoved && unit.hasActed)
                );

                if (allEnemiesComplete) {
                    // Find next player unit that can act
                    const playerUnits = this.getPlayerUnits();
                    const nextPlayerUnit = playerUnits.find(
                        unit => unit.currentHP > 0 && (!unit.hasMoved || !unit.hasActed)
                    );

                    if (nextPlayerUnit) {
                        // Switch to player turn
                        this.gameState.activePlayer = 'player';
                        this.gameState.phase = 'select';
                        this.eventEmitter?.emit('turn-switched-to-player', {
                            availableUnits: playerUnits.filter(
                                unit => unit.currentHP > 0 && (!unit.hasMoved || !unit.hasActed)
                            ),
                        });
                    } else {
                        // All units have completed their turns, start new round
                        this.startNewRound();
                    }
                }
            }

            // For player turns, check if all player units have completed their turns
            if (this.isPlayerTurn()) {
                const playerUnits = this.getPlayerUnits();
                const allPlayersComplete = playerUnits.every(
                    unit => unit.currentHP <= 0 || (unit.hasMoved && unit.hasActed)
                );

                if (allPlayersComplete) {
                    // Switch to enemy turn
                    this.gameState.activePlayer = 'enemy';
                    this.gameState.phase = 'enemy';
                    this.eventEmitter?.emit('turn-switched-to-enemy', {
                        enemyUnits: this.getEnemyUnits().filter(unit => unit.currentHP > 0),
                    });
                }
            }
        } catch (error) {
            console.error('Error checking turn advancement:', error);
        }
    }

    /**
     * Get all characters that can still move this turn
     *
     * @returns Array of characters that can move
     */
    getCharactersCanMove(): Unit[] {
        return this.gameState.turnOrder.filter(unit => this.canCharacterMove(unit));
    }

    /**
     * Get all player characters that can still move this turn
     *
     * @returns Array of player characters that can move
     */
    getPlayerCharactersCanMove(): Unit[] {
        return this.getPlayerUnits().filter(unit => this.canCharacterMove(unit));
    }

    /**
     * Get all enemy characters that can still move this turn
     *
     * @returns Array of enemy characters that can move
     */
    getEnemyCharactersCanMove(): Unit[] {
        return this.getEnemyUnits().filter(unit => this.canCharacterMove(unit));
    }

    /**
     * Check if all characters of the current player have moved
     *
     * @returns True if all current player's characters have moved
     */
    haveAllCurrentPlayerCharactersMoved(): boolean {
        const currentPlayerUnits =
            this.gameState.activePlayer === 'player' ? this.getPlayerUnits() : this.getEnemyUnits();

        return currentPlayerUnits
            .filter(unit => unit.currentHP > 0) // Only consider living units
            .every(unit => unit.hasMoved);
    }

    /**
     * Check if all characters of the current player have acted (moved and performed action)
     *
     * @returns True if all current player's characters have completed their turn
     */
    haveAllCurrentPlayerCharactersActed(): boolean {
        const currentPlayerUnits =
            this.gameState.activePlayer === 'player' ? this.getPlayerUnits() : this.getEnemyUnits();

        return currentPlayerUnits
            .filter(unit => unit.currentHP > 0) // Only consider living units
            .every(unit => unit.hasMoved && unit.hasActed);
    }

    /**
     * Force advance to next turn (for manual turn advancement)
     *
     * @returns GameplayErrorResult indicating success or failure
     */
    forceNextTurn(): GameplayErrorResult {
        try {
            // Mark current active unit as having acted if they haven't
            const activeUnit = this.getActiveUnit();
            if (activeUnit && !activeUnit.hasActed) {
                activeUnit.hasActed = true;
            }

            return this.nextTurn();
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to force next turn',
                details: error,
            };
        }
    }

    /**
     * Start AI thinking phase for enemy turn
     * @param aiUnit - AI unit that is thinking
     * @returns GameplayErrorResult indicating success or failure
     */
    startAIThinkingPhase(aiUnit: Unit): GameplayErrorResult {
        try {
            if (!aiUnit || aiUnit.faction !== 'enemy') {
                return {
                    success: false,
                    error: GameplayError.INVALID_ACTION,
                    message: 'Invalid AI unit for thinking phase',
                };
            }

            // Set AI thinking phase
            this.gameState.phase = 'ai_thinking';

            // Emit AI thinking started event
            this.eventEmitter?.emit('ai-thinking-started', {
                aiUnit,
                currentTurn: this.gameState.currentTurn,
                activePlayer: this.gameState.activePlayer,
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to start AI thinking phase',
                details: error,
            };
        }
    }

    /**
     * Complete AI thinking phase and return to enemy action phase
     * @param aiUnit - AI unit that completed thinking
     * @returns GameplayErrorResult indicating success or failure
     */
    completeAIThinkingPhase(aiUnit: Unit): GameplayErrorResult {
        try {
            if (this.gameState.phase !== 'ai_thinking') {
                return {
                    success: false,
                    error: GameplayError.INVALID_TURN_STATE,
                    message: 'Not currently in AI thinking phase',
                };
            }

            // Return to enemy phase
            this.gameState.phase = 'enemy';

            // Emit AI thinking completed event
            this.eventEmitter?.emit('ai-thinking-completed', {
                aiUnit,
                currentTurn: this.gameState.currentTurn,
                activePlayer: this.gameState.activePlayer,
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to complete AI thinking phase',
                details: error,
            };
        }
    }

    /**
     * Update AI unit state at turn start (skill cooldowns, status effects)
     * @param aiUnit - AI unit to update
     * @returns GameplayErrorResult indicating success or failure
     */
    updateAIUnitAtTurnStart(aiUnit: Unit): GameplayErrorResult {
        try {
            if (!aiUnit) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: 'AI unit is null or undefined',
                };
            }

            // Update skill states for the AI unit
            const skillUpdateResult = this.updateSkillStates(aiUnit);
            if (!skillUpdateResult.success) {
                return skillUpdateResult;
            }

            // Reset action flags for the new turn
            aiUnit.hasActed = false;
            aiUnit.hasMoved = false;

            // Update unit in turn order
            const updateResult = this.updateUnit(aiUnit);
            if (!updateResult.success) {
                return updateResult;
            }

            // Emit AI unit turn start event
            this.eventEmitter?.emit('ai-unit-turn-started', {
                aiUnit,
                currentTurn: this.gameState.currentTurn,
                skillStatesUpdated: true,
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to update AI unit at turn start',
                details: error,
            };
        }
    }

    /**
     * Mark AI action as completed and update turn state
     * @param aiUnit - AI unit that completed action
     * @param actionType - Type of action completed
     * @returns GameplayErrorResult indicating success or failure
     */
    completeAIAction(aiUnit: Unit, actionType: 'move' | 'attack' | 'skill' | 'wait'): GameplayErrorResult {
        try {
            if (!aiUnit) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: 'AI unit is null or undefined',
                };
            }

            // Mark appropriate action flags
            switch (actionType) {
                case 'move':
                    aiUnit.hasMoved = true;
                    break;
                case 'attack':
                case 'skill':
                case 'wait':
                    aiUnit.hasActed = true;
                    break;
            }

            // Update unit in turn order
            const updateResult = this.updateUnit(aiUnit);
            if (!updateResult.success) {
                return updateResult;
            }

            // Emit AI action completed event
            this.eventEmitter?.emit('ai-action-completed', {
                aiUnit,
                actionType,
                turnComplete: aiUnit.hasActed && aiUnit.hasMoved,
                currentTurn: this.gameState.currentTurn,
            });

            // Check if AI turn is complete and advance if needed
            if (aiUnit.hasActed && aiUnit.hasMoved) {
                // Small delay before advancing turn to allow for visual feedback
                setTimeout(() => {
                    this.nextTurn();
                }, 500);
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to complete AI action',
                details: error,
            };
        }
    }

    // =============================================================================
    // スキルシステム統合機能
    // =============================================================================

    /**
     * スキル使用後のターン処理を実行する
     * @param character スキルを使用したキャラクター
     * @param skillId 使用されたスキルID
     * @param skillData スキルデータ
     * @returns 処理結果
     */
    handleSkillUsage(character: Unit, skillId: string, skillData?: any): GameplayErrorResult {
        try {
            if (!character) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: 'Character is null or undefined',
                };
            }

            this.log('Handling skill usage', { characterId: character.id, skillId });

            // キャラクターを行動済みにマーク
            const updateResult = this.markCharacterActed(character);
            if (!updateResult.success) {
                return updateResult;
            }

            // スキルクールダウンを設定
            if (skillData?.cooldown && skillData.cooldown > 0) {
                this.setSkillCooldown(character, skillId, skillData.cooldown);
            }

            // スキル使用回数を記録
            this.incrementSkillUsageCount(character, skillId);

            // ターン終了判定
            if (this.shouldEndTurn(character)) {
                const nextTurnResult = this.nextTurn();
                if (!nextTurnResult.success) {
                    return nextTurnResult;
                }
            }

            // スキル使用イベントを発火
            this.eventEmitter?.emit('skill-used', {
                character,
                skillId,
                skillData,
                turnComplete: character.hasActed && character.hasMoved,
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to handle skill usage',
                details: error,
            };
        }
    }

    /**
     * ターン開始時のスキル状態更新を実行する
     * @param character 対象キャラクター
     * @returns 処理結果
     */
    updateSkillStates(character: Unit): GameplayErrorResult {
        try {
            if (!character) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: 'Character is null or undefined',
                };
            }

            this.log('Updating skill states', { characterId: character.id });

            // スキルクールダウンを減少
            this.decreaseSkillCooldowns(character);

            // 継続効果を処理
            this.processContinuousEffects(character);

            // スキル状態更新イベントを発火
            this.eventEmitter?.emit('skill-states-updated', {
                character,
                currentTurn: this.gameState.currentTurn,
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to update skill states',
                details: error,
            };
        }
    }

    /**
     * キャラクターを行動済みにマークする
     * @param character 対象キャラクター
     * @returns 処理結果
     */
    private markCharacterActed(character: Unit): GameplayErrorResult {
        try {
            // ターンオーダー内のキャラクターを更新
            const unitIndex = this.gameState.turnOrder.findIndex(unit => unit.id === character.id);
            if (unitIndex === -1) {
                return {
                    success: false,
                    error: GameplayError.UNIT_NOT_FOUND,
                    message: `Character not found in turn order: ${character.id}`,
                };
            }

            this.gameState.turnOrder[unitIndex].hasActed = true;
            character.hasActed = true;

            // 選択中のユニットも更新
            if (this.gameState.selectedUnit?.id === character.id) {
                this.gameState.selectedUnit.hasActed = true;
            }

            // キャラクター行動完了イベントを発火
            this.eventEmitter?.emit('character-action-completed', {
                character,
                canStillMove: !character.hasMoved,
                turnComplete: character.hasActed && character.hasMoved,
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: GameplayError.INVALID_TURN_STATE,
                message: 'Failed to mark character as acted',
                details: error,
            };
        }
    }

    /**
     * ターン終了判定
     * @param character 対象キャラクター
     * @returns ターンを終了すべきかどうか
     */
    private shouldEndTurn(character: Unit): boolean {
        try {
            // キャラクターが移動と行動の両方を完了した場合
            if (character.hasActed && character.hasMoved) {
                return true;
            }

            // 現在のプレイヤーの全キャラクターが行動完了した場合
            if (this.haveAllCurrentPlayerCharactersActed()) {
                return true;
            }

            return false;
        } catch (error) {
            this.log('Error in shouldEndTurn', { error: error.message });
            return false;
        }
    }

    /**
     * スキルクールダウンを設定する
     * @param character 対象キャラクター
     * @param skillId スキルID
     * @param cooldown クールダウンターン数
     */
    private setSkillCooldown(character: Unit, skillId: string, cooldown: number): void {
        try {
            // キャラクターのスキルデータを取得または作成
            if (!character.skillData) {
                character.skillData = {
                    characterId: character.id,
                    learnedSkills: [],
                    skillCooldowns: new Map(),
                    skillUsageCounts: new Map(),
                    skillLearnHistory: [],
                    activeEffects: [],
                } as CharacterSkillData;
            }

            // クールダウンを設定
            character.skillData.skillCooldowns.set(skillId, cooldown);

            this.log('Skill cooldown set', {
                characterId: character.id,
                skillId,
                cooldown,
            });
        } catch (error) {
            this.log('Error setting skill cooldown', {
                characterId: character.id,
                skillId,
                error: error.message,
            });
        }
    }

    /**
     * スキル使用回数を増加させる
     * @param character 対象キャラクター
     * @param skillId スキルID
     */
    private incrementSkillUsageCount(character: Unit, skillId: string): void {
        try {
            // キャラクターのスキルデータを取得または作成
            if (!character.skillData) {
                character.skillData = {
                    characterId: character.id,
                    learnedSkills: [],
                    skillCooldowns: new Map(),
                    skillUsageCounts: new Map(),
                    skillLearnHistory: [],
                    activeEffects: [],
                } as CharacterSkillData;
            }

            // 使用回数を増加
            const currentCount = character.skillData.skillUsageCounts.get(skillId) || 0;
            character.skillData.skillUsageCounts.set(skillId, currentCount + 1);

            this.log('Skill usage count incremented', {
                characterId: character.id,
                skillId,
                newCount: currentCount + 1,
            });
        } catch (error) {
            this.log('Error incrementing skill usage count', {
                characterId: character.id,
                skillId,
                error: error.message,
            });
        }
    }

    /**
     * スキルクールダウンを減少させる
     * @param character 対象キャラクター
     */
    private decreaseSkillCooldowns(character: Unit): void {
        try {
            if (!character.skillData?.skillCooldowns) {
                return;
            }

            const cooldowns = character.skillData.skillCooldowns;
            const updatedCooldowns = new Map<string, number>();

            for (const [skillId, cooldown] of cooldowns.entries()) {
                const newCooldown = Math.max(0, cooldown - 1);
                if (newCooldown > 0) {
                    updatedCooldowns.set(skillId, newCooldown);
                }
                // クールダウンが0になったスキルは削除（Map から除外）
            }

            character.skillData.skillCooldowns = updatedCooldowns;

            this.log('Skill cooldowns decreased', {
                characterId: character.id,
                remainingCooldowns: updatedCooldowns.size,
            });
        } catch (error) {
            this.log('Error decreasing skill cooldowns', {
                characterId: character.id,
                error: error.message,
            });
        }
    }

    /**
     * 継続効果を処理する
     * @param character 対象キャラクター
     */
    private processContinuousEffects(character: Unit): void {
        try {
            if (!character.skillData?.activeEffects) {
                return;
            }

            const activeEffects = character.skillData.activeEffects;
            const remainingEffects: ActiveSkillEffect[] = [];

            for (const effect of activeEffects) {
                // 持続時間を減少
                effect.remainingDuration--;

                if (effect.remainingDuration > 0) {
                    remainingEffects.push(effect);
                } else {
                    // 効果が終了した場合の処理
                    this.removeSkillEffect(character, effect);

                    this.log('Skill effect expired', {
                        characterId: character.id,
                        effectId: effect.effectId,
                        effectType: effect.effectType,
                    });
                }
            }

            character.skillData.activeEffects = remainingEffects;

            // 継続ダメージや回復の処理
            this.applyContinuousEffects(character, remainingEffects);

            this.log('Continuous effects processed', {
                characterId: character.id,
                remainingEffects: remainingEffects.length,
            });
        } catch (error) {
            this.log('Error processing continuous effects', {
                characterId: character.id,
                error: error.message,
            });
        }
    }

    /**
     * スキル効果を除去する
     * @param character 対象キャラクター
     * @param effect 除去する効果
     */
    private removeSkillEffect(character: Unit, effect: ActiveSkillEffect): void {
        try {
            // バフ・デバフ効果の除去
            if (this.isBuffEffect(effect.effectType)) {
                this.removeBuffEffect(character, effect.effectType as BuffType);
            }

            // 状態異常効果の除去
            if (this.isStatusEffect(effect.effectType)) {
                this.removeStatusEffect(character, effect.effectType as StatusEffectType);
            }

            // 効果除去イベントを発火
            this.eventEmitter?.emit('skill-effect-removed', {
                character,
                effect,
                currentTurn: this.gameState.currentTurn,
            });
        } catch (error) {
            this.log('Error removing skill effect', {
                characterId: character.id,
                effectId: effect.effectId,
                error: error.message,
            });
        }
    }

    /**
     * 継続効果を適用する
     * @param character 対象キャラクター
     * @param effects アクティブな効果リスト
     */
    private applyContinuousEffects(character: Unit, effects: ActiveSkillEffect[]): void {
        try {
            for (const effect of effects) {
                // 毒ダメージなどの継続ダメージ
                if (effect.effectType === StatusEffectType.POISON) {
                    const damage = Math.max(1, Math.floor(character.stats.maxHP * 0.1)); // 最大HPの10%
                    character.currentHP = Math.max(0, character.currentHP - damage);

                    this.eventEmitter?.emit('continuous-damage-applied', {
                        character,
                        damage,
                        effectType: effect.effectType,
                        sourceSkillId: effect.sourceSkillId,
                    });
                }

                // 継続回復効果（将来の拡張用）
                // その他の継続効果もここで処理
            }
        } catch (error) {
            this.log('Error applying continuous effects', {
                characterId: character.id,
                error: error.message,
            });
        }
    }

    /**
     * バフ効果かどうかを判定
     * @param effectType 効果種別
     * @returns バフ効果かどうか
     */
    private isBuffEffect(effectType: BuffType | StatusEffectType): effectType is BuffType {
        return Object.values(BuffType).includes(effectType as BuffType);
    }

    /**
     * 状態異常効果かどうかを判定
     * @param effectType 効果種別
     * @returns 状態異常効果かどうか
     */
    private isStatusEffect(effectType: BuffType | StatusEffectType): effectType is StatusEffectType {
        return Object.values(StatusEffectType).includes(effectType as StatusEffectType);
    }

    /**
     * バフ効果を除去する
     * @param character 対象キャラクター
     * @param buffType バフ種別
     */
    private removeBuffEffect(character: Unit, buffType: BuffType): void {
        try {
            // バフ効果の除去処理
            // 実際の実装では、キャラクターの能力値を元に戻す処理を行う
            this.log('Buff effect removed', {
                characterId: character.id,
                buffType,
            });
        } catch (error) {
            this.log('Error removing buff effect', {
                characterId: character.id,
                buffType,
                error: error.message,
            });
        }
    }

    /**
     * 状態異常効果を除去する
     * @param character 対象キャラクター
     * @param statusType 状態異常種別
     */
    private removeStatusEffect(character: Unit, statusType: StatusEffectType): void {
        try {
            // 状態異常効果の除去処理
            // 実際の実装では、キャラクターの状態フラグを更新する処理を行う
            this.log('Status effect removed', {
                characterId: character.id,
                statusType,
            });
        } catch (error) {
            this.log('Error removing status effect', {
                characterId: character.id,
                statusType,
                error: error.message,
            });
        }
    }

    /**
     * キャラクターのスキルクールダウン状態を取得する
     * @param character 対象キャラクター
     * @param skillId スキルID
     * @returns 残りクールダウンターン数（0は使用可能）
     */
    getSkillCooldown(character: Unit, skillId: string): number {
        try {
            if (!character.skillData?.skillCooldowns) {
                return 0;
            }

            return character.skillData.skillCooldowns.get(skillId) || 0;
        } catch (error) {
            this.log('Error getting skill cooldown', {
                characterId: character.id,
                skillId,
                error: error.message,
            });
            return 0;
        }
    }

    /**
     * キャラクターのスキル使用回数を取得する
     * @param character 対象キャラクター
     * @param skillId スキルID
     * @returns 使用回数
     */
    getSkillUsageCount(character: Unit, skillId: string): number {
        try {
            if (!character.skillData?.skillUsageCounts) {
                return 0;
            }

            return character.skillData.skillUsageCounts.get(skillId) || 0;
        } catch (error) {
            this.log('Error getting skill usage count', {
                characterId: character.id,
                skillId,
                error: error.message,
            });
            return 0;
        }
    }

    /**
     * キャラクターのアクティブな効果を取得する
     * @param character 対象キャラクター
     * @returns アクティブな効果リスト
     */
    getActiveSkillEffects(character: Unit): ActiveSkillEffect[] {
        try {
            return character.skillData?.activeEffects || [];
        } catch (error) {
            this.log('Error getting active skill effects', {
                characterId: character.id,
                error: error.message,
            });
            return [];
        }
    }

    /**
     * 新しいラウンド開始時のスキル状態処理
     */
    private handleNewRoundSkillStates(): void {
        try {
            // 全キャラクターのスキル状態を更新
            for (const unit of this.gameState.turnOrder) {
                if (unit.currentHP > 0 && unit.skillData) { // 生存していてスキルデータがあるキャラクターのみ
                    this.updateSkillStates(unit);
                }
            }

            this.log('New round skill states updated', {
                currentTurn: this.gameState.currentTurn,
                aliveUnits: this.gameState.turnOrder.filter(u => u.currentHP > 0).length,
            });
        } catch (error) {
            this.log('Error handling new round skill states', {
                error: error.message,
            });
        }
    }

    /**
     * ログ出力（デバッグ用）
     * @param message メッセージ
     * @param data 追加データ
     */
    private log(message: string, data?: any): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[GameStateManager] ${message}`, data || '');
        }
    }
}
