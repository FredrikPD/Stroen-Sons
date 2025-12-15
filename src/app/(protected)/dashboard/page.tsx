"use client";

import Image from "next/image";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardPage() {
  const { data, loading } = useDashboard();

  if (loading) return <div className="p-8 text-center text-text-secondary">Laster dashboard...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Klarte ikke laste data.</div>;

  const firstName = data.member.firstName ?? data.member.email.split("@")[0];
  const currentDate = new Date().toLocaleDateString("nb-NO", { weekday: 'long', day: 'numeric', month: 'long' });

  // Mock weather data
  const weather = { temp: 18, desc: "Lettskyet", location: "Aker Brygge" };

  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1 tracking-tight text-text-main">
          Hei, {firstName}
        </h1>
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <span className="italic text-gray-400">"Tidene forandres, men vi står støtt"</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN (Content) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Hero Card (Next Event) */}
          {data.nextEvent ? (
            <div className="relative w-full h-[320px] rounded-xl overflow-hidden shadow-lg group">
              {/* Background Image */}
              {data.nextEvent.coverImage ? (
                <Image
                  src={data.nextEvent.coverImage}
                  alt={data.nextEvent.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-neutral-900" />
              )}

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <span className="bg-white/20 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                    Neste Samling
                  </span>

                  {/* Mock Countdown Widget */}
                  <div className="flex gap-2">
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-1.5 text-center min-w-[50px]">
                      <span className="block text-xl font-bold leading-none">14</span>
                      <span className="text-[9px] uppercase text-white/70">Dager</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-1.5 text-center min-w-[50px]">
                      <span className="block text-xl font-bold leading-none">06</span>
                      <span className="text-[9px] uppercase text-white/70">Timer</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-2 leading-tight text-white drop-shadow-sm">
                      {data.nextEvent.title}
                    </h2>
                    <p className="text-white/90 max-w-lg text-base font-medium leading-relaxed drop-shadow-sm">
                      {data.nextEvent.description || "Gjør deg klar for årets høydepunkt."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-5 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">calendar_today</span>
                        <span className="font-semibold text-sm">
                          {new Date(data.nextEvent.startAt).toLocaleDateString("nb-NO", { day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <div className="w-px h-5 bg-white/20" />
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">schedule</span>
                        <span className="font-semibold text-sm">
                          {new Date(data.nextEvent.startAt).toLocaleTimeString("nb-NO", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {data.nextEvent.location && (
                        <>
                          <div className="w-px h-5 bg-white/20" />
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">location_on</span>
                            <span className="font-semibold text-sm">{data.nextEvent.location}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <button className="bg-[#BFA181] hover:bg-[#a88b6b] text-[#2A2A2A] px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-[#BFA181]/20">
                      Meld deg på
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-[200px] rounded-xl bg-card-bg border border-border-color flex items-center justify-center text-text-secondary">
              Ingen kommende arrangementer.
            </div>
          )}

          {/* Siste Nytt (News Feed) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Siste Nytt</h3>
              <button className="text-[#BFA181] text-sm font-semibold hover:underline">Se alle</button>
            </div>

            <div className="grid gap-4">
              {data.posts.map(post => (
                <div key={post.id} className="bg-white border border-gray-100 p-5 rounded-lg flex items-start gap-4 hover:border-[#BFA181]/50 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                  <div className="bg-[#F5F5F7] p-3 rounded-md text-gray-400 group-hover:text-[#BFA181] group-hover:bg-[#BFA181]/10 transition-colors">
                    <span className="material-symbols-outlined text-xl">article</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <h4 className="font-bold text-base text-text-main truncate pr-4 group-hover:text-primary transition-colors">{post.title}</h4>
                      <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
                        {new Date(post.createdAt).toLocaleDateString("nb-NO", { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed line-clamp-2">{post.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Sidebar) */}
        <div className="space-y-6">

          {/* Status Card */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Medlemsstatus</h4>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${data.paymentStatus === "PAID"
                ? "bg-green-50 border-green-100 text-green-700"
                : "bg-red-50 border-red-100 text-red-700"
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${data.paymentStatus === "PAID" ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {data.paymentStatus === "PAID" ? "Aktiv" : "Inaktiv"}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-[#BFA181]/20 text-[#BFA181] p-3 rounded-lg material-symbols-outlined text-xl">
                  payments
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Årsavgift {data.period}</p>
                  <p className="text-gray-900 font-bold text-xl">
                    {data.paymentStatus === "PAID" ? "Betalt" : "Ikke betalt"}
                  </p>

                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-[#F5F5F7] text-gray-400 p-3 rounded-lg material-symbols-outlined text-xl">
                  verified
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Medlem siden</p>
                  <p className="text-gray-900 font-bold text-xl">
                    {new Date(data.member.joinedAt || Date.now()).toLocaleDateString("nb-NO", { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Weather Widget */}
          <div className="bg-[#1A1A1A] text-white rounded-xl p-6 relative overflow-hidden min-h-[160px] flex flex-col justify-between">
            {/* Gradient Background Mock */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div>
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Hei på deg, værmelding</span>
            </div>

            <div>
              <p className="text-5xl font-black mb-1">{weather.temp}°</p>
              <p className="text-white/60 font-medium">{weather.desc}</p>
            </div>
          </div>

          {/* Nylige Minner (Mock Images) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nylige Minner</h3>
              <button className="text-[#BFA181] text-xs font-bold hover:underline">Arkiv</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group cursor-pointer">
                  <Image
                    src={`https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=300&q=80`}
                    alt="Minne"
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}