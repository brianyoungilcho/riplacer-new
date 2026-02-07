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
  await page.getByRole("button", { name: "Start Ripping" }).click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});
