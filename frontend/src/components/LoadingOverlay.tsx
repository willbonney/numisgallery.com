import {
  Center,
  Loader,
  Overlay,
  Paper,
  Progress,
  Stack,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useLoading } from "../contexts/LoadingContext";
import { estimateForMessage, formatElapsed, projectWait } from "./waitEstimate";

type WaitClock = {
  now: number;
  sessionStartedAt: number;
  phaseId: string;
  phaseStartedAt: number;
};

export function LoadingOverlay() {
  const { isLoading, loadingMessage } = useLoading();
  const { colorScheme } = useMantineColorScheme();
  const [clock, setClock] = useState<WaitClock | null>(null);

  if (!isLoading && clock) {
    setClock(null);
  }

  useEffect(() => {
    if (!isLoading) return;
    const stamp = Date.now();
    const phaseId = estimateForMessage(loadingMessage).id;
    const kick = window.setTimeout(() => {
      setClock((prev) => ({
        now: Date.now(),
        sessionStartedAt: prev?.sessionStartedAt ?? stamp,
        phaseId,
        phaseStartedAt:
          prev && prev.phaseId === phaseId ? prev.phaseStartedAt : stamp,
      }));
    }, 0);
    const timer = window.setInterval(() => {
      setClock((prev) => (prev ? { ...prev, now: Date.now() } : prev));
    }, 1000);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(timer);
    };
  }, [isLoading, loadingMessage]);

  if (!isLoading) return null;

  const phaseElapsed = clock ? (clock.now - clock.phaseStartedAt) / 1000 : 0;
  const totalElapsed = clock ? (clock.now - clock.sessionStartedAt) / 1000 : 0;
  const wait = projectWait(loadingMessage, phaseElapsed);
  const overlayColor = colorScheme === "dark" ? "#000" : "#fff";
  const overlayOpacity = colorScheme === "dark" ? 0.82 : 0.88;

  return (
    <>
      <Overlay
        color={overlayColor}
        backgroundOpacity={overlayOpacity}
        zIndex={2000}
        fixed
      />
      <Center
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2001,
          pointerEvents: "none",
        }}
        px="md"
      >
        <Paper
          p="lg"
          radius="lg"
          shadow="xl"
          w="100%"
          maw={420}
          role="status"
          aria-live="polite"
          style={{
            background:
              colorScheme === "dark"
                ? "var(--mantine-color-dark-7)"
                : "var(--mantine-color-white)",
          }}
        >
          <Stack align="center" gap="sm">
            <Loader size="lg" />
            <Text size="lg" fw={600} ta="center">
              {loadingMessage || "Working..."}
            </Text>
            <Text size="md" fw={500} ta="center">
              {wait.remainingLabel}
            </Text>
            <Progress
              value={wait.progressPercent}
              color="sage"
              size="sm"
              radius="xl"
              w="100%"
              aria-label={wait.remainingLabel}
            />
            {totalElapsed >= 1 && (
              <Text size="xs" c="dimmed">
                {formatElapsed(totalElapsed)}
              </Text>
            )}
            <Text size="sm" c="dimmed" ta="center">
              {wait.detail}
            </Text>
          </Stack>
        </Paper>
      </Center>
    </>
  );
}
