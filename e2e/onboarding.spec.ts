import { test, expect } from "@playwright/test";

test("onboarding start renders", async ({ page }) => {
  await page.goto("/start");
  await expect(page.getByRole("heading", { name: "What are you selling?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
});
