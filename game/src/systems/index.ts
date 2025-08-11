/**
 * Systems Module Exports
 * 
 * This module exports all game systems for easy importing
 */

// AI System
export { AIController } from './AIController';
export { ActionEvaluator } from './ActionEvaluator';
export type { ActionEvaluation, EvaluationBreakdown, TerrainEvaluation, ThreatAssessment } from './ActionEvaluator';

// AI Personality System
export {
    BaseAIPersonality,
    AggressivePersonality,
    DefensivePersonality,
    SupportPersonality,
    TacticalPersonality,
    BalancedPersonality,
    AIPersonalityFactory,
    AIPersonalityManager
} from './ai/AIPersonality';

// Battle System
export { BattleSystem } from './BattleSystem';
export { AttackRangeCalculator } from './AttackRangeCalculator';
export { TargetSelector } from './TargetSelector';
export { DamageCalculator } from './DamageCalculator';
export { BattleAnimator } from './BattleAnimator';
export { BattleStateManager } from './BattleStateManager';
export { BattleErrorHandler } from './BattleErrorHandler';
export { BattlePerformanceManager } from './BattlePerformanceManager';
export { BattlePerformanceMonitor } from './BattlePerformanceMonitor';
export { BattleResourceManager } from './BattleResourceManager';
export { BattleEffectPool } from './BattleEffectPool';

// Movement System
export { MovementSystem } from './MovementSystem';
export { MovementCalculator } from './MovementCalculator';
export { MovementExecutor } from './MovementExecutor';
export { PathfindingService } from './PathfindingService';

// Character Management
export { CharacterManager } from './CharacterManager';
export { PartyManager } from './PartyManager';

// Character Loss System
export { CharacterLossManager } from './CharacterLossManager';
export { CharacterLossState } from './CharacterLossState';
export { CharacterLossEffects } from './CharacterLossEffects';
export { CharacterDangerWarningSystem } from './CharacterDangerWarningSystem';
export { CharacterLossErrorHandler } from './CharacterLossErrorHandler';
export { CharacterLossPerformanceManager } from './CharacterLossPerformanceManager';

// Equipment System
export { EquipmentManager } from './EquipmentManager';

// Game State Management
export { GameStateManager } from './GameStateManager';

// Camera System
export { CameraController } from './CameraController';

// Recruitment System
export { RecruitmentDataManager } from './RecruitmentDataManager';

// Skill System (if available)
// Note: Add skill system exports when implemented

// Utility Systems
// Note: Add utility system exports as needed