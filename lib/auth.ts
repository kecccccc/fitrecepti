import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ocitajSesiju } from "@/lib/sesija";

/**
 * Kontrola pristupa na osnovu uloge korisnika (FZ-5).
 */

export type PrijavljeniKorisnik = {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
};

/**
 * Vraća prijavljenog korisnika ili null.
 *
 * Podaci se učitavaju iz baze, a ne iz tokena. Token sadrži samo
 * oznaku korisnika — ako je nalog u međuvremenu obrisan ili mu je
 * uloga izmenjena, promena važi odmah, bez čekanja da sesija istekne.
 */
export async function trenutniKorisnik(): Promise<PrijavljeniKorisnik | null> {
  const sesija = await ocitajSesiju();
  if (!sesija) return null;

  const korisnik = await prisma.user.findUnique({
    where: { id: sesija.korisnikId },
    select: { id: true, username: true, email: true, role: true },
  });

  return korisnik;
}

/** Preusmerava na prijavu ako korisnik nije prijavljen. */
export async function zahtevajKorisnika(): Promise<PrijavljeniKorisnik> {
  const korisnik = await trenutniKorisnik();
  if (!korisnik) redirect("/prijava");
  return korisnik;
}

/** Preusmerava ako korisnik nije administrator. */
export async function zahtevajAdmina(): Promise<PrijavljeniKorisnik> {
  const korisnik = await zahtevajKorisnika();
  if (korisnik.role !== "ADMIN") redirect("/");
  return korisnik;
}
