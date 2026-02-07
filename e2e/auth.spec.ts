import { test, expect } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to Riplacer" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with email" })).toBeVisible();
});
