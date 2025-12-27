/**
 * VictoryConditionDataValidator
 * 
 * ボス戦・勝利条件システムのデータバリデーション機能を提供します。
 * JSONデータの構造検証とデータ整合性チェックを行います。
 */

import type {
  BossData,
  BossPhase,
  BossAbility,
  VictoryCondition,
  DefeatCondition,
  Objective,
  ObjectiveType,
  VictoryConditionType,
  DefeatConditionType,
  RoseEssenceType,
  BossType,
  BossDifficulty,
} from '../types/victory';

/**
 * バリデーションエラー
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * ボスデータバリデーター
 */
export class BossDataValidator {
  /**
   * ボスデータを検証
   */
  static validate(boss: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!boss || typeof boss !== 'object') {
      errors.push(new ValidationError('Boss data must be an object', 'boss', boss));
      return { isValid: false, errors, warnings };
    }

    const bossData = boss as Partial<BossData>;

    // 必須フィールドの検証
    this.validateRequiredFields(bossData, errors);

    // フィールド型の検証
    this.validateFieldTypes(bossData, errors);

    // データ整合性の検証
    this.validateDataIntegrity(bossData, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 必須フィールドの検証
   */
  private static validateRequiredFields(boss: Partial<BossData>, errors: ValidationError[]): void {
    const requiredFields: (keyof BossData)[] = [
      'id',
      'name',
      'title',
      'description',
      'roseEssenceAmount',
      'roseEssenceType',
      'isBoss',
      'bossType',
      'difficulty',
      'phases',
      'currentPhase',
      'specialAbilities',
      'aiPersonality',
      'aiPriority',
      'experienceReward',
    ];

    for (const field of requiredFields) {
      if (!(field in boss) || boss[field] === undefined || boss[field] === null) {
        errors.push(new ValidationError(`Missing required field: ${field}`, field, boss[field]));
      }
    }
  }

  /**
   * フィールド型の検証
   */
  private static validateFieldTypes(boss: Partial<BossData>, errors: ValidationError[]): void {
    // ID検証
    if (boss.id && typeof boss.id !== 'string') {
      errors.push(new ValidationError('Boss ID must be a string', 'id', boss.id));
    } else if (boss.id && !/^boss_[a-z_]+$/.test(boss.id)) {
      errors.push(
        new ValidationError('Boss ID must match pattern: boss_[a-z_]+', 'id', boss.id)
      );
    }

    // 名前検証
    if (boss.name && typeof boss.name !== 'string') {
      errors.push(new ValidationError('Boss name must be a string', 'name', boss.name));
    }

    // 薔薇の力の量検証
    if (boss.roseEssenceAmount !== undefined) {
      if (typeof boss.roseEssenceAmount !== 'number') {
        errors.push(
          new ValidationError(
            'Rose essence amount must be a number',
            'roseEssenceAmount',
            boss.roseEssenceAmount
          )
        );
      } else if (boss.roseEssenceAmount < 0) {
        errors.push(
          new ValidationError(
            'Rose essence amount must be non-negative',
            'roseEssenceAmount',
            boss.roseEssenceAmount
          )
        );
      }
    }

    // 薔薇の力の種類検証
    if (boss.roseEssenceType) {
      const validTypes: RoseEssenceType[] = ['crimson', 'shadow', 'thorn', 'cursed'];
      if (!validTypes.includes(boss.roseEssenceType as RoseEssenceType)) {
        errors.push(
          new ValidationError(
            `Rose essence type must be one of: ${validTypes.join(', ')}`,
            'roseEssenceType',
            boss.roseEssenceType
          )
        );
      }
    }

    // ボスフラグ検証
    if (boss.isBoss !== undefined && boss.isBoss !== true) {
      errors.push(new ValidationError('isBoss must be true', 'isBoss', boss.isBoss));
    }

    // ボスタイプ検証
    if (boss.bossType) {
      const validTypes: BossType[] = ['minor_boss', 'major_boss', 'chapter_boss', 'final_boss'];
      if (!validTypes.includes(boss.bossType as BossType)) {
        errors.push(
          new ValidationError(
            `Boss type must be one of: ${validTypes.join(', ')}`,
            'bossType',
            boss.bossType
          )
        );
      }
    }

    // 難易度検証
    if (boss.difficulty) {
      const validDifficulties: BossDifficulty[] = ['easy', 'normal', 'hard', 'extreme'];
      if (!validDifficulties.includes(boss.difficulty as BossDifficulty)) {
        errors.push(
          new ValidationError(
            `Difficulty must be one of: ${validDifficulties.join(', ')}`,
            'difficulty',
            boss.difficulty
          )
        );
      }
    }

    // フェーズ検証
    if (boss.phases) {
      if (!Array.isArray(boss.phases)) {
        errors.push(new ValidationError('Phases must be an array', 'phases', boss.phases));
      } else if (boss.phases.length === 0) {
        errors.push(new ValidationError('Phases array must not be empty', 'phases', boss.phases));
      } else {
        boss.phases.forEach((phase, index) => {
          this.validatePhase(phase, index, errors);
        });
      }
    }

    // 現在フェーズ検証
    if (boss.currentPhase !== undefined) {
      if (typeof boss.currentPhase !== 'number') {
        errors.push(
          new ValidationError('Current phase must be a number', 'currentPhase', boss.currentPhase)
        );
      } else if (boss.currentPhase < 1) {
        errors.push(
          new ValidationError(
            'Current phase must be at least 1',
            'currentPhase',
            boss.currentPhase
          )
        );
      }
    }

    // 特殊能力検証
    if (boss.specialAbilities) {
      if (!Array.isArray(boss.specialAbilities)) {
        errors.push(
          new ValidationError(
            'Special abilities must be an array',
            'specialAbilities',
            boss.specialAbilities
          )
        );
      } else {
        boss.specialAbilities.forEach((ability, index) => {
          this.validateAbility(ability, index, errors);
        });
      }
    }

    // AI性格検証
    if (boss.aiPersonality) {
      const validPersonalities = ['aggressive', 'defensive', 'tactical', 'support'];
      if (!validPersonalities.includes(boss.aiPersonality)) {
        errors.push(
          new ValidationError(
            `AI personality must be one of: ${validPersonalities.join(', ')}`,
            'aiPersonality',
            boss.aiPersonality
          )
        );
      }
    }

    // AI優先度検証
    if (boss.aiPriority !== undefined) {
      if (typeof boss.aiPriority !== 'number') {
        errors.push(
          new ValidationError('AI priority must be a number', 'aiPriority', boss.aiPriority)
        );
      } else if (boss.aiPriority < 0) {
        errors.push(
          new ValidationError(
            'AI priority must be non-negative',
            'aiPriority',
            boss.aiPriority
          )
        );
      }
    }

    // 経験値報酬検証
    if (boss.experienceReward !== undefined) {
      if (typeof boss.experienceReward !== 'number') {
        errors.push(
          new ValidationError(
            'Experience reward must be a number',
            'experienceReward',
            boss.experienceReward
          )
        );
      } else if (boss.experienceReward < 0) {
        errors.push(
          new ValidationError(
            'Experience reward must be non-negative',
            'experienceReward',
            boss.experienceReward
          )
        );
      }
    }
  }

  /**
   * フェーズデータの検証
   */
  private static validatePhase(
    phase: unknown,
    index: number,
    errors: ValidationError[]
  ): void {
    if (!phase || typeof phase !== 'object') {
      errors.push(
        new ValidationError(`Phase ${index} must be an object`, `phases[${index}]`, phase)
      );
      return;
    }

    const phaseData = phase as Partial<BossPhase>;

    // フェーズ番号検証
    if (phaseData.phaseNumber === undefined) {
      errors.push(
        new ValidationError(
          `Phase ${index} missing phaseNumber`,
          `phases[${index}].phaseNumber`,
          phaseData.phaseNumber
        )
      );
    } else if (typeof phaseData.phaseNumber !== 'number' || phaseData.phaseNumber < 1) {
      errors.push(
        new ValidationError(
          `Phase ${index} phaseNumber must be a positive number`,
          `phases[${index}].phaseNumber`,
          phaseData.phaseNumber
        )
      );
    }

    // HP閾値検証
    if (phaseData.hpThreshold === undefined) {
      errors.push(
        new ValidationError(
          `Phase ${index} missing hpThreshold`,
          `phases[${index}].hpThreshold`,
          phaseData.hpThreshold
        )
      );
    } else if (
      typeof phaseData.hpThreshold !== 'number' ||
      phaseData.hpThreshold < 0 ||
      phaseData.hpThreshold > 100
    ) {
      errors.push(
        new ValidationError(
          `Phase ${index} hpThreshold must be between 0 and 100`,
          `phases[${index}].hpThreshold`,
          phaseData.hpThreshold
        )
      );
    }

    // ステータス修正値検証
    if (!phaseData.statModifiers) {
      errors.push(
        new ValidationError(
          `Phase ${index} missing statModifiers`,
          `phases[${index}].statModifiers`,
          phaseData.statModifiers
        )
      );
    } else if (typeof phaseData.statModifiers !== 'object') {
      errors.push(
        new ValidationError(
          `Phase ${index} statModifiers must be an object`,
          `phases[${index}].statModifiers`,
          phaseData.statModifiers
        )
      );
    }

    // 新規能力検証
    if (!phaseData.newAbilities) {
      errors.push(
        new ValidationError(
          `Phase ${index} missing newAbilities`,
          `phases[${index}].newAbilities`,
          phaseData.newAbilities
        )
      );
    } else if (!Array.isArray(phaseData.newAbilities)) {
      errors.push(
        new ValidationError(
          `Phase ${index} newAbilities must be an array`,
          `phases[${index}].newAbilities`,
          phaseData.newAbilities
        )
      );
    }
  }

  /**
   * 能力データの検証
   */
  private static validateAbility(
    ability: unknown,
    index: number,
    errors: ValidationError[]
  ): void {
    if (!ability || typeof ability !== 'object') {
      errors.push(
        new ValidationError(
          `Ability ${index} must be an object`,
          `specialAbilities[${index}]`,
          ability
        )
      );
      return;
    }

    const abilityData = ability as Partial<BossAbility>;

    // 必須フィールド検証
    const requiredFields: (keyof BossAbility)[] = ['id', 'name', 'description', 'type', 'effect'];
    for (const field of requiredFields) {
      if (!(field in abilityData) || abilityData[field] === undefined) {
        errors.push(
          new ValidationError(
            `Ability ${index} missing ${field}`,
            `specialAbilities[${index}].${field}`,
            abilityData[field]
          )
        );
      }
    }

    // タイプ検証
    if (abilityData.type && !['passive', 'active'].includes(abilityData.type)) {
      errors.push(
        new ValidationError(
          `Ability ${index} type must be 'passive' or 'active'`,
          `specialAbilities[${index}].type`,
          abilityData.type
        )
      );
    }

    // クールダウン検証
    if (abilityData.cooldown !== undefined) {
      if (typeof abilityData.cooldown !== 'number' || abilityData.cooldown < 0) {
        errors.push(
          new ValidationError(
            `Ability ${index} cooldown must be a non-negative number`,
            `specialAbilities[${index}].cooldown`,
            abilityData.cooldown
          )
        );
      }
    }
  }

  /**
   * データ整合性の検証
   */
  private static validateDataIntegrity(
    boss: Partial<BossData>,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    // 現在フェーズがフェーズ配列の範囲内か
    if (boss.currentPhase && boss.phases) {
      if (boss.currentPhase > boss.phases.length) {
        errors.push(
          new ValidationError(
            `Current phase ${boss.currentPhase} exceeds number of phases ${boss.phases.length}`,
            'currentPhase',
            boss.currentPhase
          )
        );
      }
    }

    // フェーズのHP閾値が降順か
    if (boss.phases && boss.phases.length > 1) {
      for (let i = 0; i < boss.phases.length - 1; i++) {
        const currentPhase = boss.phases[i] as BossPhase;
        const nextPhase = boss.phases[i + 1] as BossPhase;
        if (currentPhase.hpThreshold < nextPhase.hpThreshold) {
          warnings.push(
            `Phase ${i + 1} HP threshold (${currentPhase.hpThreshold}%) is less than phase ${i + 2} (${nextPhase.hpThreshold}%). Phases should have descending HP thresholds.`
          );
        }
      }
    }

    // 特殊能力IDの重複チェック
    if (boss.specialAbilities) {
      const abilityIds = new Set<string>();
      boss.specialAbilities.forEach((ability, index) => {
        const abilityData = ability as BossAbility;
        if (abilityData.id) {
          if (abilityIds.has(abilityData.id)) {
            errors.push(
              new ValidationError(
                `Duplicate ability ID: ${abilityData.id}`,
                `specialAbilities[${index}].id`,
                abilityData.id
              )
            );
          }
          abilityIds.add(abilityData.id);
        }
      });
    }

    // フェーズで参照される能力が存在するか
    if (boss.phases && boss.specialAbilities) {
      const abilityIds = new Set(
        boss.specialAbilities.map((a) => (a as BossAbility).id).filter(Boolean)
      );
      boss.phases.forEach((phase, phaseIndex) => {
        const phaseData = phase as BossPhase;
        if (phaseData.newAbilities) {
          phaseData.newAbilities.forEach((abilityId) => {
            if (!abilityIds.has(abilityId)) {
              warnings.push(
                `Phase ${phaseIndex + 1} references unknown ability: ${abilityId}`
              );
            }
          });
        }
      });
    }

    // 難易度と報酬のバランスチェック
    if (boss.difficulty && boss.experienceReward !== undefined) {
      const expectedRewards: Record<BossDifficulty, number> = {
        easy: 100,
        normal: 200,
        hard: 400,
        extreme: 800,
      };
      const expected = expectedRewards[boss.difficulty as BossDifficulty];
      if (expected && boss.experienceReward < expected * 0.5) {
        warnings.push(
          `Experience reward (${boss.experienceReward}) seems low for ${boss.difficulty} difficulty (expected ~${expected})`
        );
      }
    }
  }
}

/**
 * 勝利条件バリデーター
 */
export class VictoryConditionValidator {
  /**
   * 勝利条件を検証
   */
  static validate(condition: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!condition || typeof condition !== 'object') {
      errors.push(
        new ValidationError('Victory condition must be an object', 'condition', condition)
      );
      return { isValid: false, errors, warnings };
    }

    const conditionData = condition as Partial<VictoryCondition>;

    // 必須フィールド検証
    if (!conditionData.type) {
      errors.push(
        new ValidationError('Victory condition missing type', 'type', conditionData.type)
      );
    }

    if (!conditionData.description) {
      errors.push(
        new ValidationError(
          'Victory condition missing description',
          'description',
          conditionData.description
        )
      );
    }

    // タイプ検証
    if (conditionData.type) {
      const validTypes: VictoryConditionType[] = [
        'defeat_boss',
        'defeat_all_enemies',
        'reach_position',
        'survive_turns',
        'protect_unit',
        'collect_items',
        'custom',
      ];
      if (!validTypes.includes(conditionData.type as VictoryConditionType)) {
        errors.push(
          new ValidationError(
            `Victory condition type must be one of: ${validTypes.join(', ')}`,
            'type',
            conditionData.type
          )
        );
      }
    }

    // パラメータ検証
    if (conditionData.type && conditionData.parameters) {
      this.validateVictoryParameters(conditionData.type, conditionData.parameters, errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 勝利条件パラメータの検証
   */
  private static validateVictoryParameters(
    type: string,
    parameters: Record<string, unknown>,
    errors: ValidationError[]
  ): void {
    switch (type) {
      case 'defeat_boss':
        if (!parameters.bossId || typeof parameters.bossId !== 'string') {
          errors.push(
            new ValidationError(
              'defeat_boss condition requires bossId parameter',
              'parameters.bossId',
              parameters.bossId
            )
          );
        }
        break;

      case 'reach_position':
        if (!parameters.targetPosition || typeof parameters.targetPosition !== 'object') {
          errors.push(
            new ValidationError(
              'reach_position condition requires targetPosition parameter',
              'parameters.targetPosition',
              parameters.targetPosition
            )
          );
        }
        break;

      case 'survive_turns':
        if (
          !parameters.requiredTurns ||
          typeof parameters.requiredTurns !== 'number' ||
          parameters.requiredTurns < 1
        ) {
          errors.push(
            new ValidationError(
              'survive_turns condition requires positive requiredTurns parameter',
              'parameters.requiredTurns',
              parameters.requiredTurns
            )
          );
        }
        break;

      case 'protect_unit':
        if (!parameters.protectUnitId || typeof parameters.protectUnitId !== 'string') {
          errors.push(
            new ValidationError(
              'protect_unit condition requires protectUnitId parameter',
              'parameters.protectUnitId',
              parameters.protectUnitId
            )
          );
        }
        break;

      case 'collect_items':
        if (!parameters.itemIds || !Array.isArray(parameters.itemIds)) {
          errors.push(
            new ValidationError(
              'collect_items condition requires itemIds array parameter',
              'parameters.itemIds',
              parameters.itemIds
            )
          );
        }
        break;
    }
  }
}

/**
 * 敗北条件バリデーター
 */
export class DefeatConditionValidator {
  /**
   * 敗北条件を検証
   */
  static validate(condition: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!condition || typeof condition !== 'object') {
      errors.push(
        new ValidationError('Defeat condition must be an object', 'condition', condition)
      );
      return { isValid: false, errors, warnings };
    }

    const conditionData = condition as Partial<DefeatCondition>;

    // 必須フィールド検証
    if (!conditionData.type) {
      errors.push(
        new ValidationError('Defeat condition missing type', 'type', conditionData.type)
      );
    }

    if (!conditionData.description) {
      errors.push(
        new ValidationError(
          'Defeat condition missing description',
          'description',
          conditionData.description
        )
      );
    }

    // タイプ検証
    if (conditionData.type) {
      const validTypes: DefeatConditionType[] = [
        'all_units_defeated',
        'main_character_defeated',
        'protected_unit_defeated',
        'turn_limit_exceeded',
        'custom',
      ];
      if (!validTypes.includes(conditionData.type as DefeatConditionType)) {
        errors.push(
          new ValidationError(
            `Defeat condition type must be one of: ${validTypes.join(', ')}`,
            'type',
            conditionData.type
          )
        );
      }
    }

    // パラメータ検証
    if (conditionData.type && conditionData.parameters) {
      this.validateDefeatParameters(conditionData.type, conditionData.parameters, errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 敗北条件パラメータの検証
   */
  private static validateDefeatParameters(
    type: string,
    parameters: Record<string, unknown>,
    errors: ValidationError[]
  ): void {
    switch (type) {
      case 'main_character_defeated':
        if (!parameters.mainCharacterId || typeof parameters.mainCharacterId !== 'string') {
          errors.push(
            new ValidationError(
              'main_character_defeated condition requires mainCharacterId parameter',
              'parameters.mainCharacterId',
              parameters.mainCharacterId
            )
          );
        }
        break;

      case 'protected_unit_defeated':
        if (!parameters.protectedUnitId || typeof parameters.protectedUnitId !== 'string') {
          errors.push(
            new ValidationError(
              'protected_unit_defeated condition requires protectedUnitId parameter',
              'parameters.protectedUnitId',
              parameters.protectedUnitId
            )
          );
        }
        break;

      case 'turn_limit_exceeded':
        if (
          !parameters.maxTurns ||
          typeof parameters.maxTurns !== 'number' ||
          parameters.maxTurns < 1
        ) {
          errors.push(
            new ValidationError(
              'turn_limit_exceeded condition requires positive maxTurns parameter',
              'parameters.maxTurns',
              parameters.maxTurns
            )
          );
        }
        break;
    }
  }
}

/**
 * データローダーとバリデーター統合クラス
 */
export class VictoryConditionDataLoader {
  /**
   * ボスデータを読み込んで検証
   */
  static async loadAndValidateBosses(data: unknown): Promise<{
    bosses: BossData[];
    validationResult: ValidationResult;
  }> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const bosses: BossData[] = [];

    if (!data || typeof data !== 'object') {
      errors.push(new ValidationError('Boss data must be an object', 'data', data));
      return {
        bosses: [],
        validationResult: { isValid: false, errors, warnings },
      };
    }

    const bossesData = (data as { bosses?: unknown[] }).bosses;

    if (!Array.isArray(bossesData)) {
      errors.push(new ValidationError('Bosses must be an array', 'bosses', bossesData));
      return {
        bosses: [],
        validationResult: { isValid: false, errors, warnings },
      };
    }

    for (const boss of bossesData) {
      const result = BossDataValidator.validate(boss);
      errors.push(...result.errors);
      warnings.push(...result.warnings);

      if (result.isValid) {
        bosses.push(boss as BossData);
      }
    }

    return {
      bosses,
      validationResult: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
    };
  }

  /**
   * ステージの勝利・敗北条件を検証
   */
  static validateStageConditions(
    victoryConditions: unknown[],
    defeatConditions: unknown[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // 勝利条件検証
    if (!Array.isArray(victoryConditions)) {
      errors.push(
        new ValidationError(
          'Victory conditions must be an array',
          'victoryConditions',
          victoryConditions
        )
      );
    } else {
      victoryConditions.forEach((condition, index) => {
        const result = VictoryConditionValidator.validate(condition);
        result.errors.forEach((error) => {
          errors.push(
            new ValidationError(
              `Victory condition ${index}: ${error.message}`,
              `victoryConditions[${index}].${error.field}`,
              error.value
            )
          );
        });
        warnings.push(...result.warnings);
      });
    }

    // 敗北条件検証
    if (!Array.isArray(defeatConditions)) {
      errors.push(
        new ValidationError(
          'Defeat conditions must be an array',
          'defeatConditions',
          defeatConditions
        )
      );
    } else {
      defeatConditions.forEach((condition, index) => {
        const result = DefeatConditionValidator.validate(condition);
        result.errors.forEach((error) => {
          errors.push(
            new ValidationError(
              `Defeat condition ${index}: ${error.message}`,
              `defeatConditions[${index}].${error.field}`,
              error.value
            )
          );
        });
        warnings.push(...result.warnings);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
