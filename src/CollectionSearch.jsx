import { useEffect, useMemo, useState } from "react";
import { loadLatestAlbum } from "./album-loader.js";
import { getCountryFlag } from "./country-utils.js";
import { searchStickersByName } from "./search-utils.js";
import { getStickerNumber, isOwned } from "./sticker-utils.js";
import StickerThumbnail from "./StickerThumbnail.jsx";
import { uiText } from "./ui-text.js";

export default function CollectionSearch({ albums, onOpenAlbum, onOpenRider }) {
  const [collection, setCollection] = useState([]);
  const [query, setQuery] = useState("");
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

    return () => {
      cancelled = true;
    };
  }, [albums]);

  const results = useMemo(
    () => searchStickersByName(collection, query),
    [collection, query],
  );
  const hasQuery = query.trim() !== "";

  if (loading || error) {
    return (
      <div className="dashboard-message" role={error ? "alert" : "status"}>
        <p className="eyebrow">{uiText.search.eyebrow}</p>
        <h1>{error ? uiText.messages.collectionLoadError : uiText.common.loading}</h1>
        {error && <p>{error}</p>}
      </div>
    );
  }

  return (
    <section className="collection-search" aria-labelledby="search-title">
      <header className="search-header">
        <p className="eyebrow">{uiText.search.collectionEyebrow}</p>
        <h1 id="search-title">{uiText.search.title}</h1>
        <p>{uiText.search.intro}</p>
      </header>

      <label className="search-field">
        <span>{uiText.search.fieldLabel}</span>
        <div>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" />
          </svg>
          <input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder={uiText.search.placeholder}
            type="search"
            value={query}
          />
        </div>
      </label>

      <div className="search-results" aria-live="polite">
        {!hasQuery && <p className="search-empty">{uiText.search.prompt}</p>}
        {hasQuery && results.length === 0 && (
          <p className="search-empty">{uiText.search.noResults(query.trim())}</p>
        )}
        {hasQuery && results.length > 0 && (
          <>
            <p className="search-count">{uiText.search.resultCount(results.length)}</p>
            <ul className="search-result-list">
              {results.map(({ name, occurrences }) => {
                const sortedOccurrences = [...occurrences].sort(
                  (a, b) => b.album.year - a.album.year,
                );
                const latestOccurrence = sortedOccurrences[0];
                const imageOccurrence = sortedOccurrences.find(({ sticker }) =>
                  String(sticker.Image ?? sticker.image ?? "").trim(),
                );
                const image = String(
                  imageOccurrence?.sticker.Image ?? imageOccurrence?.sticker.image ?? "",
                ).trim();
                const ownedCount = occurrences.filter(({ sticker }) => isOwned(sticker)).length;
                const country = String(latestOccurrence.sticker.Country ?? "").trim();
                const countryFlag = getCountryFlag(country);
                const albumDetails = sortedOccurrences
                  .map(({ album, sticker }) =>
                    uiText.search.albumOccurrence(album.year, getStickerNumber(sticker)),
                  )
                  .join(", ");
                return (
                  <li key={name}>
                    <div className="search-result__thumbnail" aria-hidden="true">
                      <StickerThumbnail src={image} />
                    </div>
                    <div className="search-result__copy">
                      <strong>
                        <a
                          href={`?view=rider&rider=${encodeURIComponent(name)}`}
                          onClick={(event) => {
                            event.preventDefault();
                            onOpenRider(name);
                          }}
                        >
                          {name}
                        </a>
                        {countryFlag && (
                          <span
                            aria-label={uiText.common.countryLabel(country)}
                            className="search-result__flag"
                            role="img"
                          >
                            {countryFlag}
                          </span>
                        )}
                      </strong>
                      <span>
                        {uiText.search.albums(occurrences.length)} {albumDetails}
                      </span>
                    </div>
                    <span className={`search-result__status ${ownedCount > 0 ? "is-owned" : ""}`}>
                      {occurrences.length > 1
                        ? uiText.search.collectedCount(ownedCount)
                        : ownedCount === 1 ? uiText.common.collected : uiText.common.missing}
                    </span>
                    <button type="button" onClick={() => onOpenAlbum(latestOccurrence.album.id)}>
                      {occurrences.length > 1 ? uiText.search.openLatestAlbum : uiText.common.openAlbum} <span aria-hidden="true">→</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
