import { describe, expect, it } from "vitest";
import { getExportAlbums } from "./collection-export-utils.js";

describe("collection export", () => {
  it("includes only started albums in chronological order", () => {
    const albums = [
      { id: "2024", year: 2024, owned: 4 },
      { id: "2022", year: 2022, owned: 1 },
      { id: "2023", year: 2023, owned: 0 },
    ];

    expect(getExportAlbums(albums).map((album) => album.id)).toEqual(["2022", "2024"]);
  });

  it("does not mutate the dashboard album order", () => {
    const albums = [
      { id: "new", year: 2025, owned: 1 },
      { id: "old", year: 2020, owned: 1 },
    ];

    getExportAlbums(albums);
    expect(albums.map((album) => album.id)).toEqual(["new", "old"]);
  });
});
