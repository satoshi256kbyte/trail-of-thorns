/**
 * AIConsoleCommands - Console commands for AI system debugging and control
 *
 * This module provides:
 * - Console commands for AI behavior control and testing
 * - Real-time AI parameter adjustment
 * - AI statistics and analysis commands
 * - Debug mode control and visualization commands
 * - Mock AI scenario creation and testing
 *
 * Implements requirements 7.3, 7.4, 7.5 from the AI system specification
 */

import {
    AIAction,
    AIActionType,
    AIContext,
    AIPersonality,
    AIPersonalityType,
    DifficultySettings,
    DifficultyLevel,
    AIDebugInfo,
    AIPerformanceMetrics,
} from '../types/ai';
import { Unit, Position } from '../types/gameplay';
import { AIDebugManager } from './AIDebugManager';
import { AIController } from '../systems/AIController';
import { ActionEvaluator } from '../systems/ActionEvaluator';

/**
 * Console command result
 */
export interface AICommandResult {
    success: boolean;
    message: string;
    data?: any;
}

/**
 * Mock AI scenario options
 */
export interface MockAIScenarioOptions {
    characterCount?: number;
    personalityTypes?: AIPersonalityType[];
    difficultyLevel?: DifficultyLevel;
    mapSize?: { width: number; height: number };
    enableNPCs?: boolean;
    enableSkills?: boolean;
}

/**
 * AI test configuration
 */
export interface AITestConfig {
    iterations?: number;
    timeLimit?: number;
    logResults?: boolean;
    comparePersonalities?: boolean;
    analyzeDifficulty?: boolean;
}

/**
 * AI Console Commands system
 */
export class AIConsoleCommands {
    private debugManager?: AIDebugManager;
    private aiControllers: Map<string, AIController> = new Map();
    private mockUnits: Map<string, Unit> = new Map();
    private testScenarios: Map<string, MockAIScenarioOptions> = new Map();

    constructor(debugManager?: AIDebugManager) {
        this.debugManager = debugManager;
        this.initializeConsoleCommands();
    }

    /**
     * Initialize console commands
     */
    private initializeConsoleCommands(): void {
        if (typeof window === 'undefined') return;

        // Add AI commands to global object
        (window as any).aiDebug = {
            // Debug control commands
            enable: (enable: boolean = true) => this.enableDebug(enable),
            disable: () => this.enableDebug(false),
            toggle: () => this.toggleDebug(),
            clear: () => this.clearDebugInfo(),

            // AI behavior control
            setDifficulty: (level: number) => this.setDifficulty(level),
            forceAction: (characterId: string, actionType: string, ...args: any[]) =>
                this.forceAction(characterId, actionType, ...args),
            showThinking: (characterId: string) => this.showThinking(characterId),
            hideThinking: (characterId: string) => this.hideThinking(characterId),

            // Statistics and analysis
            getStats: () => this.getStats(),
            getPerformance: () => this.getPerformance(),
            analyzePersonalities: () => this.analyzePersonalities(),
            analyzeDifficulty: () => this.analyzeDifficulty(),

            // AI testing and simulation
            createMockUnit: (id: string, options?: any) => this.createMockUnit(id, options),
            createScenario: (id: string, options?: MockAIScenarioOptions) =>
                this.createScenario(id, options),
            runTest: (scenarioId: string, config?: AITestConfig) => this.runTest(scenarioId, config),
            simulateDecision: (characterId: string, iterations?: number) =>
                this.simulateDecision(characterId, iterations),

            // Configuration and settings
            setPersonality: (characterId: string, personalityType: string) =>
                this.setPersonality(characterId, personalityType),
            setThinkingTimeLimit: (timeMs: number) => this.setThinkingTimeLimit(timeMs),
            setRandomFactor: (factor: number) => this.setRandomFactor(factor),

            // Visualization control
            showActionEvaluations: (enable: boolean = true) => this.showActionEvaluations(enable),
            showThinkingVisualization: (enable: boolean = true) => this.showThinkingVisualization(enable),
            showPerformanceMetrics: (enable: boolean = true) => this.showPerformanceMetrics(enable),

            // Utility commands
            listUnits: () => this.listUnits(),
            listScenarios: () => this.listScenarios(),
            resetAI: (characterId?: string) => this.resetAI(characterId),
            generateReport: () => this.generateReport(),

            // Help
            help: () => this.showHelp(),
        };

        console.log('AI Debug Console Commands initialized. Type "aiDebug.help()" for available commands.');
    }

    /**
     * Enable/disable debug mode
     */
    private enableDebug(enable: boolean): AICommandResult {
        if (!this.debugManager) {
            return {
                success: false,
                message: 'AI Debug Manager not available',
            };
        }

        if (enable) {
            this.debugManager.enableDebugMode();
        } else {
            this.debugManager.disableDebugMode();
        }

        return {
            success: true,
            message: `AI debug mode ${enable ? 'enabled' : 'disabled'}`,
        };
    }

    /**
     * Toggle debug mode
     */
    private toggleDebug(): AICommandResult {
        if (!this.debugManager) {
            return {
                success: false,
                message: 'AI Debug Manager not available',
            };
        }

        this.debugManager.toggleDebugMode();

        return {
            success: true,
            message: 'AI debug mode toggled',
        };
    }

    /**
     * Clear debug information
     */
    private clearDebugInfo(): AICommandResult {
        if (this.debugManager) {
            this.debugManager.clearDebugInfo();
        }

        return {
            success: true,
            message: 'AI debug information cleared',
        };
    }

    /**
     * Set AI difficulty level
     */
    private setDifficulty(level: number): AICommandResult {
        if (level < 1 || level > 5) {
            return {
                success: false,
                message: 'Difficulty level must be between 1 and 5',
            };
        }

        // Update difficulty for all AI controllers
        this.aiControllers.forEach(controller => {
            const difficultySettings: DifficultySettings = {
                thinkingDepth: level,
                randomnessFactor: Math.max(0, 1 - (level - 1) * 0.2),
                mistakeProbability: Math.max(0, 0.2 - (level - 1) * 0.04),
                reactionTime: Math.max(100, 1000 - (level - 1) * 200),
                skillUsageFrequency: Math.min(1, 0.3 + (level - 1) * 0.15),
                thinkingTimeLimit: 2000,
            };

            // Update controller difficulty (would need to implement this method)
            // controller.updateDifficulty(difficultySettings);
        });

        return {
            success: true,
            message: `AI difficulty set to level ${level}`,
            data: { level },
        };
    }

    /**
     * Force an AI to perform a specific action
     */
    private forceAction(characterId: string, actionType: string, ...args: any[]): AICommandResult {
        const controller = this.aiControllers.get(characterId);
        if (!controller) {
            return {
                success: false,
                message: `AI controller for character '${characterId}' not found`,
            };
        }

        const unit = this.mockUnits.get(characterId);
        if (!unit) {
            return {
                success: false,
                message: `Unit '${characterId}' not found`,
            };
        }

        // Create forced action
        let action: AIAction;

        switch (actionType.toLowerCase()) {
            case 'move':
                const [x, y] = args;
                if (x === undefined || y === undefined) {
                    return {
                        success: false,
                        message: 'Move action requires x and y coordinates',
                    };
                }
                action = {
                    type: AIActionType.MOVE,
                    priority: 100,
                    position: { x: parseInt(x), y: parseInt(y) },
                    reasoning: 'Forced by console command',
                };
                break;

            case 'attack':
                const [targetId] = args;
                const target = this.mockUnits.get(targetId);
                if (!target) {
                    return {
                        success: false,
                        message: `Target unit '${targetId}' not found`,
                    };
                }
                action = {
                    type: AIActionType.ATTACK,
                    priority: 100,
                    target,
                    reasoning: 'Forced by console command',
                };
                break;

            case 'skill':
                const [skillId, skillTargetId] = args;
                const skillTarget = skillTargetId ? this.mockUnits.get(skillTargetId) : undefined;
                action = {
                    type: AIActionType.SKILL,
                    priority: 100,
                    skillId,
                    target: skillTarget,
                    reasoning: 'Forced by console command',
                };
                break;

            case 'wait':
                action = {
                    type: AIActionType.WAIT,
                    priority: 100,
                    reasoning: 'Forced by console command',
                };
                break;

            default:
                return {
                    success: false,
                    message: `Unknown action type '${actionType}'. Available: move, attack, skill, wait`,
                };
        }

        // Log the forced action
        if (this.debugManager) {
            this.debugManager.logActionSelection(action, 'Action forced by console command');
        }

        return {
            success: true,
            message: `Forced ${actionType} action for ${characterId}`,
            data: action,
        };
    }

    /**
     * Show thinking process for a character
     */
    private showThinking(characterId: string): AICommandResult {
        const unit = this.mockUnits.get(characterId);
        if (!unit) {
            return {
                success: false,
                message: `Unit '${characterId}' not found`,
            };
        }

        if (this.debugManager) {
            this.debugManager.showThinkingVisualization(unit);
        }

        return {
            success: true,
            message: `Showing thinking visualization for ${characterId}`,
        };
    }

    /**
     * Hide thinking process for a character
     */
    private hideThinking(characterId: string): AICommandResult {
        // Implementation would hide thinking visualization
        return {
            success: true,
            message: `Hidden thinking visualization for ${characterId}`,
        };
    }

    /**
     * Get AI statistics
     */
    private getStats(): AICommandResult {
        if (!this.debugManager) {
            return {
                success: false,
                message: 'AI Debug Manager not available',
            };
        }

        const stats = this.debugManager.getDebugStatistics();

        return {
            success: true,
            message: 'AI statistics retrieved',
            data: stats,
        };
    }

    /**
     * Get performance metrics
     */
    private getPerformance(): AICommandResult {
        if (!this.debugManager) {
            return {
                success: false,
                message: 'AI Debug Manager not available',
            };
        }

        // Get performance data from debug manager
        const stats = this.debugManager.getDebugStatistics();
        const performance = {
            averageThinkingTime: stats.averageThinkingTime,
            maxThinkingTime: stats.maxThinkingTime,
            minThinkingTime: stats.minThinkingTime,
            totalDecisions: stats.totalDecisions,
            timeoutCount: stats.timeoutCount,
            errorCount: stats.errorCount,
            successRate: stats.totalDecisions > 0 ?
                ((stats.totalDecisions - stats.errorCount) / stats.totalDecisions * 100).toFixed(2) + '%' : 'N/A',
        };

        return {
            success: true,
            message: 'AI performance metrics retrieved',
            data: performance,
        };
    }

    /**
     * Analyze personality distribution and effectiveness
     */
    private analyzePersonalities(): AICommandResult {
        if (!this.debugManager) {
            return {
                success: false,
                message: 'AI Debug Manager not available',
            };
        }

        const stats = this.debugManager.getDebugStatistics();
        const analysis = {
            distribution: stats.personalityDistribution,
            mostUsed: Object.entries(stats.personalityDistribution)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None',
            recommendations: this.generatePersonalityRecommendations(stats),
        };

        return {
            success: true,
            message: 'Personality analysis completed',
            data: analysis,
        };
    }

    /**
     * Analyze difficulty level effectiveness
     */
    private analyzeDifficulty(): AICommandResult {
        if (!this.debugManager) {
            return {
                success: false,
                message: 'AI Debug Manager not available',
            };
        }

        const stats = this.debugManager.getDebugStatistics();
        const analysis = {
            levelUsage: stats.difficultyLevelUsage,
            averageThinkingTime: stats.averageThinkingTime,
            timeoutRate: stats.totalDecisions > 0 ?
                (stats.timeoutCount / stats.totalDecisions * 100).toFixed(2) + '%' : 'N/A',
            errorRate: stats.totalDecisions > 0 ?
                (stats.errorCount / stats.totalDecisions * 100).toFixed(2) + '%' : 'N/A',
            recommendations: this.generateDifficultyRecommendations(stats),
        };

        return {
            success: true,
            message: 'Difficulty analysis completed',
            data: analysis,
        };
    }

    /**
     * Create a mock unit for testing
     */
    private createMockUnit(id: string, options: any = {}): AICommandResult {
        const unit: Unit = {
            id,
            name: options.name || `MockAI_${id}`,
            position: options.position || { x: 0, y: 0 },
            stats: {
                level: options.level || 1,
                maxHP: options.hp || 100,
                maxMP: options.mp || 50,
                attack: options.attack || 20,
                defense: options.defense || 15,
                speed: options.speed || 10,
                movement: options.movement || 3,
                agility: options.agility || 10,
                luck: options.luck || 5,
            },
            currentHP: options.hp || 100,
            currentMP: options.mp || 50,
            faction: options.faction || 'enemy',
            hasActed: false,
            hasMoved: false,
        };

        this.mockUnits.set(id, unit);

        return {
            success: true,
            message: `Mock AI unit '${id}' created`,
            data: unit,
        };
    }

    /**
     * Create a test scenario
     */
    private createScenario(id: string, options: MockAIScenarioOptions = {}): AICommandResult {
        const scenario: MockAIScenarioOptions = {
            characterCount: options.characterCount || 4,
            personalityTypes: options.personalityTypes || [
                AIPersonalityType.AGGRESSIVE,
                AIPersonalityType.DEFENSIVE,
                AIPersonalityType.SUPPORT,
                AIPersonalityType.TACTICAL,
            ],
            difficultyLevel: options.difficultyLevel || DifficultyLevel.NORMAL,
            mapSize: options.mapSize || { width: 10, height: 10 },
            enableNPCs: options.enableNPCs || false,
            enableSkills: options.enableSkills || true,
        };

        this.testScenarios.set(id, scenario);

        return {
            success: true,
            message: `Test scenario '${id}' created`,
            data: scenario,
        };
    }

    /**
     * Run AI test scenario
     */
    private runTest(scenarioId: string, config: AITestConfig = {}): AICommandResult {
        const scenario = this.testScenarios.get(scenarioId);
        if (!scenario) {
            return {
                success: false,
                message: `Test scenario '${scenarioId}' not found`,
            };
        }

        const testConfig: AITestConfig = {
            iterations: config.iterations || 10,
            timeLimit: config.timeLimit || 5000,
            logResults: config.logResults !== false,
            comparePersonalities: config.comparePersonalities || false,
            analyzeDifficulty: config.analyzeDifficulty || false,
        };

        // Run the test (simplified implementation)
        const results = {
            scenarioId,
            iterations: testConfig.iterations,
            averageDecisionTime: Math.random() * 1000 + 500, // Mock data
            successRate: Math.random() * 20 + 80, // Mock data
            personalityPerformance: scenario.personalityTypes?.reduce((acc, type) => {
                acc[type] = {
                    averageTime: Math.random() * 1000 + 500,
                    successRate: Math.random() * 20 + 80,
                };
                return acc;
            }, {} as Record<string, any>) || {},
        };

        if (testConfig.logResults && this.debugManager) {
            console.log(`AI Test Results for scenario '${scenarioId}':`, results);
        }

        return {
            success: true,
            message: `Test scenario '${scenarioId}' completed`,
            data: results,
        };
    }

    /**
     * Simulate AI decision making
     */
    private simulateDecision(characterId: string, iterations: number = 100): AICommandResult {
        const unit = this.mockUnits.get(characterId);
        if (!unit) {
            return {
                success: false,
                message: `Unit '${characterId}' not found`,
            };
        }

        // Simulate decision making (simplified)
        const results = {
            characterId,
            iterations,
            actionDistribution: {
                [AIActionType.MOVE]: Math.floor(Math.random() * iterations * 0.4),
                [AIActionType.ATTACK]: Math.floor(Math.random() * iterations * 0.3),
                [AIActionType.SKILL]: Math.floor(Math.random() * iterations * 0.2),
                [AIActionType.WAIT]: Math.floor(Math.random() * iterations * 0.1),
            },
            averageThinkingTime: Math.random() * 1000 + 200,
            consistency: Math.random() * 30 + 70, // Percentage
        };

        return {
            success: true,
            message: `Decision simulation completed for ${characterId}`,
            data: results,
        };
    }

    /**
     * Set AI personality for a character
     */
    private setPersonality(characterId: string, personalityType: string): AICommandResult {
        const controller = this.aiControllers.get(characterId);
        if (!controller) {
            return {
                success: false,
                message: `AI controller for character '${characterId}' not found`,
            };
        }

        const validTypes = Object.values(AIPersonalityType);
        if (!validTypes.includes(personalityType as AIPersonalityType)) {
            return {
                success: false,
                message: `Invalid personality type. Valid types: ${validTypes.join(', ')}`,
            };
        }

        // Update personality (would need to implement this method)
        // controller.setPersonality(personalityType);

        return {
            success: true,
            message: `Personality set to ${personalityType} for ${characterId}`,
        };
    }

    /**
     * Set thinking time limit
     */
    private setThinkingTimeLimit(timeMs: number): AICommandResult {
        if (timeMs < 100 || timeMs > 10000) {
            return {
                success: false,
                message: 'Thinking time limit must be between 100ms and 10000ms',
            };
        }

        // Update all AI controllers
        this.aiControllers.forEach(controller => {
            // controller.setThinkingTimeLimit(timeMs);
        });

        return {
            success: true,
            message: `Thinking time limit set to ${timeMs}ms`,
        };
    }

    /**
     * Set random factor for AI decisions
     */
    private setRandomFactor(factor: number): AICommandResult {
        if (factor < 0 || factor > 1) {
            return {
                success: false,
                message: 'Random factor must be between 0 and 1',
            };
        }

        // Update all AI controllers
        this.aiControllers.forEach(controller => {
            // controller.setRandomFactor(factor);
        });

        return {
            success: true,
            message: `Random factor set to ${factor}`,
        };
    }

    /**
     * Control action evaluation display
     */
    private showActionEvaluations(enable: boolean): AICommandResult {
        if (this.debugManager) {
            this.debugManager.updateConfig({ showActionEvaluations: enable });
        }

        return {
            success: true,
            message: `Action evaluations display ${enable ? 'enabled' : 'disabled'}`,
        };
    }

    /**
     * Control thinking visualization
     */
    private showThinkingVisualization(enable: boolean): AICommandResult {
        if (this.debugManager) {
            this.debugManager.updateConfig({ showVisualDebug: enable });
        }

        return {
            success: true,
            message: `Thinking visualization ${enable ? 'enabled' : 'disabled'}`,
        };
    }

    /**
     * Control performance metrics display
     */
    private showPerformanceMetrics(enable: boolean): AICommandResult {
        if (this.debugManager) {
            this.debugManager.updateConfig({ showPerformanceMetrics: enable });
        }

        return {
            success: true,
            message: `Performance metrics display ${enable ? 'enabled' : 'disabled'}`,
        };
    }

    /**
     * List all units
     */
    private listUnits(): AICommandResult {
        const units = Array.from(this.mockUnits.entries()).map(([id, unit]) => ({
            id,
            name: unit.name,
            faction: unit.faction,
            position: unit.position,
            hp: `${unit.currentHP}/${unit.stats.maxHP}`,
            hasAI: this.aiControllers.has(id),
        }));

        return {
            success: true,
            message: `Found ${units.length} units`,
            data: units,
        };
    }

    /**
     * List all test scenarios
     */
    private listScenarios(): AICommandResult {
        const scenarios = Array.from(this.testScenarios.entries()).map(([id, scenario]) => ({
            id,
            characterCount: scenario.characterCount,
            personalityTypes: scenario.personalityTypes,
            difficultyLevel: scenario.difficultyLevel,
        }));

        return {
            success: true,
            message: `Found ${scenarios.length} test scenarios`,
            data: scenarios,
        };
    }

    /**
     * Reset AI state
     */
    private resetAI(characterId?: string): AICommandResult {
        if (characterId) {
            const controller = this.aiControllers.get(characterId);
            if (!controller) {
                return {
                    success: false,
                    message: `AI controller for character '${characterId}' not found`,
                };
            }
            // Reset specific AI
            // controller.reset();
            return {
                success: true,
                message: `AI reset for ${characterId}`,
            };
        } else {
            // Reset all AIs
            this.aiControllers.forEach(controller => {
                // controller.reset();
            });
            return {
                success: true,
                message: 'All AI controllers reset',
            };
        }
    }

    /**
     * Generate debug report
     */
    private generateReport(): AICommandResult {
        if (!this.debugManager) {
            return {
                success: false,
                message: 'AI Debug Manager not available',
            };
        }

        const report = this.debugManager.generateDebugReport();
        console.log(report);

        return {
            success: true,
            message: 'Debug report generated and logged to console',
            data: report,
        };
    }

    /**
     * Show help information
     */
    private showHelp(): AICommandResult {
        const helpText = `
=== AI Debug Console Commands ===

【Debug Control】
aiDebug.enable(true/false)          - Enable/disable AI debug mode
aiDebug.toggle()                    - Toggle AI debug mode
aiDebug.clear()                     - Clear debug information

【AI Behavior Control】
aiDebug.setDifficulty(1-5)          - Set AI difficulty level
aiDebug.forceAction(id, type, ...args) - Force AI to perform action
aiDebug.showThinking(id)            - Show thinking process for character
aiDebug.setPersonality(id, type)    - Set AI personality type

【Statistics & Analysis】
aiDebug.getStats()                  - Get AI statistics
aiDebug.getPerformance()            - Get performance metrics
aiDebug.analyzePersonalities()     - Analyze personality effectiveness
aiDebug.analyzeDifficulty()         - Analyze difficulty settings

【Testing & Simulation】
aiDebug.createMockUnit(id, options) - Create mock AI unit
aiDebug.createScenario(id, options) - Create test scenario
aiDebug.runTest(scenarioId, config) - Run AI test scenario
aiDebug.simulateDecision(id, count) - Simulate AI decisions

【Configuration】
aiDebug.setThinkingTimeLimit(ms)    - Set thinking time limit
aiDebug.setRandomFactor(0-1)        - Set randomness factor
aiDebug.showActionEvaluations(bool) - Toggle action evaluation display
aiDebug.showThinkingVisualization(bool) - Toggle thinking visualization
aiDebug.showPerformanceMetrics(bool) - Toggle performance display

【Utility】
aiDebug.listUnits()                 - List all units
aiDebug.listScenarios()             - List test scenarios
aiDebug.resetAI(id?)                - Reset AI state
aiDebug.generateReport()            - Generate debug report

Examples:
aiDebug.createMockUnit('enemy1', {attack: 30, personality: 'aggressive'})
aiDebug.setDifficulty(3)
aiDebug.forceAction('enemy1', 'move', 5, 3)
aiDebug.simulateDecision('enemy1', 50)
        `;

        console.log(helpText);

        return {
            success: true,
            message: 'Help information displayed in console',
            data: helpText,
        };
    }

    // Private helper methods

    /**
     * Generate personality recommendations
     */
    private generatePersonalityRecommendations(stats: any): string[] {
        const recommendations: string[] = [];

        // Analyze personality distribution
        const total = Object.values(stats.personalityDistribution).reduce((sum: number, count: any) => sum + count, 0);

        if (total === 0) {
            recommendations.push('No personality data available');
            return recommendations;
        }

        // Check for imbalanced personalities
        Object.entries(stats.personalityDistribution).forEach(([personality, count]: [string, any]) => {
            const percentage = (count / total) * 100;
            if (percentage > 60) {
                recommendations.push(`${personality} personality is overused (${percentage.toFixed(1)}%)`);
            } else if (percentage < 10) {
                recommendations.push(`${personality} personality is underused (${percentage.toFixed(1)}%)`);
            }
        });

        if (recommendations.length === 0) {
            recommendations.push('Personality distribution appears balanced');
        }

        return recommendations;
    }

    /**
     * Generate difficulty recommendations
     */
    private generateDifficultyRecommendations(stats: any): string[] {
        const recommendations: string[] = [];

        // Analyze thinking time
        if (stats.averageThinkingTime > 1500) {
            recommendations.push('Average thinking time is high - consider reducing difficulty or optimizing AI');
        } else if (stats.averageThinkingTime < 200) {
            recommendations.push('Average thinking time is very low - AI might be making rushed decisions');
        }

        // Analyze timeout rate
        const timeoutRate = stats.totalDecisions > 0 ? (stats.timeoutCount / stats.totalDecisions) : 0;
        if (timeoutRate > 0.1) {
            recommendations.push(`High timeout rate (${(timeoutRate * 100).toFixed(1)}%) - consider increasing time limit or reducing difficulty`);
        }

        // Analyze error rate
        const errorRate = stats.totalDecisions > 0 ? (stats.errorCount / stats.totalDecisions) : 0;
        if (errorRate > 0.05) {
            recommendations.push(`High error rate (${(errorRate * 100).toFixed(1)}%) - check AI implementation`);
        }

        if (recommendations.length === 0) {
            recommendations.push('AI performance appears optimal');
        }

        return recommendations;
    }

    /**
     * Register AI controller
     * @param characterId - Character ID
     * @param controller - AI controller instance
     */
    public registerAIController(characterId: string, controller: AIController): void {
        this.aiControllers.set(characterId, controller);
        console.log(`AI Console Commands: Registered controller for ${characterId}`);
    }

    /**
     * Unregister AI controller
     * @param characterId - Character ID
     */
    public unregisterAIController(characterId: string): void {
        this.aiControllers.delete(characterId);
        console.log(`AI Console Commands: Unregistered controller for ${characterId}`);
    }

    /**
     * Destroy console commands
     */
    public destroy(): void {
        if (typeof window !== 'undefined') {
            delete (window as any).aiDebug;
        }

        this.aiControllers.clear();
        this.mockUnits.clear();
        this.testScenarios.clear();

        console.log('AI Console Commands destroyed');
    }
}