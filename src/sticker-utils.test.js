import { describe, expect, it } from "vitest";
import {
  backfillSpecialStickers,
  formatSnapshotDate,
  getDuplicateCount,
  parseStickerCsv,
} from "./sticker-utils.js";

describe("snapshot data helpers", () => {
  it("parses snapshots with or without a header", () => {
    const header =
      "Number,Owned,Doubles,Type,Name,Country,Equipe,Fav?,Top 3";
    const row = "72,TRUE,2,Rider,Jane Doe,GBR,Team One,,";

    expect(parseStickerCsv(`${header}\n${row}`)).toEqual([
      {
        Number: "72",
        Owned: "TRUE",
        Doubles: 2,
        Type: "Rider",
        Name: "Jane Doe",
        Country: "GBR",
        Equipe: "Team One",
        "Fav?": "",
        "Top 3": "",
      },
    ]);
    expect(parseStickerCsv(row)).toEqual(parseStickerCsv(`${header}\n${row}`));
  });

  it("calculates duplicate totals", () => {
    const stickers = [{ Doubles: 2 }, { Doubles: "3" }, { Doubles: "" }];

    expect(getDuplicateCount(stickers)).toBe(5);
  });

  it("parses a missing duplicate count as zero", () => {
    const row = "72,TRUE,,Rider,Jane Doe,GBR,Team One,,";

    expect(parseStickerCsv(row)[0].Doubles).toBe(0);
  });

  it("backfills special stickers into earlier snapshots", () => {
    const snapshots = [
      {
        date: "2026-07-01",
        stickers: [{ Number: "1", Owned: "TRUE" }],
      },
      {
        date: "2026-07-02",
        stickers: [
          { Number: "1", Owned: "TRUE" },
          { Number: "P1", Owned: "TRUE", Name: "Special" },
        ],
      },
    ];

    const [earlier] = backfillSpecialStickers(snapshots);

    expect(earlier.total).toBe(2);
    expect(earlier.owned).toBe(1);
    expect(earlier.percentage).toBe(50);
    expect(earlier.stickers[1]).toMatchObject({
      Number: "P1",
      Owned: "FALSE",
      Doubles: 0,
      Name: "Special",
    });
  });

  it("formats snapshot dates without changing unknown values", () => {
    expect(formatSnapshotDate("2026-07-14")).toBe("14/07/2026");
    expect(formatSnapshotDate("latest")).toBe("latest");
  });
});
