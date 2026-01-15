import { useState, useEffect, useCallback } from 'react';
import { Container, Title, Text, Center, Loader } from '@mantine/core';
import { Gallery } from '../components/Gallery';
import { banknoteService } from '../services/banknotes';
import type { Banknote } from '../types/banknote';

export function CommunityPage() {
  const [banknotes, setBanknotes] = useState<Banknote[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBanknotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await banknoteService.getAllPublicBanknotes();
      setBanknotes(data);
    } catch (error) {
      console.error('Failed to load community banknotes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanknotes();
  }, [loadBanknotes]);

  if (loading) {
    return (
      <Center h={400}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container size="xl" py="md">
      <Title order={2} mb="xs">
        Community
      </Title>
      <Text c="dimmed" size="sm" mb="lg">
        {banknotes.length} public banknote{banknotes.length !== 1 ? 's' : ''} from the community
      </Text>
      {banknotes.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No public banknotes in the community yet.
        </Text>
      ) : (
        <Gallery banknotes={banknotes} gateFilters={false} />
      )}
    </Container>
  );
}



