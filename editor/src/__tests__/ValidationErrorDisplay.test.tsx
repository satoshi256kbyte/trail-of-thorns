import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ValidationErrorDisplay, {
  ValidationError,
} from '../components/ValidationErrorDisplay';

const mockErrors: ValidationError[] = [
  {
    field: 'character.name',
    message: 'Name is required',
    severity: 'error',
    path: ['character', 'name'],
    suggestion: 'Enter a valid character name',
  },
  {
    field: 'character.stats.hp',
    message: 'HP must be greater than 0',
    severity: 'error',
    path: ['character', 'stats', 'hp'],
    value: -10,
    suggestion: 'Set HP to a positive number',
  },
  {
    field: 'character.description',
    message: 'Description is recommended',
    severity: 'warning',
    path: ['character', 'description'],
    suggestion: 'Add a description to help identify this character',
  },
  {
    field: 'item.name',
    message: 'Item name is required',
    severity: 'error',
    path: ['item', 'name'],
  },
];

describe('ValidationErrorDisplay', () => {
  it('renders nothing when no errors are provided', () => {
    const { container } = render(<ValidationErrorDisplay errors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays error count and warning count', () => {
    render(<ValidationErrorDisplay errors={mockErrors} />);

    expect(screen.getByText('3 errors')).toBeInTheDocument();
    expect(screen.getByText('1 warnings')).toBeInTheDocument();
  });

  it('groups errors by section', () => {
    render(<ValidationErrorDisplay errors={mockErrors} />);

    expect(screen.getByText('Character')).toBeInTheDocument();
    expect(screen.getByText('Item')).toBeInTheDocument();
  });

  it('displays error messages and suggestions', () => {
    render(<ValidationErrorDisplay errors={mockErrors} />);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(
      screen.getByText('💡 Enter a valid character name')
    ).toBeInTheDocument();
    expect(
      screen.getByText('💡 Set HP to a positive number')
    ).toBeInTheDocument();
  });

  it('shows current values when available', () => {
    render(<ValidationErrorDisplay errors={mockErrors} />);

    expect(screen.getByText('Current value: -10')).toBeInTheDocument();
  });

  it('calls onFieldClick when field is clicked', () => {
    const mockOnFieldClick = jest.fn();
    render(
      <ValidationErrorDisplay
        errors={mockErrors}
        onFieldClick={mockOnFieldClick}
      />
    );

    // Click on the first error item - find the ListItem that contains the text
    const errorItem = screen.getByText('character.name:').closest('li');
    if (errorItem) {
      fireEvent.click(errorItem);
    }

    expect(mockOnFieldClick).toHaveBeenCalledWith('character.name');
  });

  it('displays custom title', () => {
    render(
      <ValidationErrorDisplay
        errors={mockErrors}
        title="Custom Validation Title"
      />
    );

    expect(screen.getByText('Custom Validation Title')).toBeInTheDocument();
  });

  it('shows appropriate severity icons', () => {
    render(<ValidationErrorDisplay errors={mockErrors} />);

    // Check for error and warning icons (using test ids or aria-labels would be better)
    const errorIcons = screen.getAllByTestId('ErrorIcon');
    const warningIcons = screen.getAllByTestId('WarningIcon');

    expect(errorIcons).toHaveLength(3); // 3 errors
    expect(warningIcons).toHaveLength(1); // 1 warning
  });

  it('expands sections by default when there are errors', () => {
    render(<ValidationErrorDisplay errors={mockErrors} />);

    // Check that error details are visible (sections are expanded)
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('HP must be greater than 0')).toBeInTheDocument();
  });

  it('handles errors without suggestions gracefully', () => {
    const errorsWithoutSuggestions: ValidationError[] = [
      {
        field: 'test.field',
        message: 'Test error',
        severity: 'error',
        path: ['test', 'field'],
      },
    ];

    render(<ValidationErrorDisplay errors={errorsWithoutSuggestions} />);

    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument();
  });
});
