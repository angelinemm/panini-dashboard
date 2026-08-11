const countryAlpha2 = {
  AUS: "AU", AUT: "AT", BEL: "BE", BRA: "BR", CAN: "CA", COL: "CO",
  CZE: "CZ", DEN: "DK", ECU: "EC", ERI: "ER", ESP: "ES", FRA: "FR",
  GBR: "GB", GER: "DE", HUN: "HU", IRL: "IE", ITA: "IT", KAZ: "KZ",
  LAT: "LV", LVA: "LV", MEX: "MX", MRI: "MU", NED: "NL", NOR: "NO",
  NZL: "NZ", POL: "PL", POR: "PT", SUI: "CH", SVN: "SI", USA: "US",
};

export const getCountryFlag = (country) => {
  const code = countryAlpha2[String(country ?? "").trim().toUpperCase()];

  if (!code) return "";

  return [...code]
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
};
