import { Group, MultiSelect, Select, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconAward, IconCrown, IconMapPin, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { SortOption, SortOptionConfig } from './Gallery.types';

interface GalleryFiltersProps {
  filterCountry: string[];
  filterGrade: string[];
  sortBy: SortOption;
  onFilterCountryChange: (value: string[]) => void;
  onFilterGradeChange: (value: string[]) => void;
  onSortByChange: (value: SortOption) => void;
  countryOptions: Array<{ value: string; label: string }>;
  gradeOptions: Array<{ value: string; label: string }>;
  sortOptions: SortOptionConfig[];
  filtersDisabled: boolean;
  filteredCount: number;
  totalCount: number;
}

export function GalleryFilters({
  filterCountry,
  filterGrade,
  sortBy,
  onFilterCountryChange,
  onFilterGradeChange,
  onSortByChange,
  countryOptions,
  gradeOptions,
  sortOptions,
  filtersDisabled,
  filteredCount,
  totalCount,
}: GalleryFiltersProps) {
  const navigate = useNavigate();

  return (
    <Stack gap="md" mb="md" style={{ border: 'none' }}>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Tooltip 
          label={filtersDisabled ? (
            <div onClick={() => navigate('/pricing')} style={{ cursor: 'pointer' }}>
              Advanced filters are a Pro feature. Click to upgrade.
            </div>
          ) : undefined}
          disabled={!filtersDisabled}
        >
          <div onClick={filtersDisabled ? () => navigate('/pricing') : undefined} style={filtersDisabled ? { cursor: 'pointer' } : undefined}>
            <MultiSelect
              label={
                filtersDisabled ? (
                  <Group gap={6} align="center">
                    <span>Filter by Country</span>
                    <IconCrown size={14} color="var(--mantine-color-yellow-6)" style={{ flexShrink: 0 }} />
                  </Group>
                ) : "Filter by Country"
              }
              placeholder="All countries"
              data={countryOptions}
              value={filterCountry}
              onChange={onFilterCountryChange}
              clearable
              searchable
              disabled={filtersDisabled}
              leftSection={<IconMapPin size={16} />}
            />
          </div>
        </Tooltip>
        <Tooltip 
          label={filtersDisabled ? (
            <div onClick={() => navigate('/pricing')} style={{ cursor: 'pointer' }}>
              Advanced filters are a Pro feature. Click to upgrade.
            </div>
          ) : undefined}
          disabled={!filtersDisabled}
        >
          <div onClick={filtersDisabled ? () => navigate('/pricing') : undefined} style={filtersDisabled ? { cursor: 'pointer' } : undefined}>
            <MultiSelect
              label={
                filtersDisabled ? (
                  <Group gap={6} align="center">
                    <span>Filter by Grade</span>
                    <IconCrown size={14} color="var(--mantine-color-yellow-6)" style={{ flexShrink: 0 }} />
                  </Group>
                ) : "Filter by Grade"
              }
              placeholder="All grades"
              data={gradeOptions}
              value={filterGrade}
              onChange={onFilterGradeChange}
              clearable
              searchable
              disabled={filtersDisabled}
              leftSection={<IconAward size={16} />}
            />
          </div>
        </Tooltip>
        <Select
          label="Sort by"
          data={sortOptions.map(option => ({
            value: option.value,
            label: option.label,
          }))}
          value={sortBy}
          onChange={(value) => onSortByChange(value as SortOption)}
          leftSection={
            sortOptions.find(opt => opt.value === sortBy)?.icon 
              ? (() => {
                  const Icon = sortOptions.find(opt => opt.value === sortBy)!.icon;
                  return <Icon size={16} />;
                })()
              : <IconSortAscending size={16} />
          }
          renderOption={({ option }) => {
            const sortOption = sortOptions.find(opt => opt.value === option.value);
            const Icon = sortOption?.icon || IconSortAscending;
            const isDesc = option.value.endsWith('Desc');
            return (
              <Group gap="xs">
                <Icon size={16} />
                {isDesc ? <IconSortDescending size={14} /> : <IconSortAscending size={14} />}
                <span>{option.label}</span>
              </Group>
            );
          }}
          maxDropdownHeight={400}
          comboboxProps={{ withinPortal: true }}
        />
      </SimpleGrid>
      {(filterCountry.length > 0 || filterGrade.length > 0) && (
        <Text size="sm" c="dimmed">
          Showing {filteredCount} of {totalCount} banknote{totalCount !== 1 ? 's' : ''}
        </Text>
      )}
    </Stack>
  );
}

