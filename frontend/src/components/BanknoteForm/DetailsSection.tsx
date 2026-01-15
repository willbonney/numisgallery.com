import { SimpleGrid, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { BanknoteFormData } from '../../types/banknote';

type DetailsSectionProps = {
  form: UseFormReturnType<BanknoteFormData>;
  isProcessing: boolean;
};

export function DetailsSection({ form, isProcessing }: DetailsSectionProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <TextInput
        label="Serial Number"
        placeholder="A12345678B"
        disabled={isProcessing || form.values.isSpecimen}
        {...form.getInputProps('serialNumber')}
      />
      <TextInput
        label="Watermark"
        placeholder="e.g. Portrait"
        disabled={isProcessing}
        {...form.getInputProps('watermark')}
      />
    </SimpleGrid>
  );
}

