import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Уклања рецепте унете ради мерења перформанси.
 * Препознају се по ознаци [test] на почетку наслова.
 */

async function main() {
  const broj = await prisma.recipe.count({
    where: { title: { startsWith: "[test]" } },
  });

  if (broj === 0) {
    console.log("Нема рецепата са ознаком [test].");
    return;
  }

  console.log(`Брише се ${broj} рецепата...`);

  // Ставке рецепта, ознаке, оцене и коментари бришу се посредно,
  // захваљујући подешавању onDelete: Cascade (поглавље 4.1).
  const rezultat = await prisma.recipe.deleteMany({
    where: { title: { startsWith: "[test]" } },
  });

  const preostalo = await prisma.recipe.count();
  console.log(`Обрисано: ${rezultat.count}. У бази је остало ${preostalo} рецепата.`);
}

main()
  .catch((g) => {
    console.error(g);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
