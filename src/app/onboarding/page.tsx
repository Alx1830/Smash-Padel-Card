"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CustomSelect } from "@/components/ui/custom-select";
import { POKEMON_SERIES } from "@/data/pokemon-sets";
import { CITIES_BY_COUNTRY } from "@/data/cities";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK1  = "#c9cfdd";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

// ── Data ─────────────────────────────────────────────────────────────────────

const SET_OPTS = POKEMON_SERIES.flatMap(series =>
  series.sets.map(set => ({ value: set.id, label: `${series.name} — ${set.name}` }))
);

const ENERGIA_OPTS = [
  { value: "🍃 Planta",          label: "🍃 Planta" },
  { value: "🔥 Fuego",           label: "🔥 Fuego" },
  { value: "💧 Agua",            label: "💧 Agua" },
  { value: "⚡ Eléctrica/Rayo",  label: "⚡ Eléctrica/Rayo" },
  { value: "🔮 Psíquica",        label: "🔮 Psíquica" },
  { value: "🥊 Lucha",           label: "🥊 Lucha" },
  { value: "🖤 Oscuridad",       label: "🖤 Oscuridad" },
  { value: "⚔️ Metal",           label: "⚔️ Metal" },
  { value: "🐉 Dragón",          label: "🐉 Dragón" },
  { value: "🧚 Hada",            label: "🧚 Hada" },
];

const TIPO_PERFIL_OPTS = [
  { value: "Inversionista",        label: "Inversionista" },
  { value: "Coleccionista",        label: "Coleccionista" },
  { value: "Jugador TCG",          label: "Jugador TCG" },
  { value: "Creador de Contenido", label: "Creador de Contenido" },
  { value: "Tienda Pokémon",       label: "Tienda Pokémon" },
];

const POKEMON_OPTS = [
  "Abomasnow","Abra","Absol","Accelgor","Aegislash","Aerodactyl","Aggron","Aipom","Alakazam","Alcremie",
  "Alomomola","Altaria","Amaura","Ambipom","Amoonguss","Annihilape","Anorith","Appletun","Applin","Araquanid",
  "Arbok","Arboliva","Arcanine","Arceus","Archen","Archeops","Archaludon","Arctibax","Arctovish","Arctozolt",
  "Ariados","Armarouge","Armaldo","Aromatisse","Aron","Arrokuda","Articuno","Axew","Azelf","Azumarill",
  "Azurill","Bagon","Baltoy","Banette","Barbaracle","Barboach","Barraskewda","Basculegion","Basculin","Bastiodon",
  "Baxcalibur","Bayleef","Beartic","Beautifly","Beedrill","Beheeyem","Beldum","Bellibolt","Bellossom","Bellsprout",
  "Bergmite","Bewear","Bibarel","Bidoof","Binacle","Bisharp","Blacephalon","Blastoise","Blaziken","Blipbug",
  "Blissey","Blitzle","Boldore","Boltund","Bombirdier","Bonsly","Bouffalant","Bounsweet","Braixen","Bramblin",
  "Brambleghast","Braviary","Breloom","Brionne","Bronzong","Bronzor","Brute Bonnet","Bruxish","Budew","Buizel",
  "Bulbasaur","Buneary","Bunnelby","Burmy","Butterfree","Buzzwole","Cacnea","Cacturne","Calyrex","Camerupt",
  "Capsakid","Carbink","Carripace","Carracosta","Carvanha","Cascoon","Castform","Caterpie","Celebi","Centiskorch",
  "Ceruledge","Cetitan","Cetoddle","Chandelure","Chansey","Charcadet","Charizard","Charmander","Charmeleon",
  "Chatot","Cherrim","Cherubi","Chesnaught","Chespin","Chi Yu","Chien Pao","Chikorita","Chimchar","Chimecho",
  "Chinchou","Cinderace","Clamperl","Clauncher","Clawitzer","Claydol","Clefable","Clefairy","Cleffa",
  "Clobbopus","Clodsire","Cloyster","Coalossal","Cobalion","Cofagrigus","Combee","Combusken","Comfey","Conkeldurr",
  "Copperajah","Corvisquire","Corviknight","Corsola","Cottonee","Crabominable","Crabrawler","Cradily","Cramorant","Cranidos",
  "Crawdaunt","Cresselia","Croagunk","Crobat","Crocalor","Croconaw","Crustle","Cryogonal","Cubchoo","Cubone",
  "Cufant","Cursola","Cutiefly","Cyndaquil","Darkrai","Darmanitan","Dartrix","Darumaka","Decidueye","Dedenne",
  "Deerling","Deino","Delcatty","Delibird","Delphox","Deoxys","Dewgong","Dewpider","Dewott","Dialga",
  "Diancie","Diglett","Dipplin","Ditto","Dodrio","Doduo","Donphan","Dondozo","Dottler","Doublade",
  "Dracovish","Dracozolt","Dragapult","Dragonair","Dragonite","Drakloak","Drampa","Dreepy","Drifblim","Drifloon",
  "Drilbur","Drizzile","Drowzee","Druddigon","Dubwool","Ducklett","Dugtrio","Dunsparce","Duosion","Duraludon",
  "Durant","Dusclops","Dusknoir","Duskull","Dustox","Dwebble","Eevee","Eiscue","Ekans","Eldegoss",
  "Electabuzz","Electivire","Electrike","Electrode","Elekid","Elgyem","Emboar","Emolga","Empoleon","Enamorus",
  "Entei","Escavalier","Espathra","Espeon","Espurr","Eternatus","Exeggcute","Exeggutor","Exploud","Falinks",
  "Farigiraf","Farfetchd","Fearow","Feebas","Fennekin","Feraligatr","Ferroseed","Ferrothorn","Fidough","Finizen",
  "Finneon","Flaaffy","Flapple","Flareon","Fletchinder","Fletchling","Flittle","Floatzel","Floette","Florges",
  "Floragato","Flygon","Fomantis","Foongus","Forretress","Fraxure","Frigibax","Frillish","Froakie","Frogadier",
  "Froslass","Frosmoth","Fuecoco","Furret","Furfrou","Gabite","Gallade","Galvantula","Garbodor","Garchomp",
  "Gardevoir","Garganacl","Gastly","Gastrodon","Genesect","Gengar","Geodude","Gholdengo","Gible","Gigalith",
  "Gimmighoul","Girafarig","Giratina","Glaceon","Glalie","Glameow","Glastrier","Gligar","Gliscor","Glimmet",
  "Glimmora","Gloom","Gogoat","Golduck","Golem","Golett","Golurk","Goodra","Goomy","Gorebyss",
  "Gossifleur","Gothita","Gothitelle","Gothorita","Gouging Fire","Gourgeist","Grafaiai","Granbull","Grapploct","Graveler",
  "Great Tusk","Greavard","Greedent","Greninja","Grimer","Grimsnarl","Grookey","Grotle","Groudon","Grovyle",
  "Growlithe","Grubbin","Grumpig","Gulpin","Gumshoos","Gurdurr","Guzzlord","Gyarados","Hakamo o","Happiny",
  "Hariyama","Hattrem","Hatterene","Haunter","Hawlucha","Haxorus","Heatmor","Heatran","Heliolisk","Helioptile",
  "Heracross","Herdier","Hippopotas","Hippowdon","Hitmonchan","Hitmonlee","Hitmontop","Honchkrow","Honedge","Ho Oh",
  "Hoopa","Hoothoot","Hoppip","Horsea","Houndoom","Houndour","Houndstone","Hydreigon","Hypno","Igglybuff",
  "Illumise","Impidimp","Incineroar","Indeedee","Infernape","Inkay","Inteleon","Iron Bundle","Iron Hands","Iron Jugulis",
  "Iron Leaves","Iron Moth","Iron Thorns","Iron Valiant","Ivysaur","Jangmo o","Jellicent","Jigglypuff","Jirachi","Jolteon",
  "Joltik","Jumpluff","Jynx","Kabuto","Kabutops","Kadabra","Kakuna","Kangaskhan","Karrablast","Kartana",
  "Kecleon","Keldeo","Kingambit","Kingdra","Kingler","Kirlia","Klang","Kleavor","Klefki","Klink",
  "Klinklang","Koffing","Komala","Kommo o","Koraidon","Krabby","Kricketot","Kricketune","Krokorok","Krookodile",
  "Kyogre","Kyurem","Lairon","Lampent","Landorus","Lanturn","Lapras","Larvitar","Latias","Latios",
  "Leafeon","Leavanny","Lechonk","Ledian","Ledyba","Lickilicky","Lickitung","Liepard","Lileep","Lilligant",
  "Lillipup","Linoone","Litleo","Litten","Lokix","Lombre","Lopunny","Lotad","Loudred","Lucario",
  "Ludicolo","Lugia","Lumineon","Lunala","Lunatone","Lurantis","Luvdisc","Luxio","Luxray","Lycanroc",
  "Mabosstiff","Machamp","Machoke","Machop","Magby","Magcargo","Magearna","Magikarp","Magmar","Magmortar",
  "Magnemite","Magneton","Magnezone","Makuhita","Malamar","Mamoswine","Manaphy","Mandibuzz","Manectric","Mankey",
  "Mantine","Mantyke","Maractus","Mareanie","Mareep","Marill","Marowak","Marshadow","Marshtomp","Maschiff",
  "Masquerain","Maushold","Mawile","Medicham","Meditite","Meganium","Melmetal","Meltan","Meowscarada","Meowth",
  "Mesprit","Metagross","Metang","Metapod","Mew","Mewtwo","Mienfoo","Mienshao","Mightyena","Milcery",
  "Milotic","Miltank","Mime Jr","Mimikyu","Minior","Minccino","Minun","Miraidon","Misdreavus","Mismagius",
  "Moltres","Monferno","Morelull","Morgrem","Morpeko","Mothim","Mr Mime","Mr Rime","Mudbray","Mudkip",
  "Mudsdale","Muk","Munchlax","Munna","Murkrow","Musharna","Nacli","Naclstack","Nagadel","Natu",
  "Necrozma","Nickit","Nidoking","Nidoqueen","Nidoran","Nidorina","Nidorino","Nihilego","Ninjask","Noctowl",
  "Noibat","Noivern","Nosepass","Numel","Nuzleaf","Obstagoon","Octillery","Oddish","Ogerpon","Oinkologne",
  "Okidogi","Omanyte","Omastar","Onix","Oranguru","Orbeetle","Oricorio","Orthworm","Oshawott","Overqwil",
  "Palkia","Palossand","Palpitoad","Pancham","Pangoro","Panpour","Pansage","Pansear","Paras","Parasect",
  "Passimian","Patrat","Pawmi","Pawmo","Pawmot","Pawniard","Pecharunt","Pelipper","Perrserker","Persian",
  "Phanpy","Phantump","Pheromosa","Phione","Pichu","Pidgeot","Pidgeotto","Pidgey","Pidove","Pignite",
  "Pikachu","Pikipek","Piloswine","Pincurchin","Pineco","Pinsir","Piplup","Politoed","Poliwag","Poliwhirl",
  "Poliwrath","Poltchageist","Polteageist","Ponyta","Poochyena","Poipole","Popplio","Porygon","Porygon2","Porygon Z",
  "Primarina","Primeape","Prinplup","Probopass","Psyduck","Pumpkaboo","Pupitar","Purrloin","Purugly","Pyroar",
  "Pyukumuku","Quagsire","Quaquaval","Quaxly","Quaxwell","Quilava","Quilladin","Qwilfish","Raboot","Rabsca",
  "Raichu","Raikou","Ralts","Rampardos","Rapidash","Raticate","Rattata","Rayquaza","Regice","Regidrago",
  "Regieleki","Regigigas","Regirock","Registeel","Relicanth","Rellor","Remoraid","Reshiram","Reuniclus","Revavroom",
  "Rhydon","Rhyhorn","Rhyperior","Ribombee","Rillaboom","Riolu","Roaring Moon","Rockruff","Roggenrola","Rookidee",
  "Roselia","Roserade","Rotom","Rowlet","Rufflet","Runerigus","Sableye","Salamence","Salandit","Salazzle",
  "Samurott","Sandaconda","Sandile","Sandshrew","Sandslash","Sandy Shocks","Sandygast","Sawk","Sawsbuck","Scatterbug",
  "Sceptile","Scizor","Scolipede","Scorbunny","Scovillain","Scrafty","Scraggy","Scream Tail","Scyther","Seadra",
  "Seaking","Sealeo","Seedot","Seel","Seismitoad","Sentret","Serperior","Servine","Seviper","Sewaddle",
  "Sharpedo","Shaymin","Shedinja","Shelgon","Shellder","Shellos","Shelmet","Shieldon","Shiftry","Shiinotic",
  "Shinx","Shroodle","Shroomish","Shuckle","Shuppet","Sigilyph","Silcoon","Silicobra","Silvally","Simipour",
  "Simisage","Simisear","Sinistea","Sinistcha","Sirfetchd","Sizzlipede","Skarmory","Skiddo","Skiploom","Skrelp",
  "Skuntank","Skwovet","Slaking","Slakoth","Sliggoo","Slither Wing","Slowbro","Slowking","Slowpoke","Slugma",
  "Slurpuff","Smeargle","Smoliv","Smoochum","Sneasel","Sneasler","Snivy","Snom","Snorlax","Snorunt",
  "Snover","Snubbull","Sobble","Solgaleo","Solosis","Solrock","Spearow","Spectrier","Spewpa","Spheal",
  "Spidops","Spinarak","Spinda","Spiritomb","Spoink","Sprigatito","Spritzee","Squawkabilly","Squirtle","Stakataka",
  "Stantler","Staraptor","Staravia","Starly","Starmie","Staryu","Steelix","Steenee","Stonjourner","Stoutland",
  "Stufful","Stunfisk","Stunky","Sudowoodo","Suicune","Sunflora","Sunkern","Surskit","Swablu","Swadloon",
  "Swalot","Swampert","Swanna","Swellow","Swinub","Swirlix","Swoobat","Sylveon","Tadbulb","Taillow",
  "Talonflame","Tandemaus","Tangela","Tangrowth","Tapu Bulu","Tapu Fini","Tapu Koko","Tapu Lele","Tarountula","Tatsugiri",
  "Tauros","Teddiursa","Tentacool","Tentacruel","Tepig","Terapagos","Terrakion","Thievul","Throh","Thundurus",
  "Thwackey","Timburr","Ting Lu","Tirtouga","Toedscool","Toedscruel","Togedemaru","Togekiss","Togepi","Togetic",
  "Torchic","Torkoal","Tornadus","Torracat","Torterra","Totodile","Toucannon","Toxapex","Toxel","Toxtricity",
  "Tranquill","Trapinch","Treecko","Trevenant","Tropius","Trubbish","Trumbeak","Tsareena","Turtonator","Turtwig",
  "Tympole","Tynamo","Type Null","Tyranitar","Tyrantrum","Tyrogue","Tyrunt","Unfezant","Unown","Ursaluna",
  "Ursaring","Urshifu","Uxie","Vanillish","Vanillite","Vanilluxe","Vaporeon","Varoom","Veluza","Venomoth",
  "Venonat","Venusaur","Vespiquen","Vibrava","Victini","Victreebel","Vigoroth","Vikavolt","Vileplume","Virizion",
  "Vivillon","Volbeat","Volcanion","Volcarona","Voltorb","Vullaby","Vulpix","Wailmer","Wailord","Walking Wake",
  "Walrein","Wartortle","Watchog","Wattrel","Weavile","Weedle","Weepinbell","Weezing","Whimsicott","Whirlipede",
  "Whiscash","Whismur","Wigglytuff","Wiglett","Wimpod","Wingull","Wishiwashi","Wo Chien","Wobbuffet","Woobat",
  "Wooloo","Wooper","Wormadam","Wugtrio","Wurmple","Wynaut","Xatu","Xerneas","Xurkitree","Yamask",
  "Yamper","Yanma","Yanmega","Yungoos","Yveltal","Zacian","Zamazenta","Zangoose","Zapdos","Zarude",
  "Zebstrika","Zekrom","Zeraora","Zigzagoon","Zoroark","Zorua","Zubat","Zweilous","Zygarde",
].map(p => ({ value: p, label: p }));

const PAISES_OPTS = [
  "Afganistán","Albania","Alemania","Andorra","Angola","Argentina","Armenia","Australia","Austria",
  "Azerbaiyán","Bahamas","Bahrein","Bangladesh","Barbados","Bélgica","Belice","Benín","Bielorrusia","Bolivia",
  "Bosnia y Herzegovina","Botsuana","Brasil","Brunéi","Bulgaria","Burkina Faso","Burundi","Bután","Cabo Verde",
  "Camboya","Camerún","Canadá","Catar","Chad","Chile","China","Chipre","Colombia","Comoras","Congo",
  "Corea del Norte","Corea del Sur","Costa de Marfil","Costa Rica","Croacia","Cuba","Dinamarca","Djibouti",
  "Dominica","Ecuador","Egipto","El Salvador","Emiratos Árabes Unidos","Eritrea","Eslovaquia","Eslovenia","España",
  "Estados Unidos","Estonia","Etiopía","Filipinas","Finlandia","Fiyi","Francia","Gabón","Gambia","Georgia",
  "Ghana","Granada","Grecia","Guatemala","Guinea","Guinea Ecuatorial","Guinea-Bisáu","Guyana","Haití","Honduras",
  "Hungría","India","Indonesia","Irak","Irán","Irlanda","Islandia","Islas Marshall","Islas Salomón","Israel",
  "Italia","Jamaica","Japón","Jordania","Kazajistán","Kenia","Kirguistán","Kiribati","Kuwait","Laos",
  "Lesoto","Letonia","Líbano","Liberia","Libia","Liechtenstein","Lituania","Luxemburgo","Madagascar","Malasia",
  "Malaui","Maldivas","Mali","Malta","Marruecos","Mauricio","Mauritania","México","Micronesia","Moldavia",
  "Mónaco","Mongolia","Montenegro","Mozambique","Myanmar","Namibia","Nauru","Nepal","Nicaragua","Níger",
  "Nigeria","Noruega","Nueva Zelanda","Omán","Países Bajos","Pakistán","Palaos","Palestina","Panamá",
  "Papúa Nueva Guinea","Paraguay","Perú","Polonia","Portugal","Reino Unido","República Centroafricana",
  "República Checa","República Democrática del Congo","República Dominicana","Ruanda","Rumania","Rusia","Samoa",
  "San Cristóbal y Nieves","San Marino","San Vicente y las Granadinas","Santa Lucía","Santo Tomé y Príncipe",
  "Senegal","Serbia","Seychelles","Sierra Leona","Singapur","Siria","Somalia","Sri Lanka","Suazilandia",
  "Sudáfrica","Sudán","Sudán del Sur","Suecia","Suiza","Surinam","Tailandia","Tanzania","Tayikistán",
  "Timor Oriental","Togo","Tonga","Trinidad y Tobago","Túnez","Turkmenistán","Turquía","Tuvalu","Ucrania",
  "Uganda","Uruguay","Uzbekistán","Vanuatu","Venezuela","Vietnam","Yemen","Yibuti","Zambia","Zimbabue",
].map(p => ({ value: p, label: p }));

// ── Helpers ──────────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

async function compressImage(file: File, maxPx = 480, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject("compress failed"),
        "image/webp",
        quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <label style={{
        display: "block", fontFamily: MONO, fontSize: "10px",
        letterSpacing: "0.15em", textTransform: "uppercase",
        color: INK2, marginBottom: "8px",
      }}>
        {label}
      </label>
      {children}
      {error && (
        <p style={{ fontFamily: MONO, fontSize: "10px", color: "#ff4f4f", margin: "6px 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: INK0, fontFamily: MONO, fontSize: "13px",
  outline: "none", boxSizing: "border-box",
  transition: "border-color 0.2s",
};

// ── Wizard state ──────────────────────────────────────────────────────────────

interface WizardForm {
  // Step 1
  first_name: string;
  last_name:  string;
  username:   string;
  // Step 2
  pais:        string;
  ciudad:      string;
  edad:        string;
  tipo_perfil: string;
  // Step 3
  pokemon_favorito: string;
  energia_favorita: string;
  set_favorito:     string;
  photo_url:        string;
}

const EMPTY: WizardForm = {
  first_name: "", last_name: "", username: "",
  pais: "", ciudad: "", edad: "", tipo_perfil: "",
  pokemon_favorito: "", energia_favorita: "", set_favorito: "", photo_url: "",
};

const TOTAL_STEPS = 3;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router  = useRouter();
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState<WizardForm>(EMPTY);
  const [errors, setErrors]       = useState<Partial<Record<keyof WizardForm, string>>>({});
  const [globalError, setGlobalError] = useState("");
  const [userId, setUserId]       = useState<string | null>(null);
  const [preview, setPreview]     = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking]   = useState(true); // checking session on mount

  // ── On mount: verify session & check if profile already complete ──────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);

      const { data: player } = await supabase
        .from("players")
        .select("username, first_name, last_name, pais, tipo_perfil")
        .eq("user_id", user.id)
        .maybeSingle();

      const complete =
        player?.username && player?.first_name && player?.last_name &&
        player?.pais && player?.tipo_perfil;

      if (complete) { router.replace("/dashboard"); return; }

      // Pre-fill if partial data exists
      if (player) {
        setForm(f => ({
          ...f,
          username:    player.username    ?? "",
          first_name:  player.first_name  ?? "",
          last_name:   player.last_name   ?? "",
          pais:        player.pais        ?? "",
          tipo_perfil: player.tipo_perfil ?? "",
        }));
      }

      setChecking(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Field setter ─────────────────────────────────────────────────────────
  function set<K extends keyof WizardForm>(field: K, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  // ── Photo handler ─────────────────────────────────────────────────────────
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const compressed = await compressImage(file);
      const path = `${userId}.webp`;
      const { error: storageError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: "image/webp" });
      if (storageError) { setGlobalError(`Error al subir foto: ${storageError.message}`); return; }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      setPreview(url);
      set("photo_url", url);
    } catch {
      setGlobalError("Error inesperado al procesar la foto.");
    } finally {
      setUploading(false);
    }
  }

  // ── Validation per step ───────────────────────────────────────────────────
  async function validateStep1(): Promise<boolean> {
    const errs: typeof errors = {};
    if (!form.first_name.trim())   errs.first_name = "El nombre es requerido.";
    if (!form.last_name.trim())    errs.last_name  = "El apellido es requerido.";
    const u = form.username.trim();
    if (!u) {
      errs.username = "El nombre de usuario es requerido.";
    } else if (!USERNAME_RE.test(u)) {
      errs.username = "Solo letras, números, - y _. Entre 3 y 20 caracteres.";
    } else {
      // Check uniqueness
      const { count } = await supabase
        .from("players")
        .select("user_id", { count: "exact", head: true })
        .eq("username", u)
        .neq("user_id", userId ?? "");
      if ((count ?? 0) > 0) errs.username = "Este nombre de usuario ya está en uso.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: typeof errors = {};
    if (!form.pais)       errs.pais       = "El país es requerido.";
    if (!form.tipo_perfil) errs.tipo_perfil = "El tipo de perfil es requerido.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  async function handleNext() {
    setGlobalError("");
    if (step === 1) {
      const ok = await validateStep1();
      if (ok) setStep(2);
    } else if (step === 2) {
      const ok = validateStep2();
      if (ok) setStep(3);
    }
  }

  function handleBack() {
    setErrors({});
    setStep(s => Math.max(1, s - 1));
  }

  // ── Final submit ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!userId) return;
    setGlobalError("");
    setSubmitting(true);
    const { error } = await supabase.from("players").upsert({
      user_id:          userId,
      username:         form.username.trim(),
      first_name:       form.first_name.trim(),
      last_name:        form.last_name.trim(),
      pais:             form.pais,
      ciudad:           form.ciudad || null,
      edad:             parseInt(form.edad) || null,
      tipo_perfil:      form.tipo_perfil,
      pokemon_favorito: form.pokemon_favorito || null,
      energia_favorita: form.energia_favorita || null,
      set_favorito:     form.set_favorito     || null,
      photo_url:        form.photo_url        || null,
    }, { onConflict: "user_id" });
    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        setErrors(e => ({ ...e, username: "Ese nombre de usuario ya fue tomado, elige otro." }));
        setStep(1);
      } else {
        setGlobalError(`Error al guardar: ${error.message}`);
      }
    } else {
      window.location.replace("/dashboard");
    }
  }

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div style={{
        minHeight: "100vh", background: BG0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <p style={{ fontFamily: MONO, fontSize: "12px", color: INK2, letterSpacing: "0.1em" }}>
          Cargando...
        </p>
      </div>
    );
  }

  // ── Progress bar ──────────────────────────────────────────────────────────
  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", background: BG0,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        width: "100%", maxWidth: "560px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px", padding: "40px 36px",
      }}>

        {/* Header */}
        <div style={{ marginBottom: "36px" }}>
          <div style={{
            fontFamily: MONO, fontSize: "10px", letterSpacing: "0.22em",
            textTransform: "uppercase", color: COURT, marginBottom: "10px",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <span style={{ width: "16px", height: "1px", background: COURT, display: "inline-block" }} />
            Bienvenido a FaceBinder
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: "28px", color: INK0, margin: "0 0 6px" }}>
            Configura tu perfil
          </h1>
          <p style={{ fontFamily: MONO, fontSize: "11px", color: INK2, margin: 0, lineHeight: 1.6 }}>
            Solo tomará un momento. Esta información personaliza tu experiencia en la plataforma.
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "10px",
          }}>
            <span style={{ fontFamily: MONO, fontSize: "10px", color: INK2 }}>
              Paso {step} de {TOTAL_STEPS}
            </span>
            <span style={{ fontFamily: MONO, fontSize: "10px", color: COURT }}>
              {step === 1 ? "Identidad" : step === 2 ? "Ubicación" : "Preferencias"}
            </span>
          </div>
          {/* Progress track */}
          <div style={{
            height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: "2px",
              background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
              width: `${progress === 0 ? 33 : progress}%`,
              transition: "width 0.4s ease",
            }} />
          </div>
          {/* Step dots */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: n <= step ? COURT : "rgba(255,255,255,0.12)",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
        </div>

        {/* ── STEP 1: Identidad ────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <Field label="Nombre" error={errors.first_name}>
                <input
                  style={inputStyle}
                  value={form.first_name}
                  onChange={e => set("first_name", e.target.value.replace(/[^a-záéíóúàèìòùäëïöüñA-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ\s]/g, ""))}
                  placeholder="Tu nombre"
                  autoFocus
                />
              </Field>
              <Field label="Apellido" error={errors.last_name}>
                <input
                  style={inputStyle}
                  value={form.last_name}
                  onChange={e => set("last_name", e.target.value.replace(/[^a-záéíóúàèìòùäëïöüñA-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÑ\s]/g, ""))}
                  placeholder="Tu apellido"
                />
              </Field>
            </div>
            <Field label="Nombre de usuario" error={errors.username}>
              <input
                style={inputStyle}
                value={form.username}
                onChange={e => set("username", e.target.value.replace(/\s/g, ""))}
                placeholder="ej. ash_ketchum"
                maxLength={20}
              />
              <p style={{ fontFamily: MONO, fontSize: "10px", color: "#ffc800", margin: "6px 0 0", lineHeight: 1.5 }}>
                Elige bien — una vez guardado no podrá cambiarse. Solo letras, números, - y _.
              </p>
            </Field>
          </div>
        )}

        {/* ── STEP 2: Ubicación y perfil ──────────────────────────────────── */}
        {step === 2 && (
          <div>
            <Field label="País" error={errors.pais}>
              <CustomSelect
                value={form.pais}
                onChange={v => { set("pais", v); set("ciudad", ""); }}
                options={PAISES_OPTS}
                placeholder="Seleccionar país"
              />
            </Field>
            <Field label="Ciudad (opcional)">
              {CITIES_BY_COUNTRY[form.pais] ? (
                <CustomSelect
                  value={form.ciudad}
                  onChange={v => set("ciudad", v)}
                  options={CITIES_BY_COUNTRY[form.pais].map((c: string) => ({ value: c, label: c }))}
                  placeholder="Seleccionar ciudad"
                />
              ) : (
                <input
                  style={inputStyle}
                  value={form.ciudad}
                  onChange={e => set("ciudad", e.target.value)}
                  placeholder="¿En qué ciudad estás?"
                />
              )}
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <Field label="Edad (opcional)">
                <input
                  style={inputStyle}
                  type="number" min="1" max="99"
                  value={form.edad}
                  onChange={e => set("edad", e.target.value)}
                  placeholder="Tu edad"
                />
              </Field>
              <Field label="Tipo de perfil" error={errors.tipo_perfil}>
                <CustomSelect
                  value={form.tipo_perfil}
                  onChange={v => set("tipo_perfil", v)}
                  options={TIPO_PERFIL_OPTS}
                  placeholder="Seleccionar tipo"
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preferencias Pokémon + foto ─────────────────────────── */}
        {step === 3 && (
          <div>
            {/* Foto (opcional) */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{
                fontFamily: MONO, fontSize: "10px", letterSpacing: "0.15em",
                textTransform: "uppercase", color: INK2, marginBottom: "12px",
              }}>
                Foto de perfil (opcional)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  style={{
                    width: "72px", height: "72px", borderRadius: "50%",
                    border: `2px solid ${COURT}55`, background: "rgba(255,255,255,0.05)",
                    overflow: "hidden", cursor: uploading ? "not-allowed" : "pointer",
                    position: "relative", flexShrink: 0,
                  }}
                >
                  {preview ? (
                    <Image src={preview} alt="Foto" fill style={{ objectFit: "cover" }} unoptimized />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: INK2 }}>
                      👤
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: "8px 16px", borderRadius: "8px",
                      background: uploading ? "rgba(255,255,255,0.06)" : `${COURT}22`,
                      border: `1px solid ${COURT}44`,
                      color: uploading ? INK2 : COURT,
                      fontFamily: MONO, fontSize: "11px",
                      cursor: uploading ? "not-allowed" : "pointer",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {uploading ? "Subiendo…" : preview ? "Cambiar foto" : "Subir foto"}
                  </button>
                  <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "6px 0 0", lineHeight: 1.5 }}>
                    JPG, PNG o WEBP · Se comprime automáticamente
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handlePhoto}
                  suppressHydrationWarning
                />
              </div>
            </div>

            <Field label="Pokémon favorito (opcional)">
              <CustomSelect
                value={form.pokemon_favorito}
                onChange={v => set("pokemon_favorito", v)}
                options={POKEMON_OPTS}
                placeholder="Buscar Pokémon..."
              />
            </Field>
            <Field label="Energía favorita (opcional)">
              <CustomSelect
                value={form.energia_favorita}
                onChange={v => set("energia_favorita", v)}
                options={ENERGIA_OPTS}
                placeholder="Seleccionar energía"
              />
            </Field>
            <Field label="Set favorito (opcional)">
              <CustomSelect
                value={form.set_favorito}
                onChange={v => set("set_favorito", v)}
                options={SET_OPTS}
                placeholder="Buscar set..."
              />
            </Field>
          </div>
        )}

        {/* Global error */}
        {globalError && (
          <p style={{ fontFamily: MONO, fontSize: "11px", color: "#ff4f4f", margin: "0 0 16px", lineHeight: 1.5 }}>
            {globalError}
          </p>
        )}

        {/* Navigation buttons */}
        <div style={{
          display: "flex", gap: "12px", marginTop: "8px",
          justifyContent: step === 1 ? "flex-end" : "space-between",
        }}>
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              style={{
                padding: "11px 24px", borderRadius: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: INK1, fontFamily: MONO, fontSize: "12px",
                cursor: "pointer", letterSpacing: "0.06em",
              }}
            >
              Atrás
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNext}
              style={{
                padding: "11px 28px", borderRadius: "10px",
                background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
                border: "none", cursor: "pointer",
                fontFamily: MONO, fontSize: "12px", fontWeight: 700,
                color: BG0, letterSpacing: "0.08em",
              }}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploading}
              style={{
                padding: "11px 28px", borderRadius: "10px",
                background: submitting || uploading
                  ? "rgba(255,255,255,0.08)"
                  : `linear-gradient(90deg, ${COURT}, ${BALL})`,
                border: "none",
                cursor: submitting || uploading ? "not-allowed" : "pointer",
                fontFamily: MONO, fontSize: "12px", fontWeight: 700,
                color: submitting || uploading ? INK2 : BG0,
                letterSpacing: "0.08em", transition: "all 0.2s",
              }}
            >
              {submitting ? "Guardando…" : "Entrar al dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
