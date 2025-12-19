import Image from "next/image";

export default function AboutPage() {
    return (
        <div className="flex flex-col pb-12">

            {/* Hero Section */}
            <div className="relative w-full h-[500px] overflow-hidden">
                <Image
                    src="/about-cover.png"
                    alt="Om Klubben Cover"
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                />
                <div className="absolute inset-0 bg-black/60" />
                <div className="absolute inset-0 flex flex-col items-center justify-end text-center text-white p-8 pb-16">
                    <span className="text-[#FBBF24] font-bold tracking-widest text-xs mb-2 uppercase">Siden 2025</span>
                    <h1 className="text-5xl font-bold mb-6">OM KLUBBEN</h1>
                    <div className="w-16 h-1 bg-[#FBBF24] mb-6 rounded-full" />
                    <p className="max-w-xl text-gray-200 text-sm leading-relaxed">
                        En eksklusiv arena for lojalitet, brorskap og tradisjon. Vi bygger varige relasjoner gjennom felles opplevelser.
                    </p>
                </div>
            </div>

            <div className="px-4 py-4 md:px-8 md:pb-8 lg:px-12 lg:pb-12 max-w-7xl mx-auto w-full flex flex-col gap-12 mt-12">
                {/* History Section */}
                <section className="max-w-4xl mx-auto w-full px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Vår Historie</h2>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-2xl mx-auto">
                            Det startet en sen kveld i 2025, da en gruppe likesinnede bestemte seg for å skape noe varig.
                            Klubben er bygget på pilarene av gjensidig respekt og livslangt vennskap.
                            Fra en ydmyk begynnelse i en kjellerleilighet har vi vokst til å bli en institusjon som verner om de klassiske verdiene i en moderne tid.
                        </p>
                    </div>

                    <div className="relative space-y-12 pl-8 border-l border-gray-200 ml-4">
                        {/* Timeline Item 1 */}
                        <div className="relative">
                            <span className="absolute -left-[41px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#FEF3C7] ring-4 ring-white">
                                <span className="material-symbols-outlined text-[14px] text-[#D97706]">flag</span>
                            </span>
                            <h3 className="flex items-center mb-1 text-sm font-bold text-gray-900">Kick Off</h3>
                            <time className="block mb-2 text-xs font-normal leading-none text-gray-400">2025</time>
                            <p className="text-sm font-normal text-gray-500">De fem grunnleggerne signerte det første charteret.</p>
                        </div>
                    </div>
                </section>

                <div className="w-full h-px bg-gray-200" />

                {/* Board Section */}
                <section className="max-w-5xl mx-auto w-full">
                    <h2 className="text-xl font-bold text-gray-900 mb-8">Styret (Nåværende)</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { name: "Christian Berg", role: "PRESIDENT", image: "/cover.png" }, // Placeholder image
                            { name: "Alexander Moe", role: "VISEPRESIDENT", image: "/cover.png" },
                            { name: "Fredrik Hagen", role: "ØKONOMIANSVARLIG", color: "text-[#D97706]", image: "/cover.png" },
                            { name: "Navn Navnesen", role: "STYREMEDLEM", image: "/cover.png" }
                        ].map((member, i) => (
                            <div key={i} className="flex flex-col gap-3 group">
                                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 grayscale group-hover:grayscale-0 transition-all duration-500">
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
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${member.color || 'text-gray-500'} `}>{member.role}</p>
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
                            { title: "§1 Formål", content: "Klubbens formål er å fremme sosialt samvær og nettverksbygging blant medlemmene gjennom regelmessige arrangementer og turer." },
                            { title: "§2 Medlemskap", content: "Medlemskap er kun etter invitasjon. Nye medlemmer må godkjennes enstemmig av styret og gjennomgå prøvetid." },
                            { title: "§3 Eksklusjon", content: "Styret kan med 2/3 flertall ekskludere medlemmer som motarbeider klubbens interesser eller bryter dens vedtekter." }
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

                    <div className="mt-12 text-center">
                        <button className="inline-flex items-center gap-2 text-[#D97706] text-xs font-bold uppercase tracking-widest hover:underline">
                            <span className="material-symbols-outlined text-sm">download</span>
                            Last ned fulle vedtekter (PDF)
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
