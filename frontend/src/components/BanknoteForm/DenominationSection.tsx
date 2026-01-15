import { NumberInput, Select, SimpleGrid, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { BanknoteFormData } from '../../types/banknote';
import { ALL_GRADES } from '../../types/banknote';

type DenominationSectionProps = {
  form: UseFormReturnType<BanknoteFormData>;
  isProcessing: boolean;
  onNumberInputFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
  onGradeChange?: (value: string | null) => void;
};

export function DenominationSection({ form, isProcessing, onNumberInputFocus, onGradeChange }: DenominationSectionProps) {
  const isUSNote = form.values.noteType === 'us';

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
      <NumberInput
        label="Face Value"
        placeholder="100"
        min={1}
        required
        disabled={isProcessing}
        onFocus={onNumberInputFocus}
        onClick={(e) => e.currentTarget.select()}
        {...form.getInputProps('faceValue')}
      />
      <TextInput
        label="Denomination"
        placeholder={isUSNote ? "USD (auto-filled)" : "e.g. Dollar, Peso, Yuan"}
        disabled={isProcessing || isUSNote}
        value={isUSNote ? 'USD' : form.values.currency}
        onChange={(e) => !isUSNote && form.setFieldValue('currency', e.target.value)}
      />
      <Select
        label="Grade"
        data={ALL_GRADES.map(g => ({ value: g, label: g }))}
        disabled={isProcessing}
        value={form.values.grade}
        onChange={(value) => {
          form.setFieldValue('grade', (value || '') as typeof form.values.grade);
          if (onGradeChange) {
            onGradeChange(value);
          }
        }}
        maxDropdownHeight={400}
      />
    </SimpleGrid>
  );
}

