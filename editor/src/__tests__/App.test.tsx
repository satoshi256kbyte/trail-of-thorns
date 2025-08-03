import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from '../App';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('App', () => {
  it('renders admin dashboard title', () => {
    renderWithTheme(<App />);
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    renderWithTheme(<App />);
    expect(
      screen.getByText('2D Simulation RPG Data Editor')
    ).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    renderWithTheme(<App />);
    expect(
      screen.getByText(
        'Welcome to the admin dashboard for managing game data. This demo shows the error handling and user feedback system.'
      )
    ).toBeInTheDocument();
  });
});
