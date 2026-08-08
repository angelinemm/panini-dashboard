import { describe, expect, it } from "vitest";
import { addStickerImages } from "./sticker-images.js";

describe("sticker images", () => {
  it("adds registered images by sticker number", () => {
    const stickers = [{ Number: "39" }, { Number: "T01" }];

    expect(
      addStickerImages(stickers, {
        39: "/albums/tdf-2026/stickers/39.webp",
      }),
    ).toEqual([
      {
        Number: "39",
        Image: "/albums/tdf-2026/stickers/39.webp",
      },
      { Number: "T01" },
    ]);
  });

  it("leaves stickers unchanged when an image is unavailable", () => {
    const stickers = [{ Number: "39" }];

    expect(addStickerImages(stickers, {})).toEqual(stickers);
    expect(addStickerImages(stickers, [])).toBe(stickers);
  });
});
