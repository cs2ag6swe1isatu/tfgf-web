# tests

This directory is reserved for automated testing suites.

Planned structure:
- `tests/unit/` for fast isolated logic/component tests
- `tests/system/` for end-to-end or integration workflows

Current starter utility:
- Session Summary visual page tester is implemented in `src/tests/pageTesters/sessionSummaryPageTester.ts` and can be launched directly in Electron for quick UI iteration.
