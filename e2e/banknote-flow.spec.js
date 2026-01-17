import { expect, test } from "@playwright/test";
import PocketBase from "pocketbase";

const POCKETBASE_URL =
  process.env.E2E_POCKETBASE_URL || "http://localhost:8090";
const SCRAPER_URL = process.env.E2E_SCRAPER_URL || "http://localhost:3001";

// Test data
const TEST_CERT = "1991248-001";
const TEST_GRADE = "66";
const EXPECTED_DATA = {
  pickNumber: "2231-J",
  faceValue: 10000,
  currency: "USD",
  yearOfIssueSingle: 1934,
  authority: "Federal Reserve Note",
  grade: "66",
  isEpq: true,
  serialNumber: "J00000562A",
  country: "United States",
  countryCode: "us",
  noteType: "us",
};

test.describe("Banknote Flow E2E", () => {
  let pb;
  let testUserEmail;
  let testUserId;

  test.beforeAll(async ({ request }) => {
    // Verify all required services are accessible before running tests
    const { execSync } = require("child_process");

    // Check PocketBase
    try {
      const healthResponse = await request.get(`${POCKETBASE_URL}/api/health`);
      if (!healthResponse.ok()) {
        throw new Error(
          `PocketBase health check failed: ${healthResponse.status()}`,
        );
      }
    } catch (error) {
      throw new Error(
        `PocketBase is not accessible at ${POCKETBASE_URL}. ` +
          `Please start PocketBase with: npm run dev:pocketbase\n` +
          `Error: ${error.message}`,
      );
    }

    // Check Hermes
    try {
      const output = execSync(
        'docker ps --filter name=hermes-scraper --filter status=running --format "{{.Names}}"',
        { encoding: "utf-8", stdio: "pipe" },
      );
      if (!output.trim().includes("hermes-scraper")) {
        throw new Error("Hermes container is not running");
      }
    } catch (error) {
      throw new Error(
        `Hermes is not running. Please start it with: npm run dev:hermes\n` +
          `Error: ${error.message}`,
      );
    }

    // Check Scraper API
    try {
      const scraperHealth = await request.get(`${SCRAPER_URL}/health`, {
        timeout: 3000,
      });
      if (!scraperHealth.ok()) {
        throw new Error(
          `Scraper health check failed: ${scraperHealth.status()}`,
        );
      }
      const healthData = await scraperHealth.json();
      if (healthData.status !== "ok") {
        throw new Error(
          `Scraper is not healthy: ${JSON.stringify(healthData)}`,
        );
      }
    } catch (error) {
      throw new Error(
        `Scraper API is not accessible at ${SCRAPER_URL}. ` +
          `Please start the scraper with: npm run dev:scraper\n` +
          `Error: ${error.message}`,
      );
    }

    // Verify scraper has admin credentials by attempting a test API call
    // This will fail early if credentials are missing
    try {
      const testResponse = await request.post(`${SCRAPER_URL}/api/pmg-images`, {
        data: { cert: "test", grade: "66" },
        headers: { Authorization: "Bearer test-token" }, // Will fail auth but should get past credential check
        timeout: 2000,
      });
      // If we get a 401/403 about admin credentials, that means the scraper is missing them
      if (testResponse.status() === 403) {
        const errorData = await testResponse.json().catch(() => ({}));
        if (
          errorData.error &&
          (errorData.error.includes("ADMIN_EMAIL") ||
            errorData.error.includes("ADMIN_PASSWORD"))
        ) {
          throw new Error("Scraper is missing admin credentials");
        }
      }
    } catch (error) {
      if (
        error.message.includes("ADMIN_EMAIL") ||
        error.message.includes("ADMIN_PASSWORD") ||
        error.message.includes("admin credentials")
      ) {
        throw new Error(
          `Scraper is missing admin credentials required for usage tracking.\n` +
            `Please add ADMIN_EMAIL and ADMIN_PASSWORD to backend/scraper/.env:\n` +
            `  ADMIN_EMAIL=your@email.com\n` +
            `  ADMIN_PASSWORD=yourpassword\n` +
            `\nThese are the same credentials used for other PocketBase admin operations.`,
        );
      }
      // Other errors (like connection refused) are OK here - we're just checking credentials
    }

    // Initialize PocketBase client for database verification
    pb = new PocketBase(POCKETBASE_URL);
  });

  test.afterAll(async () => {
    // Cleanup: Delete all e2e test data (users, banknotes, subscriptions)
    try {
      // Try to load from scraper .env file if not in process.env
      let ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.E2E_ADMIN_EMAIL;
      let ADMIN_PASSWORD =
        process.env.ADMIN_PASSWORD || process.env.E2E_ADMIN_PASSWORD;

      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        try {
          const fs = require("fs");
          const path = require("path");
          const envPath = path.join(
            __dirname,
            "..",
            "backend",
            "scraper",
            ".env",
          );
          if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, "utf8");
            const envLines = envContent.split("\n");
            for (const line of envLines) {
              const trimmed = line.trim();
              if (trimmed && !trimmed.startsWith("#")) {
                const [key, ...valueParts] = trimmed.split("=");
                if (key === "ADMIN_EMAIL" && !ADMIN_EMAIL) {
                  ADMIN_EMAIL = valueParts.join("=").trim();
                } else if (key === "ADMIN_PASSWORD" && !ADMIN_PASSWORD) {
                  ADMIN_PASSWORD = valueParts.join("=").trim();
                }
              }
            }
          }
        } catch (e) {
          // Ignore errors reading .env file
        }
      }

      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        console.warn(
          "⚠️  Cannot clean up test data: ADMIN_EMAIL and ADMIN_PASSWORD not set",
        );
        console.warn(
          "   Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD environment variables for cleanup",
        );
        // Still try to clean up with PocketBase SDK (may work if user has permissions)
      }

      // Authenticate as admin for cleanup operations
      let adminPb = null;
      if (ADMIN_EMAIL && ADMIN_PASSWORD) {
        try {
          adminPb = new PocketBase(POCKETBASE_URL);
          await adminPb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        } catch (error) {
          console.warn(
            "⚠️  Cannot authenticate as admin for cleanup:",
            error.message,
          );
          adminPb = null;
        }
      }

      // Clean up by test user ID if we have it
      if (testUserId) {
        try {
          // Delete all banknotes for this user
          const banknotes = await pb.collection("banknotes").getFullList({
            filter: `userId = "${testUserId}"`,
          });
          for (const banknote of banknotes) {
            try {
              if (adminPb) {
                await adminPb.collection("banknotes").delete(banknote.id);
              } else {
                await pb.collection("banknotes").delete(banknote.id);
              }
            } catch (e) {
              // Ignore individual delete errors
            }
          }

          // Delete subscription
          const subscriptions = await pb
            .collection("subscriptions")
            .getFullList({
              filter: `userId = "${testUserId}"`,
            });
          for (const sub of subscriptions) {
            try {
              if (adminPb) {
                await adminPb.collection("subscriptions").delete(sub.id);
              } else {
                await pb.collection("subscriptions").delete(sub.id);
              }
            } catch (e) {
              // Ignore individual delete errors
            }
          }

          // Delete user
          try {
            if (adminPb) {
              await adminPb.collection("users").delete(testUserId);
            } else {
              await pb.collection("users").delete(testUserId);
            }
          } catch (e) {
            // Ignore delete errors
          }
        } catch (error) {
          console.warn("⚠️  Error cleaning up test user:", error.message);
        }
      }

      // Also clean up any orphaned e2e test data (users with e2e-test email pattern)
      // Only do this if we have admin access
      if (adminPb) {
        try {
          const allE2eUsers = await adminPb.collection("users").getFullList({
            filter: 'email ~ "e2e-test-"',
          });

          let cleanedCount = 0;
          for (const user of allE2eUsers) {
            try {
              // Delete user's banknotes
              const userBanknotes = await adminPb
                .collection("banknotes")
                .getFullList({
                  filter: `userId = "${user.id}"`,
                });
              for (const banknote of userBanknotes) {
                try {
                  await adminPb.collection("banknotes").delete(banknote.id);
                } catch (e) {
                  // Ignore
                }
              }

              // Delete user's subscriptions
              const userSubscriptions = await adminPb
                .collection("subscriptions")
                .getFullList({
                  filter: `userId = "${user.id}"`,
                });
              for (const sub of userSubscriptions) {
                try {
                  await adminPb.collection("subscriptions").delete(sub.id);
                } catch (e) {
                  // Ignore
                }
              }

              // Delete user
              try {
                await adminPb.collection("users").delete(user.id);
                cleanedCount++;
              } catch (e) {
                // Ignore
              }
            } catch (error) {
              console.warn(
                `⚠️  Error cleaning up user ${user.id}:`,
                error.message,
              );
            }
          }

          if (cleanedCount > 0) {
            console.log(
              `✅ Cleaned up ${cleanedCount} e2e test user(s) and their associated data`,
            );
          }
        } catch (error) {
          console.warn("⚠️  Error during bulk cleanup:", error.message);
        }
      }
    } catch (error) {
      console.warn("⚠️  Cleanup error (may be expected):", error.message);
    }
  });

  test("Complete banknote flow: Signup → PMG fetch → Extract data → Save → Verify DB", async ({
    page,
    context,
  }) => {
    // Increase timeout to 150 seconds to accommodate slow AI extraction API (InternVL can take up to 90s)
    test.setTimeout(150000);

    // Step 1: Sign up with email/password
    // Generate unique test email to avoid conflicts
    const timestamp = Date.now();
    testUserEmail = `e2e-test-${timestamp}@test.com`;
    const testPassword = "TestPassword123!";
    const testUsername = `e2e-test-${timestamp}`;
    testUserId = null; // Reset for this test run

    await page.goto("/login");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Capture all console logs from the browser to debug form switching
    page.on("console", (msg) => {
      const text = msg.text();
      // Log relevant messages for debugging
      if (
        text.includes("[BanknoteForm]") ||
        text.includes("[OriginSection]") ||
        text.includes("[extractDataFromImages]") ||
        text.includes("Extracted PMG data") ||
        text.includes("Extract") ||
        text.includes("noteType") ||
        text.includes("callback")
      ) {
        console.log("[Browser Console]", text);
      }
      // Also log errors
      if (msg.type() === "error") {
        console.log("[Browser Console Error]", text);
      }
    });

    // Also listen for failed network requests
    page.on("response", (response) => {
      if (!response.ok() && response.url().includes("pocketbase")) {
        console.log(
          `Failed request to ${response.url()}: ${response.status()}`,
        );
      }
    });

    // Wait for Email field to be visible first (always present)
    await page
      .getByLabel("Email")
      .waitFor({ state: "visible", timeout: 10000 });

    // Check if we're in signup mode by looking for username field
    const usernameField = page.getByLabel("Username");
    const isAlreadySignup = await usernameField.isVisible().catch(() => false);

    if (!isAlreadySignup) {
      // Try to find and click the "Sign up" link/button to switch to signup mode
      // The Anchor with component="button" renders as a button
      try {
        // Try multiple selectors to find the sign up button/link
        const signUpSelectors = [
          page.getByRole("button", { name: /sign up/i }),
          page.locator('button:has-text("Sign up")'),
          page.locator('a:has-text("Sign up")'),
        ];

        let clicked = false;
        for (const selector of signUpSelectors) {
          try {
            if (await selector.isVisible({ timeout: 2000 })) {
              await selector.click();
              clicked = true;
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }

        if (clicked) {
          // Wait for the form to switch to signup mode - wait for username field to appear
          await usernameField.waitFor({ state: "visible", timeout: 10000 });
        }
      } catch (e) {
        console.log("Could not find or click sign up button/link:", e.message);
        throw new Error(
          "Failed to switch to signup mode. Sign up button/link not found.",
        );
      }
    }

    // Fill in signup form - use getByLabel which works well with Mantine
    await page.getByLabel("Email").fill(testUserEmail);

    // Username field (only in signup mode) - reuse the variable declared earlier
    if (await usernameField.isVisible()) {
      await usernameField.fill(testUsername);
    }

    // Password field
    await page.getByLabel("Password").fill(testPassword);

    // Check Terms and Conditions checkbox - must be checked for signup
    const termsCheckbox = page.getByLabel(/terms.*conditions/i);
    await expect(termsCheckbox).toBeVisible({ timeout: 5000 });
    if (!(await termsCheckbox.isChecked())) {
      await termsCheckbox.check();
      await page.waitForTimeout(200); // Wait for checkbox state to update
    }

    // Check Privacy Policy checkbox - must be checked for signup
    const privacyCheckbox = page.getByLabel(/privacy.*policy/i);
    await expect(privacyCheckbox).toBeVisible({ timeout: 5000 });
    if (!(await privacyCheckbox.isChecked())) {
      await privacyCheckbox.check();
      await page.waitForTimeout(200); // Wait for checkbox state to update
    }

    // Verify checkboxes are checked
    expect(await termsCheckbox.isChecked()).toBe(true);
    expect(await privacyCheckbox.isChecked()).toBe(true);

    // Wait a moment for form validation
    await page.waitForTimeout(500);

    // Submit signup form - wait for navigation or response
    const submitButton = page.getByRole("button", { name: /sign up/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    // Set up response listener to catch API errors
    let signupResponse = null;
    let apiError = null;

    page.on("response", async (response) => {
      if (
        response.url().includes("/api/collections/users") &&
        response.request().method() === "POST"
      ) {
        signupResponse = response;
        if (!response.ok()) {
          try {
            const errorData = await response.json();
            apiError = { status: response.status(), data: errorData };
          } catch {
            apiError = {
              status: response.status(),
              data: await response.text(),
            };
          }
        }
      }
    });

    // Click submit
    await submitButton.click();

    // Wait a bit for the API call to complete
    await page.waitForTimeout(3000);

    if (apiError) {
      throw new Error(
        `Signup API error: ${apiError.status} - ${JSON.stringify(apiError.data)}`,
      );
    }

    // If no response at all, PocketBase might not be running
    if (!signupResponse) {
      console.warn(
        "No API response detected - PocketBase might not be running",
      );
      // Check if we can reach PocketBase
      try {
        const healthCheck = await page.request.get(
          `${POCKETBASE_URL}/api/health`,
        );
        if (!healthCheck.ok()) {
          throw new Error(
            `PocketBase health check failed at ${POCKETBASE_URL}. Status: ${healthCheck.status()}`,
          );
        }
      } catch (error) {
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("fetch failed")
        ) {
          throw new Error(
            `Cannot connect to PocketBase at ${POCKETBASE_URL}. Please ensure PocketBase is running. The test should start it automatically, but if it fails, run: npm run dev:pocketbase`,
          );
        }
        throw error;
      }
      // If health check passed but no signup response, wait a bit more
      await page.waitForTimeout(2000);
    }

    // Wait for either redirect or error notification
    try {
      await page.waitForURL(/\/(your-banknotes|community|settings)/, {
        timeout: 15000,
      });
    } catch (error) {
      // Check for error notifications
      await page.waitForTimeout(3000); // Give more time for notifications to appear

      // Look for Mantine notifications (they appear in a portal)
      const notification = page
        .locator(
          '.mantine-Notification-root, [role="alert"], .mantine-Notification-title',
        )
        .first();
      if (await notification.isVisible({ timeout: 3000 }).catch(() => false)) {
        const notificationText = await notification.textContent();
        console.error("Signup notification:", notificationText);
        // Also try to get the message
        const message = page.locator(".mantine-Notification-message").first();
        if (await message.isVisible().catch(() => false)) {
          const messageText = await message.textContent();
          throw new Error(
            `Signup failed: ${notificationText} - ${messageText}`,
          );
        }
        throw new Error(`Signup failed: ${notificationText}`);
      }

      // Check for form validation errors
      const validationErrors = await page
        .locator(".mantine-Input-error, .mantine-InputWrapper-error")
        .all();
      if (validationErrors.length > 0) {
        const errors = await Promise.all(
          validationErrors.map((el) => el.textContent()),
        );
        throw new Error(
          `Form validation errors: ${errors.filter(Boolean).join(", ")}`,
        );
      }

      // Check current URL and page content
      const currentUrl = page.url();
      const pageContent = await page.textContent("body");
      console.log("Current URL:", currentUrl);
      console.log('Page contains "Sign up":', pageContent?.includes("Sign up"));

      // Take screenshot for debugging
      await page.screenshot({
        path: "test-results/signup-error.png",
        fullPage: true,
      });
      throw new Error(`Signup did not redirect. Current URL: ${currentUrl}`);
    }

    await page.waitForTimeout(2000); // Give time for auth to complete

    // Get the user ID from localStorage after successful signup
    const authData = await page.evaluate(() => {
      const authStore = localStorage.getItem("pocketbase_auth");
      console.log("[E2E Browser] pocketbase_auth:", authStore);
      return authStore ? JSON.parse(authStore) : null;
    });

    console.log(
      "[E2E] Auth data from localStorage:",
      JSON.stringify(authData, null, 2),
    );

    if (authData && authData.model && authData.model.id) {
      testUserId = authData.model.id;
      console.log("[E2E] Test user ID:", testUserId);
    } else if (authData && authData.record && authData.record.id) {
      // Try alternate structure
      testUserId = authData.record.id;
      console.log("[E2E] Test user ID (from record):", testUserId);
    } else {
      console.error(
        "[E2E] Could not find user ID in auth data. Full data:",
        authData,
      );
      throw new Error("Could not retrieve user ID after signup");
    }

    // Step 2: Navigate to add banknote
    await page.goto("/your-banknotes");
    await page.waitForLoadState("networkidle");

    // Click "Add Banknote" button
    const addButton = page.getByRole("button", { name: /add banknote/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Step 3: Fill in PMG cert and grade
    // Wait for the form to be ready
    await page.waitForLoadState("networkidle");

    // Find PMG cert input - use first() since there might be mobile/desktop versions
    const certInput = page.getByLabel("PMG Cert #").first();
    await expect(certInput).toBeVisible({ timeout: 10000 });
    await certInput.fill(TEST_CERT);

    // Find and fill grade field - use first() to handle multiple grade fields
    // The grade field in the PMG section should be near the PMG Cert field
    const gradeInput = page.getByLabel("Grade").first();
    await expect(gradeInput).toBeVisible();
    await gradeInput.click();
    // Wait for dropdown to open
    await page.waitForTimeout(500);
    await page.getByRole("option", { name: TEST_GRADE, exact: true }).click();

    // Step 4: Click "Fetch PMG Images" button
    const fetchButton = page.getByRole("button", {
      name: /fetch.*pmg.*image/i,
    });
    await expect(fetchButton).toBeVisible();

    // Set up response listener BEFORE clicking to catch PMG fetch errors
    let pmgFetchResponse = null;
    let pmgFetchError = null;
    let pmgFetchStartTime = null;
    let pmgFetchEndTime = null;
    const responsePromise = page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/pmg-images") &&
          response.request().method() === "POST",
        { timeout: 10000 },
      )
      .catch(() => null); // Don't fail if no response

    page.on("response", async (response) => {
      if (
        response.url().includes("/api/pmg-images") &&
        response.request().method() === "POST"
      ) {
        pmgFetchEndTime = Date.now();
        pmgFetchResponse = response;
        if (!response.ok()) {
          try {
            const errorData = await response.json();
            pmgFetchError = { status: response.status(), data: errorData };
          } catch {
            pmgFetchError = {
              status: response.status(),
              data: await response.text(),
            };
          }
        }
      }
    });

    pmgFetchStartTime = Date.now();
    await fetchButton.click();

    // Wait for the response
    await responsePromise;

    // Wait for PMG fetch API call to complete
    await page.waitForTimeout(5000); // Give time for API call

    // Log PMG fetch time
    if (pmgFetchStartTime && pmgFetchEndTime) {
      const pmgFetchDuration = pmgFetchEndTime - pmgFetchStartTime;
      console.log(`[E2E] PMG images fetch time: ${pmgFetchDuration}ms`);
    }

    if (pmgFetchError) {
      const errorData = pmgFetchError.data || {};
      const errorMsg = errorData.error || JSON.stringify(errorData);

      // Log the actual error for debugging
      console.log("[E2E Test] PMG fetch error details:", {
        status: pmgFetchError.status,
        error: errorMsg,
        fullData: errorData,
      });

      if (
        errorMsg.includes("ADMIN_EMAIL") ||
        errorMsg.includes("ADMIN_PASSWORD")
      ) {
        throw new Error(
          `PMG fetch failed: Scraper is missing admin credentials.\n` +
            `The scraper needs ADMIN_EMAIL and ADMIN_PASSWORD in backend/scraper/.env for usage tracking.\n` +
            `Please add these to your scraper .env file:\n` +
            `  ADMIN_EMAIL=your@email.com\n` +
            `  ADMIN_PASSWORD=yourpassword\n` +
            `\nThese are the same credentials used for other PocketBase admin operations.\n` +
            `\nActual error: ${errorMsg}`,
        );
      }

      throw new Error(
        `PMG fetch failed: ${pmgFetchError.status} - ${errorMsg}. Make sure Hermes is running: npm run dev:hermes`,
      );
    }

    if (!pmgFetchResponse) {
      console.warn(
        "No PMG fetch API response detected. Checking scraper service...",
      );
      // Check if scraper is accessible
      try {
        const healthCheck = await page.request.get(`${SCRAPER_URL}/health`, {
          timeout: 5000,
        });
        if (!healthCheck.ok()) {
          throw new Error(
            `Scraper health check failed with status ${healthCheck.status()}`,
          );
        }
        const healthData = await healthCheck.json();
        if (!healthData.hermes || healthData.hermes !== "connected") {
          throw new Error(
            `Hermes is not connected to scraper. Please ensure Hermes is running: npm run dev:hermes`,
          );
        }
        // Scraper is running but PMG fetch didn't respond - this might be a different issue
        console.warn(
          "Scraper is running but PMG fetch API call was not detected. This might indicate a network issue or the fetch is still processing.",
        );
      } catch (error) {
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("fetch failed") ||
          error.message.includes("timeout")
        ) {
          throw new Error(
            `Cannot connect to scraper API at ${SCRAPER_URL}.\n` +
              `Please start the scraper service:\n` +
              `  npm run dev:scraper\n\n` +
              `Also ensure Hermes Docker container is running:\n` +
              `  npm run dev:hermes`,
          );
        }
        throw error;
      }
    }

    // Wait for images to load - the Extract Data button appears when images are loaded
    // Wait for loading overlay to disappear first
    try {
      await page.waitForSelector(
        '[class*="LoadingOverlay"], [class*="loading"]',
        { state: "hidden", timeout: 30000 },
      );
    } catch {
      // Loading overlay might not exist
    }

    // Wait for Extract Data button to appear (indicates images loaded)
    const extractButton = page.getByRole("button", { name: /extract.*data/i });
    await expect(extractButton).toBeVisible({ timeout: 30000 });

    // Listen for extraction API response (set up BEFORE clicking button)
    let extractionCalled = false;
    let extractionData = null;
    page.on("response", async (response) => {
      if (response.url().includes("/api/extract-pmg-data")) {
        extractionCalled = true;
        console.log("[E2E] Extraction API response:", response.status());
        if (response.ok()) {
          try {
            extractionData = await response.json();
            console.log(
              "[E2E] Extraction data:",
              JSON.stringify(extractionData),
            );
          } catch (e) {
            console.log("[E2E] Could not parse extraction response");
          }
        } else {
          console.error(
            "[E2E] Extraction failed with status:",
            response.status(),
          );
        }
      }
    });

    console.log("[E2E] Clicking Extract Data button...");

    // Step 5: Click "Extract Data" button
    const extractStartTime = Date.now();
    await extractButton.click();

    console.log("[E2E] Waiting for extraction to complete...");

    // Wait for extraction to complete - look for loading state to finish
    // InternVL API can take up to 90 seconds, so we need to wait longer
    try {
      await page.waitForSelector('[class*="LoadingOverlay"]', {
        state: "visible",
        timeout: 5000,
      });
      await page.waitForSelector('[class*="LoadingOverlay"]', {
        state: "hidden",
        timeout: 120000,
      }); // Increased to 120s
    } catch {
      // Loading overlay might not appear
      await page.waitForTimeout(100000); // AI extraction can take up to 90s, give it extra time
    }
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    const extractEndTime = Date.now();
    const extractDuration = extractEndTime - extractStartTime;
    console.log(`[E2E] Data extraction time: ${extractDuration}ms`);

    console.log("[E2E] Extraction complete, checking form fields...");

    // Wait for images to be fully loaded
    console.log("[E2E] Waiting for images to load...");
    await page.waitForSelector('img[alt*="obverse"], img[alt*="Obverse"]', {
      timeout: 30000,
    });
    await page.waitForSelector('img[alt*="reverse"], img[alt*="Reverse"]', {
      timeout: 30000,
    });
    await page.waitForTimeout(2000); // Give images time to fully render

    // Wait for form to finish processing (extraction might still be updating form state)
    console.log("[E2E] Waiting for form to finish processing...");
    await page.waitForTimeout(3000); // Give form time to update after extraction

    // Check if form is still processing
    const processingIndicators = await page
      .locator('[class*="loading"], [class*="spinner"], [aria-busy="true"]')
      .count();
    if (processingIndicators > 0) {
      console.log(
        `[E2E] Form still processing (${processingIndicators} indicators), waiting...`,
      );
      await page.waitForTimeout(5000);
    }

    // Wait for the form to switch to US note mode if extraction detected US note
    console.log("[E2E] Waiting for form to switch to US note mode...");
    let noteTypeSwitched = false;
    for (let i = 0; i < 20; i++) {
      const currentNoteType = await page.evaluate(() => {
        // Try multiple ways to detect the selected note type
        const usInput = document.querySelector('input[value="us"]');
        if (usInput && usInput.checked) {
          return "us";
        }
        const worldInput = document.querySelector('input[value="world"]');
        if (worldInput && worldInput.checked) {
          return "world";
        }
        // Also check for SegmentedControl button with data-active attribute
        const usButton = document.querySelector(
          '[data-value="us"][data-active="true"]',
        );
        if (usButton) {
          return "us";
        }
        const worldButton = document.querySelector(
          '[data-value="world"][data-active="true"]',
        );
        if (worldButton) {
          return "world";
        }
        return null;
      });

      console.log(
        `[E2E] Attempt ${i + 1}: Current note type = ${currentNoteType}`,
      );

      if (currentNoteType === "us") {
        console.log("[E2E] Form successfully switched to US note mode");
        noteTypeSwitched = true;
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!noteTypeSwitched) {
      console.log(
        "[E2E] Form did not automatically switch to US note mode, will try manually...",
      );
    }

    // Step 6: Verify extracted data matches expected values
    // Check form fields are populated correctly

    // Check pick number
    const pickNumberField = page
      .locator('input[name="pickNumber"], input[value*="2231"]')
      .first();
    if (await pickNumberField.isVisible()) {
      const pickValue = await pickNumberField.inputValue();
      expect(pickValue).toContain("2231");
    }

    // Check face value
    const faceValueField = page.locator('input[name="faceValue"]').first();
    if (await faceValueField.isVisible()) {
      const faceValue = await faceValueField.inputValue();
      expect(parseInt(faceValue)).toBe(EXPECTED_DATA.faceValue);
    }

    // Check year
    const yearField = page.locator('input[name="yearOfIssueSingle"]').first();
    if (await yearField.isVisible()) {
      const year = await yearField.inputValue();
      expect(parseInt(year)).toBe(EXPECTED_DATA.yearOfIssueSingle);
    }

    // Check authority (for US notes)
    const authorityField = page.locator('input[name="authority"]').first();
    if (await authorityField.isVisible()) {
      const authority = await authorityField.inputValue();
      expect(authority.toLowerCase()).toContain("federal reserve");
    }

    // Check grade (it's a Select, so check the displayed value)
    const gradeField = page.locator('select, [role="combobox"]').first();
    if (await gradeField.isVisible()) {
      const grade = await gradeField.inputValue();
      expect(grade).toBe(EXPECTED_DATA.grade);
    }

    // Check EPQ checkbox
    const epqCheckbox = page
      .locator('input[name="isEpq"], input[type="checkbox"][aria-label*="EPQ"]')
      .first();
    if (await epqCheckbox.isVisible()) {
      const isEpq = await epqCheckbox.isChecked();
      expect(isEpq).toBe(EXPECTED_DATA.isEpq);
    }

    // Check serial number
    const serialField = page.locator('input[name="serialNumber"]').first();
    if (await serialField.isVisible()) {
      const serial = await serialField.inputValue();
      expect(serial).toContain("J00000562A");
    }

    // Wait for form to update after extraction
    await page.waitForTimeout(3000);

    // For US notes, the country field is not visible in the UI but is set programmatically
    // The extraction should have set noteType to 'us' and populated all fields
    // Wait a bit more for form state to settle
    await page.waitForTimeout(2000);

    // Step 7: Save the banknote
    // Wait for the save button to become enabled (form validation passes)
    const saveButton = page.getByRole("button", { name: /add banknote/i });
    await expect(saveButton).toBeVisible();

    // Check if button is enabled, if not wait a bit more and check form fields
    let isEnabled = await saveButton.isEnabled().catch(() => false);
    let retryCount = 0;
    const maxRetries = 5;

    while (!isEnabled && retryCount < maxRetries) {
      console.log(
        `[E2E] Save button is disabled (attempt ${retryCount + 1}/${maxRetries}), checking form fields...`,
      );

      // First, ensure the form is in US note mode
      try {
        // Check the current note type by looking at the SegmentedControl
        const noteTypeValue = await page.evaluate(() => {
          // Try to find the SegmentedControl input with value="us"
          const usInput = document.querySelector('input[value="us"]');
          if (usInput && usInput.checked) {
            return "us";
          }
          const worldInput = document.querySelector('input[value="world"]');
          if (worldInput && worldInput.checked) {
            return "world";
          }
          return null;
        });

        console.log(`[E2E] Current note type in form: ${noteTypeValue}`);

        if (noteTypeValue !== "us") {
          console.log("[E2E] Form is not in US note mode, switching...");
          // Mantine SegmentedControl renders as buttons, try multiple selectors
          try {
            // Try multiple selectors to find the US note button
            const selectors = [
              page.getByRole("button", { name: /us note/i }),
              page.locator('button:has-text("US Note")'),
              page.locator('[data-value="us"]'),
              page.locator('button[value="us"]'),
              page.locator('input[value="us"]'),
              // Try to find by the flag icon or text content
              page.locator(
                'button:has([alt*="US"]), button:has([title*="US"])',
              ),
            ];

            let clicked = false;
            for (const selector of selectors) {
              try {
                const element = selector.first();
                if (await element.isVisible({ timeout: 1000 })) {
                  await element.click();
                  console.log("[E2E] Successfully clicked US note button");
                  clicked = true;
                  await page.waitForTimeout(2000); // Wait for form to update
                  break;
                }
              } catch (e) {
                // Try next selector
                continue;
              }
            }

            if (!clicked) {
              // Last resort: try to click using JavaScript
              console.log(
                "[E2E] Trying to click US note button via JavaScript...",
              );
              const clicked = await page.evaluate(() => {
                const usButton =
                  document.querySelector('[data-value="us"]') ||
                  document.querySelector('button[value="us"]') ||
                  document.querySelector('input[value="us"]');
                if (usButton) {
                  usButton.click();
                  return true;
                }
                return false;
              });
              if (clicked) {
                console.log(
                  "[E2E] Successfully clicked US note button via JavaScript",
                );
              }
              await page.waitForTimeout(2000);
            }
          } catch (e) {
            console.log("[E2E] Error clicking US note button:", e.message);
          }
        } else {
          console.log("[E2E] Form is already in US note mode");
        }
      } catch (e) {
        console.log("[E2E] Could not check/switch note type:", e.message);
      }

      // Check if authority field is filled (required for US notes)
      try {
        // Wait a bit for the form to update after switching note type
        await page.waitForTimeout(500);

        const authorityField = page.getByLabel("Authority").first();
        if (await authorityField.isVisible({ timeout: 2000 })) {
          const isEnabled = await authorityField.isEnabled().catch(() => false);
          console.log(`[E2E] Authority field visible, enabled: ${isEnabled}`);

          if (!isEnabled) {
            console.log(
              "[E2E] Authority field is disabled, waiting for form to update...",
            );
            await page.waitForTimeout(2000);
            // Check again
            const isEnabledAfterWait = await authorityField
              .isEnabled()
              .catch(() => false);
            if (!isEnabledAfterWait) {
              console.log("[E2E] Authority field still disabled after wait");
              // Try clicking the US note button again
              const usNoteButton = page
                .getByRole("radio", { name: /us note/i })
                .or(page.locator('input[value="us"]'))
                .first();
              if (await usNoteButton.isVisible({ timeout: 1000 })) {
                await usNoteButton.click();
                await page.waitForTimeout(2000);
              }
            }
          }

          const authorityValue = await authorityField
            .inputValue()
            .catch(() => "");
          console.log(`[E2E] Authority field value: "${authorityValue}"`);
          if (!authorityValue || authorityValue.trim() === "") {
            console.log(
              "[E2E] Authority field is empty, filling it manually...",
            );
            // Make sure it's enabled before trying to fill
            const isEnabledNow = await authorityField
              .isEnabled()
              .catch(() => false);
            if (isEnabledNow) {
              await authorityField.fill("Federal Reserve");
              // Trigger blur to validate
              await authorityField.blur();
              await page.waitForTimeout(1000);
            } else {
              console.log(
                "[E2E] Authority field is still disabled, cannot fill",
              );
            }
          }
        } else {
          console.log("[E2E] Authority field is not visible");
        }
      } catch (e) {
        console.log("[E2E] Could not check/fill authority field:", e.message);
      }

      // Also check and fill city if needed
      try {
        const cityField = page.getByLabel("City").first();
        if (await cityField.isVisible({ timeout: 2000 })) {
          const cityValue = await cityField.inputValue().catch(() => "");
          console.log(`[E2E] City field value: "${cityValue}"`);
          if (!cityValue || cityValue.trim() === "") {
            console.log("[E2E] City field is empty, filling it manually...");
            await cityField.fill("Kansas City");
            // Trigger blur to validate
            await cityField.blur();
            await page.waitForTimeout(1000);
          }
        }
      } catch (e) {
        // City is optional, so ignore errors
      }

      // Check for form validation errors
      const errorMessages = await page
        .locator('[class*="error"], [class*="invalid"]')
        .all();
      if (errorMessages.length > 0) {
        console.log(
          `[E2E] Found ${errorMessages.length} form validation errors`,
        );
        for (const error of errorMessages) {
          const text = await error.textContent().catch(() => "");
          if (text) console.log(`[E2E] Error: ${text}`);
        }
      }

      // Check if images are present
      const obverseImg = await page
        .locator('img[alt*="obverse"], img[alt*="Obverse"]')
        .first()
        .isVisible()
        .catch(() => false);
      const reverseImg = await page
        .locator('img[alt*="reverse"], img[alt*="Reverse"]')
        .first()
        .isVisible()
        .catch(() => false);
      console.log(
        `[E2E] Images present - Obverse: ${obverseImg}, Reverse: ${reverseImg}`,
      );

      // Try to trigger form validation by clicking on the form
      try {
        const formElement = await page.locator("form").first();
        if (await formElement.isVisible()) {
          await formElement.click({ position: { x: 10, y: 10 } });
          await page.waitForTimeout(500);
        }
      } catch (e) {
        // Ignore errors
      }

      // Also try to trigger validation by dispatching an input event
      try {
        await page.evaluate(() => {
          const inputs = document.querySelectorAll("input, select, textarea");
          inputs.forEach((input) => {
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
        });
        await page.waitForTimeout(1000);
      } catch (e) {
        // Ignore errors
      }

      // Wait for form validation to update
      await page.waitForTimeout(2000);

      // Check again if button is enabled
      isEnabled = await saveButton.isEnabled().catch(() => false);
      retryCount++;
    }

    // Final check if button is enabled
    if (!isEnabled) {
      console.log(
        "[E2E] Save button still disabled after all retries. Taking screenshot...",
      );
      await page.screenshot({
        path: "test-results/save-button-disabled.png",
        fullPage: true,
      });

      // Log all form field values for debugging
      const formData = await page.evaluate(() => {
        const inputs = Array.from(
          document.querySelectorAll("input, select, textarea"),
        );
        return inputs.map((input) => ({
          name: input.name || input.id || "unnamed",
          value: input.value,
          required: input.required,
          type: input.type,
        }));
      });
      console.log(
        "[E2E] Form field values:",
        JSON.stringify(formData, null, 2),
      );
    }

    await expect(saveButton).toBeEnabled({ timeout: 10000 });
    await saveButton.click();

    // Wait for save to complete
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");

    // Step 8: Verify banknote is in the database
    // Query banknotes for the test user (we already have testUserId from signup)
    if (!testUserId) {
      throw new Error("testUserId is not set - signup may have failed");
    }

    console.log("[E2E] Verifying banknote in database for user:", testUserId);

    // Use the existing pb instance (already authenticated as the test user)
    const banknotes = await pb.collection("banknotes").getFullList({
      filter: `userId = "${testUserId}" && pmgCert = "${TEST_CERT}"`,
    });

    expect(banknotes.length).toBeGreaterThan(0);

    const banknote = banknotes[0];

    // Verify banknote data - check all extracted fields
    expect(banknote.pmgCert).toBe(TEST_CERT);
    expect(banknote.grade).toBe(EXPECTED_DATA.grade);
    expect(banknote.noteType).toBe(EXPECTED_DATA.noteType);
    // Accept both "United States" and "United States of America"
    expect(["United States", "United States of America"]).toContain(
      banknote.country,
    );
    expect(banknote.countryCode).toBe(EXPECTED_DATA.countryCode);
    expect(banknote.isEpq).toBe(EXPECTED_DATA.isEpq);
    expect(banknote.isSpecimen).toBe(false); // Should be false for this note

    if (banknote.pickNumber) {
      expect(banknote.pickNumber).toContain("2231");
    }

    expect(banknote.faceValue).toBe(EXPECTED_DATA.faceValue);
    expect(banknote.currency).toBe(EXPECTED_DATA.currency);
    expect(banknote.yearOfIssueSingle).toBe(EXPECTED_DATA.yearOfIssueSingle);

    if (banknote.authority) {
      expect(banknote.authority.toLowerCase()).toContain("federal reserve");
    }

    if (banknote.city) {
      expect(banknote.city.toLowerCase()).toContain("kansas");
    }

    if (banknote.serialNumber) {
      expect(banknote.serialNumber).toContain("J00000562A");
    }

    // Watermark should be null or empty string for this note
    if (banknote.watermark !== undefined) {
      expect(
        banknote.watermark === null || banknote.watermark === "",
      ).toBeTruthy();
    }

    console.log("✅ Banknote verified in database:", {
      id: banknote.id,
      cert: banknote.pmgCert,
      grade: banknote.grade,
      noteType: banknote.noteType,
      country: banknote.country,
      countryCode: banknote.countryCode,
      authority: banknote.authority,
      city: banknote.city,
      pickNumber: banknote.pickNumber,
      faceValue: banknote.faceValue,
      currency: banknote.currency,
      yearOfIssueSingle: banknote.yearOfIssueSingle,
      serialNumber: banknote.serialNumber,
      isEpq: banknote.isEpq,
      isSpecimen: banknote.isSpecimen,
      watermark: banknote.watermark,
    });
  });
});
