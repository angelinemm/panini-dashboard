export default function RepeatedRiderRanking({ riders }) {
  if (riders.length === 0) {
    return null;
  }

  return (
    <section className="rider-ranking" aria-labelledby="repeated-riders-heading">
      <div className="section-heading">
        <div>
          <p className="stage-label">{uiText.rankings.regulars}</p>
          <h2 id="repeated-riders-heading">{uiText.rankings.ridersTitle}</h2>
        </div>
        <span>{uiText.rankings.ridersSubtitle}</span>
      </div>
      <ol className="rider-ranking__list">
        {riders.map(({ albumCount, name, years }, index) => (
          <li className="rider-row" key={name.toLocaleLowerCase("fr")}>
            <span className="rider-row__rank">{index + 1}</span>
            <strong>{name}</strong>
            <span className="rider-row__years">{years.join(" · ")}</span>
            <span className="rider-row__count">
              {albumCount}<small> {uiText.common.album(albumCount)}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
import { uiText } from "./ui-text.js";
