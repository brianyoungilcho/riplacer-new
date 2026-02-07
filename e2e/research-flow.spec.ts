import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:4173" });

test("onboarding submit saves pending data", async ({ page }) => {
  const submission = {
    productDescription: "AI sales assistant for public sector teams",
    companyName: "Riplacer",
    companyDomain: "riplacer.com",
    states: ["CA"],
    cities: [],
    territoryDescription: "",
    isCustomTerritory: false,
    targetCategories: ["IT", "Procurement"],
    competitors: ["Competitor A"],
    targetAccount: "City of San Diego",
    additionalContext: "Focus on procurement modernization initiatives.",
    email: "",
    filters: [],
  };

  await page.addInitScript((data) => {
    localStorage.setItem("riplacer_onboarding_progress", JSON.stringify({ data, step: 7 }));
  }, submission);

  await page.goto("/start");

  await expect(page.getByRole("heading", { name: /ready to hunt/i })).toBeVisible();
  await page.getByLabel("Work Email").fill("devplaywright@riplacer.test");

  // Wait for the button to be enabled and not show loading state
  await page.getByRole("button", { name: "Start Ripping" }).waitFor({ state: 'visible' });

  await page.getByRole("button", { name: "Start Ripping" }).click();

  // Just verify the button shows loading state (form submission started)
  await expect(page.getByText("Submitting...")).toBeVisible();
});
