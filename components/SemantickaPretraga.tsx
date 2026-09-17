"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Претрага рецепата на основу расположивих намирница (слика 4.6).
 *
 * Уз сваки резултат приказана је мера сличности, чиме је кориснику
 * учињено видљивим по ком критеријуму је редослед формиран (ФЗ-18).
 */

type Rezultat = {
  id: string;
  naslov: string;
  urlSlike: string | null;
  kcalPoPorciji: number;
  proteiniPoPorciji: number;
  slicnost: number;
};

export default function SemantickaPretraga() {
  const [namirnice, postaviNamirnice] = useState("");
  const [maxKcal, postaviMaxKcal] = useState("");
  const [rezultati, postaviRezultate] = useState<Rezultat[] | null>(null);
  const [ucitavanje, postaviUcitavanje] = useState(false);
  const [greska, postaviGresku] = useState<string | null>(null);
  const [poklapanje, postaviPoklapanje] = useState(true);

  async function pretrazi() {
    if (namirnice.trim().length < 3) {
      postaviGresku("Unesite bar 3 znaka.");
      return;
    }

    postaviUcitavanje(true);
    postaviGresku(null);

    try {
      const parametri = new URLSearchParams({ namirnice: namirnice.trim() });
      if (maxKcal) parametri.set("maxKcal", maxKcal);

      const odgovor = await fetch(`/api/pretraga?${parametri}`);
      const podaci = await odgovor.json();

      if (!odgovor.ok) {
        postaviGresku(podaci.greska ?? "Pretraga nije uspela.");
        return;
      }

      postaviRezultate(podaci.rezultati);
      postaviPoklapanje(podaci.poklapanjeNamirnica);
    } catch {
      postaviGresku("Nije moguće uspostaviti vezu sa serverom.");
    } finally {
      postaviUcitavanje(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Šta imate kod kuće?</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Unesite namirnice kojima raspolažete. Sistem pronalazi recepte čiji
        sastav najviše odgovara unetom, bez obzira na to da li se unete reči
        pojavljuju u nazivu recepta.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <input
          value={namirnice}
          onChange={(e) => postaviNamirnice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && pretrazi()}
          placeholder="piletina, jaja, spanać"
          className="min-w-64 flex-1 rounded border border-neutral-600 bg-transparent px-3 py-2"
        />
        <input
          type="number"
          min={1}
          value={maxKcal}
          onChange={(e) => postaviMaxKcal(e.target.value)}
          placeholder="max kcal"
          className="w-32 rounded border border-neutral-600 bg-transparent px-3 py-2"
        />
        <button
          onClick={pretrazi}
          disabled={ucitavanje}
          className="rounded bg-neutral-200 px-6 py-2 font-medium text-neutral-900 disabled:opacity-50"
        >
          {ucitavanje ? "Pretraga..." : "Pronađi recepte"}
        </button>
      </div>

      {greska && <p className="mt-4 text-sm text-red-400">{greska}</p>}

      {rezultati && !ucitavanje && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-medium">Pronađeni recepti</h2>
            <span className="text-sm text-neutral-500">
              sortirano po sličnosti
            </span>
          </div>
		
	  {!poklapanje && rezultati.length > 0 && (
            <p className="mb-3 rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-400">
              Nijedna uneta reč ne odgovara namirnici iz baze. Prikazani su
              semantički najbliži recepti.
            </p>
          )}



          {rezultati.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Nema rezultata. Moguće je da nijedan recept još nema generisan
              vektor.
            </p>
          ) : (
            <ul className="space-y-3">
              {rezultati.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/recepti/${r.id}`}
                    className="flex items-center gap-4 rounded border border-neutral-700 p-3 transition hover:border-neutral-500"
                  >
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded bg-neutral-800 text-xs text-neutral-500">
                      {r.urlSlike ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.urlSlike}
                          alt={r.naslov}
                          className="h-full w-full rounded object-cover"
                        />
                      ) : (
                        "bez slike"
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium">{r.naslov}</h3>
                      <p className="text-sm text-neutral-400">
                        {r.kcalPoPorciji.toFixed(0)} kcal ·{" "}
                        {r.proteiniPoPorciji.toFixed(0)} g proteina
                      </p>
                    </div>

                    <span className="shrink-0 rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300">
                      sličnost {(r.slicnost * 100).toFixed(0)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
