import {
  Anchor,
  Box,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconArrowDown,
  IconArrowRight,
  IconBrain,
  IconCamera,
  IconDatabase,
  IconFileExport,
  IconPlus,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { banknoteService } from "../services/banknotes";

export function HomePage() {
  const { user } = useAuth();
  const [banknoteCount, setBanknoteCount] = useState<number | null>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (user) {
      banknoteService
        .getMyBanknotes()
        .then((banknotes) => setBanknoteCount(banknotes.length))
        .catch(() => setBanknoteCount(0));
    }
  }, [user]);

  return (
    <Container size="lg" py={{ base: "xl", md: "3rem" }}>
      <Stack gap="xl">
        <Stack gap="xl" align="center" mt={{ base: "xl", md: "3rem" }} mb="xl">
          <Title
            order={1}
            ta="center"
            size="3rem"
            fw={800}
            style={{ lineHeight: 1.2 }}
          >
            Welcome to NumisGallery!
          </Title>
          <Text
            size="lg"
            ta="center"
            c="dimmed"
            maw={700}
            style={{ lineHeight: 1.6 }}
          >
            NumisGallery is a comprehensive digital platform designed
            specifically for banknote collectors. Whether you're a casual
            collector or a professional dealer, our tools help you manage,
            organize, and showcase your collection with ease.
          </Text>
        </Stack>

        {user && banknoteCount === 0 && (
          <Group justify="center">
            <Button
              component={Link}
              to="/your-banknotes"
              size="lg"
              leftSection={<IconPlus size={20} />}
              style={{ minWidth: "200px" }}
            >
              Start your collection
            </Button>
          </Group>
        )}

        <Stack gap="xl" maw={1000} mx="auto" mt={{ base: "xl", md: "3rem" }}>
          <Title order={2} ta="center" size="2rem" fw={700} mb="md">
            How It Works
          </Title>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
              gap: isMobile ? "1.5rem" : "2rem",
              position: "relative",
              gridAutoFlow: "dense",
            }}
          >
            {/* Step 1 */}
            <Card
              p="xl"
              withBorder
              radius="md"
              style={{
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 16px rgba(0, 0, 0, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0, 0, 0, 0.08)";
              }}
            >
              <Stack gap="md">
                <Group gap="md" wrap="nowrap">
                  <div
                    style={{
                      backgroundColor: "var(--mantine-color-sage-1)",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconCamera size={36} color="var(--mantine-color-sage-6)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Title order={3} size="h4" mb="xs">
                      1. PMG Image Fetching or Upload Images
                    </Title>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                      For PMG-certified banknotes, automatically fetch
                      high-resolution images and certification details directly
                      from the PMG database using the certification number. Or
                      upload your own high-quality images.
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Card>

            {/* Arrow from 1 to 2 (right) */}
            {!isMobile && (
              <div
                style={{
                  position: "absolute",
                  top: "25%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                }}
              >
                <IconArrowRight
                  size={48}
                  color="var(--mantine-color-sage-6)"
                  strokeWidth={2.5}
                  fill="var(--mantine-color-sage-6)"
                  style={{ opacity: 0.8 }}
                />
              </div>
            )}

            {/* Step 2 */}
            <Card
              p="xl"
              withBorder
              radius="md"
              style={{
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 16px rgba(0, 0, 0, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0, 0, 0, 0.08)";
              }}
            >
              <Stack gap="md">
                <Group gap="md" wrap="nowrap">
                  <div
                    style={{
                      backgroundColor: "var(--mantine-color-sage-1)",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconBrain size={36} color="var(--mantine-color-sage-6)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Title order={3} size="h4" mb="xs">
                      2. AI Data Extraction
                    </Title>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                      For images of PMG slabbed banknotes, our AI-powered system
                      automatically extracts key information including country,
                      denomination, serial numbers, and other identifying
                      details. This saves you hours of manual data entry.
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Card>

            {/* Arrow from 2 to 3 (down) */}
            {!isMobile && (
              <div
                style={{
                  position: "absolute",
                  top: "53%",
                  right: "25%",
                  transform: "translate(50%, -50%)",
                  zIndex: 10,
                }}
              >
                <IconArrowDown
                  size={48}
                  color="var(--mantine-color-sage-6)"
                  strokeWidth={2.5}
                  fill="var(--mantine-color-sage-6)"
                  style={{ opacity: 0.8 }}
                />
              </div>
            )}

            {/* Step 3 */}
            <Card
              p="xl"
              withBorder
              radius="md"
              style={{
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                order: isMobile ? 3 : 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 16px rgba(0, 0, 0, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0, 0, 0, 0.08)";
              }}
            >
              <Stack gap="md">
                <Group gap="md" wrap="nowrap">
                  <div
                    style={{
                      backgroundColor: "var(--mantine-color-sage-1)",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconDatabase
                      size={36}
                      color="var(--mantine-color-sage-6)"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Title order={3} size="h4" mb="xs">
                      3. Organize & Catalog
                    </Title>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                      Build a comprehensive digital catalog of your collection.
                      Add PMG certification details, purchase information,
                      grades, and custom notes. Organize by country, year, or
                      any criteria you choose.
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Card>

            {/* Arrow from 3 to 4 (right) */}
            {!isMobile && (
              <div
                style={{
                  position: "absolute",
                  top: "75%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                }}
              >
                <IconArrowRight
                  size={48}
                  color="var(--mantine-color-sage-6)"
                  strokeWidth={2.5}
                  fill="var(--mantine-color-sage-6)"
                  style={{ opacity: 0.8 }}
                />
              </div>
            )}

            {/* Step 4 */}
            <Card
              p="xl"
              withBorder
              radius="md"
              style={{
                transition: "all 0.2s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                order: isMobile ? 4 : 3,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 16px rgba(0, 0, 0, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0, 0, 0, 0.08)";
              }}
            >
              <Stack gap="md">
                <Group gap="md" wrap="nowrap">
                  <div
                    style={{
                      backgroundColor: "var(--mantine-color-sage-1)",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconFileExport
                      size={36}
                      color="var(--mantine-color-sage-6)"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Title order={3} size="h4" mb="xs">
                      4. Export & Share
                    </Title>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                      Export your collection to PDF or CSV formats for backup,
                      insurance, or sharing. Or share your collection with a
                      public link to showcase your banknotes with friends,
                      family, or the collecting community.
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Card>
          </div>
        </Stack>

        <Box mt="xl">
          <Text size="sm" c="dimmed" ta="center">
            By using NumisGallery, you agree to our{" "}
            <Anchor component={Link} to="/terms-and-conditions" size="sm">
              Terms and Conditions
            </Anchor>{" "}
            and{" "}
            <Anchor component={Link} to="/privacy-policy" size="sm">
              Privacy Policy
            </Anchor>
            .
          </Text>
        </Box>
      </Stack>
    </Container>
  );
}
