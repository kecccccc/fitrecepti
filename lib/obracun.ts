import { prisma } from "@/lib/prisma";
import {
  izracunajVrednosti,
  GreskaObracuna,
  type RezultatObracuna,
} from "@/lib/nutricija";

/**
 * Obračun nutritivnih vrednosti na osnovu podataka iz baze.
 *
 * Klijent šalje samo oznaku namirnice i količinu. Nutritivne vrednosti
 * se ne primaju od klijenta, već se učitavaju iz baze na serveru.
 * Time se sprečava da korisnik izmenom zahteva upiše proizvoljne
 * vrednosti (NFZ-3).
 */

export type UnetaStavka = {
  namirnicaId: string;
  kolicinaG: number;
};

export async function obracunajZaRecept(
  stavke: UnetaStavka[],
  brojPorcija: number
): Promise<RezultatObracuna> {
  if (stavke.length === 0) {
    throw new GreskaObracuna("Recept mora sadržati bar jednu namirnicu.");
  }

  const oznake = stavke.map((s) => s.namirnicaId);

  const namirnice = await prisma.ingredient.findMany({
    where: { id: { in: oznake } },
    select: {
      id: true,
      kcalPer100g: true,
      proteinPer100g: true,
      carbsPer100g: true,
      fatPer100g: true,
    },
  });

  // Provera da svaka uneta namirnica postoji u nutritivnoj bazi (FZ-8).
  // Bez ove provere recept bi mogao da sadrži namirnicu bez podataka,
  // čime obračun gubi osnov.
  const poOznaci = new Map(namirnice.map((n) => [n.id, n]));
  const nepoznate = oznake.filter((id) => !poOznaci.has(id));

  if (nepoznate.length > 0) {
    throw new GreskaObracuna(
      `Namirnice nisu pronađene u nutritivnoj bazi: ${nepoznate.join(", ")}`
    );
  }

  const sastav = stavke.map((s) => ({
    namirnica: poOznaci.get(s.namirnicaId)!,
    kolicinaG: s.kolicinaG,
  }));

  return izracunajVrednosti(sastav, brojPorcija);
}
