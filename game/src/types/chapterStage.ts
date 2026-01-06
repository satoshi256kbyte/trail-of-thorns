/**
 * 章・ステージ管理システムの型定義
 * Chapter-Stage Management System Type Definitions
 */

/**
 * 章データ
 * Chapter Data
 */
export interface ChapterData {
  /** 章ID */
  id: string;
  /** 章名 */
  name: string;
  /** ストーリー説明 */
  storyDescription: string;
  /** ステージIDリスト */
  stageIds: string[];
  /** 推奨レベル */
  recommendedLevel: number;
  /** 解放条件（オプション） */
  unlockCondition?: ChapterUnlockCondition;
}

/**
 * 章状態
 * Chapter State
 */
export interface ChapterState {
  /** 章ID */
  chapterId: string;
  /** 現在のステージインデックス */
  currentStageIndex: number;
  /** ロストキャラクターIDリスト */
  lostCharacterIds: string[];
  /** 利用可能なキャラクターIDリスト */
  availableCharacterIds: string[];
  /** 完了済みステージIDリスト */
  completedStageIds: string[];
  /** 章完了フラグ */
  isCompleted: boolean;
  /** 開始時刻（タイムスタンプ） */
  startTime: number;
  /** プレイ時間（ミリ秒） */
  playTime: number;
}

/**
 * ステージメタデータ（章・ステージ管理用）
 * Stage Metadata (for chapter-stage management)
 */
export interface StageMetadata {
  /** ステージID */
  id: string;
  /** ステージ名 */
  name: string;
  /** 所属章ID */
  chapterId: string;
  /** 難易度 */
  difficulty: number;
  /** 推奨レベル */
  recommendedLevel: number;
  /** 解放条件 */
  unlockCondition: StageUnlockCondition;
  /** 報酬リスト */
  rewards: StageReward[];
}

/**
 * ステージ解放条件
 * Stage Unlock Condition
 */
export interface StageUnlockCondition {
  /** 条件タイプ */
  type: 'PREVIOUS_STAGE' | 'MULTIPLE_STAGES' | 'CHAPTER_COMPLETE';
  /** 必要なステージIDリスト */
  requiredStageIds: string[];
}

/**
 * ステージ報酬
 * Stage Reward
 */
export interface StageReward {
  /** 報酬タイプ */
  type: 'EXPERIENCE' | 'ITEM' | 'ROSE_ESSENCE' | 'CHARACTER';
  /** 報酬ID（アイテムIDやキャラクターID） */
  id?: string;
  /** 報酬量 */
  amount: number;
}

/**
 * ステージ進行状況
 * Stage Progress
 */
export interface StageProgress {
  /** ステージID */
  stageId: string;
  /** 解放済みフラグ */
  isUnlocked: boolean;
  /** 完了済みフラグ */
  isCompleted: boolean;
  /** 完了時刻（タイムスタンプ、オプション） */
  completionTime?: number;
  /** 獲得済み報酬リスト */
  rewards: StageReward[];
}

/**
 * パーティ編成
 * Party Composition
 */
export interface PartyComposition {
  /** パーティメンバーのキャラクターIDリスト（最大6人） */
  members: string[];
  /** フォーメーションタイプ */
  formation: FormationType;
}

/**
 * フォーメーションタイプ
 * Formation Type
 */
export type FormationType = 'BALANCED' | 'OFFENSIVE' | 'DEFENSIVE' | 'CUSTOM';

/**
 * パーティ編成検証エラータイプ
 * Party Composition Validation Error Type
 */
export enum PartyCompositionError {
  /** パーティが満員 */
  PARTY_FULL = 'PARTY_FULL',
  /** キャラクターがロスト状態 */
  CHARACTER_LOST = 'CHARACTER_LOST',
  /** キャラクターが重複 */
  CHARACTER_DUPLICATE = 'CHARACTER_DUPLICATE',
  /** キャラクターが利用不可 */
  CHARACTER_NOT_AVAILABLE = 'CHARACTER_NOT_AVAILABLE',
}

/**
 * パーティ編成検証結果
 * Party Composition Validation Result
 */
export interface PartyCompositionValidationResult {
  /** 有効フラグ */
  isValid: boolean;
  /** エラーリスト */
  errors: PartyCompositionError[];
}

/**
 * セーブデータ
 * Save Data
 */
export interface SaveData {
  /** バージョン */
  version: string;
  /** タイムスタンプ */
  timestamp: number;
  /** 章状態データ */
  chapterState: ChapterStateData;
  /** ステージ進行状況データ */
  stageProgress: StageProgressData;
  /** パーティ編成 */
  partyComposition: PartyComposition;
  /** プレイ時間（ミリ秒） */
  playTime: number;
}

/**
 * 章状態データ（永続化用）
 * Chapter State Data (for persistence)
 */
export interface ChapterStateData {
  /** バージョン */
  version: string;
  /** タイムスタンプ */
  timestamp: number;
  /** 章ID */
  chapterId: string;
  /** 現在のステージインデックス */
  currentStageIndex: number;
  /** ロストキャラクターIDリスト */
  lostCharacterIds: string[];
  /** 利用可能なキャラクターIDリスト */
  availableCharacterIds: string[];
  /** 完了済みステージIDリスト */
  completedStageIds: string[];
  /** 章完了フラグ */
  isCompleted: boolean;
  /** 開始時刻（タイムスタンプ） */
  startTime: number;
  /** プレイ時間（ミリ秒） */
  playTime: number;
}

/**
 * ステージ進行状況データ（永続化用）
 * Stage Progress Data (for persistence)
 */
export interface StageProgressData {
  /** ステージ進行状況リスト */
  stages: StageProgress[];
}

/**
 * セーブスロット
 * Save Slot
 */
export interface SaveSlot {
  /** スロットID */
  slotId: number;
  /** セーブデータ（nullの場合は空スロット） */
  saveData: SaveData | null;
  /** 最終保存時刻（タイムスタンプ） */
  lastSaved: number;
}

/**
 * 章解放条件
 * Chapter Unlock Condition
 */
export interface ChapterUnlockCondition {
  /** 条件タイプ */
  type: 'CHAPTER_COMPLETE' | 'STAGE_COMPLETE' | 'LEVEL_REQUIREMENT';
  /** 必要な章ID（オプション） */
  requiredChapterId?: string;
  /** 必要なステージID（オプション） */
  requiredStageId?: string;
  /** 必要なレベル（オプション） */
  requiredLevel?: number;
}

/**
 * 章・ステージ管理システムエラー
 * Chapter-Stage Management System Error
 */
export enum ChapterStageError {
  // 章管理エラー
  /** 章が見つからない */
  CHAPTER_NOT_FOUND = 'CHAPTER_NOT_FOUND',
  /** 章が解放されていない */
  CHAPTER_NOT_UNLOCKED = 'CHAPTER_NOT_UNLOCKED',
  /** 章が既に開始されている */
  CHAPTER_ALREADY_STARTED = 'CHAPTER_ALREADY_STARTED',
  /** 章が初期化されていない */
  CHAPTER_NOT_INITIALIZED = 'CHAPTER_NOT_INITIALIZED',

  // パーティ編成エラー
  /** パーティが満員 */
  PARTY_FULL = 'PARTY_FULL',
  /** キャラクターがロスト状態 */
  CHARACTER_LOST = 'CHARACTER_LOST',
  /** キャラクターが利用不可 */
  CHARACTER_NOT_AVAILABLE = 'CHARACTER_NOT_AVAILABLE',
  /** キャラクターが重複 */
  CHARACTER_DUPLICATE = 'CHARACTER_DUPLICATE',
  /** 無効なパーティ編成 */
  INVALID_PARTY_COMPOSITION = 'INVALID_PARTY_COMPOSITION',

  // ステージ進行エラー
  /** ステージが見つからない */
  STAGE_NOT_FOUND = 'STAGE_NOT_FOUND',
  /** ステージが解放されていない */
  STAGE_NOT_UNLOCKED = 'STAGE_NOT_UNLOCKED',
  /** ステージが既に完了している */
  STAGE_ALREADY_COMPLETED = 'STAGE_ALREADY_COMPLETED',
  /** ステージが初期化されていない */
  STAGE_NOT_INITIALIZED = 'STAGE_NOT_INITIALIZED',

  // セーブ・ロードエラー
  /** セーブデータが破損している */
  SAVE_DATA_CORRUPTED = 'SAVE_DATA_CORRUPTED',
  /** セーブスロットが見つからない */
  SAVE_SLOT_NOT_FOUND = 'SAVE_SLOT_NOT_FOUND',
  /** 保存に失敗 */
  SAVE_FAILED = 'SAVE_FAILED',
  /** 読み込みに失敗 */
  LOAD_FAILED = 'LOAD_FAILED',

  // データエラー
  /** データ読み込みに失敗 */
  DATA_LOAD_FAILED = 'DATA_LOAD_FAILED',
  /** データ検証に失敗 */
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
}

/**
 * 章・ステージ管理システムエラー情報
 * Chapter-Stage Management System Error Info
 */
export interface ChapterStageErrorInfo {
  /** エラータイプ */
  error: ChapterStageError;
  /** エラーメッセージ */
  message: string;
  /** コンテキスト情報 */
  context?: Record<string, unknown>;
}

/**
 * 章・ステージ管理システム処理結果
 * Chapter-Stage Management System Result
 */
export interface ChapterStageResult {
  /** 成功フラグ */
  success: boolean;
  /** エラータイプ（失敗時） */
  error?: ChapterStageError;
  /** メッセージ */
  message: string;
  /** 詳細情報 */
  details?: Record<string, unknown>;
}
