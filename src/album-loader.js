import { getAlbumProgress } from "./collection-utils.js";
import { addStickerImages } from "./sticker-images.js";
import { backfillSpecialStickers, parseStickerCsv } from "./sticker-utils.js";
import { uiText } from "./ui-text.js";

export const loadLatestAlbum = async (album) => {
  if (album.snapshots.length === 0) {
    return getAlbumProgress(album);
  }

  const snapshots = [...album.snapshots].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const parsed = await Promise.all(
    snapshots.map(async (snapshot) => {
      const response = await fetch(snapshot.file);
      if (!response.ok) {
        throw new Error(uiText.messages.albumDataError(album.title));
      }
      return { ...snapshot, stickers: parseStickerCsv(await response.text()) };
    }),
  );
  const history = backfillSpecialStickers(parsed);
  const stickers = addStickerImages(
    history.at(-1)?.stickers ?? [],
    album.images,
  );
  return getAlbumProgress(album, stickers, history);
};
