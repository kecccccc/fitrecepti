import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { uspeh, greska } from "@/lib/odgovori";

/**
 * GET /api/namirnice?q=<pojam>
 *
 * Pretraga nutritivne baze. Koristi se pri unosu recepta — korisnik
 * bira namirnicu iz rezultata, čime se ispunjava zahtev FZ-7.
 *
 * Pretraga zanemaruje dijakritičke znakove, pa upit "pileca" pronalazi
 * i zapis "Pileća prsa". Poređenje se izvršava nad vrednostima iz kojih
 * su dijakritici uklonjeni funkcijom bez_kvacica (vidi migraciju
 * migracija-pretraga.sql).
 *
 * Upit je napisan kao sirov SQL, budući da ORM ne podržava pozivanje
 * korisnički definisanih funkcija u uslovu pretrage. Vrednost koju je
 * uneo korisnik prosleđuje se kao parametar, a ne spajanjem niski,
 * čime je onemogućeno umetanje SQL koda (NFZ-4).
 */

const NAJMANJA_DUZINA_UPITA = 2;
const NAJVISE_REZULTATA = 10;

type RedRezultata = {
  id: string;
  name_sr: string;
  name: string;
  kcal_per_100g: Prisma.Decimal;
  protein_per_100g: Prisma.Decimal;
  carbs_per_100g: Prisma.Decimal;
  fat_per_100g: Prisma.Decimal;
};

export async function GET(zahtev: NextRequest) {
  const upit = zahtev.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (upit.length < NAJMANJA_DUZINA_UPITA) {
    return greska(
      `Pojam za pretragu mora imati bar ${NAJMANJA_DUZINA_UPITA} znaka.`,
      400
    );
  }

  const obrazac = `%${upit}%`;

  const redovi = await prisma.$queryRaw<RedRezultata[]>`
    SELECT id, name_sr, name,
           kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
    FROM ingredients
    WHERE lower(bez_kvacica(name_sr)) LIKE lower(bez_kvacica(${obrazac}))
       OR lower(name) LIKE lower(${obrazac})
    ORDER BY
      -- zapisi koji počinju unetim pojmom prikazuju se prvi
      CASE WHEN lower(bez_kvacica(name_sr)) LIKE lower(bez_kvacica(${upit + "%"}))
           THEN 0 ELSE 1 END,
      name_sr
    LIMIT ${NAJVISE_REZULTATA}
  `;

  return uspeh({
    rezultati: redovi.map((r) => ({
      id: r.id,
      nazivSr: r.name_sr,
      nazivIzvorni: r.name,
      kcalNa100g: Number(r.kcal_per_100g),
      proteiniNa100g: Number(r.protein_per_100g),
      ugljeniHidratiNa100g: Number(r.carbs_per_100g),
      mastiNa100g: Number(r.fat_per_100g),
    })),
    ukupno: redovi.length,
  });
}