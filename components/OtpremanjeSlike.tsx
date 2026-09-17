"use client";

import { useRef, useState } from "react";

/**
 * Отпремање фотографије јела (ФЗ-9).
 *
 * Провера врсте и величине датотеке спроводи се пре слања, како би
 * корисник грешку уочио одмах. Иста ограничења наведена су и у потпису
 * који издаје сервер, па се неисправна датотека одбија и у складишту —
 * клијентска провера представља погодност, а не заштиту.
 */

const NAJVECA_VELICINA = 5 * 1024 * 1024; // 5 MB
const DOZVOLJENE_VRSTE = ["image/jpeg", "image/png", "image/webp"];

export default function OtpremanjeSlike({
  urlSlike,
  postaviUrl,
}: {
  urlSlike: string | null;
  postaviUrl: (url: string | null) => void;
}) {
  const [otpremanje, postaviOtpremanje] = useState(false);
  const [greska, postaviGresku] = useState<string | null>(null);
  const poljeRef = useRef<HTMLInputElement>(null);

  async function izaberi(datoteka: File) {
    postaviGresku(null);

    if (!DOZVOLJENE_VRSTE.includes(datoteka.type)) {
      postaviGresku("Dozvoljeni su formati JPG, PNG i WEBP.");
      return;
    }

    if (datoteka.size > NAJVECA_VELICINA) {
      postaviGresku("Fotografija ne sme biti veća od 5 MB.");
      return;
    }

    postaviOtpremanje(true);

    try {
      // 1. Сервер издаје потпис
      const odgovorPotpisa = await fetch("/api/otpremanje/potpis", {
        method: "POST",
      });

      if (!odgovorPotpisa.ok) {
        postaviGresku("Nije moguće započeti otpremanje.");
        return;
      }

      const p = await odgovorPotpisa.json();

      // 2. Датотека се шаље непосредно у складиште
      const podaci = new FormData();
      podaci.append("file", datoteka);
      podaci.append("api_key", p.apiKey);
      podaci.append("timestamp", String(p.timestamp));
      podaci.append("signature", p.potpis);
      podaci.append("folder", p.fascikla);
      podaci.append("allowed_formats", p.dozvoljeniFormati);

      const odgovor = await fetch(
        `https://api.cloudinary.com/v1_1/${p.cloudName}/image/upload`,
        { method: "POST", body: podaci }
      );

      if (!odgovor.ok) {
        postaviGresku("Otpremanje nije uspelo.");
        return;
      }

      const rezultat = await odgovor.json();
      postaviUrl(rezultat.secure_url);
    } catch {
      postaviGresku("Nije moguće uspostaviti vezu sa skladištem.");
    } finally {
      postaviOtpremanje(false);
      if (poljeRef.current) poljeRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm text-neutral-300">
        Fotografija jela
      </label>

      {urlSlike ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlSlike}
            alt="Otpremljena fotografija"
            className="h-40 w-full rounded border border-neutral-700 object-cover"
          />
          <button
            type="button"
            onClick={() => postaviUrl(null)}
            className="text-sm text-neutral-400 hover:text-red-400"
          >
            Ukloni fotografiju
          </button>
        </div>
      ) : (
        <label
          className="flex h-40 cursor-pointer items-center justify-center rounded border border-dashed border-neutral-600 text-sm text-neutral-500"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const d = e.dataTransfer.files?.[0];
            if (d) izaberi(d);
          }}
        >
          {otpremanje ? "Otpremanje..." : "Prevucite ili izaberite datoteku"}
          <input
            ref={poljeRef}
            type="file"
            accept={DOZVOLJENE_VRSTE.join(",")}
            className="hidden"
            onChange={(e) => {
              const d = e.target.files?.[0];
              if (d) izaberi(d);
            }}
          />
        </label>
      )}

      {greska && <p className="mt-1 text-sm text-red-400">{greska}</p>}
    </div>
  );
}
