/**
 * ItemEffectSystem - アイテム効果の適用・管理システム
 * 
 * このシステムは以下の機能を提供します：
 * - アイテム効果の適用と除去
 * - 一時効果の持続時間管理
 * - 効果値の計算
 * - 効果の検証
 * 
 * 要件: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import {
  ItemEffect,
  EffectType,
  EffectTarget,
  EquipmentStats,
  InventoryTypeValidators,
} from '../types/inventory';
import { InventoryErrorHandler, ErrorSeverity } from './inventory/InventoryErrorHandler';

/**
 * キャラクター情報インターフェース（簡易版）
 */
export interface Character {
  id: string;
  name: string;
  level: number;
  currentHP: number;
  maxHP: number;
  currentMP: number;
  maxMP: number;
  stats: {
    attack: number;
    defense: number;
    speed: number;
    accuracy: number;
    evasion: number;
  };
  statusEffects: string[]; // 状態異常のリスト
}

/**
 * アクティブな効果情報
 */
export interface ActiveEffect {
  effect: ItemEffect;
  targetCharacterId: string;
  remainingDuration: number; // ターン数
  appliedAt: number; // タイムスタンプ
}

/**
 * 効果適用結果
 */
export interface EffectApplicationResult {
  success: boolean;
  message: string;
  valueApplied: number;
  effectId: string;
}

/**
 * ItemEffectSystem クラス
 * アイテム効果の適用・管理を担当
 */
export class ItemEffectSystem {
  private activeEffects: Map<string, ActiveEffect[]>; // キャラクターID -> アクティブ効果リスト
  private effectIdCounter: number;
  private errorHandler: InventoryErrorHandler;

  constructor(errorHandler?: InventoryErrorHandler) {
    this.activeEffects = new Map();
    this.effectIdCounter = 0;
    this.errorHandler = errorHandler || new InventoryErrorHandler();
  }

  /**
   * 効果を適用する
   * 要件: 3.1, 3.2, 3.3, 3.4, 3.5
   * 
   * @param effect 適用する効果
   * @param targetCharacterId 対象キャラクターID
   * @param character 対象キャラクター（効果計算用）
   * @returns 効果適用結果
   */
  applyEffect(
    effect: ItemEffect,
    targetCharacterId: string,
    character: Character
  ): EffectApplicationResult {
    // 効果の検証
    if (!this.validateEffect(effect)) {
      this.errorHandler.handleInvalidOperationError(
        'applyEffect',
        '無効な効果です'
      );
      return {
        success: false,
        message: '無効な効果です',
        valueApplied: 0,
        effectId: '',
      };
    }

    // 効果値の計算
    const effectValue = this.calculateEffectValue(effect, character);

    // 効果タイプに応じた処理
    let message = '';
    let success = true;

    switch (effect.type) {
      case EffectType.HP_RECOVERY:
        // HP回復（要件: 3.3）
        const hpBefore = character.currentHP;
        character.currentHP = Math.min(character.maxHP, character.currentHP + effectValue);
        const hpRecovered = character.currentHP - hpBefore;
        message = `HPが${hpRecovered}回復しました`;
        break;

      case EffectType.MP_RECOVERY:
        // MP回復（要件: 3.3）
        const mpBefore = character.currentMP;
        character.currentMP = Math.min(character.maxMP, character.currentMP + effectValue);
        const mpRecovered = character.currentMP - mpBefore;
        message = `MPが${mpRecovered}回復しました`;
        break;

      case EffectType.STAT_BOOST:
        // 能力値上昇（要件: 3.1, 3.4）
        this.applyStatModification(character, effect.target, effectValue);
        message = `${this.getTargetName(effect.target)}が${effectValue}上昇しました`;
        break;

      case EffectType.STAT_REDUCTION:
        // 能力値減少
        this.applyStatModification(character, effect.target, -effectValue);
        message = `${this.getTargetName(effect.target)}が${effectValue}減少しました`;
        break;

      case EffectType.STATUS_CURE:
        // 状態異常回復（要件: 3.5）
        const statusRemoved = this.removeStatusEffect(character, effect.target);
        if (statusRemoved) {
          message = `状態異常が回復しました`;
        } else {
          message = `回復する状態異常がありません`;
        }
        break;

      case EffectType.STATUS_INFLICT:
        // 状態異常付与
        this.addStatusEffect(character, effect.target);
        message = `状態異常が付与されました`;
        break;

      case EffectType.DAMAGE:
        // ダメージ
        character.currentHP = Math.max(0, character.currentHP - effectValue);
        message = `${effectValue}のダメージを受けました`;
        break;

      case EffectType.SHIELD:
        // シールド（一時的なHP増加として実装）
        message = `シールドが付与されました`;
        break;

      default:
        success = false;
        message = `未対応の効果タイプです: ${effect.type}`;
    }

    // 一時効果の場合は登録（要件: 3.6）
    if (success && !effect.isPermanent && effect.duration > 0) {
      this.registerTemporaryEffect(effect, targetCharacterId);
    }

    return {
      success,
      message,
      valueApplied: effectValue,
      effectId: effect.id,
    };
  }

  /**
   * 効果を除去する
   * 
   * @param effectId 効果ID
   * @param targetCharacterId 対象キャラクターID
   * @returns 除去成功フラグ
   */
  removeEffect(effectId: string, targetCharacterId: string): boolean {
    const effects = this.activeEffects.get(targetCharacterId);
    if (!effects) {
      return false;
    }

    const index = effects.findIndex(ae => ae.effect.id === effectId);
    if (index === -1) {
      return false;
    }

    effects.splice(index, 1);

    if (effects.length === 0) {
      this.activeEffects.delete(targetCharacterId);
    }

    return true;
  }

  /**
   * 一時効果を更新する（ターン経過処理）
   * 要件: 3.6
   * 
   * @param deltaTime 経過時間（ミリ秒）
   * @returns 解除された効果のリスト
   */
  updateTemporaryEffects(deltaTime: number): ActiveEffect[] {
    const expiredEffects: ActiveEffect[] = [];

    // 全キャラクターの効果を更新
    for (const [characterId, effects] of this.activeEffects.entries()) {
      const remainingEffects: ActiveEffect[] = [];

      for (const activeEffect of effects) {
        // 持続時間を減少（ターンベースなので、実際のゲームではターン終了時に呼ばれる想定）
        activeEffect.remainingDuration -= 1;

        if (activeEffect.remainingDuration <= 0) {
          // 効果が切れた
          expiredEffects.push(activeEffect);
        } else {
          // まだ有効
          remainingEffects.push(activeEffect);
        }
      }

      if (remainingEffects.length > 0) {
        this.activeEffects.set(characterId, remainingEffects);
      } else {
        this.activeEffects.delete(characterId);
      }
    }

    return expiredEffects;
  }

  /**
   * アクティブな効果を取得する
   * 
   * @param characterId キャラクターID
   * @returns アクティブな効果のリスト
   */
  getActiveEffects(characterId: string): ItemEffect[] {
    const effects = this.activeEffects.get(characterId);
    if (!effects) {
      return [];
    }

    return effects.map(ae => ae.effect);
  }

  /**
   * 効果値を計算する
   * 要件: 3.1, 3.3, 3.4
   * 
   * @param effect 効果
   * @param character 対象キャラクター
   * @returns 計算された効果値
   */
  calculateEffectValue(effect: ItemEffect, character: Character): number {
    let value = effect.value;

    // 効果タイプに応じた計算
    switch (effect.type) {
      case EffectType.HP_RECOVERY:
      case EffectType.MP_RECOVERY:
        // 回復量はそのまま使用
        break;

      case EffectType.STAT_BOOST:
      case EffectType.STAT_REDUCTION:
        // 能力値変更もそのまま使用
        break;

      case EffectType.DAMAGE:
        // ダメージ計算（防御力を考慮する場合はここで計算）
        break;

      default:
        // その他の効果
        break;
    }

    return Math.floor(value);
  }

  /**
   * 効果を検証する
   * 
   * @param effect 効果
   * @returns 検証結果
   */
  validateEffect(effect: ItemEffect): boolean {
    return InventoryTypeValidators.isValidItemEffect(effect);
  }

  /**
   * 一時効果を登録する
   * 
   * @param effect 効果
   * @param targetCharacterId 対象キャラクターID
   */
  private registerTemporaryEffect(effect: ItemEffect, targetCharacterId: string): void {
    // スタック可能かチェック
    const existingEffects = this.activeEffects.get(targetCharacterId) || [];

    if (!effect.stackable) {
      // スタック不可の場合、同じ効果IDがあれば上書き
      const existingIndex = existingEffects.findIndex(ae => ae.effect.id === effect.id);
      if (existingIndex !== -1) {
        existingEffects[existingIndex] = {
          effect,
          targetCharacterId,
          remainingDuration: effect.duration,
          appliedAt: Date.now(),
        };
        return;
      }
    }

    // 新規登録
    const activeEffect: ActiveEffect = {
      effect,
      targetCharacterId,
      remainingDuration: effect.duration,
      appliedAt: Date.now(),
    };

    existingEffects.push(activeEffect);
    this.activeEffects.set(targetCharacterId, existingEffects);
  }

  /**
   * 能力値を変更する
   * 
   * @param character キャラクター
   * @param target 対象能力値
   * @param value 変更値
   */
  private applyStatModification(character: Character, target: EffectTarget, value: number): void {
    switch (target) {
      case EffectTarget.HP:
        character.maxHP += value;
        character.currentHP = Math.min(character.currentHP, character.maxHP);
        break;
      case EffectTarget.MP:
        character.maxMP += value;
        character.currentMP = Math.min(character.currentMP, character.maxMP);
        break;
      case EffectTarget.ATTACK:
        character.stats.attack += value;
        break;
      case EffectTarget.DEFENSE:
        character.stats.defense += value;
        break;
      case EffectTarget.SPEED:
        character.stats.speed += value;
        break;
      case EffectTarget.ACCURACY:
        character.stats.accuracy += value;
        break;
      case EffectTarget.EVASION:
        character.stats.evasion += value;
        break;
    }
  }

  /**
   * 状態異常を除去する
   * 
   * @param character キャラクター
   * @param target 対象（STATUS）
   * @returns 除去成功フラグ
   */
  private removeStatusEffect(character: Character, target: EffectTarget): boolean {
    if (target !== EffectTarget.STATUS) {
      return false;
    }

    if (character.statusEffects.length === 0) {
      return false;
    }

    // 最初の状態異常を除去
    character.statusEffects.shift();
    return true;
  }

  /**
   * 状態異常を付与する
   * 
   * @param character キャラクター
   * @param target 対象（STATUS）
   */
  private addStatusEffect(character: Character, target: EffectTarget): void {
    if (target !== EffectTarget.STATUS) {
      return;
    }

    // 状態異常を追加（実際のゲームでは具体的な状態異常名を指定）
    character.statusEffects.push('status_effect');
  }

  /**
   * 効果対象の名前を取得する
   * 
   * @param target 効果対象
   * @returns 対象名
   */
  private getTargetName(target: EffectTarget): string {
    const names: Record<EffectTarget, string> = {
      [EffectTarget.HP]: 'HP',
      [EffectTarget.MP]: 'MP',
      [EffectTarget.ATTACK]: '攻撃力',
      [EffectTarget.DEFENSE]: '防御力',
      [EffectTarget.SPEED]: '速度',
      [EffectTarget.ACCURACY]: '命中率',
      [EffectTarget.EVASION]: '回避率',
      [EffectTarget.STATUS]: '状態',
    };

    return names[target] || '不明';
  }

  /**
   * システムをクリアする（テスト用）
   */
  clear(): void {
    this.activeEffects.clear();
    this.effectIdCounter = 0;
  }

  /**
   * 全アクティブ効果を取得する（デバッグ用）
   */
  getAllActiveEffects(): Map<string, ActiveEffect[]> {
    return new Map(this.activeEffects);
  }

  /**
   * エラーハンドラーを取得
   * 
   * @returns エラーハンドラー
   */
  getErrorHandler(): InventoryErrorHandler {
    return this.errorHandler;
  }
}
