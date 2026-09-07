"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hesirajLozinku, proveriLozinku } from "@/lib/lozinke";
import { kreirajSesiju, obrisiSesiju } from "@/lib/sesija";

/**
 * Serverske akcije za rad sa korisničkim nalozima (FZ-1, FZ-2, FZ-3).
 *
 * Provera unetih podataka izvršava se i na serveru, bez obzira na to
 * što pregledač već sprovodi svoju (NFZ-3). Klijentska provera je
 * pogodnost za korisnika, ali se može zaobići, pa se serverska ne sme
 * izostaviti.
 */

export type StanjeObrasca = {
  greska?: string;
  greskePolja?: Record<string, string[]>;
};

const semaRegistracije = z.object({
  korisnickoIme: z
    .string()
    .trim()
    .min(3, "Korisničko ime mora imati bar 3 znaka.")
    .max(30, "Korisničko ime ne sme biti duže od 30 znakova.")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Dozvoljena su slova, brojevi i znakovi _ . -"
    ),
  email: z.string().trim().toLowerCase().email("Unesite ispravnu e-adresu."),
  lozinka: z
    .string()
    .min(8, "Lozinka mora imati bar 8 znakova.")
    .max(72, "Lozinka ne sme biti duža od 72 znaka."),
});

const semaPrijave = z.object({
  email: z.string().trim().toLowerCase().email("Unesite ispravnu e-adresu."),
  lozinka: z.string().min(1, "Unesite lozinku."),
});

export async function registruj(
  _prethodno: StanjeObrasca,
  podaci: FormData
): Promise<StanjeObrasca> {
  const rezultat = semaRegistracije.safeParse({
    korisnickoIme: podaci.get("korisnickoIme"),
    email: podaci.get("email"),
    lozinka: podaci.get("lozinka"),
  });

  if (!rezultat.success) {
    return { greskePolja: rezultat.error.flatten().fieldErrors };
  }

  const { korisnickoIme, email, lozinka } = rezultat.data;

  try {
    const korisnik = await prisma.user.create({
      data: {
        username: korisnickoIme,
        email,
        passwordHash: await hesirajLozinku(lozinka),
      },
      select: { id: true, role: true },
    });

    await kreirajSesiju({ korisnikId: korisnik.id, uloga: korisnik.role });
  } catch (greska) {
    // P2002 — narušeno ograničenje jedinstvenosti
    if (
      greska instanceof Prisma.PrismaClientKnownRequestError &&
      greska.code === "P2002"
    ) {
      return { greska: "Korisničko ime ili e-adresa su već zauzeti." };
    }
    throw greska;
  }

  redirect("/");
}

export async function prijavi(
  _prethodno: StanjeObrasca,
  podaci: FormData
): Promise<StanjeObrasca> {
  const rezultat = semaPrijave.safeParse({
    email: podaci.get("email"),
    lozinka: podaci.get("lozinka"),
  });

  if (!rezultat.success) {
    return { greskePolja: rezultat.error.flatten().fieldErrors };
  }

  const { email, lozinka } = rezultat.data;

  const korisnik = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, passwordHash: true },
  });

  // Poruka je namerno ista i kada nalog ne postoji i kada je lozinka
  // pogrešna. Razlikovanje bi napadaču otkrilo koje e-adrese postoje
  // u sistemu.
  const neispravno = { greska: "Neispravna e-adresa ili lozinka." };

  if (!korisnik) return neispravno;

  const ispravna = await proveriLozinku(lozinka, korisnik.passwordHash);
  if (!ispravna) return neispravno;

  await kreirajSesiju({ korisnikId: korisnik.id, uloga: korisnik.role });
  redirect("/");
}

export async function odjavi(): Promise<void> {
  await obrisiSesiju();
  redirect("/prijava");
}
