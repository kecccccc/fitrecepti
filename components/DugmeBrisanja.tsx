"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Брисање сопственог рецепта (ФЗ-11).
 *
 * Дугме се приказује само аутору рецепта и администратору, али
 * стварна провера овлашћења спроводи се на серверу — сакривање
 * елемента у интерфејсу само по себи не представља заштиту.
 */
export default function DugmeBrisanja({ receptId }: { receptId: string }) {
  const ruter = useRouter();
  const [potvrda, postaviPotvrdu] = useState(false);
  const [brisanje, postaviBrisanje] = useState(false);
  const [greska, postaviGresku] = useState<string | null>(null);

  async function obrisi() {
    postaviBrisanje(true);
    postaviGresku(null);

    try {
      const odgovor = await fetch(`/api/recepti/${receptId}`, {
        method: "DELETE",
      });

      if (!odgovor.ok) {
        const podaci = await odgovor.json();
        postaviGresku(podaci.greska ?? "Brisanje nije uspelo.");
        return;
      }

      ruter.push("/");
      ruter.refresh();
    } catch {
      postaviGresku("Nije moguće uspostaviti vezu sa serverom.");
    } finally {
      postaviBrisanje(false);
    }
  }

  if (!potvrda) {
    return (
      <button
        onClick={() => postaviPotvrdu(true)}
        className="rounded border border-red-500/50 px-4 py-2 text-sm text-red-400"
      >
        Obriši recept
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-300">
        Recept će biti trajno obrisan. Nastaviti?
      </p>
      <div className="flex gap-2">
        <button
          onClick={obrisi}
          disabled={brisanje}
          className="rounded bg-red-500/80 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {brisanje ? "Brisanje..." : "Da, obriši"}
        </button>
        <button
          onClick={() => postaviPotvrdu(false)}
          className="rounded border border-neutral-600 px-4 py-2 text-sm"
        >
          Odustani
        </button>
      </div>
      {greska && <p className="text-sm text-red-400">{greska}</p>}
    </div>
  );
}
