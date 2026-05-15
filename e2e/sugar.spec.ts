import { expect, test } from "@playwright/test";

test("SUGAR demo flow creates a day summary and accepts feedback", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "SUGAR" })).toBeVisible();
  await page.getByTestId("demo-sound").click();
  await page.getByTestId("dispense-candy").click();
  await page.getByTestId("return-candy").click();
  await page.getByTestId("unlock-reflection").click();
  await page.getByTestId("run-summary").click();
  await expect(page.getByTestId("open-candy")).toBeEnabled();
  await page.getByTestId("open-candy").click();

  await expect(page.getByTestId("summary-note")).toBeVisible();

  await page.getByTestId("feedback-text").fill("今天其實比較像是在整理自己。");
  await page.getByTestId("correct-summary").click();
  await expect(page.getByText("SUGAR 記住了這次修正。")).toBeVisible();
});
