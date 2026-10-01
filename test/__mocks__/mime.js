// Minimal manual mock for the `mime` package, wired up in jest.config.js's
// moduleNameMapper. The real package is ESM-only in the installed version,
// which jest/ts-jest can't load directly; tests that pull in code using
// `mime.getType(...)` (e.g. src/utils/fileUtil.ts) need this stand-in.
module.exports = {
  getType: () => "application/octet-stream",
  getExtension: () => null,
};
