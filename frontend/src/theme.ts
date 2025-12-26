import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f766e' },
    secondary: { main: '#0ea5e9' },
    success: { main: '#059669' },
    error: { main: '#dc2626' },
    background: { default: '#f7f7fb' },
  },
  shape: { borderRadius: 10 },
});

export default theme;
