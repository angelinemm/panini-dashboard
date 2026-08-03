import { describe, expect, it } from "vitest";
import {
  backfillSpecialStickers,
  formatSnapshotDate,
  getDuplicateCount,
  getPacketNumbers,
  parseStickerCsv,
} from "./sticker-utils.js";

describe("snapshot data helpers", () => {
  it("parses snapshots with or without a header", () => {
    const header =
      "Number,On a,Doubles,Type,Name,Country,Equipe,Fav?,Top 3";
    const row = "72,TRUE,4/8,Rider,Jane Doe,GBR,Team One,,";

    expect(parseStickerCsv(`${header}\n${row}`)).toEqual([
      {
        Number: "72",
        "On a": "TRUE",
        Doubles: "4/8",
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

  it("accepts the packet separators used in snapshot data", () => {
    expect(getPacketNumbers("4/8, 15; 16")).toEqual([4, 8, 15, 16]);
    expect(getPacketNumbers("")).toEqual([]);
  });

  it("calculates duplicate totals", () => {
    const stickers = [{ Doubles: "4/8" }, { Doubles: "" }];

    expect(getDuplicateCount(stickers)).toBe(2);
  });

  it("backfills special stickers into earlier snapshots", () => {
    const snapshots = [
      {
        date: "2026-07-01",
        stickers: [{ Number: "1", "On a": "TRUE" }],
      },
      {
        date: "2026-07-02",
        stickers: [
          { Number: "1", "On a": "TRUE" },
          { Number: "P1", "On a": "TRUE", Name: "Special" },
        ],
      },
    ];

    const [earlier] = backfillSpecialStickers(snapshots);

    expect(earlier.total).toBe(2);
    expect(earlier.owned).toBe(1);
    expect(earlier.percentage).toBe(50);
    expect(earlier.stickers[1]).toMatchObject({
      Number: "P1",
      "On a": "FALSE",
      Name: "Special",
    });
  });

  it("formats snapshot dates without changing unknown values", () => {
    expect(formatSnapshotDate("2026-07-14")).toBe("14/07");
    expect(formatSnapshotDate("latest")).toBe("latest");
  });
});
