# Best Lightweight SPA Stack für eine lokal‑vendorte, no‑build‑step Web‑App 2026

## Ausgangslage und harte Constraints

Euer Kernproblem ist nicht „welches Framework ist am schönsten“, sondern: **ihr betreibt eine moderne SPA in einer Umgebung, die viele implizite Annahmen des heutigen Frontend‑Ökosystems verbietet** (kein CDN, kein externer Script‑Load, kein Bundling/Transpiling, kein JSX/SFC‑Compile). Genau deshalb scheitern viele „Standard‑Stacks“ sofort, weil deren Pakete entweder **CommonJS/UMD** sind (Browser kann das ohne Tooling nicht laden) oder weil sie **Build‑Time‑Schritte** voraussetzen (JSX/SFC/TS, Tree‑Shaking, Dev/Prod‑Ersetzungen etc.). citeturn28view0turn27search3

Der tragfähige Weg ist 2026 weiterhin: **Native ES Modules + Import Maps + lokale Vendoring‑Pipeline**. Import Maps sind browserübergreifend etabliert (seit 2023 „Baseline“). citeturn16view0turn8search10  
Wichtig dabei: Import Maps müssen **vor** allen Modulen verarbeitet werden, die die gemappten Specifier benutzen. Außerdem gilt: Import Maps betreffen `import ...` / `import()` im Dokument, **nicht** `script src=...` und **nicht** Module in Workers/Worklets. citeturn16view0

Zwei oft übersehene, aber für euch extrem relevante Details:

* **Externe Import Maps sind (nativ) nicht erlaubt.** In MDN ist das explizit: beim `<script type="importmap">` darf `src` nicht gesetzt werden. Das heißt: ihr braucht i.d.R. ein Inline‑Importmap‑Tag (oder müsst ein alternatives System nutzen). citeturn16view0turn8search1  
* **CSP + Import Maps**: Wenn euer CSP Inline‑Scripts blockt, müsst ihr Import Maps sauber über **Nonce/Hash** erlauben (ohne pauschales `unsafe-inline`). MDN beschreibt Nonces als CSP‑Mechanismus und empfiehlt Nonces als Ansatz. citeturn15search4turn15search14  
  Zusätzlich gilt: Import Maps sollten (Threat‑Model von CSP) ebenfalls kontrolliert werden, weil eine manipulierte Import Map das Laufzeitverhalten eurer App fundamental ändern kann. citeturn15search0

Diese Rahmenbedingungen führen praktisch zu einem „Design‑Space“: Ihr wollt Bibliotheken, die entweder (a) **browser‑fertige ESM‑Builds** mitliefern oder (b) zumindest ESM‑Entry‑Points haben, die keine Node‑Builtins/Build‑Time‑Ersetzungen erwarten. citeturn28view0turn19view0

## UI‑Frameworks ohne Build Step

### Preact + HTM (empfohlener Default)

**Warum es passt:** Preact positioniert sich explizit als „Fast 3kB alternative to React“ und dokumentiert „No‑Build Workflows“ als erstklassigen Weg. citeturn17search4turn6view0  
Der Knackpunkt für euch: **JSX fällt weg**, aber Preact bietet hierfür eine sehr pragmatische Lösung: **HTM** (Tagged Template Literals) als JSX‑ähnliche Syntax ohne Compiler. Preact empfiehlt HTM explizit als Alternative zu handgeschriebenen `h()`‑Calls und weist darauf hin, dass JSX normalerweise einen Build Step erfordert. citeturn6view0

**ESM‑Tauglichkeit:** Preact ist in No‑Build‑Setups ausdrücklich auf Import Maps ausgelegt (inkl. gängiger Rezepte). citeturn6view0  
Das ist für eure Vendoring‑Pipeline ideal: ihr kopiert die ESM‑Dateien nach `vendor/` und mappt Specifier auf lokale Pfade.

**State‑Modell:** Für UI‑Reaktivität ohne „Store‑Overkill“ sind Preact **Signals** eine sehr gute Ergänzung: sie sind als reaktive Primitive dokumentiert, die UI‑Updates automatisch triggern. citeturn23search0turn23search4

**Ökosystem‑Hebel:** In einem Import‑Map‑Setup könnt ihr React‑Ökosystem nutzen, indem ihr `react`/`react-dom` auf `preact/compat` mappt (Preact dokumentiert das Pattern). citeturn6view0  
Das ist nicht zwingend, aber wichtig, falls ihr (selektiv) React‑first Libraries wollt.

**Pragmatisches Fazit:** Preact + HTM ist 2026 der „Sweet Spot“, wenn man **Komponentenmodell + Reaktivität + Router + Data‑Cache** ohne Build Step will und gleichzeitig nicht in ein Web‑Components‑only Paradigma gezwungen werden möchte. citeturn6view0turn17search4

### Vue 3 ESM‑Browser Build (sehr gut, wenn Template‑Syntax euer Produktivitätsmultiplikator ist)

Vue ist ein Sonderfall: Vue liefert explizit verschiedene Dist‑Builds. Für euch ist relevant:

* `vue(.runtime).esm-browser(.prod).js`: „native ES modules imports (in browser via `<script type="module">`)“ und teilt die Eigenschaften der Global‑Builds. citeturn19view0turn7search4  
* Diese Browser‑ESM‑Builds sind **dependency‑inlined** („single file with no dependencies on other files“) – das reduziert die Import‑Map‑Komplexität, was eure „keine Dutzende Module“-Abneigung direkt adressiert. citeturn30search3turn19view0

Trade‑off ohne Build Step: Wenn ihr Templates zur Laufzeit kompiliert (im DOM oder als String), müsst ihr den Compiler mit ausliefern. Vue dokumentiert, dass Full Builds den Compiler enthalten, Templates im Browser kompilieren können, aber den Payload erhöhen (≈14kb). citeturn17search1turn27search15

**Routing/Hash‑Mode:** Vue Router unterstützt explizit `createWebHashHistory()` und nennt als Use‑Case u.a. „no host“ (z.B. `file://`) oder wenn Server‑Rewrite nicht möglich ist – das passt sehr gut zu Swarm/Dezentral‑Hosting. citeturn34search3  
Vue Router shippt ebenfalls `esm-browser` Builds (z.B. `vue-router.esm-browser.prod.js`). citeturn34search15

**State:** Pinia shippt ebenfalls `pinia.esm-browser.js` im `dist/` und ist damit grundsätzlich no‑build‑fähig. citeturn35search0  
Aber: In „Importmaps/microfrontend/no‑bundle“‑Welten sind Pinia/Vue‑Router‑Dist‑Builds historisch öfter mal Ecken/Abhängigkeiten (z.B. zusätzliche Specifier) – das ist lösbar, aber ihr müsst Import Maps sauber pflegen. citeturn34search4turn35search1

**Pragmatisches Fazit:** Vue 3 ist für euch attraktiv, wenn ihr **Template‑Ergonomie** wollt und die Idee „ein paar größere Single‑File Dists statt 100 Module“ priorisiert. Gleichzeitig akzeptiert ihr dann runtime template compilation (und deren Kosten) bzw. schreibt Render‑Funktionen. citeturn19view0turn17search1

### Lit (Web Components) als „Framework‑agnostischer“ Kern

Lit ist als `lit`‑Package via npm installierbar und wird direkt per bare specifier importiert (`import { LitElement, html } from 'lit'`). citeturn20view0  
Lit 3 ist als ES2021 publiziert und nutzt bare module specifiers – Import Maps oder ein Resolver sind damit Voraussetzung (genau euer Setup). citeturn25search3turn17search2

Lit bietet zudem „Use bundles“ (prebuilt single‑file bundles als Standard‑Module ohne Dependencies) – das ist interessant für eure „wenige Dateien“‑Präferenz, allerdings referenziert die Doku diese Bundles primär als Download‑/CDN‑Workflow, nicht als npm‑dist‑Artefakt. citeturn20view0

**Pragmatisches Fazit:** Lit passt sehr gut, wenn ihr langfristig auf **Custom Elements** als Interop‑Schicht setzt (z.B. weil ihr viele Einbettungs‑Kontexte habt). Für eine Reddit‑ähnliche SPA kann Lit aber bedeuten, dass ihr mehr „App‑Infrastructure“ (Routing, Store‑Konventionen) selbst definiert, verglichen mit Preact/Vue. citeturn20view0turn25search3

### Svelte und Solid: unter euren Constraints meist unpraktisch

Svelte ist explizit ein Compiler‑Ansatz: es gibt ein `svelte/compiler` API, das Source zu JS‑Modul kompiliert. Das ist genau der Build Step, den ihr ausschließt. citeturn7search2turn25search0  
Solid ist „precompiled JSX“, d.h. JSX wird „at build time“ kompiliert. Auch das kollidiert mit „kein Transpile/Bundle“. citeturn25search13turn25search5

## State Management und Data Fetching mit SWR‑Charakter und Persistenz

### Was „SWR“ bei Swarm eigentlich bedeutet

HTTP‑SWR („stale‑while‑revalidate“) ist als Caching‑Directive standardisiert (RFC 5861). citeturn1search12  
Euer Swarm‑Modell ist aber noch besser: **Content‑addressed, immutable payloads** sind quasi „perfekt cachebar“, oft sogar „forever“. Ein klassisches SWR‑Pattern braucht ihr vor allem bei **„Head/Index/Manifest“‑Objekten**, die neue Hashes referenzieren können.

Damit ergibt sich eine sinnvolle Trennung:

1) **Immutable by hash (z.B. `/bzz/<hash>/...`)**: cache aggressiv und persistent, ohne Revalidation pro Hash.  
2) **Mutable pointers / Indizes**: SWR‑UX (sofortiges Anzeigen, Hintergrund‑Refresh, ggf. TTL).

### TanStack Query (Preact) als „Best Practice“ für SWR‑artige Server‑State‑Caches

TanStack Query beschreibt sich selbst als Tool für „fetch, cache, update“ inkl. „background updates and stale data out of the box“. citeturn24search11turn5search4  
Entscheidend: es existieren **Preact‑Docs** samt Plugin‑Ökosystem (persistQueryClient etc.). citeturn24search0turn32search4

Für euren Use‑Case sind drei Features besonders wertvoll:

* **Stale‑Time‑Semantik**: `staleTime` kann auf `Infinity` gesetzt werden („data will not be considered stale unless manually invalidated“) oder sogar „static“ („never stale“). Das passt exakt zu „immutable by hash“. citeturn32search16  
* **Persistenz des Query‑Caches**: `persistQueryClient` speichert QueryClient‑State über Persister in Storage‑Layer. citeturn5search0turn24search0  
* **Async‑Storage‑Persister**: es gibt `createAsyncStoragePersister`, das mit Storage‑APIs funktioniert, die dem AsyncStorage‑Interface entsprechen; TanStack erwähnt explizit, dass auch synchrones `window.localStorage` dieses Interface erfüllt (technisch möglich, aber nicht immer ideal). citeturn23search6turn13view0  
  Zusätzlich ist `createSyncStoragePersister` in v5 als deprecated markiert; TanStack empfiehlt stattdessen `@tanstack/query-async-storage-persister`. citeturn23search3turn32search13

**Warum das gut zu euren Constraints passt:** Ihr bekommt SWR‑ähnliches Verhalten (sofort Cache anzeigen, background refresh) plus Persistenz – ohne selbst einen Caching‑State‑Machine‑Layer schreiben zu müssen. citeturn5search4turn5search0turn24search0

**Aber:** Achtet auf Storage‑Wahl. `localStorage`/`sessionStorage` sind laut MDN **synchron und blockieren**; MDN empfiehlt für größere Datenmengen asynchrone Alternativen wie IndexedDB. citeturn13view0  
Für Swarm‑Payloads kann das schnell relevant werden.

### Persistenz‑Layer: IndexedDB/Cache API statt localStorage als Default

Für „persist across sessions“ ohne Main‑Thread‑Blocking habt ihr in Browser/Electron zwei sehr praktische Optionen:

**Cache API (CacheStorage)**  
Die Cache API speichert Request/Response‑Paare persistent; sie ist sowohl in Window‑Scopes als auch (klassisch) in Workern verfügbar. MDN betont explizit: man muss sie **nicht** zwingend zusammen mit Service Workern verwenden. citeturn32search15turn5search2  
Für „immutable by hash“ könnt ihr damit Responses sehr natürlich ablegen, inkl. Binary (Bilder).

**IndexedDB (Key/Value oder Mini‑DB)**  
Wenn ihr nur „Hash → JSON“/„Hash → Metadaten“ persistieren wollt, ist `idb-keyval` extrem attraktiv: „super-simple promise-based keyval store implemented with IndexedDB“, sehr klein. citeturn12search2  
Wenn ihr mehr Query‑Funktionalität/Indizes braucht, kann Dexie sinnvoll sein; Dexie positioniert sich als Wrapper um IndexedDB und bietet reaktive Helfer wie `liveQuery()`. citeturn12search14turn32search10

**Empfehlung für eure Architektur:**  
* `CacheStorage` für große, immutable Payloads (JSON, Images) – denkt in „content store“. citeturn32search15turn5search2  
* `TanStack Query` für „pointer/manifest state“ + UX‑SWR + Invalidation, und als „Koordinator“ für Refresh/Background Fetch. citeturn24search11turn24search0turn32search16  
* `IndexedDB` (idb-keyval/Dexie) für Metadaten, Indizes, Post‑Drafts, Upload‑Queue. citeturn12search2turn13view0

Das ergibt ein System, das sich wie SWR anfühlt, aber euren immutablen Datenfluss optimal ausnutzt.

### Router

Für Preact ist **Wouter** besonders passend, weil es u.a. `useHashLocation` als Location‑Hook anbietet (Hash‑Routing ist bei euch gewünscht) und ausdrücklich ES2020+ voraussetzt (kein Legacy‑Ballast). citeturn22view0  
Preact Router ist stabil, aber laut README nicht mehr aktiv in Entwicklung; für neue Apps wird `preact-iso` empfohlen. citeturn22view1

Für Vue ist Hash‑Routing mit `createWebHashHistory()` ausdrücklich als Lösung dokumentiert, wenn Hosting/Rewrite schwierig ist. citeturn34search3

## Markdown Rendering und Editor ohne Build Step

### Renderer: Marked vs. micromark (und warum Sanitizing nicht optional ist)

**Marked** ist extrem verbreitet und bietet eine klare Warnung: „Marked does not sanitize the output HTML“ und empfiehlt DOMPurify als Sanitizer. citeturn9search0turn36search1  
Für user‑generated content (Reddit‑ähnlich) ist das zentral: Markdown‑Renderer produzieren häufig HTML, und ohne Sanitizing ist XSS realistisch.

**micromark** ist ein moderner CommonMark‑Parser, der „safe (by default)“ als Feature highlight nennt, und er ist „ESM only“. citeturn10view0  
Das ESM‑only Signal ist für euch positiv (kein CJS‑Problem), aber: „safe by default“ heißt nicht automatisch „du brauchst nie Sanitizing“ – v.a. wenn ihr HTML‑Features/Extensions aktiviert oder Rendering‑Pipelines kombiniert. Die robuste, pragmatische Variante bleibt: HTML‑Output grundsätzlich sanitizen (defense‑in‑depth). citeturn36search2turn9search0

**DOMPurify als Sanitizer:** DOMPurify shippt eine ESM‑Datei (`dist/purify.es.mjs`) und ist als XSS‑Sanitizer für HTML/SVG/MathML dokumentiert. citeturn36search15turn36search2

**Pragmatische Empfehlung (2026):**
* Für maximale Einfachheit: `marked` + `DOMPurify.sanitize(marked.parse(...))`. citeturn9search0turn36search2  
* Für CommonMark‑Strenge/ESM‑only „cleaner package story“: `micromark` (optional mit GFM‑Extension) + DOMPurify als zusätzlicher Sicherheitsgurt. citeturn10view0turn36search2

### Editor: „Fertiger Markdown Editor“ vs. „Editor‑Core + Toolbar“

Viele „fertige“ Markdown‑Editoren im Web sind historisch UMD/CJS‑lastig. EasyMDE wird z.B. häufig in Bezug auf `module.exports` diskutiert (kein nativer ESM‑Fit ohne Umwege). citeturn11search0  
Das kollidiert mit eurem „ESM‑only ohne Konverter“‑Ziel.

**CodeMirror 6** ist in modernen Paketen als ES‑Module verteilt. Gleichzeitig schreibt der offizielle Guide, dass es „nicht praktikabel“ sei, CodeMirror ohne Bundler oder Module Loader zu betreiben – Import Maps sind in eurem Setup genau dieser „Loader“, aber es bleibt modular und kann viele kleine Module bedeuten. citeturn9search15turn9search3  
Für euch ist das trotzdem oft der beste Kompromiss, weil:
* ESM‑Modularität zu eurem Import‑Map‑Vendoring passt, citeturn9search3turn16view0  
* Markdown‑Support über `@codemirror/lang-markdown` dokumentiert ist. citeturn11search3turn11search7

**Empfehlung:**  
Nutzt CodeMirror 6 als Editing‑Surface und baut eine **kleine eigene Toolbar** (Bold/Italic/Link/Quote/Code/Upload‑Insert). Das wirkt erst wie „mehr Arbeit“, verhindert aber, dass ihr euch in einem nicht‑ESM‑fähigen Editor festfahrt.

Ein guter UX‑Trick für euer Produkt: „Write“‑Modus als Editor, „Preview“‑Modus als gerenderter Markdown (Renderer + Sanitize), optional „Split view“ (Editor links, Preview rechts).

## CSS/Design‑System ohne Build‑Pipeline

Ihr habt recht: Tailwind ohne Build Step ist de facto nicht „Tailwind“ (weil eure Komposition/Tree‑Shaking/Custom Design Tokens nicht möglich sind). Das führt in der Praxis zu drei sinnvollen Pfaden:

### Pico.css als schnellster „sieht sofort gut aus“‑Baseline

Pico positioniert sich als „Minimal CSS Framework for Semantic HTML“ – ihr schreibt semantisches HTML, Pico macht es standardmäßig responsive und „elegant“. citeturn14search4  
Für Themensteuerung relevant: Pico dokumentiert umfangreiche CSS‑Variablen (Custom Properties) zur Anpassung. citeturn14search0  
Das ist für euch ideal, weil ihr damit ein konsistentes Dark Theme über CSS‑Variablen definieren könnt, ohne Build Tooling. citeturn14search0

### Bulma als „CSS‑only Komponentenschicht“ (wenn ihr viele Layout‑Bausteine wollt)

Bulma ist explizit „CSS only“; das Repo sagt: „sole output is a single CSS file … There is no JavaScript included“. citeturn14search8  
Für eine Reddit‑ähnliche UI mit Cards, Columns, Forms etc. ist Bulma sehr praktisch, wenn ihr mit Klassen arbeiten mögt und keinen JS‑Component‑Layer braucht. citeturn14search8turn14search5

### Open Props als Token‑Baukasten (Design‑System über Variablen)

Open Props ist ein Set von CSS Custom Properties („design tokens“) und explizit als CSS/JS über CDN oder npm verfügbar. citeturn14search1  
Das passt hervorragend zu einem Ansatz: „Wir bauen unser eigenes UI‑Design in CSS, aber brauchen starke Defaults für Spacing, Colors, Shadows, Radii“.

### UI‑Komponenten ohne Framework‑Bindung: Shoelace

Shoelace ist eine „framework agnostic“ Web‑Components‑Library und betont: „Includes a dark theme“ und „Fully customizable with CSS“. citeturn30search10turn14search6  
Wichtig für euren Offline/Vendoring‑Ansatz: Shoelace ist als Standard‑ES‑Modules distribuiert; ohne Bundler kann das viele Requests bedeuten, aber es gibt auch den Weg, die „alles registrierende“ Datei zu laden oder cherry‑picking zu betreiben. citeturn26view1turn26view0  
Außerdem: wenn ihr Assets wie Icons nutzen wollt, müsst ihr ggf. den Base Path setzen (`setBasePath()`), was in der Doku explizit beschrieben ist. citeturn26view1

**Pragmatische Empfehlung:** Für eure App ist oft am besten:
* Layout/Typografie über Pico oder Open Props + eigene CSS‑Komponenten,
* gezielte Interaktions‑Komponenten (Dialog, Dropdown, Tooltip) über Shoelace, wenn ihr nicht alles selbst bauen wollt. citeturn14search4turn14search6turn26view1

## Was euch 2026 typischerweise sonst noch „um die Ohren fliegt“ und wie man es pragmatisch löst

### Der häufigste ESM‑Gotcha: falsches Modulformat (CJS/UMD) oder bundler‑erwartete Transformationen

Julia Evans bringt das Kernproblem no‑build sehr direkt auf den Punkt: Libraries liefern typischerweise „classic global“, „ES modules“ oder „CommonJS“ – und **CommonJS kann der Browser ohne Build Step nicht**. citeturn28view0  
Vite dokumentiert im Gegenzug, warum Build Tools so oft nötig sind: sie pre‑bundlen Dependencies und **konvertieren CommonJS/UMD zu ESM** und rewriten Imports zu browser‑gültigen URLs. citeturn27search3turn27search0  
In eurem Setup heißt das: ihr müsst bei jeder Library prüfen, ob sie wirklich browser‑ESM „out of the box“ ist.

### Import Map Management: Generatoren und „Dependencies bändigen“

Wenn ihr viele Dependencies habt, wird das Schreiben/Updaten der Import Map zur eigenen Aufgabe. Dafür gibt es zwei relevante Tool‑Familien (ohne dass ihr eure App builden müsst):

* **Import Map Generation**: `@jspm/generator` ist eine API für Import‑Map‑Generierung und kann relative URLs bezogen auf die Import‑Map‑Position ausgeben. citeturn29search13turn29search1  
* **„Download und rewrite zu relativen Imports“**: `download-esm` lädt ESM‑Artefakte, rewritet Imports zu relativen Pfaden und speichert lokal – damit kann man Import Maps teilweise vermeiden, wenn man lieber „relatives module tree“ will. citeturn29search0turn29search4  

Für euren bestehenden Ansatz („npm install → copy to vendor/ → import map“) ist `@jspm/generator` eher die passende Ergänzung, während `download-esm` ein Notfall‑Plan für „Package ist ESM, aber Bare Specifier/Exports machen Ärger“ sein kann. citeturn29search13turn28view0

### Import Maps sind inline: CSP sauber machen

MDN ist eindeutig: `<script type="importmap">` darf kein `src` haben. Das zwingt euch fast immer zu Inline‑JSON. citeturn16view0  
Wenn eure CSP keine Inline‑Scripts erlaubt, müsst ihr Import Map‑Tag(s) mit **Nonce** oder Hash whitelisten. MDN beschreibt Nonce‑Attribute explizit als Methode, gezielt Inline‑Scripts zu erlauben, ohne `unsafe-inline`. citeturn15search4turn15search14

### Service Worker als optionaler „Turbo“ für Offline‑First

Service Worker sind im Web als Proxy‑Layer für Offline‑First Caching gedacht; MDN beschreibt das explizit („cached assets first … offline first“). citeturn32search3turn32search7  
Für euch ist das optional, weil ihr bereits in Electron seid und die Cache API auch ohne SW nutzen könnt. Dennoch: Wenn ihr Swarm‑Fetches zentral intercepten wollt (z.B. `/bzz/<hash>/`), kann ein SW die sauberste Architektur sein – sofern eure Electron/Protocol‑Umgebung SW erlaubt.

### Lokale Persistenz: localStorage ist bequem, aber hat harte Grenzen

MDN beschreibt klar: `localStorage`/`sessionStorage` sind synchron, blockieren JS‑Ausführung und können die Responsiveness beeinträchtigen; IndexedDB ist die empfohlene asynchrone Alternative. citeturn13view0  
Für euren Cache (SWR + persist) ist das ein zentraler Design‑Punkt: **kleine Metadaten ok in localStorage**, aber payload‑Caches (Threads, Bilder, große JSON) besser in IndexedDB/CacheStorage. citeturn13view0turn32search15turn12search2

### Real‑World „No‑Build“ / Import‑Map‑Pattern in der Praxis

Import Maps sind nicht nur „Spielzeug“: Shopify beschreibt 2025, wie sie Import Maps resilient machen und erwähnt u.a. situationsabhängig ES Module Shims als Polyfill/Kompatibilitätsstrategie. citeturn8search12turn29search3  
Auch Server‑Frameworks bewegen sich wieder Richtung „Assets ohne klassisches Bundling“: Symfony AssetMapper dokumentiert Import Maps als native Browser‑Funktion und zeigt Import‑Map‑basiertes Asset‑Mapping (inkl. gehashter Asset‑Pfadnamen im Import Map JSON). citeturn15search17turn29search17  
Und als „Hands‑on Realität“ no‑build: Julia Evans beschreibt sehr konkret, wie man im npm‑Build nach ESM/UMD/CJS unterscheidet und warum Import Maps in ESM‑Setups oft nötig werden. citeturn28view0turn16view0

## Konkrete Empfehlung: ein „best fit“ Stack für eure App

Wenn ich eure Ziele (Maintainability, Komponentenmodell, Router, Markdown‑Compose/Render, SWR‑Cache + Persistenz, Dark Theme) gegen eure Constraints lege, ist 2026 der pragmatischste „leicht, robust, ESM‑fähig“ Stack:

**UI:** Preact + HTM + (optional) Signals  
* No‑build Workflows und HTM explizit unterstützt. citeturn6view0turn17search4  
* Signals als State‑Primitive dokumentiert. citeturn23search0turn23search4  

**Routing:** Wouter mit Hash‑Location  
* `useHashLocation` ist vorhanden; Bibliothek zielt auf ES2020+. citeturn22view0  

**Data Fetch + Cache:** TanStack Query (Preact)  
* Background updates + stale data + `staleTime` bis `Infinity/static`. citeturn24search11turn32search16  
* Persistenz über `persistQueryClient` + `createAsyncStoragePersister` (statt deprecated sync persister). citeturn24search0turn23search6turn32search13  

**Persistenter Storage:** Cache API + IndexedDB (idb-keyval als Minimal‑Layer)  
* Cache API ist persistent, auch in Window‑Scopes nutzbar. citeturn32search15turn5search2  
* idb-keyval ist klein und IndexedDB‑basiert. citeturn12search2  
* localStorage nur für kleine, selten geschriebene Metadaten (wegen Sync‑Blocking). citeturn13view0  

**Markdown Render:** `marked` oder `micromark` + DOMPurify  
* Marked warnt explizit und empfiehlt DOMPurify. citeturn9search0turn36search2  
* micromark ist ESM‑only und hebt „safe (by default)“ hervor. citeturn10view0  
* DOMPurify hat ESM (`purify.es.mjs`). citeturn36search15turn36search2  

**Markdown Editor:** CodeMirror 6 + eigener Toolbar/Preview  
* Markdown‑Language‑Support via `@codemirror/lang-markdown`. citeturn11search3turn11search7  
* Offiziell: ESM‑Packages, ohne Bundler „nicht praktisch“ – mit Import Maps aber machbar; ihr müsst Modularität akzeptieren. citeturn9search15turn9search3  

**CSS:** Pico.css oder Open Props + eigene Layout‑CSS; optional Shoelace für UI‑Widgets  
* Pico: semantisch, responsive, anpassbar via CSS‑Variablen. citeturn14search4turn14search0  
* Open Props: Token‑Library via npm/CDN. citeturn14search1  
* Shoelace: ES‑Modules, Dark Theme, CSS‑Custom‑Properties/Parts, lokaler npm‑Install‑Workflow. citeturn26view1turn14search6turn30search10  

Diese Kombination erfüllt eure Anforderungen, ohne euch in „Build‑Step‑Notwendigkeiten“ zu drücken – und sie ist in der Praxis 2026 realistisch wartbar, weil jede Hauptkomponente (UI/Router/Cache/Markdown/CSS) in einer **ESM‑und‑no‑build‑freundlichen** Ecke des Ökosystems liegt. citeturn6view0turn24search0turn16view0turn13view0