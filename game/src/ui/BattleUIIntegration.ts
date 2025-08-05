/**
 * BattleUIIntegration - Integrates battle system with UI components
 * 
 * This class coordinates between the battle system, map renderer, and UI manager
 * to provide comprehensive visual feedback during battles.
 */

import * as Phaser from 'phaser';
import { BattleSystem } from '../systems/BattleSystem';
import { MapRenderer } from '../rendering/MapRenderer';
import { UIManager, BattleResultDisplay, ErrorNotificationData } from './UIManager';
import { Unit, Position } from '../types/gameplay';
import { BattleResult, BattleError, BattleErrorDetails, DamageType } from '../types/battle';

/**
 * Battle UI integration configuration
 */
export interface BattleUIConfig {
    /** Enable automatic UI updates */
    autoUpdateUI: boolean;
    /** Show damage numbers on screen */
    showDamageNumbers: boolean;
    /** Show experience notifications */
    showExperienceNotifications: boolean;
    /** Show battle status messages */
    showBattleStatus: boolean;
    /** Show detailed battle results */
    showBattleResults: boolean;
    /** Auto-hide UI elements after delay */
    autoHideDelay: number;
}

/**
 * Battle UI integration class
 * Coordinates visual feedback between battle system and UI components
 */
export class BattleUIIntegration extends Phaser.Events.EventEmitter {
    private scene: Phaser.Scene;
    private battleSystem: BattleSystem;
    private mapRenderer: MapRenderer;
    private uiManager: UIManager;
    private config: BattleUIConfig;

    // State tracking
    private isIntegrationActive: boolean = false;
    private currentBattlePhase: string = 'idle';

    /**
     * Default configuration
     */
    private static readonly DEFAULT_CONFIG: BattleUIConfig = {
        autoUpdateUI: true,
        showDamageNumbers: true,
        showExperienceNotifications: true,
        showBattleStatus: true,
        showBattleResults: true,
        autoHideDelay: 3000
    };

    /**
     * Creates a new BattleUIIntegration instance
     * @param scene - Phaser scene
     * @param battleSystem - Battle system instance
     * @param mapRenderer - Map renderer instance
     * @param uiManager - UI manager instance
     * @param config - Configuration options
     */
    constructor(
        scene: Phaser.Scene,
        battleSystem: BattleSystem,
        mapRenderer: MapRenderer,
        uiManager: UIManager,
        config?: Partial<BattleUIConfig>
    ) {
        super();

        this.scene = scene;
        this.battleSystem = battleSystem;
        this.mapRenderer = mapRenderer;
        this.uiManager = uiManager;
        this.config = { ...BattleUIIntegration.DEFAULT_CONFIG, ...config };

        this.setupEventListeners();
    }

    /**
     * Setup event listeners for battle system integration
     */
    private setupEventListeners(): void {
        // Battle system events
        this.battleSystem.on('attack-initiated', this.onAttackInitiated.bind(this));
        this.battleSystem.on('attack-range-shown', this.onAttackRangeShown.bind(this));
        this.battleSystem.on('target-selected', this.onTargetSelected.bind(this));
        this.battleSystem.on('battle-complete', this.onBattleComplete.bind(this));
        this.battleSystem.on('attack-cancelled', this.onAttackCancelled.bind(this));
        this.battleSystem.on('battle-error', this.onBattleError.bind(this));

        // Battle animation events
        this.battleSystem.on('attack-animation-complete', this.onAttackAnimationComplete.bind(this));
        this.battleSystem.on('damage-animation-complete', this.onDamageAnimationComplete.bind(this));
        this.battleSystem.on('hp-change-complete', this.onHPChangeComplete.bind(this));
        this.battleSystem.on('defeat-animation-complete', this.onDefeatAnimationComplete.bind(this));

        // State management events
        this.battleSystem.on('unit-defeated', this.onUnitDefeated.bind(this));
        this.battleSystem.on('experience-granted', this.onExperienceGranted.bind(this));
    }

    /**
     * Initialize the battle UI integration
     */
    public initialize(): void {
        this.isIntegrationActive = true;
        this.currentBattlePhase = 'idle';

        this.emit('integration-initialized');
    }

    /**
     * Handle attack initiation
     * @param data - Attack initiation data
     */
    private onAttackInitiated(data: any): void {
        if (!this.config.autoUpdateUI) return;

        this.currentBattlePhase = 'range_display';

        if (this.config.showBattleStatus) {
            this.uiManager.showBattleStatus(`${data.attacker.name} preparing to attack`);
        }

        this.emit('attack-initiated-ui', data);
    }

    /**
     * Handle attack range display
     * @param data - Attack range data
     */
    private onAttackRangeShown(data: any): void {
        if (!this.config.autoUpdateUI) return;

        // Show attack range on map
        this.mapRenderer.highlightAttackRange(data.rangePositions, data.attacker.position);

        if (this.config.showBattleStatus) {
            this.uiManager.showBattleStatus(`Select target for ${data.attacker.name}`);
        }

        this.emit('attack-range-shown-ui', data);
    }

    /**
     * Handle target selection
     * @param data - Target selection data
     */
    private onTargetSelected(data: any): void {
        if (!this.config.autoUpdateUI) return;

        this.currentBattlePhase = 'battle_execution';

        // Highlight selected target
        this.mapRenderer.highlightBattleTarget(data.target.position);

        if (this.config.showBattleStatus) {
            this.uiManager.showBattleStatus(`${data.attacker.name} attacks ${data.target.name}!`);
        }

        this.emit('target-selected-ui', data);
    }

    /**
     * Handle battle completion
     * @param data - Battle completion data
     */
    private onBattleComplete(data: any): void {
        if (!this.config.autoUpdateUI) return;

        this.currentBattlePhase = 'cleanup';

        const battleResult: BattleResult = data.battleResult;

        // Show damage numbers if enabled
        if (this.config.showDamageNumbers && battleResult.target.sprite) {
            const screenPos = this.getScreenPosition(battleResult.target.position);
            if (screenPos) {
                this.uiManager.showDamageNumber(
                    screenPos.x,
                    screenPos.y - 20,
                    battleResult.finalDamage,
                    battleResult.isCritical,
                    false
                );
            }
        }

        // Show experience notification if enabled
        if (this.config.showExperienceNotifications &&
            battleResult.experienceGained > 0 &&
            battleResult.attacker.sprite) {
            const screenPos = this.getScreenPosition(battleResult.attacker.position);
            if (screenPos) {
                this.uiManager.showExperienceGained(
                    screenPos.x,
                    screenPos.y - 40,
                    battleResult.experienceGained
                );
            }
        }

        // Show battle result panel if enabled
        if (this.config.showBattleResults) {
            const resultDisplay: BattleResultDisplay = {
                damage: battleResult.finalDamage,
                isCritical: battleResult.isCritical,
                isEvaded: battleResult.isEvaded,
                experienceGained: battleResult.experienceGained,
                targetDefeated: battleResult.targetDefeated,
                attacker: battleResult.attacker.name,
                target: battleResult.target.name
            };

            this.uiManager.showBattleResult(resultDisplay);
        }

        // Clear map highlights after delay
        this.scene.time.delayedCall(1000, () => {
            this.mapRenderer.clearHighlights();
        });

        // Hide battle status after delay
        if (this.config.showBattleStatus) {
            this.scene.time.delayedCall(this.config.autoHideDelay, () => {
                this.uiManager.hideBattleStatus();
            });
        }

        this.currentBattlePhase = 'idle';
        this.emit('battle-complete-ui', data);
    }

    /**
     * Handle attack cancellation
     * @param data - Attack cancellation data
     */
    private onAttackCancelled(data: any): void {
        if (!this.config.autoUpdateUI) return;

        // Clear map highlights
        this.mapRenderer.clearHighlights();

        // Hide battle status
        if (this.config.showBattleStatus) {
            this.uiManager.hideBattleStatus();
        }

        this.currentBattlePhase = 'idle';
        this.emit('attack-cancelled-ui', data);
    }

    /**
     * Handle battle errors
     * @param errorDetails - Battle error details
     */
    private onBattleError(errorDetails: BattleErrorDetails): void {
        if (!this.config.autoUpdateUI) return;

        // Show error notification
        const errorData: ErrorNotificationData = {
            message: this.getBattleErrorMessage(errorDetails.error),
            type: errorDetails.recoverable ? 'warning' : 'error',
            duration: 4000
        };

        this.uiManager.showErrorNotification(errorData);

        // Clear highlights on error
        this.mapRenderer.clearHighlights();

        // Hide battle status
        if (this.config.showBattleStatus) {
            this.uiManager.hideBattleStatus();
        }

        this.currentBattlePhase = 'idle';
        this.emit('battle-error-ui', errorDetails);
    }

    /**
     * Handle attack animation completion
     * @param data - Animation completion data
     */
    private onAttackAnimationComplete(data: any): void {
        if (this.config.showBattleStatus) {
            this.uiManager.showBattleStatus('Calculating damage...');
        }

        this.emit('attack-animation-complete-ui', data);
    }

    /**
     * Handle damage animation completion
     * @param data - Damage animation data
     */
    private onDamageAnimationComplete(data: any): void {
        this.emit('damage-animation-complete-ui', data);
    }

    /**
     * Handle HP change completion
     * @param data - HP change data
     */
    private onHPChangeComplete(data: any): void {
        this.emit('hp-change-complete-ui', data);
    }

    /**
     * Handle defeat animation completion
     * @param data - Defeat animation data
     */
    private onDefeatAnimationComplete(data: any): void {
        if (this.config.showBattleStatus) {
            this.uiManager.showBattleStatus(`${data.unit.name} defeated!`);
        }

        this.emit('defeat-animation-complete-ui', data);
    }

    /**
     * Handle unit defeat
     * @param data - Unit defeat data
     */
    private onUnitDefeated(data: any): void {
        this.emit('unit-defeated-ui', data);
    }

    /**
     * Handle experience granted
     * @param data - Experience grant data
     */
    private onExperienceGranted(data: any): void {
        this.emit('experience-granted-ui', data);
    }

    /**
     * Get screen position from tile position
     * @param tilePosition - Tile position
     * @returns Screen position or null
     */
    private getScreenPosition(tilePosition: Position): Position | null {
        return this.mapRenderer.tileToWorldPosition(tilePosition);
    }

    /**
     * Get user-friendly error message for battle errors
     * @param error - Battle error type
     * @returns User-friendly error message
     */
    private getBattleErrorMessage(error: BattleError): string {
        switch (error) {
            case BattleError.INVALID_ATTACKER:
                return 'Cannot attack with this unit';
            case BattleError.INVALID_TARGET:
                return 'Invalid target selected';
            case BattleError.OUT_OF_RANGE:
                return 'Target is out of range';
            case BattleError.ALREADY_ACTED:
                return 'Unit has already acted this turn';
            case BattleError.INSUFFICIENT_MP:
                return 'Not enough MP for this action';
            case BattleError.WEAPON_BROKEN:
                return 'Weapon is broken and cannot be used';
            case BattleError.TARGET_UNREACHABLE:
                return 'Cannot reach target';
            case BattleError.NO_WEAPON_EQUIPPED:
                return 'No weapon equipped';
            case BattleError.BATTLE_SYSTEM_ERROR:
                return 'Battle system error occurred';
            case BattleError.ANIMATION_FAILED:
                return 'Animation failed to play';
            case BattleError.DAMAGE_CALCULATION_ERROR:
                return 'Error calculating damage';
            default:
                return 'Unknown battle error occurred';
        }
    }

    /**
     * Manually show attack range (for external control)
     * @param positions - Attack range positions
     * @param attackerPosition - Attacker position
     */
    public showAttackRange(positions: Position[], attackerPosition?: Position): void {
        this.mapRenderer.highlightAttackRange(positions, attackerPosition);
    }

    /**
     * Manually show target selection (for external control)
     * @param targetPosition - Target position
     * @param areaPositions - Area effect positions
     */
    public showTargetSelection(targetPosition: Position, areaPositions?: Position[]): void {
        this.mapRenderer.highlightBattleTarget(targetPosition, areaPositions);
    }

    /**
     * Manually show enemy threat ranges (for tactical display)
     * @param threatRanges - Map of enemy threat ranges
     */
    public showEnemyThreats(threatRanges: Map<string, Position[]>): void {
        this.mapRenderer.showEnemyThreatRanges(threatRanges);
    }

    /**
     * Clear all battle highlights
     */
    public clearBattleHighlights(): void {
        this.mapRenderer.clearHighlights();
    }

    /**
     * Show battle status message
     * @param message - Status message
     */
    public showBattleStatus(message: string): void {
        if (this.config.showBattleStatus) {
            this.uiManager.showBattleStatus(message);
        }
    }

    /**
     * Hide battle status
     */
    public hideBattleStatus(): void {
        this.uiManager.hideBattleStatus();
    }

    /**
     * Show damage number at position
     * @param position - Tile position
     * @param damage - Damage amount
     * @param type - Damage type
     */
    public showDamageAtPosition(position: Position, damage: number, type: DamageType): void {
        if (!this.config.showDamageNumbers) return;

        const screenPos = this.getScreenPosition(position);
        if (screenPos) {
            const isCritical = type === DamageType.CRITICAL;
            const isHealing = type === DamageType.HEALING;

            this.uiManager.showDamageNumber(
                screenPos.x,
                screenPos.y - 20,
                damage,
                isCritical,
                isHealing
            );
        }
    }

    /**
     * Show experience notification at position
     * @param position - Tile position
     * @param experience - Experience amount
     */
    public showExperienceAtPosition(position: Position, experience: number): void {
        if (!this.config.showExperienceNotifications) return;

        const screenPos = this.getScreenPosition(position);
        if (screenPos) {
            this.uiManager.showExperienceGained(screenPos.x, screenPos.y - 40, experience);
        }
    }

    /**
     * Show error notification
     * @param message - Error message
     * @param type - Error type
     * @param duration - Display duration
     */
    public showError(message: string, type: 'error' | 'warning' | 'info' = 'error', duration?: number): void {
        const errorData: ErrorNotificationData = {
            message,
            type,
            duration
        };

        this.uiManager.showErrorNotification(errorData);
    }

    /**
     * Update configuration
     * @param newConfig - New configuration values
     */
    public updateConfig(newConfig: Partial<BattleUIConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.emit('config-updated', this.config);
    }

    /**
     * Get current configuration
     * @returns Current configuration
     */
    public getConfig(): BattleUIConfig {
        return { ...this.config };
    }

    /**
     * Check if integration is active
     * @returns True if active
     */
    public isActive(): boolean {
        return this.isIntegrationActive;
    }

    /**
     * Get current battle phase
     * @returns Current battle phase
     */
    public getCurrentPhase(): string {
        return this.currentBattlePhase;
    }

    /**
     * Destroy the integration and clean up
     */
    public destroy(): void {
        // Remove all event listeners
        this.battleSystem.removeAllListeners();
        this.removeAllListeners();

        // Clear any active UI elements
        this.clearBattleHighlights();
        this.hideBattleStatus();
        this.uiManager.hideBattleResult();
        this.uiManager.hideErrorNotification();

        this.isIntegrationActive = false;
        this.currentBattlePhase = 'idle';
    }
}