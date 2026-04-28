"use client";

import { PlayerCard3D } from "./PlayerCard3D";
import { FollowButton } from "./FollowButton";

interface PlayerData {
  username:         string;
  firstName:        string;
  lastName:         string;
  pais:             string;
  tipoPerfil:       string;
  gimnasioPokemon:  string;
  ciudad:           string;
  pokemonFavorito:  string;
  edad:             number;
  energiaFavorita:  string;
  photoUrl?:        string;
  year?:            string;
  profileUserId?:   string;
  currentUserId?:   string | null;
}

const COURT = "#2ee6c1";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const BG0   = "#05070d";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

const FLAG: Record<string, string> = {
  "Afganistán":"🇦🇫","Albania":"🇦🇱","Alemania":"🇩🇪","Andorra":"🇦🇩","Angola":"🇦🇴",
  "Antigua y Barbuda":"🇦🇬","Arabia Saudita":"🇸🇦","Argelia":"🇩🇿","Argentina":"🇦🇷",
  "Armenia":"🇦🇲","Australia":"🇦🇺","Austria":"🇦🇹","Azerbaiyán":"🇦🇿","Bahamas":"🇧🇸",
  "Bahrein":"🇧🇭","Bangladesh":"🇧🇩","Barbados":"🇧🇧","Bélgica":"🇧🇪","Belice":"🇧🇿",
  "Benín":"🇧🇯","Bielorrusia":"🇧🇾","Bolivia":"🇧🇴","Bosnia y Herzegovina":"🇧🇦",
  "Botsuana":"🇧🇼","Brasil":"🇧🇷","Brunéi":"🇧🇳","Bulgaria":"🇧🇬","Burkina Faso":"🇧🇫",
  "Burundi":"🇧🇮","Bután":"🇧🇹","Cabo Verde":"🇨🇻","Camboya":"🇰🇭","Camerún":"🇨🇲",
  "Canadá":"🇨🇦","Catar":"🇶🇦","Chad":"🇹🇩","Chile":"🇨🇱","China":"🇨🇳","Chipre":"🇨🇾",
  "Colombia":"🇨🇴","Comoras":"🇰🇲","Congo":"🇨🇬","Corea del Norte":"🇰🇵",
  "Corea del Sur":"🇰🇷","Costa de Marfil":"🇨🇮","Costa Rica":"🇨🇷","Croacia":"🇭🇷",
  "Cuba":"🇨🇺","Dinamarca":"🇩🇰","Djibouti":"🇩🇯","Dominica":"🇩🇲","Ecuador":"🇪🇨",
  "Egipto":"🇪🇬","El Salvador":"🇸🇻","Emiratos Árabes Unidos":"🇦🇪","Eritrea":"🇪🇷",
  "Eslovaquia":"🇸🇰","Eslovenia":"🇸🇮","España":"🇪🇸","Estados Unidos":"🇺🇸",
  "Estonia":"🇪🇪","Etiopía":"🇪🇹","Filipinas":"🇵🇭","Finlandia":"🇫🇮","Fiyi":"🇫🇯",
  "Francia":"🇫🇷","Gabón":"🇬🇦","Gambia":"🇬🇲","Georgia":"🇬🇪","Ghana":"🇬🇭",
  "Granada":"🇬🇩","Grecia":"🇬🇷","Guatemala":"🇬🇹","Guinea":"🇬🇳",
  "Guinea Ecuatorial":"🇬🇶","Guinea-Bisáu":"🇬🇼","Guyana":"🇬🇾","Haití":"🇭🇹",
  "Honduras":"🇭🇳","Hungría":"🇭🇺","India":"🇮🇳","Indonesia":"🇮🇩","Irak":"🇮🇶",
  "Irán":"🇮🇷","Irlanda":"🇮🇪","Islandia":"🇮🇸","Islas Marshall":"🇲🇭",
  "Islas Salomón":"🇸🇧","Israel":"🇮🇱","Italia":"🇮🇹","Jamaica":"🇯🇲","Japón":"🇯🇵",
  "Jordania":"🇯🇴","Kazajistán":"🇰🇿","Kenia":"🇰🇪","Kirguistán":"🇰🇬","Kiribati":"🇰🇮",
  "Kuwait":"🇰🇼","Laos":"🇱🇦","Lesoto":"🇱🇸","Letonia":"🇱🇻","Líbano":"🇱🇧",
  "Liberia":"🇱🇷","Libia":"🇱🇾","Liechtenstein":"🇱🇮","Lituania":"🇱🇹",
  "Luxemburgo":"🇱🇺","Madagascar":"🇲🇬","Malasia":"🇲🇾","Malaui":"🇲🇼",
  "Maldivas":"🇲🇻","Mali":"🇲🇱","Malta":"🇲🇹","Marruecos":"🇲🇦","Mauricio":"🇲🇺",
  "Mauritania":"🇲🇷","México":"🇲🇽","Micronesia":"🇫🇲","Moldavia":"🇲🇩","Mónaco":"🇲🇨",
  "Mongolia":"🇲🇳","Montenegro":"🇲🇪","Mozambique":"🇲🇿","Myanmar":"🇲🇲",
  "Namibia":"🇳🇦","Nauru":"🇳🇷","Nepal":"🇳🇵","Nicaragua":"🇳🇮","Níger":"🇳🇪",
  "Nigeria":"🇳🇬","Noruega":"🇳🇴","Nueva Zelanda":"🇳🇿","Omán":"🇴🇲",
  "Países Bajos":"🇳🇱","Pakistán":"🇵🇰","Palaos":"🇵🇼","Palestina":"🇵🇸",
  "Panamá":"🇵🇦","Papúa Nueva Guinea":"🇵🇬","Paraguay":"🇵🇾","Perú":"🇵🇪",
  "Polonia":"🇵🇱","Portugal":"🇵🇹","Reino Unido":"🇬🇧","República Centroafricana":"🇨🇫",
  "República Checa":"🇨🇿","República Democrática del Congo":"🇨🇩",
  "República Dominicana":"🇩🇴","Ruanda":"🇷🇼","Rumania":"🇷🇴","Rusia":"🇷🇺",
  "Samoa":"🇼🇸","San Cristóbal y Nieves":"🇰🇳","San Marino":"🇸🇲",
  "San Vicente y las Granadinas":"🇻🇨","Santa Lucía":"🇱🇨",
  "Santo Tomé y Príncipe":"🇸🇹","Senegal":"🇸🇳","Serbia":"🇷🇸","Seychelles":"🇸🇨",
  "Sierra Leona":"🇸🇱","Singapur":"🇸🇬","Siria":"🇸🇾","Somalia":"🇸🇴",
  "Sri Lanka":"🇱🇰","Suazilandia":"🇸🇿","Sudáfrica":"🇿🇦","Sudán":"🇸🇩",
  "Sudán del Sur":"🇸🇸","Suecia":"🇸🇪","Suiza":"🇨🇭","Surinam":"🇸🇷",
  "Tailandia":"🇹🇭","Tanzania":"🇹🇿","Tayikistán":"🇹🇯","Timor Oriental":"🇹🇱",
  "Togo":"🇹🇬","Tonga":"🇹🇴","Trinidad y Tobago":"🇹🇹","Túnez":"🇹🇳",
  "Turkmenistán":"🇹🇲","Turquía":"🇹🇷","Tuvalu":"🇹🇻","Ucrania":"🇺🇦",
  "Uganda":"🇺🇬","Uruguay":"🇺🇾","Uzbekistán":"🇺🇿","Vanuatu":"🇻🇺",
  "Venezuela":"🇻🇪","Vietnam":"🇻🇳","Yemen":"🇾🇪","Yibuti":"🇩🇯",
  "Zambia":"🇿🇲","Zimbabue":"🇿🇼",
};

function flagLabel(pais: string) {
  const f = FLAG[pais];
  return f ? `${f} ${pais}` : pais || "—";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "9px 0",
      borderBottom: "1px dashed rgba(255,255,255,0.08)",
      gap: "6px", flexWrap: "wrap",
    }}>
      <span style={{ fontFamily: MONO, fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", color: INK2, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ color: INK2, fontSize: "12px", flexShrink: 0 }}>/</span>
      <span style={{ fontFamily: MONO, fontSize: "14px", color: INK0, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function ProfilePage({ player }: { player: PlayerData }) {
  const CARD_H     = 416 * 1.2;
  const COVER_H    = 460;
  const NEG_MARGIN = Math.round(CARD_H / 2);

  const paisLabel = flagLabel(player.pais);

  return (
    <div style={{ width: "100%" }}>

      {/* ══ COVER ══ */}
      <section id="cover" style={{ position: "relative", overflow: "hidden", isolation: "isolate" }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: -2,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 20%, rgba(46,230,193,0.28), transparent 60%),
            radial-gradient(ellipse 60% 40% at 85% 75%, rgba(255,79,216,0.22), transparent 70%),
            radial-gradient(ellipse 60% 40% at 15% 65%, rgba(79,240,255,0.18), transparent 70%),
            linear-gradient(180deg, #0a1320 0%, #060912 100%)
          `,
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: -1,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 80%)",
          animation: "gridPan 6s linear infinite",
        }} />

        {/* Desktop */}
        <div className="cover-desktop" style={{ height: `${COVER_H}px`, display: "none", position: "relative" }}>
          <div style={{ position: "absolute", top: "38%", left: "80px", transform: "translateY(-80%)", maxWidth: "520px", zIndex: 20 }}>
            <div style={{
              fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
              textTransform: "uppercase", color: COURT,
              display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "14px",
            }}>
              <span style={{ width: "22px", height: "1px", background: COURT, display: "inline-block" }} />
              PERFIL MAESTRO POKÉMON
            </div>
            <h1 style={{
              fontFamily: DISP, fontSize: "clamp(34px, 3.8vw, 52px)",
              lineHeight: 0.92, margin: 0, letterSpacing: "-0.02em", color: INK0,
              display: "flex", alignItems: "center", gap: "16px", flexWrap: "nowrap",
            }}>
              <span style={{ whiteSpace: "nowrap" }}>
                {player.firstName}{" "}
                <em style={{
                  fontStyle: "normal",
                  background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)",
                  WebkitBackgroundClip: "text", backgroundClip: "text",
                  WebkitTextFillColor: "transparent", color: "transparent",
                }}>
                  {player.lastName}
                </em>
              </span>
              {player.profileUserId && (
                <span style={{ fontSize: "0", lineHeight: 1, flexShrink: 0 }}>
                  <FollowButton profileUserId={player.profileUserId} currentUserId={player.currentUserId ?? null} />
                </span>
              )}
            </h1>
            <p style={{
              margin: "14px 0 0", color: INK1, fontFamily: MONO, fontSize: "13px",
              letterSpacing: "0.2em", textTransform: "uppercase",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: COURT, display: "inline-block", flexShrink: 0 }} />
              {player.tipoPerfil || "Maestro Pokémon"}
            </p>
          </div>

          <div style={{
            position: "absolute", top: "38%", right: "80px", transform: "translateY(-80%)",
            textAlign: "right", fontFamily: MONO, fontSize: "15px",
            letterSpacing: "0.15em", textTransform: "uppercase", color: INK2, lineHeight: 2.2, zIndex: 20,
          }}>
            <div>Energía Favorita / <b style={{ color: INK0 }}>{player.energiaFavorita || "—"}</b></div>
            <div>Gimnasio Favorito / <b style={{ color: INK0 }}>{player.gimnasioPokemon || "—"}</b></div>
            <div>Ciudad / <b style={{ color: INK0 }}>{player.ciudad || "—"}</b></div>
          </div>

          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 48px",
            background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
            fontFamily: MONO, fontSize: "11px", letterSpacing: "0.2em",
            textTransform: "uppercase", color: INK2,
          }}>
            <span>POKÉMON CARD COLLECTOR</span>
            <span>{paisLabel}</span>
          </div>
        </div>

        {/* Mobile */}
        <div className="cover-mobile" style={{ padding: "100px 24px 40px", display: "block" }}>
          <div style={{
            fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em",
            textTransform: "uppercase", color: COURT,
            display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
          }}>
            <span style={{ width: "18px", height: "1px", background: COURT, display: "inline-block" }} />
            PERFIL MAESTRO POKÉMON
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "clamp(36px, 10vw, 56px)", lineHeight: 0.92, margin: 0, letterSpacing: "-0.02em", color: INK0 }}>
            {player.firstName}{" "}
            <em style={{
              fontStyle: "normal",
              background: "linear-gradient(135deg, #4ff0ff, #2ee6c1, #d6ff3d)",
              WebkitBackgroundClip: "text", backgroundClip: "text",
              WebkitTextFillColor: "transparent", color: "transparent",
            }}>
              {player.lastName}
            </em>
          </h1>
          {player.profileUserId && (
            <div style={{ marginTop: "14px" }}>
              <FollowButton profileUserId={player.profileUserId} currentUserId={player.currentUserId ?? null} />
            </div>
          )}
          <p style={{
            margin: "12px 0 0", color: INK1, fontFamily: MONO, fontSize: "12px",
            letterSpacing: "0.2em", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: COURT, display: "inline-block", flexShrink: 0 }} />
            {player.tipoPerfil || "Maestro Pokémon"}
          </p>
          <div style={{
            marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "8px 24px",
            fontFamily: MONO, fontSize: "11px", letterSpacing: "0.1em",
            textTransform: "uppercase", color: INK2,
          }}>
            <span>Energía Favorita / <b style={{ color: INK0 }}>{player.energiaFavorita || "—"}</b></span>
            <span>Gimnasio Favorito / <b style={{ color: INK0 }}>{player.gimnasioPokemon || "—"}</b></span>
            <span>Ciudad / <b style={{ color: INK0 }}>{player.ciudad || "—"}</b></span>
          </div>
        </div>

        <style>{`
          @media (min-width: 768px) {
            .cover-desktop { display: block !important; }
            .cover-mobile  { display: none  !important; }
          }
        `}</style>
      </section>

      {/* ══ PROFILE DATA ══ */}
      <section id="profile" style={{ position: "relative", background: BG0 }}>

        {/* Desktop */}
        <div className="profile-desktop" style={{ display: "none", padding: "0 80px 80px" }}>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "64px",
            maxWidth: "1280px", margin: "0 auto",
            marginTop: `-${NEG_MARGIN}px`,
          }}>
            <div style={{ flexShrink: 0, paddingTop: "24px", position: "relative", zIndex: 10, width: "312px", height: "499px" }}>
              <div style={{ transform: "scale(1.2)", transformOrigin: "top left" }}>
                <PlayerCard3D
                  username={player.username}
                  firstName={player.firstName}
                  lastName={player.lastName}
                  position={player.tipoPerfil}
                  category={player.pais}
                  energiaFavorita={player.energiaFavorita}
                  photoUrl={player.photoUrl}
                />
              </div>
            </div>

            <div style={{ flex: 1, paddingTop: "20px" }}>
              <div style={{ marginBottom: "8px" }}>
                <h3 style={{ fontFamily: DISP, fontSize: "28px", letterSpacing: "-0.01em", margin: "0 0 24px", color: INK0 }}>
                  Perfil Maestro Pokémon
                </h3>
                <Row label="Pokémon Favorito"  value={player.pokemonFavorito || "—"} />
                <Row label="Edad"               value={player.edad ? `${player.edad} años` : "—"} />
                <Row label="Energía Favorita"   value={player.energiaFavorita || "—"} />
                <Row label="Tipo de Perfil"     value={player.tipoPerfil || "—"} />
                <Row label="País"               value={paisLabel} />
                <Row label="Gimnasio Favorito"  value={player.gimnasioPokemon || "—"} />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="profile-mobile" style={{ display: "block", padding: "40px 20px 64px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "48px" }}>
            <PlayerCard3D
              username={player.username}
              firstName={player.firstName}
              lastName={player.lastName}
              position={player.tipoPerfil}
              category={player.pais}
              energiaFavorita={player.energiaFavorita}
              photoUrl={player.photoUrl}
            />
          </div>
          <div style={{ width: "100%", height: "1px", marginBottom: "40px", background: "rgba(255,255,255,0.06)" }} />
          <h3 style={{ fontFamily: DISP, fontSize: "22px", letterSpacing: "-0.01em", margin: "0 0 16px", color: INK0 }}>
            Perfil Maestro Pokémon
          </h3>
          <Row label="Pokémon Favorito"  value={player.pokemonFavorito || "—"} />
          <Row label="Edad"               value={player.edad ? `${player.edad} años` : "—"} />
          <Row label="Energía Favorita"   value={player.energiaFavorita || "—"} />
          <Row label="Tipo de Perfil"     value={player.tipoPerfil || "—"} />
          <Row label="País"               value={paisLabel} />
          <Row label="Gimnasio Favorito"  value={player.gimnasioPokemon || "—"} />
        </div>

        <style>{`
          @media (min-width: 768px) {
            .profile-desktop { display: block !important; }
            .profile-mobile  { display: none  !important; }
          }
        `}</style>
      </section>
    </div>
  );
}
