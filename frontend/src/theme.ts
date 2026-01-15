import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'sage',
  colors: {
    sage: [
      '#f0f5f0',
      '#dce8dc',
      '#b8d4b8',
      '#8fbc8f',
      '#6ba36b',
      '#5a9a5a',
      '#4a8a4a',
      '#3d7a3d',
      '#2f6a2f',
      '#1f5a1f',
    ],
    copper: [
      '#fdf5f0',
      '#f5e6db',
      '#e8c9b3',
      '#d9a87a',
      '#c98a4d',
      '#b87333',
      '#a6652d',
      '#8b5427',
      '#704420',
      '#5c3619',
    ],
  },
  primaryShade: { light: 6, dark: 5 },
  fontFamily: '"Google Sans Flex", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily: '"Google Sans Flex", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '600',
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  defaultRadius: 'md',
  components: {
    Modal: {
      defaultProps: {
        overlayProps: {
          backgroundOpacity: 0.75,
          blur: 3,
        },
      },
    },
  },
});

