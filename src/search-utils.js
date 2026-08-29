export const normalizeSearchText = (value) =>
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

export const searchCountries = (albums, query, countryNames) => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return [];

  const countries = new Map();
  albums.forEach((album) => {
    album.stickers.forEach((sticker) => {
      const type = normalizeSearchText(sticker.Type);
      const country = String(sticker.Country ?? "").trim().toUpperCase();
      if ((type === "coureur" || type === "coureuse") && country) {
        countries.set(country, (countries.get(country) ?? 0) + 1);
      }
    });
  });

  return [...countries.entries()]
    .filter(([country]) =>
      normalizeSearchText(country).includes(normalizedQuery) ||
      normalizeSearchText(countryNames[country]).includes(normalizedQuery),
    )
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) =>
      String(countryNames[a.country] ?? a.country).localeCompare(
        String(countryNames[b.country] ?? b.country),
        "fr",
      ),
    );
};

export const searchTeams = (albums, teams, query) => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return [];

  return teams
    .filter((team) =>
      [team.name, ...team.aliases.map((alias) => alias.name)]
        .some((name) => normalizeSearchText(name).includes(normalizedQuery)),
    )
    .map((team) => {
      const aliases = new Map(team.aliases.map((alias) => [alias.name, alias]));
      const count = albums.reduce((total, album) => total + album.stickers.filter((sticker) => {
        const alias = aliases.get(String(sticker.Equipe ?? "").trim());
        return alias && (!Array.isArray(alias.years) || alias.years.includes(album.year));
      }).length, 0);

      return { ...team, count };
    })
    .filter((team) => team.count > 0)
    .sort((teamA, teamB) => teamA.name.localeCompare(teamB.name, "fr"));
};
