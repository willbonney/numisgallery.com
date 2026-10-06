import 'flag-icons/css/flag-icons.min.css';

interface CountryFlagProps {
  countryCode: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CountryFlag({ countryCode, size = 'md', className = '' }: CountryFlagProps) {
  const code = (countryCode || '').toLowerCase();
  
  const sizeClass = {
    sm: { width: 16, height: 12 },
    md: { width: 24, height: 18 },
    lg: { width: 32, height: 24 },
  }[size];

  if (!code) {
    return null;
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

