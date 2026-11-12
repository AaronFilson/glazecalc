// The Angular unit tests' Vitest settings beyond angular.json's options (its test target names this
// file as runnerConfig).
//
// Each test has 15 seconds, not Vitest's 5. With coverage on, as CI runs them, the slowest (the famous
// glazes' solver, the offline copy's merges, the account page) take several seconds, and more on a
// slower machine; 15 still stops a test that hangs.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 15_000
  }
});
