import { test, expect } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: "Riplacer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Rip out your/i })).toBeVisible();
  await expect(page.getByText("Force Multiplier", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start Ripping/i }).first()).toBeVisible();
});
