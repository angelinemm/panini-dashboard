import { useEffect, useState } from "react";
import Papa from "papaparse";
import "./App.css";

const stickerColumns = [
  "Number",
  "On a",
  "Doubles",
  "Type",
  "Name",
  "Country",
  "Equipe",
  "Packet",
  "Fav?",
  "Top 3",
];

const isOwned = (sticker) => {
  return String(sticker["On a"]).trim().toUpperCase() === "TRUE";
};

const getPacketNumbers = (value) => {
  const packetList = String(value).trim();

  if (packetList === "") {
    return [];
  }

  return packetList
    .split(/[,\s;/]+/)
    .map((packet) => Number.parseInt(packet, 10))
    .filter((packet) => !Number.isNaN(packet));
};

const countDuplicatePackets = (value) => {
  return getPacketNumbers(value).length;
};

const formatSnapshotDate = (date) => {
  const match = String(date).match(/^\d{4}-(\d{2})-(\d{2})$/);

  if (!match) {
    return date;
  }

  const [, month, day] = match;
  return `${day}/${month}`;
};

const getStickerNumber = (sticker) => String(sticker.Number).trim();

const isSpecialSticker = (sticker) => {
  return !/^\d+$/.test(getStickerNumber(sticker));
};

const backfillSpecialStickers = (snapshots) => {
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
        "On a": "FALSE",
        Doubles: "",
        Packet: "",
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

const parseStickerCsv = (csvText) => {
  const result = Papa.parse(csvText, {
    skipEmptyLines: true,
  });
  const rows = result.data;

  if (rows.length === 0) {
    return [];
  }

  const firstRow = rows[0].map((cell) => String(cell).trim());
  const hasHeader = firstRow.includes("Number") && firstRow.includes("On a");
  const headers = hasHeader ? firstRow : stickerColumns;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows.map((row) => {
    return headers.reduce((sticker, header, index) => {
      sticker[header] = row[index] ?? "";
      return sticker;
    }, {});
  });
};

const fetchAlbums = () => {
  return fetch("/albums.json").then((response) => {
    if (!response.ok) {
      throw new Error("No album index found");
    }

    return response.json();
  });
};

const fetchJsonIfAvailable = (file) => {
  return fetch(file)
    .then((response) => {
      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok || !contentType.includes("application/json")) {
        return null;
      }

      return response.json().catch(() => null);
    })
    .catch(() => null);
};

const fetchChases = (file) => {
  if (!file) {
    return Promise.resolve({ stickers: [], teams: [] });
  }

  return fetchJsonIfAvailable(file).then((chases) => {
    return {
      stickers: Array.isArray(chases?.stickers) ? chases.stickers : [],
      teams: Array.isArray(chases?.teams) ? chases.teams : [],
    };
  });
};

const AlbumTabs = ({ albums, selectedAlbumId, onSelect }) => {
  return (
    <nav className="album-nav" aria-label="Albums Tour de France">
      <div className="album-tabs" role="tablist">
        {albums.map((album) => (
          <button
            aria-selected={album.id === selectedAlbumId}
            className={album.id === selectedAlbumId ? "is-active" : ""}
            key={album.id}
            onClick={() => onSelect(album.id)}
            role="tab"
            type="button"
          >
            {album.year}
            {album.snapshots.length === 0 && <span>À venir</span>}
          </button>
        ))}
      </div>
    </nav>
  );
};

function App() {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [stickers, setStickers] = useState([]);
  const [history, setHistory] = useState([]);
  const [chases, setChases] = useState({
    stickers: [],
    teams: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAlbums()
      .then((albumData) => {
        setAlbums(albumData);

        const requestedAlbum = new URLSearchParams(window.location.search).get(
          "album",
        );
        const initialAlbum =
          albumData.find((album) => album.id === requestedAlbum) ??
          [...albumData].reverse().find((album) => album.snapshots.length > 0) ??
          albumData[albumData.length - 1];

        setSelectedAlbumId(initialAlbum?.id ?? "");
        if (initialAlbum?.snapshots.length === 0) {
          setLoading(false);
        }
      })
      .catch((loadError) => {
        setError(loadError.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleHistoryChange = () => {
      const requestedAlbum = new URLSearchParams(window.location.search).get(
        "album",
      );

      const requestedAlbumData = albums.find(
        (album) => album.id === requestedAlbum,
      );

      if (requestedAlbumData) {
        setError("");
        setLoading(requestedAlbumData.snapshots.length > 0);
        setSelectedAlbumId(requestedAlbum);
      }
    };

    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, [albums]);

  useEffect(() => {
    const album = albums.find(
      (currentAlbum) => currentAlbum.id === selectedAlbumId,
    );

    if (!album) {
      return undefined;
    }

    if (album.snapshots.length === 0) {
      return undefined;
    }

    let cancelled = false;
    Promise.all([
      Promise.resolve(album.snapshots).then((snapshots) => {
        const sortedSnapshots = [...snapshots].sort(
          (snapshotA, snapshotB) => {
            return snapshotA.date.localeCompare(snapshotB.date);
          },
        );

        if (sortedSnapshots.length === 0) {
          throw new Error("No snapshots found");
        }

        return Promise.all(
          sortedSnapshots.map((snapshot) => {
            return fetch(snapshot.file)
              .then((response) => response.text())
              .then((csvText) => {
                const snapshotStickers = parseStickerCsv(csvText);

                return {
                  ...snapshot,
                  stickers: snapshotStickers,
                };
              });
          }),
        ).then(backfillSpecialStickers);
      }),
      fetchChases(album.chases),
    ])
      .then(([snapshotHistory, chaseData]) => {
        if (!cancelled) {
          setHistory(snapshotHistory);
          setStickers(snapshotHistory[snapshotHistory.length - 1].stickers);
          setChases(chaseData);
          setLoading(false);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [albums, selectedAlbumId]);

  const selectedAlbum = albums.find((album) => album.id === selectedAlbumId);
  const selectAlbum = (albumId) => {
    const album = albums.find((currentAlbum) => currentAlbum.id === albumId);
    const url = new URL(window.location.href);
    url.searchParams.set("album", albumId);
    window.history.pushState({}, "", url);
    setError("");
    setLoading(album?.snapshots.length > 0);
    setSelectedAlbumId(albumId);
  };

  if (!selectedAlbum || loading || error) {
    return (
      <main className="dashboard">
        <section className="race-panel">
          {albums.length > 0 && (
            <AlbumTabs
              albums={albums}
              onSelect={selectAlbum}
              selectedAlbumId={selectedAlbumId}
            />
          )}
          <div className="dashboard-message" role={error ? "alert" : "status"}>
            <p className="eyebrow">Album Panini</p>
            <h1>{error ? "Impossible de charger l’album" : "Chargement…"}</h1>
            {error && <p>{error}</p>}
          </div>
        </section>
      </main>
    );
  }

  if (selectedAlbum.snapshots.length === 0) {
    return (
      <main className="dashboard">
        <section className="race-panel">
          <AlbumTabs
            albums={albums}
            onSelect={selectAlbum}
            selectedAlbumId={selectedAlbumId}
          />
          <section className="coming-soon" aria-labelledby="coming-soon-title">
            <img
              alt="Cycliste gravissant une route de montagne"
              src="/cyclist-coming-soon.jpg"
            />
            <div className="coming-soon__copy">
              <p className="eyebrow">{selectedAlbum.title}</p>
              <h1 id="coming-soon-title">Bientôt sur la ligne de départ</h1>
              <p>
                Cette collection est au programme. Son suivi apparaîtra ici dès
                que le premier snapshot sera ajouté.
              </p>
            </div>
          </section>
        </section>
      </main>
    );
  }

  const total = stickers.length;
  const owned = stickers.filter(isOwned).length;
  const percentage = total === 0 ? 0 : Math.round((owned / total) * 100);
  const remaining = total - owned;
  const remainingWithoutInstants =
    remaining -
    stickers.filter((sticker) => {
      return String(sticker.Type).trim() === "Instantané" && !isOwned(sticker);
    }).length;
  const doubles = stickers.reduce((sum, sticker) => {
    return sum + countDuplicatePackets(sticker.Doubles);
  }, 0);
  const packetsOpened = stickers.reduce((highestPacket, sticker) => {
    const stickerPackets = [
      ...getPacketNumbers(sticker.Packet),
      ...getPacketNumbers(sticker.Doubles),
    ];

    return Math.max(highestPacket, 0, ...stickerPackets);
  }, 0);
  const favourites = stickers.filter((sticker) => {
    return String(sticker["Fav?"]).trim() !== "";
  }).length;
  const topCards = stickers
    .map((sticker) => {
      const rank = Number.parseInt(sticker["Top 3"], 10);

      return {
        ...sticker,
        rank,
      };
    })
    .filter((sticker) => {
      return (
        !Number.isNaN(sticker.rank) &&
        sticker.rank >= 1 &&
        sticker.rank <= 3
      );
    })
    .sort((stickerA, stickerB) => stickerA.rank - stickerB.rank)
    .slice(0, 3);
  const getTopTeamsByTypes = (types) => {
    const allowedTypes = new Set(types);
    const getTeamProgress = (snapshotStickers, teamName) => {
      const teamStickers = snapshotStickers.filter((sticker) => {
        return (
          String(sticker.Equipe).trim() === teamName &&
          allowedTypes.has(String(sticker.Type).trim())
        );
      });

      return teamStickers.filter(isOwned).length;
    };

    return Object.values(
      stickers.reduce((teams, sticker) => {
        if (!allowedTypes.has(String(sticker.Type).trim())) {
          return teams;
        }

        const teamName = String(sticker.Equipe).trim();

        if (teamName === "") {
          return teams;
        }

        const team = teams[teamName] ?? {
          name: teamName,
          owned: 0,
          total: 0,
        };

        team.total += 1;

        if (isOwned(sticker)) {
          team.owned += 1;
        }

        teams[teamName] = team;
        return teams;
      }, {}),
    )
      .map((team) => ({
        ...team,
        percentage:
          team.total === 0 ? 0 : Math.round((team.owned / team.total) * 100),
        reachedDate:
          history.find((snapshot) => {
            return getTeamProgress(snapshot.stickers, team.name) >= team.owned;
          })?.date ?? "",
      }))
      .sort((teamA, teamB) => {
        return (
          teamB.owned - teamA.owned ||
          teamA.reachedDate.localeCompare(teamB.reachedDate) ||
          teamA.name.localeCompare(teamB.name)
        );
      })
      .slice(0, 3);
  };
  const mensTeams = getTopTeamsByTypes([
    "Coureur",
    "Maillot",
    "Logo",
    "Equipe",
    "Velo",
    "Vélo",
  ]);
  const womensTeams = getTopTeamsByTypes(["Coureuse"]);
  const teamStickerTypes = new Set([
    "Coureur",
    "Coureuse",
    "Maillot",
    "Logo",
    "Equipe",
    "Velo",
    "Vélo",
  ]);
  const chaseStickers = chases.stickers
    .map((chase) => {
      const chaseNumber =
        typeof chase === "object"
          ? String(chase.number ?? "").trim()
          : String(chase).trim();
      const sticker = stickers.find((currentSticker) => {
        return getStickerNumber(currentSticker) === chaseNumber;
      });

      return {
        note: typeof chase === "object" ? chase.note : "",
        number: chaseNumber,
        owned: sticker ? isOwned(sticker) : false,
        sticker,
      };
    })
    .filter((chase) => chase.number !== "");
  const chaseTeams = chases.teams.map((teamName) => {
    const teamStickers = stickers.filter((sticker) => {
      return (
        String(sticker.Equipe).trim() === teamName &&
        teamStickerTypes.has(String(sticker.Type).trim())
      );
    });
    const teamOwned = teamStickers.filter(isOwned).length;

    return {
      name: teamName,
      owned: teamOwned,
      percentage:
        teamStickers.length === 0
          ? 0
          : Math.round((teamOwned / teamStickers.length) * 100),
      total: teamStickers.length,
    };
  });
  const chaseMissing = chaseStickers.filter((chase) => !chase.owned).length;
  const historyStart = history[0];
  const historyEnd = history[history.length - 1];
  const historyGain =
    historyStart && historyEnd ? historyEnd.owned - historyStart.owned : 0;
  const bestDay = history.slice(1).reduce((best, snapshot, index) => {
    const previousSnapshot = history[index];
    const gain = snapshot.owned - previousSnapshot.owned;

    if (best === null || gain > best.gain) {
      return {
        date: snapshot.date,
        gain,
      };
    }

    return best;
  }, null);
  const chartWidth = 640;
  const chartHeight = 220;
  const chartPadding = {
    bottom: 34,
    left: 58,
    right: 18,
    top: 18,
  };
  const chartInnerWidth =
    chartWidth - chartPadding.left - chartPadding.right;
  const chartInnerHeight =
    chartHeight - chartPadding.top - chartPadding.bottom;
  const chartPoints = history.map((snapshot, index) => {
    const x =
      chartPadding.left +
      (history.length === 1
        ? chartInnerWidth / 2
        : (chartInnerWidth / (history.length - 1)) * index);
    const y =
      chartPadding.top +
      chartInnerHeight -
      (chartInnerHeight * snapshot.percentage) / 100;

    return {
      ...snapshot,
      label: formatSnapshotDate(snapshot.date),
      x,
      y,
    };
  });
  const chartPath = chartPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
  const maxDateLabels = 5;
  const dateLabelInterval =
    chartPoints.length <= maxDateLabels
      ? 1
      : Math.ceil((chartPoints.length - 1) / (maxDateLabels - 1));
  const shouldShowDateLabel = (index) => {
    return (
      index === 0 ||
      index === chartPoints.length - 1 ||
      index % dateLabelInterval === 0
    );
  };

  const renderTeamStandings = (teams, headingId, title, subtitle) => {
    if (teams.length === 0) {
      return null;
    }

    return (
      <section className="team-standings" aria-labelledby={headingId}>
        <div className="team-standings__header">
          <p className="stage-label" id={headingId}>
            {title}
          </p>
          <span>{subtitle}</span>
        </div>

        <ol className="team-list">
          {teams.map((team, index) => (
            <li className="team-row" key={team.name}>
              <span className="team-rank">{index + 1}</span>
              <div className="team-row__main">
                <div className="team-row__text">
                  <strong>{team.name}</strong>
                  <span>
                    {team.owned} sur {team.total} collectés
                    {team.reachedDate
                      ? ` depuis le ${formatSnapshotDate(team.reachedDate)}`
                      : ""}
                  </span>
                </div>
                <div className="team-progress">
                  <div style={{ width: `${team.percentage}%` }} />
                </div>
              </div>
              <span className="team-percent">{team.percentage}%</span>
            </li>
          ))}
        </ol>
      </section>
    );
  };

  return (
    <main className="dashboard">
      <section className="race-panel">
        <AlbumTabs
          albums={albums}
          onSelect={selectAlbum}
          selectedAlbumId={selectedAlbumId}
        />
        <div className="race-panel__header">
          <div>
            <p className="eyebrow">Album Panini</p>
            <h1>{selectedAlbum.title}</h1>
          </div>
          <div className="race-badge" aria-label={`${percentage}% complété`}>
            <span>{percentage}%</span>
            <small>complété</small>
          </div>
        </div>

        <div className="route-card">
          <div className="route-card__copy">
            <p className="stage-label">Étape de collection</p>
            <div className="route-card__summary">
              <strong>
                {owned} sur {total} stickers collectés
              </strong>
              <span>{packetsOpened} paquets ouverts</span>
            </div>
          </div>
          <div className="progress" aria-label={`${percentage}% complété`}>
            <div style={{ width: `${percentage}%` }} />
          </div>
          <div className="route-card__markers" aria-hidden="true">
            <span>Départ</span>
            <span>Champs-Élysées</span>
          </div>
        </div>

        {history.length > 0 && (
          <section className="history-card" aria-labelledby="history-heading">
            <div className="team-standings__header">
              <p className="stage-label" id="history-heading">
                Évolution de la collection
              </p>
              <span>
                {historyGain >= 0 ? "+" : ""}
                {historyGain} stickers depuis le{" "}
                {formatSnapshotDate(historyStart.date)}
              </span>
            </div>

            <div className="history-chart">
              <svg
                aria-label="Progression du pourcentage de stickers collectés"
                role="img"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              >
                <line
                  className="history-axis"
                  x1={chartPadding.left}
                  x2={chartPadding.left}
                  y1={chartPadding.top}
                  y2={chartPadding.top + chartInnerHeight}
                />
                <line
                  className="history-axis"
                  x1={chartPadding.left}
                  x2={chartPadding.left + chartInnerWidth}
                  y1={chartPadding.top + chartInnerHeight}
                  y2={chartPadding.top + chartInnerHeight}
                />
                {[0, 25, 50, 75, 100].map((tick) => {
                  const y =
                    chartPadding.top +
                    chartInnerHeight -
                    (chartInnerHeight * tick) / 100;

                  return (
                    <g key={tick}>
                      <line
                        className="history-grid"
                        x1={chartPadding.left}
                        x2={chartPadding.left + chartInnerWidth}
                        y1={y}
                        y2={y}
                      />
                      <text
                        className="history-y-label"
                        x={chartPadding.left - 10}
                        y={y + 4}
                      >
                        {tick}%
                      </text>
                    </g>
                  );
                })}
                <polyline className="history-line" points={chartPath} />
                {chartPoints.map((point, index) => (
                  <g key={point.date}>
                    <circle
                      className="history-point"
                      cx={point.x}
                      cy={point.y}
                      r="5"
                    >
                      <title>
                        {formatSnapshotDate(point.date)}: {point.percentage}% (
                        {point.owned} sur {point.total})
                      </title>
                    </circle>
                    {shouldShowDateLabel(index) && (
                      <text
                        className="history-x-label"
                        x={point.x}
                        y={chartHeight - 10}
                      >
                        {point.label}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>

            <div className="history-summary">
              <div>
                <span>Dernière mise à jour</span>
                <strong>{formatSnapshotDate(historyEnd.date)}</strong>
              </div>
              <div>
                <span>Progression</span>
                <strong>
                  {historyStart.percentage}% → {historyEnd.percentage}%
                </strong>
              </div>
              {bestDay && (
                <div>
                  <span>Meilleure journée</span>
                  <strong>
                    {formatSnapshotDate(bestDay.date)} · +{bestDay.gain}
                  </strong>
                </div>
              )}
            </div>
          </section>
        )}

        <div className="stats-grid">
          <article className="stat stat--yellow">
            <span>Maillot jaune</span>
            <strong>{owned}</strong>
            <p>dans l'album</p>
          </article>
          <article className="stat stat--green">
            <span>Sprint</span>
            <strong>{remaining}</strong>
            <p>encore à chasser</p>
            <small>{remainingWithoutInstants} hors instantanés</small>
          </article>
          <article className="stat stat--polka">
            <span>Montagne</span>
            <strong>{doubles}</strong>
            <p>doubles à échanger</p>
          </article>
          <article className="stat stat--white">
            <span>Jeune coureur</span>
            <strong>{favourites}</strong>
            <p>favoris marqués</p>
          </article>
        </div>

        {(chaseStickers.length > 0 || chaseTeams.length > 0) && (
          <section className="chase-card" aria-labelledby="chase-heading">
            <div className="team-standings__header">
              <p className="stage-label" id="chase-heading">
                À chasser
              </p>
              <span>
                {chaseMissing} sticker{chaseMissing > 1 ? "s" : ""} manquant
                {chaseMissing > 1 ? "s" : ""}
              </span>
            </div>

            {chaseStickers.length > 0 && (
              <ol className="chase-list">
                {chaseStickers.map((chase) => {
                  const title =
                    String(chase.sticker?.Name ?? "").trim() ||
                    chase.note ||
                    `Sticker ${chase.number}`;
                  const details = [
                    String(chase.sticker?.Type ?? "").trim(),
                    String(chase.sticker?.Equipe ?? "").trim(),
                    String(chase.sticker?.Country ?? "").trim(),
                  ].filter(Boolean);

                  return (
                    <li
                      className={`chase-item ${
                        chase.owned ? "chase-item--owned" : ""
                      }`}
                      key={chase.number}
                    >
                      <span className="chase-status">
                        {chase.owned ? "Collecté" : "Manquant"}
                      </span>
                      <div>
                        <strong>{title}</strong>
                        <span>
                          N° {chase.number}
                          {details.length > 0
                            ? ` - ${details.join(" - ")}`
                            : ""}
                        </span>
                        {chase.note && <em>{chase.note}</em>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {chaseTeams.length > 0 && (
              <div className="chase-teams">
                {chaseTeams.map((team) => (
                  <article className="chase-team" key={team.name}>
                    <div className="chase-team__text">
                      <strong>{team.name}</strong>
                      <span>
                        {team.owned} sur {team.total} collectés
                      </span>
                    </div>
                    <div className="team-progress">
                      <div style={{ width: `${team.percentage}%` }} />
                    </div>
                    <span className="team-percent">{team.percentage}%</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {topCards.length > 0 && (
          <section className="favourite-cards" aria-labelledby="favourite-cards-heading">
            <div className="team-standings__header">
              <p className="stage-label" id="favourite-cards-heading">
                Mes cartes préférées
              </p>
              <span>Top 3 personnel</span>
            </div>

            <ol className="favourite-list">
              {topCards.map((sticker) => {
                const title = String(sticker.Name).trim() || `Sticker ${sticker.Number}`;
                const details = [
                  String(sticker.Type).trim(),
                  String(sticker.Equipe).trim(),
                  String(sticker.Country).trim(),
                ].filter(Boolean);
                const medalLabels = {
                  1: "Médaille d'or",
                  2: "Médaille d'argent",
                  3: "Médaille de bronze",
                };
                const medals = {
                  1: "🥇",
                  2: "🥈",
                  3: "🥉",
                };

                return (
                  <li className="favourite-card" key={sticker.Number}>
                    <span
                      className="favourite-medal"
                      role="img"
                      aria-label={medalLabels[sticker.rank]}
                      title={medalLabels[sticker.rank]}
                    >
                      {medals[sticker.rank]}
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <span>
                        N° {sticker.Number}
                        {details.length > 0 ? ` - ${details.join(" - ")}` : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {renderTeamStandings(
          mensTeams,
          "mens-team-heading",
          "Classement hommes",
          "Top 3 des équipes hommes par stickers collectés",
        )}
        {renderTeamStandings(
          womensTeams,
          "womens-team-heading",
          "Classement femmes",
          "Top 3 des équipes femmes par stickers collectés",
        )}
      </section>
    </main>
  );
}

export default App;
