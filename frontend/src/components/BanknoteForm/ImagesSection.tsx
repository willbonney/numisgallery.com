import { ActionIcon, Box, Button, Group, Loader, Menu, Paper, Popover, Select, SimpleGrid, Stack, Tabs, Text, TextInput, Tooltip } from '@mantine/core';
import { IconChevronDown, IconDownload, IconInfoCircle, IconLink, IconSparkles, IconUpload, IconWand } from '@tabler/icons-react';
import React, { useState } from 'react';
import type { PixelCrop } from 'react-image-crop';
import { useLoading } from '../../contexts/LoadingContext';
import { useSubscription } from '../../hooks/useSubscription';
import { ALL_GRADES } from '../../types/banknote';
import type { ImageState } from './BanknoteForm.helpers';
import { FileUpload } from './FileUpload';
import { ImageEditor } from './ImageEditor';

type ImagesSectionProps = {
  pmgCert: string;
  grade: string;
  fetchingImages: boolean;
  extractingData: boolean;
  hasPmgImages: boolean;
  obverseState: ImageState;
  reverseState: ImageState;
  adjustingObverse: boolean;
  adjustingReverse: boolean;
  isProcessing: boolean;
  obverseFile: File | null;
  reverseFile: File | null;
  onPmgCertChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onFetchImages: () => void;
  onExtractData: () => void;
  onClearImages: () => void;
  onObverseUrlChange: (url: string) => void;
  onReverseUrlChange: (url: string) => void;
  onObverseUrlBlur: (url: string) => void;
  onReverseUrlBlur: (url: string) => void;
  obverseUrlError: string | null;
  reverseUrlError: string | null;
  loadingObverseUrl: boolean;
  loadingReverseUrl: boolean;
  onObverseFileUpload: (file: File) => void;
  onReverseFileUpload: (file: File) => void;
  onClearObverseFile: () => void;
  onClearReverseFile: () => void;
  onAdjustmentChange: (side: 'obverse' | 'reverse', field: 'brightness' | 'contrast', value: number) => void;
  onAutoAdjust: (side: 'obverse' | 'reverse') => void;
  onResetAdjustments: (side: 'obverse' | 'reverse') => void;
  onCrop: (side: 'obverse' | 'reverse', croppedAreaPixels: PixelCrop, rotatedImageSrc: string, displayedWidth: number, displayedHeight: number) => void;
};

export function ImagesSection({
  pmgCert,
  grade,
  fetchingImages,
  extractingData,
  hasPmgImages,
  obverseState,
  reverseState,
  adjustingObverse,
  adjustingReverse,
  isProcessing,
  obverseFile,
  reverseFile,
  onPmgCertChange,
  onGradeChange,
  onFetchImages,
  onExtractData,
  onClearImages,
  onObverseUrlChange,
  onReverseUrlChange,
  onObverseUrlBlur,
  onReverseUrlBlur,
  obverseUrlError,
  reverseUrlError,
  loadingObverseUrl,
  loadingReverseUrl,
  onObverseFileUpload,
  onReverseFileUpload,
  onClearObverseFile,
  onClearReverseFile,
  onAdjustmentChange,
  onAutoAdjust,
  onResetAdjustments,
  onCrop,
}: ImagesSectionProps) {
  const { setLoading } = useLoading();
  const { getUsageInfo, reload: reloadSubscription } = useSubscription();
  const [activeTab, setActiveTab] = useState<string>('pmg');
  const hasImages = obverseState.proxiedDataUrl || obverseState.originalUrl || reverseState.proxiedDataUrl || reverseState.originalUrl;
  const hasObverse = !!(obverseState.proxiedDataUrl || obverseState.originalUrl);
  const hasReverse = !!(reverseState.proxiedDataUrl || reverseState.originalUrl);

  const usage = getUsageInfo();

  // Reload subscription usage when fetch/extraction completes
  React.useEffect(() => {
    if (!fetchingImages && !extractingData) {
      // Small delay to ensure backend has updated usage
      const timeout = setTimeout(() => {
        reloadSubscription();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [fetchingImages, extractingData, reloadSubscription]);

  // Update loading context when fetching or extracting
  React.useEffect(() => {
    if (fetchingImages) {
      setLoading(true, 'Fetching PMG Images...');
    } else if (extractingData) {
      setLoading(true, 'Extracting Data...');
    } else {
      setLoading(false);
    }

    return () => {
      setLoading(false);
    };
  }, [fetchingImages, extractingData, setLoading]);

  const handleClearObverse = () => {
    if (obverseState.isPmgFetched) {
      onClearImages();
    } else {
      onClearObverseFile();
      onObverseUrlChange('');
    }
  };

  const handleClearReverse = () => {
    if (reverseState.isPmgFetched) {
      onClearImages();
    } else {
      onClearReverseFile();
      onReverseUrlChange('');
    }
  };

  return (
    <Paper p="md" radius="md" withBorder shadow="sm">

      {hasImages && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
          {hasObverse ? (
            <ImageEditor
              side="obverse"
              state={obverseState}
              isAdjusting={adjustingObverse}
              isProcessing={isProcessing}
              onAdjustmentChange={(field, value) => onAdjustmentChange('obverse', field, value)}
              onAutoAdjust={() => onAutoAdjust('obverse')}
              onResetAdjustments={() => onResetAdjustments('obverse')}
              onCrop={(area, rotatedSrc, displayedWidth, displayedHeight) => onCrop('obverse', area, rotatedSrc, displayedWidth, displayedHeight)}
              onClear={handleClearObverse}
            />
          ) : (
            !hasPmgImages && (
              <Box style={{ flex: 1 }}>
                <Text size="sm" fw={500} mb="xs">Obverse (Front)</Text>
                <Tabs defaultValue="upload">
                  <Tabs.List grow>
                    <Tabs.Tab value="upload" leftSection={<IconUpload size={14} />}>
                      Upload
                    </Tabs.Tab>
                    <Tabs.Tab value="url" leftSection={<IconLink size={14} />}>
                      URL
                    </Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="upload" pt="sm">
                    <FileUpload
                      label=""
                      accept="image/*"
                      disabled={isProcessing}
                      onFileSelect={onObverseFileUpload}
                      currentFile={obverseFile}
                      onClear={onClearObverseFile}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel value="url" pt="sm">
                    <TextInput
                      placeholder="https://..."
                      disabled={isProcessing || loadingObverseUrl}
                      value={obverseState.originalUrl}
                      onChange={(e) => onObverseUrlChange(e.target.value)}
                      onBlur={(e) => onObverseUrlBlur(e.target.value)}
                      error={obverseUrlError}
                      rightSection={loadingObverseUrl ? <Loader size={16} /> : undefined}
                    />
                  </Tabs.Panel>
                </Tabs>
              </Box>
            )
          )}
          {hasReverse ? (
            <ImageEditor
              side="reverse"
              state={reverseState}
              isAdjusting={adjustingReverse}
              isProcessing={isProcessing}
              onAdjustmentChange={(field, value) => onAdjustmentChange('reverse', field, value)}
              onAutoAdjust={() => onAutoAdjust('reverse')}
              onResetAdjustments={() => onResetAdjustments('reverse')}
              onCrop={(area, rotatedSrc, displayedWidth, displayedHeight) => onCrop('reverse', area, rotatedSrc, displayedWidth, displayedHeight)}
              onClear={handleClearReverse}
            />
          ) : (
            !hasPmgImages && (
              <Box style={{ flex: 1 }}>
                <Text size="sm" fw={500} mb="xs">Reverse (Back)</Text>
                <Tabs defaultValue="upload">
                  <Tabs.List grow>
                    <Tabs.Tab value="upload" leftSection={<IconUpload size={14} />} size="xs">
                      Upload
                    </Tabs.Tab>
                    <Tabs.Tab value="url" leftSection={<IconLink size={14} />} size="xs">
                      URL
                    </Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="upload" pt="sm">
                    <FileUpload
                      label=""
                      accept="image/*"
                      disabled={isProcessing}
                      onFileSelect={onReverseFileUpload}
                      currentFile={reverseFile}
                      onClear={onClearReverseFile}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel value="url" pt="sm">
                    <TextInput
                      placeholder="https://..."
                      disabled={isProcessing || loadingReverseUrl}
                      value={reverseState.originalUrl}
                      onChange={(e) => onReverseUrlChange(e.target.value)}
                      onBlur={(e) => onReverseUrlBlur(e.target.value)}
                      error={reverseUrlError}
                      rightSection={loadingReverseUrl ? <Loader size={16} /> : undefined}
                    />
                  </Tabs.Panel>
                </Tabs>
              </Box>
            )
          )}
        </SimpleGrid>
      )}

      {hasImages && hasPmgImages && (
        <>
          {/* Grade field below images */}
          <Group mt="md" align="flex-end" wrap="wrap">
            <Select
              label="Grade"
              data={ALL_GRADES.map(g => ({ value: g, label: g === 'Not Listed' ? 'Not Listed' : g }))}
              style={{ width: '100%', maxWidth: 200 }}
              disabled={isProcessing}
              value={grade}
              onChange={(value) => onGradeChange(value || '')}
              maxDropdownHeight={400}
            />

          </Group>
          <Group justify="center" mt="lg">
            <Stack gap="xs" align="center">
              <Group gap="xs">
                <Button
                  variant="filled"
                  color="sage"
                  size="lg"
                  leftSection={<IconWand size={20} />}
                  onClick={onExtractData}
                  disabled={isProcessing || (usage.aiExtractions.remaining === 0 && usage.aiExtractions.limit !== Infinity)}
                >
                  Extract Data
                </Button>
                <Tooltip
                  label="Uses AI to automatically extract banknote details (country, pick number, grade, EPQ, specimen, etc.) from the PMG holder images"
                  withinPortal
                  visibleFrom="sm"
                >
                  <Box visibleFrom="sm" style={{ display: 'inline-block' }}>
                    <ActionIcon variant="subtle" size="lg" style={{ cursor: 'help' }}>
                      <IconInfoCircle size={20} style={{ opacity: 0.6 }} />
                    </ActionIcon>
                  </Box>
                </Tooltip>
                <Box hiddenFrom="sm">
                  <Popover width={300} position="top" withArrow shadow="md">
                    <Popover.Target>
                      <ActionIcon variant="subtle" size="lg" style={{ cursor: 'help' }}>
                        <IconInfoCircle size={20} style={{ opacity: 0.6 }} />
                      </ActionIcon>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <Text size="sm">
                        Uses AI to automatically extract banknote details (country, pick number, grade, EPQ, specimen, etc.) from the PMG holder images
                      </Text>
                    </Popover.Dropdown>
                  </Popover>
                </Box>
              </Group>
              {usage.aiExtractions.limit !== Infinity && (
                <Text size="xs" c={usage.aiExtractions.remaining === 0 ? 'red' : 'dimmed'}>
                  {usage.aiExtractions.remaining} of {usage.aiExtractions.limit} extractions remaining this month
                </Text>
              )}
            </Stack>
          </Group>


        </>
      )}

      {!hasImages && !hasPmgImages && (
        <>
          {/* Mobile: Dropdown Menu */}
          <Box hiddenFrom="sm">
            <Menu shadow="md" width="100%">
              <Menu.Target>
                <Button
                  variant="default"
                  fullWidth
                  rightSection={<IconChevronDown size={16} />}
                  leftSection={
                    activeTab === 'pmg' ? <IconSparkles size={16} /> :
                      activeTab === 'upload' ? <IconUpload size={16} /> :
                        <IconLink size={16} />
                  }
                >
                  {activeTab === 'pmg' ? 'Fetch from PMG' :
                    activeTab === 'upload' ? 'Upload Images' :
                      'Enter Image URLs Manually'}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  onClick={() => setActiveTab('pmg')}

                >
                  <IconSparkles size={16} />
                  Fetch from PMawdadawdG
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconUpload size={16} />}
                  onClick={() => setActiveTab('upload')}
                >
                  Upload Images
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconLink size={16} />}
                  onClick={() => setActiveTab('url')}
                >
                  Enter Image URLs Manually
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Box>

          {/* Desktop: Tabs */}
          <Tabs value={activeTab} onChange={(value) => value && setActiveTab(value)} visibleFrom="sm">
            <Tabs.List grow>
              <Tabs.Tab value="pmg" leftSection={<IconSparkles size={16} />}>
                Fetch from PMG
              </Tabs.Tab>
              <Tabs.Tab value="upload" leftSection={<IconUpload size={16} />}>
                Upload Images
              </Tabs.Tab>
              <Tabs.Tab value="url" leftSection={<IconLink size={16} />}>
                Enter Image URLs Manually
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="pmg" pt="md">
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    label="PMG Cert #"
                    placeholder="e.g. 8087629-035"
                    disabled={isProcessing}
                    value={pmgCert}
                    onChange={(e) => onPmgCertChange(e.target.value)}
                  />
                  <Select
                    label="Grade"
                    data={ALL_GRADES.map(g => ({ value: g, label: g === 'Not Listed' ? 'Not Listed' : g }))}
                    disabled={isProcessing}
                    value={grade}
                    onChange={(value) => onGradeChange(value || '')}
                    maxDropdownHeight={400}
                  />
                </SimpleGrid>
                <Group gap="xs" wrap="wrap" align="flex-end">
                  <Box style={{ flex: 1, minWidth: 200 }}>
                    <Button
                      variant="light"
                      leftSection={<IconDownload size={16} />}
                      onClick={onFetchImages}
                      disabled={isProcessing || (usage.pmgFetches.remaining === 0 && usage.pmgFetches.limit !== Infinity)}
                      fullWidth
                    >
                      Fetch PMG Images
                    </Button>
                    {usage.pmgFetches.limit !== Infinity && (
                      <Text size="xs" c={usage.pmgFetches.remaining === 0 ? 'red' : 'dimmed'} mt={4}>
                        {usage.pmgFetches.remaining} of {usage.pmgFetches.limit} remaining this month
                      </Text>
                    )}
                  </Box>
                  <Tooltip
                    label="Fetches high-resolution images directly from PMG's website using the certification number and grade, then uses AI to extract banknote details"
                    withinPortal
                    visibleFrom="sm"
                  >
                    <Box visibleFrom="sm" style={{ display: 'inline-block' }}>
                      <ActionIcon variant="subtle" size="md" style={{ cursor: 'help' }}>
                        <IconInfoCircle size={18} style={{ opacity: 0.6 }} />
                      </ActionIcon>
                    </Box>
                  </Tooltip>
                  <Box hiddenFrom="sm">
                    <Popover width={300} position="top" withArrow shadow="md">
                      <Popover.Target>
                        <ActionIcon variant="subtle" size="md" style={{ cursor: 'help' }}>
                          <IconInfoCircle size={18} style={{ opacity: 0.6 }} />
                        </ActionIcon>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <Text size="sm">
                          Fetches high-resolution images directly from PMG's website using the certification number and grade, then uses AI to extract banknote details
                        </Text>
                      </Popover.Dropdown>
                    </Popover>
                  </Box>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="upload" pt="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <FileUpload
                  label="Obverse (Front)"
                  accept="image/*"
                  disabled={isProcessing}
                  onFileSelect={onObverseFileUpload}
                  currentFile={obverseFile}
                  onClear={onClearObverseFile}
                />
                <FileUpload
                  label="Reverse (Back)"
                  accept="image/*"
                  disabled={isProcessing}
                  onFileSelect={onReverseFileUpload}
                  currentFile={reverseFile}
                  onClear={onClearReverseFile}
                />
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel value="url" pt="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Obverse URL"
                  placeholder="https://..."
                  disabled={isProcessing || loadingObverseUrl}
                  value={obverseState.originalUrl}
                  onChange={(e) => onObverseUrlChange(e.target.value)}
                  onBlur={(e) => onObverseUrlBlur(e.target.value)}
                  error={obverseUrlError}
                  rightSection={loadingObverseUrl ? <Loader size={16} /> : undefined}
                />
                <TextInput
                  label="Reverse URL"
                  placeholder="https://..."
                  disabled={isProcessing || loadingReverseUrl}
                  value={reverseState.originalUrl}
                  onChange={(e) => onReverseUrlChange(e.target.value)}
                  onBlur={(e) => onReverseUrlBlur(e.target.value)}
                  error={reverseUrlError}
                  rightSection={loadingReverseUrl ? <Loader size={16} /> : undefined}
                />
              </SimpleGrid>
            </Tabs.Panel>
          </Tabs>

          {/* Mobile: Content Panels */}
          {activeTab === 'pmg' && (
            <Stack gap="md" mt="md" hiddenFrom="sm">
              <TextInput
                label="PMG Cert #"
                placeholder="e.g. 8087629-035"
                disabled={isProcessing}
                value={pmgCert}
                onChange={(e) => onPmgCertChange(e.target.value)}
              />
              <Select
                label="Grade"
                data={ALL_GRADES.map(g => ({ value: g, label: g === 'Not Listed' ? 'Not Listed' : g }))}
                disabled={isProcessing}
                value={grade}
                onChange={(value) => onGradeChange(value || '')}
                maxDropdownHeight={400}
              />
              <Box style={{ width: '100%' }}>
                <Button
                  variant="light"
                  leftSection={<IconDownload size={16} />}
                  onClick={onFetchImages}
                  disabled={isProcessing || (usage.pmgFetches.remaining === 0 && usage.pmgFetches.limit !== Infinity)}
                  fullWidth
                >
                  Fetch PMG Images
                </Button>
                {usage.pmgFetches.limit !== Infinity && (
                  <Text size="xs" c={usage.pmgFetches.remaining === 0 ? 'red' : 'dimmed'} mt={4} ta="center">
                    {usage.pmgFetches.remaining} of {usage.pmgFetches.limit} remaining this month
                  </Text>
                )}
              </Box>
              <Popover width={300} position="top" withArrow shadow="md">
                <Popover.Target>
                  <Group justify="center">
                    <ActionIcon variant="subtle" size="md" style={{ cursor: 'help' }}>
                      <IconInfoCircle size={18} style={{ opacity: 0.6 }} />
                    </ActionIcon>
                  </Group>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm">
                    Fetches high-resolution images directly from PMG's website using the certification number and grade, then uses AI to extract banknote details
                  </Text>
                </Popover.Dropdown>
              </Popover>
            </Stack>
          )}

          {activeTab === 'upload' && (
            <Stack gap="md" mt="md" hiddenFrom="sm">
              <FileUpload
                label="Obverse (Front)"
                accept="image/*"
                disabled={isProcessing}
                onFileSelect={onObverseFileUpload}
                currentFile={obverseFile}
                onClear={onClearObverseFile}
              />
              <FileUpload
                label="Reverse (Back)"
                accept="image/*"
                disabled={isProcessing}
                onFileSelect={onReverseFileUpload}
                currentFile={reverseFile}
                onClear={onClearReverseFile}
              />
            </Stack>
          )}

          {activeTab === 'url' && (
            <Stack gap="md" mt="md" hiddenFrom="sm">
              <TextInput
                label="Obverse URL"
                placeholder="https://..."
                disabled={isProcessing || loadingObverseUrl}
                value={obverseState.originalUrl}
                onChange={(e) => onObverseUrlChange(e.target.value)}
                onBlur={(e) => onObverseUrlBlur(e.target.value)}
                error={obverseUrlError}
                rightSection={loadingObverseUrl ? <Loader size={16} /> : undefined}
              />
              <TextInput
                label="Reverse URL"
                placeholder="https://..."
                disabled={isProcessing || loadingReverseUrl}
                value={reverseState.originalUrl}
                onChange={(e) => onReverseUrlChange(e.target.value)}
                onBlur={(e) => onReverseUrlBlur(e.target.value)}
                error={reverseUrlError}
                rightSection={loadingReverseUrl ? <Loader size={16} /> : undefined}
              />
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
}

