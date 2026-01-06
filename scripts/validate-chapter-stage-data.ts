/**
 * 章・ステージデータの整合性検証スクリプト
 *
 * このスクリプトは以下を検証します：
 * 1. JSONスキーマに対する構造検証
 * 2. 章とステージ間の参照整合性
 * 3. ステージ解放条件の整合性
 * 4. キャラクターIDの存在確認
 */

import * as fs from 'fs';
import * as path from 'path';

interface ChapterData {
  id: string;
  name: string;
  storyDescription: string;
  recommendedLevel: number;
  initialCharacters: string[];
  stages: StageReference[];
  unlockCondition: UnlockCondition;
}

interface StageReference {
  id: string;
  name: string;
  chapterId: string;
  difficulty: number;
  recommendedLevel: number;
  unlockCondition: StageUnlockCondition;
  rewards: Reward[];
}

interface UnlockCondition {
  type: 'NONE' | 'PREVIOUS_CHAPTER';
  requiredChapterId?: string;
}

interface StageUnlockCondition {
  type: 'PREVIOUS_STAGE' | 'MULTIPLE_STAGES' | 'CHAPTER_COMPLETE';
  requiredStageIds: string[];
}

interface Reward {
  type: 'experience' | 'gold' | 'rose_essence' | 'item';
  amount: number;
  description: string;
  itemId?: string;
}

interface StageData {
  id: string;
  name: string;
  chapterId: string;
  description: string;
  isUnlocked: boolean;
  thumbnail: string;
  difficulty: number;
  recommendedLevel: number;
  order: number;
  unlockCondition: StageUnlockCondition;
  mapData: MapData;
  playerUnits: UnitPlacement[];
  enemyUnits: UnitPlacement[];
  recruitableCharacters: RecruitableCharacter[];
  victoryConditions: Condition[];
  defeatConditions: Condition[];
  rewards: Reward[];
}

interface MapData {
  width: number;
  height: number;
  tileset: string;
}

interface UnitPlacement {
  characterId: string;
  startPosition: Position;
}

interface Position {
  x: number;
  y: number;
}

interface RecruitableCharacter {
  characterId: string;
  isActive: boolean;
  stageSpecificConditions: any[];
}

interface Condition {
  type: string;
  description: string;
  parameters?: any;
}

interface Character {
  id: string;
  name: string;
  faction: string;
}

class DataValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * 章データを検証
   */
  validateChapters(chaptersData: { chapters: ChapterData[] }): boolean {
    console.log('章データの検証を開始...');

    const chapterIds = new Set<string>();

    for (const chapter of chaptersData.chapters) {
      // 章IDの重複チェック
      if (chapterIds.has(chapter.id)) {
        this.errors.push(`重複した章ID: ${chapter.id}`);
      }
      chapterIds.add(chapter.id);

      // 章解放条件の検証
      if (chapter.unlockCondition.type === 'PREVIOUS_CHAPTER') {
        if (!chapter.unlockCondition.requiredChapterId) {
          this.errors.push(`章 ${chapter.id}: PREVIOUS_CHAPTERタイプだが、requiredChapterIdが未設定`);
        } else if (!chapterIds.has(chapter.unlockCondition.requiredChapterId)) {
          this.errors.push(
            `章 ${chapter.id}: 存在しない章ID ${chapter.unlockCondition.requiredChapterId} を参照`
          );
        }
      }

      // ステージ数の検証
      if (chapter.stages.length < 1 || chapter.stages.length > 24) {
        this.errors.push(`章 ${chapter.id}: ステージ数が範囲外 (${chapter.stages.length})`);
      }

      // 初期キャラクターの検証
      if (chapter.initialCharacters.length === 0) {
        this.errors.push(`章 ${chapter.id}: 初期キャラクターが設定されていません`);
      }
    }

    return this.errors.length === 0;
  }

  /**
   * ステージデータを検証
   */
  validateStages(
    stagesData: { stages: StageData[] },
    chaptersData: { chapters: ChapterData[] }
  ): boolean {
    console.log('ステージデータの検証を開始...');

    const stageIds = new Set<string>();
    const chapterIds = new Set(chaptersData.chapters.map((c) => c.id));
    const stagesByChapter = new Map<string, StageData[]>();

    for (const stage of stagesData.stages) {
      // ステージIDの重複チェック
      if (stageIds.has(stage.id)) {
        this.errors.push(`重複したステージID: ${stage.id}`);
      }
      stageIds.add(stage.id);

      // 章IDの存在確認
      if (!chapterIds.has(stage.chapterId)) {
        this.errors.push(`ステージ ${stage.id}: 存在しない章ID ${stage.chapterId} を参照`);
      }

      // 章ごとにステージをグループ化
      if (!stagesByChapter.has(stage.chapterId)) {
        stagesByChapter.set(stage.chapterId, []);
      }
      stagesByChapter.get(stage.chapterId)!.push(stage);

      // 解放条件の検証
      this.validateStageUnlockCondition(stage, stageIds);

      // マップデータの検証
      this.validateMapData(stage);

      // 勝利・敗北条件の検証
      if (stage.victoryConditions.length === 0) {
        this.errors.push(`ステージ ${stage.id}: 勝利条件が設定されていません`);
      }
      if (stage.defeatConditions.length === 0) {
        this.errors.push(`ステージ ${stage.id}: 敗北条件が設定されていません`);
      }
    }

    // 章データとステージデータの整合性チェック
    this.validateChapterStageConsistency(chaptersData, stagesByChapter);

    return this.errors.length === 0;
  }

  /**
   * ステージ解放条件を検証
   */
  private validateStageUnlockCondition(stage: StageData, existingStageIds: Set<string>): void {
    const condition = stage.unlockCondition;

    switch (condition.type) {
      case 'PREVIOUS_STAGE':
        if (condition.requiredStageIds.length > 1) {
          this.warnings.push(
            `ステージ ${stage.id}: PREVIOUS_STAGEタイプで複数のステージIDが指定されています`
          );
        }
        break;

      case 'MULTIPLE_STAGES':
        if (condition.requiredStageIds.length < 2) {
          this.errors.push(
            `ステージ ${stage.id}: MULTIPLE_STAGESタイプだが、必要なステージが2つ未満です`
          );
        }
        break;

      case 'CHAPTER_COMPLETE':
        if (condition.requiredStageIds.length > 0) {
          this.warnings.push(
            `ステージ ${stage.id}: CHAPTER_COMPLETEタイプでrequiredStageIdsが指定されています`
          );
        }
        break;
    }

    // 参照されているステージIDの存在確認
    for (const requiredStageId of condition.requiredStageIds) {
      if (!existingStageIds.has(requiredStageId)) {
        this.errors.push(
          `ステージ ${stage.id}: 存在しないステージID ${requiredStageId} を参照`
        );
      }
    }
  }

  /**
   * マップデータを検証
   */
  private validateMapData(stage: StageData): void {
    const { mapData, playerUnits, enemyUnits } = stage;

    // ユニット配置がマップ範囲内か確認
    for (const unit of [...playerUnits, ...enemyUnits]) {
      if (
        unit.startPosition.x < 0 ||
        unit.startPosition.x >= mapData.width ||
        unit.startPosition.y < 0 ||
        unit.startPosition.y >= mapData.height
      ) {
        this.errors.push(
          `ステージ ${stage.id}: ユニット ${unit.characterId} の配置がマップ範囲外です ` +
            `(${unit.startPosition.x}, ${unit.startPosition.y})`
        );
      }
    }

    // ユニット配置の重複チェック
    const positions = new Set<string>();
    for (const unit of [...playerUnits, ...enemyUnits]) {
      const posKey = `${unit.startPosition.x},${unit.startPosition.y}`;
      if (positions.has(posKey)) {
        this.warnings.push(
          `ステージ ${stage.id}: 位置 (${unit.startPosition.x}, ${unit.startPosition.y}) に複数のユニットが配置されています`
        );
      }
      positions.add(posKey);
    }
  }

  /**
   * 章データとステージデータの整合性を検証
   */
  private validateChapterStageConsistency(
    chaptersData: { chapters: ChapterData[] },
    stagesByChapter: Map<string, StageData[]>
  ): void {
    for (const chapter of chaptersData.chapters) {
      const chapterStages = stagesByChapter.get(chapter.id) || [];
      const chapterStageIds = new Set(chapter.stages.map((s) => s.id));
      const actualStageIds = new Set(chapterStages.map((s) => s.id));

      // 章データに記載されているステージが実際に存在するか
      for (const stageRef of chapter.stages) {
        if (!actualStageIds.has(stageRef.id)) {
          this.errors.push(
            `章 ${chapter.id}: 参照されているステージ ${stageRef.id} が stages.json に存在しません`
          );
        }
      }

      // stages.jsonのステージが章データに記載されているか
      for (const stage of chapterStages) {
        if (!chapterStageIds.has(stage.id)) {
          this.warnings.push(
            `ステージ ${stage.id}: stages.json に存在しますが、章 ${chapter.id} のステージリストに含まれていません`
          );
        }
      }
    }
  }

  /**
   * キャラクターIDの存在を検証
   */
  validateCharacterReferences(
    stagesData: { stages: StageData[] },
    charactersData: { characters: Character[] }
  ): boolean {
    console.log('キャラクター参照の検証を開始...');

    const characterIds = new Set(charactersData.characters.map((c) => c.id));

    for (const stage of stagesData.stages) {
      // プレイヤーユニットのキャラクターID確認
      for (const unit of stage.playerUnits) {
        if (!characterIds.has(unit.characterId)) {
          this.errors.push(
            `ステージ ${stage.id}: 存在しないキャラクターID ${unit.characterId} (プレイヤーユニット)`
          );
        }
      }

      // 敵ユニットのキャラクターID確認
      for (const unit of stage.enemyUnits) {
        if (!characterIds.has(unit.characterId)) {
          this.errors.push(
            `ステージ ${stage.id}: 存在しないキャラクターID ${unit.characterId} (敵ユニット)`
          );
        }
      }

      // 仲間化可能キャラクターのID確認
      for (const recruitableChar of stage.recruitableCharacters) {
        if (!characterIds.has(recruitableChar.characterId)) {
          this.errors.push(
            `ステージ ${stage.id}: 存在しないキャラクターID ${recruitableChar.characterId} (仲間化可能)`
          );
        }
      }
    }

    return this.errors.length === 0;
  }

  /**
   * 検証結果を表示
   */
  printResults(): void {
    console.log('\n=== 検証結果 ===\n');

    if (this.errors.length > 0) {
      console.log('❌ エラー:');
      this.errors.forEach((error) => console.log(`  - ${error}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  警告:');
      this.warnings.forEach((warning) => console.log(`  - ${warning}`));
      console.log('');
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ すべての検証に合格しました！');
    } else {
      console.log(`エラー: ${this.errors.length}件, 警告: ${this.warnings.length}件`);
    }
  }

  /**
   * エラーがあるかどうか
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
}

/**
 * メイン処理
 */
function main(): void {
  const dataDir = path.join(process.cwd(), 'data');

  // データファイルの読み込み
  const chaptersData = JSON.parse(fs.readFileSync(path.join(dataDir, 'chapters.json'), 'utf-8'));
  const stagesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'stages.json'), 'utf-8'));
  const charactersData = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'characters.json'), 'utf-8')
  );

  const validator = new DataValidator();

  // 検証実行
  validator.validateChapters(chaptersData);
  validator.validateStages(stagesData, chaptersData);
  validator.validateCharacterReferences(stagesData, charactersData);

  // 結果表示
  validator.printResults();

  // エラーがある場合は終了コード1で終了
  if (validator.hasErrors()) {
    process.exit(1);
  }
}

// スクリプト実行
main();

export { DataValidator };
