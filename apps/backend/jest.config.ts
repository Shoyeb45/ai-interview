/**
 eslint aaraha tha thats why added this
 */

import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  clearMocks: true,
  collectCoverage: true,

  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "node",

  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};

export default config;
