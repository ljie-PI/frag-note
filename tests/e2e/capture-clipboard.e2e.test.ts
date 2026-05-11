import { describe, it, expect } from 'bun:test';

// TODO: Phase 3 -- Requires:
// 1. Fix tauri.conf.json build issue (invalid type error)
// 2. Build desktop app: bun run --filter @frag-note/desktop tauri:build
// 3. Start tauri-driver: ~/.cargo/bin/tauri-driver.exe (port 4444)
// 4. Install selenium-webdriver: bun add -d selenium-webdriver @types/selenium-webdriver
// 5. Remove .skip() from tests
//
// See tests/e2e/setup/webdriver-client.ts for the WebDriver helper.

describe('E2E: Fragment Capture — Clipboard Grab (Native)', () => {
  it.skip('grabs selected text via Alt+Shift+C', async () => {
    // Setup: open a text editor, select text
    // Action: press Alt+Shift+C
    // Assert: quick-capture window shows with selected text
    expect(true).toBe(true);
  });

  it.skip('saves grabbed text as fragment', async () => {
    // Prereq: text grabbed in quick-capture
    // Action: click save
    // Assert: fragment created with sourceType='text'
    // Verify: rawTextOptional contains grabbed text
    expect(true).toBe(true);
  });

  it.skip('shows accessibility permission toast on macOS', async () => {
    // Platform: macOS only
    // Setup: first launch without accessibility permission
    // Assert: toast with '需要辅助功能权限' appears
    // Action: click '去设置'
    // Assert: macOS accessibility settings open
    expect(true).toBe(true);
  });
});
