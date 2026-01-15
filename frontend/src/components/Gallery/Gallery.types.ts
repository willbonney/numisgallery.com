import type { Banknote } from '../../types/banknote';

export type SortOption = 'country' | 'countryDesc' | 'grade' | 'gradeDesc' | 'year' | 'yearDesc' | 'faceValue' | 'faceValueDesc' | 'dateAdded' | 'dateAddedDesc';

export interface GalleryProps {
  banknotes: Banknote[];
  onEdit?: (banknote: Banknote) => void;
  onDelete?: (banknote: Banknote) => void;
  showOwner?: boolean;
  gateFilters?: boolean;
  initialBanknoteId?: string;
}

export interface SortOptionConfig {
  value: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

