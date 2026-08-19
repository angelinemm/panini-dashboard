import { formatSnapshotDate, getDuplicateCount, getStickerNumber, isOwned } from "./sticker-utils.js";
import { uiText } from "./ui-text.js";
import { getExportAlbums } from "./collection-export-utils.js";

const stickerName = (sticker) => String(sticker.Name ?? "").trim()
  || uiText.common.stickerFallback(getStickerNumber(sticker));

export default function CollectionExport({ albums, summary }) {
  const startedAlbums = getExportAlbums(albums);

  return (
    <div className="collection-export" aria-hidden="true">
      <section className="collection-export__page collection-export__cover">
        <header className="collection-header">
          <div>
            <p className="eyebrow">{uiText.collection.eyebrow}</p>
            <h1>{uiText.collection.title}</h1>
            <p className="collection-header__intro">{uiText.collection.intro}</p>
          </div>
          <div className="race-badge">
            <span>{summary.percentage}%</span>
            <small>{uiText.collection.total}</small>
          </div>
        </header>
        <div className="collection-export__stats">
          <div><strong>{summary.albumCount}</strong><span>{uiText.collection.albums}</span></div>
          <div><strong>{summary.albumsCompleted}</strong><span>{uiText.collection.completed}</span></div>
          <div><strong>{summary.collected}</strong><span>{uiText.collection.collected}</span></div>
          <div><strong>{summary.missing}</strong><span>{uiText.collection.missing}</span></div>
        </div>
        <div className="section-heading collection-export__heading">
          <div><p className="stage-label">{uiText.collection.peloton}</p><h2>{uiText.collection.myAlbums}</h2></div>
          <span>{uiText.collection.equalWeight}</span>
        </div>
        <div className="album-card-grid collection-export__album-list">
          {startedAlbums.map((album) => (
            <article className="album-card" key={album.id}>
              <div className="album-card__top">
                <div><span>{uiText.collection.title}</span><strong>{album.year}</strong></div>
                <b>{album.percentage}%</b>
              </div>
              <div className="progress"><div style={{ width: `${album.percentage}%` }} /></div>
              <div className="album-card__footer">
                <span>{uiText.collection.ownedOfTotal(album.owned, album.total)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {startedAlbums.map((album) => {
        const ownedStickers = album.stickers.filter(isOwned);
        const lastSnapshot = album.history.at(-1);

        return (
          <section className="collection-export__page collection-export__album" key={album.id}>
            <header className="race-panel__header">
              <div>
                <p className="eyebrow">{album.title}</p>
                <h1>{album.year}</h1>
              </div>
              <div className="race-badge">
                <span>{album.percentage}%</span>
                <small>{uiText.album.completed}</small>
              </div>
            </header>
            <div className="route-card">
              <div className="route-card__copy">
                <p className="stage-label">{uiText.album.collectionStage}</p>
                <strong>{uiText.collection.ownedOfTotal(album.owned, album.total)}</strong>
              </div>
              <div className="progress"><div style={{ width: `${album.percentage}%` }} /></div>
              <div className="route-card__markers"><span>{uiText.album.start}</span><span>{uiText.album.finish}</span></div>
            </div>
            <div className="stats-grid collection-export__album-stats">
              <article className="stat stat--yellow"><span>{uiText.collection.collected}</span><strong>{album.owned}</strong><p>{album.percentage}%</p></article>
              <article className="stat stat--green"><span>{uiText.collection.missing}</span><strong>{album.missing}</strong><p>{album.total}</p></article>
              <article className="stat stat--polka"><span>{uiText.collection.startedOn}</span><strong className="collection-export__stat-date">{formatSnapshotDate(album.startedOn)}</strong><p>{album.history.length} {uiText.export.updates}</p></article>
              <article className="stat stat--white"><span>{uiText.album.currentDuplicates}</span><strong>{getDuplicateCount(album.stickers)}</strong><p>{lastSnapshot ? formatSnapshotDate(lastSnapshot.date) : ""}</p></article>
            </div>
            <section className="collection-export__sticker-card">
              <div className="section-heading">
                <div><p className="stage-label">{uiText.export.inventory}</p><h2>{uiText.export.collectedStickers}</h2></div>
                <span>{album.owned} / {album.total}</span>
              </div>
              <ol className="collection-export__stickers">
                {ownedStickers.map((sticker) => (
                  <li key={getStickerNumber(sticker)}>
                    <b>{getStickerNumber(sticker)}</b>
                    <span>{stickerName(sticker)}</span>
                  </li>
                ))}
              </ol>
            </section>
          </section>
        );
      })}
    </div>
  );
}
