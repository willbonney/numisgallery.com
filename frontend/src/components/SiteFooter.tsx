import { Anchor, Container, Group, Stack, Text } from "@mantine/core";
import { Link } from "react-router-dom";

const footerLinks = [
  { to: "/", label: "Home" },
  { to: "/community", label: "Community" },
  { to: "/pricing", label: "Pricing" },
  { to: "/terms-and-conditions", label: "Terms" },
  { to: "/privacy-policy", label: "Privacy" },
] as const;

export function SiteFooter() {
  return (
    <Container
      size="xl"
      component="footer"
      py="xl"
      mt="xl"
      style={{
        borderTop: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Stack gap="sm" align="center">
        <Text size="sm" c="dimmed" ta="center" maw={640}>
          NumisGallery is a digital catalog for paper money collectors —
          PMG-certified banknotes, world notes, and US currency.
        </Text>
        <Group gap="md" justify="center">
          {footerLinks.map((link) => (
            <Anchor
              key={link.to}
              component={Link}
              to={link.to}
              size="sm"
              c="dimmed"
              underline="hover"
            >
              {link.label}
            </Anchor>
          ))}
          <Anchor
            href="https://discord.gg/mfcar4wYuC"
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            c="dimmed"
            underline="hover"
          >
            Discord
          </Anchor>
        </Group>
        <Text size="xs" c="dimmed" ta="center">
          © {new Date().getFullYear()} Happy Haiku LLC
        </Text>
      </Stack>
    </Container>
  );
}
