import { describe, expect, it } from "vitest";
import { getAlbumProgress, getCollectionSummary, getStickerCollectedOn, getTopOwnedTeams, getTopRepeatedRiders, getTopRiderCountries, resolveAllTimeFavourites } from "./collection-utils.js";

describe("collection summaries", () => {
  it("weights every album equally", () => {
    const albums = [
      { percentage: 0, owned: 0, total: 10, missing: 10 },
      { percentage: 50, owned: 10, total: 20, missing: 10 },
      { percentage: 100, owned: 5, total: 5, missing: 0 },
    ];
    expect(getCollectionSummary(albums)).toMatchObject({ percentage: 50, collected: 15, missing: 20, albumsCompleted: 1 });
  });

  it("derives album progress from sticker ownership", () => {
    expect(getAlbumProgress({ id: "tdf-2026" }, [{ Number: "1", Owned: "TRUE" }, { Number: "2", Owned: "FALSE" }])).toMatchObject({ owned: 1, total: 2, missing: 1, percentage: 50 });
  });

  it("resolves favourites by album id when races share a year", () => {
    const albums = [
      { id: "tdf-2025", year: 2025, stickers: [{ Number: "1" }], history: [] },
      { id: "giro-2025", year: 2025, stickers: [{ Number: "2" }], history: [] },
    ];

    expect(resolveAllTimeFavourites([{ albumId: "giro-2025", stickerId: "2" }], albums)[0].album.id).toBe("giro-2025");
  });

  it("derives started and completed dates from album history", () => {
    const history = [
      { date: "2025-06-01", owned: 0, total: 2 },
      { date: "2025-06-02", owned: 1, total: 2 },
      { date: "2025-06-03", owned: 2, total: 2 },
    ];

    expect(getAlbumProgress({}, [], history)).toMatchObject({
      startedOn: "2025-06-02",
      completedOn: "2025-06-03",
    });
  });

  it("finds the first snapshot where a sticker was collected", () => {
    const sticker = { Number: "7" };
    const history = [
      { date: "2025-06-01", stickers: [{ Number: "7", Owned: "FALSE" }] },
      { date: "2025-06-02", stickers: [{ Number: "7", Owned: "TRUE" }] },
      { date: "2025-06-03", stickers: [{ Number: "7", Owned: "TRUE" }] },
    ];

    expect(getStickerCollectedOn(sticker, history)).toBe("2025-06-02");
  });

  it("resolves ordered references without copying metadata", () => {
    const albums = [{ year: 2026, stickers: [{ Number: "123", Name: "Rider" }] }];
    const result = resolveAllTimeFavourites([{ year: 2026, stickerId: "123" }], albums);
    expect(result[0]).toMatchObject({ rank: 1, sticker: { Name: "Rider" } });
  });

  it("ranks countries from owned rider stickers only", () => {
    const albums = [{
      stickers: [
        { Type: "Coureur", Country: "BEL", Owned: "TRUE" },
        { Type: "Coureuse", Country: "bel", Owned: "TRUE" },
        { Type: "Coureur", Country: "FRA", Owned: "TRUE" },
        { Type: "Coureur", Country: "NED", Owned: "FALSE" },
        { Type: "Logo", Country: "BEL", Owned: "TRUE" },
      ],
    }];

    expect(getTopRiderCountries(albums)).toEqual([
      { country: "BEL", count: 2 },
      { country: "FRA", count: 1 },
    ]);
  });

  it("limits country rankings and resolves ties alphabetically", () => {
    const albums = [{ stickers: [
      { Type: "Coureur", Country: "USA", Owned: "TRUE" },
      { Type: "Coureur", Country: "AUS", Owned: "TRUE" },
    ] }];

    expect(getTopRiderCountries(albums, 1)).toEqual([
      { country: "AUS", count: 1 },
    ]);
  });

  it("breaks country count ties by owned rider favourite flags before limiting", () => {
    const albums = [{ stickers: ["AUS", "BEL", "FRA", "USA", "NZL"].flatMap((Country) => [
      { Country, Type: "Coureur", Owned: "TRUE", "Fav?": ["BEL", "FRA", "USA"].includes(Country) ? "x" : " " },
      { Country: Country.toLowerCase(), Type: "Coureuse", Owned: "TRUE", "Fav?": Country === "USA" ? "x" : "" },
      { Country, Type: "Logo", Owned: "TRUE", "Fav?": "x" },
      { Country, Type: "Coureur", Owned: "FALSE", "Fav?": "x" },
      ...(Country === "NZL" ? [{ Country, Type: "Coureur", Owned: "TRUE" }] : []),
    ]) }];

    expect(getTopRiderCountries(albums).map(({ country }) => country)).toEqual([
      "NZL", "USA", "BEL", "FRA", "AUS",
    ]);
    expect(getTopRiderCountries(albums, 2)).toEqual([
      { country: "NZL", count: 3 },
      { country: "USA", count: 2 },
    ]);
  });

  it("ranks owned riders by distinct albums, not sticker copies", () => {
    const albums = [
      { year: 2025, stickers: [
        { Type: "Coureur", Name: "Jonas Vingegaard", Owned: "TRUE" },
        { Type: "Coureur", Name: "Jonas Vingegaard", Owned: "TRUE" },
        { Type: "Coureur", Name: "Tadej Pogacar", Owned: "TRUE" },
      ] },
      { year: 2026, stickers: [
        { Type: "Coureur", Name: "jonas vingegaard", Owned: "TRUE" },
        { Type: "Coureur", Name: "Tadej Pogacar", Owned: "FALSE" },
      ] },
    ];

    expect(getTopRepeatedRiders(albums)).toEqual([
      { name: "Jonas Vingegaard", years: [2025, 2026], albumCount: 2 },
    ]);
  });

  it("limits repeated riders and resolves ties alphabetically", () => {
    const albums = [2025, 2026].map((year) => ({ year, stickers: [
      { Type: "Coureuse", Name: "Zoé", Owned: "TRUE" },
      { Type: "Coureur", Name: "Adam", Owned: "TRUE" },
    ] }));

    expect(getTopRepeatedRiders(albums, 1)).toEqual([
      { name: "Adam", years: [2025, 2026], albumCount: 2 },
    ]);
  });

  it("prioritises favourites only when album counts tie, before limiting results", () => {
    const albums = [2024, 2025, 2026].map((year) => ({ year, stickers: [
      { Type: "Coureur", Name: "Leader", Owned: "TRUE" },
      ...["Adam", "Bella", "Zoé"].map((Name) => ({
        Type: "Coureuse", Name, Owned: year === 2024 ? "FALSE" : "TRUE",
        "Fav?": Name === "Adam" ? " " : "",
      })),
      { Type: "Coureuse", Name: "zoé", Owned: year === 2026 ? "TRUE" : "FALSE", "Fav?": "x" },
      { Type: "Coureuse", Name: "Bella", Owned: year === 2024 ? "FALSE" : "TRUE", "Fav?": year === 2025 ? "x" : "" },
      { Type: "Coureuse", Name: "Adam", Owned: "FALSE", "Fav?": "x" },
    ] }));

    expect(getTopRepeatedRiders(albums).map(({ name }) => name)).toEqual([
      "Leader", "Bella", "Zoé", "Adam",
    ]);
    expect(getTopRepeatedRiders(albums, 2).map(({ name }) => name)).toEqual([
      "Leader", "Bella",
    ]);
  });

  it("ranks owned stickers under canonical teams across year-specific aliases", () => {
    const albums = [
      { year: 2025, stickers: [
        { Equipe: "OLD ALPHA", Owned: "TRUE" },
        { Equipe: "OLD ALPHA", Owned: "FALSE" },
        { Equipe: "BETA", Owned: "TRUE" },
      ] },
      { year: 2026, stickers: [
        { Equipe: "NEW ALPHA", Owned: "TRUE" },
        { Equipe: "NEW ALPHA", Owned: "TRUE" },
        { Equipe: "OLD ALPHA", Owned: "TRUE" },
      ] },
    ];
    const teams = [
      { id: "alpha", name: "Alpha", aliases: [
        { name: "OLD ALPHA", years: [2025] },
        { name: "NEW ALPHA", years: [2026] },
      ] },
      { id: "beta", name: "Beta", aliases: [{ name: "BETA" }] },
    ];

    expect(getTopOwnedTeams(albums, teams)).toEqual([
      { id: "alpha", name: "Alpha", count: 3 },
      { id: "beta", name: "Beta", count: 1 },
    ]);
  });

  it("breaks team count ties by owned rider favourite flags before limiting", () => {
    const teams = ["Alpha", "Beta", "Gamma", "Leader", "Zeta"].map((name) => ({
      id: name, name, aliases: [{ name }],
    }));
    const albums = [{ year: 2026, stickers: teams.flatMap(({ name }) => [
      { Equipe: name, Owned: "TRUE", Type: "Coureur", "Fav?": name === "Alpha" || name === "Leader" ? " " : "x" },
      { Equipe: name, Owned: "TRUE", Type: "Coureuse", "Fav?": name === "Zeta" ? "x" : "" },
      { Equipe: name, Owned: "TRUE", Type: "Logo", "Fav?": name === "Alpha" ? "x" : "" },
      { Equipe: name, Owned: "FALSE", Type: "Coureur", "Fav?": "x" },
      ...(name === "Leader" ? [{ Equipe: name, Owned: "TRUE", Type: "Maillot" }] : []),
    ]) }];

    expect(getTopOwnedTeams(albums, teams).map(({ name }) => name)).toEqual([
      "Leader", "Zeta", "Beta", "Gamma", "Alpha",
    ]);
    expect(getTopOwnedTeams(albums, teams, 2).map(({ name }) => name)).toEqual([
      "Leader", "Zeta",
    ]);
  });
});
