import { IconAward, IconCalendar, IconCoins, IconMapPin } from '@tabler/icons-react';
import { useMemo } from 'react';
import type { Banknote } from '../../types/banknote';
import { ALL_GRADES } from '../../types/banknote';
import type { SortOption, SortOptionConfig } from './Gallery.types';

export function useGalleryFilters(banknotes: Banknote[], filterCountry: string[], filterGrade: string[], sortBy: SortOption) {
  const filteredAndSortedBanknotes = useMemo(() => {
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
        case 'grade': {
          const gradeOrder: Record<string, number> = {
            '70': 100, '69': 99, '68': 98, '67': 97, '66': 96, '65': 95, '64': 94, '63': 93, '62': 92, '61': 91, '60': 90,
            '58': 88, '55': 85, '53': 83, '50': 80, '45': 75, '40': 70, '35': 65, '30': 60, '25': 55, '20': 50, '15': 45,
            '12': 42, '10': 40, '8': 38, '6': 36, '4': 34,
            'UNC': 30, 'AU': 25, 'XF': 20, 'VF': 15, 'F': 10, 'VG': 5, 'G': 1, 'Not Listed': 0
          };
          const aOrder = gradeOrder[a.grade] ?? 0;
          const bOrder = gradeOrder[b.grade] ?? 0;
          return aOrder - bOrder;
        }
        case 'gradeDesc': {
          const gradeOrder: Record<string, number> = {
            '70': 100, '69': 99, '68': 98, '67': 97, '66': 96, '65': 95, '64': 94, '63': 93, '62': 92, '61': 91, '60': 90,
            '58': 88, '55': 85, '53': 83, '50': 80, '45': 75, '40': 70, '35': 65, '30': 60, '25': 55, '20': 50, '15': 45,
            '12': 42, '10': 40, '8': 38, '6': 36, '4': 34,
            'UNC': 30, 'AU': 25, 'XF': 20, 'VF': 15, 'F': 10, 'VG': 5, 'G': 1, 'Not Listed': 0
          };
          const aOrder = gradeOrder[a.grade] ?? 0;
          const bOrder = gradeOrder[b.grade] ?? 0;
          return bOrder - aOrder;
        }
        case 'year': {
          const aYear = a.isRangeOfYearOfIssue ? (a.yearOfIssueEnd ?? a.yearOfIssueStart ?? 0) : (a.yearOfIssueSingle ?? 0);
          const bYear = b.isRangeOfYearOfIssue ? (b.yearOfIssueEnd ?? b.yearOfIssueStart ?? 0) : (b.yearOfIssueSingle ?? 0);
          return aYear - bYear;
        }
        case 'yearDesc': {
          const aYear = a.isRangeOfYearOfIssue ? (a.yearOfIssueEnd ?? a.yearOfIssueStart ?? 0) : (a.yearOfIssueSingle ?? 0);
          const bYear = b.isRangeOfYearOfIssue ? (b.yearOfIssueEnd ?? b.yearOfIssueStart ?? 0) : (b.yearOfIssueSingle ?? 0);
          return bYear - aYear;
        }
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
  }, [banknotes, filterCountry, filterGrade, sortBy]);

  return filteredAndSortedBanknotes;
}

export function useGalleryGrouping(filteredBanknotes: Banknote[], sortBy: SortOption) {
  const groupedBanknotes = useMemo(() => {
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
        const year = banknote.isRangeOfYearOfIssue 
          ? (banknote.yearOfIssueEnd ?? banknote.yearOfIssueStart ?? 0)
          : (banknote.yearOfIssueSingle ?? 0);
        if (year > 0) {
          const decade = Math.floor(year / 10) * 10;
          groupKey = `${decade}s`;
        } else {
          groupKey = 'Unknown Year';
        }
      } else if (sortBy === 'faceValue' || sortBy === 'faceValueDesc') {
        const value = banknote.faceValue || 0;
        if (value >= 1 && value < 5) {
          groupKey = '1-5';
        } else if (value >= 5 && value < 10) {
          groupKey = '5-10';
        } else if (value >= 20 && value < 50) {
          groupKey = '20-50';
        } else if (value >= 50 && value < 100) {
          groupKey = '50-100';
        } else if (value >= 100 && value < 200) {
          groupKey = '100-200';
        } else if (value >= 200 && value < 500) {
          groupKey = '200-500';
        } else if (value >= 500 && value < 1000) {
          groupKey = '500-1000';
        } else if (value >= 1000 && value < 10000) {
          groupKey = '1000-10000';
        } else if (value >= 10000) {
          groupKey = '10000+';
        } else if (value >= 10 && value < 20) {
          groupKey = '5-10';
        } else {
          groupKey = '0 or Unknown';
        }
      } else if (sortBy === 'dateAdded' || sortBy === 'dateAddedDesc') {
        if (!banknote.created) {
          groupKey = 'Unknown Date';
        } else {
          const date = new Date(banknote.created);
          const now = new Date();
          const diffTime = now.getTime() - date.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            groupKey = 'Today';
          } else if (diffDays < 7) {
            groupKey = 'This Week';
          } else if (diffDays < 30) {
            groupKey = 'This Month';
          } else if (diffDays < 365) {
            groupKey = 'This Year';
          } else {
            groupKey = 'Older';
          }
        }
      } else {
        groupKey = 'All';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(banknote);
    });

    // Sort banknotes within each group by year (oldest to newest) when sorting by country
    if (sortBy === 'country' || sortBy === 'countryDesc') {
      Object.keys(groups).forEach(groupKey => {
        groups[groupKey].sort((a, b) => {
          const aYear = a.isRangeOfYearOfIssue ? (a.yearOfIssueStart ?? a.yearOfIssueEnd ?? 0) : (a.yearOfIssueSingle ?? 0);
          const bYear = b.isRangeOfYearOfIssue ? (b.yearOfIssueStart ?? b.yearOfIssueEnd ?? 0) : (b.yearOfIssueSingle ?? 0);
          // If years are equal, maintain original order
          if (aYear === 0 && bYear === 0) return 0;
          if (aYear === 0) return 1; // Put items without year at the end
          if (bYear === 0) return -1;
          return aYear - bYear; // Oldest first
        });
      });
    }

    return groups;
  }, [filteredBanknotes, sortBy]);

  const sortedGroupKeys = useMemo(() => {
    const keys = Object.keys(groupedBanknotes);
    
    if (sortBy === 'country' || sortBy === 'countryDesc') {
      return keys.sort((a, b) => sortBy === 'country' ? a.localeCompare(b) : b.localeCompare(a));
    } else if (sortBy === 'grade' || sortBy === 'gradeDesc') {
      const gradeOrder: Record<string, number> = {
        '70': 100, '69': 99, '68': 98, '67': 97, '66': 96, '65': 95, '64': 94, '63': 93, '62': 92, '61': 91, '60': 90,
        '58': 88, '55': 85, '53': 83, '50': 80, '45': 75, '40': 70, '35': 65, '30': 60, '25': 55, '20': 50, '15': 45,
        '12': 42, '10': 40, '8': 38, '6': 36, '4': 34,
        'UNC': 30, 'AU': 25, 'XF': 20, 'VF': 15, 'F': 10, 'VG': 5, 'G': 1, 'Not Listed': 0
      };
      return keys.sort((a, b) => {
        const aOrder = gradeOrder[a] ?? 0;
        const bOrder = gradeOrder[b] ?? 0;
        return sortBy === 'grade' ? aOrder - bOrder : bOrder - aOrder;
      });
    } else if (sortBy === 'year' || sortBy === 'yearDesc') {
      return keys.sort((a, b) => {
        const aDecade = parseInt(a.replace('s', '')) || 0;
        const bDecade = parseInt(b.replace('s', '')) || 0;
        if (a === 'Unknown Year') return 1;
        if (b === 'Unknown Year') return -1;
        return sortBy === 'year' ? aDecade - bDecade : bDecade - aDecade;
      });
    } else if (sortBy === 'faceValue' || sortBy === 'faceValueDesc') {
      const order: Record<string, number> = {
        '1-5': 1,
        '5-10': 2,
        '20-50': 3,
        '50-100': 4,
        '100-200': 5,
        '200-500': 6,
        '500-1000': 7,
        '1000-10000': 8,
        '10000+': 9,
        '0 or Unknown': 0,
      };
      return keys.sort((a, b) => {
        const aOrder = order[a] ?? 0;
        const bOrder = order[b] ?? 0;
        return sortBy === 'faceValue' ? bOrder - aOrder : aOrder - bOrder;
      });
    } else if (sortBy === 'dateAdded' || sortBy === 'dateAddedDesc') {
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
  }, [groupedBanknotes, sortBy]);

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

