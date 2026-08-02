import { Anchor, Group, Stack, useMantineTheme } from '@mantine/core';
import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const publicNavItems = [
  { path: '/', label: 'Home' },
  { path: '/community', label: 'Community' },
  { path: '/pricing', label: 'Pricing' },
];

const authenticatedNavItems = [
  { path: '/', label: 'Home' },
  { path: '/your-banknotes', label: 'Your Collection' },
  { path: '/community', label: 'Community' },
  { path: '/pricing', label: 'Pricing' },
];

interface NavigationProps {
  vertical?: boolean;
}

export function Navigation({ vertical = false }: NavigationProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const primaryColor = theme.primaryColor as keyof typeof theme.colors;

  const navItems = user ? authenticatedNavItems : publicNavItems;

  const navLinks = navItems.map((item) => {
    const isActive = location.pathname === item.path;
    const activeColor = theme.colors[primaryColor]?.[6] || theme.colors.sage[6];

    // Re-clicking the current route is a no-op by default (same URL). Force a
    // navigation with fresh state so pages can reset local UI (e.g. form → gallery).
    const handleClick = (e: MouseEvent) => {
      if (location.pathname === item.path) {
        e.preventDefault();
        navigate(item.path, {
          replace: true,
          state: { navReset: Date.now() },
        });
      }
    };

    return (
      <Anchor
        key={item.path}
        component={Link}
        to={item.path}
        onClick={handleClick}
        underline="never"
        c={isActive ? theme.primaryColor : 'dimmed'}
        fw={isActive ? 500 : 400}
        size="sm"
        style={{
          borderBottom: !vertical && isActive ? `2px solid ${activeColor}` : 'none',
          borderLeft: vertical && isActive ? `3px solid ${activeColor}` : 'none',
          paddingBottom: !vertical ? '4px' : '8px',
          paddingLeft: vertical ? '12px' : '0',
          transition: 'color 0.2s, border-color 0.2s',
          whiteSpace: 'nowrap',
          display: 'block',
        }}
      >
        {item.label}
      </Anchor>
    );
  });

  if (vertical) {
    return <Stack gap="md">{navLinks}</Stack>;
  }

  return (
    <Group gap="xl" style={{ flex: 1, justifyContent: 'center' }} wrap="nowrap">
      {navLinks}
    </Group>
  );
}

