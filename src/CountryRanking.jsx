import { uiText } from "./ui-text.js";

const countryFlags = {
  AUS: "🇦🇺", AUT: "🇦🇹", BEL: "🇧🇪", BRA: "🇧🇷", CAN: "🇨🇦",
  COL: "🇨🇴", CZE: "🇨🇿", DEN: "🇩🇰", ECU: "🇪🇨", ERI: "🇪🇷",
  ESP: "🇪🇸", FRA: "🇫🇷", GBR: "🇬🇧", GER: "🇩🇪", HUN: "🇭🇺",
  IRL: "🇮🇪", ITA: "🇮🇹", KAZ: "🇰🇿", LAT: "🇱🇻", LVA: "🇱🇻",
  MEX: "🇲🇽", MRI: "🇲🇺", NED: "🇳🇱", NOR: "🇳🇴", NZL: "🇳🇿",
  POL: "🇵🇱", POR: "🇵🇹", SUI: "🇨🇭", SVN: "🇸🇮", USA: "🇺🇸",
};

export default function CountryRanking({ countries, onOpenCountry }) {
  if (countries.length === 0) {
    return null;
  }

  return (
    <section className="country-ranking" aria-labelledby="countries-heading">
      <div className="section-heading">
        <div><p className="stage-label">{uiText.rankings.nations}</p><h2 id="countries-heading">{uiText.rankings.countriesTitle}</h2></div>
        <span>{uiText.rankings.countriesSubtitle}</span>
      </div>
      <ol className="country-ranking__list">
        {countries.map(({ country, count }, index) => (
          <li className="country-row" key={country}>
            <span className="country-row__rank">{index + 1}</span>
            <span className="country-row__flag" aria-hidden="true">
              {countryFlags[country] ?? "🌍"}
            </span>
            <strong>
              <a
                href={`?view=country&country=${encodeURIComponent(country)}`}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenCountry(country);
                }}
              >
                {uiText.countries[country] ?? country}
              </a>
            </strong>
            <div className="country-row__bar" aria-hidden="true">
              <span style={{ width: `${(count / countries[0].count) * 100}%` }} />
            </div>
            <span className="country-row__count">{count}<small> {uiText.common.sticker(count)}</small></span>
          </li>
        ))}
      </ol>
    </section>
  );
}
