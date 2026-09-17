"use client";

import { useEffect, useState } from "react";

/**
 * Коментарисање рецепта (ФЗ-22, ФЗ-23).
 */

type Komentar = {
  id: string;
  sadrzaj: string;
  autor: string;
  datum: string;
  smeBrisanje: boolean;
};

export default function Komentari({
  receptId,
  prijavljen,
}: {
  receptId: string;
  prijavljen: boolean;
}) {
  const [komentari, postaviKomentare] = useState<Komentar[]>([]);
  const [ucitavanje, postaviUcitavanje] = useState(true);
  const [tekst, postaviTekst] = useState("");
  const [slanje, postaviSlanje] = useState(false);
  const [greska, postaviGresku] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/recepti/${receptId}/komentari`)
      .then((o) => o.json())
      .then((d) => postaviKomentare(d.rezultati ?? []))
      .catch(() => {})
      .finally(() => postaviUcitavanje(false));
  }, [receptId]);

  async function posalji() {
    if (tekst.trim().length < 2) {
      postaviGresku("Komentar mora imati bar 2 znaka.");
      return;
    }

    postaviSlanje(true);
    postaviGresku(null);

    try {
      const odgovor = await fetch(`/api/recepti/${receptId}/komentari`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sadrzaj: tekst.trim() }),
      });

      const podaci = await odgovor.json();

      if (!odgovor.ok) {
        postaviGresku(podaci.greska ?? "Slanje nije uspelo.");
        return;
      }

      postaviKomentare([podaci, ...komentari]);
      postaviTekst("");
    } catch {
      postaviGresku("Nije moguće uspostaviti vezu sa serverom.");
    } finally {
      postaviSlanje(false);
    }
  }

  async function obrisi(id: string) {
    const odgovor = await fetch(`/api/komentari/${id}`, { method: "DELETE" });

    if (odgovor.ok) {
      postaviKomentare(komentari.filter((k) => k.id !== id));
    } else {
      const podaci = await odgovor.json();
      postaviGresku(podaci.greska ?? "Brisanje nije uspelo.");
    }
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-medium">Komentari ({komentari.length})</h2>

      {prijavljen ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <textarea
            value={tekst}
            onChange={(e) => postaviTekst(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Napišite komentar..."
            className="min-w-64 flex-1 rounded border border-neutral-600 bg-transparent px-3 py-2"
          />
          <button
            onClick={posalji}
            disabled={slanje}
            className="self-start rounded bg-neutral-200 px-5 py-2 font-medium text-neutral-900 disabled:opacity-50"
          >
            {slanje ? "Slanje..." : "Pošalji"}
          </button>
        </div>
      ) : (
        <p className="mb-6 text-sm text-neutral-500">
          Prijavite se da biste ostavili komentar.
        </p>
      )}

      {greska && <p className="mb-3 text-sm text-red-400">{greska}</p>}

      {ucitavanje ? (
        <p className="text-sm text-neutral-400">Učitavanje...</p>
      ) : komentari.length === 0 ? (
        <p className="text-sm text-neutral-500">Još nema komentara.</p>
      ) : (
        <ul className="space-y-3">
          {komentari.map((k) => (
            <li key={k.id} className="rounded border border-neutral-700 p-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium">{k.autor}</span>
                <span className="text-xs text-neutral-500">
                  {new Date(k.datum).toLocaleDateString("sr-RS")}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line text-neutral-300">
                {k.sadrzaj}
              </p>
              {k.smeBrisanje && (
                <button
                  onClick={() => obrisi(k.id)}
                  className="mt-2 text-sm text-neutral-500 hover:text-red-400"
                >
                  Obriši
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
