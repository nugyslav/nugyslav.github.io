# Music Visualiser - dokumentace
## 1. Přehled projektu a záměr

Tento projekt je webová single-page aplikace (SPA) sloužící jako interaktivní **hudební přehrávač s vizualizérem a synchronizátor textů skladeb**.

## 2. Použité technologie

* **JavaScript:** Kód je rozdělen do modulů bez použití frameworků.
* **Web Components:** Jednotlivé řádky skladeb v knihovně jsou reprezentovány vlastním HTML elementem `<track-component>`.
* **Web Audio API & AnalyserNode:** Zachycuje zvukový proud z audio elementu, který převádí na frekvenční pole. Toto pole slouží jako informační kanál pro vizualizér.
* **IndexedDB:** Lokální databáze, která umožňuje ukládat větší množství dat.
* **Deezer API & CORS Proxy:** Deezer se používá jako zdroj 30vteřinových zvukových ukázek. CORS se obchází za pomocí veřejné proxy kvůli kompatibilitě s Web Audio API.
* **Spotify API (OAuth 2.0 + PKCE):** Využívá se pro bezpečné full-textové vyhledávání hudby bez nutnosti sdílet tajný klíč (Client Secret) aplikace v kódu. Přes API se získávají informace o skladbě - název, umělec, a další metadata.
>Všechny funkcionality spojené se Spotify fungují pouze po přidání uživatele přes Spotify for Developers. Stránka musí být spuštěna na adrese 127.0.0.1:5500, je to přednastavená Redirect URI.


## 3. Uživatelská dokumentace

Rozhraní aplikace je rozděleno do dvou částí: **Knihovna** a **Hlavní okno (Player nebo Uploader)**. Přepínání mezi obrazovkami probíhá při zvolení dané stránky v pravé části navbaru.

### 3.1 Spuštění a propojení se Spotify
Při otevření aplikace je vyhledávací pole skryté a v horní části knihovny se zobrazí tlačítko **"Connect to Spotify"**. Kliknutím na toto tlačítko dojde k přesměrování na přihlášení do Spotify. Při úspěšném přihlášení a po souhlasu Vás systém vrátí zpět do aplikace, kde bude zpřístupněno vyhledávání skladeb.

### 3.2 Knihovna
Knihovna zobrazuje všechny uložené skladby. Ty jsou barevně odlišeny proužkem podle jejich původu:
* **Demo (Oranžová):** ukázkové skladby
* **Uploaded (Modrá):** skladby, které jsou nahrané přes počítač. Libovolná délka a možnost přidat text ke skladbě.
* **Snippet (Fialová):** skladby, které jsou do knihovny přidány přes vyhledávání. Maximální délka těchto skladeb je 30s.
> Deezer a většina jiných služeb nezpřístupňují celé skladby, ale pouze jejich části kvůli autorským právům.

#### Přehrávání skladeb
Kliknutím na libovolnou skladbu v bočním panelu dojde k jejímu načtení. Uploaded skladby jsou načteny hned, zatímco audio pro Snippets se musí získat z Deezer API. Přehrávání je ovládáno lištou mezi vizualizérem a textem.
> Odkazy z DeezerAPI jsou časově omezené, tudíž se v databázi ukládá pouze ID. Audio se získává až těsně při rozkliknutí skladby uživatelem. Načítání je reprezentováno točícím se kurzorem.

#### Mazání skladeb
Skladby jdou mazat pomocí tlačítka, které se nachází vedle každé z nich.

### 3.3 Vyhledávání a ukládání online hudby
Do vyhledávacího pole stačí zadat název skladby nebo jméno interpreta a stisknout klávesu `Enter`. Poté se zobrazí seznam výsledků ze Spotify. Následně lze pokračovat dvěma způsoby:
1.  **Kliknutí na řádek:** Načte 30vteřinovou ukázku do přehrávače.

> Pouze v případě, že se povedlo ji najít přes DeezerAPI. V opačném případě vyskočí chybová hláška.

2.  **Tlačítko "Save":** Uloží skladbu do lokální knihovny.

Pro návrat do knihovny stačí kliknout na *"Back to Local Library"*.

### 3.4 Nahrávání vlastních skladeb (Uploader)
Po kliknutí na "Upload Song" v navbaru se otevře formulář pro přidání vlastní skladby. Uživatel vyplní požadované informace a vybere audio soubor ve formátu **.mp3**. Lze navíc přiložit soubor s textem ve formátu **.lrc** nebo **.txt**. Po stisknutí "Save Track" se skladba uloží do IndexedDB a aplikace uživatele přesměruje na přehrávač.