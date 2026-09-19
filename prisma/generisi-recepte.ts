import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import { izracunajVrednosti } from "../lib/nutricija";
import { vektorSadrzaja, tekstZaVektor } from "../lib/vektori";

const prisma = new PrismaClient();

/**
 * Генерисање рецепата за мерење перформанси.
 *
 * Скрипта уписује рецепте састављене од насумично изабраних намирница
 * из нутритивне базе. Нутритивне вредности израчунава истим модулом
 * који користи и сама апликација, па су подаци у бази истоврсни онима
 * које уносе корисници.
 *
 * Сви тако унети рецепти носе ознаку [test] на почетку наслова, ради
 * лакшег уклањања након спроведеног мерења.
 */

const OZNAKA = "[test]";
const CILJ = 1000;          // укупан број рецепата у бази након покретања
const NAJMANJE_NAMIRNICA = 3;
const NAJVISE_NAMIRNICA = 6;

const OZNAKE = ["obrok", "uzina", "dorucak", "vecera", "vegetarijansko"];

function nasumicno<T>(niz: T[]): T {
  return niz[Math.floor(Math.random() * niz.length)];
}

function ceoBroj(od: number, do_: number): number {
  return Math.floor(Math.random() * (do_ - od + 1)) + od;
}

/** Наслов се саставља од назива изабраних намирница. */
function sastaviNaslov(nazivi: string[]): string {
  const ociscen = nazivi.map((n) => n.split(",")[0].trim());
  const prvi = ociscen[0];
  const ostali = ociscen.slice(1, 3).join(" i ");
  return `${OZNAKA} ${prvi}${ostali ? " sa " + ostali.toLowerCase() : ""}`;
}

async function main() {
  const namirnice = await prisma.ingredient.findMany({
    select: {
      id: true,
      nameSr: true,
      kcalPer100g: true,
      proteinPer100g: true,
      carbsPer100g: true,
      fatPer100g: true,
    },
  });

  if (namirnice.length === 0) {
    console.error("У бази нема намирница. Прво покрени uvoz-namirnica.ts");
    process.exit(1);
  }

  const postojeci = await prisma.recipe.count();
  const potrebno = CILJ - postojeci;

  if (potrebno <= 0) {
    console.log(`У бази већ постоји ${postojeci} рецепата. Нема шта да се дода.`);
    return;
  }

  // Рецепти се приписују првом кориснику у бази.
  const korisnik = await prisma.user.findFirst({ select: { id: true } });

  if (!korisnik) {
    console.error("У бази нема корисника. Прво направи налог кроз апликацију.");
    process.exit(1);
  }

  console.log(`Постоји ${postojeci} рецепата. Додаје се ${potrebno}...\n`);

  let upisano = 0;

  for (let i = 0; i < potrebno; i++) {
    const broj = ceoBroj(NAJMANJE_NAMIRNICA, NAJVISE_NAMIRNICA);

    // избор без понављања
    const izabrane: typeof namirnice = [];
    const preostale = [...namirnice];
    for (let j = 0; j < broj && preostale.length > 0; j++) {
      const k = Math.floor(Math.random() * preostale.length);
      izabrane.push(preostale.splice(k, 1)[0]);
    }

    const sastav = izabrane.map((n) => ({
      namirnica: n,
      kolicinaG: ceoBroj(20, 300),
    }));

    const brojPorcija = ceoBroj(1, 4);
    const obracun = izracunajVrednosti(sastav, brojPorcija);

    const naslov = sastaviNaslov(izabrane.map((n) => n.nameSr));
    const oznaka = nasumicno(OZNAKE);

    const recept = await prisma.recipe.create({
      data: {
        authorId: korisnik.id,
        title: naslov,
        description:
          "Рецепт унет ради мерења перформанси система при већем броју записа.",
        instructions:
          "Састојке припремити према уобичајеном поступку и сервирати. " +
          "Рецепт је унет аутоматски, ради мерења времена одзива.",
        servings: brojPorcija,
        kcalPerServing: obracun.poPorciji.kcal,
        proteinPerServing: obracun.poPorciji.proteini,
        carbsPerServing: obracun.poPorciji.ugljeniHidrati,
        fatPerServing: obracun.poPorciji.masti,
        ingredients: {
          create: sastav.map((s, r) => ({
            ingredientId: s.namirnica.id,
            amountGrams: new Prisma.Decimal(s.kolicinaG),
            position: r,
          })),
        },
        tags: {
          create: [
            {
              tag: {
                connectOrCreate: {
                  where: { name: oznaka },
                  create: { name: oznaka },
                },
              },
            },
          ],
        },
      },
      select: { id: true },
    });

    // Вектор се израчунава истим поступком као и при уносу кроз апликацију,
    // како би семантичка претрага била мерена над истоврсним подацима.
    const tekst = tekstZaVektor({
      naslov,
      namirnice: izabrane.map((n) => n.nameSr),
      oznake: [oznaka],
    });

    const vektor = await vektorSadrzaja(tekst);

    await prisma.$executeRaw`
      UPDATE recipes
      SET embedding = ${JSON.stringify(vektor)}::vector
      WHERE id = ${recept.id}
    `;

    upisano++;

    if (upisano % 50 === 0) {
      console.log(`  уписано ${upisano} / ${potrebno}`);
    }
  }

  const ukupno = await prisma.recipe.count();
  console.log(`\nГотово. У бази се сада налази ${ukupno} рецепата.`);
  console.log(`\nЗа уклањање унетих рецепата након мерења:`);
  console.log(`  npx tsx prisma/obrisi-test-recepte.ts`);
}

main()
  .catch((g) => {
    console.error(g);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
