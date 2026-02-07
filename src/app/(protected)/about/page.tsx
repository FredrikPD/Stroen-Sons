import Image from "next/image";

import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";

export default async function AboutPage() {
    try {
        await ensureMember();
    } catch (e) {
        redirect("/sign-in");
    }

    return (
        <div className="flex flex-col pb-12">

            {/* Hero Section */}
            <div className="relative w-full h-[350px] overflow-hidden bg-black">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-8">
                    <span className="text-[#FBBF24] font-bold tracking-widest text-xs mb-2 uppercase">Siden 2025</span>
                    <h1 className="text-5xl font-bold mb-6">OM KLUBBEN</h1>
                    <div className="w-16 h-1 bg-[#FBBF24] mb-6 rounded-full" />
                    <p className="max-w-xl text-gray-200 text-sm leading-relaxed">
                        Strøen Søns er en gutteklubb etablert i 2025 bestående av 18 barndomsvenner fra Snarøya og Strand (og én fra Jar).
                        Klubben ble etablert av Trym, Georg, Fredrik og Jan August som dannet det første styret.
                    </p>
                </div>
            </div>

            <div className="px-4 py-4 md:px-8 md:pb-8 lg:px-12 lg:pb-12 max-w-7xl mx-auto w-full flex flex-col gap-12 mt-12">
                {/* History Section */}
                <section className="max-w-4xl mx-auto w-full px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Vår Historie</h2>
                        <div className="mx-auto max-w-4xl px-4">
                            <div className="space-y-5 text-pretty text-sm leading-6 text-gray-600 sm:text-[15px] sm:leading-7">
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

                                <p className="pt-1 font-medium text-gray-800">
                                    Tidene forandres, men vi står støtt.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="w-full h-px bg-gray-200" />

                {/* Board Section */}
                <section className="max-w-5xl mx-auto w-full">
                    <h2 className="text-xl font-bold text-gray-900 mb-8">Styret (Nåværende)</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { name: "Jan August B. Kristiansen", role: "STYREMEDLEM", image: "/images/jan.jpg" },
                            { name: "Trym Ekra-Reistad", role: "STYREMEDLEM", image: "/images/trym.jpg" },
                            { name: "Georg Samuelsen", role: "STYREMEDLEM", image: "/images/georg.jpg" },
                            { name: "Fredrik Preus Dovland", role: "STYREMEDLEM", image: "/images/fredrik.jpg" }
                        ].map((member, i) => (
                            <div key={i} className="flex flex-col gap-3 group">
                                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 transition-all duration-500">
                                    {/* 
                            NOTE: Using cover.png as placeholder since no specific portraits provided. 
                            In a real scenario we'd use specific images. 
                        */}
                                    <Image
                                        src={member.image}
                                        alt={member.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 text-gray-500`}>{member.role}</p>
                                    <h3 className="text-sm font-bold text-gray-900">{member.name}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="w-full h-px bg-gray-200" />

                {/* Bylaws Section */}
                <section className="max-w-4xl mx-auto w-full">
                    <h2 className="text-xl font-bold text-gray-900 mb-8">Vedtekter</h2>

                    <div className="space-y-4">
                        {[
                            {
                                title: "§1 Formål",
                                content: "Gutteklubben har som edel hensikt og formål å fremme og opprettholde godt kameratskap i en aktiv form. Dette vil sikre medlemmene fysisk og psykisk velvære."
                            },
                            {
                                title: "§2 Aktiviteter",
                                content: "Gutteklubben skal være en spore for medlemmene til å oppnå de festlige og sosiale behov den enkelte har satt seg. Derfor skal det arrangeres årvisse leker i gutteklubbens regi."
                            },
                            {
                                title: "§3 Eksklusivitet",
                                content: "Gutteklubben skal være eksklusiv og av en viss størrelse. Med dette forstås at medlemstallet ikke skal overstige 25 personer."
                            },
                            {
                                title: "§4 Plikter",
                                content: "Medlemskap plikter til aktivt arbeid med, og aktiv deltakelse i planlegging og sosiale arrangementer i gutteklubbens regi."
                            },
                            {
                                title: "§5 Generalforsamling og Styre",
                                content: "Generalforsamlingen skal finne sted hver vår, etter vinterleker og før sommerleker. Nytt styre i gutteklubben konstitueres på den ordinære generalforsamling hvert år, og har virkning fra denne dato. Styret skal bestå av: Formann, økonomisjef, teknisk sjef, referent."
                            },
                            {
                                title: "§6 Styreperiode og Økonomi",
                                content: "Som styreperiode regnes 1 - ett - år. Økonomisjefen plikter å fremlegge sitt regnskap på den ordinære generalforsamlingen. Vedtektsendringer kan kun vedtas ved generalforsamling. Det kreves ⅔ flertall blant de fremmøtte. Det samme gjelder i saker av økonomisk art."
                            },
                            {
                                title: "§7 Ekstraordinær Generalforsamling",
                                content: "Ved behov kan det innkalles til ekstraordinær generalforsamling for å ta opp hastesaker."
                            },
                            {
                                title: "§8 Nye Medlemmer",
                                content: "Nye medlemmer skal enstemmig godkjennes på generalforsamling. Nye medlemmer skal betale en innmeldingsavgift på kr 2 000 - engangsavgift som gjelder følgelig hele livet."
                            },
                            {
                                title: "§9 Kontingent",
                                content: "Den årlige medlemskontingent fastsettes på den ordinære generalforsamling (Kr 750 er satt som månedlig beløp ved oppstart av klubben). Månedskontingenten skal betales gjennom fast månedlig trekk i egen nettbank, innen siste dag i måneden. Øvrige innbetalinger etter påkrav skal skje innen 14 dager."
                            },
                            {
                                title: "§10 Eksklusjon",
                                content: "Et medlem kan ekskluderes fra gutteklubben. Eksklusjon må begrunnes i overtredelse av gutteklubbens vedtekter eller sverting av klubbens gode navn og rykte. Eksklusjon må godkjennes enstemmig på generalforsamlingen. Den angjeldende person forstås da naturligvis ikke å ha stemmerett."
                            }
                        ].map((section, i) => (
                            <details key={i} className="group bg-white border border-gray-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                                <summary className="flex cursor-pointer items-center justify-between p-6 text-gray-900">
                                    <div className="flex items-center gap-4">
                                        <span className="bg-[#FEF3C7] text-[#D97706] text-xs font-bold px-2 py-1 rounded">
                                            {section.title.split(' ')[0]}
                                        </span>
                                        <span className="font-bold text-sm">
                                            {section.title.split(' ').slice(1).join(' ')}
                                        </span>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-400 group-open:-rotate-180 transition-transform">expand_more</span>
                                </summary>
                                <div className="px-6 pb-6 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-4 mt-[-4px]">
                                    {section.content}
                                </div>
                            </details>
                        ))}
                    </div>

                    <div className="mt-12 bg-gray-50 rounded-2xl p-8 border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Tilleggsmerknader og Stadfestelser</h3>
                        <ul className="space-y-4 text-sm text-gray-600 leading-relaxed list-disc pl-5">
                            <li>Klubben skal sørge for tilretteleggelse av variert aktivitet: reiser, fysiske utfordringer, felles mål, prosjekter og sosialt samvær, med en balanse mellom eventyr, kultur og moro - ikke utelukkende fest og fokus på alkohol.</li>
                            <li>Det anbefales å tenke seg godt om før man blir med i gutteklubben da medlemskap medfører krav om aktivt engasjement og driv, økonomisk forpliktelse og bidrag til et fellesskap som er større enn en selv.</li>
                            <li>Ved behov for felles kasse eller spleis til aktiviteter, forplikter alle seg til å betale i tide for å sikre økonomisk ryddighet.</li>
                            <li>Medlemskap er et privilegium og baseres på tillit og engasjement.</li>
                            <li>Om noen i broderlig ånd ønsker å trekke seg, skal dette skje med stil. En passende «exit-seremoni» eller annen verdig avskjed vil finne sted. Vi takker for innsatsen, men tar oss retten til å mimre. * Innmeldingsavgift refunderes ikke ved frivillig utmelding. *</li>
                            <li>Minimum én hovedaktivitet i året (utenlandstur, julebord, sommerfest etc.) er obligatorisk for å beholde aktiv medlemsstatus – unntak gjøres kun etter søknad og gyldig grunn.</li>
                            <li>For de som av livets omstendigheter ikke lenger kan delta aktivt, men som fortsatt er en del av klubbens ånd, kan æresmedlemskap vurderes. Ingen ekte medlemmer skal glemmes.</li>
                            <li>Rotasjonsansvar - Alle medlemmer forplikter seg til å påta seg planleggingsansvar (f.eks. for én aktivitet eller tur) etter tur, for å sikre likt engasjement og ansvar.</li>
                        </ul>
                        <p className="mt-6 text-sm italic text-gray-500">
                            Et siste ord. Dette er ikke en tilfeldig gruppe – dette er en klubb for livet. Vi bygger videre på det vi har, én tur, én samtale og én dårlig idé om gangen. I all vår framtidige travelhet, skal denne klubben være vårt ankerpunkt - et bevisst valg om å ikke miste hverandre av syne.
                        </p>
                    </div>

                    <div className="mt-12 text-center">
                        <a
                            href="/documents/vedtekter.pdf"
                            download="Stroen_Sons_Vedtekter.pdf"
                            className="inline-flex items-center gap-2 text-[#D97706] text-xs font-bold uppercase tracking-widest hover:underline"
                        >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Last ned fulle vedtekter (PDF)
                        </a>
                    </div>
                </section>
            </div>
        </div>
    );
}
