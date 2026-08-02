import { Button, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";

type NumistaImportSectionProps = {
  url: string;
  isProcessing: boolean;
  isImporting: boolean;
  onUrlChange: (value: string) => void;
  onImport: () => void;
};

export function NumistaImportSection({
  url,
  isProcessing,
  isImporting,
  onUrlChange,
  onImport,
}: NumistaImportSectionProps) {
  return (
    <Paper
      p="md"
      radius="md"
      withBorder
      shadow="sm"
      style={{
        borderColor: "var(--mantine-color-sage-4)",
        background:
          "light-dark(var(--mantine-color-sage-0), var(--mantine-color-dark-6))",
      }}
    >
      <Stack gap="sm">
        <div>
          <Text size="sm" fw={600}>
            Import from Numista
          </Text>
          <Text size="xs" c="dimmed">
            Paste a Numista banknote page URL to auto-fill catalog details.
          </Text>
        </div>
        <Group align="flex-end" wrap="nowrap" gap="sm">
          <TextInput
            label="Numista URL"
            placeholder="https://en.numista.com/278009"
            value={url}
            onChange={(e) => onUrlChange(e.currentTarget.value)}
            disabled={isProcessing}
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!isProcessing && url.trim()) onImport();
              }
            }}
          />
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={onImport}
            loading={isImporting}
            disabled={isProcessing || !url.trim()}
            style={{ flexShrink: 0 }}
          >
            Import Details from Numista
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
