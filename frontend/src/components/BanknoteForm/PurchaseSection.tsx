import { SimpleGrid, NumberInput, Select } from '@mantine/core';
import { CURRENCIES } from '../../types/banknote';
import type { UseFormReturnType } from '@mantine/form';
import type { Banknote, BanknoteFormData } from '../../types/banknote';
import { DateInput } from '@mantine/dates';

type PurchaseSectionProps = {
  form: UseFormReturnType<BanknoteFormData>;
  banknote?: Banknote;
  isProcessing: boolean;
  onNumberInputFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
};

export function PurchaseSection({ form, banknote, isProcessing, onNumberInputFocus }: PurchaseSectionProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }}>
      <NumberInput
        label="Purchase Price"
        placeholder="0"
        min={0}
        disabled={isProcessing}
        onFocus={onNumberInputFocus}
        onClick={(e) => e.currentTarget.select()}
        {...form.getInputProps('purchasePrice')}
      />
      <Select
        label="Price Currency"
        data={CURRENCIES.map((c) => ({ value: c, label: c }))}
        disabled={isProcessing}
        {...form.getInputProps('purchasePriceCurrency')}
      />
          <DateInput
        label="Date of Purchase"
        placeholder="Select date"
        valueFormat="YYYY-MM-DD"
        disabled={isProcessing}
        defaultValue={banknote?.dateOfPurchase ? new Date(banknote.dateOfPurchase) : undefined}
        onChange={(value) => {
          form.setFieldValue('dateOfPurchase', value || '')
        }}
      />
    </SimpleGrid>
  );
}

