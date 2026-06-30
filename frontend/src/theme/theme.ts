import { createTheme, alpha } from '@mui/material/styles'

/**
 * Agriport CRM — "Modern Enterprise" design system.
 * Refined neutral slate canvas, deep-emerald brand accent, amber for value/incentive
 * highlights. Distinctive type: Bricolage Grotesque (display) + Plus Jakarta Sans (body)
 * + JetBrains Mono (numerics). All MUI primitives are themed here so the app reads as
 * one cohesive product rather than default Material.
 */

const brand = {
  50: '#EAF6F0',
  100: '#CDEADD',
  200: '#9DD4BC',
  300: '#66B894',
  400: '#389B73',
  500: '#1C7C58',
  600: '#15694A',
  700: '#11543B',
  800: '#0E432F',
  900: '#0A3324',
}

const ink = {
  50: '#F6F7F9',
  100: '#EDEFF3',
  200: '#E2E6EC',
  300: '#CBD2DC',
  400: '#9AA4B2',
  500: '#6B7585',
  600: '#4E5765',
  700: '#3A4250',
  800: '#262C38',
  900: '#161B24',
}

const display = '"Bricolage Grotesque", ui-serif, serif'
const sans = '"Plus Jakarta Sans", system-ui, sans-serif'

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: {
      main: brand[600],
      light: brand[400],
      dark: brand[800],
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#C9842F',
      light: '#E0A95A',
      dark: '#A66A1F',
      contrastText: '#FFFFFF',
    },
    success: { main: '#1C7C58', light: '#389B73', dark: '#11543B' },
    warning: { main: '#C9842F', light: '#E6B26A', dark: '#A66A1F' },
    error: { main: '#C0392B', light: '#E0695C', dark: '#922A20' },
    info: { main: '#2C6E8F', light: '#5294B3', dark: '#1F4F68' },
    background: { default: '#F4F6F8', paper: '#FFFFFF' },
    text: { primary: ink[900], secondary: ink[500], disabled: ink[400] },
    divider: ink[200],
    grey: {
      50: ink[50],
      100: ink[100],
      200: ink[200],
      300: ink[300],
      400: ink[400],
      500: ink[500],
      600: ink[600],
      700: ink[700],
      800: ink[800],
      900: ink[900],
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: sans,
    h1: { fontFamily: display, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 },
    h2: { fontFamily: display, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 },
    h3: { fontFamily: display, fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontFamily: display, fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontFamily: display, fontWeight: 600 },
    h6: { fontFamily: display, fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
    overline: { fontWeight: 700, letterSpacing: '0.12em', fontSize: '0.68rem' },
    body2: { lineHeight: 1.55 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#F4F6F8' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 18,
          paddingBlock: 9,
          fontWeight: 600,
          '&.MuiButton-containedPrimary': {
            boxShadow: 'none',
            background: `linear-gradient(180deg, ${brand[500]} 0%, ${brand[600]} 100%)`,
            '&:hover': {
              background: `linear-gradient(180deg, ${brand[600]} 0%, ${brand[700]} 100%)`,
            },
          },
        },
        outlined: {
          borderColor: ink[200],
          color: ink[800],
          '&:hover': { borderColor: ink[300], backgroundColor: ink[50] },
        },
        sizeLarge: { paddingBlock: 12, paddingInline: 24, fontSize: '0.95rem' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: ink[200] },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${ink[200]}`,
          borderRadius: 16,
          boxShadow: '0 1px 2px rgba(22,27,36,0.04), 0 1px 3px rgba(22,27,36,0.05)',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          '& fieldset': { borderColor: ink[200] },
          '&:hover fieldset': { borderColor: ink[300] },
          '&.Mui-focused fieldset': { borderWidth: 1.5, borderColor: brand[500] },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontWeight: 500 } },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 8 },
        sizeSmall: { height: 22, fontSize: '0.72rem' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44,
          fontSize: '0.92rem',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: 3 },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: {
          backgroundColor: alpha('#FFFFFF', 0.85),
          backdropFilter: 'saturate(180%) blur(12px)',
          borderBottom: `1px solid ${ink[200]}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: ink[900],
          fontSize: '0.75rem',
          borderRadius: 8,
          padding: '6px 10px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 18, border: `1px solid ${ink[200]}` },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: `1px solid ${ink[200]}`,
          boxShadow: '0 12px 32px rgba(22,27,36,0.14)',
          marginTop: 6,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 700, fontFamily: display },
      },
    },
  },
})

export { brand, ink }
