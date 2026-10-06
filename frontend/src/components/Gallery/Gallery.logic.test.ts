import { describe, expect, it } from 'vitest';
import { note } from '../../test/banknoteFixture';
import {
  dateAddedGroup,
  faceValueGroup,
  filterAndSortBanknotes,
  groupBanknotes,
  sortGroupKeys,
} from './Gallery.hooks';

const notes = [
  note({ id: 'a', country: 'Zambia', grade: '70', faceValue: 10, yearOfIssueSingle: 2001, created: '2020-01-01' }),
  note({ id: 'b', country: 'France', grade: '4', faceValue: 15, yearOfIssueSingle: 1950, created: '2024-01-01' }),
  note({ id: 'c', country: 'France', grade: 'XF', faceValue: 0.5, isRangeOfYearOfIssue: true, yearOfIssueStart: 1960, yearOfIssueEnd: 1962 }),
  note({ id: 'd', country: 'France', grade: 'Not Listed', faceValue: 1000, yearOfIssueSingle: undefined }),
];

describe('faceValueGroup', () => {
  it('keeps 10-20 notes out of the 5-10 bucket', () => {
    expect(faceValueGroup(10)).toBe('10-20');
    expect(faceValueGroup(15)).toBe('10-20');
    expect(faceValueGroup(5)).toBe('5-10');
    expect(faceValueGroup(9.9)).toBe('5-10');
    expect(faceValueGroup(0.5)).toBe('Under 1');
    expect(faceValueGroup(0)).toBe('0 or Unknown');
    expect(faceValueGroup(10000)).toBe('10000+');
  });
});

describe('filterAndSortBanknotes', () => {
  it('filters by country and grade without mutating the source list', () => {
    const original = [...notes];
    const filtered = filterAndSortBanknotes(notes, ['France'], ['4', 'XF'], 'grade');
    expect(filtered.map((item) => item.id)).toEqual(['c', 'b']);
    expect(notes.map((item) => item.id)).toEqual(original.map((item) => item.id));
  });

  it('sorts face value high to low and grades from the catalog order', () => {
    expect(filterAndSortBanknotes(notes, [], [], 'faceValue').map((item) => item.id)).toEqual(['d', 'b', 'a', 'c']);
    expect(filterAndSortBanknotes(notes, [], [], 'grade').map((item) => item.grade)).toEqual([
      'Not Listed',
      'XF',
      '4',
      '70',
    ]);
  });
});

describe('groupBanknotes', () => {
  it('groups face values and sorts a country oldest-first with undated notes last', () => {
    const groups = groupBanknotes(notes, 'faceValue');
    expect(groups['10-20'].map((item) => item.id).sort()).toEqual(['a', 'b']);
    expect(groups['Under 1'].map((item) => item.id)).toEqual(['c']);
    expect(groups['5-10']).toBeUndefined();

    const byCountry = groupBanknotes(notes, 'country');
    expect(byCountry.France.map((item) => item.id)).toEqual(['b', 'c', 'd']);
  });

  it('orders face-value groups from highest to lowest', () => {
    const groups = groupBanknotes(notes, 'faceValue');
    expect(sortGroupKeys(groups, 'faceValue')[0]).toBe('1000-10000');
    expect(sortGroupKeys(groups, 'faceValueDesc')[0]).toBe('Under 1');
  });

  it('buckets dates relative to now and treats invalid dates as unknown', () => {
    const now = new Date('2026-10-05T12:00:00Z');
    expect(dateAddedGroup('2026-10-05T01:00:00Z', now)).toBe('Today');
    expect(dateAddedGroup('2026-10-01T12:00:00Z', now)).toBe('This Week');
    expect(dateAddedGroup('2026-09-20T12:00:00Z', now)).toBe('This Month');
    expect(dateAddedGroup('2026-01-01T12:00:00Z', now)).toBe('This Year');
    expect(dateAddedGroup('2020-01-01T12:00:00Z', now)).toBe('Older');
    expect(dateAddedGroup('not-a-date', now)).toBe('Unknown Date');
    expect(dateAddedGroup(undefined, now)).toBe('Unknown Date');
  });
});
