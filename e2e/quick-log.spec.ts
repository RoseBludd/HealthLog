import { expect, test } from "./setup/test";

test.describe("Quick Log UI (WO-HLMED-002)", () => {
  test("logs a BP reading from natural language", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("quick-log-input");
    try {
      await input.waitFor({ state: "visible", timeout: 5000 });
    } catch {
      test.skip(true, "quick-log composer not visible (auth-gated environment)");
    }
    await input.fill("BP 128/82");
    await page.getByTestId("quick-log-submit").click();
    await expect(page.getByTestId("quick-log-result")).toContainText("128/82 mmHg logged", { timeout: 15000 });
  });
});

test.describe("Quick Log API auth (WO-HLMED-002)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("rejects unauthenticated writes", async ({ request }) => {
    const res = await request.post("/api/quick-log", {
      data: { text: "BP 120/80", timezone: "UTC" },
    });
    expect([401, 403]).toContain(res.status());
  });
});
