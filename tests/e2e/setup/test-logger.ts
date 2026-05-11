import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

type LogEntry = {
  timestamp: string;
  level: string;
  step: string;
  detail?: unknown;
  durationMs?: number;
};

export class TestLogger {
  private entries: LogEntry[] = [];
  private stepStart: number | null = null;

  step(name: string, detail?: unknown) {
    const now = Date.now();
    if (this.stepStart !== null && this.entries.length > 0) {
      this.entries[this.entries.length - 1].durationMs = now - this.stepStart;
    }
    this.stepStart = now;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      step: name,
      detail,
    };
    this.entries.push(entry);
    console.log(`  [E2E] ${name}`, detail ? JSON.stringify(detail) : '');
  }

  toJSON() {
    return this.entries;
  }

  saveReport(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(this.entries, null, 2));
  }
}
