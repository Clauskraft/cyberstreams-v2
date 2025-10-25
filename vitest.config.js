import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.js"],
    exclude: ["node_modules"],
    reporter: ["verbose", "html"],
    outputFile: {
      html: "./coverage/test-report.html"
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    // Coverage config
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.test.js",
        "**/*.config.js"
      ],
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90
    }
  }
});
