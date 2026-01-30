import { test, expect } from "@playwright/test";

test("auth page renders", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});
