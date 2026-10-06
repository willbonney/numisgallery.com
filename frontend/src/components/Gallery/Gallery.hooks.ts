import { IconAward, IconCalendar, IconCoins, IconMapPin } from '@tabler/icons-react';
import { useMemo } from 'react';
import type { Banknote } from '../../types/banknote';
import { ALL_GRADES } from '../../types/banknote';
import type { SortOption, SortOptionConfig } from './Gallery.types';

export const GRADE_ORDER: Record<string, number> = {
  '70': 100, '69': 99, '68': 98, '67': 97, '66': 96, '65': 95, '64': 94, '63': 93, '62': 92, '61': 91, '60': 90,
  '58': 88, '55': 85, '53': 83, '50': 80, '45': 75, '40': 70, '35': 65, '30': 60, '25': 55, '20': 50, '15': 45,
  '12': 42, '10': 40, '8': 38, '6': 36, '4': 34,
  'UNC': 30, 'AU': 25, 'XF': 20, 'VF': 15, 'F': 10, 'VG': 5, 'G': 1, 'Not Listed': 0,
};

export const FACE_VALUE_GROUP_ORDER: Record<string, number> = {
  '0 or Unknown': 0,
  'Under 1': 1,
  '1-5': 2,
  '5-10': 3,
  '10-20': 4,
  '20-50': 5,
  '50-100': 6,
  '100-200': 7,
  '200-500': 8,
  '500-1000': 9,
  '1000-10000': 10,
  '10000+': 11,
};

/** Year used when ordering a collection. Ranges use the end year for newest/oldest sorts. */
export function sortYear(banknote: Banknote): number {
  if (banknote.isRangeOfYearOfIssue) {
    return banknote.yearOfIssueEnd ?? banknote.yearOfIssueStart ?? 0;
  }
  return banknote.yearOfIssueSingle ?? 0;
}

/** Year used inside a country group: range start, missing years sort last. */
export function groupYear(banknote: Banknote): number {
  if (banknote.isRangeOfYearOfIssue) {
    return banknote.yearOfIssueStart ?? banknote.yearOfIssueEnd ?? 0;
  }
  return banknote.yearOfIssueSingle ?? 0;
}

export function faceValueGroup(value: number): string {
  if (!(value > 0)) return '0 or Unknown';
  if (value < 1) return 'Under 1';
  if (value < 5) return '1-5';
  if (value < 10) return '5-10';
  if (value < 20) return '10-20';
  if (value < 50) return '20-50';
  if (value < 100) return '50-100';
  if (value < 200) return '100-200';
  if (value < 500) return '200-500';
  if (value < 1000) return '500-1000';
  if (value < 10000) return '1000-10000';
  return '10000+';
}

export function filterAndSortBanknotes(
  banknotes: Banknote[],
  filterCountry: string[],
  filterGrade: string[],
  sortBy: SortOption,
): Banknote[] {
  let filtered = [...banknotes];

  if (filterCountry.length > 0) {
    filtered = filtered.filter(b => filterCountry.includes(b.country));
  }

  if (filterGrade.length > 0) {
    filtered = filtered.filter(b => filterGrade.includes(b.grade));
  }

  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'country':
        return (a.country || '').localeCompare(b.country || '');
      case 'countryDesc':
        return (b.country || '').localeCompare(a.country || '');
      case 'grade':
        return (GRADE_ORDER[a.grade] ?? 0) - (GRADE_ORDER[b.grade] ?? 0);
      case 'gradeDesc':
        return (GRADE_ORDER[b.grade] ?? 0) - (GRADE_ORDER[a.grade] ?? 0);
      case 'year':
        return sortYear(a) - sortYear(b);
      case 'yearDesc':
        return sortYear(b) - sortYear(a);
      case 'faceValue':
        return b.faceValue - a.faceValue;
      case 'faceValueDesc':
        return a.faceValue - b.faceValue;
      case 'dateAdded': {
        const aDate = a.created ? new Date(a.created).getTime() : 0;
        const bDate = b.created ? new Date(b.created).getTime() : 0;
        return aDate - bDate;
      }
      case 'dateAddedDesc':
      default: {
        const aDate = a.created ? new Date(a.created).getTime() : 0;
        const bDate = b.created ? new Date(b.created).getTime() : 0;
        return bDate - aDate;
      }
    }
  });

  return filtered;
}

export function useGalleryFilters(banknotes: Banknote[], filterCountry: string[], filterGrade: string[], sortBy: SortOption) {
  return useMemo(
    () => filterAndSortBanknotes(banknotes, filterCountry, filterGrade, sortBy),
    [banknotes, filterCountry, filterGrade, sortBy],
  );
}

export function dateAddedGroup(created: string | undefined, now: Date): string {
  if (!created) return 'Unknown Date';
  const date = new Date(created);
  if (Number.isNaN(date.getTime())) return 'Unknown Date';

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays < 7) return 'This Week';
  if (diffDays < 30) return 'This Month';
  if (diffDays < 365) return 'This Year';
  return 'Older';
}

export function groupBanknotes(
  filteredBanknotes: Banknote[],
  sortBy: SortOption,
  now: Date = new Date(),
): Record<string, Banknote[]> {
  const groups: Record<string, Banknote[]> = {};

  filteredBanknotes.forEach((banknote) => {
    let groupKey = '';

    if (sortBy === 'country' || sortBy === 'countryDesc') {
      groupKey = banknote.country || 'Unknown';
    } else if (sortBy === 'grade' || sortBy === 'gradeDesc') {
      const grade = banknote.grade || '';
      const normalizedGrade = grade.trim().toLowerCase();
      if (!grade || normalizedGrade === '' || normalizedGrade === 'not listed' || normalizedGrade === 'notlisted') {
        groupKey = 'Not Listed';
      } else {
        groupKey = grade;
      }
    } else if (sortBy === 'year' || sortBy === 'yearDesc') {
      const year = sortYear(banknote);
      if (year > 0) {
        const decade = Math.floor(year / 10) * 10;
        groupKey = `${decade}s`;
      } else {
        groupKey = 'Unknown Year';
      }
    } else if (sortBy === 'faceValue' || sortBy === 'faceValueDesc') {
      groupKey = faceValueGroup(banknote.faceValue || 0);
    } else if (sortBy === 'dateAdded' || sortBy === 'dateAddedDesc') {
      groupKey = dateAddedGroup(banknote.created, now);
    } else {
      groupKey = 'All';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(banknote);
  });

  if (sortBy === 'country' || sortBy === 'countryDesc') {
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].sort((a, b) => {
        const aYear = groupYear(a);
        const bYear = groupYear(b);
        if (aYear === 0 && bYear === 0) return 0;
        if (aYear === 0) return 1;
        if (bYear === 0) return -1;
        return aYear - bYear;
      });
    });
  }

  return groups;
}

export function sortGroupKeys(
  groupedBanknotes: Record<string, Banknote[]>,
  sortBy: SortOption,
): string[] {
  const keys = Object.keys(groupedBanknotes);

  if (sortBy === 'country' || sortBy === 'countryDesc') {
    return keys.sort((a, b) => sortBy === 'country' ? a.localeCompare(b) : b.localeCompare(a));
  }
  if (sortBy === 'grade' || sortBy === 'gradeDesc') {
    return keys.sort((a, b) => {
      const aOrder = GRADE_ORDER[a] ?? 0;
      const bOrder = GRADE_ORDER[b] ?? 0;
      return sortBy === 'grade' ? aOrder - bOrder : bOrder - aOrder;
    });
  }
  if (sortBy === 'year' || sortBy === 'yearDesc') {
    return keys.sort((a, b) => {
      if (a === 'Unknown Year') return 1;
      if (b === 'Unknown Year') return -1;
      const aDecade = parseInt(a.replace('s', ''), 10) || 0;
      const bDecade = parseInt(b.replace('s', ''), 10) || 0;
      return sortBy === 'year' ? aDecade - bDecade : bDecade - aDecade;
    });
  }
  if (sortBy === 'faceValue' || sortBy === 'faceValueDesc') {
    return keys.sort((a, b) => {
      const aOrder = FACE_VALUE_GROUP_ORDER[a] ?? 0;
      const bOrder = FACE_VALUE_GROUP_ORDER[b] ?? 0;
      return sortBy === 'faceValue' ? bOrder - aOrder : aOrder - bOrder;
    });
  }
  if (sortBy === 'dateAdded' || sortBy === 'dateAddedDesc') {
    const order: Record<string, number> = {
      'Today': 1,
      'This Week': 2,
      'This Month': 3,
      'This Year': 4,
      'Older': 5,
      'Unknown Date': 6,
    };
    return keys.sort((a, b) => {
      const aOrder = order[a] ?? 0;
      const bOrder = order[b] ?? 0;
      return sortBy === 'dateAdded' ? aOrder - bOrder : bOrder - aOrder;
    });
  }

  return keys;
}

export function useGalleryGrouping(filteredBanknotes: Banknote[], sortBy: SortOption) {
  const groupedBanknotes = useMemo(
    () => groupBanknotes(filteredBanknotes, sortBy),
    [filteredBanknotes, sortBy],
  );

  const sortedGroupKeys = useMemo(
    () => sortGroupKeys(groupedBanknotes, sortBy),
    [groupedBanknotes, sortBy],
  );

  return { groupedBanknotes, sortedGroupKeys };
}

export function useUniqueCountries(banknotes: Banknote[]) {
  return useMemo(() => {
    const countries = new Set<string>();
    banknotes.forEach(b => {
      if (b.country) {
        countries.add(b.country);
      }
    });
    return Array.from(countries).sort();
  }, [banknotes]);
}

export function useGalleryOptions(): { sortOptions: SortOptionConfig[]; gradeOptions: Array<{ value: string; label: string }> } {
  const sortOptions = useMemo<SortOptionConfig[]>(() => [
    { value: 'dateAdded', label: 'Date Added (Oldest First)', icon: IconCalendar },
    { value: 'dateAddedDesc', label: 'Date Added (Newest First)', icon: IconCalendar },
    { value: 'country', label: 'Country (A-Z)', icon: IconMapPin },
    { value: 'countryDesc', label: 'Country (Z-A)', icon: IconMapPin },
    { value: 'grade', label: 'Grade (Lowest First)', icon: IconAward },
    { value: 'gradeDesc', label: 'Grade (Highest First)', icon: IconAward },
    { value: 'year', label: 'Year (Oldest First)', icon: IconCalendar },
    { value: 'yearDesc', label: 'Year (Newest First)', icon: IconCalendar },
    { value: 'faceValue', label: 'Face Value (Highest First)', icon: IconCoins },
    { value: 'faceValueDesc', label: 'Face Value (Lowest First)', icon: IconCoins },
  ], []);

  const gradeOptions = useMemo(() => 
    ALL_GRADES.map(grade => ({ value: grade, label: grade === 'Not Listed' ? 'Not Listed' : grade }))
  , []);

  return { sortOptions, gradeOptions };
}

