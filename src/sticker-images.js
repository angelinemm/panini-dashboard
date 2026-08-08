import { getStickerNumber } from "./sticker-utils.js";

const isImageRegistry = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

export const addStickerImages = (stickers, images = {}) => {
  if (!isImageRegistry(images)) {
    return stickers;
  }

  return stickers.map((sticker) => {
    const image = images[getStickerNumber(sticker)];

    return typeof image === "string" && image.trim() !== ""
      ? { ...sticker, Image: image.trim() }
      : sticker;
  });
};

export const loadStickerImages = (albumId) => {
  if (!albumId) {
    return Promise.resolve({});
  }

  return fetch(`/albums/${albumId}/sticker-images.json`)
    .then((response) => {
      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok || !contentType.includes("application/json")) {
        return {};
      }

      return response.json().then((images) => {
        return isImageRegistry(images) ? images : {};
      });
    })
    .catch(() => ({}));
};
