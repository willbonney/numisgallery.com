import 'flag-icons/css/flag-icons.min.css';

// Historical country codes that need special handling
const HISTORICAL_FLAGS: Record<string, string> = {
  // These would need custom flag images
  'zz': 'Zanzibar',
  'cz': 'Czechoslovakia (historical)',
  'yu': 'Yugoslavia (historical)',
  'su': 'Soviet Union (historical)',
  'dd': 'East Germany (historical)',
};

interface CountryFlagProps {
  countryCode: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CountryFlag({ countryCode, size = 'md', className = '' }: CountryFlagProps) {
  const code = countryCode.toLowerCase();
  
  const sizeClass = {
    sm: { width: 16, height: 12 },
    md: { width: 24, height: 18 },
    lg: { width: 32, height: 24 },
  }[size];

  // Check if it's a historical flag we don't have
  if (HISTORICAL_FLAGS[code]) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: sizeClass.width,
          height: sizeClass.height,
          backgroundColor: 'var(--mantine-color-dark-4)',
          borderRadius: 2,
          lineHeight: 0,
          fontSize: 10,
        }}
        title={HISTORICAL_FLAGS[code]}
      >
        🏳️
      </span>
    );
  }

  return (
    <span
      className={`fi fi-${code} ${className}`}
      style={{
        display: 'flex',
        width: sizeClass.width,
        height: sizeClass.height,
        backgroundSize: 'cover',
        borderRadius: 2,

      }}
      title={countryCode.toUpperCase()}
    />
  );
}

