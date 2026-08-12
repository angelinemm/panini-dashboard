import { useEffect, useMemo, useState } from "react";
import {
  formatSnapshotDate,
  getStickerNumber,
} from "./sticker-utils.js";
import {
  getCollectionSummary,
  getTopRepeatedRiders,
  getTopRiderCountries,
  resolveAllTimeFavourites,
} from "./collection-utils.js";
import StickerThumbnail from "./StickerThumbnail.jsx";
import CountryRanking from "./CountryRanking.jsx";
import RepeatedRiderRanking from "./RepeatedRiderRanking.jsx";
import { loadLatestAlbum } from "./album-loader.js";
import { uiText } from "./ui-text.js";

const stickerTitle = (sticker) =>
  String(sticker.Name).trim() || uiText.common.stickerFallback(getStickerNumber(sticker));

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
  const topCountries = useMemo(
    () => getTopRiderCountries(albumProgress),
    [albumProgress],
  );
  const topRepeatedRiders = useMemo(
    () => getTopRepeatedRiders(albumProgress),
    [albumProgress],
  );

  if (loading || error) {
    return (
      <div className="dashboard-message" role={error ? "alert" : "status"}>
        <p className="eyebrow">{uiText.messages.collectionEyebrow}</p>
        <h1>{error ? uiText.messages.collectionLoadError : uiText.common.loading}</h1>
        {error && <p>{error}</p>}
      </div>
    );
  }

  return (
    <>
      <header className="collection-header">
        <div>
          <p className="eyebrow">{uiText.collection.eyebrow}</p>
          <h1>{uiText.collection.title}</h1>
          <p className="collection-header__intro">
            {uiText.collection.intro}
          </p>
        </div>
        <div className="race-badge" aria-label={uiText.common.percentageCompleted(summary.percentage)}>
          <span>{summary.percentage}%</span>
          <small>{uiText.collection.total}</small>
        </div>
      </header>

      <div className="collection-stats" aria-label={uiText.collection.summaryLabel}>
        <div><strong>{summary.albumCount}</strong><span>{uiText.collection.albums}</span></div>
        <div><strong>{summary.albumsCompleted}</strong><span>{uiText.collection.completed}</span></div>
        <div><strong>{summary.collected}</strong><span>{uiText.collection.collected}</span></div>
        <div><strong>{summary.missing}</strong><span>{uiText.collection.missing}</span></div>
      </div>

      <section className="album-overview" aria-labelledby="albums-heading">
        <div className="section-heading">
          <div><p className="stage-label">{uiText.collection.peloton}</p><h2 id="albums-heading">{uiText.collection.myAlbums}</h2></div>
          <span>{uiText.collection.equalWeight}</span>
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
                <div><span>{uiText.collection.title}</span><strong>{album.year}</strong></div>
                <b>{album.owned === 0 ? uiText.collection.notStarted : `${album.percentage}%`}</b>
              </div>
              <div className="progress" aria-label={uiText.common.percentageCompleted(album.percentage)}>
                <div style={{ width: `${album.percentage}%` }} />
              </div>
              {album.startedOn && (
                <p className="album-card__date">
                  {album.completedOn ? uiText.collection.finishedOn : uiText.collection.startedOn}{" "}
                  {formatSnapshotDate(album.completedOn || album.startedOn)}
                </p>
              )}
              <div className="album-card__footer">
                <span>{uiText.collection.ownedOfTotal(album.owned, album.total)}</span>
                <button type="button" onClick={() => onOpenAlbum(album.id)}>
                  {uiText.collection.openAlbum} <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="hall-of-fame" aria-labelledby="hall-heading">
        <div className="section-heading section-heading--light">
          <div><p className="stage-label">{uiText.collection.hallStage}</p><h2 id="hall-heading">{uiText.collection.hallTitle}</h2></div>
          <span>{uiText.collection.selectedOfTen(favourites.length)}</span>
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
                  <div className="hall-card__number">{uiText.common.stickerNumber(getStickerNumber(sticker))}</div>
                  <div className="hall-card__copy">
                    <strong>{stickerTitle(sticker)}</strong>
                    {details.length > 0 && <small>{details.join(" · ")}</small>}
                    {collectedOn && (
                      <small className="hall-card__collected-on">
                        {uiText.common.obtainedOn(formatSnapshotDate(collectedOn))}
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
            <div><strong>{uiText.collection.emptyHallTitle}</strong><p>{uiText.collection.emptyHallText} <code>all-time-favourites.jsonc</code>.</p></div>
          </div>
        )}
      </section>

      <CountryRanking countries={topCountries} />
      <RepeatedRiderRanking riders={topRepeatedRiders} />
    </>
  );
}
