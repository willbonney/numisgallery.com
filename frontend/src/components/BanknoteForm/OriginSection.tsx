import { Autocomplete, Box, Center, Group, SegmentedControl, SimpleGrid, TextInput, Tooltip } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconInfoCircle, IconWorld } from '@tabler/icons-react';
import { COUNTRIES } from '../../data/countries';
import type { BanknoteFormData, NoteType } from '../../types/banknote';
import { CountryFlag } from '../CountryFlag';

type OriginSectionProps = {
  form: UseFormReturnType<BanknoteFormData>;
  isProcessing: boolean;
  onCountryChange: (value: string) => void;
  onNoteTypeChange: (value: NoteType) => void;
};

export function OriginSection({ form, isProcessing, onCountryChange, onNoteTypeChange }: OriginSectionProps) {
  const countryOptions = COUNTRIES.map(c => c.value);
  const isUSNote = form.values.noteType === 'us';

  return (
    <>
      <Group justify="center" mb="lg">
        <SegmentedControl
          value={form.values.noteType}
          onChange={(value) => onNoteTypeChange(value as NoteType)}
          disabled={isProcessing}
          size="lg"
          data={[
            {
              value: 'world',
              label: (
                <Center style={{ gap: 10 }}>
                  <IconWorld size={24} stroke={1.5} style={{ color: '#228be6' }} />
                  <span style={{ fontSize: '16px', fontWeight: 500 }}>World Note</span>
                </Center>
              ),
            },
            {
              value: 'us',
              label: (
                <Center style={{ gap: 10 }}>
                  <Box style={{ display: 'flex', alignItems: 'center' }}>
                    <CountryFlag countryCode="us" size="md" />
                  </Box>
                  <span style={{ fontSize: '16px', fontWeight: 500 }}>US Note</span>
                </Center>
              ),
            },
          ]}
        />
      </Group>
      <SimpleGrid cols={{ base: 1, sm: isUSNote ? 3 : 4 }}>
        {isUSNote ? (
          <>
            <TextInput
              label="Authority"
              placeholder="e.g. Federal Reserve, United States"
              required
              disabled={isProcessing}
              {...form.getInputProps('authority')}
            />
            <TextInput
              label="City"
              placeholder="e.g. Kansas City, New York"
              disabled={isProcessing}
              {...form.getInputProps('city')}
            />
          </>
        ) : (
          <>
            <Autocomplete
              label="Country"
              placeholder="Search country..."
              data={countryOptions}
              required
              limit={20}
              disabled={isProcessing}
              value={form.values.country}
              onChange={onCountryChange}
              error={form.errors.country}
              renderOption={({ option }) => {
                const countryData = COUNTRIES.find(c => c.value === option.value);
                return (
                  <Group gap="xs">
                    {countryData?.code && <CountryFlag countryCode={countryData.code} size="sm" />}
                    <span>{option.value}</span>
                  </Group>
                );
              }}
            />
            <TextInput
              disabled
              label={
                <Group gap={4}>
                  Country Code (ISO)
                  <Tooltip label="Automatically filled when you select a country" withinPortal>
                    <IconInfoCircle size={14} style={{ opacity: 0.5 }} />
                  </Tooltip>
                </Group>
              }
              placeholder="e.g. fr"
              maxLength={2}
              {...form.getInputProps('countryCode')}
            />
            <TextInput
              label="Authority"
              placeholder="e.g. Banque de France"
              disabled={isProcessing}
              {...form.getInputProps('authority')}
            />
          </>
        )}
        <TextInput
          label={isUSNote ? "Friedberg Number" : "Pick Number"}
          placeholder={isUSNote ? "e.g. 1151a" : "e.g. 27b or 1151a"}
          disabled={isProcessing}
          {...form.getInputProps('pickNumber')}
        />
      </SimpleGrid>
    </>
  );
}

