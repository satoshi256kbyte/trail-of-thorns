/**
 * AIDebugManager - AI system debugging and development support tools
 *
 * This module provides:
 * - AI thinking process visualization and logging
 * - Action evaluation display and analysis
 * - Visual debugging overlays for AI decision making
 * - Performance monitoring for AI operations
 * - Console commands for AI control and testing
 *
 * Implements requirements 7.1, 7.2, 7.3, 7.4, 7.5 from the AI system specification
 */

import * as Phaser from 'phaser';
import {
    AIAction,
    AIActionType,
    AIContext,
    AIDebugInfo,
    AIPerformanceMetrics,
    AIThinkingState,
    AIPersonality,
    DifficultySettings,
} from '../types/ai';
import { Unit, Position } from '../types/gameplay';

/**
 * AI debug configuration options
 */
export interface AIDebugConfig {
    /** Enable AI thinking process logging */
    enableThinkingLogs: boolean;
    /** Enable action evaluation display */
    showActionEvaluations: boolean;
    /** Enable visual debugging overlays */
    showVisualDebug: boolean;
    /** Enable performance monitoring */
    showPerformanceMetrics: boolean;
    /** Enable console command output */
    enableConsoleOutput: boolean;
    /** Debug overlay opacity */
    overlayOpacity: number;
    /** Debug text color */
    textColor: string;
    /** Debug background color */
    backgroundColor: number;
    /** Maximum log entries to keep */
    maxLogEntries: number;
    /** Update frequency for performance metrics (ms) */
    performanceUpdateInterval: number;
}

/**
 * AI thinking visualization data
 */
export interface AIThinkingVisualization {
    characterId: string;
    position: Position;
    candidateActions: Array<{
        action: AIAction;
        score: number;
        visualization: {
            targetPosition?: Position;
            movementPath?: Position[];
            attackRange?: Position[];
            skillArea?: Position[];
        };
    }>;
    bestAction?: AIAction;
    thinkingTime: number;
    confidence: number;
}

/**
 * AI debug statistics
 */
export interface AIDebugStatistics {
    totalDecisions: number;
    averageThinkingTime: number;
    maxThinkingTime: number;
    minThinkingTime: number;
    timeoutCount: number;
    errorCount: number;
    actionTypeDistribution: Record<AIActionType, number>;
    personalityDistribution: Record<string, number>;
    difficultyLevelUsage: Record<number, number>;
}

/**
 * AIDebugManager class for AI system debugging
 */
export class AIDebugManager {
    private scene: Phaser.Scene;
    private config: AIDebugConfig;
    private isEnabled: boolean = false;

    // Debug display elements
    private debugContainer?: Phaser.GameObjects.Container;
    private thinkingVisualization: Map<string, AIThinkingVisualization> = new Map();
    private performanceText?: Phaser.GameObjects.Text;
    private actionEvaluationTexts: Map<string, Phaser.GameObjects.Container> = new Map();

    // Debug data storage
    private debugLogs: AIDebugInfo[] = [];
    private performanceMetrics: AIPerformanceMetrics = {
        averageThinkingTime: 0,
        maxThinkingTime: 0,
        minThinkingTime: Infinity,
        totalDecisions: 0,
        timeoutCount: 0,
        errorCount: 0,
        memoryUsage: 0,
        actionTypeDistribution: {} as Record<AIActionType, number>,
    };
    private statistics: AIDebugStatistics = {
        totalDecisions: 0,
        averageThinkingTime: 0,
        maxThinkingTime: 0,
        minThinkingTime: Infinity,
        timeoutCount: 0,
        errorCount: 0,
        actionTypeDistribution: {} as Record<AIActionType, number>,
        personalityDistribution: {},
        difficultyLevelUsage: {},
    };

    // Visual debug elements
    private visualDebugGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
    private thinkingIndicators: Map<string, Phaser.GameObjects.Container> = new Map();

    // Performance monitoring
    private lastPerformanceUpdate: number = 0;
    private performanceUpdateTimer?: Phaser.Time.TimerEvent;

    // Default configuration
    private static readonly DEFAULT_CONFIG: AIDebugConfig = {
        enableThinkingLogs: true,
        showActionEvaluations: true,
        showVisualDebug: true,
        showPerformanceMetrics: true,
        enableConsoleOutput: true,
        overlayOpacity: 0.8,
        textColor: '#00ffff',
        backgroundColor: 0x000000,
        maxLogEntries: 1000,
        performanceUpdateInterval: 1000,
    };

    /**
     * Constructor
     * @param scene - Phaser scene instance
     * @param config - Debug configuration options
     */
    constructor(scene: Phaser.Scene, config?: Partial<AIDebugConfig>) {
        this.scene = scene;
        this.config = { ...AIDebugManager.DEFAULT_CONFIG, ...config };

        console.log('AIDebugManager: Initialized with config:', this.config);
    }

    /**
     * Enable AI debug mode
     */
    public enableDebugMode(): void {
        if (this.isEnabled) {
            return;
        }

        this.isEnabled = true;
        console.log('AIDebugManager: AI debug mode enabled');

        // Create main debug container
        this.createDebugContainer();

        // Initialize debug displays
        if (this.config.showPerformanceMetrics) {
            this.showPerformanceMetrics();
        }

        // Start performance monitoring
        this.startPerformanceMonitoring();

        // Emit debug mode enabled event
        this.scene.events.emit('ai-debug-mode-enabled');
    }

    /**
     * Disable AI debug mode
     */
    public disableDebugMode(): void {
        if (!this.isEnabled) {
            return;
        }

        this.isEnabled = false;
        console.log('AIDebugManager: AI debug mode disabled');

        // Clean up debug displays
        this.hidePerformanceMetrics();
        this.clearVisualDebug();
        this.clearActionEvaluations();

        // Destroy debug container
        if (this.debugContainer) {
            this.debugContainer.destroy();
            this.debugContainer = undefined;
        }

        // Stop performance monitoring
        this.stopPerformanceMonitoring();

        // Emit debug mode disabled event
        this.scene.events.emit('ai-debug-mode-disabled');
    }

    /**
     * Toggle AI debug mode
     */
    public toggleDebugMode(): void {
        if (this.isEnabled) {
            this.disableDebugMode();
        } else {
            this.enableDebugMode();
        }
    }

    /**
     * Log AI thinking process
     * @param character - Character that is thinking
     * @param actions - Candidate actions being evaluated
     */
    public logThinkingProcess(character: Unit, actions: AIAction[]): void {
        if (!this.isEnabled || !this.config.enableThinkingLogs) {
            return;
        }

        const debugInfo: AIDebugInfo = {
            characterId: character.id,
            thinkingLog: [
                `AI ${character.name} thinking process started`,
                `Evaluating ${actions.length} candidate actions:`,
                ...actions.map((action, index) =>
                    `  ${index + 1}. ${action.type} (priority: ${action.priority}) - ${action.reasoning || 'No reasoning'}`
                ),
            ],
            actionEvaluations: actions.map(action => ({
                action,
                score: action.priority || 0,
                reasoning: action.reasoning || 'No reasoning provided',
            })),
            performance: {
                thinkingTime: 0, // Will be updated when thinking completes
                memoryUsage: this.getMemoryUsage(),
                cpuUsage: 0, // Placeholder
            },
        };

        this.addDebugLog(debugInfo);

        if (this.config.enableConsoleOutput) {
            console.log(`[AI Debug] ${character.name} thinking:`, debugInfo.thinkingLog);
        }

        // Update visual debug if enabled
        if (this.config.showVisualDebug) {
            this.updateThinkingVisualization(character, actions);
        }
    }

    /**
     * Log action selection result
     * @param selectedAction - The action that was selected
     * @param reasoning - Reasoning for the selection
     */
    public logActionSelection(selectedAction: AIAction, reasoning: string): void {
        if (!this.isEnabled) {
            return;
        }

        const logEntry = `Action selected: ${selectedAction.type} - ${reasoning}`;

        if (this.config.enableConsoleOutput) {
            console.log(`[AI Debug] ${logEntry}`);
        }

        // Update the latest debug log entry
        if (this.debugLogs.length > 0) {
            const latestLog = this.debugLogs[this.debugLogs.length - 1];
            latestLog.thinkingLog.push(logEntry);
        }

        // Update statistics
        this.updateActionStatistics(selectedAction);
    }

    /**
     * Log performance metrics
     * @param metrics - Performance metrics to log
     */
    public logPerformanceMetrics(metrics: AIPerformanceMetrics): void {
        if (!this.isEnabled) {
            return;
        }

        this.performanceMetrics = { ...metrics };

        // Update statistics
        this.statistics.totalDecisions = metrics.totalDecisions;
        this.statistics.averageThinkingTime = metrics.averageThinkingTime;
        this.statistics.maxThinkingTime = metrics.maxThinkingTime;
        this.statistics.minThinkingTime = metrics.minThinkingTime;
        this.statistics.timeoutCount = metrics.timeoutCount;
        this.statistics.errorCount = metrics.errorCount;
        this.statistics.actionTypeDistribution = { ...metrics.actionTypeDistribution };

        if (this.config.enableConsoleOutput) {
            console.log('[AI Debug] Performance metrics updated:', metrics);
        }

        // Update display
        if (this.config.showPerformanceMetrics) {
            this.updatePerformanceDisplay();
        }
    }

    /**
     * Show thinking visualization for a character
     * @param character - Character to visualize
     */
    public showThinkingVisualization(character: Unit): void {
        if (!this.isEnabled || !this.config.showVisualDebug) {
            return;
        }

        // Create thinking indicator
        const indicator = this.createThinkingIndicator(character);
        this.thinkingIndicators.set(character.id, indicator);

        if (this.debugContainer) {
            this.debugContainer.add(indicator);
        }

        if (this.config.enableConsoleOutput) {
            console.log(`[AI Debug] Showing thinking visualization for ${character.name}`);
        }
    }

    /**
     * Show action evaluation display
     * @param actions - Actions to display evaluations for
     */
    public showActionEvaluation(actions: AIAction[]): void {
        if (!this.isEnabled || !this.config.showActionEvaluations) {
            return;
        }

        // Clear existing evaluations
        this.clearActionEvaluations();

        // Create evaluation display for each action
        actions.forEach((action, index) => {
            const evaluationContainer = this.createActionEvaluationDisplay(action, index);
            this.actionEvaluationTexts.set(`action_${index}`, evaluationContainer);

            if (this.debugContainer) {
                this.debugContainer.add(evaluationContainer);
            }
        });

        if (this.config.enableConsoleOutput) {
            console.log(`[AI Debug] Showing evaluation for ${actions.length} actions`);
        }
    }

    /**
     * Update debug information (called from scene update loop)
     * @param time - Current time in milliseconds
     * @param delta - Time elapsed since last frame in milliseconds
     */
    public update(time: number, delta: number): void {
        if (!this.isEnabled) {
            return;
        }

        // Update thinking indicators
        this.updateThinkingIndicators(time);

        // Update performance metrics display
        if (time - this.lastPerformanceUpdate >= this.config.performanceUpdateInterval) {
            this.updatePerformanceDisplay();
            this.lastPerformanceUpdate = time;
        }
    }

    /**
     * Get current debug statistics
     * @returns Debug statistics object
     */
    public getDebugStatistics(): AIDebugStatistics {
        return { ...this.statistics };
    }

    /**
     * Get debug logs
     * @param count - Number of recent logs to return (optional)
     * @returns Array of debug log entries
     */
    public getDebugLogs(count?: number): AIDebugInfo[] {
        if (count) {
            return this.debugLogs.slice(-count);
        }
        return [...this.debugLogs];
    }

    /**
     * Clear all debug information
     */
    public clearDebugInfo(): void {
        this.debugLogs = [];
        this.clearVisualDebug();
        this.clearActionEvaluations();
        this.resetStatistics();

        if (this.config.enableConsoleOutput) {
            console.log('[AI Debug] Debug information cleared');
        }
    }

    /**
     * Generate debug report
     * @returns Formatted debug report string
     */
    public generateDebugReport(): string {
        let report = '=== AI Debug Report ===\n\n';

        // Performance metrics
        report += '【Performance Metrics】\n';
        report += `Total Decisions: ${this.statistics.totalDecisions}\n`;
        report += `Average Thinking Time: ${this.statistics.averageThinkingTime.toFixed(2)}ms\n`;
        report += `Max Thinking Time: ${this.statistics.maxThinkingTime}ms\n`;
        report += `Min Thinking Time: ${this.statistics.minThinkingTime}ms\n`;
        report += `Timeout Count: ${this.statistics.timeoutCount}\n`;
        report += `Error Count: ${this.statistics.errorCount}\n\n`;

        // Action type distribution
        report += '【Action Type Distribution】\n';
        Object.entries(this.statistics.actionTypeDistribution).forEach(([type, count]) => {
            const percentage = ((count / this.statistics.totalDecisions) * 100).toFixed(1);
            report += `${type}: ${count} (${percentage}%)\n`;
        });
        report += '\n';

        // Personality distribution
        report += '【Personality Distribution】\n';
        Object.entries(this.statistics.personalityDistribution).forEach(([personality, count]) => {
            report += `${personality}: ${count}\n`;
        });
        report += '\n';

        // Recent debug logs
        report += '【Recent Debug Logs】\n';
        const recentLogs = this.debugLogs.slice(-10);
        recentLogs.forEach((log, index) => {
            report += `${index + 1}. Character: ${log.characterId}\n`;
            log.thinkingLog.forEach(entry => {
                report += `   ${entry}\n`;
            });
            report += '\n';
        });

        return report;
    }

    // Private helper methods

    /**
     * Create main debug container
     */
    private createDebugContainer(): void {
        this.debugContainer = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(10000);
    }

    /**
     * Add debug log entry
     * @param debugInfo - Debug information to add
     */
    private addDebugLog(debugInfo: AIDebugInfo): void {
        this.debugLogs.push(debugInfo);

        // Limit log entries
        if (this.debugLogs.length > this.config.maxLogEntries) {
            this.debugLogs.splice(0, this.debugLogs.length - this.config.maxLogEntries);
        }
    }

    /**
     * Update thinking visualization
     * @param character - Character that is thinking
     * @param actions - Candidate actions
     */
    private updateThinkingVisualization(character: Unit, actions: AIAction[]): void {
        const visualization: AIThinkingVisualization = {
            characterId: character.id,
            position: character.position,
            candidateActions: actions.map(action => ({
                action,
                score: action.priority || 0,
                visualization: this.createActionVisualization(action),
            })),
            bestAction: actions.reduce((best, current) =>
                (current.priority || 0) > (best.priority || 0) ? current : best
            ),
            thinkingTime: 0,
            confidence: 0.8, // Placeholder
        };

        this.thinkingVisualization.set(character.id, visualization);

        // Create visual elements
        this.createVisualDebugElements(visualization);
    }

    /**
     * Create action visualization data
     * @param action - Action to visualize
     * @returns Visualization data
     */
    private createActionVisualization(action: AIAction): AIThinkingVisualization['candidateActions'][0]['visualization'] {
        const visualization: AIThinkingVisualization['candidateActions'][0]['visualization'] = {};

        switch (action.type) {
            case AIActionType.MOVE:
                if (action.position) {
                    visualization.targetPosition = action.position;
                    // Could add movement path calculation here
                }
                break;
            case AIActionType.ATTACK:
                if (action.target) {
                    visualization.targetPosition = action.target.position;
                    // Could add attack range visualization here
                }
                break;
            case AIActionType.SKILL:
                if (action.target) {
                    visualization.targetPosition = action.target.position;
                    // Could add skill area visualization here
                }
                break;
        }

        return visualization;
    }

    /**
     * Create visual debug elements
     * @param visualization - Visualization data
     */
    private createVisualDebugElements(visualization: AIThinkingVisualization): void {
        // Clear existing visual debug for this character
        const existingGraphics = this.visualDebugGraphics.get(visualization.characterId);
        if (existingGraphics) {
            existingGraphics.destroy();
        }

        // Create new graphics
        const graphics = this.scene.add.graphics();
        graphics.setDepth(9999);

        // Draw candidate actions
        visualization.candidateActions.forEach((candidate, index) => {
            const alpha = Math.min(1, candidate.score / 100);
            const color = candidate.action === visualization.bestAction ? 0x00ff00 : 0xffff00;

            if (candidate.visualization.targetPosition) {
                const pos = candidate.visualization.targetPosition;
                graphics.fillStyle(color, alpha * 0.5);
                graphics.fillCircle(pos.x * 32 + 16, pos.y * 32 + 16, 8);

                // Draw line from character to target
                graphics.lineStyle(2, color, alpha);
                graphics.beginPath();
                graphics.moveTo(
                    visualization.position.x * 32 + 16,
                    visualization.position.y * 32 + 16
                );
                graphics.lineTo(pos.x * 32 + 16, pos.y * 32 + 16);
                graphics.strokePath();
            }
        });

        this.visualDebugGraphics.set(visualization.characterId, graphics);

        if (this.debugContainer) {
            this.debugContainer.add(graphics);
        }
    }

    /**
     * Create thinking indicator
     * @param character - Character to create indicator for
     * @returns Container with thinking indicator
     */
    private createThinkingIndicator(character: Unit): Phaser.GameObjects.Container {
        const container = this.scene.add.container(0, 0);

        const worldX = character.position.x * 32 + 16;
        const worldY = character.position.y * 32 - 30;
        container.setPosition(worldX, worldY);

        // Thinking bubble background
        const background = this.scene.add.graphics()
            .fillStyle(this.config.backgroundColor, this.config.overlayOpacity)
            .lineStyle(2, 0x00ffff, 1)
            .fillRoundedRect(-25, -15, 50, 30, 5)
            .strokeRoundedRect(-25, -15, 50, 30, 5);

        // Thinking text
        const thinkingText = this.scene.add.text(0, 0, 'THINKING...', {
            fontSize: '10px',
            color: this.config.textColor,
            fontFamily: 'monospace',
            align: 'center',
        }).setOrigin(0.5);

        container.add([background, thinkingText]);
        container.setDepth(10001);

        return container;
    }

    /**
     * Create action evaluation display
     * @param action - Action to display evaluation for
     * @param index - Index of the action
     * @returns Container with evaluation display
     */
    private createActionEvaluationDisplay(action: AIAction, index: number): Phaser.GameObjects.Container {
        const container = this.scene.add.container(0, 0);

        const x = 10;
        const y = 100 + (index * 60);
        container.setPosition(x, y);

        // Background
        const background = this.scene.add.graphics()
            .fillStyle(this.config.backgroundColor, this.config.overlayOpacity)
            .lineStyle(1, 0x00ffff, 1)
            .fillRoundedRect(0, 0, 200, 50, 3)
            .strokeRoundedRect(0, 0, 200, 50, 3);

        // Action info text
        const actionText = this.scene.add.text(5, 5, [
            `${action.type.toUpperCase()}`,
            `Priority: ${action.priority || 0}`,
            `${action.reasoning || 'No reasoning'}`,
        ].join('\n'), {
            fontSize: '9px',
            color: this.config.textColor,
            fontFamily: 'monospace',
        });

        container.add([background, actionText]);
        container.setScrollFactor(0);
        container.setDepth(10002);

        return container;
    }

    /**
     * Update thinking indicators
     * @param time - Current time
     */
    private updateThinkingIndicators(time: number): void {
        this.thinkingIndicators.forEach((indicator, characterId) => {
            // Add pulsing animation
            const scale = 1 + Math.sin(time * 0.005) * 0.1;
            indicator.setScale(scale);
        });
    }

    /**
     * Show performance metrics display
     */
    private showPerformanceMetrics(): void {
        if (!this.debugContainer) {
            return;
        }

        this.performanceText = this.scene.add.text(10, 10, '', {
            fontSize: '12px',
            color: this.config.textColor,
            fontFamily: 'monospace',
            backgroundColor: `rgba(0,0,0,${this.config.overlayOpacity})`,
            padding: { x: 5, y: 5 },
        }).setScrollFactor(0).setDepth(10001);

        this.debugContainer.add(this.performanceText);
    }

    /**
     * Hide performance metrics display
     */
    private hidePerformanceMetrics(): void {
        if (this.performanceText) {
            this.performanceText.destroy();
            this.performanceText = undefined;
        }
    }

    /**
     * Update performance display
     */
    private updatePerformanceDisplay(): void {
        if (!this.performanceText) {
            return;
        }

        const metrics = this.performanceMetrics;
        const metricsDisplay = [
            'AI Performance Metrics:',
            `Decisions: ${metrics.totalDecisions}`,
            `Avg Think Time: ${metrics.averageThinkingTime.toFixed(2)}ms`,
            `Max Think Time: ${metrics.maxThinkingTime}ms`,
            `Timeouts: ${metrics.timeoutCount}`,
            `Errors: ${metrics.errorCount}`,
            `Memory: ${metrics.memoryUsage.toFixed(1)}MB`,
        ].join('\n');

        this.performanceText.setText(metricsDisplay);
    }

    /**
     * Clear visual debug elements
     */
    private clearVisualDebug(): void {
        this.visualDebugGraphics.forEach(graphics => graphics.destroy());
        this.visualDebugGraphics.clear();

        this.thinkingIndicators.forEach(indicator => indicator.destroy());
        this.thinkingIndicators.clear();

        this.thinkingVisualization.clear();
    }

    /**
     * Clear action evaluation displays
     */
    private clearActionEvaluations(): void {
        this.actionEvaluationTexts.forEach(container => container.destroy());
        this.actionEvaluationTexts.clear();
    }

    /**
     * Update action statistics
     * @param action - Action that was selected
     */
    private updateActionStatistics(action: AIAction): void {
        this.statistics.actionTypeDistribution[action.type] =
            (this.statistics.actionTypeDistribution[action.type] || 0) + 1;
    }

    /**
     * Reset statistics
     */
    private resetStatistics(): void {
        this.statistics = {
            totalDecisions: 0,
            averageThinkingTime: 0,
            maxThinkingTime: 0,
            minThinkingTime: Infinity,
            timeoutCount: 0,
            errorCount: 0,
            actionTypeDistribution: {} as Record<AIActionType, number>,
            personalityDistribution: {},
            difficultyLevelUsage: {},
        };

        this.performanceMetrics = {
            averageThinkingTime: 0,
            maxThinkingTime: 0,
            minThinkingTime: Infinity,
            totalDecisions: 0,
            timeoutCount: 0,
            errorCount: 0,
            memoryUsage: 0,
            actionTypeDistribution: {} as Record<AIActionType, number>,
        };
    }

    /**
     * Start performance monitoring
     */
    private startPerformanceMonitoring(): void {
        this.lastPerformanceUpdate = this.scene.time.now;

        this.performanceUpdateTimer = this.scene.time.addEvent({
            delay: this.config.performanceUpdateInterval,
            callback: () => {
                this.updatePerformanceDisplay();
            },
            loop: true,
        });
    }

    /**
     * Stop performance monitoring
     */
    private stopPerformanceMonitoring(): void {
        if (this.performanceUpdateTimer) {
            this.performanceUpdateTimer.destroy();
            this.performanceUpdateTimer = undefined;
        }
    }

    /**
     * Get current memory usage (approximation)
     * @returns Memory usage in MB
     */
    private getMemoryUsage(): number {
        if ((performance as any).memory) {
            return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
        }
        return 0;
    }

    /**
     * Update configuration
     * @param newConfig - New configuration options
     */
    public updateConfig(newConfig: Partial<AIDebugConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('AIDebugManager: Configuration updated:', newConfig);
    }

    /**
     * Get current configuration
     * @returns Current configuration
     */
    public getConfig(): AIDebugConfig {
        return { ...this.config };
    }
}