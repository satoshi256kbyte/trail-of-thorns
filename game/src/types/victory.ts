/**
 * 勝利条件システムの型定義
 * ステージの目標、勝利条件、敗北条件を管理
 */

import { Position } from './gameplay';

/**
 * 目標種別
 */
export enum ObjectiveType {
  DEFEAT_BOSS = 'defeat_boss', // ボス撃破
  DEFEAT_ALL_ENEMIES = 'defeat_all_enemies', // 全滅
  REACH_POSITION = 'reach_position', // 到達
  SURVIVE_TURNS = 'survive_turns', // 生存
  PROTECT_UNIT = 'protect_unit', // ユニット保護
  COLLECT_ITEMS = 'collect_items', // アイテム収集
  CUSTOM = 'custom', // カスタム
}

/**
 * 勝利条件種別
 */
export enum VictoryConditionType {
  DEFEAT_BOSS = 'defeat_boss',
  DEFEAT_ALL_ENEMIES = 'defeat_all_enemies',
  REACH_POSITION = 'reach_position',
  SURVIVE_TURNS = 'survive_turns',
  PROTECT_UNIT = 'protect_unit',
  COLLECT_ITEMS = 'collect_items',
  CUSTOM = 'custom',
}

/**
 * 敗北条件種別
 */
export enum DefeatConditionType {
  ALL_UNITS_DEFEATED = 'all_units_defeated', // 全ユニット撃破
  MAIN_CHARACTER_DEFEATED = 'main_character_defeated', // 主人公撃破
  PROTECTED_UNIT_DEFEATED = 'protected_unit_defeated', // 保護対象撃破
  TURN_LIMIT_EXCEEDED = 'turn_limit_exceeded', // ターン制限超過
  CUSTOM = 'custom', // カスタム
}

/**
 * 目標進捗
 */
export interface ObjectiveProgress {
  current: number; // 現在値
  target: number; // 目標値
  percentage: number; // 達成率（0-100）
}

/**
 * 目標固有データ
 */
export interface ObjectiveTargetData {
  // ボス撃破目標
  bossId?: string;

  // 到達目標
  targetPosition?: Position;
  targetArea?: Position[];

  // 生存目標
  surviveTurns?: number;

  // 保護目標
  protectUnitId?: string;

  // アイテム収集目標
  itemIds?: string[];
  itemCount?: number;

  // カスタム目標
  customCondition?: (gameState: any) => boolean;
}

/**
 * 目標定義
 */
export interface Objective {
  id: string;
  type: ObjectiveType;
  description: string;
  isRequired: boolean; // 必須目標かどうか
  isComplete: boolean; // 達成済みかどうか
  progress: ObjectiveProgress;

  // 目標種別固有のデータ
  targetData?: ObjectiveTargetData;
}

/**
 * 条件固有データ
 */
export interface ConditionData {
  targetUnitId?: string;
  targetPosition?: Position;
  turnLimit?: number;
  itemIds?: string[];
  customData?: Record<string, any>;
}

/**
 * 勝利条件
 */
export interface VictoryCondition {
  id: string;
  type: VictoryConditionType;
  description: string;
  isRequired: boolean; // 必須条件かどうか

  // 条件評価関数
  evaluate: (gameState: any) => boolean;

  // 条件固有データ
  conditionData?: ConditionData;
}

/**
 * 敗北条件
 */
export interface DefeatCondition {
  id: string;
  type: DefeatConditionType;
  description: string;

  // 条件評価関数
  evaluate: (gameState: any) => boolean;

  // 条件固有データ
  conditionData?: ConditionData;
}

/**
 * 勝利判定結果
 */
export interface VictoryCheckResult {
  isVictory: boolean;
  satisfiedConditions: string[]; // 満たされた条件ID
  remainingConditions: string[]; // 残りの条件ID
  message?: string;
}

/**
 * 敗北判定結果
 */
export interface DefeatCheckResult {
  isDefeat: boolean;
  triggeredCondition?: string; // 発動した敗北条件ID
  message?: string;
}

/**
 * ゲーム結果
 */
export interface GameResult {
  result: 'victory' | 'defeat';
  timestamp: number;
  turnCount: number;
  message: string;
}
