/** @returns {Promise<import('jest').Config>} */
export default async function () {
  return {
    roots: ["tests"],
    testMatch: ["**/*.[mc]js"],
  };
}