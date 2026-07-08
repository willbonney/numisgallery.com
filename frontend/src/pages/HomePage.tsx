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
import {
  IconArrowDown,
  IconBooks,
  IconPhotoSearch,
  IconPlus,
  IconShare3,
  IconSparkles,
} from "@tabler/icons-react";
import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { banknoteService } from "../services/banknotes";
import classes from "./HomePage.module.css";

const steps = [
  {
    step: 1,
    title: "Fetch or upload images",
    description:
      "For PMG-certified banknotes, pull high-resolution images and certification details with the cert number — or upload your own photos.",
    icon: IconPhotoSearch,
  },
  {
    step: 2,
    title: "AI data extraction",
    description:
      "On PMG-slabbed notes, AI reads country, denomination, serial numbers, and other details automatically so you skip hours of typing.",
    icon: IconSparkles,
  },
  {
    step: 3,
    title: "Organize & catalog",
    description:
      "Build a full digital catalog: grades, purchase info, notes, and filters by country, year, or any criteria you choose.",
    icon: IconBooks,
  },
  {
    step: 4,
    title: "Export & share",
    description:
      "Export to PDF or CSV for backup and insurance, or share a public link so others can browse your collection.",
    icon: IconShare3,
  },
] as const;

export function HomePage() {
  const { user } = useAuth();
  const [banknoteCount, setBanknoteCount] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      banknoteService
        .getMyBanknotes()
        .then((banknotes) => setBanknoteCount(banknotes.length))
        .catch(() => setBanknoteCount(0));
    }
  }, [user]);

  const collectionHighlight = user ? (
    <Text
      component={Link}
      to="/your-banknotes"
      span
      inherit
      variant="gradient"
      gradient={{ from: "sage.6", to: "sage.4", deg: 120 }}
      className={classes.titleLink}
    >
      banknote collection
    </Text>
  ) : (
    <Text
      span
      inherit
      variant="gradient"
      gradient={{ from: "sage.6", to: "sage.4", deg: 120 }}
      className={classes.titleHighlight}
    >
      banknote collection
    </Text>
  );

  return (
    <Container size="lg" py={{ base: "xl", md: "3rem" }}>
      <Stack gap={48}>
        {/* Hero */}
        <Stack gap="lg" align="center" mt={{ base: "md", md: "2rem" }}>
          <Title
            order={1}
            ta="center"
            fz={{ base: 32, sm: 40, md: 48 }}
            fw={800}
            lh={1.15}
            maw={720}
          >
            Catalog, organize, and showcase your {collectionHighlight}
          </Title>

          <Text size="lg" ta="center" c="dimmed" maw={640} lh={1.65}>
            NumisGallery helps casual collectors and professional dealers
            manage PMG-certified notes, extract data with AI, and share a
            polished gallery — all in one place.
          </Text>

          {(user && banknoteCount === 0) || !user ? (
            <Group justify="center" gap="md" mt="xs">
              {user && banknoteCount === 0 ? (
                <Button
                  component={Link}
                  to="/your-banknotes"
                  size="lg"
                  radius="md"
                  leftSection={<IconPlus size={20} />}
                >
                  Start your collection
                </Button>
              ) : (
                <>
                  <Button
                    component={Link}
                    to="/login"
                    size="lg"
                    radius="md"
                    leftSection={<IconPlus size={20} />}
                  >
                    Get started free
                  </Button>
                  <Button
                    component={Link}
                    to="/community"
                    size="lg"
                    radius="md"
                    variant="default"
                  >
                    Browse community
                  </Button>
                </>
              )}
            </Group>
          ) : null}
        </Stack>

        {/* Steps — vertical sequence */}
        <div className={classes.timeline}>
          {steps.map(({ step, title, description, icon: Icon }, index) => (
            <Fragment key={step}>
              <Card
                padding="xl"
                radius="lg"
                withBorder
                className={classes.stepCard}
              >
                <Group align="stretch" gap="xl" wrap="nowrap">
                  <div className={classes.stepIcon}>
                    <Icon size={44} stroke={1.5} />
                  </div>

                  <Stack
                    gap="xs"
                    justify="center"
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <Text size="xs" c="sage" fw={600} tt="uppercase" lts={0.4}>
                      Step {step} of {steps.length}
                    </Text>
                    <Title order={3} size="h4" fw={600}>
                      {title}
                    </Title>
                    <Text size="sm" c="dimmed" lh={1.7}>
                      {description}
                    </Text>
                  </Stack>
                </Group>
              </Card>

              {index < steps.length - 1 && (
                <div className={classes.connector} aria-hidden>
                  <div className={classes.connectorLine} />
                  <IconArrowDown
                    size={28}
                    stroke={2}
                    className={classes.connectorArrow}
                  />
                </div>
              )}
            </Fragment>
          ))}
        </div>

        <Box>
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
