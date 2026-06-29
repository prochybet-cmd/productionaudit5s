// 5S checklist — 25 položek v 5 kategoriích, hodnocení 0–5 (s krokem 0,5).

export interface ChecklistItem {
  id: number;
  title: string;
  question: string;
}

export interface ChecklistCategory {
  key: "seiri" | "seiton" | "seiso" | "seiketsu" | "shitsuke";
  code: string;          // SEIRI, SEITON, …
  cs: string;            // Vytřiď, Uspořádej, …
  en: string;            // Sort, Set in order, …
  color: string;         // tailwind color class for accent
  items: ChecklistItem[];
}

export const CHECKLIST: ChecklistCategory[] = [
  {
    key: "seiri",
    code: "SEIRI",
    cs: "Vytřiď",
    en: "Sort",
    color: "bg-[hsl(48_98%_52%)]",
    items: [
      { id: 1, title: "Nářadí", question: "Na pracovišti jsou k dispozici pouze potřebné materiály, nástroje, přístroje, měřicí zařízení, obalové materiály, pracovní dokumenty atd., definované v 5S instrukci na pracovišti nebo JESu. Nepotřebné předměty jsou odstraněny." },
      { id: 2, title: "Red Tag", question: "„Red Tag Zone\" je definována a označena (v kanceláři výroby). Předměty v red tag košíku jsou označeny červeným štítkem a nejsou starší než 30 dní." },
      { id: 3, title: "Soukromé předměty", question: "Na pracovišti nejsou žádné soukromé předměty. V budově jsou k dispozici uzamykatelné skříňky." },
      { id: 4, title: "Výrobky", question: "Všechny výrobky a materiál jsou jasně identifikované. Neshodné výrobky jsou označeny a umístěny v příslušných boxech / stojanech dle layoutu." },
      { id: 5, title: "Tabule", question: "Zobrazují se pouze relevantní a aktuální informace. Žádná potrhaná nebo znečištěná dokumentace. Veškerá dokumentace je úhledně uspořádaná." },
    ],
  },
  {
    key: "seiton",
    code: "SEITON",
    cs: "Uspořádej",
    en: "Set in order",
    color: "bg-[hsl(28_95%_55%)]",
    items: [
      { id: 6, title: "Layout", question: "Stroje, stojany, regály a materiály jsou uspořádány dle layoutu. Dostatečné osvětlení pracovního prostoru (ověř poškození zářivek). Všechny pozice jsou označené." },
      { id: 7, title: "Značení", question: "Podlahové značky označují uličky, chodníky, pracovní zóny, skladovací místa a nebezpečné oblasti." },
      { id: 8, title: "Materiál", question: "Žádné předměty se nepokládají přímo na podlahu (pokud tak není určeno v JES). Nebezpečné materiály jsou řádně označeny a skladovány, stav zásob materiálu je zřejmý." },
      { id: 9, title: "Vybavení", question: "Veškeré nářadí má definované své místo a je bezpečně uloženo. Obsluha k němu má snadný přístup. V okolí stroje nejsou viditelné volné kabely ani žádná rizika, která by bylo třeba pozorovat." },
      { id: 10, title: "Bezpečnost", question: "Nouzové východy a vypínače jsou jasně označené, dobře viditelné a bez překážek. Hasicí přístroj je dostupný v rámci zóny." },
    ],
  },
  {
    key: "seiso",
    code: "SEISO",
    cs: "Vyčisti",
    en: "Shine",
    color: "bg-[hsl(200_88%_55%)]",
    items: [
      { id: 11, title: "Podlaha", question: "Odpadkové koše nejsou přeplněné a koše na pracovišti jsou na konci směny vyprazdňovány." },
      { id: 12, title: "Vybavení", question: "Pracoviště a vybavení mají čistý povrch. Je patrné rutinní čištění zařízení (dle 5S vizualizace). Displeje nebo štítky jsou čitelné." },
      { id: 13, title: "Materiál", question: "Vstupní komponenty a finální výrobky nejsou viditelně nadměrně znečištěné olejem." },
      { id: 14, title: "Zásoby", question: "Veškeré úklidové prostředky jsou na svých pozicích, je zřejmé, kam patří, a v případě potřeby jsou snadno dostupné. Úklidový panel je na svém místě dle layoutu a zjevně se používá." },
      { id: 15, title: "Oblast", question: "Vše v oblasti je pravidelně čištěno, na pracovišti je zřejmý pravidelný úklid, operátoři dbají na pořádek. Zjevný smysl pro odpovědnost za čistotu." },
    ],
  },
  {
    key: "seiketsu",
    code: "SEIKETSU",
    cs: "Standardizuj",
    en: "Standardize",
    color: "bg-[hsl(150_60%_45%)]",
    items: [
      { id: 16, title: "Vizualizace", question: "Panel na nářadí je dostupný a označený. Jednotlivé pozice jsou čitelně označené a dodržované." },
      { id: 17, title: "Materiál", question: "Vstupní a výstupní materiál i rozpracovaná výroba jsou označeny." },
      { id: 18, title: "Standardizovaná práce", question: "Na pracovišti je dostupný standardizovaný formát instrukcí (JES, 5S vizualizace)." },
      { id: 19, title: "Tabule", question: "Tabule (např. L1 nebo u stroje) mají standardní obsah, jsou aktuální a přehledné. Je definována odpovědnost za jejich aktualizaci." },
      { id: 20, title: "Údržba", question: "Zavedené plány čištění. Zkontroluj on-line, že čištění v předchozím týdnu proběhlo dle plánu (Prod. matrix). U nevýrobního pracoviště zapiš N/A." },
    ],
  },
  {
    key: "shitsuke",
    code: "SHITSUKE",
    cs: "Udržuj",
    en: "Sustain",
    color: "bg-[hsl(340_75%_55%)]",
    items: [
      { id: 21, title: "Audit", question: "Audity 5S se provádějí podle 5S standardu, výsledky jsou viditelné na radar chartech (včetně akčního plánu). Zkontroluj aktuální výsledek za předchozí měsíc (L1 tabule + tabule 5S)." },
      { id: 22, title: "Vizualizace", question: "Ukázky 5S KAIZEN zlepšení PŘED – PO jsou k dispozici na zónové tabuli L1." },
      { id: 23, title: "Trénink", question: "Všichni operátoři jsou proškoleni v základech 5S. Všichni dodržují standardy 5S. Proveď krátké 5S interview s operátorem na jeho pracovišti." },
      { id: 24, title: "Podpora", question: "Podpora vedení společnosti ve smyslu zapojení a účasti na auditu 5S alespoň jednou ročně (GM) k vidění na 5S tabuli. Vedení komunikuje zpětnou vazbu o úsilí a výsledcích 5S během měsíčního meetingu." },
      { id: 25, title: "Odpovědnost", question: "Zaměstnanci se aktivně podílejí na neustálém zlepšování výsledků 5S. Zkontroluj záznam v BONu operátora o 5S kontrole a plnění definovaných auditů na tabuli 5S." },
    ],
  },
];

export const SCORE_OPTIONS = [0, 1, 2, 3, 4, 5];

export interface ScoreLegendEntry {
  value: number;
  label: string;
  desc: string;
  bg: string;
  fg: string;
}

export const SCORE_LEGEND: ScoreLegendEntry[] = [
  { value: 0, label: "Nebylo zahájeno", desc: "Standard nezaveden", bg: "bg-[#d93025]", fg: "text-white" },
  { value: 1, label: "Činnost zahájena", desc: "6 a více nálezů k otázce", bg: "bg-[#f29900]", fg: "text-ink" },
  { value: 2, label: "Rozsáhlá aktivita", desc: "4–5 nálezů k otázce", bg: "bg-[#fbe24a]", fg: "text-ink" },
  { value: 3, label: "Přijatelná úroveň", desc: "2–3 nálezy k otázce", bg: "bg-[#9fc55a]", fg: "text-ink" },
  { value: 4, label: "Velmi dobrý výsledek", desc: "1 nález k otázce", bg: "bg-[#3aa757]", fg: "text-white" },
  { value: 5, label: "Best Practice / World Class", desc: "Bez nálezů", bg: "bg-[#2a9fd6]", fg: "text-white" },
];

export const MAX_TOTAL = 25 * 5; // 125

export function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  return score.toFixed(1).replace(".", ",");
}
