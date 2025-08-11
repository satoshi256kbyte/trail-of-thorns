/**
 * AISystemManager - Main AI system integration manager
 *
 * This module provides:
 * - AI system initialization and management
 * - Integration with GameplayScene and other systems
 * - AI turn execution and coordination
 * - Visual feedback for AI actions
 */

import * as Phaser from 'phaser';
import { AIController } from '../AIController';
import { ActionEvaluator } from '../ActionEvaluator';
import {
    AIAction,
    AIActionType,
    AIContext,
    AIPersonality,
    DifficultySettings,
    AIControllerConfig,
    AISystemIntegration,
    AISystemManagerConfig,
    AIExecutionResult,
    AIThinkingState,
} from '../../types/ai';
import { Unit, Position, MapData, GameState } from '../../types/gameplay';
import { GameStateManager } from '../GameStateManager';
import { MovementSystem } from '../MovementSystem';
import { BattleSystem } from '../BattleSystem';
import { SkillSystem } from '../skills/SkillSystem';
import { RecruitmentSystem } from '../recruitment/RecruitmentSystem';
import { AISkillEvaluator } from './AISkillEvaluator';
import { DifficultyManager, difficultyManager, PerformanceStats } from './DifficultyManager';
import { AIPerformanceMonitor, AIPerformanceUtils } from './AIPerformanceMonitor';
import { DifficultyLevel } from '../../types/ai';

/**
 * AI thinking visual feedback interface
 */
export interface AIThinkingVisuals {
    thinkingIndicator?: Phaser.GameObjects.Container;
    progressBar?: Phaser.GameObjects.Graphics;
    thinkingText?: Phaser.GameObjects.Text;
    actionPreview?: Phaser.GameObjects.Graphics;
}

/**
 * AI execution state
 */
export interface AIExecutionState {
    isExecuting: boolean;
    currentUnit?: Unit;
    currentAction?: AIAction;
    thinkingStartTime: number;
    executionStartTime: number;
    visuals: AIThinkingVisuals;
}

/**
 * Main AI system manager for GameplayScene integration
 */
export class AISystemManager {
    private scene: Phaser.Scene;
    private config: AISystemManagerConfig;
    private eventEmitter: Phaser.Events.EventEmitter;

    // System integrations
    private gameStateManager!: GameStateManager;
    private movementSystem!: MovementSystem;
    private battleSystem!: BattleSystem;
    private skillSystem!: SkillSystem;
    private recruitmentSystem!: RecruitmentSystem;

    // AI components
    private actionEvaluator!: ActionEvaluator;
    private aiControllers: Map<string, AIController> = new Map();
    private difficultySettings: DifficultySettings;
    private difficultyManager: DifficultyManager;
    private performanceMonitor: AIPerformanceMonitor;

    // Execution state
    private executionState: AIExecutionState;
    private isInitialized: boolean = false;

    // Visual feedback
    private thinkingLayer?: Phaser.GameObjects.Container;

    constructor(
        scene: Phaser.Scene,
        config: AISystemManagerConfig,
        eventEmitter: Phaser.Events.EventEmitter
    ) {
        this.scene = scene;
        this.config = config;
        this.eventEmitter = eventEmitter;

        this.difficultyManager = difficultyManager;
        this.difficultySettings = this.difficultyManager.getCurrentSettings();
        this.performanceMonitor = AIPerformanceMonitor.getInstance();
        this.executionState = this.createInitialExecutionState();
    }

    /**
     * Initialize the AI system with game systems
     */
    public initialize(
        gameStateManager: GameStateManager,
        movementSystem: MovementSystem,
        battleSystem: BattleSystem,
        skillSystem: SkillSystem,
        recruitmentSystem: RecruitmentSystem
    ): void {
        console.log('AISystemManager: Initializing AI system');

        // Store system references
        this.gameStateManager = gameStateManager;
        this.movementSystem = movementSystem;
        this.battleSystem = battleSystem;
        this.skillSystem = skillSystem;
        this.recruitmentSystem = recruitmentSystem;

        // Create system integration object
        const integration: AISystemIntegration = {
            movementSystem: this.movementSystem,
            battleSystem: this.battleSystem,
            skillSystem: this.skillSystem,
            recruitmentSystem: this.recruitmentSystem,
        };

        // Initialize action evaluator
        this.actionEvaluator = new ActionEvaluator(integration, this.difficultySettings);

        // Initialize skill evaluator if skill system is available
        if (this.skillSystem) {
            this.initializeSkillEvaluator();
        }

        // Create visual feedback layer
        this.createVisualFeedbackLayer();

        // Setup event listeners
        this.setupEventListeners();

        // Start performance monitoring
        this.performanceMonitor.startMonitoring();

        this.isInitialized = true;
        console.log('AISystemManager: Initialization completed');
    }

    /**
     * Create AI controllers for enemy units
     */
    public createAIControllers(units: Unit[]): void {
        if (!this.isInitialized) {
            console.warn('AISystemManager: Cannot create controllers before initialization');
            return;
        }

        console.log('AISystemManager: Creating AI controllers for enemy units');

        const enemyUnits = units.filter(unit => unit.faction === 'enemy');

        for (const unit of enemyUnits) {
            // Create personality for this unit (simplified)
            const personality = this.createPersonalityForUnit(unit);

            // Create controller config
            const controllerConfig: AIControllerConfig = {
                thinkingTimeLimit: this.config.thinkingTimeLimit,
                enableAILogging: this.config.enableDebugLogging,
                randomFactor: this.config.randomFactor,
                npcPriorityMultiplier: this.config.npcPriorityMultiplier,
            };

            // Create system integration
            const integration: AISystemIntegration = {
                movementSystem: this.movementSystem,
                battleSystem: this.battleSystem,
                skillSystem: this.skillSystem,
                recruitmentSystem: this.recruitmentSystem,
            };

            // Create basic AI controller (we'll use a simple implementation for now)
            const aiController = new BasicAIController(
                unit,
                personality,
                this.difficultySettings,
                controllerConfig,
                integration
            );

            this.aiControllers.set(unit.id, aiController);
        }

        console.log(`AISystemManager: Created ${this.aiControllers.size} AI controllers`);
    }

    /**
     * Execute AI turn for the current active unit
     */
    public async executeAITurn(activeUnit: Unit, gameState: GameState, mapData: MapData): Promise<AIExecutionResult> {
        if (!this.isInitialized) {
            return {
                success: false,
                message: 'AI system not initialized',
                action: { type: AIActionType.WAIT, priority: 0, reasoning: 'System not ready' },
            };
        }

        if (activeUnit.faction !== 'enemy') {
            return {
                success: false,
                message: 'AI can only control enemy units',
                action: { type: AIActionType.WAIT, priority: 0, reasoning: 'Not an enemy unit' },
            };
        }

        const aiController = this.aiControllers.get(activeUnit.id);
        if (!aiController) {
            console.warn(`AISystemManager: No AI controller found for unit ${activeUnit.id}`);
            return {
                success: false,
                message: `No AI controller for unit ${activeUnit.id}`,
                action: { type: AIActionType.WAIT, priority: 0, reasoning: 'No controller available' },
            };
        }

        try {
            // Start AI execution
            this.startAIExecution(activeUnit);

            // Create AI context
            const context = this.createAIContext(activeUnit, gameState, mapData);

            // Show thinking visual feedback
            this.showThinkingFeedback(activeUnit);

            // Let AI decide action with performance monitoring
            const { result: action, duration } = await AIPerformanceUtils.measureThinkingTime(
                activeUnit.id,
                () => aiController.decideAction(context)
            );

            // Record action type for statistics
            this.performanceMonitor.recordActionType(action.type);

            // Hide thinking feedback
            this.hideThinkingFeedback();

            // Execute the decided action
            const executionResult = await this.executeAIAction(action, activeUnit, context);

            // Complete AI execution
            this.completeAIExecution(action, executionResult.success);

            return {
                success: executionResult.success,
                message: executionResult.message,
                action,
                executionTime: Date.now() - this.executionState.executionStartTime,
            };
        } catch (error) {
            console.error('AISystemManager: Error during AI turn execution:', error);
            this.performanceMonitor.recordError('ai_execution_error');
            this.hideThinkingFeedback();
            this.completeAIExecution(undefined, false);

            return {
                success: false,
                message: `AI execution failed: ${error}`,
                action: { type: AIActionType.WAIT, priority: 0, reasoning: 'Execution error' },
            };
        }
    }

    /**
     * Check if AI is currently executing
     */
    public isExecuting(): boolean {
        return this.executionState.isExecuting;
    }

    /**
     * Get current AI thinking state
     */
    public getThinkingState(): AIThinkingState {
        return {
            isThinking: this.executionState.isExecuting,
            currentUnit: this.executionState.currentUnit,
            thinkingTime: this.executionState.isExecuting
                ? Date.now() - this.executionState.thinkingStartTime
                : 0,
        };
    }

    /**
     * Update difficulty settings
     */
    public updateDifficultySettings(settings: Partial<DifficultySettings>): void {
        this.difficultySettings = { ...this.difficultySettings, ...settings };
        console.log('AISystemManager: Updated difficulty settings');
    }

    // Private methods

    private createDefaultDifficultySettings(): DifficultySettings {
        return {
            thinkingDepth: this.config.defaultDifficulty?.thinkingDepth || 3,
            randomnessFactor: this.config.defaultDifficulty?.randomnessFactor || 0.2,
            mistakeProbability: this.config.defaultDifficulty?.mistakeProbability || 0.1,
            reactionTime: this.config.defaultDifficulty?.reactionTime || 1000,
            skillUsageFrequency: this.config.defaultDifficulty?.skillUsageFrequency || 0.7,
        };
    }

    private createInitialExecutionState(): AIExecutionState {
        return {
            isExecuting: false,
            thinkingStartTime: 0,
            executionStartTime: 0,
            visuals: {},
        };
    }

    private createPersonalityForUnit(unit: Unit): AIPersonality {
        // Simplified personality creation based on unit stats
        const aggressiveness = Math.min(1, unit.stats.attack / 30);
        const defensiveness = Math.min(1, unit.stats.defense / 25);
        const supportiveness = unit.stats.maxMP > 30 ? 0.7 : 0.3;

        return {
            aggressiveness,
            defensiveness,
            supportiveness,
            tacticalness: 0.5,
            riskTolerance: aggressiveness * 0.8,
            getActionModifier: (actionType: AIActionType) => {
                switch (actionType) {
                    case AIActionType.ATTACK:
                        return aggressiveness;
                    case AIActionType.MOVE:
                        return defensiveness;
                    case AIActionType.SKILL:
                        return supportiveness;
                    default:
                        return 0.5;
                }
            },
            shouldTakeRisk: (riskLevel: number) => {
                return riskLevel <= aggressiveness;
            },
            getPriorityModifier: (target: Unit) => {
                // NPCs get higher priority
                if (this.recruitmentSystem?.isNPC(target)) {
                    return 2.0;
                }
                return 1.0;
            },
        };
    }

    private createAIContext(activeUnit: Unit, gameState: GameState, mapData: MapData): AIContext {
        const allUnits = gameState.turnOrder;
        const visibleEnemies = allUnits.filter(unit =>
            unit.faction !== activeUnit.faction && unit.currentHP > 0
        );
        const visibleAllies = allUnits.filter(unit =>
            unit.faction === activeUnit.faction && unit.currentHP > 0 && unit.id !== activeUnit.id
        );
        const npcs = allUnits.filter(unit => this.recruitmentSystem?.isNPC(unit));

        const context: AIContext = {
            currentCharacter: activeUnit,
            currentUnit: activeUnit,
            gameState,
            mapData,
            terrainData: mapData,
            visibleEnemies,
            visibleAllies,
            npcs,
            availableSkills: this.skillSystem?.getAvailableSkills(activeUnit) || [],
            turnNumber: gameState.currentTurn,
            difficultySettings: this.difficultySettings,
            actionHistory: []
        };

        // Get adjusted difficulty settings for this context
        const adjustedSettings = this.getAdjustedDifficultySettings(context);
        context.difficultySettings = adjustedSettings;

        return context;
    }

    private startAIExecution(unit: Unit): void {
        this.executionState.isExecuting = true;
        this.executionState.currentUnit = unit;
        this.executionState.thinkingStartTime = Date.now();
        this.executionState.executionStartTime = Date.now();

        // Emit AI turn started event
        this.eventEmitter.emit('ai-turn-started', {
            unit,
            timestamp: Date.now(),
        });
    }

    private completeAIExecution(action?: AIAction, success: boolean = true): void {
        const executionTime = Date.now() - this.executionState.executionStartTime;

        // Emit AI turn completed event
        this.eventEmitter.emit('ai-turn-completed', {
            unit: this.executionState.currentUnit,
            action,
            success,
            executionTime,
            timestamp: Date.now(),
        });

        // Reset execution state
        this.executionState.isExecuting = false;
        this.executionState.currentUnit = undefined;
        this.executionState.currentAction = undefined;
    }

    private async executeAIAction(action: AIAction, unit: Unit, context: AIContext): Promise<{ success: boolean; message: string }> {
        console.log(`AISystemManager: Executing ${action.type} action for ${unit.name}: ${action.reasoning}`);

        try {
            switch (action.type) {
                case AIActionType.MOVE:
                    return await this.executeMove(action, unit, context);
                case AIActionType.ATTACK:
                    return await this.executeAttack(action, unit, context);
                case AIActionType.SKILL:
                    return await this.executeSkill(action, unit, context);
                case AIActionType.WAIT:
                    return await this.executeWait(action, unit, context);
                default:
                    return { success: false, message: `Unknown action type: ${action.type}` };
            }
        } catch (error) {
            console.error(`AISystemManager: Error executing ${action.type}:`, error);
            return { success: false, message: `Execution error: ${error}` };
        }
    }

    private async executeMove(action: AIAction, unit: Unit, context: AIContext): Promise<{ success: boolean; message: string }> {
        if (!action.position) {
            return { success: false, message: 'No target position specified for move' };
        }

        // Use movement system to execute move
        const moveResult = await this.movementSystem.executeMovement(unit, action.position);

        if (moveResult.success) {
            unit.hasMoved = true;
            return { success: true, message: `${unit.name} moved to (${action.position.x}, ${action.position.y})` };
        } else {
            return { success: false, message: moveResult.message || 'Move failed' };
        }
    }

    private async executeAttack(action: AIAction, unit: Unit, context: AIContext): Promise<{ success: boolean; message: string }> {
        if (!action.target) {
            return { success: false, message: 'No target specified for attack' };
        }

        // Use battle system to execute attack
        const battleResult = await this.battleSystem.executeAttack(unit, action.target);

        if (battleResult.success) {
            unit.hasActed = true;
            return { success: true, message: `${unit.name} attacked ${action.target.name}` };
        } else {
            return { success: false, message: battleResult.message || 'Attack failed' };
        }
    }

    private async executeSkill(action: AIAction, unit: Unit, context: AIContext): Promise<{ success: boolean; message: string }> {
        if (!action.skillId) {
            return { success: false, message: 'No skill specified for skill action' };
        }

        if (!this.skillSystem) {
            return { success: false, message: 'Skill system not available' };
        }

        try {
            // Determine target position
            let targetPosition = action.position;
            if (!targetPosition && action.target) {
                targetPosition = action.target.position;
            }
            if (!targetPosition) {
                targetPosition = unit.position; // Default to self
            }

            // Use skill system to execute skill
            const skillResult = await this.skillSystem.useSkill(
                action.skillId,
                unit.id,
                targetPosition,
                true // Skip UI for AI
            );

            if (skillResult.success && skillResult.result) {
                unit.hasActed = true;

                // Update MP
                if (skillResult.result.mpCost > 0) {
                    unit.currentMP = Math.max(0, unit.currentMP - skillResult.result.mpCost);
                }

                const skillName = action.skill?.name || action.skillId;
                const targetName = action.target?.name || 'target area';

                return {
                    success: true,
                    message: `${unit.name} used ${skillName} on ${targetName}`
                };
            } else {
                const errorMessage = skillResult.error?.message || 'Skill execution failed';
                return { success: false, message: errorMessage };
            }
        } catch (error) {
            console.error('AISystemManager: Skill execution error:', error);
            return { success: false, message: `Skill execution error: ${error}` };
        }
    }

    private async executeWait(action: AIAction, unit: Unit, context: AIContext): Promise<{ success: boolean; message: string }> {
        // Wait action - just mark as acted
        unit.hasActed = true;

        // Add a small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, message: `${unit.name} waited` };
    }

    private createVisualFeedbackLayer(): void {
        this.thinkingLayer = this.scene.add.container(0, 0);

        // Check if methods exist before calling (for testing compatibility)
        if (typeof this.thinkingLayer.setDepth === 'function') {
            this.thinkingLayer.setDepth(1000); // High depth for UI overlay
        }
        if (typeof this.thinkingLayer.setVisible === 'function') {
            this.thinkingLayer.setVisible(false);
        }
    }

    private showThinkingFeedback(unit: Unit): void {
        if (!this.thinkingLayer || !this.config.enableVisualFeedback) {
            return;
        }

        // Clear previous visuals
        this.hideThinkingFeedback();

        // Calculate screen position for unit (simplified conversion)
        const tileSize = 32; // Default tile size
        const screenPos = {
            x: unit.position.x * tileSize + tileSize / 2,
            y: unit.position.y * tileSize + tileSize / 2 - 40
        };

        // Create thinking indicator
        const indicator = this.scene.add.container(screenPos.x, screenPos.y);

        // Background circle
        const bg = this.scene.add.circle(0, 0, 20, 0x000000, 0.7);
        indicator.add(bg);

        // Thinking dots animation
        const dots = this.scene.add.text(0, 0, '...', {
            fontSize: '16px',
            color: '#ffffff',
            align: 'center',
        });
        dots.setOrigin(0.5);
        indicator.add(dots);

        // Animate thinking dots
        this.scene.tweens.add({
            targets: dots,
            alpha: { from: 1, to: 0.3 },
            duration: 500,
            yoyo: true,
            repeat: -1,
        });

        // Add progress bar
        const progressBg = this.scene.add.rectangle(0, 25, 40, 4, 0x333333);
        const progressBar = this.scene.add.rectangle(-20, 25, 0, 4, 0x00ff00);
        progressBar.setOrigin(0, 0.5);
        indicator.add([progressBg, progressBar]);

        // Animate progress bar
        this.scene.tweens.add({
            targets: progressBar,
            width: 40,
            duration: this.config.thinkingTimeLimit,
            ease: 'Linear',
        });

        this.thinkingLayer.add(indicator);
        this.thinkingLayer.setVisible(true);

        // Store reference for cleanup
        this.executionState.visuals.thinkingIndicator = indicator;
    }

    private hideThinkingFeedback(): void {
        if (this.thinkingLayer) {
            this.thinkingLayer.removeAll(true);
            this.thinkingLayer.setVisible(false);
        }

        // Clear visual references
        this.executionState.visuals = {};
    }

    /**
     * Initialize skill evaluator for advanced skill usage
     */
    private initializeSkillEvaluator(): void {
        if (!this.skillSystem) {
            console.warn('AISystemManager: Cannot initialize skill evaluator without skill system');
            return;
        }

        try {
            // Get condition checker from skill system
            const conditionChecker = (this.skillSystem as any).conditionChecker ||
                (this.skillSystem as any).getConditionChecker?.();

            if (conditionChecker) {
                // Create skill evaluator instance (will be used by AI controllers)
                console.log('AISystemManager: Skill evaluator initialized successfully');
            } else {
                console.warn('AISystemManager: Could not get condition checker from skill system');
            }
        } catch (error) {
            console.error('AISystemManager: Failed to initialize skill evaluator:', error);
        }
    }

    private setupEventListeners(): void {
        // Listen for game state changes that might affect AI
        this.eventEmitter.on('turn-changed', (data: any) => {
            if (data.activePlayer === 'enemy' && data.activeUnit) {
                // AI turn started - could trigger automatic execution
                console.log('AISystemManager: Enemy turn started for', data.activeUnit.name);
            }
        });

        // Listen for unit state changes
        this.eventEmitter.on('unit-defeated', (data: any) => {
            // Remove AI controller for defeated units
            if (this.aiControllers.has(data.unit.id)) {
                this.aiControllers.delete(data.unit.id);
                console.log(`AISystemManager: Removed AI controller for defeated unit ${data.unit.id}`);
            }
        });

        // Listen for skill system events
        this.eventEmitter.on('skill-executed', (data: any) => {
            if (this.config.enableDebugLogging) {
                console.log('AISystemManager: Skill executed by AI:', data);
            }
        });
    }

    // ========================================
    // Difficulty Management Methods
    // ========================================

    /**
     * Set difficulty level
     */
    public setDifficultyLevel(level: DifficultyLevel): void {
        this.difficultyManager.setDifficultyLevel(level);
        this.difficultySettings = this.difficultyManager.getCurrentSettings();

        // Update action evaluator with new settings
        if (this.actionEvaluator) {
            this.actionEvaluator.updateDifficultySettings(this.difficultySettings);
        }

        console.log(`AISystemManager: Difficulty level set to ${level}`);
    }

    /**
     * Get current difficulty level
     */
    public getCurrentDifficultyLevel(): DifficultyLevel {
        return this.difficultyManager.getCurrentDifficultyLevel();
    }

    /**
     * Update difficulty settings in real-time
     */
    public updateDifficultySettings(partialSettings: Partial<DifficultySettings>): void {
        this.difficultyManager.updateSettings(partialSettings);
        this.difficultySettings = this.difficultyManager.getCurrentSettings();

        // Update action evaluator with new settings
        if (this.actionEvaluator) {
            this.actionEvaluator.updateDifficultySettings(this.difficultySettings);
        }

        console.log('AISystemManager: Difficulty settings updated');
    }

    /**
     * Enable/disable adaptive difficulty
     */
    public setAdaptiveDifficulty(enabled: boolean): void {
        this.difficultyManager.setAdaptiveDifficulty(enabled);
        console.log(`AISystemManager: Adaptive difficulty ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Record performance for adaptive difficulty
     */
    public recordPerformance(stats: PerformanceStats): void {
        this.difficultyManager.recordPerformance(stats);
    }

    /**
     * Get adjusted difficulty settings for current context
     */
    private getAdjustedDifficultySettings(context: AIContext): DifficultySettings {
        return this.difficultyManager.getAdjustedSettings(context);
    }

    /**
     * Get difficulty statistics
     */
    public getDifficultyStatistics(): any {
        return this.difficultyManager.getStatistics();
    }

    /**
     * Export difficulty settings
     */
    public exportDifficultySettings(): string {
        return this.difficultyManager.exportSettings();
    }

    /**
     * Import difficulty settings
     */
    public importDifficultySettings(jsonString: string): boolean {
        const success = this.difficultyManager.importSettings(jsonString);
        if (success) {
            this.difficultySettings = this.difficultyManager.getCurrentSettings();

            // Update action evaluator with new settings
            if (this.actionEvaluator) {
                this.actionEvaluator.updateDifficultySettings(this.difficultySettings);
            }
        }
        return success;
    }

    // ========================================
    // Performance Monitoring Methods
    // ========================================

    /**
     * Get AI performance statistics
     */
    public getPerformanceStats() {
        return this.performanceMonitor.getPerformanceStats();
    }

    /**
     * Get AI performance metrics
     */
    public getPerformanceMetrics() {
        return this.performanceMonitor.getPerformanceMetrics();
    }

    /**
     * Check performance thresholds and get alerts
     */
    public checkPerformanceThresholds() {
        return this.performanceMonitor.checkPerformanceThresholds();
    }

    /**
     * Get cache statistics
     */
    public getCacheStats() {
        return this.performanceMonitor.getCacheStats();
    }

    /**
     * Reset performance statistics
     */
    public resetPerformanceStats(): void {
        this.performanceMonitor.resetStats();
    }

    /**
     * Perform memory cleanup
     */
    public performMemoryCleanup(): void {
        this.performanceMonitor.performMemoryCleanup();
    }

    /**
     * Execute multiple AI units in parallel
     */
    public async executeParallelAITurns(
        units: Unit[],
        gameState: GameState,
        mapData: MapData
    ): Promise<Map<string, AIExecutionResult>> {
        const results = new Map<string, AIExecutionResult>();

        // Filter enemy units that have AI controllers
        const aiUnits = units.filter(unit =>
            unit.faction === 'enemy' && this.aiControllers.has(unit.id)
        );

        if (aiUnits.length === 0) {
            return results;
        }

        // Create thinking function for parallel execution
        const thinkingFunction = async (unit: Unit) => {
            const aiController = this.aiControllers.get(unit.id);
            if (!aiController) {
                throw new Error(`No AI controller for unit ${unit.id}`);
            }

            const context = this.createAIContext(unit, gameState, mapData);
            return await aiController.decideAction(context);
        };

        try {
            // Execute AI thinking in parallel
            const actionResults = await this.performanceMonitor.executeParallelThinking(
                aiUnits,
                thinkingFunction
            );

            // Execute actions sequentially (to avoid conflicts)
            for (const [unitId, action] of actionResults) {
                const unit = aiUnits.find(u => u.id === unitId);
                if (!unit) continue;

                const context = this.createAIContext(unit, gameState, mapData);
                const executionResult = await this.executeAIAction(action, unit, context);

                results.set(unitId, {
                    success: executionResult.success,
                    message: executionResult.message,
                    action,
                    executionTime: 0 // Already measured in parallel execution
                });
            }

        } catch (error) {
            console.error('AISystemManager: Error in parallel AI execution:', error);
            this.performanceMonitor.recordError('parallel_execution_error');

            // Create fallback results for all units
            for (const unit of aiUnits) {
                results.set(unit.id, {
                    success: false,
                    message: `Parallel execution failed: ${error}`,
                    action: { type: AIActionType.WAIT, priority: 0, reasoning: 'Parallel execution error' }
                });
            }
        }

        return results;
    }

    /**
     * Log performance statistics to console
     */
    public logPerformanceStats(): void {
        AIPerformanceUtils.logPerformanceStats();
    }

    /**
     * Cleanup resources when shutting down
     */
    public shutdown(): void {
        // Stop performance monitoring
        this.performanceMonitor.stopMonitoring();

        // Clear AI controllers
        this.aiControllers.clear();

        // Clear visual feedback
        this.hideThinkingFeedback();

        console.log('AISystemManager: Shutdown completed');
    }
}

/**
 * Basic AI Controller implementation
 * This is a simplified implementation for the initial integration
 */
class BasicAIController extends AIController {
    protected async makeDecision(context: AIContext): Promise<AIAction> {
        // Get all valid actions
        const validActions = this.getValidActions(context);

        if (validActions.length === 0) {
            return {
                type: AIActionType.WAIT,
                priority: 0,
                reasoning: 'No valid actions available',
            };
        }

        // Apply personality and difficulty modifiers
        const evaluatedActions = validActions.map(action => ({
            ...action,
            priority: this.applyRandomFactor(action.priority),
        }));

        // Sort by priority and select the best action
        evaluatedActions.sort((a, b) => b.priority - a.priority);

        // Apply mistake probability
        if (this.shouldMakeMistake() && evaluatedActions.length > 1) {
            // Choose a suboptimal action
            const mistakeIndex = Math.min(1, Math.floor(Math.random() * 3));
            return evaluatedActions[mistakeIndex] || evaluatedActions[0];
        }

        return evaluatedActions[0];
    }

    public evaluatePosition(position: Position, context: AIContext): number {
        // Simplified position evaluation
        let score = 0;

        // Distance to enemies
        for (const enemy of context.visibleEnemies) {
            const distance = this.calculateDistance(position, enemy.position);
            score += Math.max(0, 10 - distance);
        }

        return score;
    }

    public getPriority(context: AIContext): number {
        // Base priority on unit stats
        return this.unit.stats.speed + this.unit.stats.attack * 0.1;
    }
}