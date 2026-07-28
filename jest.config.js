module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^mime$": "<rootDir>/test/__mocks__/mime.js"
  }
};
