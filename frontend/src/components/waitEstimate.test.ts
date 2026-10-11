import { describe, expect, it } from "vitest";
import { estimateForMessage, formatElapsed, projectWait } from "./waitEstimate";

describe("projectWait", () => {
  it("starts a PMG page load at about 30 seconds", () => {
    const wait = projectWait("Fetching the PMG page...", 0);
    expect(wait.remainingLabel).toBe("About 30 seconds left");
    expect(wait.detail).toMatch(/30 seconds/);
    expect(wait.detail).toMatch(/minute and a half/);
    expect(wait.runningLong).toBe(false);
    expect(wait.progressPercent).toBe(2);
  });

  it("counts a PMG page load down and rounds to 5 seconds", () => {
    const wait = projectWait("Bypassing Cloudflare — fetching PMG page...", 12);
    expect(wait.remainingLabel).toBe("About 20 seconds left");
  });

  it("keeps preparing and fetching the PMG page on one clock", () => {
    expect(estimateForMessage("Preparing the PMG lookup...").id).toBe(
      "pmg-page"
    );
    expect(estimateForMessage("Fetching the PMG page...").id).toBe("pmg-page");
  });

  it("gives a sleeping browser the longer lookup budget", () => {
    const estimate = estimateForMessage("Waking the lookup browser...");
    expect(estimate.id).toBe("wake");
    expect(estimate.typicalSeconds).toBe(45);
    expect(estimate.maxSeconds).toBe(120);
    expect(projectWait("Waking the lookup browser...", 0).detail).toMatch(
      /under a minute/
    );
  });

  it("says a PMG load is running long before calling it stuck", () => {
    const mid = projectWait("Fetching the PMG page...", 40);
    expect(mid.runningLong).toBe(true);
    expect(mid.remainingLabel).toMatch(/1 minute 30 seconds/);
    expect(mid.progressPercent).toBeGreaterThan(85);
    expect(mid.progressPercent).toBeLessThan(96);

    const past = projectWait("Fetching the PMG page...", 100);
    expect(past.remainingLabel).toMatch(/past the usual time/);
    expect(past.progressPercent).toBe(96);
  });

  it("starts label reading at about a minute and allows 2 minutes 30 seconds", () => {
    const start = projectWait("Extracting data from images...", 0);
    expect(start.remainingLabel).toBe("About 1 minute left");
    expect(
      projectWait("Extracting data from images...", 1).remainingLabel
    ).toBe("About 1 minute left");
    expect(start.detail).toMatch(/2 minutes 30 seconds/);

    const slow = projectWait("Extracting data from images...", 70);
    expect(slow.runningLong).toBe(true);
    expect(slow.remainingLabel).toMatch(/2 minutes 30 seconds/);
  });

  it("estimates a queue from how many requests are ahead", () => {
    const wait = projectWait("Queued (position 3) — waiting...", 0);
    expect(wait.remainingLabel).toBe("About 1 minute 30 seconds left");
    expect(wait.detail).toMatch(/3 requests are ahead/);
    expect(estimateForMessage("Queued (position 2) — waiting...").id).toBe(
      "queue"
    );
  });

  it("counts down the server's rate-limit pause", () => {
    const wait = projectWait(
      "Rate limiting — waiting 12s before request...",
      4
    );
    expect(wait.remainingLabel).toBe("About 10 seconds left");
    expect(
      estimateForMessage("Rate limiting — waiting 12s before request...")
        .maxSeconds
    ).toBe(12);
  });

  it("treats a Numista import separately from a PMG lookup", () => {
    const wait = projectWait("Preparing the Numista import...", 0);
    expect(wait.detail).toMatch(/Numista/);
    expect(wait.detail).not.toMatch(/certification page/);
  });

  it("formats elapsed time for the secondary line", () => {
    expect(formatElapsed(12)).toBe("12s so far");
    expect(formatElapsed(75)).toBe("1m 15s so far");
  });
});
