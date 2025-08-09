/**
 * スキルシステムのエクスポート
 */

export {
    Skill,
    AttackSkill,
    HealSkill,
    BuffSkill,
    DebuffSkill,
    StatusSkill
} from './Skill';

export {
    SkillManager,
    SkillManagerError,
    type SkillManagerResult,
    type SkillLearnResult
} from './SkillManager';

export {
    SkillConditionChecker,
    type SkillConditionCheckerConfig,
    type SkillConditionDetails
} from './SkillConditionChecker';

export {
    SkillExecutor,
    SkillExecutionError,
    type SkillExecutionConfig,
    type SkillExecutionState
} from './SkillExecutor';

export {
    SkillAnimator,
    AnimationType,
    type EffectConfig,
    type ContinuousEffectDisplay,
    type SkillAnimatorConfig
} from './SkillAnimator';

// エラーハンドリングシステム
export {
    SkillErrorHandler,
    SkillError,
    ErrorSeverity,
    SkillErrorContext,
    SkillErrorDetails,
    UserFeedbackConfig
} from './SkillErrorHandler';

export {
    SkillUserFeedback,
    NotificationType,
    NotificationConfig,
    NotificationData,
    GuidanceInfo
} from './SkillUserFeedback';

export {
    SkillErrorIntegration,
    ErrorIntegrationConfig
} from './SkillErrorIntegration';

// パフォーマンス最適化システム
export {
    SkillPerformanceManager,
    SkillDataCache,
    SkillObjectPool,
    OptimizedConditionChecker,
    PerformanceMonitor,
    type PerformanceConfig,
    type MemoryUsageInfo,
    type PerformanceMetrics
} from './SkillPerformanceManager';

export {
    SkillAnimationOptimizer,
    AnimationPool,
    EffectPool,
    AnimationBatcher,
    FrameRateOptimizer,
    type AnimationOptimizationConfig,
    type AnimationStatistics
} from './SkillAnimationOptimizer';

// 将来的に追加される他のスキル関連クラス用のプレースホルダー
// export { SkillUI } from './SkillUI';
// export { SkillSystem } from './SkillSystem';