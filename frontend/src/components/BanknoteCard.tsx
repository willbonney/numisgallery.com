import { Box, Center, Loader, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import type { Banknote } from "../types/banknote";
import { getImageUrl } from "../utils/fileHelpers";
import classes from "./BanknoteCard.module.css";

function formatBanknoteDetails(banknote: Banknote): string {
  const parts: string[] = [];

  // Country or Authority
  if (banknote.noteType === "us" && banknote.authority) {
    parts.push(banknote.authority);
  } else if (banknote.country) {
    parts.push(banknote.country);
  }

  // Year or Year Range
  if (
    banknote.isRangeOfYearOfIssue &&
    banknote.yearOfIssueStart &&
    banknote.yearOfIssueEnd
  ) {
    parts.push(`${banknote.yearOfIssueStart}-${banknote.yearOfIssueEnd}`);
  } else if (banknote.yearOfIssueSingle) {
    parts.push(banknote.yearOfIssueSingle.toString());
  }

  // Face Value and Currency/Denomination
  if (banknote.faceValue && banknote.currency) {
    parts.push(`${banknote.faceValue} ${banknote.currency}`);
  } else if (banknote.faceValue) {
    parts.push(banknote.faceValue.toString());
  }

  // Grade
  if (banknote.grade && banknote.grade !== "Not Listed") {
    parts.push(`(${banknote.grade})`);
  }

  return parts.join(", ") || "No Image";
}

interface BanknoteCardProps {
  banknote: Banknote;
  onClick?: () => void;
}

export function BanknoteCard({ banknote, onClick }: BanknoteCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(2.2);
  const [obverseLoading, setObverseLoading] = useState(true);
  const [reverseLoading, setReverseLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (banknote.obverseImage) {
      const img = new Image();
      img.onload = () => {
        setAspectRatio(img.width / img.height);
        setObverseLoading(false);
      };
      img.onerror = () => {
        setObverseLoading(false);
      };
      // Use higher resolution thumbnails for better quality on retina displays
      // 1400x0 for featured notes, 800x0 for normal notes
      const thumbSize = banknote.isFeatured ? "1400x0" : "800x0";
      img.src = getImageUrl(banknote, banknote.obverseImage, thumbSize);
    }
    if (banknote.reverseImage) {
      const img = new Image();
      img.onload = () => {
        setReverseLoading(false);
      };
      img.onerror = () => {
        setReverseLoading(false);
      };
      const thumbSize = banknote.isFeatured ? "1400x0" : "800x0";
      img.src = getImageUrl(banknote, banknote.reverseImage, thumbSize);
    }
  }, [banknote]);

  const cardClass = banknote.isFeatured
    ? `${classes.card} ${classes.featured}`
    : classes.card;

  return (
    <Box
      className={cardClass}
      style={{ aspectRatio }}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={onClick}
    >
      <div
        className={`${classes.flipContainer} ${isFlipped ? classes.flipped : ""}`}
      >
        <div className={classes.front}>
          {banknote.obverseImage ? (
            <>
              {obverseLoading && (
                <Center
                  className={classes.image}
                  style={{ position: "absolute", inset: 0 }}
                >
                  <Loader size="sm" />
                </Center>
              )}
              <img
                ref={imgRef}
                src={getImageUrl(
                  banknote,
                  banknote.obverseImage,
                  banknote.isFeatured ? "1400x0" : "800x0"
                )}
                alt={`${banknote.country} ${banknote.faceValue} ${banknote.currency} obverse`}
                className={classes.image}
                style={{
                  opacity: obverseLoading ? 0 : 1,
                  transition: "opacity 0.2s",
                }}
                onLoad={() => setObverseLoading(false)}
                onError={() => setObverseLoading(false)}
              />
            </>
          ) : (
            <div className={classes.placeholder}>
              <Text size="xs" c="dimmed" ta="center" style={{ padding: "8px" }}>
                {formatBanknoteDetails(banknote)}
              </Text>
            </div>
          )}
        </div>
        <div className={classes.back}>
          {banknote.reverseImage ? (
            <>
              {reverseLoading && (
                <Center
                  className={classes.image}
                  style={{ position: "absolute", inset: 0 }}
                >
                  <Loader size="sm" />
                </Center>
              )}
              <img
                src={getImageUrl(
                  banknote,
                  banknote.reverseImage,
                  banknote.isFeatured ? "1400x0" : "800x0"
                )}
                alt={`${banknote.country} ${banknote.faceValue} ${banknote.currency} reverse`}
                className={classes.image}
                style={{
                  opacity: reverseLoading ? 0 : 1,
                  transition: "opacity 0.2s",
                }}
                onLoad={() => setReverseLoading(false)}
                onError={() => setReverseLoading(false)}
              />
            </>
          ) : (
            <div className={classes.placeholder}>
              <Text size="xs" c="dimmed" ta="center" style={{ padding: "8px" }}>
                {formatBanknoteDetails(banknote)}
              </Text>
            </div>
          )}
        </div>
      </div>
    </Box>
  );
}
