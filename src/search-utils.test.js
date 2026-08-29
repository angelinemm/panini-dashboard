import { describe, expect, it } from "vitest";
import { searchCountries, searchStickersByName, searchTeams } from "./search-utils.js";

describe("searchStickersByName", () => {
  const albums = [
    {
      id: "tdf-2026",
      stickers: [
        { Name: "Tadej Pogačar" },
        { Name: "Jonas Vingegaard" },
      ],
    },
  ];

  it("matches a partial name without case or accent sensitivity", () => {
    expect(searchStickersByName(albums, "POGAC")).toHaveLength(1);
  });

  it("groups an exact sticker name across albums", () => {
    const results = searchStickersByName([
      ...albums,
      { id: "tdf-2025", stickers: [{ Name: "Tadej Pogačar" }] },
    ], "Tadej");

    expect(results).toHaveLength(1);
    expect(results[0].occurrences).toHaveLength(2);
  });

  it("returns no results for an empty query", () => {
    expect(searchStickersByName(albums, "  ")).toEqual([]);
  });
});

describe("searchCountries", () => {
  const albums = [{
    stickers: [
      { Country: "FRA", Name: "Paul Lapeira", Type: "Coureur" },
      { Country: "FRA", Name: "Juliette Labous", Type: "Coureuse" },
      { Country: "BEL", Name: "Wout van Aert", Type: "Coureur" },
      { Country: "FRA", Name: "Team France", Type: "Equipe" },
    ],
  }];
  const countryNames = { BEL: "Belgique", FRA: "France" };

  it("matches a translated country name without case sensitivity", () => {
    expect(searchCountries(albums, "france", countryNames)).toEqual([
      { country: "FRA", count: 2 },
    ]);
  });

  it("matches a country code and only counts rider stickers", () => {
    expect(searchCountries(albums, "FRA", countryNames)).toEqual([
      { country: "FRA", count: 2 },
    ]);
  });
});

describe("searchTeams", () => {
  const teams = [{
    id: "visma-lease-a-bike",
    name: "Visma–Lease a Bike",
    aliases: [
      { name: "JUMBO-VISMA", years: [2022] },
      { name: "TEAM VISMA | LEASE A BIKE", years: [2024] },
    ],
  }];
  const albums = [
    { year: 2022, stickers: [{ Equipe: "JUMBO-VISMA" }, { Equipe: "JUMBO-VISMA" }] },
    { year: 2024, stickers: [{ Equipe: "TEAM VISMA | LEASE A BIKE" }] },
  ];

  it("matches both the canonical name and historical aliases", () => {
    expect(searchTeams(albums, teams, "visma")[0]).toMatchObject({
      id: "visma-lease-a-bike",
      count: 3,
    });
    expect(searchTeams(albums, teams, "jumbo")).toHaveLength(1);
  });

  it("does not use an alias outside its configured years", () => {
    const albumsWithWrongYear = [{ year: 2023, stickers: [{ Equipe: "JUMBO-VISMA" }] }];
    expect(searchTeams(albumsWithWrongYear, teams, "jumbo")).toEqual([]);
  });
});
