"use client";

import { useEffect, useState } from "react";

/**
 * Оцењивање рецепта (ФЗ-20, ФЗ-21).
 *
 * Оцена се уноси избором броја звездица. Корисник који је рецепт већ
 * оценио види своју оцену, а поновним избором је мења.
 */
export default function Ocenjivanje({
  receptId,
  prijavljen,
}: {
  receptId: string;
  prijavljen: boolean;
}) {
  const [prosek, postaviProsek] = useState<number | null>(null);
  const [broj, postaviBroj] = useState(0);
  const [moja, postaviMoju] = useState<number | null>(null);
  const [nadVrednoscu, postaviNadVrednoscu] = useState<number | null>(null);
  const [greska, postaviGresku] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/recepti/${receptId}/ocena`)
      .then((o) => o.json())
      .then((d) => {
        postaviProsek(d.prosecnaOcena);
        postaviBroj(d.brojOcena);
        postaviMoju(d.mojaOcena);
      })
      .catch(() => {});
  }, [receptId]);

  async function oceni(vrednost: number) {
    postaviGresku(null);

    try {
      const odgovor = await fetch(`/api/recepti/${receptId}/ocena`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vrednost }),
      });

      const podaci = await odgovor.json();

      if (!odgovor.ok) {
        postaviGresku(podaci.greska ?? "Ocenjivanje nije uspelo.");
        return;
      }

      postaviProsek(podaci.prosecnaOcena);
      postaviBroj(podaci.brojOcena);
      postaviMoju(podaci.mojaOcena);
    } catch {
      postaviGresku("Nije moguće uspostaviti vezu sa serverom.");
    }
  }

  const prikazano = nadVrednoscu ?? moja ?? 0;

  return (
    <div>
      <p className="text-sm text-neutral-400">
        {prosek !== null
          ? `Prosečna ocena ${prosek.toFixed(1)} (${broj})`
          : "Recept još nije ocenjen"}
      </p>

      {prijavljen ? (
        <div
          className="mt-1 flex items-center gap-1"
          onMouseLeave={() => postaviNadVrednoscu(null)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => oceni(n)}
              onMouseEnter={() => postaviNadVrednoscu(n)}
              aria-label={`Oceni sa ${n}`}
              className={
                "text-2xl leading-none " +
                (n <= prikazano ? "text-neutral-100" : "text-neutral-600")
              }
            >
              ★
            </button>
          ))}
          {moja !== null && (
            <span className="ml-2 text-sm text-neutral-500">
              vaša ocena: {moja}
            </span>
          )}
        </div>
      ) : (
        <p className="mt-1 text-sm text-neutral-500">
          Prijavite se da biste ocenili recept.
        </p>
      )}

      {greska && <p className="mt-1 text-sm text-red-400">{greska}</p>}
    </div>
  );
}
