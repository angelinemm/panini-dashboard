import { useEffect, useMemo, useState } from "react";
import { loadLatestAlbum } from "./album-loader.js";
import { getStickerCollectedOn } from "./collection-utils.js";
import { getCountryFlag } from "./country-utils.js";
import StickerThumbnail from "./StickerThumbnail.jsx";
import { formatSnapshotDate, getStickerNumber, isOwned } from "./sticker-utils.js";

export default function RiderDetail({ albums, name, onBackToSearch, onOpenAlbum }) {
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const occurrences = useMemo(() => collection
    .flatMap((album) => album.stickers
      .filter((sticker) => String(sticker.Name ?? "").trim() === name)
      .map((sticker) => ({ album, sticker })))
    .sort((a, b) => b.album.year - a.album.year), [collection, name]);
  const latest = occurrences[0];
  const imageOccurrence = occurrences.find(({ sticker }) =>
    String(sticker.Image ?? sticker.image ?? "").trim(),
  );
  const image = String(
    imageOccurrence?.sticker.Image ?? imageOccurrence?.sticker.image ?? "",
  ).trim();
  const country = String(latest?.sticker.Country ?? "").trim();
  const flag = getCountryFlag(country);

  if (loading || error) {
    return (
      <div className="dashboard-message" role={error ? "alert" : "status"}>
        <p className="eyebrow">Fiche coureur</p>
        <h1>{error ? "Impossible de charger le coureur" : "Chargement…"}</h1>
        {error && <p>{error}</p>}
      </div>
    );
  }

  return (
    <article className="rider-detail">
      <button className="rider-detail__back" onClick={onBackToSearch} type="button">
        <span aria-hidden="true">←</span> Retour à la recherche
      </button>
      <header className="rider-detail__header">
        <div className="rider-detail__portrait" aria-hidden="true">
          <StickerThumbnail src={image} />
        </div>
        <div>
          <p className="eyebrow">Fiche coureur</p>
          <h1>{name} {flag && <span aria-label={`Pays : ${country}`} role="img">{flag}</span>}</h1>
          {latest && (
            <p>{[latest.sticker.Type, latest.sticker.Equipe, country].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      </header>

      {occurrences.length === 0 ? (
        <p className="search-empty">Aucune apparition connue.</p>
      ) : (
        <section aria-labelledby="appearances-title">
          <div className="section-heading">
            <div><p className="stage-label">Dans la collection</p><h2 id="appearances-title">Apparitions</h2></div>
            <span>{occurrences.length} album{occurrences.length > 1 ? "s" : ""}</span>
          </div>
          <ul className="rider-appearances">
            {occurrences.map(({ album, sticker }) => {
              const collectedOn = getStickerCollectedOn(sticker, album.history);
              return (
                <li key={`${album.id}-${getStickerNumber(sticker)}`}>
                  <strong>{album.year}</strong>
                  <div>
                    <b>N° {getStickerNumber(sticker)}</b>
                    <span>{[sticker.Type, sticker.Equipe, sticker.Country].filter((value) => String(value ?? "").trim()).join(" · ")}</span>
                  </div>
                  <span className={`search-result__status ${isOwned(sticker) ? "is-owned" : ""}`}>
                    {isOwned(sticker) ? (collectedOn ? `Collecté le ${formatSnapshotDate(collectedOn)}` : "Collecté") : "Manquant"}
                  </span>
                  <button onClick={() => onOpenAlbum(album.id)} type="button">Voir l’album <span aria-hidden="true">→</span></button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
