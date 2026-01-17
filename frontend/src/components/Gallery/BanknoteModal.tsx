import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Center,
  Group,
  Image,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDownload,
  IconLock,
  IconPencil,
  IconShare,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "../../contexts/types";
import { useAuth } from "../../hooks/useAuth";
import type { Banknote } from "../../types/banknote";
import { getImageUrl } from "../../utils/fileHelpers";
import { CountryFlag } from "../CountryFlag";
import { CurrencyIcon } from "../CurrencyIcon";
import classes from "../Gallery.module.css";

interface BanknoteModalProps {
  banknote: Banknote | null;
  owner: User | null;
  showOwner: boolean;
  onClose: () => void;
  onEdit?: (banknote: Banknote) => void;
  onDelete?: () => void;
}

const yearDisplay = (b: Banknote) =>
  b.isRangeOfYearOfIssue
    ? `${b.yearOfIssueStart}–${b.yearOfIssueEnd}`
    : b.yearOfIssueSingle;

export function BanknoteModal({
  banknote,
  owner,
  showOwner,
  onClose,
  onEdit,
  onDelete,
}: BanknoteModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [showReverse, setShowReverse] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!banknote) return null;

  const currentImageSrc = showReverse
    ? getImageUrl(banknote, banknote.reverseImage)
    : getImageUrl(banknote, banknote.obverseImage);

  const shareableUrl =
    banknote.isVisibleInCollection && owner
      ? `${window.location.origin}/users/${owner.id}?banknote=${banknote.id}`
      : null;

  const isOwner = user?.id === owner?.id;

  const handleCopyUrl = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    notifications.show({
      title: "Copied!",
      message: "Banknote URL copied to clipboard",
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

  const handleDownloadImages = async () => {
    setIsDownloading(true);
    try {
      const downloadImage = async (
        imageField: "obverseImage" | "reverseImage",
        side: "obverse" | "reverse"
      ) => {
        if (!banknote[imageField]) return;

        const imageUrl = getImageUrl(banknote, banknote[imageField]);
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        const fileName = `${banknote.country}_${banknote.faceValue}${banknote.currency}_${banknote.grade}_${side}.jpg`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      };

      if (banknote.obverseImage) {
        await downloadImage("obverseImage", "obverse");
        // Small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (banknote.reverseImage) {
        await downloadImage("reverseImage", "reverse");
      }

      notifications.show({
        title: "Downloaded!",
        message: "Banknote images downloaded successfully",
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
    } catch (error) {
      console.error("Error downloading images:", error);
      notifications.show({
        title: "Error!",
        message: "Failed to download images",
        color: "red",
        icon: <IconX size={20} />,
        autoClose: 3000,
        withCloseButton: true,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      opened={banknote !== null}
      onClose={onClose}
      size="xl"
      fullScreen={isMobile}
      padding={0}
      withCloseButton={false}
      classNames={{ content: classes.modalContent, body: classes.modalBody }}
      centered
    >
      <Box className={classes.modalInner}>
        <Group className={classes.topActions} gap="xs">
          {(banknote.obverseImage || banknote.reverseImage) && (
            <Tooltip
              label="Download full resolution images"
              position="bottom"
              withArrow
            >
              <ActionIcon
                className={classes.actionBtn}
                variant="subtle"
                color="gray"
                onClick={handleDownloadImages}
                size="lg"
                disabled={isDownloading}
                style={{
                  border: "1px solid var(--mantine-color-gray-4)",
                  backgroundColor: "var(--mantine-color-dark-6)",
                }}
              >
                <IconDownload size={18} />
              </ActionIcon>
            </Tooltip>
          )}
          {shareableUrl && (
            <Tooltip
              label="Share this banknote's direct link. Anyone with this link can view this banknote in your collection."
              position="bottom"
              withArrow
              multiline
            >
              <ActionIcon
                className={classes.actionBtn}
                variant="subtle"
                color={copied ? "green" : "gray"}
                onClick={handleCopyUrl}
                size="lg"
                style={{
                  border: "1px solid var(--mantine-color-gray-4)",
                  backgroundColor: "var(--mantine-color-dark-6)",
                }}
              >
                {copied ? <IconCheck size={18} /> : <IconShare size={18} />}
              </ActionIcon>
            </Tooltip>
          )}
          {isOwner && onDelete && (
            <ActionIcon
              className={classes.actionBtn}
              variant="subtle"
              color="red"
              onClick={onDelete}
              size="lg"
              title="Delete banknote"
            >
              <IconTrash size={18} />
            </ActionIcon>
          )}
          {isOwner && onEdit && (
            <ActionIcon
              className={classes.actionBtn}
              variant="subtle"
              color="gray"
              onClick={() => {
                onEdit(banknote);
                onClose();
              }}
              size="lg"
              title="Edit banknote"
            >
              <IconPencil size={18} />
            </ActionIcon>
          )}
          <ActionIcon
            className={classes.actionBtn}
            variant="subtle"
            color="gray"
            onClick={onClose}
            size="lg"
            title="Close"
          >
            <IconX size={20} />
          </ActionIcon>
        </Group>

        <Box
          className={classes.imageContainer}
          onClick={() => {
            setShowReverse(!showReverse);
            setImageLoading(true);
          }}
          style={{ position: "relative" }}
        >
          {imageLoading && (
            <Center style={{ position: "absolute", inset: 0, zIndex: 1 }}>
              <Loader size="lg" />
            </Center>
          )}
          <Image
            src={currentImageSrc}
            alt={`${banknote.country} banknote`}
            className={classes.modalImage}
            fallbackSrc="https://placehold.co/800x400?text=No+Image"
            style={{
              opacity: imageLoading ? 0 : 1,
              transition: "opacity 0.2s",
            }}
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
          <Text size="xs" c="dimmed" ta="center" mt="xs">
            Click image to flip • Showing {showReverse ? "Reverse" : "Obverse"}
          </Text>
        </Box>

        <Stack gap="xs" className={classes.details} p="md">
          {showOwner && owner && owner.id !== user?.id && (
            <Group
              gap="xs"
              mb="xs"
              onClick={() => {
                onClose();
                navigate(`/users/${owner.id}`);
              }}
              style={{
                cursor: "pointer",
                borderRadius: "4px",
                padding: "4px 8px",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--mantine-color-gray-1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Avatar
                size="sm"
                color="sage"
                src={
                  owner.avatar && owner.collectionId && owner.collectionName
                    ? getImageUrl(
                        {
                          id: owner.id,
                          collectionId: owner.collectionId,
                          collectionName: owner.collectionName,
                        },
                        owner.avatar
                      )
                    : undefined
                }
              >
                {owner.email?.charAt(0).toUpperCase() || <IconUser size={16} />}
              </Avatar>
              <Text size="sm" c="dimmed">
                Owner:{" "}
                <Text component="span" fw={500} c="inherit">
                  {owner.username || owner.email}
                </Text>
              </Text>
            </Group>
          )}
          <Stack gap="sm">
            <Group gap="sm" wrap="nowrap">
              {banknote.countryCode && (
                <CountryFlag countryCode={banknote.countryCode} size="lg" />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Group gap="xs" wrap="nowrap">
                  {banknote.currencyCode && (
                    <CurrencyIcon
                      currencyCode={banknote.currencyCode}
                      size="lg"
                    />
                  )}
                  <Text fw={700} size="lg" style={{ wordBreak: "break-word" }}>
                    {banknote.faceValue} {banknote.currency}
                  </Text>
                </Group>
                <Text c="dimmed" size="sm" style={{ wordBreak: "break-word" }}>
                  {banknote.country} • {yearDisplay(banknote)}
                </Text>
              </div>
            </Group>
            <Group gap={6} wrap="wrap">
              <Badge color="dark" variant="filled">
                PMG {banknote.grade === "Not Listed" ? "N/L" : banknote.grade}
              </Badge>
              {banknote.isEpq && (
                <Badge color="green" variant="filled">
                  EPQ
                </Badge>
              )}
              {banknote.isSpecimen && (
                <Badge color="orange" variant="filled">
                  SPECIMEN
                </Badge>
              )}
              {!banknote.isVisibleInCollection && (
                <Badge
                  color="gray"
                  variant="filled"
                  leftSection={<IconLock size={10} />}
                >
                  PRIVATE
                </Badge>
              )}
            </Group>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mt="sm" spacing="md">
            <div>
              <Text size="xs" c="dimmed">
                Pick #
              </Text>
              <Text size="sm">{banknote.pickNumber || "—"}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Serial
              </Text>
              <Text size="sm" ff="monospace" style={{ wordBreak: "break-all" }}>
                {banknote.serialNumber || "—"}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">
                PMG Cert
              </Text>
              <Text size="sm" ff="monospace">
                {banknote.pmgCert || "—"}
              </Text>
            </div>
            {banknote.purchasePrice > 0 && isOwner && (
              <div>
                <Text size="xs" c="dimmed">
                  Purchased
                </Text>
                <Text size="sm">
                  {banknote.purchasePrice} {banknote.purchasePriceCurrency}
                </Text>
              </div>
            )}
          </SimpleGrid>

          {banknote.pmgComments && (
            <div>
              <Text size="xs" c="dimmed">
                PMG Comments
              </Text>
              <Text size="sm">{banknote.pmgComments}</Text>
            </div>
          )}
        </Stack>
      </Box>
    </Modal>
  );
}
