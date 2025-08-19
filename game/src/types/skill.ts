/**
 * スキル・アビリティシステムの型定義
 * 
 * このファイルには以下の型定義が含まれます：
 * - スキルの基本型とインターフェース
 * - スキル効果とターゲット関連の型
 * - スキル使用条件とエラー処理の型
 * - キャラクタースキルデータの型
 */

// =============================================================================
// 基本列挙型
// =============================================================================

/**
 * スキルの種別
 */
export enum SkillType {
    /** 攻撃スキル */
    ATTACK = 'attack',
    /** 回復スキル */
    HEAL = 'heal',
    /** バフスキル */
    BUFF = 'buff',
    /** デバフスキル */
    DEBUFF = 'debuff',
    /** 状態異常スキル */
    STATUS = 'status',
    /** 特殊スキル */
    SPECIAL = 'special'
}

/**
 * スキルの対象種別
 */
export enum TargetType {
    /** 自分自身 */
    SELF = 'self',
    /** 単体（敵） */
    SINGLE_ENEMY = 'single_enemy',
    /** 単体（味方） */
    SINGLE_ALLY = 'single_ally',
    /** 単体（任意） */
    SINGLE_ANY = 'single_any',
    /** 範囲（敵） */
    AREA_ENEMY = 'area_enemy',
    /** 範囲（味方） */
    AREA_ALLY = 'area_ally',
    /** 範囲（任意） */
    AREA_ANY = 'area_any',
    /** 全体（敵） */
    ALL_ENEMIES = 'all_enemies',
    /** 全体（味方） */
    ALL_ALLIES = 'all_allies',
    /** 全体（任意） */
    ALL_ANY = 'all_any'
}

/**
 * ダメージ種別
 */
export enum DamageType {
    /** 物理ダメージ */
    PHYSICAL = 'physical',
    /** 魔法ダメージ */
    MAGICAL = 'magical',
    /** 真ダメージ（防御無視） */
    TRUE = 'true',
    /** 回復 */
    HEAL = 'heal'
}

/**
 * 回復種別
 */
export enum HealType {
    /** 固定値回復 */
    FIXED = 'fixed',
    /** 割合回復 */
    PERCENTAGE = 'percentage',
    /** 能力値ベース回復 */
    STAT_BASED = 'stat_based'
}

/**
 * バフ・デバフ種別
 */
export enum BuffType {
    /** 攻撃力上昇 */
    ATTACK_UP = 'attack_up',
    /** 防御力上昇 */
    DEFENSE_UP = 'defense_up',
    /** 速度上昇 */
    SPEED_UP = 'speed_up',
    /** 命中率上昇 */
    ACCURACY_UP = 'accuracy_up',
    /** 回避率上昇 */
    EVASION_UP = 'evasion_up',
    /** 攻撃力低下 */
    ATTACK_DOWN = 'attack_down',
    /** 防御力低下 */
    DEFENSE_DOWN = 'defense_down',
    /** 速度低下 */
    SPEED_DOWN = 'speed_down',
    /** 命中率低下 */
    ACCURACY_DOWN = 'accuracy_down',
    /** 回避率低下 */
    EVASION_DOWN = 'evasion_down'
}

/**
 * 状態異常種別
 */
export enum StatusEffectType {
    /** 毒 */
    POISON = 'poison',
    /** 麻痺 */
    PARALYSIS = 'paralysis',
    /** 睡眠 */
    SLEEP = 'sleep',
    /** 混乱 */
    CONFUSION = 'confusion',
    /** 沈黙 */
    SILENCE = 'silence',
    /** 石化 */
    PETRIFICATION = 'petrification',
    /** 魅了 */
    CHARM = 'charm',
    /** 恐怖 */
    FEAR = 'fear'
}

/**
 * スキル使用条件エラー種別
 */
export enum SkillUsabilityError {
    /** MP不足 */
    INSUFFICIENT_MP = 'insufficient_mp',
    /** スキルがクールダウン中 */
    SKILL_ON_COOLDOWN = 'skill_on_cooldown',
    /** 使用回数制限に達している */
    USAGE_LIMIT_EXCEEDED = 'usage_limit_exceeded',
    /** レベル要件を満たしていない */
    LEVEL_REQUIREMENT_NOT_MET = 'level_requirement_not_met',
    /** 武器要件を満たしていない */
    WEAPON_REQUIREMENT_NOT_MET = 'weapon_requirement_not_met',
    /** 職業要件を満たしていない */
    JOB_REQUIREMENT_NOT_MET = 'job_requirement_not_met',
    /** 無効な対象 */
    INVALID_TARGET = 'invalid_target',
    /** 射程外 */
    OUT_OF_RANGE = 'out_of_range',
    /** スキルが見つからない */
    SKILL_NOT_FOUND = 'skill_not_found',
    /** キャラクターが行動済み */
    CHARACTER_ALREADY_ACTED = 'character_already_acted',
    /** キャラクターが状態異常で使用不可 */
    CHARACTER_STATUS_PREVENTS_USE = 'character_status_prevents_use'
}

// =============================================================================
// 基本インターフェース
// =============================================================================

/**
 * 位置情報
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * スキル効果の範囲形状
 */
export interface AreaOfEffect {
    /** 形状種別 */
    shape: 'single' | 'line' | 'cross' | 'square' | 'circle' | 'diamond';
    /** サイズ（半径またはサイズ） */
    size: number;
    /** 中心からの最小距離（ドーナツ形状用） */
    minRange?: number;
}

/**
 * スキル効果
 */
export interface SkillEffect {
    /** 効果種別 */
    type: 'damage' | 'heal' | 'buff' | 'debuff' | 'status';
    /** 効果値 */
    value: number;
    /** 持続時間（ターン数、0は即座に適用） */
    duration?: number;
    /** ダメージ種別（damage効果の場合） */
    damageType?: DamageType;
    /** 回復種別（heal効果の場合） */
    healType?: HealType;
    /** バフ種別（buff/debuff効果の場合） */
    buffType?: BuffType;
    /** 状態異常種別（status効果の場合） */
    statusType?: StatusEffectType;
    /** 成功確率（0-100） */
    successRate?: number;
}

/**
 * スキル習得条件
 */
export interface SkillLearnCondition {
    /** 必要レベル */
    level?: number;
    /** 前提スキル */
    prerequisiteSkills?: string[];
    /** 必要職業 */
    jobRequirement?: string;
    /** 必要アイテム */
    requiredItems?: string[];
}

/**
 * スキル使用条件
 */
export interface SkillUsageCondition {
    /** MP消費量 */
    mpCost: number;
    /** クールダウン（ターン数） */
    cooldown: number;
    /** 使用回数制限（0は無制限） */
    usageLimit: number;
    /** 必要レベル */
    levelRequirement: number;
    /** 必要武器種別 */
    weaponRequirement?: string[];
    /** 必要職業 */
    jobRequirement?: string;
    /** 使用可能な状態異常（この状態異常中でも使用可能） */
    allowedStatuses?: StatusEffectType[];
}

/**
 * スキルアニメーション情報
 */
export interface SkillAnimation {
    /** 詠唱アニメーション */
    castAnimation: string;
    /** 効果アニメーション */
    effectAnimation: string;
    /** ヒットアニメーション */
    hitAnimation?: string;
    /** アニメーション時間（ミリ秒） */
    duration: number;
    /** 音響効果 */
    soundEffect?: string;
}

/**
 * スキルデータ（JSONから読み込まれる静的データ）
 */
export interface SkillData {
    /** スキルID */
    id: string;
    /** スキル名 */
    name: string;
    /** スキル説明 */
    description: string;
    /** スキル種別 */
    skillType: SkillType;
    /** 対象種別 */
    targetType: TargetType;
    /** 射程 */
    range: number;
    /** 効果範囲 */
    areaOfEffect: AreaOfEffect;
    /** スキル効果 */
    effects: SkillEffect[];
    /** 使用条件 */
    usageCondition: SkillUsageCondition;
    /** 習得条件 */
    learnCondition: SkillLearnCondition;
    /** アニメーション情報 */
    animation: SkillAnimation;
    /** スキルアイコン */
    icon?: string;
    /** 優先度（AI用） */
    aiPriority?: number;
    /** 経験値ボーナス設定 */
    experienceBonus?: SkillExperienceBonus;
}

/**
 * スキル経験値ボーナス設定
 */
export interface SkillExperienceBonus {
    /** 基本経験値倍率 */
    baseMultiplier?: number;
    /** 固定ボーナス経験値 */
    fixedBonus?: number;
    /** 効果値に基づくボーナス倍率 */
    effectValueMultiplier?: number;
    /** 対象数に基づくボーナス */
    targetCountBonus?: number;
    /** クリティカル時の追加ボーナス */
    criticalBonus?: number;
    /** 特殊条件ボーナス */
    specialConditions?: SkillExperienceBonusCondition[];
}

/**
 * スキル経験値ボーナス条件
 */
export interface SkillExperienceBonusCondition {
    /** 条件種別 */
    type: 'low_hp' | 'high_damage' | 'multiple_targets' | 'status_effect' | 'combo';
    /** 条件値 */
    value?: number;
    /** ボーナス経験値 */
    bonus: number;
    /** 条件説明 */
    description?: string;
}

/**
 * スキル実行結果
 */
export interface SkillResult {
    /** 実行成功フラグ */
    success: boolean;
    /** 対象となったキャラクター */
    targets: string[];
    /** 各対象への効果結果 */
    effects: SkillEffectResult[];
    /** 消費MP */
    mpCost: number;
    /** エラー情報（失敗時） */
    error?: SkillUsabilityError;
    /** エラーメッセージ */
    errorMessage?: string;
    /** 追加情報 */
    additionalInfo?: Record<string, any>;
}

/**
 * 個別の効果結果
 */
export interface SkillEffectResult {
    /** 対象キャラクターID */
    targetId: string;
    /** 効果種別 */
    effectType: string;
    /** 実際の効果値 */
    actualValue: number;
    /** クリティカルヒット */
    isCritical?: boolean;
    /** 効果成功フラグ */
    success: boolean;
    /** 抵抗・回避フラグ */
    resisted?: boolean;
}

/**
 * スキル使用可能性チェック結果
 */
export interface SkillUsabilityResult {
    /** 使用可能フラグ */
    canUse: boolean;
    /** エラー種別（使用不可の場合） */
    error?: SkillUsabilityError;
    /** エラーメッセージ */
    message?: string;
    /** 不足MP（MP不足の場合） */
    missingMP?: number;
    /** 残りクールダウン（クールダウン中の場合） */
    remainingCooldown?: number;
    /** 残り使用回数 */
    remainingUses?: number;
}

/**
 * キャラクタースキルデータ（個別キャラクターのスキル状態）
 */
export interface CharacterSkillData {
    /** キャラクターID */
    characterId: string;
    /** 習得済みスキル */
    learnedSkills: string[];
    /** スキルクールダウン状態 */
    skillCooldowns: Map<string, number>;
    /** スキル使用回数カウント */
    skillUsageCounts: Map<string, number>;
    /** スキル習得履歴 */
    skillLearnHistory: SkillLearnRecord[];
    /** アクティブなバフ・デバフ効果 */
    activeEffects: ActiveSkillEffect[];
}

/**
 * スキル習得記録
 */
export interface SkillLearnRecord {
    /** スキルID */
    skillId: string;
    /** 習得時のレベル */
    learnedAtLevel: number;
    /** 習得日時 */
    learnedAt: Date;
    /** 習得方法 */
    learnMethod: 'level_up' | 'item' | 'event' | 'job_change';
}

/**
 * アクティブなスキル効果
 */
export interface ActiveSkillEffect {
    /** 効果ID */
    effectId: string;
    /** 効果の種別 */
    effectType: BuffType | StatusEffectType;
    /** 効果値 */
    value: number;
    /** 残り持続時間 */
    remainingDuration: number;
    /** 効果を付与したスキルID */
    sourceSkillId: string;
    /** 効果を付与したキャラクターID */
    casterId: string;
    /** 効果が付与された時刻 */
    appliedAt: Date;
}

/**
 * スキル実行コンテキスト
 */
export interface SkillExecutionContext {
    /** 使用者 */
    caster: string;
    /** スキルID */
    skillId: string;
    /** 対象位置 */
    targetPosition: Position;
    /** 戦場の状態 */
    battlefieldState: any; // 実際の戦場状態インターフェースに置き換え
    /** 現在のターン */
    currentTurn: number;
    /** 実行時刻 */
    executionTime: Date;
}

// =============================================================================
// 抽象基底クラス
// =============================================================================

/**
 * スキル基底クラス
 * 全てのスキルはこのクラスを継承する
 */
export abstract class Skill {
    /** スキルデータ */
    protected readonly data: SkillData;

    constructor(data: SkillData) {
        this.data = data;
    }

    // ゲッター
    get id(): string { return this.data.id; }
    get name(): string { return this.data.name; }
    get description(): string { return this.data.description; }
    get skillType(): SkillType { return this.data.skillType; }
    get targetType(): TargetType { return this.data.targetType; }
    get range(): number { return this.data.range; }
    get areaOfEffect(): AreaOfEffect { return this.data.areaOfEffect; }
    get effects(): SkillEffect[] { return this.data.effects; }
    get usageCondition(): SkillUsageCondition { return this.data.usageCondition; }
    get learnCondition(): SkillLearnCondition { return this.data.learnCondition; }
    get animation(): SkillAnimation { return this.data.animation; }

    /**
     * スキルを実行する
     * @param context 実行コンテキスト
     * @returns 実行結果
     */
    abstract execute(context: SkillExecutionContext): Promise<SkillResult>;

    /**
     * スキルが使用可能かチェックする
     * @param casterId 使用者ID
     * @param targetPosition 対象位置
     * @param battlefieldState 戦場状態
     * @returns 使用可能性結果
     */
    abstract canUse(
        casterId: string,
        targetPosition: Position,
        battlefieldState: any
    ): SkillUsabilityResult;

    /**
     * 有効な対象位置を取得する
     * @param casterPosition 使用者位置
     * @param battlefieldState 戦場状態
     * @returns 有効な対象位置の配列
     */
    abstract getValidTargets(
        casterPosition: Position,
        battlefieldState: any
    ): Position[];

    /**
     * スキルの効果範囲内の位置を取得する
     * @param targetPosition 対象位置
     * @returns 効果範囲内の位置配列
     */
    getAffectedPositions(targetPosition: Position): Position[] {
        const positions: Position[] = [];
        const { shape, size } = this.areaOfEffect;

        switch (shape) {
            case 'single':
                positions.push(targetPosition);
                break;
            case 'line':
                // 直線状の範囲
                for (let i = 0; i <= size; i++) {
                    positions.push({ x: targetPosition.x + i, y: targetPosition.y });
                }
                break;
            case 'cross':
                // 十字状の範囲
                positions.push(targetPosition);
                for (let i = 1; i <= size; i++) {
                    positions.push({ x: targetPosition.x + i, y: targetPosition.y });
                    positions.push({ x: targetPosition.x - i, y: targetPosition.y });
                    positions.push({ x: targetPosition.x, y: targetPosition.y + i });
                    positions.push({ x: targetPosition.x, y: targetPosition.y - i });
                }
                break;
            case 'square':
                // 正方形の範囲
                for (let dx = -size; dx <= size; dx++) {
                    for (let dy = -size; dy <= size; dy++) {
                        positions.push({ x: targetPosition.x + dx, y: targetPosition.y + dy });
                    }
                }
                break;
            case 'circle':
                // 円形の範囲
                for (let dx = -size; dx <= size; dx++) {
                    for (let dy = -size; dy <= size; dy++) {
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance <= size) {
                            positions.push({ x: targetPosition.x + dx, y: targetPosition.y + dy });
                        }
                    }
                }
                break;
            case 'diamond':
                // ダイヤモンド形の範囲
                for (let dx = -size; dx <= size; dx++) {
                    for (let dy = -size; dy <= size; dy++) {
                        if (Math.abs(dx) + Math.abs(dy) <= size) {
                            positions.push({ x: targetPosition.x + dx, y: targetPosition.y + dy });
                        }
                    }
                }
                break;
        }

        return positions;
    }
}

// =============================================================================
// ユーティリティ型
// =============================================================================

/**
 * スキル検索フィルター
 */
export interface SkillFilter {
    /** スキル種別 */
    skillType?: SkillType;
    /** 対象種別 */
    targetType?: TargetType;
    /** 最小レベル */
    minLevel?: number;
    /** 最大レベル */
    maxLevel?: number;
    /** 職業要件 */
    jobRequirement?: string;
    /** 使用可能フラグ */
    usableOnly?: boolean;
}

/**
 * スキル統計情報
 */
export interface SkillStatistics {
    /** 総使用回数 */
    totalUsageCount: number;
    /** 成功回数 */
    successCount: number;
    /** 失敗回数 */
    failureCount: number;
    /** 平均ダメージ */
    averageDamage?: number;
    /** 最大ダメージ */
    maxDamage?: number;
    /** クリティカル回数 */
    criticalCount?: number;
    /** 最後に使用した日時 */
    lastUsedAt?: Date;
}

/**
 * スキルバランス調整用データ
 */
export interface SkillBalanceData {
    /** スキルID */
    skillId: string;
    /** 使用頻度 */
    usageFrequency: number;
    /** 勝率への影響 */
    winRateImpact: number;
    /** プレイヤー評価 */
    playerRating?: number;
    /** 調整が必要かのフラグ */
    needsBalancing: boolean;
    /** 推奨調整内容 */
    suggestedChanges?: string[];
}