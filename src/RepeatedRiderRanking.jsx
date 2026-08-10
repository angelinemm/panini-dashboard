export default function RepeatedRiderRanking({ riders }) {
  if (riders.length === 0) {
    return null;
  }

  return (
    <section className="rider-ranking" aria-labelledby="repeated-riders-heading">
      <div className="section-heading">
        <div>
          <p className="stage-label">Les habitués</p>
          <h2 id="repeated-riders-heading">Top 5 multi-albums</h2>
        </div>
        <span>Nombre d’albums où le coureur est collecté</span>
      </div>
      <ol className="rider-ranking__list">
        {riders.map(({ albumCount, name, years }, index) => (
          <li className="rider-row" key={name.toLocaleLowerCase("fr")}>
            <span className="rider-row__rank">{index + 1}</span>
            <strong>{name}</strong>
            <span className="rider-row__years">{years.join(" · ")}</span>
            <span className="rider-row__count">
              {albumCount}<small> album{albumCount > 1 ? "s" : ""}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
