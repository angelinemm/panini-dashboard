import { useEffect, useMemo, useState } from "react";
import {
  backfillSpecialStickers,
  formatSnapshotDate,
  getStickerNumber,
  parseStickerCsv,
} from "./sticker-utils.js";
import {
  getAlbumProgress,
  getCollectionSummary,
  resolveAllTimeFavourites,
} from "./collection-utils.js";
import StickerThumbnail from "./StickerThumbnail.jsx";
import { addStickerImages, loadStickerImages } from "./sticker-images.js";

const loadLatestAlbum = async (album) => {
  if (album.snapshots.length === 0) {
    return getAlbumProgress(album);
  }

  const snapshots = [...album.snapshots].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const [parsed, images] = await Promise.all([
    Promise.all(
      snapshots.map(async (snapshot) => {
        const response = await fetch(snapshot.file);
        if (!response.ok) {
          throw new Error(`Impossible de charger ${album.title}`);
        }
        return { ...snapshot, stickers: parseStickerCsv(await response.text()) };
      }),
    ),
    loadStickerImages(album.id),
  ]);
  const history = backfillSpecialStickers(parsed);
  const stickers = addStickerImages(history.at(-1)?.stickers ?? [], images);
  return getAlbumProgress(album, stickers, history);
};

const stickerTitle = (sticker) =>
  String(sticker.Name).trim() || `Sticker ${getStickerNumber(sticker)}`;

const parseJsonWithComments = (text) => {
  const withoutComments = text
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");

  return JSON.parse(withoutComments);
};

export default function CollectionDashboard({ albums, onOpenAlbum }) {
  const [albumProgress, setAlbumProgress] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      Promise.all(albums.map(loadLatestAlbum)),
      fetch("/all-time-favourites.jsonc")
        .then((response) => (response.ok ? response.text() : "[]"))
        .then(parseJsonWithComments)
        .catch(() => []),
    ])
      .then(([progress, favourites]) => {
        if (!cancelled) {
          setAlbumProgress(progress);
          setRanking(favourites);
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
  }, [albums]);

  const summary = useMemo(
    () => getCollectionSummary(albumProgress),
    [albumProgress],
  );
  const favourites = useMemo(
    () => resolveAllTimeFavourites(ranking, albumProgress),
    [ranking, albumProgress],
  );

  if (loading || error) {
    return (
      <div className="dashboard-message" role={error ? "alert" : "status"}>
        <p className="eyebrow">Collection Panini</p>
        <h1>{error ? "Impossible de charger la collection" : "Chargement…"}</h1>
        {error && <p>{error}</p>}
      </div>
    );
  }

  return (
    <>
      <header className="collection-header">
        <div>
          <p className="eyebrow">Ma collection Panini</p>
          <h1>Tour de France</h1>
          <p className="collection-header__intro">
            Tous les albums, une seule ligne d’arrivée.
          </p>
        </div>
        <div className="race-badge" aria-label={`${summary.percentage}% complété`}>
          <span>{summary.percentage}%</span>
          <small>au total</small>
        </div>
      </header>

      <div className="collection-stats" aria-label="Résumé de la collection">
        <div><strong>{summary.albumCount}</strong><span>albums</span></div>
        <div><strong>{summary.albumsCompleted}</strong><span>terminés</span></div>
        <div><strong>{summary.collected}</strong><span>collectés</span></div>
        <div><strong>{summary.missing}</strong><span>manquants</span></div>
      </div>

      <section className="album-overview" aria-labelledby="albums-heading">
        <div className="section-heading">
          <div><p className="stage-label">Le peloton</p><h2 id="albums-heading">Mes albums</h2></div>
          <span>Chaque année compte autant</span>
        </div>
        <div className="album-card-grid">
          {albumProgress.map((album) => (
            <article
              className={`album-card ${
                album.owned === 0 ? "album-card--not-started" : ""
              }`}
              key={album.id}
            >
              <div className="album-card__top">
                <div><span>Tour de France</span><strong>{album.year}</strong></div>
                <b>{album.owned === 0 ? "Pas commencé" : `${album.percentage}%`}</b>
              </div>
              <div className="progress" aria-label={`${album.percentage}% complété`}>
                <div style={{ width: `${album.percentage}%` }} />
              </div>
              {album.startedOn && (
                <p className="album-card__date">
                  {album.completedOn ? "Terminé le" : "Commencé le"}{" "}
                  {formatSnapshotDate(album.completedOn || album.startedOn)}
                </p>
              )}
              <div className="album-card__footer">
                <span>{album.owned} sur {album.total} stickers</span>
                <button type="button" onClick={() => onOpenAlbum(album.id)}>
                  Ouvrir l’album <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="hall-of-fame" aria-labelledby="hall-heading">
        <div className="section-heading section-heading--light">
          <div><p className="stage-label">Hall of Fame</p><h2 id="hall-heading">All-time Top 10</h2></div>
          <span>{favourites.length} sur 10 sélectionnés</span>
        </div>
        {favourites.length > 0 ? (
          <ol className="hall-grid">
            {favourites.map(({ album, collectedOn, rank, sticker }) => {
              const details = [sticker.Type, sticker.Equipe, sticker.Country]
                .map((value) => String(value ?? "").trim()).filter(Boolean);
              const image = String(sticker.Image ?? sticker.image ?? "").trim();
              return (
                <li className={`hall-card hall-card--${Math.min(rank, 4)}`} key={`${album.id}-${getStickerNumber(sticker)}`}>
                  <span className="hall-card__rank">#{rank}</span>
                  <span className="hall-card__year">{album.year}</span>
                  <StickerThumbnail src={image} />
                  <div className="hall-card__number">N° {getStickerNumber(sticker)}</div>
                  <div className="hall-card__copy">
                    <strong>{stickerTitle(sticker)}</strong>
                    {details.length > 0 && <small>{details.join(" · ")}</small>}
                    {collectedOn && (
                      <small className="hall-card__collected-on">
                        Obtenu le {formatSnapshotDate(collectedOn)}
                      </small>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="hall-empty">
            <span aria-hidden="true">★</span>
            <div><strong>Le podium attend ses légendes</strong><p>Ajoutez jusqu’à 10 références dans <code>all-time-favourites.jsonc</code>.</p></div>
          </div>
        )}
      </section>
    </>
  );
}
