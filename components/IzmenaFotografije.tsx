"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OtpremanjeSlike from "@/components/OtpremanjeSlike";

/**
 * Накнадно додавање или измена фотографије рецепта (ФЗ-9, ФЗ-11).
 *
 * Приказује се само аутору рецепта и администратору, а стварна провера
 * овлашћења спроводи се на серверској страни.
 */
export default function IzmenaFotografije({
  receptId,
  postojecaSlika,
}: {
  receptId: string;
  postojecaSlika: string | null;
}) {
  const ruter = useRouter();
  const [otvoreno, postaviOtvoreno] = useState(false);
  const [url, postaviUrl] = useState<string | null>(postojecaSlika);
  const [cuvanje, postaviCuvanje] = useState(false);
  const [greska, postaviGresku] = useState<string | null>(null);

  async function sacuvaj() {
    postaviCuvanje(true);
    postaviGresku(null);

    try {
      const odgovor = await fetch(`/api/recepti/${receptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlSlike: url }),
      });

      if (!odgovor.ok) {
        const podaci = await odgovor.json();
        postaviGresku(podaci.greska ?? "Čuvanje nije uspelo.");
        return;
      }

      postaviOtvoreno(false);
      ruter.refresh();
    } catch {
      postaviGresku("Nije moguće uspostaviti vezu sa serverom.");
    } finally {
      postaviCuvanje(false);
    }
  }

  if (!otvoreno) {
    return (
      <button
        onClick={() => postaviOtvoreno(true)}
        className="rounded border border-neutral-600 px-4 py-2 text-sm"
      >
        {postojecaSlika ? "Izmeni fotografiju" : "Dodaj fotografiju"}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded border border-neutral-700 p-4">
      <OtpremanjeSlike urlSlike={url} postaviUrl={postaviUrl} />

      <div className="flex gap-2">
        <button
          onClick={sacuvaj}
          disabled={cuvanje}
          className="rounded bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {cuvanje ? "Čuvanje..." : "Sačuvaj"}
        </button>
        <button
          onClick={() => {
            postaviUrl(postojecaSlika);
            postaviOtvoreno(false);
          }}
          className="rounded border border-neutral-600 px-4 py-2 text-sm"
        >
          Odustani
        </button>
      </div>

      {greska && <p className="text-sm text-red-400">{greska}</p>}
    </div>
  );
}
