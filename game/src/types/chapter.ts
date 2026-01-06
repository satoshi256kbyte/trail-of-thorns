/**
 * Chapter and Stage Management Type Definitions
 * 章・ステージ管理システムの型定義
 */

import { StageData } from './gameplay';

/**
 * Unlock condition types
 * 解放条件の種類
 */
export type UnlockConditionType = 'NONE' | 'PREVIOUS_CHAPTER' | 'STAGE_COMPLETE';

/**
 * Unlock condition interface
 * 解放条件インターフェース
 */
export interface UnlockCondition {
  type: UnlockConditionType;
  requiredChapterId?: string;
  requiredStageId?: string;
}

/**
 * Chapter data structure
 * 章データ構造
 */
export interface ChapterData {
  id: string;
  name: string;
  storyDescription: string;
  stages: StageData[];
  recommendedLevel: number;
  unlockCondition?: UnlockCondition;
}

/**
 * Chapter state structure
 * 章状態構造
 */
export interface ChapterState {
  chapterId: string;
  currentStageIndex: number;
  lostCharacterIds: string[];
  availableCharacterIds: string[];
  completedStageIds: string[];
  isCompleted: boolean;
  startTime: number;
  playTime: number;
}

/**
 * Chapter state data for serialization
 * シリアライズ用の章状態データ
 */
export interface ChapterStateData {
  chapterId: string;
  currentStageIndex: number;
  lostCharacterIds: string[];
  availableCharacterIds: string[];
  completedStageIds: string[];
  isCompleted: boolean;
  startTime: number;
  playTime: number;
  version: string;
  timestamp: number;
}

/**
 * Chapter management error types
 * 章管理エラー種別
 */
export enum ChapterError {
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  CHAPTER_NOT_UNLOCKED = 'CHAPTER_NOT_UNLOCKED',
  CHAPTER_ALREADY_STARTED = 'CHAPTER_ALREADY_STARTED',
  CHAPTER_NOT_INITIALIZED = 'CHAPTER_NOT_INITIALIZED',
  CHAPTER_DATA_LOAD_FAILED = 'CHAPTER_DATA_LOAD_FAILED',
  CHAPTER_STATE_SAVE_FAILED = 'CHAPTER_STATE_SAVE_FAILED',
  CHAPTER_STATE_LOAD_FAILED = 'CHAPTER_STATE_LOAD_FAILED',
  INVALID_CHAPTER_DATA = 'INVALID_CHAPTER_DATA',
  INVALID_CHAPTER_STATE = 'INVALID_CHAPTER_STATE',
}

/**
 * Chapter operation result
 * 章操作結果
 */
export interface ChapterResult {
  success: boolean;
  error?: ChapterError;
  message?: string;
  details?: any;
}

/**
 * Formation types
 * 陣形タイプ
 */
export type FormationType = 'BALANCED' | 'OFFENSIVE' | 'DEFENSIVE' | 'CUSTOM';

/**
 * Party composition structure
 * パーティ編成構造
 */
export interface PartyComposition {
  members: string[]; // キャラクターID配列（最大6人）
  formation: FormationType;
}

/**
 * Party validation error types
 * パーティ検証エラー種別
 */
export enum PartyValidationError {
  PARTY_FULL = 'PARTY_FULL',
  CHARACTER_LOST = 'CHARACTER_LOST',
  CHARACTER_DUPLICATE = 'CHARACTER_DUPLICATE',
  CHARACTER_NOT_AVAILABLE = 'CHARACTER_NOT_AVAILABLE',
  PARTY_EMPTY = 'PARTY_EMPTY',
}

/**
 * Party validation result
 * パーティ検証結果
 */
export interface PartyValidationResult {
  isValid: boolean;
  errors: PartyValidationError[];
}
