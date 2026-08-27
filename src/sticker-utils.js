import Papa from "papaparse";

const stickerColumns = [
  "Number",
  "Owned",
  "Doubles",
  "Type",
  "Name",
  "Country",
  "Equipe",
  "Fav?",
  "Top 3",
];

export const isOwned = (sticker) => {
  return String(sticker.Owned ?? sticker["On a"])
    .trim()
    .toUpperCase() === "TRUE";
};

export const isFavourite = (sticker) => {
  return String(sticker["Fav?"] ?? "").trim() !== "";
};

const parseDuplicateCount = (value) => {
  const doubles = Number(value);

  return Number.isInteger(doubles) && doubles >= 0 ? doubles : 0;
};

export const getDuplicateCount = (stickers) => {
  return stickers.reduce((sum, sticker) => {
    return sum + parseDuplicateCount(sticker.Doubles);
  }, 0);
};

export const formatSnapshotDate = (date) => {
  const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return date;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

export const getStickerNumber = (sticker) => String(sticker.Number).trim();

const isSpecialSticker = (sticker) => {
  return !/^\d+$/.test(getStickerNumber(sticker));
};

export const backfillSpecialStickers = (snapshots) => {
  const specialStickers = new Map();

  snapshots.forEach((snapshot) => {
    snapshot.stickers.filter(isSpecialSticker).forEach((sticker) => {
      specialStickers.set(getStickerNumber(sticker), sticker);
    });
  });

  return snapshots.map((snapshot) => {
    const existingNumbers = new Set(snapshot.stickers.map(getStickerNumber));
    const missingSpecialStickers = [...specialStickers.entries()]
      .filter(([number]) => !existingNumbers.has(number))
      .map(([number, sticker]) => ({
        ...sticker,
        Number: number,
        Owned: "FALSE",
        Doubles: 0,
        "Fav?": "",
        "Top 3": "",
      }));
    const stickers = [...snapshot.stickers, ...missingSpecialStickers];
    const owned = stickers.filter(isOwned).length;

    return {
      ...snapshot,
      owned,
      percentage:
        stickers.length === 0
          ? 0
          : Math.round((owned / stickers.length) * 100),
      stickers,
      total: stickers.length,
    };
  });
};

export const parseStickerCsv = (csvText) => {
  const result = Papa.parse(csvText, {
    skipEmptyLines: true,
  });
  const rows = result.data;

  if (rows.length === 0) {
    return [];
  }

  const firstRow = rows[0].map((cell) => String(cell).trim());
  const hasHeader =
    firstRow.includes("Number") &&
    (firstRow.includes("Owned") || firstRow.includes("On a"));
  const headers = hasHeader ? firstRow : stickerColumns;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((row) => {
    return headers.reduce((sticker, header, index) => {
      const normalizedHeader = header === "On a" ? "Owned" : header;
      const value = row[index] ?? "";
      sticker[normalizedHeader] =
        normalizedHeader === "Doubles"
          ? parseDuplicateCount(value)
          : value;
      return sticker;
    }, {});
  });
};
