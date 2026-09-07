import { NextResponse } from "next/server";

/**
 * Jedinstven oblik odgovora REST sloja.
 *
 * Svi odgovori imaju isti oblik, čime je klijentskoj strani omogućeno
 * jednoobrazno rukovanje greškama, bez posebne obrade za svaku rutu.
 */

export type GreskaOdgovor = {
  greska: string;
  detalji?: Record<string, string[]>;
};

export function uspeh<T>(podaci: T, status = 200) {
  return NextResponse.json(podaci, { status });
}

export function greska(poruka: string, status: number, detalji?: Record<string, string[]>) {
  const telo: GreskaOdgovor = { greska: poruka };
  if (detalji) telo.detalji = detalji;
  return NextResponse.json(telo, { status });
}

export const neovlascen = () => greska("Niste prijavljeni.", 401);
export const zabranjeno = () => greska("Nemate ovlašćenje za ovu radnju.", 403);
export const nijePronadjeno = (sta = "Traženi resurs") =>
  greska(`${sta} nije pronađen.`, 404);
