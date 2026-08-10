const countryNames = {
  AUS: "Australie", AUT: "Autriche", BEL: "Belgique", BRA: "Brésil",
  CAN: "Canada", COL: "Colombie", CZE: "Tchéquie", DEN: "Danemark",
  ECU: "Équateur", ERI: "Érythrée", ESP: "Espagne", FRA: "France",
  GBR: "Royaume-Uni", GER: "Allemagne", HUN: "Hongrie", IRL: "Irlande",
  ITA: "Italie", KAZ: "Kazakhstan", LAT: "Lettonie", LVA: "Lettonie",
  MEX: "Mexique", MRI: "Maurice", NED: "Pays-Bas", NOR: "Norvège",
  NZL: "Nouvelle-Zélande", POL: "Pologne", POR: "Portugal", SUI: "Suisse",
  SVN: "Slovénie", USA: "États-Unis",
};

const countryFlags = {
  AUS: "🇦🇺", AUT: "🇦🇹", BEL: "🇧🇪", BRA: "🇧🇷", CAN: "🇨🇦",
  COL: "🇨🇴", CZE: "🇨🇿", DEN: "🇩🇰", ECU: "🇪🇨", ERI: "🇪🇷",
  ESP: "🇪🇸", FRA: "🇫🇷", GBR: "🇬🇧", GER: "🇩🇪", HUN: "🇭🇺",
  IRL: "🇮🇪", ITA: "🇮🇹", KAZ: "🇰🇿", LAT: "🇱🇻", LVA: "🇱🇻",
  MEX: "🇲🇽", MRI: "🇲🇺", NED: "🇳🇱", NOR: "🇳🇴", NZL: "🇳🇿",
  POL: "🇵🇱", POR: "🇵🇹", SUI: "🇨🇭", SVN: "🇸🇮", USA: "🇺🇸",
};

export default function CountryRanking({ countries }) {
  if (countries.length === 0) {
    return null;
  }

  return (
    <section className="country-ranking" aria-labelledby="countries-heading">
      <div className="section-heading">
        <div><p className="stage-label">Les nations</p><h2 id="countries-heading">Top 5 pays</h2></div>
        <span>Stickers de coureurs collectés</span>
      </div>
      <ol className="country-ranking__list">
        {countries.map(({ country, count }, index) => (
          <li className="country-row" key={country}>
            <span className="country-row__rank">{index + 1}</span>
            <span className="country-row__flag" aria-hidden="true">
              {countryFlags[country] ?? "🌍"}
            </span>
            <strong>{countryNames[country] ?? country}</strong>
            <div className="country-row__bar" aria-hidden="true">
              <span style={{ width: `${(count / countries[0].count) * 100}%` }} />
            </div>
            <span className="country-row__count">{count}<small> sticker{count > 1 ? "s" : ""}</small></span>
          </li>
        ))}
      </ol>
    </section>
  );
}
