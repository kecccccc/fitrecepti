import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { sacuvajVektorRecepta } from "../lib/pretraga";

const prisma = new PrismaClient();

/**
 * Генерише векторе за рецепте који их још немају.
 *
 * Покреће се након измене модела или димензије вектора, као и за
 * рецепте унете пре увођења семантичке претраге.
 */

async function main() {
  const bezVektora = await prisma.$queryRaw<{ id: string; title: string }[]>`
    SELECT id, title FROM recipes WHERE embedding IS NULL
  `;

  if (bezVektora.length === 0) {
    console.log("Svi recepti već imaju vektor.");
    return;
  }

  console.log(`Generisanje vektora za ${bezVektora.length} recepata...\n`);

  for (const recept of bezVektora) {
    await sacuvajVektorRecepta(recept.id);
    console.log(`  ✓  ${recept.title}`);
  }

  console.log(`\nGotovo: ${bezVektora.length} recepata.`);
}

main()
  .catch((g) => {
    console.error(g);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
