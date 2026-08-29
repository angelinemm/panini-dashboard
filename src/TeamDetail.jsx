import { useEffect, useMemo, useState } from "react";
import { loadLatestAlbum } from "./album-loader.js";
import { getStickerCollectedOn } from "./collection-utils.js";
import StickerThumbnail from "./StickerThumbnail.jsx";
import {
  formatSnapshotDate,
  getStickerNumber,
  isFavourite,
  isOwned,
} from "./sticker-utils.js";
import { uiText } from "./ui-text.js";

export default function TeamDetail({ albums, onBack, onOpenAlbum, onOpenRider, team }) {
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picturesOnly, setPicturesOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all(albums.map(loadLatestAlbum))
      .then((loadedAlbums) => {
        if (!cancelled) {
          setCollection(loadedAlbums);
          setLoading(false);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [albums]);

  const stickers = useMemo(() => {
    const aliases = new Map(team.aliases.map((alias) => [alias.name, alias]));
    return collection
      .flatMap((album) => album.stickers
        .filter((sticker) => {
          const alias = aliases.get(String(sticker.Equipe ?? "").trim());
          return isOwned(sticker) && alias &&
            (!Array.isArray(alias.years) || alias.years.includes(album.year));
        })
        .map((sticker) => ({ album, sticker })))
      .sort((a, b) => b.album.year - a.album.year ||
        getStickerNumber(a.sticker).localeCompare(getStickerNumber(b.sticker), undefined, { numeric: true }));
  }, [collection, team]);

  const visibleStickers = picturesOnly
    ? stickers.filter(({ sticker }) => String(sticker.Image ?? sticker.image ?? "").trim())
    : stickers;

  if (loading || error) {
    return (
      <div className="dashboard-message" role={error ? "alert" : "status"}>
        <p className="eyebrow">{uiText.team.eyebrow}</p>
        <h1>{error ? uiText.messages.teamLoadError : uiText.common.loading}</h1>
        {error && <p>{error}</p>}
      </div>
    );
  }

  return (
    <article className="rider-detail country-detail team-detail">
      <button className="rider-detail__back" onClick={onBack} type="button">
        <span aria-hidden="true">←</span> {uiText.team.back}
      </button>
      <header className="country-detail__header">
        <p className="eyebrow">{uiText.team.eyebrow}</p>
        <h1>{team.name}</h1>
        <p>{uiText.team.summary(stickers.length, team.aliases.length)}</p>
      </header>

      {stickers.length === 0 ? (
        <p className="search-empty">{uiText.team.noStickers}</p>
      ) : (
        <section aria-labelledby="team-stickers-title">
          <div className="section-heading">
            <div><p className="stage-label">{uiText.team.collectionStage}</p><h2 id="team-stickers-title">{uiText.team.stickers}</h2></div>
            <div className="country-detail__filter">
              <span>{visibleStickers.length} {uiText.common.sticker(visibleStickers.length)}</span>
              <label>
                <input checked={picturesOnly} onChange={(event) => setPicturesOnly(event.target.checked)} type="checkbox" />
                <span>{uiText.team.picturesOnly}</span>
              </label>
            </div>
          </div>
          {visibleStickers.length === 0 ? (
            <p className="search-empty">{uiText.team.noPictures}</p>
          ) : <ul className="rider-appearances">
            {visibleStickers.map(({ album, sticker }) => {
              const name = String(sticker.Name ?? "").trim();
              const type = String(sticker.Type ?? "").trim();
              const image = String(sticker.Image ?? sticker.image ?? "").trim();
              const isRider = ["coureur", "coureuse"].includes(type.toLocaleLowerCase("fr"));
              const collectedOn = getStickerCollectedOn(sticker, album.history);
              return (
                <li key={`${album.id}-${getStickerNumber(sticker)}`}>
                  <div className="rider-appearance__sticker">
                    <StickerThumbnail src={image} />
                    {!image && <span>{uiText.common.stickerFallback(getStickerNumber(sticker))}</span>}
                  </div>
                  <div className="rider-appearance__details">
                    <div className="rider-appearance__title">
                      <strong>
                        {name && isRider ? <button className="country-detail__rider" onClick={() => onOpenRider(name)} type="button">{name}</button> : name || type || album.year}
                        {isFavourite(sticker) && <span aria-label={uiText.rider.favourite} className="rider-detail__favourite country-detail__favourite" role="img" title={uiText.rider.favourite}>★</span>}
                      </strong>
                      <b>{album.year} · {uiText.common.stickerNumber(getStickerNumber(sticker))}</b>
                    </div>
                    <span>{[type, sticker.Equipe].filter((value) => String(value ?? "").trim()).join(" · ")}</span>
                    <div className="rider-appearance__actions">
                      <span className={`search-result__status ${isOwned(sticker) ? "is-owned" : ""}`}>
                        {isOwned(sticker) ? (collectedOn ? uiText.rider.collectedOn(formatSnapshotDate(collectedOn)) : uiText.common.collected) : uiText.common.missing}
                      </span>
                      <button onClick={() => onOpenAlbum(album.id)} type="button">{uiText.common.openAlbum} <span aria-hidden="true">→</span></button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>}
        </section>
      )}
    </article>
  );
}
