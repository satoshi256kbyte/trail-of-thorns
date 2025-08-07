import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ItemEditor from '../../components/ItemEditor';
import { Item } from '../../types';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

const mockItem: Item = {
  id: 'test-item-1',
  name: 'Test Sword',
  description: 'A test weapon',
  type: 'weapon',
  category: 'sword',
  stats: {
    attack: 10,
    defense: 0,
    speed: 0,
    accuracy: 85,
  },
  effects: [
    {
      type: 'stat_boost',
      stat: 'attack',
      value: 10,
    },
  ],
  icon: 'sword.png',
  rarity: 'common',
  value: 100,
};

const mockOnSave = jest.fn();
const mockOnCancel = jest.fn();

describe('ItemEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders item editor form', () => {
    renderWithTheme(
      <ItemEditor item={mockItem} onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    expect(screen.getByDisplayValue('Test Sword')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test weapon')).toBeInTheDocument();
    expect(screen.getByDisplayValue('weapon')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithTheme(
      <ItemEditor
        item={{ ...mockItem, name: '' }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates stat values', async () => {
    renderWithTheme(
      <ItemEditor item={mockItem} onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    // Set attack to invalid value
    const attackInput = screen.getByLabelText(/Attack/);
    fireEvent.change(attackInput, { target: { value: '101' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(
        screen.getByText(/Attack must be between -50 and 100/)
      ).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with updated item data', async () => {
    renderWithTheme(
      <ItemEditor item={mockItem} onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    const nameInput = screen.getByDisplayValue('Test Sword');
    fireEvent.change(nameInput, { target: { value: 'Updated Sword' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        ...mockItem,
        name: 'Updated Sword',
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    renderWithTheme(
      <ItemEditor item={mockItem} onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('handles different item types', () => {
    const armorItem = {
      ...mockItem,
      type: 'armor' as const,
      category: 'helmet',
      stats: {
        attack: 0,
        defense: 15,
        speed: -2,
        accuracy: 0,
      },
    };

    renderWithTheme(
      <ItemEditor
        item={armorItem}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('armor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('helmet')).toBeInTheDocument();
  });

  it('manages item effects', () => {
    renderWithTheme(
      <ItemEditor item={mockItem} onSave={mockOnSave} onCancel={mockOnCancel} />
    );

    expect(screen.getByText(/Effects/)).toBeInTheDocument();
    expect(screen.getByText(/stat_boost/)).toBeInTheDocument();
  });
});
