import { Collapse, Paper, Stack, Text } from '@mantine/core';
import { Group } from '@mantine/core';
import type { Banknote } from '../../types/banknote';
import { getCountryCode } from '../../data/countries';
import { BanknoteCard } from '../BanknoteCard';
import { CollapsibleSectionHeader } from '../CollapsibleSectionHeader';
import { CountryFlag } from '../CountryFlag';
import type { SortOption } from './Gallery.types';
import classes from '../Gallery.module.css';

interface GalleryGroupProps {
  groupKey: string;
  groupBanknotes: Banknote[];
  isOpen: boolean;
  onToggle: () => void;
  sortBy: SortOption;
  onBanknoteClick: (index: number) => void;
  filteredBanknotes: Banknote[];
}

export function GalleryGroup({
  groupKey,
  groupBanknotes,
  isOpen,
  onToggle,
  sortBy,
  onBanknoteClick,
  filteredBanknotes,
}: GalleryGroupProps) {
  const countryCode = (sortBy === 'country' || sortBy === 'countryDesc') 
    ? getCountryCode(groupKey) 
    : null;
  
  const titleElement = countryCode ? (
    <Group gap="xs" align="center">
      <CountryFlag countryCode={countryCode} size="md" />
      <span>{groupKey}</span>
    </Group>
  ) : groupKey;

  return (
    <Paper key={groupKey}>
      <Stack gap="md">
        <CollapsibleSectionHeader
          title={titleElement}
          isOpen={isOpen}
          onToggle={onToggle}
          titleOrder={4}
        />
        {isOpen && (
          <Text size="sm" c="dimmed" px="md" pb="xs">
            {groupBanknotes.length} {groupBanknotes.length === 1 ? 'banknote' : 'banknotes'}
          </Text>
        )}
        <Collapse in={isOpen}>
          <div className={classes.grid}>
            {groupBanknotes.map((banknote) => {
              const index = filteredBanknotes.findIndex(b => b.id === banknote.id);
              return (
                <BanknoteCard
                  key={banknote.id}
                  banknote={banknote}
                  onClick={() => onBanknoteClick(index)}
                />
              );
            })}
          </div>
        </Collapse>
      </Stack>
    </Paper>
  );
}

