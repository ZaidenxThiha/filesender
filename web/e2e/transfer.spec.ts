import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

test("validates a receive code without clearing it", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Receive code" });
  await input.fill("not-a-code");
  await page.getByRole("button", { name: /connect with receive code/i }).click();

  await expect(page.getByText(/four digits and three words/i)).toBeVisible();
  await expect(input).toHaveValue("not-a-code");
});

test("keeps the workspace compact and focuses one mobile panel", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    ),
  ).toBe(true);
  await expect(page.locator(".send-card")).toBeVisible();
  await expect(page.locator(".receive-card")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".send-card")).toBeVisible();
  await expect(page.locator(".receive-card")).toBeHidden();
  await page.getByRole("button", { name: "Receive files" }).click();
  await expect(page.locator(".send-card")).toBeHidden();
  await expect(page.locator(".receive-card")).toBeVisible();
});

test("transfers a file byte-for-byte between two browsers", async ({ browser }) => {
  const senderContext = await browser.newContext();
  const receiverContext = await browser.newContext({ acceptDownloads: true });
  const sender = await senderContext.newPage();
  const receiver = await receiverContext.newPage();
  const fixturePath = path.join(__dirname, "fixtures", "hello.txt");

  await Promise.all([sender.goto("/"), receiver.goto("/")]);
  await sender.getByLabel(/choose files/i).setInputFiles(fixturePath);
  const code = (await sender.locator(".generated-code").textContent())?.trim();
  expect(code).toMatch(/^[0-9]{4}(?:-[a-z]+){3}$/);

  await receiver.getByRole("textbox", { name: "Receive code" }).fill(code!);
  const downloadPromise = receiver.waitForEvent("download");
  await receiver.getByRole("button", { name: /connect with receive code/i }).click();
  await expect(receiver.getByRole("button", { name: /accept files/i })).toHaveCount(0);
  await expect(sender.getByRole("button", { name: /start sending/i })).toHaveCount(0);
  const download = await downloadPromise;
  const savedPath = await download.path();

  expect(await readFile(savedPath!)).toEqual(await readFile(fixturePath));
  await expect(sender.getByRole("heading", { name: /files delivered/i })).toBeVisible();
  await expect(receiver.getByRole("heading", { name: /download complete/i })).toBeVisible();

  await senderContext.close();
  await receiverContext.close();
});
