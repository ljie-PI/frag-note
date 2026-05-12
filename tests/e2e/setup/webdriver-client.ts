/**
 * WebDriver client wrapper for Tauri desktop app E2E testing.
 *
 * Requirements:
 * 1. Vite dev server running: bun run --filter @frag-note/desktop dev
 * 2. tauri-driver running: tauri-driver (port 4444)
 * 3. msedgedriver in PATH
 * 4. Desktop app built: cargo build (in apps/desktop/src-tauri/)
 */

import { Builder, By, Key, until } from 'selenium-webdriver';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const APP_BINARY = process.env.TAURI_APP_BINARY ??
  resolve('apps/desktop/src-tauri/target/debug/frag-note-desktop.exe');

export async function createTauriDriver() {
  const driver = await new Builder()
    .usingServer('http://127.0.0.1:4444')
    .withCapabilities({
      'ms:edgeOptions': {},
      'tauri:options': { application: APP_BINARY },
    })
    .forBrowser('MicrosoftEdge')
    .build();

  // Wait for app to load
  await driver.wait(async () => {
    const source = await driver.getPageSource();
    return source.includes('id="root"') || source.includes('碎记') || source.includes('登录');
  }, 10_000);

  return {
    driver,
    By,
    Key,
    until,

    async login(email: string, password: string) {
      // Fill email
      const emailInput = await driver.findElement(By.css('input[type="text"], input[autocomplete="username"]'));
      await emailInput.clear();
      await emailInput.sendKeys(email);

      // Fill password
      const pwInput = await driver.findElement(By.css('input[type="password"]'));
      await pwInput.clear();
      await pwInput.sendKeys(password);

      // Click login button
      const loginBtn = await driver.findElement(By.xpath('//button[contains(text(), "登录")]'));
      await loginBtn.click();

      // Wait for main UI to appear (sidebar with 碎记)
      await driver.wait(until.elementLocated(By.xpath('//nav')), 10_000);
    },

    async clickNav(label: string) {
      const btn = await driver.findElement(By.xpath(`//button[contains(., '${label}')]`));
      await btn.click();
      await new Promise(r => setTimeout(r, 500));
    },

    async fillInput(selector: string, value: string) {
      const input = await driver.findElement(By.css(selector));
      await input.clear();
      await input.sendKeys(value);
    },

    async fillTextarea(value: string) {
      const textarea = await driver.findElement(By.css('textarea'));
      await textarea.clear();
      await textarea.sendKeys(value);
    },

    async clickButton(text: string) {
      const btn = await driver.findElement(By.xpath(`//button[contains(., '${text}')]`));
      await btn.click();
    },

    async waitForText(text: string, timeoutMs = 5000) {
      await driver.wait(
        until.elementLocated(By.xpath(`//*[contains(text(), '${text}')]`)),
        timeoutMs,
      );
    },

    async hasText(text: string): Promise<boolean> {
      const source = await driver.getPageSource();
      return source.includes(text);
    },

    async getPageSource(): Promise<string> {
      return driver.getPageSource();
    },

    async sendShortcut(...keys: string[]) {
      const actions = driver.actions();
      for (const key of keys) {
        await actions.keyDown(key).perform();
      }
      await new Promise(r => setTimeout(r, 100));
      for (const key of keys.reverse()) {
        await actions.keyUp(key).perform();
      }
    },

    async captureScreenshot(name: string) {
      const screenshot = await driver.takeScreenshot();
      const screenshotPath = `tests/e2e/reports/screenshots/${name}.png`;
      mkdirSync(dirname(screenshotPath), { recursive: true });
      writeFileSync(screenshotPath, screenshot, 'base64');
      return screenshotPath;
    },

    async quit() {
      await driver.quit();
    },
  };
}
