import { describe, it, expect } from 'bun:test';

// TODO: Phase 3 -- Requires:
// 1. Fix tauri.conf.json build issue (invalid type error)
// 2. Build desktop app: bun run --filter @frag-note/desktop tauri:build
// 3. Start tauri-driver: ~/.cargo/bin/tauri-driver.exe (port 4444)
// 4. Install selenium-webdriver: bun add -d selenium-webdriver @types/selenium-webdriver
// 5. Remove .skip() from tests
//
// See tests/e2e/setup/webdriver-client.ts for the WebDriver helper.

describe('E2E: Fragment Capture — Screenshot (Native)', () => {
  it.skip('triggers screenshot overlay via Alt+Shift+S', async () => {
    // Setup: createTauriDriver(appBinaryPath)
    // Action: driver.sendKeys(Key.ALT, Key.SHIFT, 's')
    // Assert: screenshot overlay window appears
    // Verify: overlay has drag-selection canvas
    expect(true).toBe(true);
  });

  it.skip('captures region screenshot via drag-select', async () => {
    // Setup: trigger overlay, get canvas element
    // Action: drag from (100,100) to (400,300) on canvas
    // Assert: screenshot saved as fragment
    // Verify: asset uploaded to Supabase storage
    // Verify: fragment has sourceType='screenshot'
    expect(true).toBe(true);
  });

  it.skip('processes screenshot with OCR', async () => {
    // Prereq: screenshot fragment created
    // Action: wait for worker processing
    // Assert: derived_artifacts has 'ocr' type
    // Verify: OCR content contains recognized text
    expect(true).toBe(true);
  });

  it.skip('cancels screenshot with Escape key', async () => {
    // Setup: trigger overlay
    // Action: press Escape
    // Assert: overlay closes
    // Verify: no fragment created
    expect(true).toBe(true);
  });
});
