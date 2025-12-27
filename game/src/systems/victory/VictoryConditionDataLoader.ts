/**
 * 勝利条件システムのデータローダー
 * ステージデータとボスデータの読み込みと検証を担当
 */

import { BossData, RoseEssenceType, BossType, BossDifficulty, AIPersonality } from '../../types/boss';
import {
  Objective,
  ObjectiveType,
  VictoryCondition,
  DefeatCondition,
  VictoryConditionType,
  DefeatConditionType,
  ObjectiveProgress,
} from '../../types/victory';

/**
 * ステージデータ（JSONから読み込まれる形式）
 */
export interface StageDataJSON {
  id: string;
  name: string;
  description: string;
  victoryConditions: VictoryConditionJSON[];
  defeatConditions: DefeatConditionJSON[];
  objectives?: ObjectiveJSON[];
}

/**
 * 勝利条件JSON形式
 */
export interface VictoryConditionJSON {
  id?: string;
  type: string;
  description: string;
  isRequired?: boolean;
  parameters?: Record<string, any>;
}

/**
 * 敗北条件JSON形式
 */
export interface DefeatConditionJSON {
  id?: string;
  type: string;
  description: string;
  parameters?: Record<string, any>;
}

/**
 * 目標JSON形式
 */
export interface ObjectiveJSON {
  id: string;
  type: string;
  description: string;
  isRequired?: boolean;
  targetData?: Record<string, any>;
}

/**
 * ボスデータJSON形式
 */
export interface BossDataJSON {
  id: string;
  name: string;
  title: string;
  description: string;
  roseEssenceAmount: number;
  roseEssenceType: string;
  isBoss: boolean;
  bossType: string;
  difficulty: string;
  phases: any[];
  currentPhase: number;
  specialAbilities: any[];
  aiPersonality: string;
  aiPriority: number;
  introductionCutscene?: string;
  defeatCutscene?: string;
  phaseChangeCutscene?: string;
  experienceReward: number;
  additionalRewards?: any[];
}

/**
 * データ検証エラー
 */
export class DataValidationError extends Error {
  constructor(
    message: string,
    public readonly dataType: string,
    public readonly dataId: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'DataValidationError';
  }
}

/**
 * 勝利条件データローダー
 */
export class VictoryConditionDataLoader {
  /**
   * ステージデータから目標を生成
   */
  static loadObjectivesFromStage(stageData: StageDataJSON): Objective[] {
    const objectives: Objective[] = [];

    // 明示的な目標が定義されている場合
    if (stageData.objectives && stageData.objectives.length > 0) {
      for (const objJSON of stageData.objectives) {
        objectives.push(this.parseObjective(objJSON));
      }
    } else {
      // 勝利条件から目標を自動生成
      for (const vcJSON of stageData.victoryConditions) {
        const objective = this.createObjectiveFromVictoryCondition(vcJSON, stageData.id);
        objectives.push(objective);
      }
    }

    return objectives;
  }

  /**
   * 勝利条件を読み込み
   */
  static loadVictoryConditions(stageData: StageDataJSON): VictoryCondition[] {
    const conditions: VictoryCondition[] = [];

    for (const vcJSON of stageData.victoryConditions) {
      conditions.push(this.parseVictoryCondition(vcJSON));
    }

    return conditions;
  }

  /**
   * 敗北条件を読み込み
   */
  static loadDefeatConditions(stageData: StageDataJSON): DefeatCondition[] {
    const conditions: DefeatCondition[] = [];

    for (const dcJSON of stageData.defeatConditions) {
      conditions.push(this.parseDefeatCondition(dcJSON));
    }

    return conditions;
  }

  /**
   * ボスデータを読み込み
   */
  static loadBossData(bossJSON: BossDataJSON): BossData {
    this.validateBossData(bossJSON);

    return {
      id: bossJSON.id,
      name: bossJSON.name,
      title: bossJSON.title,
      description: bossJSON.description,
      roseEssenceAmount: bossJSON.roseEssenceAmount,
      roseEssenceType: bossJSON.roseEssenceType as RoseEssenceType,
      isBoss: true,
      bossType: bossJSON.bossType as BossType,
      difficulty: bossJSON.difficulty as BossDifficulty,
      phases: bossJSON.phases,
      currentPhase: bossJSON.currentPhase,
      specialAbilities: bossJSON.specialAbilities,
      aiPersonality: bossJSON.aiPersonality as AIPersonality,
      aiPriority: bossJSON.aiPriority,
      introductionCutscene: bossJSON.introductionCutscene,
      defeatCutscene: bossJSON.defeatCutscene,
      phaseChangeCutscene: bossJSON.phaseChangeCutscene,
      experienceReward: bossJSON.experienceReward,
      additionalRewards: bossJSON.additionalRewards,
    };
  }

  /**
   * 目標JSONをパース
   */
  private static parseObjective(objJSON: ObjectiveJSON): Objective {
    const type = this.parseObjectiveType(objJSON.type);

    return {
      id: objJSON.id,
      type,
      description: objJSON.description,
      isRequired: objJSON.isRequired !== false,
      isComplete: false,
      progress: { current: 0, target: 1, percentage: 0 },
      targetData: objJSON.targetData,
    };
  }

  /**
   * 勝利条件から目標を生成
   */
  private static createObjectiveFromVictoryCondition(
    vcJSON: VictoryConditionJSON,
    stageId: string
  ): Objective {
    const id = vcJSON.id || `${stageId}_objective_${vcJSON.type}`;
    const type = this.parseObjectiveType(vcJSON.type);

    return {
      id,
      type,
      description: vcJSON.description,
      isRequired: vcJSON.isRequired !== false,
      isComplete: false,
      progress: this.createInitialProgress(type, vcJSON.parameters),
      targetData: vcJSON.parameters,
    };
  }

  /**
   * 勝利条件JSONをパース
   */
  private static parseVictoryCondition(vcJSON: VictoryConditionJSON): VictoryCondition {
    const id = vcJSON.id || `victory_${vcJSON.type}_${Date.now()}`;
    const type = this.parseVictoryConditionType(vcJSON.type);

    return {
      id,
      type,
      description: vcJSON.description,
      isRequired: vcJSON.isRequired !== false,
      evaluate: () => false, // 実際の評価関数は後で設定
      conditionData: vcJSON.parameters,
    };
  }

  /**
   * 敗北条件JSONをパース
   */
  private static parseDefeatCondition(dcJSON: DefeatConditionJSON): DefeatCondition {
    const id = dcJSON.id || `defeat_${dcJSON.type}_${Date.now()}`;
    const type = this.parseDefeatConditionType(dcJSON.type);

    return {
      id,
      type,
      description: dcJSON.description,
      evaluate: () => false, // 実際の評価関数は後で設定
      conditionData: dcJSON.parameters,
    };
  }

  /**
   * 目標種別をパース
   */
  private static parseObjectiveType(typeStr: string): ObjectiveType {
    const typeMap: Record<string, ObjectiveType> = {
      defeat_boss: ObjectiveType.DEFEAT_BOSS,
      defeat_all_enemies: ObjectiveType.DEFEAT_ALL_ENEMIES,
      reach_position: ObjectiveType.REACH_POSITION,
      reach_destination: ObjectiveType.REACH_POSITION,
      survive_turns: ObjectiveType.SURVIVE_TURNS,
      protect_unit: ObjectiveType.PROTECT_UNIT,
      collect_items: ObjectiveType.COLLECT_ITEMS,
      custom: ObjectiveType.CUSTOM,
    };

    const type = typeMap[typeStr];
    if (!type) {
      throw new DataValidationError(
        `Invalid objective type: ${typeStr}`,
        'objective',
        typeStr
      );
    }

    return type;
  }

  /**
   * 勝利条件種別をパース
   */
  private static parseVictoryConditionType(typeStr: string): VictoryConditionType {
    const typeMap: Record<string, VictoryConditionType> = {
      defeat_boss: VictoryConditionType.DEFEAT_BOSS,
      defeat_all_enemies: VictoryConditionType.DEFEAT_ALL_ENEMIES,
      reach_position: VictoryConditionType.REACH_POSITION,
      reach_destination: VictoryConditionType.REACH_POSITION,
      survive_turns: VictoryConditionType.SURVIVE_TURNS,
      protect_unit: VictoryConditionType.PROTECT_UNIT,
      collect_items: VictoryConditionType.COLLECT_ITEMS,
      custom: VictoryConditionType.CUSTOM,
    };

    const type = typeMap[typeStr];
    if (!type) {
      throw new DataValidationError(
        `Invalid victory condition type: ${typeStr}`,
        'victory_condition',
        typeStr
      );
    }

    return type;
  }

  /**
   * 敗北条件種別をパース
   */
  private static parseDefeatConditionType(typeStr: string): DefeatConditionType {
    const typeMap: Record<string, DefeatConditionType> = {
      all_allies_defeated: DefeatConditionType.ALL_UNITS_DEFEATED,
      all_units_defeated: DefeatConditionType.ALL_UNITS_DEFEATED,
      main_character_defeated: DefeatConditionType.MAIN_CHARACTER_DEFEATED,
      protected_unit_defeated: DefeatConditionType.PROTECTED_UNIT_DEFEATED,
      turn_limit_exceeded: DefeatConditionType.TURN_LIMIT_EXCEEDED,
      custom: DefeatConditionType.CUSTOM,
    };

    const type = typeMap[typeStr];
    if (!type) {
      throw new DataValidationError(
        `Invalid defeat condition type: ${typeStr}`,
        'defeat_condition',
        typeStr
      );
    }

    return type;
  }

  /**
   * 初期進捗を生成
   */
  private static createInitialProgress(
    type: ObjectiveType,
    parameters?: Record<string, any>
  ): ObjectiveProgress {
    let target = 1;

    switch (type) {
      case ObjectiveType.SURVIVE_TURNS:
        target = parameters?.requiredTurns || parameters?.surviveTurns || 1;
        break;
      case ObjectiveType.COLLECT_ITEMS:
        target = parameters?.itemCount || (parameters?.itemIds?.length || 1);
        break;
      default:
        target = 1;
    }

    return {
      current: 0,
      target,
      percentage: 0,
    };
  }

  /**
   * ボスデータを検証
   */
  private static validateBossData(bossJSON: BossDataJSON): void {
    // 必須フィールドチェック
    const requiredFields = [
      'id',
      'name',
      'title',
      'description',
      'roseEssenceAmount',
      'roseEssenceType',
      'bossType',
      'difficulty',
      'phases',
      'specialAbilities',
      'aiPersonality',
      'experienceReward',
    ];

    for (const field of requiredFields) {
      if (!(field in bossJSON)) {
        throw new DataValidationError(
          `Missing required field: ${field}`,
          'boss',
          bossJSON.id || 'unknown',
          { field }
        );
      }
    }

    // 薔薇の力の量チェック
    if (bossJSON.roseEssenceAmount < 0) {
      throw new DataValidationError(
        'Rose essence amount must be non-negative',
        'boss',
        bossJSON.id,
        { roseEssenceAmount: bossJSON.roseEssenceAmount }
      );
    }

    // 薔薇の力の種類チェック
    const validEssenceTypes = ['crimson', 'shadow', 'thorn', 'cursed'];
    if (!validEssenceTypes.includes(bossJSON.roseEssenceType)) {
      throw new DataValidationError(
        `Invalid rose essence type: ${bossJSON.roseEssenceType}`,
        'boss',
        bossJSON.id,
        { roseEssenceType: bossJSON.roseEssenceType }
      );
    }

    // ボス種別チェック
    const validBossTypes = ['minor_boss', 'major_boss', 'chapter_boss', 'final_boss'];
    if (!validBossTypes.includes(bossJSON.bossType)) {
      throw new DataValidationError(
        `Invalid boss type: ${bossJSON.bossType}`,
        'boss',
        bossJSON.id,
        { bossType: bossJSON.bossType }
      );
    }

    // 難易度チェック
    const validDifficulties = ['easy', 'normal', 'hard', 'extreme'];
    if (!validDifficulties.includes(bossJSON.difficulty)) {
      throw new DataValidationError(
        `Invalid difficulty: ${bossJSON.difficulty}`,
        'boss',
        bossJSON.id,
        { difficulty: bossJSON.difficulty }
      );
    }

    // フェーズチェック
    if (!Array.isArray(bossJSON.phases) || bossJSON.phases.length === 0) {
      throw new DataValidationError(
        'Boss must have at least one phase',
        'boss',
        bossJSON.id,
        { phases: bossJSON.phases }
      );
    }

    // 経験値報酬チェック
    if (bossJSON.experienceReward < 0) {
      throw new DataValidationError(
        'Experience reward must be non-negative',
        'boss',
        bossJSON.id,
        { experienceReward: bossJSON.experienceReward }
      );
    }
  }

  /**
   * ステージデータを検証
   */
  static validateStageData(stageData: StageDataJSON): void {
    // 必須フィールドチェック
    if (!stageData.id) {
      throw new DataValidationError('Missing stage ID', 'stage', 'unknown');
    }

    if (!stageData.victoryConditions || stageData.victoryConditions.length === 0) {
      throw new DataValidationError(
        'Stage must have at least one victory condition',
        'stage',
        stageData.id
      );
    }

    if (!stageData.defeatConditions || stageData.defeatConditions.length === 0) {
      throw new DataValidationError(
        'Stage must have at least one defeat condition',
        'stage',
        stageData.id
      );
    }

    // 勝利条件の検証
    for (const vc of stageData.victoryConditions) {
      this.validateVictoryCondition(vc, stageData.id);
    }

    // 敗北条件の検証
    for (const dc of stageData.defeatConditions) {
      this.validateDefeatCondition(dc, stageData.id);
    }
  }

  /**
   * 勝利条件を検証
   */
  private static validateVictoryCondition(vc: VictoryConditionJSON, stageId: string): void {
    if (!vc.type) {
      throw new DataValidationError(
        'Victory condition missing type',
        'victory_condition',
        stageId
      );
    }

    if (!vc.description) {
      throw new DataValidationError(
        'Victory condition missing description',
        'victory_condition',
        stageId
      );
    }

    // 種別固有のパラメータチェック
    if (vc.type === 'defeat_boss' && !vc.parameters?.bossId) {
      throw new DataValidationError(
        'defeat_boss condition requires bossId parameter',
        'victory_condition',
        stageId,
        { type: vc.type }
      );
    }

    if (vc.type === 'reach_position' && !vc.parameters?.targetPosition) {
      throw new DataValidationError(
        'reach_position condition requires targetPosition parameter',
        'victory_condition',
        stageId,
        { type: vc.type }
      );
    }

    if (vc.type === 'survive_turns' && !vc.parameters?.requiredTurns) {
      throw new DataValidationError(
        'survive_turns condition requires requiredTurns parameter',
        'victory_condition',
        stageId,
        { type: vc.type }
      );
    }
  }

  /**
   * 敗北条件を検証
   */
  private static validateDefeatCondition(dc: DefeatConditionJSON, stageId: string): void {
    if (!dc.type) {
      throw new DataValidationError(
        'Defeat condition missing type',
        'defeat_condition',
        stageId
      );
    }

    if (!dc.description) {
      throw new DataValidationError(
        'Defeat condition missing description',
        'defeat_condition',
        stageId
      );
    }

    // 種別固有のパラメータチェック
    if (dc.type === 'turn_limit_exceeded' && !dc.parameters?.maxTurns) {
      throw new DataValidationError(
        'turn_limit_exceeded condition requires maxTurns parameter',
        'defeat_condition',
        stageId,
        { type: dc.type }
      );
    }

    if (dc.type === 'protected_unit_defeated' && !dc.parameters?.protectedUnitId) {
      throw new DataValidationError(
        'protected_unit_defeated condition requires protectedUnitId parameter',
        'defeat_condition',
        stageId,
        { type: dc.type }
      );
    }
  }
}
