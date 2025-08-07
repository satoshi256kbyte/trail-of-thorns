/**
 * Recruitment data integrity checker and error handler
 * Provides comprehensive validation and error handling for recruitment system data
 */

import { CharacterData, StageData } from './DataLoader';
import { RecruitmentConditionType, RecruitmentError } from '../types/recruitment';
import { SchemaValidationError } from '../schemas/recruitmentSchema';

export interface IntegrityCheckResult {
  isValid: boolean;
  errors: IntegrityError[];
  warnings: IntegrityWarning[];
  summary: IntegritySummary;
}

export interface IntegrityError {
  type: 'CRITICAL' | 'ERROR' | 'WARNING';
  code: string;
  message: string;
  context: {
    characterId?: string;
    stageId?: string;
    conditionId?: string;
    field?: string;
  };
  suggestedFix?: string;
}

export interface IntegrityWarning {
  code: string;
  message: string;
  context: {
    characterId?: string;
    stageId?: string;
    conditionId?: string;
  };
  recommendation?: string;
}

export interface IntegritySummary {
  totalCharacters: number;
  recruitableCharacters: number;
  totalStages: number;
  stagesWithRecruitment: number;
  totalRecruitmentConditions: number;
  criticalErrors: number;
  errors: number;
  warnings: number;
}

/**
 * Comprehensive recruitment data integrity checker
 */
export class RecruitmentDataIntegrityChecker {
  private characters: CharacterData[] = [];
  private stages: StageData[] = [];
  private errors: IntegrityError[] = [];
  private warnings: IntegrityWarning[] = [];

  /**
   * Perform comprehensive integrity check on recruitment data
   */
  static async checkIntegrity(
    characters: CharacterData[],
    stages: StageData[]
  ): Promise<IntegrityCheckResult> {
    const checker = new RecruitmentDataIntegrityChecker();
    return checker.performCheck(characters, stages);
  }

  private async performCheck(
    characters: CharacterData[],
    stages: StageData[]
  ): Promise<IntegrityCheckResult> {
    this.characters = characters;
    this.stages = stages;
    this.errors = [];
    this.warnings = [];

    // Perform various integrity checks
    this.checkCharacterDataIntegrity();
    this.checkStageDataIntegrity();
    this.checkCrossReferences();
    this.checkRecruitmentConditionValidity();
    this.checkGameBalanceConsiderations();

    const summary = this.generateSummary();
    const isValid =
      this.errors.filter(e => e.type === 'CRITICAL' || e.type === 'ERROR').length === 0;

    return {
      isValid,
      errors: this.errors,
      warnings: this.warnings,
      summary,
    };
  }

  /**
   * Check character data integrity
   */
  private checkCharacterDataIntegrity(): void {
    const characterIds = new Set<string>();

    this.characters.forEach((character, index) => {
      const context = { characterId: character.id };

      // Check for duplicate character IDs
      if (characterIds.has(character.id)) {
        this.addError(
          'CRITICAL',
          'DUPLICATE_CHARACTER_ID',
          `Duplicate character ID: ${character.id}`,
          context
        );
      }
      characterIds.add(character.id);

      // Check recruitment data consistency
      if (character.isRecruitable && !character.recruitmentData) {
        this.addError(
          'ERROR',
          'MISSING_RECRUITMENT_DATA',
          `Character ${character.id} is marked as recruitable but has no recruitment data`,
          context
        );
      }

      if (!character.isRecruitable && character.recruitmentData) {
        this.addWarning(
          'INCONSISTENT_RECRUITMENT_FLAG',
          `Character ${character.id} has recruitment data but is not marked as recruitable`,
          context
        );
      }

      // Check recruitment conditions
      if (character.recruitmentData) {
        this.validateCharacterRecruitmentConditions(character);
      }

      // Check base stats validity
      this.validateCharacterStats(character);
    });
  }

  /**
   * Check stage data integrity
   */
  private checkStageDataIntegrity(): void {
    const stageIds = new Set<string>();
    const stageOrders = new Set<number>();

    this.stages.forEach((stage, index) => {
      const context = { stageId: stage.id };

      // Check for duplicate stage IDs
      if (stageIds.has(stage.id)) {
        this.addError('CRITICAL', 'DUPLICATE_STAGE_ID', `Duplicate stage ID: ${stage.id}`, context);
      }
      stageIds.add(stage.id);

      // Check for duplicate stage orders
      if (stageOrders.has(stage.order)) {
        this.addError(
          'ERROR',
          'DUPLICATE_STAGE_ORDER',
          `Duplicate stage order: ${stage.order}`,
          context
        );
      }
      stageOrders.add(stage.order);

      // Check map data validity
      if (stage.mapData.width < 8 || stage.mapData.height < 6) {
        this.addWarning(
          'SMALL_MAP_SIZE',
          `Stage ${stage.id} has very small map size (${stage.mapData.width}x${stage.mapData.height})`,
          context,
          'Consider increasing map size for better gameplay'
        );
      }

      // Check unit placement validity
      this.validateUnitPlacements(stage);
    });
  }

  /**
   * Check cross-references between characters and stages
   */
  private checkCrossReferences(): void {
    const characterIds = new Set(this.characters.map(c => c.id));

    this.stages.forEach(stage => {
      const context = { stageId: stage.id };

      // Check player unit references
      stage.playerUnits.forEach((unit, index) => {
        if (!characterIds.has(unit.characterId)) {
          this.addError(
            'ERROR',
            'INVALID_PLAYER_UNIT_REFERENCE',
            `Stage ${stage.id} references unknown player character: ${unit.characterId}`,
            { ...context, field: `playerUnits[${index}]` }
          );
        }
      });

      // Check enemy unit references
      stage.enemyUnits.forEach((unit, index) => {
        if (!characterIds.has(unit.characterId)) {
          this.addError(
            'ERROR',
            'INVALID_ENEMY_UNIT_REFERENCE',
            `Stage ${stage.id} references unknown enemy character: ${unit.characterId}`,
            { ...context, field: `enemyUnits[${index}]` }
          );
        }
      });

      // Check recruitable character references
      stage.recruitableCharacters.forEach((recruitable, index) => {
        if (!characterIds.has(recruitable.characterId)) {
          this.addError(
            'ERROR',
            'INVALID_RECRUITABLE_REFERENCE',
            `Stage ${stage.id} references unknown recruitable character: ${recruitable.characterId}`,
            { ...context, field: `recruitableCharacters[${index}]` }
          );
        } else {
          const character = this.characters.find(c => c.id === recruitable.characterId);
          if (character && !character.isRecruitable) {
            this.addError(
              'ERROR',
              'NON_RECRUITABLE_IN_STAGE',
              `Stage ${stage.id} lists ${recruitable.characterId} as recruitable, but character is not marked as recruitable`,
              { ...context, characterId: recruitable.characterId }
            );
          }
        }
      });
    });
  }

  /**
   * Check recruitment condition validity
   */
  private checkRecruitmentConditionValidity(): void {
    this.characters.forEach(character => {
      if (!character.recruitmentData) return;

      character.recruitmentData.conditions.forEach((condition, index) => {
        const context = {
          characterId: character.id,
          conditionId: condition.id,
          field: `recruitmentData.conditions[${index}]`,
        };

        // Check condition type validity
        if (!Object.values(RecruitmentConditionType).includes(condition.type)) {
          this.addError(
            'ERROR',
            'INVALID_CONDITION_TYPE',
            `Invalid recruitment condition type: ${condition.type}`,
            context
          );
          return;
        }

        // Check condition-specific parameters
        this.validateConditionParameters(condition, context);
      });
    });
  }

  /**
   * Check game balance considerations
   */
  private checkGameBalanceConsiderations(): void {
    const recruitableCount = this.characters.filter(c => c.isRecruitable).length;
    const totalEnemies = this.characters.filter(c => c.faction === 'enemy').length;

    if (recruitableCount === 0) {
      this.addWarning(
        'NO_RECRUITABLE_CHARACTERS',
        'No recruitable characters found in the game',
        {},
        'Consider adding recruitable characters to enhance gameplay'
      );
    }

    if (recruitableCount > totalEnemies * 0.8) {
      this.addWarning(
        'HIGH_RECRUITMENT_RATIO',
        `High recruitment ratio: ${recruitableCount}/${totalEnemies} enemies are recruitable`,
        {},
        'Consider balancing recruitment opportunities'
      );
    }

    // Check for stages without recruitment opportunities
    const stagesWithRecruitment = this.stages.filter(
      s => s.recruitableCharacters.length > 0
    ).length;
    if (stagesWithRecruitment < this.stages.length * 0.3) {
      this.addWarning(
        'LOW_RECRUITMENT_STAGES',
        `Only ${stagesWithRecruitment}/${this.stages.length} stages have recruitment opportunities`,
        {},
        'Consider adding recruitment opportunities to more stages'
      );
    }
  }

  /**
   * Validate character recruitment conditions
   */
  private validateCharacterRecruitmentConditions(character: CharacterData): void {
    if (!character.recruitmentData) return;

    const context = { characterId: character.id };

    // Check condition count
    if (character.recruitmentData.conditions.length === 0) {
      this.addError(
        'ERROR',
        'NO_RECRUITMENT_CONDITIONS',
        `Character ${character.id} has recruitment data but no conditions`,
        context
      );
    }

    if (character.recruitmentData.conditions.length > 5) {
      this.addWarning(
        'TOO_MANY_CONDITIONS',
        `Character ${character.id} has ${character.recruitmentData.conditions.length} recruitment conditions`,
        context,
        'Consider reducing conditions for better player experience'
      );
    }

    // Check priority value
    if (character.recruitmentData.priority < 0 || character.recruitmentData.priority > 100) {
      this.addError(
        'ERROR',
        'INVALID_PRIORITY',
        `Character ${character.id} has invalid recruitment priority: ${character.recruitmentData.priority}`,
        context,
        'Priority should be between 0 and 100'
      );
    }
  }

  /**
   * Validate character stats
   */
  private validateCharacterStats(character: CharacterData): void {
    const context = { characterId: character.id };
    const stats = character.baseStats;

    if (stats.maxHP <= 0) {
      this.addError(
        'ERROR',
        'INVALID_HP',
        `Character ${character.id} has invalid HP: ${stats.maxHP}`,
        context
      );
    }

    if (stats.maxMP < 0) {
      this.addError(
        'ERROR',
        'INVALID_MP',
        `Character ${character.id} has invalid MP: ${stats.maxMP}`,
        context
      );
    }

    if (stats.attack <= 0) {
      this.addError(
        'ERROR',
        'INVALID_ATTACK',
        `Character ${character.id} has invalid attack: ${stats.attack}`,
        context
      );
    }

    if (stats.defense < 0) {
      this.addError(
        'ERROR',
        'INVALID_DEFENSE',
        `Character ${character.id} has invalid defense: ${stats.defense}`,
        context
      );
    }

    if (stats.speed <= 0) {
      this.addError(
        'ERROR',
        'INVALID_SPEED',
        `Character ${character.id} has invalid speed: ${stats.speed}`,
        context
      );
    }

    if (stats.movement <= 0) {
      this.addError(
        'ERROR',
        'INVALID_MOVEMENT',
        `Character ${character.id} has invalid movement: ${stats.movement}`,
        context
      );
    }
  }

  /**
   * Validate unit placements in stage
   */
  private validateUnitPlacements(stage: StageData): void {
    const context = { stageId: stage.id };
    const occupiedPositions = new Set<string>();

    // Check all unit placements
    const allUnits = [...stage.playerUnits, ...stage.enemyUnits];

    allUnits.forEach((unit, index) => {
      const posKey = `${unit.startPosition.x},${unit.startPosition.y}`;

      // Check for position conflicts
      if (occupiedPositions.has(posKey)) {
        this.addError(
          'ERROR',
          'POSITION_CONFLICT',
          `Multiple units placed at position (${unit.startPosition.x}, ${unit.startPosition.y}) in stage ${stage.id}`,
          context
        );
      }
      occupiedPositions.add(posKey);

      // Check if position is within map bounds
      if (
        unit.startPosition.x < 0 ||
        unit.startPosition.x >= stage.mapData.width ||
        unit.startPosition.y < 0 ||
        unit.startPosition.y >= stage.mapData.height
      ) {
        this.addError(
          'ERROR',
          'OUT_OF_BOUNDS_PLACEMENT',
          `Unit ${unit.characterId} placed out of bounds at (${unit.startPosition.x}, ${unit.startPosition.y}) in stage ${stage.id}`,
          context
        );
      }
    });
  }

  /**
   * Validate condition parameters based on type
   */
  private validateConditionParameters(condition: any, context: any): void {
    switch (condition.type) {
      case RecruitmentConditionType.SPECIFIC_ATTACKER:
        if (!condition.parameters.attackerId) {
          this.addError(
            'ERROR',
            'MISSING_ATTACKER_ID',
            'specific_attacker condition missing attackerId parameter',
            context
          );
        } else {
          const attackerExists = this.characters.some(
            c => c.id === condition.parameters.attackerId
          );
          if (!attackerExists) {
            this.addError(
              'ERROR',
              'INVALID_ATTACKER_REFERENCE',
              `specific_attacker condition references unknown character: ${condition.parameters.attackerId}`,
              context
            );
          }
        }
        break;

      case RecruitmentConditionType.HP_THRESHOLD:
        if (
          typeof condition.parameters.threshold !== 'number' ||
          condition.parameters.threshold <= 0 ||
          condition.parameters.threshold > 1
        ) {
          this.addError(
            'ERROR',
            'INVALID_HP_THRESHOLD',
            `hp_threshold condition has invalid threshold: ${condition.parameters.threshold}`,
            context
          );
        }
        break;

      case RecruitmentConditionType.TURN_LIMIT:
        if (typeof condition.parameters.maxTurn !== 'number' || condition.parameters.maxTurn < 1) {
          this.addError(
            'ERROR',
            'INVALID_TURN_LIMIT',
            `turn_limit condition has invalid maxTurn: ${condition.parameters.maxTurn}`,
            context
          );
        }
        break;

      case RecruitmentConditionType.ALLY_PRESENT:
        if (!condition.parameters.requiredAllyId) {
          this.addError(
            'ERROR',
            'MISSING_ALLY_ID',
            'ally_present condition missing requiredAllyId parameter',
            context
          );
        } else {
          const allyExists = this.characters.some(
            c => c.id === condition.parameters.requiredAllyId
          );
          if (!allyExists) {
            this.addError(
              'ERROR',
              'INVALID_ALLY_REFERENCE',
              `ally_present condition references unknown character: ${condition.parameters.requiredAllyId}`,
              context
            );
          }
        }
        break;
    }
  }

  /**
   * Add an error to the error list
   */
  private addError(
    type: 'CRITICAL' | 'ERROR' | 'WARNING',
    code: string,
    message: string,
    context: any,
    suggestedFix?: string
  ): void {
    this.errors.push({
      type,
      code,
      message,
      context,
      suggestedFix,
    });
  }

  /**
   * Add a warning to the warning list
   */
  private addWarning(code: string, message: string, context: any, recommendation?: string): void {
    this.warnings.push({
      code,
      message,
      context,
      recommendation,
    });
  }

  /**
   * Generate integrity check summary
   */
  private generateSummary(): IntegritySummary {
    const recruitableCharacters = this.characters.filter(c => c.isRecruitable).length;
    const stagesWithRecruitment = this.stages.filter(
      s => s.recruitableCharacters.length > 0
    ).length;
    const totalRecruitmentConditions = this.characters
      .filter(c => c.recruitmentData)
      .reduce((sum, c) => sum + (c.recruitmentData?.conditions.length || 0), 0);

    const criticalErrors = this.errors.filter(e => e.type === 'CRITICAL').length;
    const errors = this.errors.filter(e => e.type === 'ERROR').length;
    const warnings = this.errors.filter(e => e.type === 'WARNING').length + this.warnings.length;

    return {
      totalCharacters: this.characters.length,
      recruitableCharacters,
      totalStages: this.stages.length,
      stagesWithRecruitment,
      totalRecruitmentConditions,
      criticalErrors,
      errors,
      warnings,
    };
  }
}

/**
 * Error handler for recruitment data operations
 */
export class RecruitmentDataErrorHandler {
  /**
   * Handle data loading errors with appropriate fallbacks
   */
  static handleLoadingError(error: Error, dataType: 'characters' | 'stages'): void {
    console.error(`Failed to load ${dataType} data:`, error);

    if (error instanceof SchemaValidationError) {
      console.error(`Schema validation failed at ${error.path}:`, error.message);
      throw new Error(`Invalid ${dataType} data format: ${error.message}`);
    }

    if (error.message.includes('404')) {
      throw new Error(`${dataType} data file not found. Please ensure the data file exists.`);
    }

    if (error.message.includes('Failed to fetch')) {
      throw new Error(`Network error loading ${dataType} data. Please check your connection.`);
    }

    throw new Error(`Unexpected error loading ${dataType} data: ${error.message}`);
  }

  /**
   * Handle integrity check failures
   */
  static handleIntegrityFailure(result: IntegrityCheckResult): void {
    const criticalErrors = result.errors.filter(e => e.type === 'CRITICAL');
    const errors = result.errors.filter(e => e.type === 'ERROR');

    if (criticalErrors.length > 0) {
      console.error('Critical recruitment data errors found:');
      criticalErrors.forEach(error => {
        console.error(`[${error.code}] ${error.message}`, error.context);
      });
      throw new Error('Critical recruitment data errors prevent game from starting');
    }

    if (errors.length > 0) {
      console.warn('Recruitment data errors found:');
      errors.forEach(error => {
        console.warn(`[${error.code}] ${error.message}`, error.context);
      });
    }

    if (result.warnings.length > 0) {
      console.info('Recruitment data warnings:');
      result.warnings.forEach(warning => {
        console.info(`[${warning.code}] ${warning.message}`, warning.context);
      });
    }
  }

  /**
   * Create user-friendly error message for display
   */
  static createUserErrorMessage(error: Error): string {
    if (error.message.includes('Invalid') && error.message.includes('data format')) {
      return 'ゲームデータの形式が正しくありません。開発者にお問い合わせください。';
    }

    if (error.message.includes('not found')) {
      return 'ゲームデータファイルが見つかりません。ゲームを再インストールしてください。';
    }

    if (error.message.includes('Network error')) {
      return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
    }

    if (error.message.includes('Critical') && error.message.includes('errors')) {
      return 'ゲームデータに重大なエラーがあります。開発者にお問い合わせください。';
    }

    return 'ゲームデータの読み込み中にエラーが発生しました。';
  }
}
