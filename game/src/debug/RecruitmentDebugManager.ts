/**
 * Debug manager for the recruitment system
 * Provides development tools for testing and debugging recruitment mechanics
 */

import { Unit } from '../types/gameplay';
import {
    RecruitmentCondition,
    RecruitmentContext,
    RecruitmentResult,
    RecruitmentStatus,
    RecruitmentError,
    NPCState,
    RecruitmentStatistics,
    RecruitableCharacter
} from '../types/recruitment';
import { GameConfig } from '../config/GameConfig';

/**
 * Debug information for recruitment condition evaluation
 */
interface RecruitmentDebugInfo {
    conditionId: string;
    conditionType: string;
    description: string;
    parameters: Record<string, any>;
    result: boolean;
    evaluationTime: number;
    errorMessage?: string;
}

/**
 * Debug session data for recruitment testing
 */
interface RecruitmentDebugSession {
    sessionId: string;
    startTime: number;
    endTime?: number;
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    averageEvaluationTime: number;
    conditionResults: RecruitmentDebugInfo[];
    errors: string[];
}

/**
 * Recruitment system debug manager
 */
export class RecruitmentDebugManager {
    private static instance: RecruitmentDebugManager;
    private debugEnabled: boolean = false;
    private detailedLogging: boolean = false;
    private currentSession: RecruitmentDebugSession | null = null;
    private debugSessions: RecruitmentDebugSession[] = [];
    private conditionEvaluationHistory: RecruitmentDebugInfo[] = [];
    private statistics: RecruitmentStatistics;

    private constructor() {
        this.statistics = {
            totalAttempts: 0,
            successfulRecruitments: 0,
            failedRecruitments: 0,
            npcsSaved: 0,
            npcsLost: 0,
            averageConditionsMet: 0,
            recruitmentsByStage: {}
        };

        // Initialize debug settings from config
        this.updateFromConfig();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): RecruitmentDebugManager {
        if (!RecruitmentDebugManager.instance) {
            RecruitmentDebugManager.instance = new RecruitmentDebugManager();
        }
        return RecruitmentDebugManager.instance;
    }

    /**
     * Update debug settings from game configuration
     */
    public updateFromConfig(): void {
        const gameConfig = new GameConfig();
        const recruitmentConfig = gameConfig.getRecruitmentSystemConfig();

        this.debugEnabled = recruitmentConfig.enableRecruitmentDebug;
        this.detailedLogging = recruitmentConfig.enableDetailedLogging;

        if (this.debugEnabled) {
            console.log('RecruitmentDebugManager: Debug mode enabled');
            this.logDebugSettings(recruitmentConfig);
        }
    }

    /**
     * Enable debug mode
     */
    public enableDebug(): void {
        this.debugEnabled = true;
        console.log('RecruitmentDebugManager: Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    public disableDebug(): void {
        this.debugEnabled = false;
        console.log('RecruitmentDebugManager: Debug mode disabled');
    }

    /**
     * Enable detailed logging
     */
    public enableDetailedLogging(): void {
        this.detailedLogging = true;
        console.log('RecruitmentDebugManager: Detailed logging enabled');
    }

    /**
     * Disable detailed logging
     */
    public disableDetailedLogging(): void {
        this.detailedLogging = false;
        console.log('RecruitmentDebugManager: Detailed logging disabled');
    }

    /**
     * Start a new debug session
     */
    public startDebugSession(sessionName?: string): string {
        const sessionId = sessionName || `debug_session_${Date.now()}`;

        this.currentSession = {
            sessionId,
            startTime: Date.now(),
            totalAttempts: 0,
            successfulAttempts: 0,
            failedAttempts: 0,
            averageEvaluationTime: 0,
            conditionResults: [],
            errors: []
        };

        if (this.debugEnabled) {
            console.log(`RecruitmentDebugManager: Started debug session: ${sessionId}`);
        }

        return sessionId;
    }

    /**
     * End the current debug session
     */
    public endDebugSession(): RecruitmentDebugSession | null {
        if (!this.currentSession) {
            console.warn('RecruitmentDebugManager: No active debug session to end');
            return null;
        }

        this.currentSession.endTime = Date.now();

        // Calculate average evaluation time
        if (this.currentSession.conditionResults.length > 0) {
            const totalTime = this.currentSession.conditionResults.reduce(
                (sum, result) => sum + result.evaluationTime, 0
            );
            this.currentSession.averageEvaluationTime = totalTime / this.currentSession.conditionResults.length;
        }

        this.debugSessions.push(this.currentSession);

        if (this.debugEnabled) {
            console.log(`RecruitmentDebugManager: Ended debug session: ${this.currentSession.sessionId}`);
            this.logSessionSummary(this.currentSession);
        }

        const completedSession = this.currentSession;
        this.currentSession = null;
        return completedSession;
    }

    /**
     * Log recruitment condition evaluation
     */
    public logConditionEvaluation(
        condition: RecruitmentCondition,
        context: RecruitmentContext,
        result: boolean,
        evaluationTime: number,
        errorMessage?: string
    ): void {
        const debugInfo: RecruitmentDebugInfo = {
            conditionId: condition.id,
            conditionType: condition.type,
            description: condition.description,
            parameters: { ...condition.parameters },
            result,
            evaluationTime,
            errorMessage
        };

        this.conditionEvaluationHistory.push(debugInfo);

        if (this.currentSession) {
            this.currentSession.conditionResults.push(debugInfo);
            if (errorMessage) {
                this.currentSession.errors.push(errorMessage);
            }
        }

        if (this.debugEnabled && this.detailedLogging) {
            console.log('RecruitmentDebugManager: Condition evaluation:', {
                condition: condition.id,
                type: condition.type,
                result,
                evaluationTime: `${evaluationTime}ms`,
                attacker: context.attacker.name,
                target: context.target.name,
                damage: context.damage,
                turn: context.turn,
                error: errorMessage
            });
        }
    }

    /**
     * Log recruitment attempt
     */
    public logRecruitmentAttempt(
        context: RecruitmentContext,
        result: RecruitmentResult,
        stageId?: string
    ): void {
        this.statistics.totalAttempts++;

        if (result.success) {
            this.statistics.successfulRecruitments++;
            if (this.currentSession) {
                this.currentSession.successfulAttempts++;
            }
        } else {
            this.statistics.failedRecruitments++;
            if (this.currentSession) {
                this.currentSession.failedAttempts++;
            }
        }

        if (stageId) {
            this.statistics.recruitmentsByStage[stageId] =
                (this.statistics.recruitmentsByStage[stageId] || 0) + 1;
        }

        // Update average conditions met
        const conditionsMetCount = result.conditionsMet.filter(met => met).length;
        const conditionsMetPercentage = result.conditionsMet.length > 0
            ? (conditionsMetCount / result.conditionsMet.length) * 100
            : 0;

        this.statistics.averageConditionsMet =
            (this.statistics.averageConditionsMet * (this.statistics.totalAttempts - 1) + conditionsMetPercentage)
            / this.statistics.totalAttempts;

        if (this.currentSession) {
            this.currentSession.totalAttempts++;
        }

        if (this.debugEnabled) {
            console.log('RecruitmentDebugManager: Recruitment attempt:', {
                attacker: context.attacker.name,
                target: context.target.name,
                success: result.success,
                conditionsMet: `${conditionsMetCount}/${result.conditionsMet.length}`,
                nextAction: result.nextAction,
                message: result.message,
                error: result.error,
                stageId
            });
        }
    }

    /**
     * Log NPC state change
     */
    public logNPCStateChange(
        unit: Unit,
        oldState: NPCState | null,
        newState: NPCState | null,
        reason: string
    ): void {
        if (newState && !oldState) {
            // NPC created
            if (this.debugEnabled) {
                console.log('RecruitmentDebugManager: NPC created:', {
                    unit: unit.name,
                    convertedAt: newState.convertedAt,
                    remainingHP: newState.remainingHP,
                    reason
                });
            }
        } else if (!newState && oldState) {
            // NPC removed/defeated
            this.statistics.npcsLost++;
            if (this.debugEnabled) {
                console.log('RecruitmentDebugManager: NPC lost:', {
                    unit: unit.name,
                    survivedTurns: Date.now() - oldState.convertedAt,
                    reason
                });
            }
        } else if (newState && oldState) {
            // NPC state updated
            if (this.debugEnabled && this.detailedLogging) {
                console.log('RecruitmentDebugManager: NPC state updated:', {
                    unit: unit.name,
                    oldHP: oldState.remainingHP,
                    newHP: newState.remainingHP,
                    reason
                });
            }
        }
    }

    /**
     * Log NPC survival (stage clear with NPC alive)
     */
    public logNPCSurvival(unit: Unit, npcState: NPCState): void {
        this.statistics.npcsSaved++;

        if (this.debugEnabled) {
            console.log('RecruitmentDebugManager: NPC survived stage:', {
                unit: unit.name,
                survivedTurns: Date.now() - npcState.convertedAt,
                finalHP: npcState.remainingHP
            });
        }
    }

    /**
     * Simulate recruitment scenario for testing
     */
    public simulateRecruitment(
        attacker: Unit,
        target: Unit,
        conditions: RecruitmentCondition[],
        damage: number = 50,
        turn: number = 1
    ): RecruitmentResult {
        const context: RecruitmentContext = {
            attacker,
            target,
            damage,
            turn,
            alliedUnits: [attacker],
            enemyUnits: [target],
            npcUnits: []
        };

        const conditionResults: boolean[] = [];
        const startTime = Date.now();

        for (const condition of conditions) {
            const conditionStartTime = Date.now();
            try {
                const result = condition.checkCondition(context);
                const evaluationTime = Date.now() - conditionStartTime;

                conditionResults.push(result);
                this.logConditionEvaluation(condition, context, result, evaluationTime);
            } catch (error) {
                const evaluationTime = Date.now() - conditionStartTime;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                conditionResults.push(false);
                this.logConditionEvaluation(condition, context, false, evaluationTime, errorMessage);
            }
        }

        const allConditionsMet = conditionResults.every(result => result);
        const simulationResult: RecruitmentResult = {
            success: allConditionsMet,
            conditionsMet: conditionResults,
            nextAction: allConditionsMet ? 'convert_to_npc' : 'continue_battle',
            message: allConditionsMet
                ? `${target.name} can be recruited!`
                : `${target.name} recruitment conditions not met`
        };

        this.logRecruitmentAttempt(context, simulationResult, 'simulation');

        if (this.debugEnabled) {
            console.log('RecruitmentDebugManager: Simulation completed:', {
                duration: `${Date.now() - startTime}ms`,
                result: simulationResult
            });
        }

        return simulationResult;
    }

    /**
     * Get current recruitment statistics
     */
    public getStatistics(): RecruitmentStatistics {
        return { ...this.statistics };
    }

    /**
     * Get debug session history
     */
    public getDebugSessions(): RecruitmentDebugSession[] {
        return [...this.debugSessions];
    }

    /**
     * Get condition evaluation history
     */
    public getConditionEvaluationHistory(): RecruitmentDebugInfo[] {
        return [...this.conditionEvaluationHistory];
    }

    /**
     * Clear all debug data
     */
    public clearDebugData(): void {
        this.debugSessions = [];
        this.conditionEvaluationHistory = [];
        this.currentSession = null;
        this.statistics = {
            totalAttempts: 0,
            successfulRecruitments: 0,
            failedRecruitments: 0,
            npcsSaved: 0,
            npcsLost: 0,
            averageConditionsMet: 0,
            recruitmentsByStage: {}
        };

        if (this.debugEnabled) {
            console.log('RecruitmentDebugManager: Debug data cleared');
        }
    }

    /**
     * Export debug data as JSON
     */
    public exportDebugData(): string {
        const debugData = {
            statistics: this.statistics,
            sessions: this.debugSessions,
            conditionHistory: this.conditionEvaluationHistory,
            exportTime: Date.now()
        };

        return JSON.stringify(debugData, null, 2);
    }

    /**
     * Generate debug report
     */
    public generateDebugReport(): string {
        const report = [
            '=== Recruitment System Debug Report ===',
            `Generated: ${new Date().toISOString()}`,
            '',
            '--- Statistics ---',
            `Total Attempts: ${this.statistics.totalAttempts}`,
            `Successful Recruitments: ${this.statistics.successfulRecruitments}`,
            `Failed Recruitments: ${this.statistics.failedRecruitments}`,
            `Success Rate: ${this.statistics.totalAttempts > 0
                ? ((this.statistics.successfulRecruitments / this.statistics.totalAttempts) * 100).toFixed(2)
                : 0}%`,
            `NPCs Saved: ${this.statistics.npcsSaved}`,
            `NPCs Lost: ${this.statistics.npcsLost}`,
            `Average Conditions Met: ${this.statistics.averageConditionsMet.toFixed(2)}%`,
            '',
            '--- Recruitments by Stage ---'
        ];

        for (const [stageId, count] of Object.entries(this.statistics.recruitmentsByStage)) {
            report.push(`${stageId}: ${count}`);
        }

        report.push('');
        report.push('--- Debug Sessions ---');
        report.push(`Total Sessions: ${this.debugSessions.length}`);

        for (const session of this.debugSessions) {
            const duration = session.endTime ? session.endTime - session.startTime : 0;
            report.push(`Session: ${session.sessionId}`);
            report.push(`  Duration: ${duration}ms`);
            report.push(`  Attempts: ${session.totalAttempts}`);
            report.push(`  Success Rate: ${session.totalAttempts > 0
                ? ((session.successfulAttempts / session.totalAttempts) * 100).toFixed(2)
                : 0}%`);
            report.push(`  Avg Evaluation Time: ${session.averageEvaluationTime.toFixed(2)}ms`);
            report.push(`  Errors: ${session.errors.length}`);
        }

        return report.join('\n');
    }

    /**
     * Log debug settings from configuration
     */
    private logDebugSettings(config: any): void {
        console.log('RecruitmentDebugManager: Configuration loaded:', {
            debugEnabled: config.enableRecruitmentDebug,
            detailedLogging: config.enableDetailedLogging,
            conditionCheckDebug: config.showConditionCheckDebug,
            npcStateDebug: config.showNPCStateDebug,
            statisticsEnabled: config.showRecruitmentStatistics,
            consoleCommands: config.consoleCommands.enableCommands
        });
    }

    /**
     * Log session summary
     */
    private logSessionSummary(session: RecruitmentDebugSession): void {
        const duration = session.endTime ? session.endTime - session.startTime : 0;
        const successRate = session.totalAttempts > 0
            ? ((session.successfulAttempts / session.totalAttempts) * 100).toFixed(2)
            : '0';

        console.log(`RecruitmentDebugManager: Session Summary for ${session.sessionId}:`, {
            duration: `${duration}ms`,
            totalAttempts: session.totalAttempts,
            successfulAttempts: session.successfulAttempts,
            failedAttempts: session.failedAttempts,
            successRate: `${successRate}%`,
            averageEvaluationTime: `${session.averageEvaluationTime.toFixed(2)}ms`,
            conditionResults: session.conditionResults.length,
            errors: session.errors.length
        });
    }
}