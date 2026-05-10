export const COUNTRY_CURRENCY: Record<string, string> = {
  "Colombia":              "COP",
  "Estados Unidos":        "USD",
  "México":                "MXN",
  "Argentina":             "ARS",
  "Brasil":                "BRL",
  "Chile":                 "CLP",
  "Perú":                  "PEN",
  "Venezuela":             "VES",
  "Ecuador":               "USD",
  "Bolivia":               "BOB",
  "Paraguay":              "PYG",
  "Uruguay":               "UYU",
  "Costa Rica":            "CRC",
  "Guatemala":             "GTQ",
  "Honduras":              "HNL",
  "El Salvador":           "USD",
  "Nicaragua":             "NIO",
  "Panamá":                "USD",
  "República Dominicana":  "DOP",
  "Cuba":                  "CUP",
  "Canadá":                "CAD",
  "Jamaica":               "JMD",
  "Trinidad y Tobago":     "TTD",
  "Guyana":                "GYD",
  "Surinam":               "SRD",
  "Haití":                 "HTG",
  "Belice":                "BZD",
  "Bahamas":               "BSD",
};

export const CURRENCY_SYMBOL: Record<string, string> = {
  "COP": "$",
  "USD": "$",
  "MXN": "$",
  "ARS": "$",
  "BRL": "R$",
  "CLP": "$",
  "PEN": "S/",
  "VES": "Bs.S",
  "BOB": "Bs.",
  "PYG": "₲",
  "UYU": "$U",
  "CRC": "₡",
  "GTQ": "Q",
  "HNL": "L",
  "NIO": "C$",
  "DOP": "$",
  "CUP": "$",
  "CAD": "CA$",
  "JMD": "J$",
  "TTD": "TT$",
  "GYD": "G$",
  "SRD": "$",
  "HTG": "G",
  "BZD": "BZ$",
  "BSD": "$",
};

export function getCurrencyForCountry(pais: string): string {
  return COUNTRY_CURRENCY[pais] ?? "COP";
}

export function formatPrice(amount: number, currency: string): string {
  const locale =
    currency === "BRL" ? "pt-BR" :
    currency === "USD" || currency === "CAD" ? "en-US" :
    "es-CO";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function priceLabel(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? "$";
  return `${symbol}${formatPrice(amount, currency)} ${currency}`;
}
