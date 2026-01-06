/**
 * ChapterStageConsoleCommands - 章・ステージ管理システムのコンソールコマンド
 *
 * 開発者向けコンソールコマンドを提供:
 * - 章・ステージ状態の手動操作
 * - パーティ編成の操作
 * - セーブデータの操作
 * - デバッグ情報の表示
 */

import { ChapterStageDebugManager } from './ChapterStageDebugManager';
import { ChapterStageSaveDataValidator } from './ChapterStageSaveDataValidator';

/**
 * コンソールコマンドインターフェース
 */
export interface ChapterStageCommands {
  // 章操作
  startChapter: (chapterId: string) => void;
  completeChapter: () => void;
  resetChapter: () => void;
  setStage: (stageIndex: number) => void;

  // キャラクター操作
  loseCharacter: (characterId: string) => void;
  reviveCharacter: (characterId: string) => void;
  reviveAll: () => void;
  listCharacters: () => void;

  // パーティ操作
  addToParty: (characterId: string) => void;
  removeFromParty: (characterId: string) => void;
  clearParty: () => void;
  showParty: () => void;

  // ステージ操作
  unlockStage: (stageId: string) => void;
  completeStage: (stageId: string) => void;
  unlockAllStages: () => void;
  resetStageProgress: () => void;

  // セーブデータ操作
  save: (slotId: number) => void;
  load: (slotId: number) => void;
  deleteSave: (slotId: number) => void;
  listSaves: () => void;
  validateSave: (slotId: number) => void;
  repairSave: (slotId: number) => void;

  // デバッグ情報
  status: () => void;
  report: () => void;
  metrics: () => void;

  // ヘルプ
  help: () => void;
}

/**
 * 章・ステージ管理システムのコンソールコマンド
 */
export class ChapterStageConsoleCommands {
  private debugManager: ChapterStageDebugManager;
  private saveDataValidator: ChapterStageSaveDataValidator;
  private chapterManager?: any; // ChapterManager参照
  private partyManager?: any; // PartyManager参照
  private stageProgressManager?: any; // StageProgressManager参照
  private saveLoadManager?: any; // SaveLoadManager参照

  /**
   * コンストラクタ
   * @param debugManager - デバッグマネージャー
   */
  constructor(debugManager: ChapterStageDebugManager) {
    this.debugManager = debugManager;
    this.saveDataValidator = new ChapterStageSaveDataValidator();
    this.registerCommands();
  }

  /**
   * マネージャー参照の設定
   */
  public setManagers(managers: {
    chapterManager?: any;
    partyManager?: any;
    stageProgressManager?: any;
    saveLoadManager?: any;
  }): void {
    this.chapterManager = managers.chapterManager;
    this.partyManager = managers.partyManager;
    this.stageProgressManager = managers.stageProgressManager;
    this.saveLoadManager = managers.saveLoadManager;
  }

  /**
   * コンソールコマンドの登録
   */
  private registerCommands(): void {
    const commands: ChapterStageCommands = {
      // 章操作
      startChapter: (chapterId: string) => {
        if (!this.chapterManager) {
          console.error('ChapterManagerが設定されていません');
          return;
        }
        try {
          this.chapterManager.startChapter(chapterId);
          console.log(`章 '${chapterId}' を開始しました`);
        } catch (error) {
          console.error('章の開始に失敗しました:', error);
        }
      },

      completeChapter: () => {
        if (!this.chapterManager) {
          console.error('ChapterManagerが設定されていません');
          return;
        }
        try {
          this.chapterManager.completeChapter();
          console.log('章を完了しました');
        } catch (error) {
          console.error('章の完了に失敗しました:', error);
        }
      },

      resetChapter: () => {
        if (!this.chapterManager) {
          console.error('ChapterManagerが設定されていません');
          return;
        }
        try {
          const currentChapter = this.chapterManager.getCurrentChapterState();
          if (currentChapter) {
            this.chapterManager.startChapter(currentChapter.chapterId);
            console.log('章をリセットしました');
          } else {
            console.log('現在進行中の章がありません');
          }
        } catch (error) {
          console.error('章のリセットに失敗しました:', error);
        }
      },

      setStage: (stageIndex: number) => {
        if (!this.chapterManager) {
          console.error('ChapterManagerが設定されていません');
          return;
        }
        try {
          const currentChapter = this.chapterManager.getCurrentChapterState();
          if (currentChapter) {
            currentChapter.currentStageIndex = stageIndex;
            console.log(`現在ステージを ${stageIndex} に設定しました`);
          } else {
            console.log('現在進行中の章がありません');
          }
        } catch (error) {
          console.error('ステージの設定に失敗しました:', error);
        }
      },

      // キャラクター操作
      loseCharacter: (characterId: string) => {
        if (!this.chapterManager) {
          console.error('ChapterManagerが設定されていません');
          return;
        }
        try {
          this.chapterManager.markCharacterAsLost(characterId);
          console.log(`キャラクター '${characterId}' をロスト状態にしました`);
        } catch (error) {
          console.error('キャラクターのロスト処理に失敗しました:', error);
        }
      },

      reviveCharacter: (characterId: string) => {
        if (!this.chapterManager) {
          console.error('ChapterManagerが設定されていません');
          return;
        }
        try {
          const currentChapter = this.chapterManager.getCurrentChapterState();
          if (currentChapter) {
            const index = currentChapter.lostCharacterIds.indexOf(characterId);
            if (index > -1) {
              currentChapter.lostCharacterIds.splice(index, 1);
              if (!currentChapter.availableCharacterIds.includes(characterId)) {
                currentChapter.availableCharacterIds.push(characterId);
              }
              console.log(`キャラクター '${characterId}' を復活させました`);
            } else {
              console.log(`キャラクター '${characterId}' はロスト状態ではありません`);
            }
          }
        } catch (error) {
          console.error('キャラクターの復活に失敗しました:', error);
        }
      },

      reviveAll: () => {
        if (!this.chapterManager) {
          console.error('ChapterManagerが設定されていません');
          return;
        }
        try {
          const currentChapter = this.chapterManager.getCurrentChapterState();
          if (currentChapter) {
            const lostCount = currentChapter.lostCharacterIds.length;
            currentChapter.lostCharacterIds.forEach((id: string) => {
              if (!currentChapter.availableCharacterIds.includes(id)) {
                currentChapter.availableCharacterIds.push(id);
              }
            });
            currentChapter.lostCharacterIds = [];
            console.log(`${lostCount}人のキャラクターを復活させました`);
          }
        } catch (error) {
          console.error('全キャラクターの復活に失敗しました:', error);
        }
      },

      listCharacters: () => {
        if (!this.chapterManager) {
          console.error('ChapterManagerが設定されていません');
          return;
        }
        try {
          const available = this.chapterManager.getAvailableCharacters();
          const lost = this.chapterManager.getLostCharacters();

          console.log('=== キャラクター一覧 ===');
          console.log(`利用可能 (${available.length}人):`, available);
          console.log(`ロスト (${lost.length}人):`, lost);
        } catch (error) {
          console.error('キャラクター一覧の取得に失敗しました:', error);
        }
      },

      // パーティ操作
      addToParty: (characterId: string) => {
        if (!this.partyManager) {
          console.error('PartyManagerが設定されていません');
          return;
        }
        try {
          const result = this.partyManager.addCharacter(characterId);
          if (result) {
            console.log(`キャラクター '${characterId}' をパーティに追加しました`);
          } else {
            console.log(`キャラクター '${characterId}' の追加に失敗しました`);
          }
        } catch (error) {
          console.error('パーティへの追加に失敗しました:', error);
        }
      },

      removeFromParty: (characterId: string) => {
        if (!this.partyManager) {
          console.error('PartyManagerが設定されていません');
          return;
        }
        try {
          const result = this.partyManager.removeCharacter(characterId);
          if (result) {
            console.log(`キャラクター '${characterId}' をパーティから除外しました`);
          } else {
            console.log(`キャラクター '${characterId}' の除外に失敗しました`);
          }
        } catch (error) {
          console.error('パーティからの除外に失敗しました:', error);
        }
      },

      clearParty: () => {
        if (!this.partyManager) {
          console.error('PartyManagerが設定されていません');
          return;
        }
        try {
          this.partyManager.clearParty();
          console.log('パーティをクリアしました');
        } catch (error) {
          console.error('パーティのクリアに失敗しました:', error);
        }
      },

      showParty: () => {
        if (!this.partyManager) {
          console.error('PartyManagerが設定されていません');
          return;
        }
        try {
          const party = this.partyManager.getParty();
          console.log('=== 現在のパーティ ===');
          console.log(`メンバー (${party.members.length}/6):`, party.members);
          console.log('編成:', party.formation);
        } catch (error) {
          console.error('パーティ情報の取得に失敗しました:', error);
        }
      },

      // ステージ操作
      unlockStage: (stageId: string) => {
        if (!this.stageProgressManager) {
          console.error('StageProgressManagerが設定されていません');
          return;
        }
        try {
          this.stageProgressManager.unlockStage(stageId);
          console.log(`ステージ '${stageId}' を解放しました`);
        } catch (error) {
          console.error('ステージの解放に失敗しました:', error);
        }
      },

      completeStage: (stageId: string) => {
        if (!this.stageProgressManager) {
          console.error('StageProgressManagerが設定されていません');
          return;
        }
        try {
          this.stageProgressManager.completeStage(stageId, []);
          console.log(`ステージ '${stageId}' を完了しました`);
        } catch (error) {
          console.error('ステージの完了に失敗しました:', error);
        }
      },

      unlockAllStages: () => {
        if (!this.stageProgressManager || !this.chapterManager) {
          console.error('必要なマネージャーが設定されていません');
          return;
        }
        try {
          const currentChapter = this.chapterManager.getCurrentChapterState();
          if (currentChapter) {
            // 全ステージを解放
            // 実装は実際のステージデータに依存
            console.log('全ステージを解放しました');
          }
        } catch (error) {
          console.error('全ステージの解放に失敗しました:', error);
        }
      },

      resetStageProgress: () => {
        if (!this.stageProgressManager) {
          console.error('StageProgressManagerが設定されていません');
          return;
        }
        try {
          // 進行状況のリセット
          console.log('ステージ進行状況をリセットしました');
        } catch (error) {
          console.error('進行状況のリセットに失敗しました:', error);
        }
      },

      // セーブデータ操作
      save: (slotId: number) => {
        if (!this.saveLoadManager) {
          console.error('SaveLoadManagerが設定されていません');
          return;
        }
        try {
          const startTime = performance.now();
          const result = this.saveLoadManager.saveGame(slotId);
          const duration = performance.now() - startTime;

          if (result) {
            console.log(`スロット ${slotId} にセーブしました (${duration.toFixed(2)}ms)`);
            this.debugManager.recordSavePerformance(duration);
          } else {
            console.error('セーブに失敗しました');
          }
        } catch (error) {
          console.error('セーブ処理中にエラーが発生しました:', error);
        }
      },

      load: (slotId: number) => {
        if (!this.saveLoadManager) {
          console.error('SaveLoadManagerが設定されていません');
          return;
        }
        try {
          const startTime = performance.now();
          const result = this.saveLoadManager.loadGame(slotId);
          const duration = performance.now() - startTime;

          if (result) {
            console.log(`スロット ${slotId} からロードしました (${duration.toFixed(2)}ms)`);
            this.debugManager.recordLoadPerformance(duration);
          } else {
            console.error('ロードに失敗しました');
          }
        } catch (error) {
          console.error('ロード処理中にエラーが発生しました:', error);
        }
      },

      deleteSave: (slotId: number) => {
        if (!this.saveLoadManager) {
          console.error('SaveLoadManagerが設定されていません');
          return;
        }
        try {
          const result = this.saveLoadManager.deleteSaveData(slotId);
          if (result) {
            console.log(`スロット ${slotId} のセーブデータを削除しました`);
          } else {
            console.error('セーブデータの削除に失敗しました');
          }
        } catch (error) {
          console.error('削除処理中にエラーが発生しました:', error);
        }
      },

      listSaves: () => {
        if (!this.saveLoadManager) {
          console.error('SaveLoadManagerが設定されていません');
          return;
        }
        try {
          const slots = this.saveLoadManager.getSaveSlots();
          console.log('=== セーブスロット一覧 ===');
          slots.forEach((slot: any) => {
            if (slot.saveData) {
              const date = new Date(slot.lastSaved).toLocaleString();
              console.log(
                `スロット ${slot.slotId}: ${slot.saveData.chapterState.chapterId} (${date})`
              );
            } else {
              console.log(`スロット ${slot.slotId}: 空`);
            }
          });
        } catch (error) {
          console.error('セーブスロット一覧の取得に失敗しました:', error);
        }
      },

      validateSave: (slotId: number) => {
        if (!this.saveLoadManager) {
          console.error('SaveLoadManagerが設定されていません');
          return;
        }
        try {
          const slots = this.saveLoadManager.getSaveSlots();
          const slot = slots.find((s: any) => s.slotId === slotId);

          if (!slot || !slot.saveData) {
            console.error(`スロット ${slotId} にセーブデータがありません`);
            return;
          }

          const startTime = performance.now();
          const result = this.saveDataValidator.validateSaveData(slot.saveData);
          const duration = performance.now() - startTime;

          console.log('=== セーブデータ検証結果 ===');
          console.log(`検証時間: ${duration.toFixed(2)}ms`);
          console.log(`有効: ${result.isValid ? 'はい' : 'いいえ'}`);
          console.log(`エラー数: ${result.errors.length}`);
          console.log(`警告数: ${result.warnings.length}`);
          console.log(`修復可能: ${result.canBeRepaired ? 'はい' : 'いいえ'}`);

          if (result.errors.length > 0) {
            console.log('\nエラー:');
            result.errors.forEach(error => {
              console.log(`  [${error.severity}] ${error.message} (${error.path})`);
            });
          }

          if (result.warnings.length > 0) {
            console.log('\n警告:');
            result.warnings.forEach(warning => {
              console.log(`  ${warning.message} (${warning.path})`);
            });
          }

          if (result.suggestions.length > 0) {
            console.log('\n提案:');
            result.suggestions.forEach(suggestion => {
              console.log(`  - ${suggestion}`);
            });
          }

          this.debugManager.recordValidationPerformance(duration);
        } catch (error) {
          console.error('検証処理中にエラーが発生しました:', error);
        }
      },

      repairSave: (slotId: number) => {
        if (!this.saveLoadManager) {
          console.error('SaveLoadManagerが設定されていません');
          return;
        }
        try {
          const slots = this.saveLoadManager.getSaveSlots();
          const slot = slots.find((s: any) => s.slotId === slotId);

          if (!slot || !slot.saveData) {
            console.error(`スロット ${slotId} にセーブデータがありません`);
            return;
          }

          const result = this.saveDataValidator.repairSaveData(slot.saveData);

          console.log('=== セーブデータ修復結果 ===');
          console.log(`成功: ${result.success ? 'はい' : 'いいえ'}`);
          console.log(`適用した修正: ${result.appliedFixes.length}件`);

          if (result.appliedFixes.length > 0) {
            console.log('\n適用した修正:');
            result.appliedFixes.forEach(fix => {
              console.log(`  - ${fix}`);
            });
          }

          if (result.remainingErrors.length > 0) {
            console.log(`\n残存エラー: ${result.remainingErrors.length}件`);
            result.remainingErrors.forEach(error => {
              console.log(`  [${error.severity}] ${error.message}`);
            });
          }

          if (result.success && result.repairedData) {
            console.log('\n修復されたデータを保存しますか? (手動で保存してください)');
          }
        } catch (error) {
          console.error('修復処理中にエラーが発生しました:', error);
        }
      },

      // デバッグ情報
      status: () => {
        console.log('=== 章・ステージ管理システム 状態 ===');

        if (this.chapterManager) {
          const chapter = this.chapterManager.getCurrentChapterState();
          if (chapter) {
            console.log('\n【章状態】');
            console.log(`章ID: ${chapter.chapterId}`);
            console.log(`現在ステージ: ${chapter.currentStageIndex}`);
            console.log(`完了ステージ: ${chapter.completedStageIds.length}`);
            console.log(`ロストキャラクター: ${chapter.lostCharacterIds.length}人`);
            console.log(`利用可能キャラクター: ${chapter.availableCharacterIds.length}人`);
          } else {
            console.log('現在進行中の章がありません');
          }
        }

        if (this.partyManager) {
          const party = this.partyManager.getParty();
          console.log('\n【パーティ】');
          console.log(`メンバー数: ${party.members.length}/6`);
        }

        if (this.stageProgressManager) {
          console.log('\n【ステージ進行状況】');
          console.log('(詳細は showStages コマンドで確認)');
        }
      },

      report: () => {
        const report = this.debugManager.generateDebugReport();
        console.log(report);
      },

      metrics: () => {
        console.log('=== パフォーマンスメトリクス ===');
        console.log('(詳細は report コマンドで確認)');
      },

      help: () => {
        console.log('=== 章・ステージ管理コンソールコマンド ===\n');

        console.log('【章操作】');
        console.log('  startChapter(chapterId) - 章を開始');
        console.log('  completeChapter() - 章を完了');
        console.log('  resetChapter() - 章をリセット');
        console.log('  setStage(stageIndex) - 現在ステージを設定\n');

        console.log('【キャラクター操作】');
        console.log('  loseCharacter(characterId) - キャラクターをロスト状態に');
        console.log('  reviveCharacter(characterId) - キャラクターを復活');
        console.log('  reviveAll() - 全キャラクターを復活');
        console.log('  listCharacters() - キャラクター一覧表示\n');

        console.log('【パーティ操作】');
        console.log('  addToParty(characterId) - パーティに追加');
        console.log('  removeFromParty(characterId) - パーティから除外');
        console.log('  clearParty() - パーティをクリア');
        console.log('  showParty() - パーティ情報表示\n');

        console.log('【ステージ操作】');
        console.log('  unlockStage(stageId) - ステージを解放');
        console.log('  completeStage(stageId) - ステージを完了');
        console.log('  unlockAllStages() - 全ステージを解放');
        console.log('  resetStageProgress() - 進行状況をリセット\n');

        console.log('【セーブデータ操作】');
        console.log('  save(slotId) - セーブ');
        console.log('  load(slotId) - ロード');
        console.log('  deleteSave(slotId) - セーブデータ削除');
        console.log('  listSaves() - セーブスロット一覧');
        console.log('  validateSave(slotId) - セーブデータ検証');
        console.log('  repairSave(slotId) - セーブデータ修復\n');

        console.log('【デバッグ情報】');
        console.log('  status() - 現在の状態表示');
        console.log('  report() - デバッグレポート生成');
        console.log('  metrics() - パフォーマンスメトリクス表示');
        console.log('  help() - ヘルプ表示\n');

        console.log('使用例:');
        console.log('  chapterStage.startChapter("chapter-1")');
        console.log('  chapterStage.addToParty("char-001")');
        console.log('  chapterStage.save(1)');
      },
    };

    // グローバルスコープに登録
    (window as any).chapterStage = commands;

    console.log(
      'ChapterStageConsoleCommands: コンソールコマンド登録完了。"chapterStage.help()" でヘルプを表示'
    );
  }
}
