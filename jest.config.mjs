/** @returns {Promise<import('jest').Config>} */
export default async function () {
  return {
    roots: ["tests"],
    testMatch: ["./**/*.[mc]js"],
    collectCoverageFrom: ["./**/*.[mc]js"],
    forceCoverageMatch: ["./**/*.[mc]js"],
    collectCoverage: true,
    coverageDirectory: "./tests/",
    coverageProvider: "babel",
    coverageReporters: ["lcov", "text"],
  };
}