# Development Guide

This document provides detailed information for developers working on the Admin Dashboard.

## Architecture Overview

The Admin Dashboard follows a modern React architecture with the following key principles:

### Component Architecture

- **Functional Components**: All components use React hooks
- **Composition over Inheritance**: Components are composed rather than extended
- **Single Responsibility**: Each component has a clear, focused purpose
- **Props Interface**: All components have well-defined TypeScript interfaces

### State Management

- **Local State**: Component-level state using useState and useReducer
- **Context API**: Global state for application-wide data
- **Custom Hooks**: Reusable state logic extracted into hooks
- **Immutable Updates**: State updates follow immutability patterns

### Data Flow

```
User Input → Component → Hook → Context → Validation → Storage
```

## Component Guidelines

### Component Structure

```typescript
// ComponentName.tsx
import React from 'react';
import { ComponentProps } from './types';

interface ComponentNameProps {
  // Props interface
}

const ComponentName: React.FC<ComponentNameProps> = ({
  // Destructured props
}) => {
  // Hooks
  // Event handlers
  // Render logic

  return (
    // JSX
  );
};

export default ComponentName;
```

### Naming Conventions

- **Components**: PascalCase (e.g., `CharacterEditor`)
- **Files**: PascalCase for components, camelCase for utilities
- **Props**: camelCase with descriptive names
- **Event Handlers**: `handle` prefix (e.g., `handleSubmit`)
- **Boolean Props**: `is`, `has`, `can` prefixes

### Component Types

#### Container Components

- Manage state and data fetching
- Handle business logic
- Pass data to presentation components
- Located in `src/components/containers/`

#### Presentation Components

- Receive data via props
- Focus on UI rendering
- Minimal or no state
- Located in `src/components/ui/`

#### Form Components

- Handle form state and validation
- Use react-hook-form for complex forms
- Include error handling and feedback
- Located in `src/components/forms/`

## Custom Hooks

### Hook Guidelines

- Start with `use` prefix
- Return object with named properties
- Include TypeScript interfaces
- Handle cleanup in useEffect

### Common Hook Patterns

#### Data Fetching Hook

```typescript
const useDataFetching = <T>(url: string) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch logic
  }, [url]);

  return { data, loading, error };
};
```

#### Form Hook

```typescript
const useFormValidation = <T>(initialValues: T, validationSchema: Schema) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    // Validation logic
  }, [values, validationSchema]);

  return { values, errors, validate, setValues };
};
```

## State Management Patterns

### Context Pattern

```typescript
// Context definition
const DataContext = createContext<DataContextType | undefined>(undefined);

// Provider component
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  return (
    <DataContext.Provider value={{ state, dispatch }}>
      {children}
    </DataContext.Provider>
  );
};

// Hook for consuming context
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};
```

### Reducer Pattern

```typescript
interface State {
  data: DataType[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: DataType[] }
  | { type: 'FETCH_ERROR'; payload: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};
```

## Testing Strategy

### Test Structure

```
src/
├── __tests__/
│   ├── components/        # Component tests
│   ├── hooks/            # Hook tests
│   ├── utils/            # Utility tests
│   ├── integration/      # Integration tests
│   ├── performance/      # Performance tests
│   └── accessibility/    # Accessibility tests
```

### Testing Guidelines

#### Unit Tests

- Test individual components in isolation
- Mock external dependencies
- Focus on component behavior, not implementation
- Use React Testing Library for DOM testing

```typescript
describe('CharacterEditor', () => {
  it('validates required fields', async () => {
    render(<CharacterEditor character={mockCharacter} onSave={mockSave} />);

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/)).toBeInTheDocument();
    });
  });
});
```

#### Integration Tests

- Test component interactions
- Test data flow between components
- Test complete user workflows

```typescript
describe('Data Workflow', () => {
  it('completes character creation workflow', async () => {
    render(<App />);

    // Navigate and create character
    fireEvent.click(screen.getByText('Characters'));
    fireEvent.click(screen.getByText('Add Character'));

    // Fill form and save
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: 'New Character' }
    });
    fireEvent.click(screen.getByText('Save'));

    // Verify result
    await waitFor(() => {
      expect(screen.getByText('New Character')).toBeInTheDocument();
    });
  });
});
```

#### Performance Tests

- Test rendering performance with large datasets
- Test memory usage and cleanup
- Test search and filter performance

```typescript
describe('Performance', () => {
  it('renders large character list efficiently', () => {
    const startTime = performance.now();
    const largeDataset = generateLargeDataset(1000);

    render(<CharacterList characters={largeDataset} />);

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000);
  });
});
```

### Test Utilities

#### Mock Data Factories

```typescript
export const createMockCharacter = (
  overrides: Partial<Character> = {}
): Character => ({
  id: 'mock-char-1',
  name: 'Mock Character',
  stats: { hp: 100, mp: 50, attack: 20, defense: 15, speed: 10, movement: 3 },
  // ... other default values
  ...overrides,
});
```

#### Custom Render Function

```typescript
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <DataProvider>
        {ui}
      </DataProvider>
    </ThemeProvider>
  );
};
```

## Performance Optimization

### Rendering Optimization

#### React.memo

```typescript
const ExpensiveComponent = React.memo<Props>(
  ({ data }) => {
    // Component logic
  },
  (prevProps, nextProps) => {
    // Custom comparison function
    return prevProps.data.id === nextProps.data.id;
  }
);
```

#### useMemo and useCallback

```typescript
const Component = ({ items, onSelect }) => {
  const expensiveValue = useMemo(() => {
    return items.reduce((acc, item) => acc + item.value, 0);
  }, [items]);

  const handleSelect = useCallback((item) => {
    onSelect(item);
  }, [onSelect]);

  return (
    // JSX
  );
};
```

#### Virtual Scrolling

```typescript
import { FixedSizeList as List } from 'react-window';

const VirtualizedList = ({ items }) => (
  <List
    height={600}
    itemCount={items.length}
    itemSize={50}
    itemData={items}
  >
    {Row}
  </List>
);
```

### Bundle Optimization

#### Code Splitting

```typescript
const LazyComponent = React.lazy(() => import('./LazyComponent'));

const App = () => (
  <Suspense fallback={<Loading />}>
    <LazyComponent />
  </Suspense>
);
```

#### Dynamic Imports

```typescript
const loadModule = async () => {
  const module = await import('./heavyModule');
  return module.default;
};
```

## Error Handling

### Error Boundaries

```typescript
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
```

### Error Handling Patterns

```typescript
const useErrorHandler = () => {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((error: Error) => {
    setError(error.message);
    // Log to error reporting service
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};
```

## Accessibility Guidelines

### ARIA Labels

```typescript
<button
  aria-label="Delete character"
  aria-describedby="delete-help-text"
  onClick={handleDelete}
>
  <DeleteIcon />
</button>
<div id="delete-help-text" className="sr-only">
  This action cannot be undone
</div>
```

### Keyboard Navigation

```typescript
const useKeyboardNavigation = (items: Item[]) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
          break;
        case 'ArrowUp':
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          // Handle selection
          break;
      }
    },
    [items.length]
  );

  return { focusedIndex, handleKeyDown };
};
```

### Focus Management

```typescript
const Modal = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;

      firstFocusable?.focus();
    }
  }, [isOpen]);

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {/* Modal content */}
    </div>
  );
};
```

## Build and Deployment

### Development Build

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Environment Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
});
```

### Production Optimization

- Bundle splitting for better caching
- Tree shaking to remove unused code
- Asset optimization (images, fonts)
- Gzip compression
- CDN deployment for static assets

## Code Review Guidelines

### Review Checklist

- [ ] Code follows project conventions
- [ ] Components have proper TypeScript types
- [ ] Tests are included for new features
- [ ] Accessibility requirements are met
- [ ] Performance considerations are addressed
- [ ] Error handling is implemented
- [ ] Documentation is updated

### Review Process

1. Create feature branch from main
2. Implement changes with tests
3. Run full test suite
4. Create pull request with description
5. Address review feedback
6. Merge after approval

## Debugging

### Development Tools

- React Developer Tools
- Redux DevTools (if using Redux)
- Browser Performance tab
- Lighthouse for performance audits

### Common Debugging Techniques

```typescript
// Debug renders
useEffect(() => {
  console.log('Component rendered with props:', props);
});

// Debug state changes
useEffect(() => {
  console.log('State changed:', state);
}, [state]);

// Performance debugging
const Component = () => {
  console.log('Component render');
  return <div>Content</div>;
};
```

### Error Logging

```typescript
const logError = (error: Error, context: string) => {
  console.error(`Error in ${context}:`, error);

  // Send to error reporting service
  if (process.env.NODE_ENV === 'production') {
    errorReportingService.captureException(error, { context });
  }
};
```

This development guide should help maintain consistency and quality across the codebase. Remember to update this document as the project evolves and new patterns emerge.
