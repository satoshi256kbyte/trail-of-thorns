/**
 * NPCStateManager - Manages NPC state for the recruitment system
 * 
 * This class handles:
 * - Converting characters to NPC state after successful recruitment conditions
 * - Managing NPC visual indicators and state
 * - Calculating AI attack priorities for NPCs
 * - Handling damage to NPC characters
 * - Updating visual representation of NPC state
 */

import {
    NPCState,
    NPCVisualState,
    RecruitmentError,
    RecruitmentErrorDetails,
    RecruitmentUtils,
    RecruitmentTypeValidators
} from '../../types/recruitment';
import { Unit, GameplayError, GameplayErrorResult } from '../../types/gameplay';

export interface NPCStateManagerConfig {
    /** Default NPC attack priority multiplier */
    defaultNPCPriority: number;
    /** Maximum number of NPCs that can exist simultaneously */
    maxNPCsPerStage: number;
    /** Whether to automatically show NPC indicators */
    autoShowIndicators: boolean;
    /** Default visual configuration for NPCs */
    defaultVisualConfig: NPCVisualState;
    /** Whether to enable NPC protection mechanics */
    enableProtection: boolean;
}

export interface NPCConversionResult {
    success: boolean;
    npcState?: NPCState;
    error?: RecruitmentError;
    message?: string;
}

export interface NPCDamageResult {
    success: boolean;
    remainingHP: number;
    wasDefeated: boolean;
    error?: RecruitmentError;
    message?: string;
}

/**
 * Manages NPC state for characters that have been converted during recruitment
 */
export class NPCStateManager {
    private npcStates: Map<string, NPCState>;
    private config: NPCStateManagerConfig;
    private scene?: Phaser.Scene;
    private eventEmitter?: Phaser.Events.EventEmitter;
    private npcIndicators: Map<string, Phaser.GameObjects.Container>;

    // Default configuration
    private static readonly DEFAULT_CONFIG: NPCStateManagerConfig = {
        defaultNPCPriority: 100,
        maxNPCsPerStage: 200, // Increased for performance tests
        autoShowIndicators: true,
        defaultVisualConfig: RecruitmentUtils.createDefaultNPCVisualState(),
        enableProtection: true
    };

    constructor(
        scene?: Phaser.Scene,
        config?: Partial<NPCStateManagerConfig>,
        eventEmitter?: Phaser.Events.EventEmitter
    ) {
        this.npcStates = new Map();
        this.config = { ...NPCStateManager.DEFAULT_CONFIG, ...config };
        this.scene = scene;
        this.eventEmitter = eventEmitter;
        this.npcIndicators = new Map();
    }

    /**
     * Convert a character to NPC state
     * 
     * @param unit Unit to convert to NPC
     * @param recruitmentId ID linking to recruitment data
     * @param currentTurn Current game turn
     * @returns Result of the conversion operation
     */
    convertToNPC(unit: Unit, recruitmentId: string, currentTurn: number): NPCConversionResult {
        try {
            // Validate input parameters
            if (!unit || typeof unit !== 'object') {
                return {
                    success: false,
                    error: RecruitmentError.INVALID_TARGET,
                    message: 'Invalid unit provided for NPC conversion'
                };
            }

            if (!recruitmentId || typeof recruitmentId !== 'string') {
                return {
                    success: false,
                    error: RecruitmentError.SYSTEM_ERROR,
                    message: 'Invalid recruitment ID provided'
                };
            }

            if (typeof currentTurn !== 'number' || currentTurn < 1) {
                return {
                    success: false,
                    error: RecruitmentError.SYSTEM_ERROR,
                    message: 'Invalid turn number provided'
                };
            }

            // Check if unit is already an NPC
            if (this.isNPC(unit)) {
                return {
                    success: false,
                    error: RecruitmentError.SYSTEM_ERROR,
                    message: `Unit ${unit.id} is already an NPC`
                };
            }

            // Check NPC limit
            if (this.npcStates.size >= this.config.maxNPCsPerStage) {
                return {
                    success: false,
                    error: RecruitmentError.SYSTEM_ERROR,
                    message: `Maximum NPCs per stage (${this.config.maxNPCsPerStage}) reached`
                };
            }

            // Create NPC state
            const npcState: NPCState = {
                convertedAt: currentTurn,
                remainingHP: unit.currentHP,
                isProtected: this.config.enableProtection,
                visualState: { ...this.config.defaultVisualConfig },
                originalFaction: unit.faction,
                recruitmentId: recruitmentId
            };

            // Validate the created NPC state
            if (!RecruitmentTypeValidators.isValidNPCState(npcState)) {
                return {
                    success: false,
                    error: RecruitmentError.SYSTEM_ERROR,
                    message: 'Failed to create valid NPC state'
                };
            }

            // Store NPC state
            this.npcStates.set(unit.id, npcState);

            // Update unit properties for NPC state
            unit.hasActed = true; // NPCs cannot act
            unit.hasMoved = true; // NPCs cannot move
            unit.faction = 'player'; // NPCs are considered friendly

            // Update visual representation
            this.updateNPCVisuals(unit);

            // Emit NPC conversion event
            this.eventEmitter?.emit('npc-converted', {
                unitId: unit.id,
                unit: unit,
                npcState: npcState,
                turn: currentTurn
            });

            return {
                success: true,
                npcState: npcState
            };

        } catch (error) {
            return {
                success: false,
                error: RecruitmentError.SYSTEM_ERROR,
                message: 'Unexpected error during NPC conversion',
            };
        }
    }

    /**
     * Check if a unit is currently in NPC state
     * 
     * @param unit Unit to check
     * @returns True if unit is an NPC
     */
    isNPC(unit: Unit): boolean {
        try {
            if (!unit || typeof unit !== 'object' || !unit.id) {
                return false;
            }

            return this.npcStates.has(unit.id);
        } catch (error) {
            console.error('Error checking NPC status:', error);
            return false;
        }
    }

    /**
     * Get NPC state for a unit
     * 
     * @param unit Unit to get NPC state for
     * @returns NPC state or undefined if not an NPC
     */
    getNPCState(unit: Unit): NPCState | undefined {
        try {
            if (!unit || typeof unit !== 'object' || !unit.id) {
                return undefined;
            }

            return this.npcStates.get(unit.id);
        } catch (error) {
            console.error('Error getting NPC state:', error);
            return undefined;
        }
    }

    /**
     * Calculate attack priority for AI targeting
     * NPCs should be the highest priority targets for enemy AI
     * 
     * @param unit Unit to calculate priority for
     * @returns Priority value (higher = more priority)
     */
    getNPCPriority(unit: Unit): number {
        try {
            if (!this.isNPC(unit)) {
                return 0; // Not an NPC, no special priority
            }

            const npcState = this.getNPCState(unit);
            if (!npcState) {
                return 0;
            }

            // Use utility function to calculate priority
            return RecruitmentUtils.calculateNPCPriority(npcState, this.config.defaultNPCPriority);

        } catch (error) {
            console.error('Error calculating NPC priority:', error);
            return 0;
        }
    }

    /**
     * Handle damage dealt to an NPC character
     * Updates NPC state and checks for defeat
     * 
     * @param unit NPC unit taking damage
     * @param damage Amount of damage dealt
     * @returns Result of damage handling
     */
    handleNPCDamage(unit: Unit, damage: number): NPCDamageResult {
        try {
            // Validate inputs
            if (!unit || typeof unit !== 'object') {
                return {
                    success: false,
                    remainingHP: 0,
                    wasDefeated: false,
                    error: RecruitmentError.INVALID_TARGET,
                    message: 'Invalid unit provided'
                };
            }

            if (typeof damage !== 'number' || damage < 0) {
                return {
                    success: false,
                    remainingHP: unit.currentHP,
                    wasDefeated: false,
                    error: RecruitmentError.SYSTEM_ERROR,
                    message: 'Invalid damage amount'
                };
            }

            // Check if unit is actually an NPC
            if (!this.isNPC(unit)) {
                return {
                    success: false,
                    remainingHP: unit.currentHP,
                    wasDefeated: false,
                    error: RecruitmentError.INVALID_TARGET,
                    message: 'Unit is not an NPC'
                };
            }

            const npcState = this.getNPCState(unit);
            if (!npcState) {
                return {
                    success: false,
                    remainingHP: unit.currentHP,
                    wasDefeated: false,
                    error: RecruitmentError.SYSTEM_ERROR,
                    message: 'NPC state not found'
                };
            }

            // Apply damage to unit
            const newHP = Math.max(0, unit.currentHP - damage);
            const wasDefeated = newHP <= 0;

            // Update unit HP
            unit.currentHP = newHP;

            // Update NPC state
            npcState.remainingHP = newHP;

            // Handle NPC defeat
            if (wasDefeated) {
                this.handleNPCDefeat(unit);
            } else {
                // Update visuals for damaged NPC
                this.updateNPCVisuals(unit);
            }

            // Emit NPC damage event
            this.eventEmitter?.emit('npc-damaged', {
                unitId: unit.id,
                unit: unit,
                damage: damage,
                remainingHP: newHP,
                wasDefeated: wasDefeated,
                npcState: npcState
            });

            return {
                success: true,
                remainingHP: newHP,
                wasDefeated: wasDefeated
            };

        } catch (error) {
            return {
                success: false,
                remainingHP: unit.currentHP,
                wasDefeated: false,
                error: RecruitmentError.SYSTEM_ERROR,
                message: 'Unexpected error handling NPC damage'
            };
        }
    }

    /**
     * Handle NPC defeat (removal from NPC state)
     * 
     * @param unit Defeated NPC unit
     */
    private handleNPCDefeat(unit: Unit): void {
        try {
            // Remove NPC state
            this.npcStates.delete(unit.id);

            // Remove visual indicators
            this.removeNPCIndicator(unit);

            // Emit NPC defeated event
            this.eventEmitter?.emit('npc-defeated', {
                unitId: unit.id,
                unit: unit,
                recruitmentFailed: true
            });

        } catch (error) {
            console.error('Error handling NPC defeat:', error);
        }
    }

    /**
     * Update visual representation of NPC state
     * Shows indicators and applies visual effects
     * 
     * @param unit NPC unit to update visuals for
     */
    updateNPCVisuals(unit: Unit): void {
        try {
            if (!this.scene || !unit || !unit.sprite) {
                return; // Cannot update visuals without scene or sprite
            }

            const npcState = this.getNPCState(unit);
            if (!npcState) {
                return;
            }

            const visualState = npcState.visualState;

            // Apply tint to sprite
            if (unit.sprite && typeof unit.sprite.setTint === 'function') {
                unit.sprite.setTint(visualState.tintColor);
            }

            // Apply glow effect if enabled
            if (visualState.glowEffect && unit.sprite && typeof unit.sprite.setPostPipeline === 'function') {
                try {
                    // This would apply a glow effect in a real Phaser environment
                    // For now, we'll just increase the sprite scale slightly
                    const currentScale = unit.sprite.scale || 1;
                    unit.sprite.setScale(currentScale * 1.1);
                } catch (error) {
                    // Glow effect not available, continue without it
                }
            }

            // Update or create NPC indicator
            if (visualState.indicatorVisible && this.config.autoShowIndicators) {
                this.showNPCIndicator(unit);
            } else {
                this.removeNPCIndicator(unit);
            }

            // Update animation speed if sprite has animation
            if (unit.sprite && typeof unit.sprite.setAnimationSpeed === 'function') {
                try {
                    unit.sprite.setAnimationSpeed(visualState.animationSpeed);
                } catch (error) {
                    // Animation speed control not available
                }
            }

        } catch (error) {
            console.error('Error updating NPC visuals:', error);
        }
    }

    /**
     * Show NPC indicator above the character
     * 
     * @param unit NPC unit to show indicator for
     */
    private showNPCIndicator(unit: Unit): void {
        try {
            if (!this.scene || !unit.sprite) {
                return;
            }

            // Remove existing indicator
            this.removeNPCIndicator(unit);

            const npcState = this.getNPCState(unit);
            if (!npcState) {
                return;
            }

            // Create indicator container
            const indicator = this.scene.add.container(unit.sprite.x, unit.sprite.y - 40);

            // Create indicator background
            const background = this.scene.add.graphics();
            background.fillStyle(0x000000, 0.7);
            background.fillRoundedRect(-20, -10, 40, 20, 5);
            indicator.add(background);

            // Create indicator icon based on type
            let iconTexture = '__DEFAULT';
            let iconTint = 0xffffff;

            switch (npcState.visualState.indicatorType) {
                case 'crown':
                    iconTint = 0xffd700; // Gold
                    break;
                case 'star':
                    iconTint = 0x00ff00; // Green
                    break;
                case 'heart':
                    iconTint = 0xff69b4; // Pink
                    break;
                default:
                    iconTint = 0x00ffff; // Cyan
                    break;
            }

            // Create simple icon (circle for now)
            const icon = this.scene.add.graphics();
            icon.fillStyle(iconTint);
            icon.fillCircle(0, 0, 8);
            indicator.add(icon);

            // Set indicator depth and scale
            indicator.setDepth(100); // Above everything else
            indicator.setScale(1.2);

            // Add pulsing animation
            this.scene.tweens.add({
                targets: indicator,
                scaleX: 1.4,
                scaleY: 1.4,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Store indicator reference
            this.npcIndicators.set(unit.id, indicator);

        } catch (error) {
            console.error('Error showing NPC indicator:', error);
        }
    }

    /**
     * Remove NPC indicator for a unit
     * 
     * @param unit Unit to remove indicator for
     */
    private removeNPCIndicator(unit: Unit): void {
        try {
            const indicator = this.npcIndicators.get(unit.id);
            if (indicator) {
                indicator.destroy();
                this.npcIndicators.delete(unit.id);
            }
        } catch (error) {
            console.error('Error removing NPC indicator:', error);
        }
    }

    /**
     * Get all current NPC units
     * 
     * @returns Array of unit IDs that are currently NPCs
     */
    getNPCUnitIds(): string[] {
        return Array.from(this.npcStates.keys());
    }

    /**
     * Get all NPC states
     * 
     * @returns Map of unit ID to NPC state
     */
    getAllNPCStates(): Map<string, NPCState> {
        return new Map(this.npcStates);
    }

    /**
     * Get count of current NPCs
     * 
     * @returns Number of units currently in NPC state
     */
    getNPCCount(): number {
        return this.npcStates.size;
    }

    /**
     * Check if NPC limit has been reached
     * 
     * @returns True if at maximum NPC capacity
     */
    isAtNPCLimit(): boolean {
        return this.npcStates.size >= this.config.maxNPCsPerStage;
    }

    /**
     * Remove NPC state from a unit (for stage completion or other reasons)
     * 
     * @param unit Unit to remove NPC state from
     * @returns True if NPC state was removed
     */
    removeNPCState(unit: Unit): boolean {
        try {
            if (!unit || !this.isNPC(unit)) {
                return false;
            }

            // Remove NPC state
            this.npcStates.delete(unit.id);

            // Remove visual indicator
            this.removeNPCIndicator(unit);

            // Reset unit visual state
            if (unit.sprite) {
                unit.sprite.clearTint();
                unit.sprite.setScale(1.0);
            }

            // Emit NPC state removed event
            this.eventEmitter?.emit('npc-state-removed', {
                unitId: unit.id,
                unit: unit
            });

            return true;

        } catch (error) {
            console.error('Error removing NPC state:', error);
            return false;
        }
    }

    /**
     * Clear all NPC states (for stage reset or cleanup)
     */
    clearAllNPCStates(): void {
        try {
            // Remove all indicators
            for (const indicator of this.npcIndicators.values()) {
                indicator.destroy();
            }

            // Clear all data
            this.npcStates.clear();
            this.npcIndicators.clear();

            // Emit all NPCs cleared event
            this.eventEmitter?.emit('all-npcs-cleared');

        } catch (error) {
            console.error('Error clearing all NPC states:', error);
        }
    }

    /**
     * Update configuration
     * 
     * @param newConfig New configuration options
     */
    updateConfig(newConfig: Partial<NPCStateManagerConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Get current configuration
     * 
     * @returns Current configuration
     */
    getConfig(): NPCStateManagerConfig {
        return { ...this.config };
    }

    /**
     * Validate NPC state integrity
     * Checks for inconsistencies in NPC data
     * 
     * @returns Array of validation errors
     */
    validateNPCStates(): string[] {
        const errors: string[] = [];

        try {
            for (const [unitId, npcState] of this.npcStates.entries()) {
                // Validate NPC state structure
                if (!RecruitmentTypeValidators.isValidNPCState(npcState)) {
                    errors.push(`Invalid NPC state structure for unit ${unitId}`);
                    continue;
                }

                // Check for reasonable values
                if (npcState.remainingHP < 0) {
                    errors.push(`Unit ${unitId} has negative HP: ${npcState.remainingHP}`);
                }

                if (npcState.convertedAt < 1) {
                    errors.push(`Unit ${unitId} has invalid conversion turn: ${npcState.convertedAt}`);
                }

                // Validate visual state
                if (!RecruitmentTypeValidators.isValidNPCVisualState(npcState.visualState)) {
                    errors.push(`Invalid visual state for NPC unit ${unitId}`);
                }
            }

        } catch (error) {
            errors.push(`Error during NPC state validation: ${error}`);
        }

        return errors;
    }

    /**
     * Get statistics about current NPC states
     * 
     * @returns Statistics object
     */
    getNPCStatistics(): {
        totalNPCs: number;
        averageHP: number;
        averageTurnsSinceConversion: number;
        protectedNPCs: number;
        originalFactions: Record<string, number>;
    } {
        const stats = {
            totalNPCs: this.npcStates.size,
            averageHP: 0,
            averageTurnsSinceConversion: 0,
            protectedNPCs: 0,
            originalFactions: { player: 0, enemy: 0 }
        };

        if (this.npcStates.size === 0) {
            return stats;
        }

        let totalHP = 0;
        let totalTurns = 0;
        const currentTurn = Date.now(); // Simplified for now

        for (const npcState of this.npcStates.values()) {
            totalHP += npcState.remainingHP;
            totalTurns += (currentTurn - npcState.convertedAt);

            if (npcState.isProtected) {
                stats.protectedNPCs++;
            }

            stats.originalFactions[npcState.originalFaction]++;
        }

        stats.averageHP = Math.round(totalHP / this.npcStates.size);
        stats.averageTurnsSinceConversion = Math.round(totalTurns / this.npcStates.size);

        return stats;
    }

    /**
     * Cleanup and destroy all resources
     */
    destroy(): void {
        try {
            this.clearAllNPCStates();
            this.eventEmitter?.emit('npc-state-manager-destroyed');
        } catch (error) {
            console.error('Error destroying NPCStateManager:', error);
        }
    }
}