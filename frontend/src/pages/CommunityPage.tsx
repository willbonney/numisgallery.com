import { useState, useEffect, useCallback } from "react";
import { Container, Title, Text, Center, Loader } from "@mantine/core";
import { Gallery } from "../components/Gallery";
import { banknoteService } from "../services/banknotes";
import type { Banknote } from "../types/banknote";

export function CommunityPage() {
  const [banknotes, setBanknotes] = useState<Banknote[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBanknotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await banknoteService.getAllPublicBanknotes();
      setBanknotes(data);
    } catch (error) {
      console.error("Failed to load community banknotes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanknotes();
  }, [loadBanknotes]);

  return (
    <Container size="xl" py="md">
      <Title order={1} mb="xs">
        Community Banknote Gallery
      </Title>
      <Text c="dimmed" size="sm" mb="lg">
        {loading
          ? "Browse public banknote collections from collectors worldwide — PMG-certified paper money, world notes, and US currency."
          : `Browse ${banknotes.length} public banknote${
              banknotes.length !== 1 ? "s" : ""
            } from collectors worldwide — PMG-certified paper money, world notes, and US currency.`}
      </Text>
      {loading ? (
        <Center h={400}>
          <Loader />
        </Center>
      ) : banknotes.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No public banknotes in the community yet.
        </Text>
      ) : (
        <Gallery banknotes={banknotes} gateFilters={false} />
      )}
    </Container>
  );
}
