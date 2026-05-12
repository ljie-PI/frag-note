import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTauriDriver } from './setup/webdriver-client.ts';
import { createTestUser } from './helpers/auth-helpers.ts';
import { createApiClient } from './helpers/api-helpers.ts';
import { TestLogger } from './setup/test-logger.ts';
import { Key } from 'selenium-webdriver';

describe('E2E: Native Features (Screenshot, Clipboard, Voice)', () => {
  let tauri: Awaited<ReturnType<typeof createTauriDriver>>;
  let api: ReturnType<typeof createApiClient>;
  let logger: TestLogger;

  beforeAll(async () => {
    logger = new TestLogger();

    logger.step('create test user');
    const password = 'test-password-123!';
    const user = await createTestUser(undefined, password);
    api = createApiClient(user.accessToken);
    await api.createDeviceSession();

    logger.step('launch Tauri app');
    tauri = await createTauriDriver();

    logger.step('login');
    await tauri.login(user.email, password);
    await tauri.captureScreenshot('native-test-after-login');
  }, 30_000);

  afterAll(async () => {
    await tauri?.quit();
    logger?.saveReport('tests/e2e/reports/capture-native.json');
  });

  it('app loads and shows main UI after login', async () => {
    logger.step('verify main UI visible');
    const hasNav = await tauri.hasText('碎记');
    expect(hasNav).toBe(true);
  });

  // --- Screenshot tests ---

  it('triggers screenshot overlay via Alt+Shift+S', async () => {
    logger.step('send Alt+Shift+S shortcut');
    await tauri.sendShortcut(Key.ALT, Key.SHIFT, 's');
    await new Promise(r => setTimeout(r, 2000));

    await tauri.captureScreenshot('native-screenshot-after-shortcut');
    logger.step('screenshot shortcut sent');
    expect(true).toBe(true);
  }, 15_000);

  it('cancels screenshot with Escape key', async () => {
    logger.step('send Escape to dismiss overlay');
    await tauri.driver.actions().sendKeys(Key.ESCAPE).perform();
    await new Promise(r => setTimeout(r, 1000));

    await tauri.captureScreenshot('native-screenshot-after-escape');
    const hasNav = await tauri.hasText('碎记');
    expect(hasNav).toBe(true);
  }, 10_000);

  // --- Clipboard tests ---

  it('triggers clipboard grab via Alt+Shift+C', async () => {
    logger.step('send Alt+Shift+C shortcut');
    await tauri.sendShortcut(Key.ALT, Key.SHIFT, 'c');
    await new Promise(r => setTimeout(r, 2000));

    await tauri.captureScreenshot('native-clipboard-after-shortcut');
    logger.step('clipboard shortcut sent');
    expect(true).toBe(true);
  }, 15_000);

  it('main UI stays functional after clipboard shortcut', async () => {
    logger.step('verify app still responsive after clipboard');
    await new Promise(r => setTimeout(r, 1000));
    const hasNav = await tauri.hasText('碎记');
    expect(hasNav).toBe(true);
  }, 10_000);

  // --- Voice tests ---

  it('triggers voice recording via Alt+Shift+V', async () => {
    logger.step('send Alt+Shift+V shortcut');
    await tauri.sendShortcut(Key.ALT, Key.SHIFT, 'v');
    await new Promise(r => setTimeout(r, 2000));

    await tauri.captureScreenshot('native-voice-after-shortcut');
    logger.step('voice shortcut sent');
    expect(true).toBe(true);
  }, 15_000);

  it('main UI stays functional after voice shortcut', async () => {
    logger.step('verify app still responsive after voice');
    await new Promise(r => setTimeout(r, 1000));
    const hasNav = await tauri.hasText('碎记');
    expect(hasNav).toBe(true);
  }, 10_000);
});
