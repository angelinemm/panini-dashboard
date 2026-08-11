import { describe, expect, it } from "vitest";
import { getCountryFlag } from "./country-utils.js";

describe("getCountryFlag", () => {
  it("turns a sticker country code into a flag", () => {
    expect(getCountryFlag(" BEL ")).toBe("🇧🇪");
  });

  it("returns no flag for an absent or unknown country", () => {
    expect(getCountryFlag("")).toBe("");
    expect(getCountryFlag("UNKNOWN")).toBe("");
  });
});
