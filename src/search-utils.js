const normalizeSearchText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();

export const searchStickersByName = (albums, query) => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return [];

  const matches = albums.flatMap((album) =>
    album.stickers
      .filter((sticker) =>
        normalizeSearchText(sticker.Name).includes(normalizedQuery),
      )
      .map((sticker) => ({ album, sticker })),
  );

  return [...matches.reduce((groups, match) => {
    const name = String(match.sticker.Name ?? "").trim();
    const group = groups.get(name) ?? { name, occurrences: [] };
    group.occurrences.push(match);
    groups.set(name, group);
    return groups;
  }, new Map()).values()];
};
