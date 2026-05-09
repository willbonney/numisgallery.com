import {
  Center,
  Loader,
  Overlay,
  Stack,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { useLoading } from "../contexts/LoadingContext";

export function LoadingOverlay() {
  const { isLoading, loadingMessage } = useLoading();
  const { colorScheme } = useMantineColorScheme();

  if (!isLoading) return null;

  const overlayColor = colorScheme === "dark" ? "#000" : "#fff";
  const overlayOpacity = colorScheme === "dark" ? 0.6 : 0.8;

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
      >
        <Stack align="center" gap="md">
          <Loader size="xl" />
          <Text
            size="lg"
            fw={500}
            style={{
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            {loadingMessage || "Loading..."}
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            {getExplainerText(loadingMessage)}
          </Text>
        </Stack>
      </Center>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}

function getExplainerText(message: string): string {
  if (!message) return "Please wait while we process your request...";
  const m = message.toLowerCase();

  if (m.includes("checking services") || m.includes("checking flaresolverr")) {
    return "Verifying that FlareSolverr is online before sending your request...";
  }
  if (m.includes("starting flaresolverr") || m.includes("starting up on fly")) {
    return "Waking up the FlareSolverr machine on Fly.io. This usually takes 10–20 seconds on cold start.";
  }
  if (
    m.includes("waiting for flaresolverr") ||
    m.includes("machine is starting")
  ) {
    return "FlareSolverr is not responding yet — retrying every 5 seconds. Please wait...";
  }
  if (m.includes("rate limit")) {
    return "Pausing between requests to avoid detection by PMG's Cloudflare protection.";
  }
  if (m.includes("queued") || m.includes("in queue")) {
    return "Your request is waiting in the processing queue. Each request takes 20–60 seconds.";
  }
  if (m.includes("bypassing cloudflare") || m.includes("fetching pmg")) {
    return "FlareSolverr is solving the Cloudflare challenge and fetching the PMG certification page. This typically takes 15–45 seconds.";
  }
  if (m.includes("parsing image")) {
    return "PMG page received — extracting the obverse and reverse image URLs...";
  }
  if (m.includes("images found") || m.includes("loading images")) {
    return "Image URLs retrieved — downloading and processing your PMG images...";
  }
  if (m.includes("submitting") || m.includes("processing")) {
    return "Sending your request to the scraper. Hang tight...";
  }
  if (m.includes("extract")) {
    return "Using AI vision to read the PMG certification label and extract banknote details. This may take 30–90 seconds.";
  }
  if (m.includes("pdf")) {
    return "Generating your collection PDF with images and details... Please standby.";
  }
  if (m.includes("sav")) {
    return "Uploading images and saving banknote details...";
  }
  return "Please wait while we process your request...";
}
