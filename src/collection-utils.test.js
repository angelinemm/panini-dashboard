import { describe, expect, it } from "vitest";
import { getAlbumProgress, getCollectionSummary, getStickerCollectedOn, resolveAllTimeFavourites } from "./collection-utils.js";

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
});
