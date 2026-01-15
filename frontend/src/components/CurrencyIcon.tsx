import { Text } from '@mantine/core';

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  CHF: 'Fr',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  KRW: '₩',
  MXN: '$',
  BRL: 'R$',
  RUB: '₽',
  ZAR: 'R',
  SGD: 'S$',
  HKD: 'HK$',
  NOK: 'kr',
  SEK: 'kr',
  DKK: 'kr',
  NZD: 'NZ$',
  TRY: '₺',
  THB: '฿',
  PLN: 'zł',
  PHP: '₱',
  TWD: 'NT$',
  MYR: 'RM',
  IDR: 'Rp',
  VND: '₫',
  AED: 'د.إ',
  SAR: '﷼',
  EGP: 'E£',
  NGN: '₦',
  PKR: '₨',
  BDT: '৳',
  // Historical
  DEM: 'DM',
  FRF: '₣',
  ITL: '₤',
  ESP: '₧',
  GRD: '₯',
  ATS: 'öS',
  NLG: 'ƒ',
  BEF: 'Fr',
  PTE: '$',
  FIM: 'mk',
  IEP: '£',
};

interface CurrencyIconProps {
  currencyCode: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function CurrencyIcon({ currencyCode, size = 'sm' }: CurrencyIconProps) {
  const symbol = CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
  
  return (
    <Text
      component="span"
      size={size}
      fw={600}
      c="dimmed"
      style={{ fontFamily: 'monospace' }}
    >
      {symbol}
    </Text>
  );
}

