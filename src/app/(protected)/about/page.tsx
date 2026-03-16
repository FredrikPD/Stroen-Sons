import Image from "next/image";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Om oss",
};

const boardMembers = [
    { name: "Jan August B. Kristiansen", role: "Styremedlem", image: "/images/jan.jpg" },
    { name: "Trym Ekra-Reistad", role: "Styremedlem", image: "/images/trym.jpg" },
    { name: "Georg Samuelsen", role: "Styremedlem", image: "/images/georg.jpg" },
    { name: "Fredrik Preus Dovland", role: "Styremedlem", image: "/images/fredrik.jpg" },
];

const bylaws = [
    { section: "§1", title: "Formål", content: "Gutteklubben har som edel hensikt og formål å fremme og opprettholde godt kameratskap i en aktiv form. Dette vil sikre medlemmene fysisk og psykisk velvære." },
    { section: "§2", title: "Aktiviteter", content: "Gutteklubben skal være en spore for medlemmene til å oppnå de festlige og sosiale behov den enkelte har satt seg. Derfor skal det arrangeres årvisse leker i gutteklubbens regi." },
    { section: "§3", title: "Eksklusivitet", content: "Gutteklubben skal være eksklusiv og av en viss størrelse. Med dette forstås at medlemstallet ikke skal overstige 25 personer." },
    { section: "§4", title: "Plikter", content: "Medlemskap plikter til aktivt arbeid med, og aktiv deltakelse i planlegging og sosiale arrangementer i gutteklubbens regi." },
    { section: "§5", title: "Generalforsamling og Styre", content: "Generalforsamlingen skal finne sted hver vår, etter vinterleker og før sommerleker. Nytt styre i gutteklubben konstitueres på den ordinære generalforsamling hvert år, og har virkning fra denne dato. Styret skal bestå av: Formann, økonomisjef, teknisk sjef, referent." },
    { section: "§6", title: "Styreperiode og Økonomi", content: "Som styreperiode regnes 1 - ett - år. Økonomisjefen plikter å fremlegge sitt regnskap på den ordinære generalforsamlingen. Vedtektsendringer kan kun vedtas ved generalforsamling. Det kreves ⅔ flertall blant de fremmøtte. Det samme gjelder i saker av økonomisk art." },
    { section: "§7", title: "Ekstraordinær Generalforsamling", content: "Ved behov kan det innkalles til ekstraordinær generalforsamling for å ta opp hastesaker." },
    { section: "§8", title: "Nye Medlemmer", content: "Nye medlemmer skal enstemmig godkjennes på generalforsamling. Nye medlemmer skal betale en innmeldingsavgift på kr 2 000 - engangsavgift som gjelder følgelig hele livet." },
    { section: "§9", title: "Kontingent", content: "Den årlige medlemskontingent fastsettes på den ordinære generalforsamling (Kr 750 er satt som månedlig beløp ved oppstart av klubben). Månedskontingenten skal betales gjennom fast månedlig trekk i egen nettbank, innen siste dag i måneden. Øvrige innbetalinger etter påkrav skal skje innen 14 dager." },
    { section: "§10", title: "Eksklusjon", content: "Et medlem kan ekskluderes fra gutteklubben. Eksklusjon må begrunnes i overtredelse av gutteklubbens vedtekter eller sverting av klubbens gode navn og rykte. Eksklusjon må godkjennes enstemmig på generalforsamlingen. Den angjeldende person forstås da naturligvis ikke å ha stemmerett." },
];

const additionalNotes = [
    "Klubben skal sørge for tilretteleggelse av variert aktivitet: reiser, fysiske utfordringer, felles mål, prosjekter og sosialt samvær, med en balanse mellom eventyr, kultur og moro — ikke utelukkende fest og fokus på alkohol.",
    "Det anbefales å tenke seg godt om før man blir med i gutteklubben da medlemskap medfører krav om aktivt engasjement og driv, økonomisk forpliktelse og bidrag til et fellesskap som er større enn en selv.",
    "Ved behov for felles kasse eller spleis til aktiviteter, forplikter alle seg til å betale i tide for å sikre økonomisk ryddighet.",
    "Medlemskap er et privilegium og baseres på tillit og engasjement.",
    "Om noen i broderlig ånd ønsker å trekke seg, skal dette skje med stil. En passende «exit-seremoni» eller annen verdig avskjed vil finne sted. Vi takker for innsatsen, men tar oss retten til å mimre. * Innmeldingsavgift refunderes ikke ved frivillig utmelding. *",
    "Minimum én hovedaktivitet i året (utenlandstur, julebord, sommerfest etc.) er obligatorisk for å beholde aktiv medlemsstatus – unntak gjøres kun etter søknad og gyldig grunn.",
    "For de som av livets omstendigheter ikke lenger kan delta aktivt, men som fortsatt er en del av klubbens ånd, kan æresmedlemskap vurderes. Ingen ekte medlemmer skal glemmes.",
    "Rotasjonsansvar — Alle medlemmer forplikter seg til å påta seg planleggingsansvar (f.eks. for én aktivitet eller tur) etter tur, for å sikre likt engasjement og ansvar.",
];

export default async function AboutPage() {
    try {
        await ensureMember();
    } catch {
        redirect("/sign-in");
    }

    return (
        <div className="flex flex-col gap-12 min-w-0 overflow-x-hidden pb-12 w-full">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex items-end justify-between gap-4 pt-1">
                <div>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        <em>Om oss</em>
                    </h1>
                </div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest shrink-0 hidden sm:block">
                    Siden 2025
                </p>
            </div>

            {/* ── History ─────────────────────────────────────────────── */}
            <section className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Vår Historie</span>
                    <div className="flex-1 h-px bg-gray-100" />
                </div>

                <div className="space-y-5 text-sm leading-7 text-gray-600">
                    <p>
                        Alt startet med en enkel tanke: vennskap varer ikke av seg selv – det varer når man prioriterer det.
                        Når livet blir fullt av jobb, flytting, forhold og travle perioder, trenger man en struktur og en arena
                        som gjør det lett å faktisk møtes.
                    </p>
                    <p>
                        Formålet vårt var derfor todelt: bevare vennskap ut livet, og samtidig sørge for at vi opplever ting
                        sammen som vi sannsynligvis aldri hadde fått til uten en klubb som drar oss i gang.
                    </p>
                    <p>
                        Klubben vår har derfor et fast årshjul som gjentas hvert år: Vinterleker, Sommerleker, Utenlandstur og
                        Julebord. Disse fire gjennomføres uansett. I tillegg kan det komme enkeltarrangementer gjennom året,
                        planlagt i god tid og merket som klubbregi.
                    </p>
                    <p>
                        Strøen Søns styres av et styre og forankres gjennom generalforsamling og møter gjennom året. For å få
                        ting til å skje i praksis jobber vi med ARKOM (arrangementskomiteer) og oppretter nye roller ved behov
                        eller ønske. Klubben skal tilrettelegge for variert aktivitet og opplevelser, med balanse mellom
                        eventyr, kultur og moro – ikke utelukkende fest.
                    </p>
                    <p>
                        Medlemskap innebærer et månedlig bidrag, men først og fremst at du er med på å bygge dette videre: du
                        møter opp når du kan, bidrar når det trengs, og tar vare på fellesskapet.
                    </p>
                    <p className="font-medium text-gray-800 italic pt-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                        Tidene forandres, men vi står støtt.
                    </p>
                </div>
            </section>

            {/* ── Board ───────────────────────────────────────────────── */}
            <section className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Styret</span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Nåværende</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {boardMembers.map((member, i) => (
                        <div key={i} className="group flex flex-col gap-3">
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group-hover:border-gray-400 transition-all">
                                <Image
                                    src={member.image}
                                    alt={member.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-1">{member.role}</p>
                                <h3
                                    className="text-sm font-normal text-gray-900 leading-snug"
                                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                >
                                    {member.name}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Bylaws ──────────────────────────────────────────────── */}
            <section className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Vedtekter</span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">{bylaws.length} paragrafer</span>
                </div>

                <div className="flex flex-col gap-2">
                    {bylaws.map((item, i) => (
                        <details
                            key={i}
                            className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-400 transition-all [&_summary::-webkit-details-marker]:hidden"
                        >
                            <summary className="flex cursor-pointer items-center justify-between px-5 py-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 shrink-0 w-6">
                                        {item.section}
                                    </span>
                                    <span className="font-bold text-sm text-gray-900 truncate">{item.title}</span>
                                </div>
                                <span className="material-symbols-outlined text-gray-300 group-open:rotate-180 transition-transform shrink-0 ml-4">
                                    expand_more
                                </span>
                            </summary>
                            <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                                <p className="text-sm text-gray-500 leading-relaxed">{item.content}</p>
                            </div>
                        </details>
                    ))}
                </div>

                {/* Closing note — dark card */}
                <div
                    className="rounded-2xl p-6 mt-2 flex flex-col gap-5"
                    style={{ background: "linear-gradient(145deg, #1a1a1a 0%, #111111 100%)", boxShadow: "0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" }}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500">Tilleggsmerknader</span>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    <ul className="space-y-3">
                        {additionalNotes.map((note, i) => (
                            <li key={i} className="flex items-start gap-3 text-xs text-gray-400 leading-relaxed">
                                <span className="text-gray-600 font-bold shrink-0 mt-0.5">—</span>
                                <span>{note}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="h-px bg-white/8" />

                    <p
                        className="text-sm italic text-gray-500 leading-relaxed"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        Et siste ord. Dette er ikke en tilfeldig gruppe – dette er en klubb for livet. Vi bygger videre på det vi har,
                        én tur, én samtale og én dårlig idé om gangen. I all vår framtidige travelhet, skal denne klubben være vårt
                        ankerpunkt — et bevisst valg om å ikke miste hverandre av syne.
                    </p>
                </div>

                <div className="flex justify-center mt-2">
                    <a
                        href="/documents/vedtekter.pdf"
                        download="Stroen_Sons_Vedtekter.pdf"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-700 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Last ned vedtekter (PDF)
                    </a>
                </div>
            </section>
        </div>
    );
}
