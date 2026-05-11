/**
 * WebDriver client wrapper for Tauri desktop app E2E testing.
 *
 * Placeholder -- requires tauri-driver running + built app binary.
 *   Start tauri-driver: tauri-driver (listens on port 4444)
 *   Then connect via selenium-webdriver
 *
 * TODO: Prerequisites before this can be used:
 * 1. Fix tauri.conf.json build issue (invalid type error)
 * 2. Build desktop app: bun run --filter @frag-note/desktop tauri:build
 * 3. Start tauri-driver: ~/.cargo/bin/tauri-driver.exe (port 4444)
 * 4. Install selenium-webdriver: bun add -d selenium-webdriver @types/selenium-webdriver
 */

export async function createTauriDriver(appBinaryPath: string) {
  // Dynamic import to avoid failing when selenium-webdriver isn't installed
  const { Builder, By, until } = await import('selenium-webdriver');

  const driver = await new Builder()
    .usingServer('http://localhost:4444')
    .withCapabilities({
      'tauri:options': { application: appBinaryPath },
    })
    .forBrowser('wry')
    .build();

  return {
    driver,
    By,
    until,

    async clickNav(key: string) {
      const btn = await driver.findElement(
        By.xpath(`//button[contains(., '${key}')]`),
      );
      await btn.click();
    },

    async fillInput(placeholder: string, value: string) {
      const input = await driver.findElement(
        By.css(
          `input[placeholder*="${placeholder}"], textarea[placeholder*="${placeholder}"]`,
        ),
      );
      await input.clear();
      await input.sendKeys(value);
    },

    async clickButton(text: string) {
      const btn = await driver.findElement(
        By.xpath(`//button[contains(., '${text}')]`),
      );
      await btn.click();
    },

    async waitForText(text: string, timeoutMs = 5000) {
      await driver.wait(
        until.elementLocated(By.xpath(`//*[contains(text(), '${text}')]`)),
        timeoutMs,
      );
    },

    async getText(selector: string) {
      const el = await driver.findElement(By.css(selector));
      return el.getText();
    },

    async sendKeys(...keys: string[]) {
      await driver.actions().sendKeys(...keys).perform();
    },

    async captureScreenshot(name: string) {
      const { writeFileSync, mkdirSync } = await import('node:fs');
      const { dirname } = await import('node:path');
      const screenshot = await driver.takeScreenshot();
      const screenshotPath = `tests/e2e/reports/screenshots/${name}.png`;
      mkdirSync(dirname(screenshotPath), { recursive: true });
      writeFileSync(screenshotPath, screenshot, 'base64');
    },

    async quit() {
      await driver.quit();
    },
  };
}
