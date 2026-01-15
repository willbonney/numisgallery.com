import { Center, Loader, Overlay, Stack, Text, useMantineColorScheme } from '@mantine/core';
import { useLoading } from '../contexts/LoadingContext';

export function LoadingOverlay() {
  const { isLoading, loadingMessage } = useLoading();
  const { colorScheme } = useMantineColorScheme();

  if (!isLoading) return null;

  const overlayColor = colorScheme === 'dark' ? '#000' : '#fff';
  const overlayOpacity = colorScheme === 'dark' ? 0.6 : 0.8;

  return (
    <>
      <Overlay color={overlayColor} backgroundOpacity={overlayOpacity} zIndex={2000} fixed />
      <Center style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2001, pointerEvents: 'none' }}>
        <Stack align="center" gap="md">
          <Loader size="xl" />
          <Text 
            size="lg" 
            fw={500}
            style={{
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            {loadingMessage || 'Loading...'}
          </Text>
          <Text 
            size="sm" 
            c="dimmed"
            ta="center"
            maw={400}
          >
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
  if (message?.toLowerCase().includes('pmg')) {
    return 'Auto-starting services and fetching images from PMG... This may take 20-30 seconds on first request.';
  }
  if (message?.toLowerCase().includes('extract')) {
    return 'Using AI vision to extract banknote details from images... This may take 30-60 seconds.';
  }
  if (message?.toLowerCase().includes('pdf')) {
    return 'Generating your collection PDF with images and details... Please standby.';
  }
  if (message?.toLowerCase().includes('sav')) {
    return 'Uploading images and saving banknote details...';
  }
  return 'Please wait while we process your request...';
}

