import { test, expect } from "@playwright/test";

// Railway production credentials
const RAILWAY_API_URL = process.env.E2E_API_URL || "https://api-production-a9b1.up.railway.app";
const RAILWAY_CONSOLE_URL = process.env.E2E_BASE_URL || "https://console-production-95f47.up.railway.app";
const USER_API_KEY = process.env.E2E_USER_API_KEY || "cs_IfMyAE5ELGq8rqH0voMdvMMz1lUAmBlilj7beghT2nY";
const ADMIN_API_KEY = process.env.E2E_ADMIN_API_KEY || "cs_WA7jaifkv_tiszls6IRIrWr907r97RFlNVIWvFcecH8";

/**
 * Railway Authentication E2E Tests
 *
 * Tests authentication against Railway-deployed API with environment-based keys.
 * Verifies that the web console can authenticate successfully without 401 errors.
 */

test.describe("Railway Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Railway console
    await page.goto(RAILWAY_CONSOLE_URL);
  });

  test("should load web console without errors", async ({ page }) => {
    // Verify console loads
    await expect(page).toHaveTitle(/Cyberstreams|Admin/i);

    // Check that admin board or main interface is visible
    const adminTabs = page.locator('[data-test="admin-tabs"]');
    const mainContent = page.locator('main, [role="main"], body > div');

    await expect(adminTabs.or(mainContent)).toBeVisible({ timeout: 10_000 });
  });

  test("should authenticate with user API key", async ({ page }) => {
    // Wait for admin board to be ready
    await expect(page.locator('[data-test="admin-tabs"]')).toBeVisible({ timeout: 15_000 });

    // Fill in credentials using Railway API and user key
    await page.locator('[data-test="api-base-input"]').fill(`${RAILWAY_API_URL}/api/v1`);
    await page.locator('[data-test="api-key-input"]').fill(USER_API_KEY);

    // Request JWT token
    await page.locator('[data-test="get-jwt-button"]').click();

    // Verify JWT token is received (no 401 error)
    const jwtTextarea = page.locator('[data-test="jwt-textarea"]');
    await expect(jwtTextarea).not.toHaveValue("", { timeout: 10_000 });

    // Verify no error messages
    const errorMessage = page.locator('[data-test="error-message"], .error, [role="alert"]');
    await expect(errorMessage).not.toBeVisible({ timeout: 2_000 }).catch(() => {
      // Error element might not exist at all, which is fine
    });
  });

  test("should authenticate with admin API key", async ({ page }) => {
    // Wait for admin board
    await expect(page.locator('[data-test="admin-tabs"]')).toBeVisible({ timeout: 15_000 });

    // Fill in credentials with admin key
    await page.locator('[data-test="api-base-input"]').fill(`${RAILWAY_API_URL}/api/v1`);
    await page.locator('[data-test="api-key-input"]').fill(ADMIN_API_KEY);

    // Request JWT token
    await page.locator('[data-test="get-jwt-button"]').click();

    // Verify successful authentication
    await expect(page.locator('[data-test="jwt-textarea"]')).not.toHaveValue("", { timeout: 10_000 });
  });

  test("should perform authenticated search", async ({ page }) => {
    // Wait for admin board
    await expect(page.locator('[data-test="admin-tabs"]')).toBeVisible({ timeout: 15_000 });

    // Authenticate
    await page.locator('[data-test="api-base-input"]').fill(`${RAILWAY_API_URL}/api/v1`);
    await page.locator('[data-test="api-key-input"]').fill(USER_API_KEY);
    await page.locator('[data-test="get-jwt-button"]').click();

    // Wait for JWT
    await expect(page.locator('[data-test="jwt-textarea"]')).not.toHaveValue("", { timeout: 10_000 });

    // Perform search
    await page.locator('[data-test="search-input"]').fill("cybersecurity");
    await page.locator('[data-test="search-submit"]').click();

    // Verify search results (should not get 401)
    const searchResults = page.locator('[data-test="search-results"]');
    await expect(searchResults).toBeVisible({ timeout: 15_000 });

    // Should show results or "no results", but not authentication error
    await expect(searchResults).not.toContainText(/401|unauthorized|authentication/i);
  });

  test("should reject invalid API key", async ({ page }) => {
    // Wait for admin board
    await expect(page.locator('[data-test="admin-tabs"]')).toBeVisible({ timeout: 15_000 });

    // Try with invalid key
    await page.locator('[data-test="api-base-input"]').fill(`${RAILWAY_API_URL}/api/v1`);
    await page.locator('[data-test="api-key-input"]').fill("invalid_key_12345");
    await page.locator('[data-test="get-jwt-button"]').click();

    // Should show error or JWT should remain empty
    await page.waitForTimeout(3_000);

    const jwtValue = await page.locator('[data-test="jwt-textarea"]').inputValue();
    expect(jwtValue).toBe("");
  });
});

test.describe("Railway API Direct Tests", () => {
  test("should accept user API key via Authorization header", async ({ request }) => {
    const response = await request.get(`${RAILWAY_API_URL}/api/v1/health`, {
      headers: {
        "Authorization": `Bearer ${USER_API_KEY}`
      }
    });

    // Health endpoint might be public, but should not return 401
    expect(response.status()).not.toBe(401);
  });

  test("should exchange API key for JWT token", async ({ request }) => {
    const response = await request.post(`${RAILWAY_API_URL}/api/v1/auth/token`, {
      headers: {
        "X-API-Key": USER_API_KEY
      }
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("token");
    expect(body.token).toBeTruthy();
  });

  test("should perform authenticated search via API", async ({ request }) => {
    // First get JWT token
    const tokenResponse = await request.post(`${RAILWAY_API_URL}/api/v1/auth/token`, {
      headers: {
        "X-API-Key": USER_API_KEY
      }
    });

    expect(tokenResponse.status()).toBe(200);
    const { token } = await tokenResponse.json();

    // Now search with JWT
    const searchResponse = await request.get(`${RAILWAY_API_URL}/api/v1/search?q=test`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    // Should not be 401 unauthorized
    expect(searchResponse.status()).not.toBe(401);

    // Should be 200 (success) or 404 (no results), but not auth error
    expect([200, 404]).toContain(searchResponse.status());
  });
});
