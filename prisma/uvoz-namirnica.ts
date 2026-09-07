import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { NAMIRNICE, type StavkaNamirnice } from "./namirnice";

const prisma = new PrismaClient();

const API_KLJUC = process.env.USDA_API_KEY;
const OSNOVNI_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";

// Oznake hranljivih materija u USDA bazi
const NUTRIJENT = {
  ENERGIJA_KCAL: 1008,
  PROTEINI: 1003,
  MASTI: 1004,
  UGLJENI_HIDRATI: 1005,
} as const;

type UsdaNutrijent = {
  nutrientId: number;
  value: number;
  unitName?: string;
};

type UsdaNamirnica = {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: UsdaNutrijent[];
};

/** Vraća vrednost tražene hranljive materije ili null ako je nema. */
function vrednost(hrana: UsdaNamirnica, oznaka: number): number | null {
  const nadjeno = hrana.foodNutrients.find((n) => n.nutrientId === oznaka);
  return nadjeno && typeof nadjeno.value === "number" ? nadjeno.value : null;
}

/**
 * Pretražuje USDA bazu i vraća prvi zapis koji sadrži sve četiri
 * potrebne vrednosti. Traže se samo tipovi SR Legacy i Foundation,
 * kod kojih su vrednosti izražene na 100 grama.
 */
async function pronadjiNamirnicu(upit: string): Promise<UsdaNamirnica | null> {
  const adresa = new URL(OSNOVNI_URL);
  adresa.searchParams.set("api_key", API_KLJUC!);
  adresa.searchParams.set("query", upit);
  adresa.searchParams.set("dataType", "SR Legacy,Foundation");
  adresa.searchParams.set("pageSize", "10");

  const odgovor = await fetch(adresa);

  if (!odgovor.ok) {
    throw new Error(`USDA API greška ${odgovor.status} za upit "${upit}"`);
  }

  const podaci = (await odgovor.json()) as { foods?: UsdaNamirnica[] };
  const rezultati = podaci.foods ?? [];

  for (const hrana of rezultati) {
    const kcal = vrednost(hrana, NUTRIJENT.ENERGIJA_KCAL);
    const protein = vrednost(hrana, NUTRIJENT.PROTEINI);
    const masti = vrednost(hrana, NUTRIJENT.MASTI);
    const uh = vrednost(hrana, NUTRIJENT.UGLJENI_HIDRATI);

    if (kcal !== null && protein !== null && masti !== null && uh !== null) {
      return hrana;
    }
  }

  return null;
}

async function uveziStavku(stavka: StavkaNamirnice) {
  const hrana = await pronadjiNamirnicu(stavka.upit);

  if (!hrana) {
    return { status: "nije_nadjeno" as const, stavka };
  }

  await prisma.ingredient.upsert({
    where: {
      source_sourceId: {
        source: "USDA_FDC",
        sourceId: String(hrana.fdcId),
      },
    },
    create: {
      name: hrana.description,
      nameSr: stavka.nazivSr,
      source: "USDA_FDC",
      sourceId: String(hrana.fdcId),
      kcalPer100g: vrednost(hrana, NUTRIJENT.ENERGIJA_KCAL)!,
      proteinPer100g: vrednost(hrana, NUTRIJENT.PROTEINI)!,
      carbsPer100g: vrednost(hrana, NUTRIJENT.UGLJENI_HIDRATI)!,
      fatPer100g: vrednost(hrana, NUTRIJENT.MASTI)!,
    },
    update: {
      name: hrana.description,
      nameSr: stavka.nazivSr,
      kcalPer100g: vrednost(hrana, NUTRIJENT.ENERGIJA_KCAL)!,
      proteinPer100g: vrednost(hrana, NUTRIJENT.PROTEINI)!,
      carbsPer100g: vrednost(hrana, NUTRIJENT.UGLJENI_HIDRATI)!,
      fatPer100g: vrednost(hrana, NUTRIJENT.MASTI)!,
      refreshedAt: new Date(),
    },
  });

  return { status: "uvezeno" as const, stavka, hrana };
}

async function main() {
  if (!API_KLJUC) {
    console.error("Nedostaje USDA_API_KEY u .env fajlu.");
    process.exit(1);
  }

  console.log(`Uvoz ${NAMIRNICE.length} namirnica iz USDA baze...\n`);

  const neuspesne: StavkaNamirnice[] = [];
  let uvezeno = 0;

  for (const stavka of NAMIRNICE) {
    try {
      const rezultat = await uveziStavku(stavka);

      if (rezultat.status === "nije_nadjeno") {
        neuspesne.push(stavka);
        console.log(`  ✗  ${stavka.nazivSr}  —  nije pronađeno`);
      } else {
        uvezeno++;
        console.log(`  ✓  ${stavka.nazivSr}  →  ${rezultat.hrana.description}`);
      }
    } catch (greska) {
      neuspesne.push(stavka);
      console.log(`  ✗  ${stavka.nazivSr}  —  ${(greska as Error).message}`);
    }

    // pauza radi poštovanja ograničenja broja poziva
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nUvezeno: ${uvezeno} / ${NAMIRNICE.length}`);

  if (neuspesne.length > 0) {
    console.log("\nNeuspešne stavke — izmeni upit u namirnice.ts i pokreni ponovo:");
    for (const s of neuspesne) {
      console.log(`  ${s.nazivSr}  (upit: "${s.upit}")`);
    }
  }
}

main()
  .catch((greska) => {
    console.error(greska);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
