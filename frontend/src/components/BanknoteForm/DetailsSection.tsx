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
        disabled={isProcessing}
        description={
          form.values.isSpecimen
            ? 'Entering a serial will uncheck Specimen'
            : undefined
        }
        value={form.values.serialNumber}
        onChange={(event) => {
          const value = event.currentTarget.value;
          form.setFieldValue('serialNumber', value);
          // A real serial means this is not a specimen
          if (value.trim() && form.values.isSpecimen) {
            form.setFieldValue('isSpecimen', false);
          }
        }}
        error={form.errors.serialNumber}
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

