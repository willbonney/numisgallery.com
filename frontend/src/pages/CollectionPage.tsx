import {
  ActionIcon,
  Button,
  Center,
  Container,
  FileButton,
  Group,
  Loader,
  Menu,
  Modal,
  Progress,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconChevronDown,
  IconFileTypeCsv,
  IconFileTypePdf,
  IconPlus,
  IconShare,
  IconUpload,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BanknoteForm } from "../components/BanknoteForm";
import { Gallery } from "../components/Gallery";
import { useLoading } from "../contexts/LoadingContext";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";
import { banknoteService } from "../services/banknotes";
import type { Banknote, BanknoteFormData } from "../types/banknote";
import { exportCollectionToCSV } from "../utils/csvExport";
import { importCSV } from "../utils/csvImport";
import { exportCollectionToPDF } from "../utils/pdfExport";
import { formatStorageSize } from "../utils/storageTracking";

interface CollectionPageProps {
  isOwner?: boolean;
}

export function CollectionPage({ isOwner = true }: CollectionPageProps) {
  const { user } = useAuth();
  const {
    subscription,
    getTierLimits,
    reload: reloadSubscription,
  } = useSubscription();
  const { setLoading } = useLoading();
  const navigate = useNavigate();
  const [view, setView] = useState<"gallery" | "form">("gallery");
  const [banknotes, setBanknotes] = useState<Banknote[]>([]);
  const [editingBanknote, setEditingBanknote] = useState<Banknote | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoadingState] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<"pdf" | "csv" | null>(null);
  const [includePurchaseInfo, setIncludePurchaseInfo] = useState(false);

  const shareableUrl = user ? `${window.location.origin}/users/${user.id}` : "";

  const loadBanknotes = useCallback(async () => {
    try {
      setLoadingState(true);
      const data = isOwner
        ? await banknoteService.getMyBanknotes()
        : await banknoteService.getUserBanknotes(user?.id || "");
      setBanknotes(data);
    } catch (error) {
      console.error("Failed to load banknotes:", error);
      notifications.show({
        title: "Error",
        message: "Failed to load collection",
        color: "red",
      });
    } finally {
      setLoadingState(false);
    }
  }, [isOwner, user?.id]);

  // Load banknotes on mount
  useEffect(() => {
    loadBanknotes();
  }, [loadBanknotes]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    notifications.show({
      title: "Copied!",
      message: "Public collection URL copied to clipboard",
      color: "green",
      icon: <IconCheck size={20} />,
      autoClose: 3000,
      withCloseButton: true,
      styles: {
        root: {
          position: "fixed",
          top: "20px",
          left: "20px",
          zIndex: 10000,
        },
        title: {
          fontSize: "1.1rem",
          fontWeight: 600,
        },
        description: {
          fontSize: "1rem",
        },
      },
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportClick = (type: "pdf" | "csv") => {
    setExportType(type);
    setExportModalOpen(true);
  };

  const handleExport = async () => {
    if (!exportType) return;

    try {
      setExportModalOpen(false);

      if (exportType === "pdf") {
        setLoading(true, "Generating PDF...");
        await exportCollectionToPDF(
          displayBanknotes,
          user?.email,
          includePurchaseInfo
        );
        notifications.show({
          title: "PDF Downloaded",
          message: "Your collection has been exported successfully!",
          color: "green",
        });
      } else if (exportType === "csv") {
        setLoading(true, "Generating CSV...");
        // Small delay to show loading state
        await new Promise((resolve) => setTimeout(resolve, 100));
        exportCollectionToCSV(
          displayBanknotes,
          user?.email,
          includePurchaseInfo
        );
        notifications.show({
          title: "CSV Downloaded",
          message: "Your collection has been exported successfully!",
          color: "green",
        });
      }
    } catch (error) {
      console.error(`Failed to export ${exportType.toUpperCase()}:`, error);
      notifications.show({
        title: "Export Failed",
        message: `Failed to generate ${exportType.toUpperCase()}. Please try again.`,
        color: "red",
      });
    } finally {
      setLoading(false);
      setExportType(null);
    }
  };

  const displayBanknotes = isOwner
    ? banknotes
    : banknotes.filter((b) => b.isVisibleInCollection);

  // Check subscription limits
  const tier = subscription?.tier || "free";
  const limits = getTierLimits(tier);
  const canAddBanknote = banknotes.length < limits.maxBanknotes;
  const isPro = tier === "pro";

  const handleSubmit = async (
    data: BanknoteFormData & { obverseImage?: File; reverseImage?: File }
  ) => {
    try {
      if (editingBanknote) {
        // Update existing
        await banknoteService.updateBanknote(editingBanknote.id, data);
      } else {
        // Add new
        await banknoteService.createBanknote(data);
      }

      // Reload banknotes and subscription (for storage updates)
      await Promise.all([loadBanknotes(), reloadSubscription()]);

      setEditingBanknote(null);
      setView("gallery");
    } catch (error) {
      console.error("Failed to save banknote:", error);
      throw error; // Let BanknoteForm handle the error notification
    }
  };

  const handleCancel = () => {
    setEditingBanknote(null);
    setView("gallery");
  };

  const handleDelete = async (banknote: Banknote) => {
    try {
      await banknoteService.deleteBanknote(banknote.id);
      // Reload banknotes and subscription (for storage updates)
      await Promise.all([loadBanknotes(), reloadSubscription()]);
      notifications.show({
        title: "Deleted",
        message: "Banknote deleted successfully",
        color: "green",
      });
    } catch (error) {
      console.error("Failed to delete banknote:", error);
      notifications.show({
        title: "Error",
        message: "Failed to delete banknote",
        color: "red",
      });
    }
  };

  const handleImportCSV = async (file: File | null) => {
    if (!file) return;

    try {
      setImporting(true);
      setImportModalOpen(true);
      setImportProgress(0);

      // Parse CSV
      const banknotesData = await importCSV(file);

      if (banknotesData.length === 0) {
        notifications.show({
          title: "Import Failed",
          message: "No valid banknotes found in CSV file",
          color: "red",
        });
        setImporting(false);
        setImportModalOpen(false);
        return;
      }

      // Create banknotes one by one with progress
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < banknotesData.length; i++) {
        try {
          const data = banknotesData[i] as BanknoteFormData;
          console.log("[Import] Creating banknote with data:", {
            country: data.country,
            countryCode: data.countryCode,
          });
          const created = await banknoteService.createBanknote(data);
          console.log("[Import] Created banknote:", {
            id: created.id,
            country: created.country,
            countryCode: created.countryCode,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to import banknote ${i + 1}:`, error);
          errorCount++;
        }

        setImportProgress(Math.round(((i + 1) / banknotesData.length) * 100));
      }

      // Reload banknotes and subscription (for storage updates)
      await Promise.all([loadBanknotes(), reloadSubscription()]);

      setImporting(false);
      setImportModalOpen(false);
      setImportProgress(0);

      notifications.show({
        title: "Import Complete",
        message: `Successfully imported ${successCount} banknote${successCount !== 1 ? "s" : ""}${errorCount > 0 ? ` (${errorCount} failed)` : ""}`,
        color: successCount > 0 ? "green" : "red",
      });
    } catch (error) {
      console.error("Failed to import CSV:", error);
      setImporting(false);
      setImportModalOpen(false);
      setImportProgress(0);
      notifications.show({
        title: "Import Failed",
        message: "Failed to parse CSV file. Please check the format.",
        color: "red",
      });
    }
  };

  if (view === "form") {
    return (
      <Container size="xl" py="md">
        <BanknoteForm
          banknote={editingBanknote || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          currentFeaturedCount={
            banknotes.filter(
              (b) => b.isFeatured && b.id !== editingBanknote?.id
            ).length
          }
        />
      </Container>
    );
  }

  if (loading) {
    return (
      <Container size="xl" py="md">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  // Calculate total collection value
  const collectionValue = (() => {
    const totalsByCurrency = new Map<string, number>();
    displayBanknotes.forEach((banknote) => {
      if (banknote.purchasePrice > 0) {
        const currency = banknote.purchasePriceCurrency || "USD";
        const current = totalsByCurrency.get(currency) || 0;
        totalsByCurrency.set(currency, current + banknote.purchasePrice);
      }
    });

    if (totalsByCurrency.size === 0) return "$0";

    return Array.from(totalsByCurrency.entries())
      .map(([currency, total]) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency,
          maximumFractionDigits: 0,
        }).format(total)
      )
      .join(", ");
  })();

  return (
    <Container size="xl" py="md">
      <Stack gap="md" mb="lg">
        {/* Header: Title + Share URL + Primary CTA */}
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Title order={2}>{isOwner ? "Your Collection" : "Collection"}</Title>

          <Group gap="sm" align="center">
            {isOwner && user && (
              <Tooltip
                label="Share your public collection URL. Anyone with this link can view your public banknotes."
                position="bottom"
                withArrow
                multiline
              >
                <ActionIcon
                  variant="filled"
                  color={copied ? "green" : "sage"}
                  onClick={handleCopyUrl}
                  size="lg"
                >
                  {copied ? <IconCheck size={20} /> : <IconShare size={20} />}
                </ActionIcon>
              </Tooltip>
            )}
            {isOwner && (
              <Tooltip
                label="Add a banknote to your collection."
                position="bottom"
                withArrow
                multiline
              >
                <ActionIcon
                  variant="filled"
                  size="xl"
                  onClick={() => {
                    setEditingBanknote(null);
                    setView("form");
                  }}
                  disabled={!canAddBanknote}
                  aria-label="Add Banknote"
                >
                  <IconPlus size={30} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* Stats + Utilities Row */}
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          {/* Stats */}
          <Group gap="xl">
            {collectionValue !== "$0" && (
              <div>
                <Text size="xs" c="dimmed" fw={500}>
                  Total collection value
                </Text>
                <Text size="lg" fw={700}>
                  {collectionValue}
                </Text>
              </div>
            )}
            <div>
              <Text size="xs" c="dimmed" fw={500}>
                Banknotes
              </Text>
              <Text size="lg" fw={700}>
                {displayBanknotes.length}
              </Text>
            </div>
            {subscription && (
              <div>
                <Text size="xs" c="dimmed" fw={500}>
                  Storage
                </Text>
                <Text size="lg" fw={700}>
                  {formatStorageSize(subscription.totalStorageUsed || 0)} /{" "}
                  {formatStorageSize(limits.storage.limit)}
                </Text>
              </div>
            )}
          </Group>

          {/* Utilities */}
          <Group gap="sm">
            {isPro && (
              <FileButton
                onChange={handleImportCSV}
                accept=".csv"
                disabled={importing}
              >
                {(props) => (
                  <Tooltip
                    label="Import from Numista (beta)"
                    position="bottom"
                    withArrow
                  >
                    <Button
                      {...props}
                      variant="light"
                      leftSection={<IconUpload size={16} />}
                      loading={importing}
                      disabled={importing}
                    >
                      Import
                    </Button>
                  </Tooltip>
                )}
              </FileButton>
            )}
            {displayBanknotes.length > 0 && (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button
                    variant="light"
                    rightSection={<IconChevronDown size={16} />}
                  >
                    Export
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconFileTypeCsv size={16} />}
                    onClick={() => handleExportClick("csv")}
                  >
                    Export CSV
                  </Menu.Item>
                  {isPro ? (
                    <Menu.Item
                      leftSection={<IconFileTypePdf size={16} />}
                      onClick={() => handleExportClick("pdf")}
                    >
                      Export PDF
                    </Menu.Item>
                  ) : (
                    <Menu.Item
                      leftSection={<IconFileTypePdf size={16} />}
                      disabled
                      onClick={() => {
                        notifications.show({
                          title: "Pro Feature",
                          message:
                            "PDF export is available for Pro subscribers. Upgrade to unlock this feature.",
                          color: "blue",
                        });
                        navigate("/pricing");
                      }}
                    >
                      Export PDF (Pro)
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Group>
      </Stack>

      <Gallery
        banknotes={displayBanknotes}
        onEdit={(banknote) => {
          setEditingBanknote(banknote);
          setView("form");
        }}
        onDelete={handleDelete}
        showOwner={false}
        gateFilters={true}
      />

      {/* Import Progress Modal */}
      <Modal
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Importing Banknotes"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Processing CSV file...
          </Text>
          <Progress value={importProgress} animated />
          <Text size="xs" c="dimmed" ta="center">
            {importProgress}% complete
          </Text>
        </Stack>
      </Modal>

      {/* Export Modal */}
      <Modal
        opened={exportModalOpen}
        onClose={() => {
          setExportModalOpen(false);
          setExportType(null);
        }}
        title={exportType === "pdf" ? "Export to PDF" : "Export to CSV"}
        centered
      >
        <Stack gap="md">
          <Switch
            label="Include purchase information (price, currency, date)"
            checked={includePurchaseInfo}
            onChange={(e) => setIncludePurchaseInfo(e.currentTarget.checked)}
          />
          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={() => {
                setExportModalOpen(false);
                setExportType(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleExport}>
              {exportType === "pdf" ? "Export PDF" : "Export CSV"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
