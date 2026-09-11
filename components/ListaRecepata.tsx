"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Листа рецепата са филтрирањем и сортирањем (слика 4.3).
 *
 * Филтрирање се врши према вредностима по порцији, које је израчунао
 * систем, чиме су рецепти различитих аутора међусобно упоредиви
 * (ФЗ-13 до ФЗ-17).
 */

type Recept = {
  id: string;
  naslov: string;
  urlSlike: string | null;
  kcalPoPorciji: number;
  proteiniPoPorciji: number;
  autor: string;
  oznake: string[];
  brojOcena: number;
};

type Odgovor = {
  ukupno: number;
  strana: number;
  poStrani: number;
  rezultati: Recept[];
};

export default function ListaRecepata() {
  const [pojam, postaviPojam] = useState("");
  const [maxKcal, postaviMaxKcal] = useState("");
  const [minProteini, postaviMinProteine] = useState("");
  const [oznaka, postaviOznaku] = useState("");
  const [sortiranje, postaviSortiranje] = useState("najnovije");
  const [strana, postaviStranu] = useState(1);

  const [podaci, postaviPodatke] = useState<Odgovor | null>(null);
  const [ucitavanje, postaviUcitavanje] = useState(true);
  const [okidac, postaviOkidac] = useState(0);

  useEffect(() => {
    const parametri = new URLSearchParams();
    if (pojam.trim()) parametri.set("q", pojam.trim());
    if (maxKcal) parametri.set("maxKcal", maxKcal);
    if (minProteini) parametri.set("minProteini", minProteini);
    if (oznaka.trim()) parametri.set("oznaka", oznaka.trim());
    parametri.set("sortiranje", sortiranje);
    parametri.set("strana", String(strana));

    let otkazano = false;
    postaviUcitavanje(true);

    fetch(`/api/recepti?${parametri}`)
      .then((o) => o.json())
      .then((d) => {
        if (!otkazano) postaviPodatke(d);
      })
      .finally(() => {
        if (!otkazano) postaviUcitavanje(false);
      });

    return () => {
      otkazano = true;
    };
  }, [okidac, sortiranje, strana]);

  function primeniFiltere() {
    postaviStranu(1);
    postaviOkidac((n) => n + 1);
  }

  const ukupnoStrana = podaci
    ? Math.max(1, Math.ceil(podaci.ukupno / podaci.poStrani))
    : 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* ---------------------------------------------- filteri */}
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <h2 className="font-medium">Filteri</h2>

          <Polje naziv="Maksimalno kcal po porciji">
            <input
              type="number"
              min={0}
              value={maxKcal}
              onChange={(e) => postaviMaxKcal(e.target.value)}
              placeholder="500"
              className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
            />
          </Polje>

          <Polje naziv="Minimalno proteina (g)">
            <input
              type="number"
              min={0}
              value={minProteini}
              onChange={(e) => postaviMinProteine(e.target.value)}
              placeholder="25"
              className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
            />
          </Polje>

          <Polje naziv="Oznaka">
            <input
              value={oznaka}
              onChange={(e) => postaviOznaku(e.target.value)}
              placeholder="obrok"
              className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
            />
          </Polje>

          <Polje naziv="Sortiranje">
            <select
              value={sortiranje}
              onChange={(e) => postaviSortiranje(e.target.value)}
              className="w-full rounded border border-neutral-600 bg-neutral-900 px-3 py-2"
            >
              <option value="najnovije">Najnovije</option>
              <option value="kalorije">Najmanje kalorija</option>
            </select>
          </Polje>

          <button
            onClick={primeniFiltere}
            className="w-full rounded bg-neutral-200 px-4 py-2 font-medium text-neutral-900"
          >
            Primeni filtere
          </button>
        </aside>

        {/* ---------------------------------------------- rezultati */}
        <section>
          <div className="mb-4 flex gap-2">
            <input
              value={pojam}
              onChange={(e) => postaviPojam(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && primeniFiltere()}
              placeholder="Pretraga po naslovu recepta"
              className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
            />
            <button
              onClick={primeniFiltere}
              className="rounded border border-neutral-600 px-5"
            >
              Traži
            </button>
          </div>

          {ucitavanje ? (
            <p className="text-sm text-neutral-400">Učitavanje...</p>
          ) : !podaci || podaci.rezultati.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Nema rezultata za zadate kriterijume.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-neutral-400">
                Pronađeno {podaci.ukupno}{" "}
                {podaci.ukupno === 1 ? "recept" : "recepata"}
              </p>

              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {podaci.rezultati.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/recepti/${r.id}`}
                      className="block overflow-hidden rounded border border-neutral-700 transition hover:border-neutral-500"
                    >
                      <div className="flex h-32 items-center justify-center bg-neutral-800 text-xs text-neutral-500">
                        {r.urlSlike ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.urlSlike}
                            alt={r.naslov}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "bez fotografije"
                        )}
                      </div>

                      <div className="p-3">
                        <h3 className="font-medium">{r.naslov}</h3>
                        <p className="mt-1 text-sm text-neutral-400">
                          {r.kcalPoPorciji.toFixed(0)} kcal ·{" "}
                          {r.proteiniPoPorciji.toFixed(0)} g proteina
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {r.autor}
                          {r.brojOcena > 0 && ` · ${r.brojOcena} ocena`}
                        </p>
                        {r.oznake.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {r.oznake.map((o) => (
                              <span
                                key={o}
                                className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400"
                              >
                                {o}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {ukupnoStrana > 1 && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <button
                    disabled={strana <= 1}
                    onClick={() => postaviStranu(strana - 1)}
                    className="rounded border border-neutral-600 px-4 py-2 disabled:opacity-40"
                  >
                    Prethodna
                  </button>
                  <span className="text-sm text-neutral-400">
                    {strana} / {ukupnoStrana}
                  </span>
                  <button
                    disabled={strana >= ukupnoStrana}
                    onClick={() => postaviStranu(strana + 1)}
                    className="rounded border border-neutral-600 px-4 py-2 disabled:opacity-40"
                  >
                    Sledeća
                  </button>
                </div>
              )}
            </>
          )}

          <p className="mt-8 text-xs text-neutral-500">
            Prikazane vrednosti su informativnog karaktera i ne predstavljaju
            zamenu za savet stručnjaka za ishranu.
          </p>
        </section>
      </div>
    </div>
  );
}

function Polje({
  naziv,
  children,
}: {
  naziv: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-neutral-400">{naziv}</label>
      {children}
    </div>
  );
}
