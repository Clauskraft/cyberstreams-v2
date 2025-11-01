import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";

test.describe("OSINT Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    const osintTab = page.locator('[data-test="admin-tabs"] button').filter({ hasText: "OSINT" });
    await osintTab.click();
  });

  test("renders default tools and allows searching", async ({ page }) => {
    const searchInput = page.locator('section.osint-panel input[type="search"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill("Shodan");
    await page.locator('section.osint-panel button[type="submit"]').click();

    const items = page.locator(".osint-panel__item");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("Shodan");
  });
});


