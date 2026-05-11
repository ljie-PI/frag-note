import { describe, it, expect } from 'bun:test';

// TODO: Phase 3 -- Requires:
// 1. Fix tauri.conf.json build issue (invalid type error)
// 2. Build desktop app: bun run --filter @frag-note/desktop tauri:build
// 3. Start tauri-driver: ~/.cargo/bin/tauri-driver.exe (port 4444)
// 4. Install selenium-webdriver: bun add -d selenium-webdriver @types/selenium-webdriver
// 5. Remove .skip() from tests
//
// See tests/e2e/setup/webdriver-client.ts for the WebDriver helper.

describe('E2E: Fragment Capture — Voice Recording (Native)', () => {
  it.skip('triggers voice recording via Alt+Shift+V', async () => {
    // Action: press Alt+Shift+V
    // Assert: quick-capture shows recording UI
    // Verify: recording indicator visible
    expect(true).toBe(true);
  });

  it.skip('records and saves voice fragment', async () => {
    // Setup: trigger recording
    // Action: wait 2 seconds, click stop, click save
    // Assert: fragment created with sourceType='voice'
    // Verify: asset uploaded to storage (audio file)
    expect(true).toBe(true);
  });

  it.skip('transcribes voice recording', async () => {
    // Prereq: voice fragment created
    // Action: wait for worker processing
    // Assert: derived_artifacts has 'transcript' type
    expect(true).toBe(true);
  });
});
