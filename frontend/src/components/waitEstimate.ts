/**
 * Time estimates for the long collector actions.
 *
 * Measured from this app, not guessed:
 * - A warm PMG page load is about 27s. One slow Cloudflare pass can reach 90s.
 * - Waking a sleeping lookup browser is usually a few seconds. The client holds
 *   that connection for up to 45s and may retry, so wake plus the page load can
 *   reach about 2 minutes.
 * - Label OCR (InternVL) finished in 31s and 52s on the fixture note. The
 *   client allows 150s when the connection to the model has to be retried.
 * - Queue spacing between scrapes is 20s, and each PMG job is about 30s of work.
 */

export type WaitEstimate = {
  id: string;
  typicalSeconds: number;
  maxSeconds: number;
  detail: string;
};

export type WaitProjection = {
  remainingLabel: string;
  detail: string;
  progressPercent: number;
  /** True once the usual time has passed and the long case is still open. */
  runningLong: boolean;
};

export const PMG_LOOKUP_HINT =
  "Usually about 30 seconds. A little longer if the lookup browser was asleep.";

export const OCR_HINT =
  "Usually about 1 minute. A slow connection can take up to 2 minutes 30 seconds.";

export const NUMISTA_HINT =
  "Usually about 30 seconds. A little longer if the lookup browser was asleep.";

const GENERIC: WaitEstimate = {
  id: "generic",
  typicalSeconds: 10,
  maxSeconds: 30,
  detail: "This usually finishes within a few seconds.",
};

export function estimateForMessage(message: string): WaitEstimate {
  const m = message.toLowerCase();
  const waitMatch = /waiting (\d+)s/.exec(m);
  if (m.includes("rate limit") && waitMatch) {
    const seconds = Number(waitMatch[1]);
    return {
      id: "rate-limit",
      typicalSeconds: seconds,
      maxSeconds: seconds,
      detail: `Pausing ${seconds} seconds so requests are not sent too close together.`,
    };
  }

  const positionMatch = /position (\d+)/.exec(m);
  if (m.includes("queued") || m.includes("in queue")) {
    const position = positionMatch ? Number(positionMatch[1]) : 1;
    const typicalSeconds = Math.max(30, position * 30);
    return {
      id: "queue",
      typicalSeconds,
      maxSeconds: typicalSeconds + 60,
      detail:
        position > 1
          ? `${position} requests are ahead. Each one usually takes about 30 seconds.`
          : "You're next. The page usually loads in about 30 seconds.",
    };
  }

  if (m.includes("extract")) {
    return {
      id: "extract",
      typicalSeconds: 60,
      maxSeconds: 150,
      detail:
        "Reading the label usually takes about a minute. A slow connection to the model can take up to 2 minutes 30 seconds.",
    };
  }

  if (m.includes("catalog photo")) {
    return {
      id: "catalog",
      typicalSeconds: 8,
      maxSeconds: 20,
      detail: "Attaching the catalog photos usually takes a few seconds.",
    };
  }

  if (m.includes("numista") || m.includes("applying details")) {
    if (m.includes("applying") || m.includes("details found")) {
      return {
        id: "numista-apply",
        typicalSeconds: 8,
        maxSeconds: 20,
        detail:
          "Filling in the form from the catalog page takes a few seconds.",
      };
    }
    return {
      id: "numista-page",
      typicalSeconds: 30,
      maxSeconds: 90,
      detail:
        "The Numista page usually loads in about 30 seconds. A slow security check can take up to a minute and a half.",
    };
  }

  if (
    m.includes("waking the lookup") ||
    m.includes("flaresolverr") ||
    m.includes("machine is starting")
  ) {
    return {
      id: "wake",
      typicalSeconds: 45,
      maxSeconds: 120,
      detail:
        "The lookup browser sleeps when it is idle. Waking it is usually a few seconds, and loading the page takes about 30 seconds. Together that is usually under a minute, and occasionally up to 2 minutes.",
    };
  }

  if (m.includes("generating pdf") || m.includes("pdf")) {
    return {
      id: "pdf",
      typicalSeconds: 15,
      maxSeconds: 45,
      detail: "Building the PDF usually takes about 15 seconds.",
    };
  }

  if (m.includes("generating csv") || m.includes("csv")) {
    return {
      id: "csv",
      typicalSeconds: 5,
      maxSeconds: 15,
      detail: "Building the spreadsheet usually takes a few seconds.",
    };
  }

  if (m.includes("saving")) {
    return {
      id: "save",
      typicalSeconds: 10,
      maxSeconds: 30,
      detail: "Saving the note and its photos usually takes about 10 seconds.",
    };
  }

  if (
    m.includes("parsing") ||
    m.includes("images found") ||
    m.includes("loading images")
  ) {
    return {
      id: "download",
      typicalSeconds: 8,
      maxSeconds: 20,
      detail: "The page is in. Downloading the photos takes a few seconds.",
    };
  }

  if (
    m.includes("pmg") ||
    m.includes("cloudflare") ||
    m.includes("bypass") ||
    m.includes("fetching") ||
    m.includes("submitting") ||
    m.includes("processing") ||
    m.includes("preparing") ||
    m.includes("checking services")
  ) {
    return {
      id: "pmg-page",
      typicalSeconds: 30,
      maxSeconds: 90,
      detail:
        "The certification page usually loads in about 30 seconds. A slow security check can take up to a minute and a half.",
    };
  }

  return GENERIC;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} seconds`;
  const minutes = Math.floor(s / 60);
  const rem = s % 60;
  const minuteLabel = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  if (rem === 0) return minuteLabel;
  return `${minuteLabel} ${rem} seconds`;
}

export function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s <= 7) return "A few seconds left";
  if (s >= 50 && s < 75) return "About 1 minute left";
  if (s < 60) {
    const rounded = Math.ceil(s / 5) * 5;
    return `About ${rounded} seconds left`;
  }
  if (s < 105) return "About 1 minute 30 seconds left";
  if (s < 135) return "About 2 minutes left";
  if (s < 165) return "About 2 minutes 30 seconds left";
  return `About ${Math.ceil(s / 60)} minutes left`;
}

export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s so far`;
  const minutes = Math.floor(s / 60);
  const rem = s % 60;
  return `${minutes}m ${rem.toString().padStart(2, "0")}s so far`;
}

export function progressPercent(
  elapsedSeconds: number,
  typicalSeconds: number,
  maxSeconds: number
): number {
  const typical = Math.max(typicalSeconds, 1);
  const max = Math.max(maxSeconds, typical);
  if (elapsedSeconds <= 0) return 2;
  if (elapsedSeconds <= typical) {
    return Math.min(
      85,
      Math.max(2, Math.round((elapsedSeconds / typical) * 85))
    );
  }
  if (elapsedSeconds >= max) return 96;
  const span = max - typical;
  return Math.round(85 + ((elapsedSeconds - typical) / span) * 11);
}

export function projectWait(
  message: string,
  phaseElapsedSeconds: number
): WaitProjection {
  const estimate = estimateForMessage(message);
  const elapsed = Math.max(0, phaseElapsedSeconds);
  const progress = progressPercent(
    elapsed,
    estimate.typicalSeconds,
    estimate.maxSeconds
  );

  if (elapsed + 0.05 < estimate.typicalSeconds) {
    return {
      remainingLabel: formatRemaining(estimate.typicalSeconds - elapsed),
      detail: estimate.detail,
      progressPercent: progress,
      runningLong: false,
    };
  }

  if (elapsed < estimate.maxSeconds) {
    return {
      remainingLabel: `Running long — usually finished within ${formatDuration(estimate.maxSeconds)}`,
      detail: estimate.detail,
      progressPercent: progress,
      runningLong: true,
    };
  }

  return {
    remainingLabel:
      "This is past the usual time. Keeping this tab open is safe.",
    detail: estimate.detail,
    progressPercent: 96,
    runningLong: true,
  };
}
