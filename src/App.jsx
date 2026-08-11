import { useEffect, useState } from "react";
import "./App.css";
import CollectionDashboard from "./CollectionDashboard.jsx";
import CollectionSearch from "./CollectionSearch.jsx";
import RiderDetail from "./RiderDetail.jsx";
import CountryRanking from "./CountryRanking.jsx";
import { getStickerCollectedOn, getTopRiderCountries } from "./collection-utils.js";
import StickerThumbnail from "./StickerThumbnail.jsx";
import { addStickerImages, loadStickerImages } from "./sticker-images.js";
import {
  backfillSpecialStickers,
  formatSnapshotDate,
  getDuplicateCount,
  getStickerNumber,
  isOwned,
  parseStickerCsv,
} from "./sticker-utils.js";

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

const AlbumTabs = ({ albums, isSearch, selectedAlbumId, onSearch, onSelect }) => {
  return (
    <nav className="album-nav" aria-label="Albums Tour de France">
      <div className="album-tabs" role="tablist">
        <button
          aria-selected={selectedAlbumId === "" && !isSearch}
          className={selectedAlbumId === "" && !isSearch ? "is-active" : ""}
          onClick={() => onSelect("")}
          role="tab"
          type="button"
        >
          Collection
        </button>
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
        <button
          aria-label="Rechercher dans la collection"
          aria-selected={isSearch}
          className={`album-tabs__search ${isSearch ? "is-active" : ""}`}
          onClick={onSearch}
          role="tab"
          title="Rechercher dans la collection"
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
        </button>
      </div>
    </nav>
  );
};

function App() {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("");
  const [isSearch, setIsSearch] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [stickers, setStickers] = useState([]);
  const [history, setHistory] = useState([]);
  const [snapshotMetadata, setSnapshotMetadata] = useState({});
  const [chases, setChases] = useState({
    stickers: [],
    teams: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchAlbums(),
      fetchJsonIfAvailable("/snapshot-metadata.json"),
    ])
      .then(([albumData, metadata]) => {
        setAlbums(albumData);
        setSnapshotMetadata(metadata ?? {});

        const requestedAlbum = new URLSearchParams(window.location.search).get(
          "album",
        );
        const requestedView = new URLSearchParams(window.location.search).get("view");
        const initialAlbum = albumData.find(
          (album) => album.id === requestedAlbum,
        );

        setSelectedAlbumId(initialAlbum?.id ?? "");
        setIsSearch(requestedView === "search");
        setRiderName(requestedView === "rider" ? new URLSearchParams(window.location.search).get("rider") ?? "" : "");
        if (!initialAlbum || initialAlbum.snapshots.length === 0) {
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
      const requestedView = new URLSearchParams(window.location.search).get("view");
      setIsSearch(requestedView === "search");
      setRiderName(requestedView === "rider" ? new URLSearchParams(window.location.search).get("rider") ?? "" : "");

      const requestedAlbumData = albums.find(
        (album) => album.id === requestedAlbum,
      );

      if (requestedAlbumData) {
        setError("");
        setLoading(requestedAlbumData.snapshots.length > 0);
        setSelectedAlbumId(requestedAlbum);
      } else if (!requestedAlbum) {
        setError("");
        setLoading(false);
        setSelectedAlbumId("");
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
      loadStickerImages(album.id),
    ])
      .then(([snapshotHistory, chaseData, images]) => {
        if (!cancelled) {
          setHistory(snapshotHistory);
          setStickers(
            addStickerImages(
              snapshotHistory[snapshotHistory.length - 1].stickers,
              images,
            ),
          );
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
    if (albumId) url.searchParams.set("album", albumId);
    else url.searchParams.delete("album");
    url.searchParams.delete("view");
    url.searchParams.delete("rider");
    window.history.pushState({}, "", url);
    setError("");
    setLoading(album?.snapshots.length > 0);
    setSelectedAlbumId(albumId);
    setIsSearch(false);
    setRiderName("");
  };
  const openSearch = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("album");
    url.searchParams.delete("rider");
    url.searchParams.set("view", "search");
    window.history.pushState({}, "", url);
    setError("");
    setLoading(false);
    setSelectedAlbumId("");
    setIsSearch(true);
    setRiderName("");
  };
  const openRider = (name) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("album");
    url.searchParams.set("view", "rider");
    url.searchParams.set("rider", name);
    window.history.pushState({}, "", url);
    setSelectedAlbumId("");
    setIsSearch(false);
    setRiderName(name);
  };

  if (loading || error || albums.length === 0) {
    return (
      <main className="dashboard">
        <section className="race-panel race-panel--collection">
          {albums.length > 0 && (
            <AlbumTabs
              albums={albums}
              isSearch={isSearch}
              onSearch={openSearch}
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

  if (isSearch) {
    return (
      <main className="dashboard">
        <section className="race-panel race-panel--collection">
          <AlbumTabs
            albums={albums}
            isSearch
            onSearch={openSearch}
            onSelect={selectAlbum}
            selectedAlbumId=""
          />
          <CollectionSearch albums={albums} onOpenAlbum={selectAlbum} onOpenRider={openRider} />
        </section>
      </main>
    );
  }

  if (riderName) {
    return (
      <main className="dashboard">
        <section className="race-panel race-panel--collection">
          <AlbumTabs albums={albums} isSearch={false} onSearch={openSearch} onSelect={selectAlbum} selectedAlbumId="" />
          <RiderDetail albums={albums} name={riderName} onBackToSearch={openSearch} onOpenAlbum={selectAlbum} />
        </section>
      </main>
    );
  }

  if (!selectedAlbum) {
    return (
      <main className="dashboard">
        <section className="race-panel race-panel--collection">
          <AlbumTabs
            albums={albums}
            isSearch={false}
            onSearch={openSearch}
            onSelect={selectAlbum}
            selectedAlbumId=""
          />
          <CollectionDashboard albums={albums} onOpenAlbum={selectAlbum} />
        </section>
      </main>
    );
  }

  if (selectedAlbum.snapshots.length === 0) {
    return (
      <main className="dashboard">
        <section className="race-panel race-panel--collection">
          <AlbumTabs
            albums={albums}
            isSearch={false}
            onSearch={openSearch}
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
  const doubles = getDuplicateCount(stickers);
  const packetsOpened =
    snapshotMetadata[selectedAlbumId]?.packetsOpened ?? 0;
  const favourites = stickers.filter((sticker) => {
    return String(sticker["Fav?"]).trim() !== "";
  }).length;
  const topCards = stickers
    .map((sticker) => {
      const rank = Number.parseInt(sticker["Top 3"], 10);

      return {
        ...sticker,
        collectedOn: getStickerCollectedOn(sticker, history),
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
  const topCountries = getTopRiderCountries([{ stickers }]);
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
        collectedOn: sticker ? getStickerCollectedOn(sticker, history) : "",
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
  const chaseMissing =
    chaseStickers.filter((chase) => !chase.owned).length +
    chaseTeams.reduce((sum, team) => sum + (team.total - team.owned), 0);
  const historyStart = history[0];
  const historyEnd = history[history.length - 1];
  const historyGain =
    historyStart && historyEnd ? historyEnd.owned - historyStart.owned : 0;
  const duplicateGain = historyStart
    ? doubles - getDuplicateCount(historyStart.stickers)
    : doubles;
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
  const duplicateHistory = history.map((snapshot) => {
    const snapshotDuplicates = getDuplicateCount(snapshot.stickers);

    return {
      ...snapshot,
      duplicates: snapshotDuplicates,
      label: formatSnapshotDate(snapshot.date),
    };
  });
  const maxDuplicates = Math.max(
    5,
    ...duplicateHistory.map((snapshot) => snapshot.duplicates),
  );
  const duplicateAxisMax = Math.ceil(maxDuplicates / 5) * 5;
  const duplicateTicks = [
    0,
    Math.round(duplicateAxisMax * 0.25),
    Math.round(duplicateAxisMax * 0.5),
    Math.round(duplicateAxisMax * 0.75),
    duplicateAxisMax,
  ];
  const duplicateChartPoints = duplicateHistory.map((snapshot, index) => {
    const x =
      chartPadding.left +
      (duplicateHistory.length === 1
        ? chartInnerWidth / 2
        : (chartInnerWidth / (duplicateHistory.length - 1)) * index);
    const y =
      chartPadding.top +
      chartInnerHeight -
      (chartInnerHeight * snapshot.duplicates) / duplicateAxisMax;

    return {
      ...snapshot,
      x,
      y,
    };
  });
  const duplicateChartPath = duplicateChartPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

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
      <section className="race-panel race-panel--collection">
        <AlbumTabs
          albums={albums}
          isSearch={false}
          onSearch={openSearch}
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

        {history.length > 0 && (
          <section
            className="history-card history-card--duplicates"
            aria-labelledby="duplicate-history-heading"
          >
            <div className="team-standings__header">
              <p className="stage-label" id="duplicate-history-heading">
                Évolution des doubles
              </p>
              <span>{doubles} doubles au dernier snapshot</span>
            </div>

            <div className="history-chart">
              <svg
                aria-label="Évolution du nombre de doubles"
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
                {duplicateTicks.map((tick) => {
                  const y =
                    chartPadding.top +
                    chartInnerHeight -
                    (chartInnerHeight * tick) / duplicateAxisMax;

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
                        {tick}
                      </text>
                    </g>
                  );
                })}
                <polyline
                  className="history-line history-line--duplicates"
                  points={duplicateChartPath}
                />
                {duplicateChartPoints.map((point, index) => (
                  <g key={point.date}>
                    <circle
                      className="history-point history-point--duplicates"
                      cx={point.x}
                      cy={point.y}
                      r="5"
                    >
                      <title>
                        {formatSnapshotDate(point.date)}: {point.duplicates}{" "}
                        doubles
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
                <span>Doubles actuels</span>
                <strong>{doubles}</strong>
              </div>
              <div>
                <span>Dernière mise à jour</span>
                <strong>{formatSnapshotDate(historyEnd.date)}</strong>
              </div>
              <div>
                <span>Depuis le départ</span>
                <strong>
                  {duplicateGain >= 0 ? "+" : ""}
                  {duplicateGain} doubles
                </strong>
              </div>
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
                  const showNote =
                    chase.note &&
                    chase.note.trim().toLocaleLowerCase() !==
                      title.trim().toLocaleLowerCase();

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
                        {chase.collectedOn && (
                          <span className="chase-collected-on">
                            Obtenu le {formatSnapshotDate(chase.collectedOn)}
                          </span>
                        )}
                        {showNote && <em>{chase.note}</em>}
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
          <section className="hall-of-fame yearly-podium" aria-labelledby="favourite-cards-heading">
            <div className="section-heading section-heading--light">
              <div>
                <p className="stage-label">Podium de l’album</p>
                <h2 id="favourite-cards-heading">Mes cartes préférées</h2>
              </div>
              <span>Top 3 personnel</span>
            </div>

            <ol className="yearly-podium__list">
              {topCards.map((sticker) => {
                const title = String(sticker.Name).trim() || `Sticker ${sticker.Number}`;
                const details = [
                  String(sticker.Type).trim(),
                  String(sticker.Equipe).trim(),
                  String(sticker.Country).trim(),
                ].filter(Boolean);
                const image = String(sticker.Image ?? sticker.image ?? "").trim();

                return (
                  <li className={`hall-card hall-card--${sticker.rank}`} key={sticker.Number}>
                    <span className="hall-card__rank">#{sticker.rank}</span>
                    <StickerThumbnail src={image} />
                    <div className="hall-card__number">N° {sticker.Number}</div>
                    <div className="hall-card__copy">
                      <strong>{title}</strong>
                      {details.length > 0 && <small>{details.join(" · ")}</small>}
                      {sticker.collectedOn && (
                        <small className="hall-card__collected-on">
                          Obtenu le {formatSnapshotDate(sticker.collectedOn)}
                        </small>
                      )}
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
        <CountryRanking countries={topCountries} />
      </section>
    </main>
  );
}

export default App;
