import { Stack } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import type { User } from '../../contexts/types';
import { useSettings } from '../../hooks/useSettings';
import { useSubscription } from '../../hooks/useSubscription';
import pb from '../../lib/pocketbase';
import { BanknoteModal } from './BanknoteModal';
import { DeleteBanknoteModal } from './DeleteBanknoteModal';
import { useGalleryFilters, useGalleryGrouping, useGalleryOptions, useUniqueCountries } from './Gallery.hooks';
import type { GalleryProps, SortOption } from './Gallery.types';
import { GalleryFilters } from './GalleryFilters';
import { GalleryGroup } from './GalleryGroup';

export function Gallery({ banknotes, onEdit, onDelete, showOwner = true, gateFilters = true, initialBanknoteId }: GalleryProps) {
  const initialBanknoteHandledRef = useRef(false);
  const { settings, updateGallerySettings } = useSettings();
  const { subscription } = useSubscription();
  const isPro = subscription?.tier === 'pro';
  const filtersDisabled = gateFilters && !isPro;
  
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [owner, setOwner] = useState<User | null>(null);
  const [filterCountry, setFilterCountry] = useState<string[]>([]);
  const [filterGrade, setFilterGrade] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('country');
  
  const loadSectionsState = () => {
    const saved = localStorage.getItem('gallerySectionsOpen');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  };
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(loadSectionsState);
  
  useEffect(() => {
    localStorage.setItem('gallerySectionsOpen', JSON.stringify(openSections));
  }, [openSections]);

  const uniqueCountries = useUniqueCountries(banknotes);
  const filteredAndSortedBanknotes = useGalleryFilters(banknotes, filterCountry, filterGrade, sortBy);
  const { groupedBanknotes, sortedGroupKeys } = useGalleryGrouping(filteredAndSortedBanknotes, sortBy);
  const { sortOptions, gradeOptions } = useGalleryOptions();
  
  const countryOptions = uniqueCountries.map(country => ({ value: country, label: country }));
  
  const selectedBanknote = selectedIndex !== null ? filteredAndSortedBanknotes[selectedIndex] : null;

  // Open banknote by ID from query parameter (only on initial load)
  useEffect(() => {
    if (initialBanknoteId && filteredAndSortedBanknotes.length > 0 && !initialBanknoteHandledRef.current) {
      const index = filteredAndSortedBanknotes.findIndex(b => b.id === initialBanknoteId);
      if (index !== -1) {
        setSelectedIndex(index);
        initialBanknoteHandledRef.current = true;
      }
    }
  }, [initialBanknoteId, filteredAndSortedBanknotes]);

  useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= filteredAndSortedBanknotes.length) {
      // Reset selection when filtered list changes - this is intentional cleanup
      setSelectedIndex(null);
      setOwner(null);
    }
  }, [filteredAndSortedBanknotes.length, selectedIndex]);

  useEffect(() => {
    if (!selectedBanknote?.userId) {
      return;
    }

    let cancelled = false;
    const userId = selectedBanknote.userId;

    pb.collection('users')
      .getOne<User>(userId)
      .then((user) => {
        if (!cancelled) {
          setOwner(user);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch owner:', error);
        if (!cancelled) {
          setOwner(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBanknote?.userId]);

  useEffect(() => {
    if (settings && settings.id) {
      if (settings.gallerySort) {
        setSortBy(settings.gallerySort);
      }
      if (settings.filterCountry && settings.filterCountry.length > 0) {
        setFilterCountry(settings.filterCountry);
      }
      if (settings.filterGrade && settings.filterGrade.length > 0) {
        setFilterGrade(settings.filterGrade);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.id]);

  useEffect(() => {
    if (!settings?.id) return;

    if (
      settings.gallerySort === sortBy &&
      JSON.stringify(settings.filterCountry || []) === JSON.stringify(filterCountry) &&
      JSON.stringify(settings.filterGrade || []) === JSON.stringify(filterGrade)
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      updateGallerySettings({
        gallerySort: sortBy,
        filterCountry: filterCountry,
        filterGrade: filterGrade,
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [sortBy, filterCountry, filterGrade, settings, updateGallerySettings]);

  useEffect(() => {
    const newOpenSections: Record<string, boolean> = {};
    sortedGroupKeys.forEach(key => {
      newOpenSections[key] = openSections[key] ?? true;
    });
    setOpenSections(newOpenSections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const handleClose = () => {
    setSelectedIndex(null);
    setShowDeleteModal(false);
    setOwner(null);
  };

  const handleDeleteConfirm = () => {
    if (selectedBanknote && onDelete) {
      onDelete(selectedBanknote);
      handleClose();
    }
  };

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <GalleryFilters
        filterCountry={filterCountry}
        filterGrade={filterGrade}
        sortBy={sortBy}
        onFilterCountryChange={setFilterCountry}
        onFilterGradeChange={setFilterGrade}
        onSortByChange={setSortBy}
        countryOptions={countryOptions}
        gradeOptions={gradeOptions}
        sortOptions={sortOptions}
        filtersDisabled={filtersDisabled}
        filteredCount={filteredAndSortedBanknotes.length}
        totalCount={banknotes.length}
      />

      <Stack gap="md">
        {sortedGroupKeys.map((groupKey) => {
          const groupBanknotes = groupedBanknotes[groupKey];
          const isOpen = openSections[groupKey] ?? true;
          
          return (
            <GalleryGroup
              key={groupKey}
              groupKey={groupKey}
              groupBanknotes={groupBanknotes}
              isOpen={isOpen}
              onToggle={() => toggleSection(groupKey)}
              sortBy={sortBy}
              onBanknoteClick={setSelectedIndex}
              filteredBanknotes={filteredAndSortedBanknotes}
            />
          );
        })}
      </Stack>

      <BanknoteModal
        banknote={selectedBanknote}
        owner={owner}
        showOwner={showOwner}
        onClose={handleClose}
        onEdit={onEdit}
        onDelete={() => setShowDeleteModal(true)}
      />

      <DeleteBanknoteModal
        opened={showDeleteModal}
        banknote={selectedBanknote}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

