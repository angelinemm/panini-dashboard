import { getStickerNumber, isOwned } from "./sticker-utils.js";

export const getStickerCollectedOn = (sticker, history = []) => {
  const stickerNumber = getStickerNumber(sticker);

  return history.find((snapshot) => {
    return snapshot.stickers.some(
      (snapshotSticker) =>
        getStickerNumber(snapshotSticker) === stickerNumber &&
        isOwned(snapshotSticker),
    );
  })?.date ?? "";
};

export const getAlbumProgress = (album, stickers = [], history = []) => {
  const total = stickers.length;
  const owned = stickers.filter(isOwned).length;
  const startedOn = history.find((snapshot) => snapshot.owned > 0)?.date ?? "";
  const completedOn = history.find(
    (snapshot) => snapshot.total > 0 && snapshot.owned === snapshot.total,
  )?.date ?? "";

  return {
    ...album,
    stickers,
    total,
    owned,
    missing: total - owned,
    percentage: total === 0 ? 0 : Math.round((owned / total) * 100),
    startedOn,
    completedOn,
    history,
  };
};

export const getCollectionSummary = (albums) => {
  const albumCount = albums.length;
  const percentage = albumCount === 0
    ? 0
    : Math.round(
        albums.reduce((sum, album) => {
          return sum + (album.total === 0 ? 0 : (album.owned / album.total) * 100);
        }, 0) / albumCount,
      );

  return {
    albumCount,
    albumsCompleted: albums.filter(
      (album) => album.total > 0 && album.owned === album.total,
    ).length,
    collected: albums.reduce((sum, album) => sum + album.owned, 0),
    missing: albums.reduce((sum, album) => sum + album.missing, 0),
    percentage,
  };
};

export const resolveAllTimeFavourites = (ranking, albums) => {
  if (!Array.isArray(ranking)) {
    return [];
  }

  return ranking.slice(0, 10).flatMap((reference, index) => {
    const album = albums.find(
      (currentAlbum) => currentAlbum.year === Number(reference?.year),
    );
    const sticker = album?.stickers.find(
      (currentSticker) =>
        getStickerNumber(currentSticker) === String(reference?.stickerId).trim(),
    );

    return sticker
      ? [{
          album,
          rank: index + 1,
          sticker,
          collectedOn: getStickerCollectedOn(sticker, album.history),
        }]
      : [];
  });
};
