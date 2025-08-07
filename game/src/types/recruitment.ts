/**
 * Recruitment system type definitions for the SRPG
 * Contains all interfaces, enums, and types related to the character recruitment mechanics
 */

import { Unit, Position } from './gameplay';
import { BattleResult } from './battle';

/**
 * Status of a recruitment attempt or recruitable character
 */
export enum RecruitmentStatus {
  AVAILABLE = 'available', // Character can be recruited
  CONDITIONS_MET = 'conditions_met', // All conditions satisfied
  NPC_STATE = 'npc_state', // Character converted to NPC
  RECRUITED = 'recruited', // Successfully recruited
  FAILED = 'failed', // Recruitment failed
}

/**
 * Actions that can be taken during recruitment process
 */
export enum RecruitmentAction {
  CONTINUE_BATTLE = 'continue_battle', // Continue normal battle
  CONVERT_TO_NPC = 'convert_to_npc', // Convert character to NPC state
  RECRUITMENT_SUCCESS = 'recruitment_success', // Complete recruitment
  RECRUITMENT_FAILED = 'recruitment_failed', // Mark recruitment as failed
}

/**
 * Types of recruitment errors that can occur
 */
export enum RecruitmentError {
  INVALID_TARGET = 'invalid_target', // Target cannot be recruited
  CONDITIONS_NOT_MET = 'conditions_not_met', // Recruitment conditions not satisfied
  NPC_ALREADY_DEFEATED = 'npc_already_defeated', // NPC was defeated before stage clear
  SYSTEM_ERROR = 'system_error', // General system error
  INVALID_ATTACKER = 'invalid_attacker', // Invalid attacker for condition
  INVALID_STAGE = 'invalid_stage', // Stage doesn't support recruitment
  DATA_CORRUPTION = 'data_corruption', // Recruitment data is corrupted
}

/**
 * Types of recruitment conditions
 */
export enum RecruitmentConditionType {
  SPECIFIC_ATTACKER = 'specific_attacker', // Must be attacked by specific character
  HP_THRESHOLD = 'hp_threshold', // Target HP must be below threshold
  DAMAGE_TYPE = 'damage_type', // Must use specific damage type
  TURN_LIMIT = 'turn_limit', // Must be recruited within turn limit
  ALLY_PRESENT = 'ally_present', // Specific ally must be present
  WEAPON_TYPE = 'weapon_type', // Must use specific weapon type
  NO_CRITICAL = 'no_critical', // Must not deal critical damage
  ELEMENT_MATCH = 'element_match', // Must use matching element
}

/**
 * Base interface for recruitment conditions
 */
export interface RecruitmentCondition {
  id: string;
  type: RecruitmentConditionType;
  description: string;
  parameters: Record<string, any>;

  /**
   * Check if this condition is satisfied
   * @param context The recruitment context to evaluate
   * @returns true if condition is met
   */
  checkCondition(context: RecruitmentContext): boolean;
}

/**
 * Context information for recruitment condition evaluation
 */
export interface RecruitmentContext {
  attacker: Unit;
  target: Unit;
  damage: number;
  turn: number;
  battleResult?: BattleResult;
  stageData?: any; // Reference to current stage data
  alliedUnits: Unit[];
  enemyUnits: Unit[];
  npcUnits: Unit[];
}

/**
 * State information for an NPC character
 */
export interface NPCState {
  convertedAt: number; // Turn number when converted to NPC
  remainingHP: number; // HP when converted
  isProtected: boolean; // Whether NPC is being protected
  visualState: NPCVisualState; // Visual representation state
  originalFaction: 'player' | 'enemy'; // Original faction before conversion
  recruitmentId: string; // ID linking to recruitment data
}

/**
 * Visual state configuration for NPC characters
 */
export interface NPCVisualState {
  indicatorVisible: boolean; // Whether NPC indicator is shown
  indicatorType: 'crown' | 'star' | 'heart' | 'custom'; // Type of indicator
  tintColor: number; // Color tint for the character sprite
  glowEffect: boolean; // Whether to show glow effect
  animationSpeed: number; // Speed of idle animation
}

/**
 * Result of a recruitment attempt
 */
export interface RecruitmentResult {
  success: boolean; // Whether recruitment was successful
  conditionsMet: boolean[]; // Which conditions were satisfied
  nextAction: RecruitmentAction; // What action should be taken next
  message?: string; // User-friendly message
  npcState?: NPCState; // NPC state if converted
  error?: RecruitmentError; // Error if recruitment failed
}

/**
 * Progress tracking for recruitment conditions
 */
export interface RecruitmentProgress {
  characterId: string; // ID of the recruitable character
  conditions: RecruitmentCondition[]; // All conditions for this character
  conditionProgress: boolean[]; // Progress for each condition
  overallProgress: number; // Overall progress percentage (0-100)
  isEligible: boolean; // Whether character is currently eligible
  attemptsRemaining?: number; // Number of attempts remaining (if limited)
}

/**
 * Animation configuration for recruitment system
 */
export interface RecruitmentAnimationConfig {
  conditionDisplayDuration: number; // Duration to show condition info (ms)
  npcConversionDuration: number; // Duration of NPC conversion animation (ms)
  recruitmentSuccessDuration: number; // Duration of recruitment success animation (ms)
  recruitmentFailureDuration: number; // Duration of recruitment failure animation (ms)
  progressUpdateDuration: number; // Duration of progress update animation (ms)
  enableParticleEffects: boolean; // Whether to show particle effects
  enableScreenEffects: boolean; // Whether to show screen effects (flash, shake)
  animationSpeed: number; // Speed multiplier for all animations
}

/**
 * Configuration for recruitment UI display
 */
export interface RecruitmentUIConfig {
  showConditions: boolean; // Whether to show conditions to player
  showProgress: boolean; // Whether to show progress indicators
  conditionDisplayDuration: number; // How long to show condition info (ms)
  successAnimationDuration: number; // Duration of success animation (ms)
  failureAnimationDuration: number; // Duration of failure animation (ms)
  npcIndicatorScale: number; // Scale of NPC indicator
  enableSoundEffects: boolean; // Whether to play sound effects
}

/**
 * Data structure for recruitable character definition
 */
export interface RecruitableCharacter {
  characterId: string; // ID of the character that can be recruited
  conditions: RecruitmentCondition[]; // Conditions required for recruitment
  npcState?: NPCState; // Current NPC state (if converted)
  recruitmentStatus: RecruitmentStatus; // Current recruitment status
  priority: number; // Priority for AI targeting (higher = more priority)
  description?: string; // Description of recruitment requirements
  rewards?: RecruitmentReward[]; // Rewards for successful recruitment
}

/**
 * Rewards given for successful recruitment
 */
export interface RecruitmentReward {
  type: 'experience' | 'item' | 'gold' | 'skill_point';
  amount: number;
  target?: 'recruiter' | 'party' | 'recruited'; // Who receives the reward
  description: string;
}

/**
 * Statistics tracking for recruitment system
 */
export interface RecruitmentStatistics {
  totalAttempts: number; // Total recruitment attempts
  successfulRecruitments: number; // Number of successful recruitments
  failedRecruitments: number; // Number of failed recruitments
  npcsSaved: number; // Number of NPCs successfully protected
  npcsLost: number; // Number of NPCs that were defeated
  averageConditionsMet: number; // Average percentage of conditions met
  mostRecruitedCharacter?: string; // ID of most frequently recruited character
  recruitmentsByStage: Record<string, number>; // Recruitments per stage
}

/**
 * Error details for recruitment system errors
 */
export interface RecruitmentErrorDetails {
  error: RecruitmentError;
  message: string;
  context: RecruitmentContext;
  timestamp: number;
  recoverable: boolean; // Whether the error can be recovered from
  suggestedAction?: string; // Suggested action for recovery
  additionalInfo?: Record<string, any>; // Additional error information
}

/**
 * Configuration for recruitment system behavior
 */
export interface RecruitmentSystemConfig {
  enableRecruitment: boolean; // Whether recruitment is enabled
  maxNPCsPerStage: number; // Maximum NPCs allowed per stage
  npcProtectionPriority: number; // AI priority for attacking NPCs (0-100)
  autoShowConditions: boolean; // Whether to automatically show conditions
  conditionHintLevel: 'none' | 'basic' | 'detailed'; // Level of hints to show
  allowMultipleAttempts: boolean; // Whether multiple recruitment attempts are allowed
  npcSurvivalBonus: number; // Bonus experience for keeping NPCs alive
}

/**
 * Type guards and validation functions for recruitment system
 */
export class RecruitmentTypeValidators {
  /**
   * Validates recruitment condition structure
   */
  static isValidRecruitmentCondition(condition: any): condition is RecruitmentCondition {
    return (
      typeof condition === 'object' &&
      condition !== null &&
      typeof condition.id === 'string' &&
      Object.values(RecruitmentConditionType).includes(condition.type) &&
      typeof condition.description === 'string' &&
      typeof condition.parameters === 'object' &&
      condition.parameters !== null &&
      typeof condition.checkCondition === 'function'
    );
  }

  /**
   * Validates NPC state structure
   */
  static isValidNPCState(npcState: any): npcState is NPCState {
    return (
      typeof npcState === 'object' &&
      npcState !== null &&
      typeof npcState.convertedAt === 'number' &&
      typeof npcState.remainingHP === 'number' &&
      typeof npcState.isProtected === 'boolean' &&
      typeof npcState.visualState === 'object' &&
      (npcState.originalFaction === 'player' || npcState.originalFaction === 'enemy') &&
      typeof npcState.recruitmentId === 'string' &&
      npcState.convertedAt >= 0 &&
      npcState.remainingHP >= 0 &&
      this.isValidNPCVisualState(npcState.visualState)
    );
  }

  /**
   * Validates NPC visual state structure
   */
  static isValidNPCVisualState(visualState: any): visualState is NPCVisualState {
    const validIndicatorTypes = ['crown', 'star', 'heart', 'custom'];
    return (
      typeof visualState === 'object' &&
      visualState !== null &&
      typeof visualState.indicatorVisible === 'boolean' &&
      validIndicatorTypes.includes(visualState.indicatorType) &&
      typeof visualState.tintColor === 'number' &&
      typeof visualState.glowEffect === 'boolean' &&
      typeof visualState.animationSpeed === 'number' &&
      visualState.animationSpeed > 0
    );
  }

  /**
   * Validates recruitment result structure
   */
  static isValidRecruitmentResult(result: any): result is RecruitmentResult {
    return (
      typeof result === 'object' &&
      result !== null &&
      typeof result.success === 'boolean' &&
      Array.isArray(result.conditionsMet) &&
      Object.values(RecruitmentAction).includes(result.nextAction) &&
      result.conditionsMet.every((met: any) => typeof met === 'boolean') &&
      (result.message === undefined || typeof result.message === 'string') &&
      (result.npcState === undefined || this.isValidNPCState(result.npcState)) &&
      (result.error === undefined || Object.values(RecruitmentError).includes(result.error))
    );
  }

  /**
   * Validates recruitment context structure
   */
  static isValidRecruitmentContext(context: any): context is RecruitmentContext {
    return (
      typeof context === 'object' &&
      context !== null &&
      typeof context.attacker === 'object' &&
      typeof context.target === 'object' &&
      typeof context.damage === 'number' &&
      typeof context.turn === 'number' &&
      Array.isArray(context.alliedUnits) &&
      Array.isArray(context.enemyUnits) &&
      Array.isArray(context.npcUnits) &&
      context.damage >= 0 &&
      context.turn >= 1
    );
  }

  /**
   * Validates recruitable character structure
   */
  static isValidRecruitableCharacter(character: any): character is RecruitableCharacter {
    return (
      typeof character === 'object' &&
      character !== null &&
      typeof character.characterId === 'string' &&
      Array.isArray(character.conditions) &&
      Object.values(RecruitmentStatus).includes(character.recruitmentStatus) &&
      typeof character.priority === 'number' &&
      character.conditions.every((condition: any) => this.isValidRecruitmentCondition(condition)) &&
      (character.npcState === undefined || this.isValidNPCState(character.npcState)) &&
      (character.description === undefined || typeof character.description === 'string') &&
      (character.rewards === undefined ||
        (Array.isArray(character.rewards) &&
          character.rewards.every((reward: any) => this.isValidRecruitmentReward(reward))))
    );
  }

  /**
   * Validates recruitment reward structure
   */
  static isValidRecruitmentReward(reward: any): reward is RecruitmentReward {
    const validTypes = ['experience', 'item', 'gold', 'skill_point'];
    const validTargets = ['recruiter', 'party', 'recruited'];
    return (
      typeof reward === 'object' &&
      reward !== null &&
      validTypes.includes(reward.type) &&
      typeof reward.amount === 'number' &&
      typeof reward.description === 'string' &&
      reward.amount >= 0 &&
      (reward.target === undefined || validTargets.includes(reward.target))
    );
  }

  /**
   * Validates recruitment progress structure
   */
  static isValidRecruitmentProgress(progress: any): progress is RecruitmentProgress {
    return (
      typeof progress === 'object' &&
      progress !== null &&
      typeof progress.characterId === 'string' &&
      Array.isArray(progress.conditions) &&
      Array.isArray(progress.conditionProgress) &&
      typeof progress.overallProgress === 'number' &&
      typeof progress.isEligible === 'boolean' &&
      progress.conditions.length === progress.conditionProgress.length &&
      progress.overallProgress >= 0 &&
      progress.overallProgress <= 100 &&
      progress.conditionProgress.every((met: any) => typeof met === 'boolean') &&
      (progress.attemptsRemaining === undefined ||
        (typeof progress.attemptsRemaining === 'number' && progress.attemptsRemaining >= 0))
    );
  }
}

/**
 * Utility functions for recruitment system
 */
export class RecruitmentUtils {
  /**
   * Calculate overall recruitment progress percentage
   */
  static calculateProgress(conditionsMet: boolean[]): number {
    if (conditionsMet.length === 0) return 0;
    const metCount = conditionsMet.filter(met => met).length;
    return Math.round((metCount / conditionsMet.length) * 100);
  }

  /**
   * Check if all recruitment conditions are satisfied
   */
  static areAllConditionsMet(conditionsMet: boolean[]): boolean {
    return conditionsMet.length > 0 && conditionsMet.every(met => met);
  }

  /**
   * Generate a unique recruitment ID
   */
  static generateRecruitmentId(characterId: string, stageId: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `recruitment_${characterId}_${stageId}_${timestamp}_${random}`;
  }

  /**
   * Create default NPC visual state
   */
  static createDefaultNPCVisualState(): NPCVisualState {
    return {
      indicatorVisible: true,
      indicatorType: 'crown',
      tintColor: 0x00ff00, // Green tint
      glowEffect: true,
      animationSpeed: 0.8,
    };
  }

  /**
   * Create default recruitment UI config
   */
  static createDefaultUIConfig(): RecruitmentUIConfig {
    return {
      showConditions: true,
      showProgress: true,
      conditionDisplayDuration: 3000,
      successAnimationDuration: 2000,
      failureAnimationDuration: 1500,
      npcIndicatorScale: 1.2,
      enableSoundEffects: true,
    };
  }

  /**
   * Create default recruitment system config
   */
  static createDefaultSystemConfig(): RecruitmentSystemConfig {
    return {
      enableRecruitment: true,
      maxNPCsPerStage: 3,
      npcProtectionPriority: 90,
      autoShowConditions: true,
      conditionHintLevel: 'basic',
      allowMultipleAttempts: false,
      npcSurvivalBonus: 50,
    };
  }

  /**
   * Deep clone a recruitment result
   */
  static cloneRecruitmentResult(result: RecruitmentResult): RecruitmentResult {
    return {
      ...result,
      conditionsMet: [...result.conditionsMet],
      npcState: result.npcState ? { ...result.npcState } : undefined,
    };
  }

  /**
   * Create error details for recruitment errors
   */
  static createErrorDetails(
    error: RecruitmentError,
    message: string,
    context: RecruitmentContext,
    recoverable: boolean = true,
    suggestedAction?: string
  ): RecruitmentErrorDetails {
    return {
      error,
      message,
      context,
      timestamp: Date.now(),
      recoverable,
      suggestedAction,
    };
  }

  /**
   * Format recruitment condition description for display
   */
  static formatConditionDescription(condition: RecruitmentCondition): string {
    // This would be implemented based on specific condition types
    // For now, return the basic description
    return condition.description;
  }

  /**
   * Calculate NPC attack priority for AI
   */
  static calculateNPCPriority(npcState: NPCState, basePriority: number = 100): number {
    let priority = basePriority;

    // Higher priority if NPC has been converted recently
    const turnsSinceConversion = Date.now() - npcState.convertedAt;
    if (turnsSinceConversion < 3) {
      priority += 50;
    }

    // Higher priority if NPC has low HP
    if (npcState.remainingHP < 30) {
      priority += 30;
    }

    return Math.min(priority, 200); // Cap at 200
  }
}
