"use client";

import { useEffect, useState } from "react";

/**
 * Чување рецепта у личну листу (ФЗ-19).
 */
export default function DugmeCuvanja({
  receptId,
  prijavljen,
}: {
  receptId: string;
  prijavljen: boolean;
}) {
  const [sacuvan, postaviSacuvan] = useState(false);
  const [ucitano, postaviUcitano] = useState(false);
  const [uToku, postaviUToku] = useState(false);

  useEffect(() => {
    if (!prijavljen) {
      postaviUcitano(true);
      return;
    }

    fetch(`/api/recepti/${receptId}/sacuvan`)
      .then((o) => o.json())
      .then((d) => postaviSacuvan(d.sacuvan))
      .catch(() => {})
      .finally(() => postaviUcitano(true));
  }, [receptId, prijavljen]);

  async function prebaci() {
    postaviUToku(true);

    try {
      const odgovor = await fetch(`/api/recepti/${receptId}/sacuvan`, {
        method: sacuvan ? "DELETE" : "POST",
      });

      if (odgovor.ok) {
        const podaci = await odgovor.json();
        postaviSacuvan(podaci.sacuvan);
      }
    } finally {
      postaviUToku(false);
    }
  }

  if (!prijavljen) return null;

  return (
    <button
      onClick={prebaci}
      disabled={uToku || !ucitano}
      className={
        "rounded px-4 py-2 text-sm disabled:opacity-50 " +
        (sacuvan
          ? "bg-neutral-200 font-medium text-neutral-900"
          : "border border-neutral-600")
      }
    >
      {sacuvan ? "Sačuvano" : "Sačuvaj recept"}
    </button>
  );
}
