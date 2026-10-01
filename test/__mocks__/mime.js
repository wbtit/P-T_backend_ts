// Minimal manual mock for the `mime` package, wired up in jest.config.js's
// moduleNameMapper. The real package is ESM-only in the installed version,
// which jest/ts-jest can't load directly. jest's moduleNameMapper matches by
// bare specifier ("mime"), so this intercepts EVERY require('mime') in the
// dependency tree under test — not just our own code (e.g. fileUtil.ts's
// mime.getType) but also nested deps that bundle their own copy, like
// superagent's require('mime') (used by supertest), which calls
// mime.define({...}) at module load time. Keep this a superset of whatever
// any such consumer needs, not just our direct usage.
module.exports = {
  getType: () => "application/octet-stream",
  getExtension: () => null,
  define: () => {},
};
