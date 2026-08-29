import { useEffect, useMemo, useState } from "react";
import { loadLatestAlbum } from "./album-loader.js";
import { getStickerCollectedOn } from "./collection-utils.js";
import { getCountryFlag } from "./country-utils.js";
import StickerThumbnail from "./StickerThumbnail.jsx";
import {
  formatSnapshotDate,
  getStickerNumber,
  isFavourite,
  isOwned,
} from "./sticker-utils.js";
import { uiText } from "./ui-text.js";

export default function CountryDetail({ albums, country, onBack, onOpenAlbum, onOpenRider }) {
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

  const stickers = useMemo(() => collection
    .flatMap((album) => album.stickers
      .filter((sticker) => {
        const type = String(sticker.Type ?? "").trim().toLocaleLowerCase("fr");
        return (type === "coureur" || type === "coureuse") &&
          String(sticker.Country ?? "").trim().toUpperCase() === country;
      })
      .map((sticker) => ({ album, sticker })))
    .sort((a, b) => b.album.year - a.album.year ||
      String(a.sticker.Name ?? "").localeCompare(String(b.sticker.Name ?? ""), "fr")),
  [collection, country]);

  const countryName = uiText.countries[country] ?? country;
  const flag = getCountryFlag(country);
  const favouriteRiders = new Set(collection.flatMap((album) => album.stickers)
    .filter(isFavourite)
    .map((sticker) => String(sticker.Name ?? "").trim())
    .filter(Boolean));
  const visibleStickers = picturesOnly
    ? stickers.filter(({ sticker }) =>
      String(sticker.Image ?? sticker.image ?? "").trim(),
    )
    : stickers;

  if (loading || error) {
    return (
      <div className="dashboard-message" role={error ? "alert" : "status"}>
        <p className="eyebrow">{uiText.country.eyebrow}</p>
        <h1>{error ? uiText.messages.countryLoadError : uiText.common.loading}</h1>
        {error && <p>{error}</p>}
      </div>
    );
  }

  return (
    <article className="rider-detail country-detail">
      <button className="rider-detail__back" onClick={onBack} type="button">
        <span aria-hidden="true">←</span> {uiText.country.back}
      </button>
      <header className="country-detail__header">
        <p className="eyebrow">{uiText.country.eyebrow}</p>
        <h1>{flag && <span aria-hidden="true">{flag}</span>} {countryName}</h1>
        <p>{uiText.country.summary(stickers.length)}</p>
      </header>

      {stickers.length === 0 ? (
        <p className="search-empty">{uiText.country.noStickers}</p>
      ) : (
        <section aria-labelledby="country-stickers-title">
          <div className="section-heading">
            <div><p className="stage-label">{uiText.country.collectionStage}</p><h2 id="country-stickers-title">{uiText.country.stickers}</h2></div>
            <div className="country-detail__filter">
              <span>{visibleStickers.length} {uiText.common.sticker(visibleStickers.length)}</span>
              <label>
                <input
                  checked={picturesOnly}
                  onChange={(event) => setPicturesOnly(event.target.checked)}
                  type="checkbox"
                />
                <span>{uiText.country.picturesOnly}</span>
              </label>
            </div>
          </div>
          {visibleStickers.length === 0 ? (
            <p className="search-empty">{uiText.country.noPictures}</p>
          ) : <ul className="rider-appearances">
            {visibleStickers.map(({ album, sticker }) => {
              const name = String(sticker.Name ?? "").trim();
              const image = String(sticker.Image ?? sticker.image ?? "").trim();
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
                        {name ? <button className="country-detail__rider" onClick={() => onOpenRider(name)} type="button">{name}</button> : album.year}
                        {name && favouriteRiders.has(name) && (
                          <span
                            aria-label={uiText.rider.favourite}
                            className="rider-detail__favourite country-detail__favourite"
                            role="img"
                            title={uiText.rider.favourite}
                          >
                            ★
                          </span>
                        )}
                      </strong>
                      <b>{album.year} · {uiText.common.stickerNumber(getStickerNumber(sticker))}</b>
                    </div>
                    <span>{[sticker.Type, sticker.Equipe].filter((value) => String(value ?? "").trim()).join(" · ")}</span>
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
