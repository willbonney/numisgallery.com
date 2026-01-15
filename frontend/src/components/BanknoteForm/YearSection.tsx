import { Checkbox, SimpleGrid, NumberInput, Group } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { BanknoteFormData } from '../../types/banknote';

type YearSectionProps = {
  form: UseFormReturnType<BanknoteFormData>;
  isProcessing: boolean;
  onNumberInputFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
};

export function YearSection({ form, isProcessing, onNumberInputFocus }: YearSectionProps) {
  return (
    <Group gap="md" align="center">
          <Checkbox
              mr={32}
        label="Range of years"
        disabled={isProcessing}
        mt={12}
        {...form.getInputProps('isRangeOfYearOfIssue', { type: 'checkbox' })}
      />
      {form.values.isRangeOfYearOfIssue ? (
        <SimpleGrid cols={2}>
          <NumberInput
            label="Start Year"
            placeholder="1900"
            min={1}
            max={new Date().getFullYear()}
            disabled={isProcessing}
            onFocus={onNumberInputFocus}
            onClick={(e) => e.currentTarget.select()}
            {...form.getInputProps('yearOfIssueStart')}
          />
          <NumberInput
            label="End Year"
            placeholder="1950"
            min={1}
            max={new Date().getFullYear()}
            disabled={isProcessing}
            onFocus={onNumberInputFocus}
            onClick={(e) => e.currentTarget.select()}
            {...form.getInputProps('yearOfIssueEnd')}
          />
        </SimpleGrid>
      ) : (
        <NumberInput
          label="Year of Issue"
          placeholder="1935"
          min={1}
          max={new Date().getFullYear()}
          style={{ maxWidth: 200 }}
          disabled={isProcessing}
          onFocus={onNumberInputFocus}
          onClick={(e) => e.currentTarget.select()}
          {...form.getInputProps('yearOfIssueSingle')}
        />
      )}
    </Group>
  );
}

