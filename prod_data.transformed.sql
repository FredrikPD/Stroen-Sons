--
-- PostgreSQL database dump
--

\restrict cHEqIXPwczXAfnkFbdY6MPS98ypXTC2NEsej0M3EdkbGOUZg9YCn3HcZxs2m0fg

-- Dumped from database version 17.2
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Category" (id, name, description, "createdAt", color) FROM stdin;
cmlginet30003ech5smukqapn	NYHET	Nyheter	2026-02-10 11:27:03.35	blue
\.


--
-- Data for Name: Event; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Event" (id, title, description, "coverImage", location, address, "startAt", "totalCost", "clubSubsidy", "createdById", "createdAt", "updatedAt", "endAt", "maxAttendees", "registrationDeadline", "isTba", category) FROM stdin;
cmlaq9wft0000fm6c6ikkjns4	Sommertur 2026	I sommer starter vi i Beograd med Balkan-kaos med rakija i plastglass. Deretter går turen videre til Kypros: sol, strand, fjell og klipper. Lets goooo!!!\n\n*Mer info kommer senere*	https://utfs.io/f/CMQfZeoXuhIClujo0fwE5nIPr7zx4AhbVNBtclyk896LY2up	Beograd / Kypros	\N	2026-07-25 07:45:00	8600	\N	cmldva9ag0000ecaolcrcoytk	2026-02-06 10:13:52.884	2026-02-11 06:35:28.519	2026-08-02 18:15:00	\N	2026-02-12 11:00:00	f	Tur
cmlb3c44n0000fhdaszza4yu9	Vinterleker 2026	Den 28. Februar er det klart for tidenes første Strøen Søns Vinterleker. Det blir en frisk dag med forventninger om sinnssykt høye langrennsferdigheter (Kristian), etterfulgt av bankett med god mat og drikke. Smør ski, lån ski, kjøp ski. Se viktig informasjon om arrangementet i dette innlegget:\n\n### Lekene:\nTrenger dere å låne utstyr så kan det gjøres her: https://www.bua.no/\n(Det anbefales å ordne dette)\n\n**Dresscode og utstyr:** Lanngrennstøy, skiutstyr\n\n### Bankett:\nHer kjører vi på med bankett i full Strøen stil! Det blir servert god mat og drikke, samt premieutdeling ifm lekene.\n\n**Dresscode:** Dress og Gomp i brystlommen	https://utfs.io/f/CMQfZeoXuhICoLwUXitvNEQ1z63xPiJkb7w8WGCeHFTRraVU	\N	\N	2026-02-28 10:00:00	\N	\N	cmldva9ag0000ecaolcrcoytk	2026-02-06 16:19:31.169	2026-02-10 12:30:54.647	\N	\N	2026-02-14 22:59:00	t	Sosialt
cmjj6n6qk0000ee93nrojmx9n	Julebord 2025	Det er med glede at styret herved annonserer årets julebord.\n\nDresscode: pent og formelt (dress). Husk også den høyst obligatoriske gomp-pakken i venstre brystlomme.\n\nFør Lorry blir det selvsagt et opplegg/vors, hvor klubben stiller med snacks, drikke og leker. Vi anbefaler derimot alle å ta med litt ekstra drikke selv, slik at kvelden starter riktig. Detaljer om opplegget kommer nærmere.\n\nPraktisk info:\n- Klubben dekker maten på Lorry (gjennom kontingent).\n- Det vil i tillegg komme et engangsbeløp som må betales i forkant, som dekker deler av mat, alkohol på vorset og eventuelle aktiviteter.\n- Drikke på Lorry bestilles og betales av hver enkelt selv.\n	https://utfs.io/f/CMQfZeoXuhICGGErppaNohXs61lMCV57zec3HPnQgmfWArL9	Lorry	Parkveien 12, 0350 Oslo	2025-11-15 16:00:00	700	700	cmldva9ag0000ecaolcrcoytk	2025-12-23 22:54:51.35	2026-02-10 13:39:04.356	\N	\N	\N	f	Sosialt
\.


--
-- Data for Name: EventCategory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EventCategory" (id, name, description, color, "createdAt") FROM stdin;
cmlgk2nir0000ec9coycgc4f0	Sosialt	Standard kategori for sosiale arrangementer	blue	2026-02-10 12:06:54.099
cmlgkwo0a0001ec9ci39fqgg4	Tur	Kategori for turer	green	2026-02-10 12:30:14.41
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "memberId", type, title, message, link, read, "createdAt") FROM stdin;
cml6nhnw40002f19f86hh82t6	cmldva9ag0000ecaolcrcoytk	INVOICE_CREATED	Ny Medlemskontingent: Medlemskontingent 2026-02	Din faktura for 2/2026 er nå tilgjengelig. Beløp: 750 kr.	/dashboard	t	2026-02-03 13:44:51.508
cml84m5o80006e8c9usrydi0f	cmldva9ag0000ecaolcrcoytk	POST_CREATED	Nytt innlegg	"epost test 2" har blitt publisert.	/posts/cml84m5iq0004e8c9drnp3nmh	t	2026-02-04 14:32:00.82
cmjdjo4sz0003fm7x15wgyqrf	cmldva9ag0000ecaolcrcoytk	POST_CREATED	Nytt innlegg	"Test" har blitt publisert.	/posts/cmjdjo4o80001fm7xlgr8gg2f	t	2025-12-20 00:12:53.455
cml975ezw0002fl75hgp6bfzi	cmldva9ag0000ecaolcrcoytk	INVOICE_CREATED	Ny Medlemskontingent: Medlemskontingent 2026-02	Din faktura for 2/2026 er nå tilgjengelig. Beløp: 750 kr.	/dashboard	t	2026-02-05 08:30:44.78
cmjdkiegs000nfm7xqrel3cif	cmldva9ag0000ecaolcrcoytk	INVOICE_CREATED	Ny Medlemskontingent: Medlemskontingent 2026-01	Din faktura for 1/2026 er nå tilgjengelig. Beløp: 750 kr.	/dashboard	t	2025-12-20 00:36:25.66
cmjdkien8000pfm7xt2tg48k8	cmldva9ag0000ecaolcrcoytk	INVOICE_CREATED	Ny Medlemskontingent: Medlemskontingent 2026-02	Din faktura for 2/2026 er nå tilgjengelig. Beløp: 750 kr.	/dashboard	t	2025-12-20 00:36:25.892
cml9aykwy0005cya9g3t5keoe	cmldva9ag0000ecaolcrcoytk	INVOICE_CREATED	Ny Medlemskontingent: Medlemskontingent 2026-03	Din faktura for 3/2026 er nå tilgjengelig. Beløp: 750 kr.	/dashboard	t	2026-02-05 10:17:24.321
cmldw42040001foauzy8hp00k	cmldva9ag0000ecaolcrcoytk	INVOICE_CREATED	Ny Faktura: Testing	Du har mottatt et krav på 1000 kr.	/dashboard	t	2026-02-08 15:20:36.388
cmlgkxa8g0007ec9ch5wycwty	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-10 12:30:43.212
cmlgkxa8g0008ec9c72dfwhaj	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-10 12:30:43.212
cmlgkxa8g0009ec9c671z38zc	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-10 12:30:43.212
cmlgkxa8g0006ec9cv522jyau	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	t	2026-02-10 12:30:43.212
cmlgm2bew000kec9cpnepwida	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-10 13:02:37.637
cmlgm2bew000mec9cbuz08b3j	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-10 13:02:37.637
cmlgm2bew000nec9cf4egamhh	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-10 13:02:37.637
cmlgm2bew000lec9cffk3fqzp	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	t	2026-02-10 13:02:37.637
cmlgnd6zc000zec9cuwi6sg6k	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Julebord 2025" har blitt oppdatert.	/events/cmjj6n6qk0000ee93nrojmx9n	f	2026-02-10 13:39:04.725
cmlgnd6zc0011ec9cm3jyn9qn	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Julebord 2025" har blitt oppdatert.	/events/cmjj6n6qk0000ee93nrojmx9n	f	2026-02-10 13:39:04.725
cmlgnd6zc0012ec9c3ies1cc5	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Julebord 2025" har blitt oppdatert.	/events/cmjj6n6qk0000ee93nrojmx9n	f	2026-02-10 13:39:04.725
cmjygedeu0008fnbrdbi82g9d	cmldva9ag0000ecaolcrcoytk	INVOICE_CREATED	Ny Medlemskontingent: Medlemskontingent 2026-01	Din faktura for 1/2026 er nå tilgjengelig. Beløp: 750 kr.	/dashboard	t	2026-01-03 15:24:28.902
cmjyggrhd000ufnbrqx38x0sg	cmldva9ag0000ecaolcrcoytk	BALANCE_WITHDRAWAL	Ny belastning	Din konto har blitt belastet med 1429 kr for: Middag	/dashboard	t	2026-01-03 15:26:20.449
cmjygijte0010fnbr6ljbrcmf	cmldva9ag0000ecaolcrcoytk	INVOICE_CREATED	Ny Faktura: Flybilletter	Du har mottatt et krav på 1000 kr.	/dashboard	t	2026-01-03 15:27:43.826
cmlgnd6zc0010ec9cgsj4vyue	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Julebord 2025" har blitt oppdatert.	/events/cmjj6n6qk0000ee93nrojmx9n	t	2026-02-10 13:39:04.725
cmkreazxw0006e7fzb6bmmbmw	cmldva9ag0000ecaolcrcoytk	POST_CREATED	Nytt innlegg	"Viktig Innlegg" har blitt publisert.	/posts/cmkreazta0000e7fz1b3gsjhp	t	2026-01-23 21:31:11.343
cml544eqz000yeb8jcg9dmvqy	cmldva9ag0000ecaolcrcoytk	PHOTOS_UPLOADED	Nye bilder	Nye bilder er lagt til i albumet: Julebord 2025	/gallery/cmjj6n6qk0000ee93nrojmx9n	t	2026-02-02 11:54:54.246
cml5453q50027eb8jkfehoxt9	cmldva9ag0000ecaolcrcoytk	PHOTOS_UPLOADED	Nye bilder	Nye bilder er lagt til i albumet: Julebord 2025	/gallery/cmjj6n6qk0000ee93nrojmx9n	t	2026-02-02 11:55:26.618
cml84i0ki0003e8c92l1fda66	cmldva9ag0000ecaolcrcoytk	POST_CREATED	Nytt innlegg	"epost test" har blitt publisert.	/posts/cml84i0f50001e8c9gwyicmuc	t	2026-02-04 14:28:47.583
cml84pfiv0009e8c9m5ivrxcl	cmldva9ag0000ecaolcrcoytk	POST_CREATED	Nytt innlegg	"test email" har blitt publisert.	/posts/cml84pfde0007e8c9ckls0ilp	t	2026-02-04 14:34:33.556
cml99l9t50002cya9scirlqw1	cmldva9ag0000ecaolcrcoytk	POST_CREATED	Nytt innlegg	"Velkommen til Strøen Søns nettsiden!" har blitt publisert.	/posts/cml99l9mb0000cya9ua1szmtm	t	2026-02-05 09:39:03.781
cml6i9izh0005e7ernj6h3juj	cmldva9ag0000ecaolcrcoytk	POST_CREATED	Nytt innlegg	"Test" har blitt publisert.	/posts/cml6i9iug0000e7erwbb5mhqx	t	2026-02-03 11:18:33.818
cmldv766z0005ecaqxi1cs8v2	cmldva9ag0000ecaolcrcoytk	INVOICE_CREATED	Ny Medlemskontingent: Medlemskontingent 2026-02	Din faktura for 2/2026 er nå tilgjengelig. Beløp: 750 kr.	/dashboard	t	2026-02-08 14:55:02.171
cmlgiocrh0004ech5hx5h77ba	cmldva9ag0000ecaolcrcoytk	POST_UPDATED	Innlegg oppdatert	"Velkommen til Strøen Søns nettsiden!" har blitt oppdatert.	/posts/cml99l9mb0000cya9ua1szmtm	f	2026-02-10 11:27:47.354
cmlgiocrh0005ech5m96bkvc5	cmldva9ag0000ecaolcrcoytk	POST_UPDATED	Innlegg oppdatert	"Velkommen til Strøen Søns nettsiden!" har blitt oppdatert.	/posts/cml99l9mb0000cya9ua1szmtm	f	2026-02-10 11:27:47.354
cmlgiocrh0006ech54by3lowa	cmldva9ag0000ecaolcrcoytk	POST_UPDATED	Innlegg oppdatert	"Velkommen til Strøen Søns nettsiden!" har blitt oppdatert.	/posts/cml99l9mb0000cya9ua1szmtm	f	2026-02-10 11:27:47.354
cmlgiocrh0007ech5h7116qba	cmldva9ag0000ecaolcrcoytk	POST_UPDATED	Innlegg oppdatert	"Velkommen til Strøen Søns nettsiden!" har blitt oppdatert.	/posts/cml99l9mb0000cya9ua1szmtm	t	2026-02-10 11:27:47.354
cmlgkxj9d000dec9ctlvmyot5	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Vinterleker 2026" har blitt oppdatert.	/events/cmlb3c44n0000fhdaszza4yu9	f	2026-02-10 12:30:54.91
cmlgkxj9d000eec9c0hv6nqhd	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Vinterleker 2026" har blitt oppdatert.	/events/cmlb3c44n0000fhdaszza4yu9	f	2026-02-10 12:30:54.91
cmlgkxj9d000fec9ctdqccl82	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Vinterleker 2026" har blitt oppdatert.	/events/cmlb3c44n0000fhdaszza4yu9	f	2026-02-10 12:30:54.91
cmlgkxj9d000cec9cloh0ov3d	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Vinterleker 2026" har blitt oppdatert.	/events/cmlb3c44n0000fhdaszza4yu9	t	2026-02-10 12:30:54.91
cmlgmcpy7000tec9c39ym7odn	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-10 13:10:43.036
cmlgmcpy7000uec9cfw47ghqr	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-10 13:10:43.036
cmlgmcpy7000vec9ci5u92dlq	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-10 13:10:43.036
cmlgmcpy7000sec9c5d7p0jdj	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	t	2026-02-10 13:10:43.036
cmlhnoakx0004e0f0gxkcw5vb	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-11 06:35:28.781
cmlhnoakx0006e0f0csclvko8	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-11 06:35:28.781
cmlhnoakx0007e0f0fyb1o4jt	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	f	2026-02-11 06:35:28.781
cmlhnoakx0005e0f0mhclxbdw	cmldva9ag0000ecaolcrcoytk	EVENT_UPDATED	Arrangement oppdatert	"Sommertur 2026" har blitt oppdatert.	/events/cmlaq9wft0000fm6c6ikkjns4	t	2026-02-11 06:35:28.781
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Payment" (id, period, amount, status, "paidAt", "memberId", "updatedAt") FROM stdin;
cmja627mg000te7dtp0r9uv3d	2025-12	\N	UNPAID	\N	cmldva9ag0000ecaolcrcoytk	2026-02-10 09:54:55.644
cml7rvixy0001gt73nkfitgx0	2026-02	\N	UNPAID	\N	cmldva9ag0000ecaolcrcoytk	2026-02-10 09:54:55.644
\.


--
-- Data for Name: Transaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Transaction" (id, amount, description, category, date, "memberId", "eventId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PaymentRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PaymentRequest" (id, title, description, amount, "dueDate", status, category, "memberId", "eventId", "transactionId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Photo; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Photo" (id, url, caption, "eventId", "createdAt", "updatedAt") FROM stdin;
cml5447dt0002eb8ji4hpgj1i	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICMyhD3KVinXOvgDrYj9WiJlS5RwHGbKoA46a3	a8fed7f420a88cbfde80f004bb79bf9d.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:44.705	2026-02-02 11:54:44.705
cml544ru30011eb8jja33s50m	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICNlGJbbLYw6jzhosRuCLnEVMlbTqW5IxdmAPS	e8682640e78b303ac48ff98f9b7913d8.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:11.211	2026-02-02 11:55:11.211
cml544rwb0012eb8j512mfuig	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICXfAaJIbb7oDnEf6JQUlLd5VmWpIi1RZXT0Mq	e4a510ef2fcc2d002a40e0429da78b20.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:11.291	2026-02-02 11:55:11.291
cml544s0o0015eb8jtnwhx41s	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICs75oGx8L21FECwgIvBb5uXGohy4UdfmDMWq9	f0772226ca1a8104a72447dd1bc9b268.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:11.448	2026-02-02 11:55:11.448
cml544s0t0016eb8jd4etqxnc	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICLGt30ogENup4PTcD7IZvbUQdHMCfS96wWKjA	e19089615c350555c58c3ff56a44099d.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:11.453	2026-02-02 11:55:11.453
cml544tak0017eb8j2dhqsmrr	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICt2sYWtI1vqAJx3aLnhV7Zr52G8eYFKjkdXtc	4447ebb5f31b855e8d07b8b562e4dc39.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:13.1	2026-02-02 11:55:13.1
cml544tcl0018eb8j9yhh287u	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICseoC338L21FECwgIvBb5uXGohy4UdfmDMWq9	30bc7d23f14970abe45bd6cd589859a8.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:13.173	2026-02-02 11:55:13.173
cml544td40019eb8jcggysvl5	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICVqHMZTuwbmkMajdD5QuKH98gfo23JqxIiNOe	32f72c31993969a6630028476ca996cb.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:13.192	2026-02-02 11:55:13.192
cml544tdo001aeb8jwrtmlqya	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICCKOkssoXuhICrLaHSWJfvs3V5PGRKNkYdy7o	e1fac1061e66644c855580fecf3e923f.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:13.212	2026-02-02 11:55:13.212
cml544tfv001beb8j6k7ctto3	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICZByobuRASEYWMwN3vms95nL2P1ZhTRHufbJB	337ba70cb7e97c84d0252527cfacb271.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:13.291	2026-02-02 11:55:13.291
cml544thz001ceb8jxb3isqho	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICilkIlkYthDFQqwc8KWfTBV0PCZANyL62uxHe	3cb9fcc9d92349bef8b5e0f280dbe69b.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:13.367	2026-02-02 11:55:13.367
cml544ugh001deb8jq2kxitdo	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIC7scleh4qm92FMH1ywhZ3CuoGJXjRbt0kvl6r	9edd471aceefb53e6682d9f5ff92bc0d.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:14.609	2026-02-02 11:55:14.609
cml544vmp001eeb8j6b3s5kb8	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICChbeAjoXuhICrLaHSWJfvs3V5PGRKNkYdy7o	ee073a691420577e8435a93ba6ab3175.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:16.129	2026-02-02 11:55:16.129
cml544vyq001feb8jvhejjonv	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICt8OOFPMI1vqAJx3aLnhV7Zr52G8eYFKjkdXt	9cb89b4111e6156b8120c32d16222efe.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:16.562	2026-02-02 11:55:16.562
cml544vzp001geb8jfejd2tup	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICbqMxZ0CTUXKrVkN5ME4mLvZPi0lwIdhAYWCR	03756f96be72257749786ea82ab2d3db.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:16.597	2026-02-02 11:55:16.597
cml544w5c001heb8j4xegvo34	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICZFnHW7RASEYWMwN3vms95nL2P1ZhTRHufbJB	03857e8a46ee4efe19167b87b5af9ac3.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:16.8	2026-02-02 11:55:16.8
cml544w5q001ieb8jss6fgozb	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICGPPdEvaNohXs61lMCV57zec3HPnQgmfWArL9	fd11adf942d2e3d80072b7cb13a41e36.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:16.814	2026-02-02 11:55:16.814
cml544wlk001jeb8jz3ss4lr9	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICF92ey9DnxTtsPOYfN2vQmHi6VW0F3RELGUyM	0b57b1ed7b6f906ebb1b9dcb4bee5299.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:17.384	2026-02-02 11:55:17.384
cml544wps001keb8je07auxn1	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICTDLgSjnDC7kHJmtMY02Krsxj9vLRgSAwnPfX	21cc5f353479fe22160ef411fefdd09f.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:17.536	2026-02-02 11:55:17.536
cml544x2u001leb8jdlfe18td	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICI6t65VsrxfY7PqQL4S0wjXRuVk3No8pimTaW	4accf3f729dae942476e45a624aa2b30.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:18.006	2026-02-02 11:55:18.006
cml544ymg001meb8jrav6kbym	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICJCYI8NX7hrwnXNvCMtE0BP3SLTGbzlFgIUO4	0f531be94f10e5f1fcb3414296f44811.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:20.008	2026-02-02 11:55:20.008
cml544ymp001neb8jiordm6zm	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICSTlLfG1GnpoWHT3ADfXLh5cVaPxmjky9eICK	682ea392c77ec9787521ed1b437d6279.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:20.017	2026-02-02 11:55:20.017
cml544yri001oeb8jnzaln52k	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICqWJJ0Ij97nvH8bRVkYO04aAxGisezQXUJ3Dl	54cb4dbf59f2ba6608a50bc3dd027c0e.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:20.19	2026-02-02 11:55:20.19
cml544z32001peb8jah14g6rp	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICw4N4BhklPy74S1tARj8iMTGCmzI5ZvoXFWNh	9f9f82741cc47c8168f10003bd3d23e5.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:20.606	2026-02-02 11:55:20.606
cml544z4v001qeb8jkj0h6ybl	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICTSQbMMnDC7kHJmtMY02Krsxj9vLRgSAwnPfX	92ac310d80146fc87453b07057f5089b.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:20.671	2026-02-02 11:55:20.671
cml544z83001reb8jqqvpttgf	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICt36ToHI1vqAJx3aLnhV7Zr52G8eYFKjkdXtc	19c4d8418c4c723b6637202477967ad8.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:20.787	2026-02-02 11:55:20.787
cml54507s001seb8j756qkodz	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICYdCphvOy7UnOzlVZdIPMyf8mScvwJE4Kutq1	8abaacebbcdbc127a5b37668a7e15502.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:22.072	2026-02-02 11:55:22.072
cml54508w001teb8j6kn13y1x	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICdCqk1vZmbKRaO2JfsAPX41eMB7zcg9pr3ni6	45234bd634939406263c2f577c716bce.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:22.112	2026-02-02 11:55:22.112
cml5450nv001ueb8j8l0u8yvz	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICYfrVWLy7UnOzlVZdIPMyf8mScvwJE4Kutq1B	1566db5e80d3a9220b2861d60bf1ecb8.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:22.651	2026-02-02 11:55:22.651
cml5450pv001veb8j6vic9z4y	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICV4MD0fLuwbmkMajdD5QuKH98gfo23JqxIiNO	088e31bd3776850f0201bfc56315ac5e.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:22.723	2026-02-02 11:55:22.723
cml5450v3001web8j3ublp904	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIC62JKy1dgLS1stIvfy4mdGZz27iwUYXjFWr8b	8a8150d16810f79bc85830ed8fe62b88.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:22.911	2026-02-02 11:55:22.911
cml54512t001xeb8jlldt5j32	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICmZRdo3QkdnRHLGxNVithZKQ1c8uJpeWo2w95	87a2e776dd6097454f3a369c719155af.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:23.189	2026-02-02 11:55:23.189
cml5451eh001yeb8j2v4ys88w	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICL2hGEFgENup4PTcD7IZvbUQdHMCfS96wWKjA	fcd52891952353241f8567ec6522eefa.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:23.609	2026-02-02 11:55:23.609
cml5447ar0000eb8jeue7eu4d	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICsXw1nP8L21FECwgIvBb5uXGohy4UdfmDMWq9	d3ed8b3bb18c8faf7ea0da9f6fad6ca8.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:44.594	2026-02-02 11:54:44.594
cml5447dp0001eb8j4c0jdpn5	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIC3hyZP3licuqlHA2MjyrNa3hesKBYXVJ7UZC8	cb234953524cdcadaadab66f77ba4d4b.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:44.701	2026-02-02 11:54:44.701
cml5447du0003eb8jnew0bbsk	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICFgh2CsDnxTtsPOYfN2vQmHi6VW0F3RELGUyM	ab6e1bcae8a7ff231aa4374b9cf35d10.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:44.706	2026-02-02 11:54:44.706
cml5447fa0004eb8j047k1yw7	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICo0bFvetvNEQ1z63xPiJkb7w8WGCeHFTRraVU	bccacf0acaa5a6f3317b78d5973376ae.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:44.758	2026-02-02 11:54:44.758
cml5447i20005eb8j3sdcx8ho	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIC5QyfY8MkoRY9CzIH81wmxUMiOZNSlJ4pV0hG	b292258dfcf650328a44f4648e593562.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:44.858	2026-02-02 11:54:44.858
cml5448u30006eb8jcqipwiic	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIChuugPzWH9xPQlEu1MwAX38bsIRNztV6FSCZG	ddb963aac95819f53af0a2181833f23d.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:46.587	2026-02-02 11:54:46.587
cml5448yf0007eb8j5na73lj1	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIC8AQ7EUcGBW8K9hTzN13ODaFgVE7ufMUxymCc	bd7a95c94ff976afc8922e7fa7018752.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:46.743	2026-02-02 11:54:46.743
cml5448yy0008eb8jim4mkk98	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICYOwm7ny7UnOzlVZdIPMyf8mScvwJE4Kutq1B	a711cf92c46ccfbf3d20c75fb8a2d78a.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:46.762	2026-02-02 11:54:46.762
cml5448zu0009eb8jr6l1lnfg	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICLWXCv6gENup4PTcD7IZvbUQdHMCfS96wWKjA	bb703465ce0ffcb43cad154e607f1565.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:46.794	2026-02-02 11:54:46.794
cml54490h000aeb8j3giafa1k	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICXBO6S3bb7oDnEf6JQUlLd5VmWpIi1RZXT0Mq	ccb84bc728e2c3d13fa589fdf2f0c8a4.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:46.816	2026-02-02 11:54:46.816
cml54493c000beb8jkjdcseyx	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICwficLzklPy74S1tARj8iMTGCmzI5ZvoXFWNh	aea3250f4ae787c1cbb5a3b260ac9337.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:46.919	2026-02-02 11:54:46.919
cml5449yl000ceb8jnnv1qy9m	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIChj1FsPWH9xPQlEu1MwAX38bsIRNztV6FSCZG	bf6bea7242c12c316d62d014e5de8f7c.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:48.045	2026-02-02 11:54:48.045
cml544a2l000deb8j5k25rq30	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICFvsbYtDnxTtsPOYfN2vQmHi6VW0F3RELGUyM	d937617df82ff66558a588b89a9952f5.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:48.189	2026-02-02 11:54:48.189
cml544a2x000eeb8juq6bw1l5	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICyZoirCs66J4g9QWV2f8Fpa7G0lTvbZhN1Kko	9550492e3b8954c823f5d7d9048af490.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:48.201	2026-02-02 11:54:48.201
cml544a3z000feb8j1kmkuehe	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICrekWROV6pmrjoRW5Nha29CcEqki8vwJgtDxB	af6c89181bb264fc29992d79059c818c.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:48.239	2026-02-02 11:54:48.239
cml544a4u000geb8jsclnkbyg	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICDbAvpxBWfJIwZTsHFBmpyd9u8EPgrQ3x25o6	b62ea20deff8aeb10b988da6b5000487.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:48.27	2026-02-02 11:54:48.27
cml544a6i000heb8jj076rzka	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICMKYWYXinXOvgDrYj9WiJlS5RwHGbKoA46a3U	d07f4aa9777d45816f2333ec3a985796.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:48.33	2026-02-02 11:54:48.33
cml544b3e000ieb8jglyy067f	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIC79nrqX4qm92FMH1ywhZ3CuoGJXjRbt0kvl6r	570181094026aee5ac07b9ebcfab6757.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:49.514	2026-02-02 11:54:49.514
cml544b7h000jeb8jtaqdq55g	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICBpeDjuFSRjiutIrp3AUyXFeJSfYLQmnBdl0D	cc7dc339e3ed01683bacd74294014849.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:49.661	2026-02-02 11:54:49.661
cml544b89000keb8jjs0mdnn4	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICbz4JFpCTUXKrVkN5ME4mLvZPi0lwIdhAYWCR	d491f21fda44c09313f6a3e8e75a2ae1.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:49.689	2026-02-02 11:54:49.689
cml544b8v000leb8jqxr7vmqx	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICLWBqaNgENup4PTcD7IZvbUQdHMCfS96wWKjA	b884f4f8ebc554555624c1d0220484ac.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:49.711	2026-02-02 11:54:49.711
cml544bag000meb8j9iv03dlk	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIC1VrzZKjpoH9UxdEXe4Ocim7ZbnRjs8lMgaQG	b0fafbe49b0819266da3da8c715ada36.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:49.768	2026-02-02 11:54:49.768
cml544bba000neb8j0lefk26y	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICBpGchSRjiutIrp3AUyXFeJSfYLQmnBdl0D1Z	d42623eb225e461fa4121a4799cef77d.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:49.798	2026-02-02 11:54:49.798
cml544c81000oeb8jdwcxz54m	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICJC2yOWEX7hrwnXNvCMtE0BP3SLTGbzlFgIUO	c3f17e1784ff705e7d580cc62ffbc3ff.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:50.977	2026-02-02 11:54:50.977
cml544ccq000peb8jz9c6clts	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICBpeNoYYSRjiutIrp3AUyXFeJSfYLQmnBdl0D	ae9d063e81d93621a32acd71ff153d37.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:51.146	2026-02-02 11:54:51.146
cml544cg4000qeb8jy8t2pf2q	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICtG0NcSI1vqAJx3aLnhV7Zr52G8eYFKjkdXtc	ac7b96d3d57684cd891645ae8c95cde5.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:51.268	2026-02-02 11:54:51.268
cml544ch0000reb8j0tu8cjk8	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICWP9kKfJVcb7QDrkfAnIFzje0ZCPtNdYvluqs	a5af68f2f8d636af0191930a2200aed5.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:51.3	2026-02-02 11:54:51.3
cml544cie000seb8jwop3t5fs	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICVMGQmHuwbmkMajdD5QuKH98gfo23JqxIiNOe	bbdf9723b587a8b36a910d228d6cdbbc.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:51.35	2026-02-02 11:54:51.35
cml544cjg000teb8j5l4kb8eh	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIC4eUwsyAO1wHsvSgkuW0fQoA43tyB2VeRbPGd	bee797cc269663a90ebb92ad71f08fd1.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:54:51.388	2026-02-02 11:54:51.388
cml544rwc0013eb8jk7a086re	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICqfoWbyj97nvH8bRVkYO04aAxGisezQXUJ3Dl	edaced650328ed298de2597e3bae7924.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:11.292	2026-02-02 11:55:11.292
cml544rxj0014eb8jvfenllib	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICVoy6obuwbmkMajdD5QuKH98gfo23JqxIiNOe	e24ffb5606d442847aa288a7e55d9707.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:11.335	2026-02-02 11:55:11.335
cml5451lj001zeb8j62hcfonw	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICuAdG1xx7vyEjn6XzZUDRJm4dcYkVp8ohTKlf	7d2d4e882feeec67ccfef731baf0c0ce.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:23.863	2026-02-02 11:55:23.863
cml5451xe0020eb8jydfd9qkv	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICnjSd1secXzjO6Ct0M3knBNvYy7dsRrmUhxVl	8ff7f696c020ddc5c47b247bee5d2c14.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:24.29	2026-02-02 11:55:24.29
cml54521v0021eb8jrzcufn16	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhICk0RT0zOgzYB905nwSRMF4pKDCV7yHouIfGar	629e0dbdeebad6de1d0e17601a9d164b.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:24.451	2026-02-02 11:55:24.451
cml5452390022eb8jwc7d5ljc	https://sl7mpywppd.ufs.sh/f/CMQfZeoXuhIC38E5solicuqlHA2MjyrNa3hesKBYXVJ7UZC8	0b8bfb7da93c7a21051a4a60be3e98ad.jpeg	cmjj6n6qk0000ee93nrojmx9n	2026-02-02 11:55:24.501	2026-02-02 11:55:24.501
\.


--
-- Data for Name: PlanItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PlanItem" (id, "time", title, description, "order", "eventId", date) FROM stdin;
cmlgkxj2c000aec9cjh10s722	11:00	Vinterleker	Vinterlekene starter klokken 11	0	cmlb3c44n0000fhdaszza4yu9	2026-02-28 00:00:00
cmlgkxj2c000bec9c1gx2qtjh	19:00	Bankett	Banketten starter klokken 19 hos Fabian (Frognerseterveien 16)	1	cmlb3c44n0000fhdaszza4yu9	2026-02-28 00:00:00
cmlgnd6pg000wec9csomm67fl	17:00	Vors hos Jan		0	cmjj6n6qk0000ee93nrojmx9n	2025-11-15 00:00:00
cmlgnd6pg000xec9cw0n8p9h2	19:00	Middag Lorry		1	cmjj6n6qk0000ee93nrojmx9n	2025-11-15 00:00:00
cmlgnd6ph000yec9cowrpl0ew	21:00	Byen		2	cmjj6n6qk0000ee93nrojmx9n	2025-11-15 00:00:00
cmlhnoae50000e0f01u6nm3ek	09:45	OSL-BEG	Flyr fra Oslo til Beograd. Lander 12.30 lokal tid	0	cmlaq9wft0000fm6c6ikkjns4	2026-07-25 00:00:00
cmlhnoae50001e0f0ed7a8vr5	23:40	BEG-LCA	Flyr fra Beograd til Kypros. Lander 03:10 lokal tid	1	cmlaq9wft0000fm6c6ikkjns4	2026-07-27 00:00:00
cmlhnoae50002e0f0e4x195mi	14:30	LCA-BEG	Flyr fra Kypros til Beograd. Lander 16:15	2	cmlaq9wft0000fm6c6ikkjns4	2026-08-02 00:00:00
cmlhnoae50003e0f0uyhqfqg6	17:20	BEG-OSL	Flyr fra Beograd til Oslo. Lander 20:15	3	cmlaq9wft0000fm6c6ikkjns4	2026-08-02 00:00:00
\.


--
-- Data for Name: Post; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Post" (id, title, content, "authorId", "eventId", "createdAt", "updatedAt", "isPinned", category) FROM stdin;
cml99l9mb0000cya9ua1szmtm	Velkommen til Strøen Søns nettsiden!	Dette er den offisielle nettsiden til Strøen Søns! Hensikten med denne er en samlet plass for alt som har med klubben å gjøre. Målet er enkelt: gjøre det lett å holde oversikt, melde seg på, og faktisk få ting til å skje – uten at alt må løses i chat, tilfeldige notater eller “hvem husker hva”.\n\n## Hovedmeny\n- **Hjem:** Rask oversikt over det viktigste akkurat nå – kommende arrangementer, siste nytt og eventuelle frister/oppgaver.\n- **Innlegg:** Klubbnytt og oppdateringer fra styret/ARKOM – info, endringer, påminnelser og oppsummeringer.\n- **Arrangementer:** Se alle arrangementer, les detaljer (tid/sted/praktisk), meld deg på/av, og se deltakerliste der det er relevant.\n- **Bildearkiv:** Se og gjenopplev minner fra turer og arrangementer – album sortert etter år/arrangement.\n- **Medlemmer:** Oversikt over medlemslisten – kontaktinfo og roller (styre/ARKOM) så du vet hvem du skal spørre om hva.\n- **Om klubben:** Alt det faste – hvem vi er, årshjulet, regler/vedtekter, roller, og hvordan klubben drives.\n\n## Min Konto\n- **Min konto:** Administrer profilen din – personalia/kontaktinfo, passord og innstillinger knyttet til kontoen.\n- **Mine arrangementer:** Din personlige oversikt – hva du er påmeldt, kommende planer og historikk på tidligere arrangementer.\n- **Saldo:** Se innbetalinger og status på bidrag/utgifter – hva du skylder, hva du har betalt, og eventuelle transaksjoner/oppgjør.	cmldva9ag0000ecaolcrcoytk	\N	2026-02-05 09:39:03.533	2026-02-10 13:52:30.901	f	NYHET
\.


--
-- Data for Name: PostAttachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PostAttachment" (id, url, name, size, type, "postId", "createdAt") FROM stdin;
\.


--
-- Data for Name: SystemSetting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SystemSetting" (key, value, description) FROM stdin;
\.


--
-- Data for Name: _EventAttendees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."_EventAttendees" ("A", "B") FROM stdin;
cmlb3c44n0000fhdaszza4yu9	cmldva9ag0000ecaolcrcoytk
cmlaq9wft0000fm6c6ikkjns4	cmldva9ag0000ecaolcrcoytk
cmlb3c44n0000fhdaszza4yu9	cmldva9ag0000ecaolcrcoytk
\.


--
-- PostgreSQL database dump complete
--

\unrestrict cHEqIXPwczXAfnkFbdY6MPS98ypXTC2NEsej0M3EdkbGOUZg9YCn3HcZxs2m0fg

