# Design Document

## Overview

管理画面（データエディター）は、2DシミュレーションRPGのゲームデータを視覚的に編集するためのReact + TypeScriptアプリケーションです。ローカル環境で動作し、JSONファイルの読み込み・編集・出力機能を提供します。ゲームデザイナーが技術的な知識なしでゲームコンテンツを作成・編集できるよう、直感的なUIを提供します。

## Architecture

### システム構成

```
Admin Dashboard (React App)
├── Frontend (React + TypeScript)
│   ├── UI Components (Material-UI)
│   ├── State Management (Context API)
│   ├── Form Management (React Hook Form)
│   └── Data Validation (Zod)
├── File System Integration
│   ├── JSON Import/Export
│   ├── Schema Validation
│   └── File Watcher (optional)
└── Development Server (Vite)
```

### アーキテクチャパターン

- **Component-Based Architecture**: 再利用可能なUIコンポーネント
- **Container-Presenter Pattern**: ビジネスロジックとUI表示の分離
- **Context + Reducer Pattern**: アプリケーション状態管理
- **Schema-First Design**: データ構造の厳密な定義と検証

## Components and Interfaces

### Core Components

#### 1. Layout Components

```typescript
// Layout/AppLayout.tsx
interface AppLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header: React.ReactNode;
}

// Layout/Sidebar.tsx
interface SidebarProps {
  activeSection: DataSection;
  onSectionChange: (section: DataSection) => void;
  dataCounts: Record<DataSection, number>;
}

// Layout/Header.tsx
interface HeaderProps {
  currentFile: string | null;
  onImport: () => void;
  onExport: () => void;
  onValidate: () => void;
}
```

#### 2. Data Management Components

```typescript
// Character/CharacterEditor.tsx
interface CharacterEditorProps {
  character: Character | null;
  onSave: (character: Character) => void;
  onDelete: (id: string) => void;
  availableSprites: SpriteAsset[];
}

// Character/CharacterList.tsx
interface CharacterListProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Item/ItemEditor.tsx
interface ItemEditorProps {
  item: Item | null;
  onSave: (item: Item) => void;
  onDelete: (id: string) => void;
  availableEffects: EffectType[];
}

// Stage/StageEditor.tsx
interface StageEditorProps {
  stage: Stage | null;
  onSave: (stage: Stage) => void;
  onDelete: (id: string) => void;
  availableAssets: TileAsset[];
}
```

#### 3. Form Components

```typescript
// Forms/FormField.tsx
interface FormFieldProps<T> {
  name: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  validation?: ValidationRule<T>;
  error?: string;
}

// Forms/NumberInput.tsx
interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}

// Forms/SelectInput.tsx
interface SelectInputProps<T> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
}
```

#### 4. Preview Components

```typescript
// Preview/CharacterPreview.tsx
interface CharacterPreviewProps {
  character: Character;
  showStats: boolean;
  showSprite: boolean;
}

// Preview/ItemPreview.tsx
interface ItemPreviewProps {
  item: Item;
  showEffects: boolean;
  showIcon: boolean;
}

// Preview/StagePreview.tsx
interface StagePreviewProps {
  stage: Stage;
  showMinimap: boolean;
  showObjectives: boolean;
}
```

### State Management

```typescript
// Context/AppContext.tsx
interface AppState {
  characters: Record<string, Character>;
  items: Record<string, Item>;
  stages: Record<string, Stage>;
  currentSection: DataSection;
  selectedId: string | null;
  isDirty: boolean;
  validationErrors: ValidationError[];
}

interface AppActions {
  loadData: (data: GameData) => void;
  saveCharacter: (character: Character) => void;
  saveItem: (item: Item) => void;
  saveStage: (stage: Stage) => void;
  deleteData: (type: DataType, id: string) => void;
  setCurrentSection: (section: DataSection) => void;
  setSelectedId: (id: string | null) => void;
  validateAll: () => void;
}
```

## Data Models

### Core Data Types

```typescript
// Types/Character.ts
interface Character {
  id: string;
  name: string;
  description: string;
  stats: CharacterStats;
  abilities: Ability[];
  sprite: SpriteConfig;
  rarity: Rarity;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface CharacterStats {
  level: number;
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
}

// Types/Item.ts
interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: Rarity;
  stats: ItemStats;
  effects: ItemEffect[];
  icon: string;
  stackable: boolean;
  maxStack: number;
  sellPrice: number;
  buyPrice: number;
}

interface ItemEffect {
  type: EffectType;
  value: number;
  duration?: number;
  target: EffectTarget;
}

// Types/Stage.ts
interface Stage {
  id: string;
  name: string;
  description: string;
  size: { width: number; height: number };
  tiles: TileData[][];
  objects: StageObject[];
  enemies: EnemySpawn[];
  objectives: Objective[];
  rewards: Reward[];
  difficulty: number;
}

interface StageObject {
  id: string;
  type: ObjectType;
  position: { x: number; y: number };
  properties: Record<string, any>;
}
```

### Validation Schemas

```typescript
// Schemas/CharacterSchema.ts
import { z } from 'zod';

export const CharacterStatsSchema = z.object({
  level: z.number().min(1).max(100),
  hp: z.number().min(1).max(9999),
  mp: z.number().min(0).max(999),
  attack: z.number().min(1).max(999),
  defense: z.number().min(1).max(999),
  speed: z.number().min(1).max(999),
  luck: z.number().min(1).max(999),
});

export const CharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  description: z.string().max(500),
  stats: CharacterStatsSchema,
  abilities: z.array(z.string()),
  sprite: z.object({
    path: z.string(),
    frameWidth: z.number(),
    frameHeight: z.number(),
  }),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  tags: z.array(z.string()),
});
```

## Error Handling

### Validation Error Management

```typescript
// Utils/ValidationManager.ts
interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  path: string[];
}

class ValidationManager {
  validateCharacter(character: Character): ValidationError[] {
    const errors: ValidationError[] = [];
    
    try {
      CharacterSchema.parse(character);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...this.formatZodErrors(error));
      }
    }
    
    return errors;
  }
  
  private formatZodErrors(error: z.ZodError): ValidationError[] {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      severity: 'error' as const,
      path: err.path as string[],
    }));
  }
}
```

### File Operation Error Handling

```typescript
// Utils/FileManager.ts
class FileManager {
  async importJSON(file: File): Promise<GameData> {
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      
      // Schema validation
      const validationResult = this.validateGameData(data);
      if (!validationResult.isValid) {
        throw new ValidationError('Invalid data format', validationResult.errors);
      }
      
      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new FileError('Invalid JSON format', error.message);
      }
      throw error;
    }
  }
  
  async exportJSON(data: GameData, filename: string): Promise<void> {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Use File System Access API if available
      if ('showSaveFilePicker' in window) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'JSON files',
            accept: { 'application/json': ['.json'] },
          }],
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback to download
        this.downloadBlob(blob, filename);
      }
    } catch (error) {
      throw new FileError('Export failed', error.message);
    }
  }
}
```

## Testing Strategy

### Unit Testing

```typescript
// Tests/Components/CharacterEditor.test.tsx
describe('CharacterEditor', () => {
  it('should validate character stats on save', () => {
    const mockCharacter = createMockCharacter();
    const mockOnSave = jest.fn();
    
    render(<CharacterEditor character={mockCharacter} onSave={mockOnSave} />);
    
    // Test validation logic
    fireEvent.change(screen.getByLabelText('HP'), { target: { value: '-1' } });
    fireEvent.click(screen.getByText('Save'));
    
    expect(screen.getByText('HP must be greater than 0')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});

// Tests/Utils/ValidationManager.test.ts
describe('ValidationManager', () => {
  it('should return errors for invalid character data', () => {
    const invalidCharacter = { ...createMockCharacter(), hp: -1 };
    const errors = validationManager.validateCharacter(invalidCharacter);
    
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('stats.hp');
    expect(errors[0].severity).toBe('error');
  });
});
```

### Integration Testing

```typescript
// Tests/Integration/DataFlow.test.tsx
describe('Data Flow Integration', () => {
  it('should import, edit, and export character data', async () => {
    const mockData = createMockGameData();
    const mockFile = new File([JSON.stringify(mockData)], 'test.json');
    
    render(<App />);
    
    // Import data
    const importButton = screen.getByText('Import');
    fireEvent.click(importButton);
    // Simulate file selection
    
    // Edit character
    fireEvent.click(screen.getByText('Characters'));
    fireEvent.click(screen.getByText(mockData.characters[0].name));
    
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    fireEvent.click(screen.getByText('Save'));
    
    // Export data
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    // Verify exported data contains changes
    expect(mockFileSystemAPI.writtenData).toContain('Updated Name');
  });
});
```

### E2E Testing (Optional)

```typescript
// Tests/E2E/AdminDashboard.e2e.ts
describe('Admin Dashboard E2E', () => {
  it('should complete full workflow', async () => {
    await page.goto('http://localhost:3000');
    
    // Import existing data
    await page.click('[data-testid="import-button"]');
    await page.setInputFiles('input[type="file"]', 'test-data.json');
    
    // Navigate to character editor
    await page.click('[data-testid="characters-tab"]');
    await page.click('[data-testid="character-item"]:first-child');
    
    // Edit character
    await page.fill('[data-testid="character-name"]', 'Test Character');
    await page.fill('[data-testid="character-hp"]', '100');
    await page.click('[data-testid="save-button"]');
    
    // Verify changes
    expect(await page.textContent('[data-testid="character-name"]')).toBe('Test Character');
    
    // Export data
    await page.click('[data-testid="export-button"]');
    // Verify download
  });
});
```

## Technology Stack

### Frontend Framework

- **React 18**: 最新の機能（Concurrent Features, Suspense）
- **TypeScript 5.0**: 型安全性とDX向上
- **Vite**: 高速開発サーバーとビルド

### UI Framework

- **Material-UI v5**: 豊富なコンポーネントと日本語対応
- **React Hook Form**: 高性能なフォーム管理
- **Zod**: TypeScript-firstなスキーマバリデーション

### State Management

- **React Context + useReducer**: 軽量な状態管理
- **React Query**: サーバー状態管理（将来的なAPI連携用）

### Development Tools

- **ESLint + Prettier**: コード品質管理
- **Jest + Testing Library**: テストフレームワーク
- **Storybook**: コンポーネント開発・ドキュメント

### File System Integration

- **File System Access API**: モダンブラウザでのファイル操作
- **Fallback Download**: 非対応ブラウザ向け

## Performance Considerations

### Bundle Size Optimization

- **Tree Shaking**: 未使用コードの除去
- **Code Splitting**: ルート別の動的インポート
- **Material-UI Tree Shaking**: 必要なコンポーネントのみインポート

### Memory Management

- **Virtual Scrolling**: 大量データの効率的表示
- **Memoization**: 不要な再レンダリング防止
- **Cleanup**: useEffectでのリソース解放

### User Experience

- **Loading States**: 非同期処理の視覚的フィードバック
- **Error Boundaries**: エラー時のグレースフルな処理
- **Keyboard Navigation**: アクセシビリティ対応
