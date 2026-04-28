"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { CustomSelect } from "@/components/ui/custom-select";

const COURT = "#2ee6c1";
const BALL  = "#d6ff3d";
const BG0   = "#05070d";
const INK0  = "#f5f7fb";
const INK2  = "#7a8298";
const MONO  = "var(--font-jetbrains)";
const DISP  = "var(--font-archivo)";

interface PerfilForm {
  username:         string;
  first_name:       string;
  last_name:        string;
  pais:             string;
  tipo_perfil:      string;
  ciudad:           string;
  edad:             string;
  energia_favorita: string;
  pokemon_favorito: string;
  gimnasio_pokemon: string;
  photo_url:        string;
}

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
      canvas.toBlob(blob => blob ? resolve(blob) : reject("compress failed"), "image/webp", quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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
  { value: "Inversionista",       label: "Inversionista" },
  { value: "Coleccionista",       label: "Coleccionista" },
  { value: "Jugador TCG",         label: "Jugador TCG" },
  { value: "Creador de Contenido",label: "Creador de Contenido" },
  { value: "Tienda Pokémon",      label: "Tienda Pokémon" },
];

const GIMNASIO_OPTS = [
  { value: "🪨 Ciudad Plateada - Roca - Brock",           label: "🪨 Ciudad Plateada - Roca - Brock" },
  { value: "💧 Ciudad Celeste - Agua - Misty",            label: "💧 Ciudad Celeste - Agua - Misty" },
  { value: "⚡ Ciudad Carmín - Eléctrico - Lt Surge",     label: "⚡ Ciudad Carmín - Eléctrico - Lt Surge" },
  { value: "🌿 Ciudad Azulona - Planta - Erika",          label: "🌿 Ciudad Azulona - Planta - Erika" },
  { value: "☠️ Ciudad Fucsia - Veneno - Koga",            label: "☠️ Ciudad Fucsia - Veneno - Koga" },
  { value: "🔮 Ciudad Azafrán - Psíquico - Sabrina",      label: "🔮 Ciudad Azafrán - Psíquico - Sabrina" },
  { value: "🔥 Isla Canela - Fuego - Blaine",             label: "🔥 Isla Canela - Fuego - Blaine" },
  { value: "🌍 Ciudad Verde - Tierra - Giovanni",         label: "🌍 Ciudad Verde - Tierra - Giovanni" },
  { value: "🐛 Pueblo Pirotín - Bicho - Araceli",         label: "🐛 Pueblo Pirotín - Bicho - Araceli" },
  { value: "🌿 Pueblo Altamía - Planta - Brais",          label: "🌿 Pueblo Altamía - Planta - Brais" },
  { value: "⚡ Ciudad Leudal - Eléctrico - e Nigma",      label: "⚡ Ciudad Leudal - Eléctrico - e Nigma" },
  { value: "💧 Ciudad Cántara - Agua - Fuco",             label: "💧 Ciudad Cántara - Agua - Fuco" },
  { value: "⚪ Pueblo Mezcla - Normal - Larry",           label: "⚪ Pueblo Mezcla - Normal - Larry" },
  { value: "👻 Pueblo Hozclada - Fantasma - Lima",        label: "👻 Pueblo Hozclada - Fantasma - Lima" },
  { value: "❄️ Sierra Napada - Hielo - Grusha",           label: "❄️ Sierra Napada - Hielo - Grusha" },
  { value: "🔮 Pueblo Alforno - Psíquico - Tulipa",       label: "🔮 Pueblo Alforno - Psíquico - Tulipa" },
  { value: "🌿 Pueblo Hoyuelo - Planta - Milo",           label: "🌿 Pueblo Hoyuelo - Planta - Milo" },
  { value: "💧 Pueblo Amura - Agua - Nesa",               label: "💧 Pueblo Amura - Agua - Nesa" },
  { value: "🐉 Ciudad Artejo - Dragón - Rayan",           label: "🐉 Ciudad Artejo - Dragón - Rayan" },
  { value: "🧚 Pueblo Plié - Hada - Opal",                label: "🧚 Pueblo Plié - Hada - Opal" },
  { value: "🥊 Pueblo Ladera - Lucha - Bea",              label: "🥊 Pueblo Ladera - Lucha - Bea" },
  { value: "👻 Pueblo Ladera - Fantasma - Alistair",      label: "👻 Pueblo Ladera - Fantasma - Alistair" },
  { value: "🪨 Pueblo Auriga - Roca - Gordy",             label: "🪨 Pueblo Auriga - Roca - Gordy" },
  { value: "❄️ Pueblo Auriga - Hielo - Mel",              label: "❄️ Pueblo Auriga - Hielo - Mel" },
  { value: "🐛 Ciudad Porcelana - Bicho - Camus",         label: "🐛 Ciudad Porcelana - Bicho - Camus" },
  { value: "⚡ Ciudad Mayólica - Eléctrico - Camila",     label: "⚡ Ciudad Mayólica - Eléctrico - Camila" },
  { value: "⚡ Ciudad Luminalia - Eléctrico - Clemont",   label: "⚡ Ciudad Luminalia - Eléctrico - Clemont" },
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
  "Capsakid","Carbink","Carripace","Carracosta","Carvanha","Cascoon","Castform","Caterpie","Celebi","Celesteel",
  "Centiskorch","Ceruledge","Cetitan","Cetoddle","Chandelure","Chansey","Charcadet","Charizard","Charmander","Charmeleon",
  "Chatot","Cherrim","Cherubi","Chesnaught","Chespin","Chi Yu","Chien Pao","Chikorita","Chimchar","Chimecho",
  "Chinchou","Chingling","Cinderace","Clamperl","Clauncher","Clawitzer","Claydol","Clefable","Clefairy","Cleffa",
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
  "Afganistán","Albania","Alemania","Andorra","Angola","Antigua y Barbuda","Arabia Saudita","Argelia","Argentina",
  "Armenia","Australia","Austria","Azerbaiyán","Bahamas","Bahrein","Bangladesh","Barbados","Bélgica","Belice",
  "Benín","Bielorrusia","Bolivia","Bosnia y Herzegovina","Botsuana","Brasil","Brunéi","Bulgaria","Burkina Faso",
  "Burundi","Bután","Cabo Verde","Camboya","Camerún","Canadá","Catar","Chad","Chile","China","Chipre",
  "Colombia","Comoras","Congo","Corea del Norte","Corea del Sur","Costa de Marfil","Costa Rica","Croacia","Cuba",
  "Dinamarca","Djibouti","Dominica","Ecuador","Egipto","El Salvador","Emiratos Árabes Unidos","Eritrea","Eslovaquia",
  "Eslovenia","España","Estados Unidos","Estonia","Etiopía","Filipinas","Finlandia","Fiyi","Francia","Gabón",
  "Gambia","Georgia","Ghana","Granada","Grecia","Guatemala","Guinea","Guinea Ecuatorial","Guinea-Bisáu","Guyana",
  "Haití","Honduras","Hungría","India","Indonesia","Irak","Irán","Irlanda","Islandia","Islas Marshall",
  "Islas Salomón","Israel","Italia","Jamaica","Japón","Jordania","Kazajistán","Kenia","Kirguistán","Kiribati",
  "Kuwait","Laos","Lesoto","Letonia","Líbano","Liberia","Libia","Liechtenstein","Lituania","Luxemburgo",
  "Madagascar","Malasia","Malaui","Maldivas","Mali","Malta","Marruecos","Mauricio","Mauritania","México",
  "Micronesia","Moldavia","Mónaco","Mongolia","Montenegro","Mozambique","Myanmar","Namibia","Nauru","Nepal",
  "Nicaragua","Níger","Nigeria","Noruega","Nueva Zelanda","Omán","Países Bajos","Pakistán","Palaos","Palestina",
  "Panamá","Papúa Nueva Guinea","Paraguay","Perú","Polonia","Portugal","Reino Unido","República Centroafricana",
  "República Checa","República Democrática del Congo","República Dominicana","Ruanda","Rumania","Rusia","Samoa",
  "San Cristóbal y Nieves","San Marino","San Vicente y las Granadinas","Santa Lucía","Santo Tomé y Príncipe",
  "Senegal","Serbia","Seychelles","Sierra Leona","Singapur","Siria","Somalia","Sri Lanka","Suazilandia",
  "Sudáfrica","Sudán","Sudán del Sur","Suecia","Suiza","Surinam","Tailandia","Tanzania","Tayikistán","Timor Oriental",
  "Togo","Tonga","Trinidad y Tobago","Túnez","Turkmenistán","Turquía","Tuvalu","Ucrania","Uganda","Uruguay",
  "Uzbekistán","Vanuatu","Venezuela","Vietnam","Yemen","Yibuti","Zambia","Zimbabue",
].map(p => ({ value: p, label: p }));

export default function PerfilPage() {
  const supabase     = createClient();
  const fileRef      = useRef<HTMLInputElement>(null);
  const [saving, setSaving]           = useState(false);
  const [saved,  setSaved]            = useState(false);
  const [saveError, setSaveError]     = useState("");
  const [uploading, setUploading]     = useState(false);
  const [photoSaved, setPhotoSaved]   = useState(false);
  const [photoError, setPhotoError]   = useState("");
  const [userId, setUserId]           = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [preview, setPreview]         = useState<string>("");
  const [usernameFixed, setUsernameFixed] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [form, setForm] = useState<PerfilForm>({
    username: "", first_name: "", last_name: "",
    pais: "", tipo_perfil: "", ciudad: "",
    edad: "", energia_favorita: "",
    pokemon_favorito: "", gimnasio_pokemon: "",
    photo_url: "",
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      userIdRef.current = user.id;
      const { data } = await supabase
        .from("players").select("*").eq("user_id", user.id).single();
      if (data) {
        if (data.username) setUsernameFixed(true);
        setForm({
          username:         data.username ?? "",
          first_name:       data.first_name ?? "",
          last_name:        data.last_name ?? "",
          pais:             data.pais ?? "",
          tipo_perfil:      data.tipo_perfil ?? "",
          ciudad:           data.ciudad ?? "",
          edad:             data.edad?.toString() ?? "",
          energia_favorita: data.energia_favorita ?? "",
          pokemon_favorito: data.pokemon_favorito ?? "",
          gimnasio_pokemon: data.gimnasio_pokemon?.toString() ?? "",
          photo_url:        data.photo_url ?? "",
        });
        if (data.photo_url) setPreview(data.photo_url);
      }
    }
    load();
  }, []);

  function set(field: keyof PerfilForm, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const uid = userIdRef.current ?? userId;
    if (!uid) { setPhotoError("No se pudo identificar tu sesión. Recarga la página."); return; }
    setUploading(true); setPhotoSaved(false); setPhotoError("");
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    try {
      const compressed = await compressImage(file);
      const path = `${uid}.webp`;
      const { error: storageError } = await supabase.storage
        .from("avatars").upload(path, compressed, { upsert: true, contentType: "image/webp" });
      if (storageError) { setPhotoError(`Error al subir: ${storageError.message}`); setUploading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      setPreview(url);
      setForm(f => ({ ...f, photo_url: url }));
      const { error: updateError, data: updatedRows } = await supabase
        .from("players").update({ photo_url: url }).eq("user_id", uid).select("user_id");
      if (updateError || !updatedRows || updatedRows.length === 0) {
        const { error: upsertError } = await supabase
          .from("players").upsert({ user_id: uid, photo_url: url }, { onConflict: "user_id" });
        if (upsertError) { setPhotoError(`La foto se subió pero no se guardó: ${upsertError.message}`); setUploading(false); return; }
      }
      setPhotoSaved(true);
      setTimeout(() => setPhotoSaved(false), 3000);
    } catch { setPhotoError("Ocurrió un error inesperado."); }
    finally { setUploading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setUsernameError("");
    if (form.username && !usernameFixed) {
      const { data: existing } = await supabase
        .from("players").select("user_id").eq("username", form.username).neq("user_id", userId).single();
      if (existing) { setUsernameError("Este nombre de usuario ya está en uso. Elige otro."); return; }
    }
    setSaving(true);
    setSaveError("");
    const { error } = await supabase.from("players").upsert({
      user_id:          userId,
      username:         form.username,
      first_name:       form.first_name,
      last_name:        form.last_name,
      pais:             form.pais,
      tipo_perfil:      form.tipo_perfil,
      ciudad:           form.ciudad,
      edad:             parseInt(form.edad) || null,
      energia_favorita: form.energia_favorita,
      pokemon_favorito: form.pokemon_favorito,
      gimnasio_pokemon: form.gimnasio_pokemon || null,
      photo_url:        form.photo_url,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      setSaveError(`Error al guardar: ${error.message}`);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  const sectionTitle = (num: string, title: string) => (
    <div style={{
      display: "flex", alignItems: "center", gap: "16px",
      marginBottom: "24px", paddingBottom: "16px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{ fontFamily: MONO, fontSize: "11px", color: COURT, letterSpacing: "0.2em" }}>{num}</span>
      <h2 style={{ fontFamily: DISP, fontSize: "20px", color: INK0, margin: 0 }}>{title}</h2>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: "860px" }}>
      <style>{`
        .page-container { padding: 24px; }
        @media (min-width: 768px) { .page-container { padding: 48px; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{
          fontFamily: MONO, fontSize: "11px", letterSpacing: "0.22em",
          textTransform: "uppercase", color: COURT,
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
        }}>
          <span style={{ width: "20px", height: "1px", background: COURT, display: "inline-block" }} />
          Mi cuenta
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: "36px", color: INK0, margin: 0 }}>Mi Perfil</h1>
      </div>

      <form onSubmit={handleSave}>

        {/* 00 FOTO DE PERFIL */}
        <div style={{ marginBottom: "48px" }}>
          {sectionTitle("00", "Foto de Perfil")}
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: "100px", height: "100px", borderRadius: "50%",
                border: `2px solid ${COURT}55`,
                background: "rgba(255,255,255,0.05)",
                overflow: "hidden", cursor: "pointer", position: "relative",
                flexShrink: 0, transition: "border-color 0.2s",
              }}
            >
              {preview ? (
                <Image src={preview} alt="Foto de perfil" fill style={{ objectFit: "cover" }} unoptimized />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", color: INK2 }}>
                  👤
                </div>
              )}
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity 0.2s", fontSize: "20px",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "0"}
              >
                📷
              </div>
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{
                padding: "9px 20px", borderRadius: "8px",
                background: uploading ? "rgba(255,255,255,0.06)" : `${COURT}22`,
                border: `1px solid ${COURT}44`, color: uploading ? INK2 : COURT,
                fontFamily: MONO, fontSize: "12px", cursor: uploading ? "not-allowed" : "pointer",
                letterSpacing: "0.08em", marginBottom: "10px", display: "block",
              }}>
                {uploading ? "Subiendo…" : "Cambiar foto"}
              </button>
              <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: 0, lineHeight: 1.6 }}>
                JPG, PNG o WEBP · Máx 10 MB<br />
                <span style={{ color: COURT + "99" }}>Se comprime automáticamente antes de subir</span>
              </p>
              {photoSaved && <p style={{ fontFamily: MONO, fontSize: "10px", color: COURT, margin: "6px 0 0" }}>✓ Foto guardada correctamente</p>}
              {photoError && <p style={{ fontFamily: MONO, fontSize: "10px", color: "#ff4f4f", margin: "6px 0 0" }}>✕ {photoError}</p>}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhoto} />
          </div>
        </div>

        {/* 01 IDENTIDAD */}
        <div style={{ marginBottom: "48px" }}>
          {sectionTitle("01", "Identidad")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <Field label={`Usuario${usernameFixed ? "  🔒" : ""}`}>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, opacity: usernameFixed ? 0.6 : 1, cursor: usernameFixed ? "not-allowed" : "text" }}
                  value={form.username}
                  onChange={e => !usernameFixed && set("username", e.target.value)}
                  placeholder="Crea tu nombre de usuario"
                  readOnly={usernameFixed}
                />
              </div>
              {usernameFixed ? (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: INK2, margin: "6px 0 0", lineHeight: 1.5 }}>
                  El usuario es permanente — es tu identificador único en la plataforma.
                </p>
              ) : (
                <p style={{ fontFamily: MONO, fontSize: "10px", color: "#ffc800", margin: "6px 0 0", lineHeight: 1.5 }}>
                  ⚠ Elige bien tu usuario — una vez guardado no podrá cambiarse.
                </p>
              )}
              {usernameError && <p style={{ fontFamily: MONO, fontSize: "10px", color: "#ff4f4f", margin: "6px 0 0" }}>✕ {usernameError}</p>}
            </Field>
            <Field label="Ciudad">
              <input style={inputStyle} value={form.ciudad}
                onChange={e => set("ciudad", e.target.value)} placeholder="¿En qué ciudad estás?" />
            </Field>
            <Field label="Nombre">
              <input style={inputStyle} value={form.first_name}
                onChange={e => set("first_name", e.target.value)} placeholder="Tu nombre" />
            </Field>
            <Field label="Apellido">
              <input style={inputStyle} value={form.last_name}
                onChange={e => set("last_name", e.target.value)} placeholder="Tus apellidos" />
            </Field>
            <Field label="Edad">
              <input style={inputStyle} type="number" min="1" max="99"
                value={form.edad} onChange={e => set("edad", e.target.value)} placeholder="Tu edad" />
            </Field>
            <Field label="Energía Favorita">
              <CustomSelect
                value={form.energia_favorita}
                onChange={v => set("energia_favorita", v)}
                options={ENERGIA_OPTS}
                placeholder="Seleccionar energía"
              />
            </Field>
          </div>
        </div>

        {/* 02 PERFIL POKÉMON */}
        <div style={{ marginBottom: "48px" }}>
          {sectionTitle("02", "Perfil Pokémon")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <Field label="País">
              <CustomSelect
                value={form.pais}
                onChange={v => set("pais", v)}
                options={PAISES_OPTS}
                placeholder="Seleccionar país"
              />
            </Field>
            <Field label="Tipo de Perfil">
              <CustomSelect
                value={form.tipo_perfil}
                onChange={v => set("tipo_perfil", v)}
                options={TIPO_PERFIL_OPTS}
                placeholder="Seleccionar tipo"
              />
            </Field>
            <Field label="Pokémon Favorito">
              <CustomSelect
                value={form.pokemon_favorito}
                onChange={v => set("pokemon_favorito", v)}
                options={POKEMON_OPTS}
                placeholder="Buscar Pokémon..."
              />
            </Field>
            <Field label="Gimnasio Pokémon">
              <CustomSelect
                value={form.gimnasio_pokemon}
                onChange={v => set("gimnasio_pokemon", v)}
                options={GIMNASIO_OPTS}
                placeholder="Seleccionar gimnasio"
              />
            </Field>
          </div>
        </div>

        {/* GUARDAR */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button type="submit" disabled={saving || uploading} style={{
            padding: "12px 32px", borderRadius: "10px",
            background: `linear-gradient(90deg, ${COURT}, ${BALL})`,
            border: "none", cursor: saving ? "not-allowed" : "pointer",
            fontFamily: MONO, fontSize: "13px", fontWeight: 700,
            color: BG0, letterSpacing: "0.08em",
            opacity: saving ? 0.7 : 1, transition: "opacity 0.2s",
          }}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {saved && <span style={{ fontFamily: MONO, fontSize: "12px", color: COURT }}>✓ Guardado correctamente</span>}
          {saveError && <span style={{ fontFamily: MONO, fontSize: "12px", color: "#ff4f4f" }}>✕ {saveError}</span>}
        </div>

      </form>
    </div>
  );
}
