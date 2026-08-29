import { uiText } from "./ui-text.js";

export default function TeamRanking({ onOpenTeam, teams }) {
  if (teams.length === 0) {
    return null;
  }

  return (
    <section className="team-ranking" aria-labelledby="owned-teams-heading">
      <div className="section-heading">
        <div>
          <p className="stage-label">{uiText.rankings.teams}</p>
          <h2 id="owned-teams-heading">{uiText.rankings.teamsTitle}</h2>
        </div>
        <span>{uiText.rankings.teamsSubtitle}</span>
      </div>
      <ol className="team-ranking__list">
        {teams.map(({ count, id, name }, index) => (
          <li className="owned-team-row" key={id}>
            <span className="owned-team-row__rank">{index + 1}</span>
            <span className="owned-team-row__icon" aria-hidden="true">🚴</span>
            <strong>
              <a
                href={`?view=team&team=${encodeURIComponent(id)}`}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenTeam(id);
                }}
              >
                {name}
              </a>
            </strong>
            <div className="owned-team-row__bar" aria-hidden="true">
              <span style={{ width: `${(count / teams[0].count) * 100}%` }} />
            </div>
            <span className="owned-team-row__count">{count}<small> {uiText.common.sticker(count)}</small></span>
          </li>
        ))}
      </ol>
    </section>
  );
}
