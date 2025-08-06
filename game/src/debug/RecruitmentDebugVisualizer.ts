/**
 * Debug visualizer for the recruitment system
 * Provides visual debugging tools for recruitment conditions and NPC states
 */

import * as Phaser from 'phaser';
import { Unit, Position } from '../types/gameplay';
import {
    RecruitmentCondition,
    RecruitmentContext,
    NPCState,
    RecruitableCharacter,
    RecruitmentProgress
} from '../types/recruitment';
import { GameConfig } from '../config/GameConfig';

/**
 * Debug visualization element
 */
interface DebugVisualizationElement {
    id: string;
    type: 'text' | 'shape' | 'line' | 'indicator';
    gameObject: Phaser.GameObjects.GameObject;
    position: Position;
    data: any;
    visible: boolean;
}

/**
 * Debug overlay information
 */
interface DebugOverlayInfo {
    characterId: string;
    conditions: string[];
    conditionsMet: boolean[];
    npcState?: NPCState;
    lastUpdate: number;
}

/**
 * Recruitment system debug visualizer
 */
export class RecruitmentDebugVisualizer {
    private scene: Phaser.Scene;
    private debugEnabled: boolean = false;
    private visualElements: Map<string, DebugVisualizationElement> = new Map();
    private debugOverlays: Map<string, DebugOverlayInfo> = new Map();
    private debugContainer: Phaser.GameObjects.Container;
    private debugColors: Record<string, number>;
    private textStyle: Phaser.Types.GameObjects.Text.TextStyle;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.debugContainer = scene.add.container(0, 0);
        this.debugContainer.setDepth(1000); // Ensure debug elements are on top

        // Load debug colors from configuration
        const gameConfig = new GameConfig();
        const recruitmentConfig = gameConfig.getRecruitmentSystemConfig();
        this.debugColors = recruitmentConfig.debugColors;
        this.debugEnabled = recruitmentConfig.enableRecruitmentDebug;

        // Set up text style for debug information
        this.textStyle = {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 },
            stroke: '#000000',
            strokeThickness: 1
        };

        // Hide debug container initially if debug is disabled
        this.debugContainer.setVisible(this.debugEnabled);
    }

    /**
     * Enable debug visualization
     */
    public enableDebug(): void {
        this.debugEnabled = true;
        this.debugContainer.setVisible(true);
        console.log('RecruitmentDebugVisualizer: Debug visualization enabled');
    }

    /**
     * Disable debug visualization
     */
    public disableDebug(): void {
        this.debugEnabled = false;
        this.debugContainer.setVisible(false);
        this.clearAllVisualizations();
        console.log('RecruitmentDebugVisualizer: Debug visualization disabled');
    }

    /**
     * Update debug visualization settings from configuration
     */
    public updateFromConfig(): void {
        const gameConfig = new GameConfig();
        const recruitmentConfig = gameConfig.getRecruitmentSystemConfig();

        this.debugEnabled = recruitmentConfig.enableRecruitmentDebug;
        this.debugColors = recruitmentConfig.debugColors;
        this.debugContainer.setVisible(this.debugEnabled);

        if (this.debugEnabled) {
            console.log('RecruitmentDebugVisualizer: Configuration updated');
        }
    }

    /**
     * Visualize recruitable character
     */
    public visualizeRecruitableCharacter(
        unit: Unit,
        character: RecruitableCharacter,
        screenPosition: Position
    ): void {
        if (!this.debugEnabled) return;

        const elementId = `recruitable_${unit.id}`;

        // Remove existing visualization
        this.removeVisualization(elementId);

        // Create recruitable indicator
        const indicator = this.scene.add.circle(
            screenPosition.x,
            screenPosition.y - 40,
            8,
            this.debugColors.recruitableTarget,
            0.8
        );

        // Add pulsing animation
        this.scene.tweens.add({
            targets: indicator,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.debugContainer.add(indicator);

        // Create debug text showing conditions
        const conditionTexts = character.conditions.map((condition, index) =>
            `${index + 1}. ${condition.description}`
        );

        const debugText = this.scene.add.text(
            screenPosition.x + 20,
            screenPosition.y - 60,
            `Recruitable: ${unit.name}\n${conditionTexts.join('\n')}`,
            this.textStyle
        );

        this.debugContainer.add(debugText);

        // Store visualization element
        this.visualElements.set(elementId, {
            id: elementId,
            type: 'indicator',
            gameObject: indicator,
            position: screenPosition,
            data: { unit, character, debugText },
            visible: true
        });

        // Update overlay info
        this.debugOverlays.set(unit.id, {
            characterId: unit.id,
            conditions: character.conditions.map(c => c.description),
            conditionsMet: character.conditions.map(() => false),
            lastUpdate: Date.now()
        });
    }

    /**
     * Visualize recruitment condition evaluation
     */
    public visualizeConditionEvaluation(
        unit: Unit,
        condition: RecruitmentCondition,
        result: boolean,
        screenPosition: Position,
        context?: RecruitmentContext
    ): void {
        if (!this.debugEnabled) return;

        const elementId = `condition_${unit.id}_${condition.id}`;

        // Remove existing visualization
        this.removeVisualization(elementId);

        // Choose color based on result
        const color = result ? this.debugColors.conditionMet : this.debugColors.conditionNotMet;

        // Create condition result indicator
        const indicator = this.scene.add.rectangle(
            screenPosition.x - 30,
            screenPosition.y - 20,
            20,
            20,
            color,
            0.7
        );

        // Add checkmark or X
        const symbol = this.scene.add.text(
            screenPosition.x - 30,
            screenPosition.y - 20,
            result ? '✓' : '✗',
            {
                fontSize: '14px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);

        this.debugContainer.add([indicator, symbol]);

        // Create detailed condition info
        let conditionInfo = `${condition.description}\nResult: ${result ? 'MET' : 'NOT MET'}`;

        if (context) {
            conditionInfo += `\nAttacker: ${context.attacker.name}`;
            conditionInfo += `\nDamage: ${context.damage}`;
            conditionInfo += `\nTurn: ${context.turn}`;
        }

        const infoText = this.scene.add.text(
            screenPosition.x - 50,
            screenPosition.y + 10,
            conditionInfo,
            {
                ...this.textStyle,
                backgroundColor: result ? '#004400' : '#440000'
            }
        );

        this.debugContainer.add(infoText);

        // Store visualization element
        this.visualElements.set(elementId, {
            id: elementId,
            type: 'indicator',
            gameObject: indicator,
            position: screenPosition,
            data: { unit, condition, result, symbol, infoText },
            visible: true
        });

        // Auto-remove after 3 seconds
        this.scene.time.delayedCall(3000, () => {
            this.removeVisualization(elementId);
        });

        // Update overlay info
        const overlayInfo = this.debugOverlays.get(unit.id);
        if (overlayInfo) {
            const conditionIndex = overlayInfo.conditions.findIndex(desc =>
                desc === condition.description
            );
            if (conditionIndex >= 0) {
                overlayInfo.conditionsMet[conditionIndex] = result;
                overlayInfo.lastUpdate = Date.now();
            }
        }
    }

    /**
     * Visualize NPC state
     */
    public visualizeNPCState(
        unit: Unit,
        npcState: NPCState,
        screenPosition: Position
    ): void {
        if (!this.debugEnabled) return;

        const elementId = `npc_${unit.id}`;

        // Remove existing visualization
        this.removeVisualization(elementId);

        // Create NPC indicator
        const indicator = this.scene.add.star(
            screenPosition.x,
            screenPosition.y - 50,
            5,
            10,
            20,
            this.debugColors.npcState,
            0.9
        );

        // Add rotation animation
        this.scene.tweens.add({
            targets: indicator,
            rotation: Math.PI * 2,
            duration: 2000,
            repeat: -1,
            ease: 'Linear'
        });

        this.debugContainer.add(indicator);

        // Create NPC info text
        const npcInfo = [
            `NPC: ${unit.name}`,
            `Converted at turn: ${npcState.convertedAt}`,
            `Remaining HP: ${npcState.remainingHP}`,
            `Protected: ${npcState.isProtected ? 'Yes' : 'No'}`,
            `Original faction: ${npcState.originalFaction}`
        ];

        const infoText = this.scene.add.text(
            screenPosition.x + 25,
            screenPosition.y - 70,
            npcInfo.join('\n'),
            {
                ...this.textStyle,
                backgroundColor: '#440088'
            }
        );

        this.debugContainer.add(infoText);

        // Store visualization element
        this.visualElements.set(elementId, {
            id: elementId,
            type: 'indicator',
            gameObject: indicator,
            position: screenPosition,
            data: { unit, npcState, infoText },
            visible: true
        });

        // Update overlay info
        const overlayInfo = this.debugOverlays.get(unit.id);
        if (overlayInfo) {
            overlayInfo.npcState = npcState;
            overlayInfo.lastUpdate = Date.now();
        }
    }

    /**
     * Visualize recruitment progress
     */
    public visualizeRecruitmentProgress(
        unit: Unit,
        progress: RecruitmentProgress,
        screenPosition: Position
    ): void {
        if (!this.debugEnabled) return;

        const elementId = `progress_${unit.id}`;

        // Remove existing visualization
        this.removeVisualization(elementId);

        // Create progress bar background
        const progressBg = this.scene.add.rectangle(
            screenPosition.x,
            screenPosition.y + 30,
            100,
            10,
            0x333333,
            0.8
        );

        // Create progress bar fill
        const progressFill = this.scene.add.rectangle(
            screenPosition.x - 50 + (progress.overallProgress / 2),
            screenPosition.y + 30,
            progress.overallProgress,
            10,
            progress.isEligible ? this.debugColors.conditionMet : this.debugColors.conditionNotMet,
            0.9
        );

        // Create progress text
        const progressText = this.scene.add.text(
            screenPosition.x,
            screenPosition.y + 45,
            `${progress.overallProgress}%`,
            {
                fontSize: '10px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);

        this.debugContainer.add([progressBg, progressFill, progressText]);

        // Store visualization element
        this.visualElements.set(elementId, {
            id: elementId,
            type: 'indicator',
            gameObject: progressBg,
            position: screenPosition,
            data: { unit, progress, progressFill, progressText },
            visible: true
        });
    }

    /**
     * Visualize recruitment success
     */
    public visualizeRecruitmentSuccess(
        unit: Unit,
        screenPosition: Position
    ): void {
        if (!this.debugEnabled) return;

        // Create success effect
        const successEffect = this.scene.add.circle(
            screenPosition.x,
            screenPosition.y,
            5,
            this.debugColors.recruitmentSuccess,
            0.8
        );

        this.debugContainer.add(successEffect);

        // Animate success effect
        this.scene.tweens.add({
            targets: successEffect,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                successEffect.destroy();
            }
        });

        // Create success text
        const successText = this.scene.add.text(
            screenPosition.x,
            screenPosition.y - 60,
            `${unit.name}\nRECRUITED!`,
            {
                fontSize: '16px',
                color: '#00ff00',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);

        this.debugContainer.add(successText);

        // Animate success text
        this.scene.tweens.add({
            targets: successText,
            y: screenPosition.y - 100,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                successText.destroy();
            }
        });
    }

    /**
     * Visualize recruitment failure
     */
    public visualizeRecruitmentFailure(
        unit: Unit,
        reason: string,
        screenPosition: Position
    ): void {
        if (!this.debugEnabled) return;

        // Create failure effect
        const failureEffect = this.scene.add.circle(
            screenPosition.x,
            screenPosition.y,
            5,
            this.debugColors.recruitmentFailure,
            0.8
        );

        this.debugContainer.add(failureEffect);

        // Animate failure effect
        this.scene.tweens.add({
            targets: failureEffect,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                failureEffect.destroy();
            }
        });

        // Create failure text
        const failureText = this.scene.add.text(
            screenPosition.x,
            screenPosition.y - 60,
            `${unit.name}\nFAILED\n${reason}`,
            {
                fontSize: '14px',
                color: '#ff4444',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5);

        this.debugContainer.add(failureText);

        // Animate failure text
        this.scene.tweens.add({
            targets: failureText,
            y: screenPosition.y - 80,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                failureText.destroy();
            }
        });
    }

    /**
     * Show debug overlay for all recruitment information
     */
    public showDebugOverlay(): void {
        if (!this.debugEnabled) return;

        const overlayId = 'recruitment_overlay';
        this.removeVisualization(overlayId);

        const overlayInfo: string[] = ['=== Recruitment Debug Info ==='];

        for (const [characterId, info] of this.debugOverlays) {
            overlayInfo.push(`\n${characterId}:`);

            info.conditions.forEach((condition, index) => {
                const status = info.conditionsMet[index] ? '✓' : '✗';
                overlayInfo.push(`  ${status} ${condition}`);
            });

            if (info.npcState) {
                overlayInfo.push(`  NPC State: Turn ${info.npcState.convertedAt}, HP ${info.npcState.remainingHP}`);
            }

            overlayInfo.push(`  Last Update: ${new Date(info.lastUpdate).toLocaleTimeString()}`);
        }

        const overlayText = this.scene.add.text(
            10,
            10,
            overlayInfo.join('\n'),
            {
                fontSize: '12px',
                color: '#ffffff',
                backgroundColor: '#000000aa',
                padding: { x: 10, y: 10 }
            }
        );

        this.debugContainer.add(overlayText);

        this.visualElements.set(overlayId, {
            id: overlayId,
            type: 'text',
            gameObject: overlayText,
            position: { x: 10, y: 10 },
            data: { overlayInfo },
            visible: true
        });
    }

    /**
     * Hide debug overlay
     */
    public hideDebugOverlay(): void {
        this.removeVisualization('recruitment_overlay');
    }

    /**
     * Remove specific visualization
     */
    public removeVisualization(elementId: string): void {
        const element = this.visualElements.get(elementId);
        if (element) {
            if (element.gameObject && !element.gameObject.destroyed) {
                element.gameObject.destroy();
            }

            // Clean up additional objects stored in data
            if (element.data) {
                Object.values(element.data).forEach((obj: any) => {
                    if (obj && typeof obj === 'object' && obj.destroy && !obj.destroyed) {
                        obj.destroy();
                    }
                });
            }

            this.visualElements.delete(elementId);
        }
    }

    /**
     * Clear all visualizations
     */
    public clearAllVisualizations(): void {
        for (const elementId of this.visualElements.keys()) {
            this.removeVisualization(elementId);
        }
        this.debugOverlays.clear();
    }

    /**
     * Update visualization positions (call when camera moves)
     */
    public updateVisualizationPositions(cameraX: number, cameraY: number): void {
        if (!this.debugEnabled) return;

        // Update container position to follow camera
        this.debugContainer.setPosition(-cameraX, -cameraY);
    }

    /**
     * Toggle debug visualization visibility
     */
    public toggleVisibility(): void {
        this.debugEnabled = !this.debugEnabled;
        this.debugContainer.setVisible(this.debugEnabled);

        if (this.debugEnabled) {
            console.log('RecruitmentDebugVisualizer: Debug visualization enabled');
        } else {
            console.log('RecruitmentDebugVisualizer: Debug visualization disabled');
            this.clearAllVisualizations();
        }
    }

    /**
     * Get debug statistics
     */
    public getDebugStatistics(): any {
        return {
            totalVisualizations: this.visualElements.size,
            activeOverlays: this.debugOverlays.size,
            debugEnabled: this.debugEnabled,
            visualizationTypes: Array.from(this.visualElements.values()).reduce((types, element) => {
                types[element.type] = (types[element.type] || 0) + 1;
                return types;
            }, {} as Record<string, number>)
        };
    }

    /**
     * Destroy the visualizer and clean up resources
     */
    public destroy(): void {
        this.clearAllVisualizations();
        if (this.debugContainer && !this.debugContainer.destroyed) {
            this.debugContainer.destroy();
        }
    }
}