"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import OtpremanjeSlike from "@/components/OtpremanjeSlike";

/**
 * Obrazac za unos recepta (slika 4.5).
 *
 * Namirnica se ne unosi kao slobodan tekst, već se bira iz rezultata
 * pretrage nutritivne baze (FZ-7). Uz izabranu namirnicu unosi se
 * količina izražena u gramima.
 *
 * Panel sa obračunom ažurira se tokom unosa i služi isključivo za
 * prikaz. Vrednosti koje se upisuju u bazu izračunava server pri
 * čuvanju recepta, jer se prikaz na klijentskoj strani može izmeniti.
 */

type Namirnica = {
  id: string;
  nazivSr: string;
  nazivIzvorni: string;
  kcalNa100g: number;
  proteiniNa100g: number;
  ugljeniHidratiNa100g: number;
  mastiNa100g: number;
};

type IzabranaNamirnica = Namirnica & { kolicinaG: number | "" };

const KASNJENJE_PRETRAGE = 300; // ms
const PODRAZUMEVANA_KOLICINA = 100;

export default function ObrazacRecepta() {
  const ruter = useRouter();
  const tajmer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [naslov, postaviNaslov] = useState("");
  const [opis, postaviOpis] = useState("");
  const [postupak, postaviPostupak] = useState("");
  
  const [oznake, postaviOznake] = useState<string[]>([]);
  const [unosOznake, postaviUnosOznake] = useState("");

  const [izabrane, postaviIzabrane] = useState<IzabranaNamirnica[]>([]);

  const [pojam, postaviPojam] = useState("");
  const [rezultati, postaviRezultate] = useState<Namirnica[]>([]);
  const [pretragaUToku, postaviPretraguUToku] = useState(false);

  const [slanje, postaviSlanje] = useState(false);
  const [greska, postaviGresku] = useState<string | null>(null);
  const [greskePolja, postaviGreskePolja] = useState<Record<string, string[]>>({});

  
  const [urlSlike, postaviUrlSlike] = useState<string | null>(null);
  const [brojPorcija, postaviBrojPorcija] = useState<number | "">(2);
  // --------------------------------------------------------- pretraga
  useEffect(() => {
    if (tajmer.current) clearTimeout(tajmer.current);

    if (pojam.trim().length < 2) {
      postaviRezultate([]);
      return;
    }

    // Zahtev se šalje tek nakon kratke pauze u kucanju, kako se ne bi
    // slao poseban zahtev za svaki uneti znak.
    tajmer.current = setTimeout(async () => {
      postaviPretraguUToku(true);
      try {
        const odgovor = await fetch(
          `/api/namirnice?q=${encodeURIComponent(pojam.trim())}`
        );
        if (odgovor.ok) {
          const podaci = await odgovor.json();
          postaviRezultate(podaci.rezultati);
        }
      } finally {
        postaviPretraguUToku(false);
      }
    }, KASNJENJE_PRETRAGE);

    return () => {
      if (tajmer.current) clearTimeout(tajmer.current);
    };
  }, [pojam]);

  // --------------------------------------------------------- namirnice
  function dodajNamirnicu(n: Namirnica) {
    if (izabrane.some((i) => i.id === n.id)) return;
    postaviIzabrane([...izabrane, { ...n, kolicinaG: PODRAZUMEVANA_KOLICINA }]);
    postaviPojam("");
    postaviRezultate([]);
  }

    function izmeniKolicinu(id: string, unos: string) {
    const vrednost = unos === "" ? "" : Number(unos);
    postaviIzabrane(
      izabrane.map((i) => (i.id === id ? { ...i, kolicinaG: vrednost } : i))
    );
  }

  function ukloniNamirnicu(id: string) {
    postaviIzabrane(izabrane.filter((i) => i.id !== id));
  }

  // --------------------------------------------------------- oznake
  function dodajOznaku() {
    const naziv = unosOznake.trim().toLowerCase();
    if (naziv.length < 2 || oznake.includes(naziv) || oznake.length >= 6) return;
    postaviOznake([...oznake, naziv]);
    postaviUnosOznake("");
  }

  // --------------------------------------------------------- obračun
  const ukupno = izabrane.reduce(
    (zbir, n) => {
      const cinilac = (Number(n.kolicinaG) || 0) / 100;
      return {
        kcal: zbir.kcal + n.kcalNa100g * cinilac,
        proteini: zbir.proteini + n.proteiniNa100g * cinilac,
        uh: zbir.uh + n.ugljeniHidratiNa100g * cinilac,
        masti: zbir.masti + n.mastiNa100g * cinilac,
      };
    },
    { kcal: 0, proteini: 0, uh: 0, masti: 0 }
  );

  const porcije = Number(brojPorcija) > 0 ? Number(brojPorcija) : 1;
  const svePopunjene = izabrane.every((n) => Number(n.kolicinaG) > 0);

  // --------------------------------------------------------- slanje
  async function posalji(dogadjaj: React.FormEvent) {
    dogadjaj.preventDefault();
    postaviGresku(null);
    postaviGreskePolja({});
    postaviSlanje(true);

    try {
      const odgovor = await fetch("/api/recepti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naslov,
          opis,
          urlSlike,
          postupakPripreme: postupak,
	  brojPorcija: Number(brojPorcija) || 1,
          oznake,
          sastav: izabrane.map((n) => ({
            namirnicaId: n.id,
            kolicinaG: Number(n.kolicinaG) || 0,
          })),
        }),
      });

      const podaci = await odgovor.json();

      if (!odgovor.ok) {
        postaviGresku(podaci.greska ?? "Došlo je do greške.");
        if (podaci.detalji) postaviGreskePolja(podaci.detalji);
        return;
      }

      ruter.push("/");
    } catch {
      postaviGresku("Nije moguće uspostaviti vezu sa serverom.");
    } finally {
      postaviSlanje(false);
    }
  }

  const poljeGreska = (naziv: string) => greskePolja[naziv]?.[0];

  return (
    <form onSubmit={posalji} className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-semibold">Novi recept</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* ------------------------------------------------ levo */}
        <div className="space-y-6">
          <Polje naziv="Naslov" greska={poljeGreska("naslov")}>
            <input
              value={naslov}
              onChange={(e) => postaviNaslov(e.target.value)}
              maxLength={120}
              required
              className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
            />
          </Polje>

          <Polje naziv="Kratak opis" greska={poljeGreska("opis")}>
            <textarea
              value={opis}
              onChange={(e) => postaviOpis(e.target.value)}
              rows={3}
              maxLength={1000}
              required
              className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
            />
          </Polje>

          <Polje
            naziv="Postupak pripreme"
            greska={poljeGreska("postupakPripreme")}
          >
            <textarea
              value={postupak}
              onChange={(e) => postaviPostupak(e.target.value)}
              rows={7}
              maxLength={5000}
              required
              className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
            />
          </Polje>

          <div className="grid grid-cols-[140px_1fr] gap-4">
            <Polje naziv="Broj porcija" greska={poljeGreska("brojPorcija")}>
              <input
                type="number"
                min={1}
                max={50}
                value={brojPorcija}
                onChange={(e) => postaviBrojPorcija(e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
              />
            </Polje>

            <Polje naziv="Oznake" greska={poljeGreska("oznake")}>
              <div className="flex gap-2">
                <input
                  value={unosOznake}
                  onChange={(e) => postaviUnosOznake(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      dodajOznaku();
                    }
                  }}
                  placeholder="obrok, užina, vegetarijansko..."
                  className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
                />
                <button
                  type="button"
                  onClick={dodajOznaku}
                  className="rounded border border-neutral-600 px-3"
                >
                  Dodaj
                </button>
              </div>
              {oznake.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {oznake.map((o) => (
                    <span
                      key={o}
                      className="rounded-full border border-neutral-600 px-3 py-1 text-sm"
                    >
                      {o}
                      <button
                        type="button"
                        onClick={() =>
                          postaviOznake(oznake.filter((x) => x !== o))
                        }
                        className="ml-2 text-neutral-400"
                        aria-label={`Ukloni oznaku ${o}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Polje>
          </div>

          {/* -------------------------------------------- namirnice */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-3 font-medium">Namirnice</h2>
              <input
                value={pojam}
                onChange={(e) => postaviPojam(e.target.value)}
                placeholder="Pretražite namirnicu..."
                className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
              />

              {pretragaUToku && (
                <p className="mt-2 text-sm text-neutral-400">Pretraga...</p>
              )}

              {rezultati.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {rezultati.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => dodajNamirnicu(n)}
                        className="w-full rounded border border-neutral-700 px-3 py-2 text-left text-sm hover:border-neutral-500"
                      >
                        <span className="block">{n.nazivSr}</span>
                        <span className="text-xs text-neutral-400">
                          {n.kcalNa100g} kcal / 100 g
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {pojam.trim().length >= 2 &&
                !pretragaUToku &&
                rezultati.length === 0 && (
                  <p className="mt-2 text-sm text-neutral-400">
                    Nema rezultata. Namirnica se mora izabrati iz baze.
                  </p>
                )}
            </div>

            <div>
              <h2 className="mb-3 font-medium">
                Izabrane namirnice ({izabrane.length})
              </h2>

              {izabrane.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  Nijedna namirnica još nije izabrana.
                </p>
              ) : (
                <ul className="space-y-2">
                  {izabrane.map((n) => (
                    <li key={n.id} className="flex items-center gap-2">
                      <span className="flex-1 truncate text-sm" title={n.nazivSr}>
                        {n.nazivSr}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        value={n.kolicinaG}
                        onChange={(e) => izmeniKolicinu(n.id, e.target.value)}
                        className="w-20 rounded border border-neutral-600 bg-transparent px-2 py-1 text-right"
                      />
                      <span className="text-sm text-neutral-400">g</span>
                      <button
                        type="button"
                        onClick={() => ukloniNamirnicu(n.id)}
                        className="text-neutral-400"
                        aria-label={`Ukloni ${n.nazivSr}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {poljeGreska("sastav") && (
                <p className="mt-2 text-sm text-red-400">
                  {poljeGreska("sastav")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ desno */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded border border-neutral-600 p-4">
            <h2 className="mb-4 font-medium">Obračun</h2>
            <Red naziv="Ukupno" vrednost={`${ukupno.kcal.toFixed(0)} kcal`} />
            <Red
              naziv="Po porciji"
              vrednost={`${(ukupno.kcal / porcije).toFixed(0)} kcal`}
              istaknuto
            />
            <hr className="my-3 border-neutral-700" />
            <Red
              naziv="Proteini / porcija"
              vrednost={`${(ukupno.proteini / porcije).toFixed(1)} g`}
            />
            <Red
              naziv="UH / porcija"
              vrednost={`${(ukupno.uh / porcije).toFixed(1)} g`}
            />
            <Red
              naziv="Masti / porcija"
              vrednost={`${(ukupno.masti / porcije).toFixed(1)} g`}
            />
            <p className="mt-4 text-xs text-neutral-500">
              Prikaz je informativan. Konačne vrednosti izračunava server
              pri čuvanju recepta.
            </p>
          </div>

          {greska && (
            <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {greska}
            </p>
          )}
	  <OtpremanjeSlike urlSlike={urlSlike} postaviUrl={postaviUrlSlike} />
          <button
            type="submit"
            disabled={slanje || izabrane.length === 0 || !svePopunjene}
            className="w-full rounded bg-neutral-200 px-4 py-3 font-medium text-neutral-900 disabled:opacity-40"
          >
            {slanje ? "Čuvanje..." : "Sačuvaj recept"}
          </button>
        </aside>
      </div>
    </form>
  );
}

function Polje({
  naziv,
  greska,
  children,
}: {
  naziv: string;
  greska?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-neutral-300">{naziv}</label>
      {children}
      {greska && <p className="mt-1 text-sm text-red-400">{greska}</p>}
    </div>
  );
}

function Red({
  naziv,
  vrednost,
  istaknuto,
}: {
  naziv: string;
  vrednost: string;
  istaknuto?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-sm text-neutral-400">{naziv}</span>
      <span className={istaknuto ? "text-lg font-semibold" : "font-medium"}>
        {vrednost}
      </span>
    </div>
  );
}
