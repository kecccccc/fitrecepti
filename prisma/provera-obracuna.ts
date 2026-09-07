import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { izracunajVrednosti } from "../lib/nutricija";

const prisma = new PrismaClient();

/**
 * Provera modula za izračunavanje.
 * Uzima tri stvarne namirnice iz baze i upoređuje rezultat modula
 * sa ručno izračunatom vrednošću.
 */

async function main() {
  const nazivi = ["Pileća prsa, sirova", "Pirinač, beli, kuvan", "Maslinovo ulje"];
  const kolicine = [200, 150, 10];

  const namirnice = [];

  for (const naziv of nazivi) {
    const n = await prisma.ingredient.findFirst({ where: { nameSr: naziv } });
    if (!n) {
      console.error(`Namirnica "${naziv}" nije pronađena u bazi.`);
      process.exit(1);
    }
    namirnice.push(n);
  }

  const sastav = namirnice.map((n, i) => ({
    namirnica: n,
    kolicinaG: kolicine[i],
  }));

  console.log("Sastav recepta:\n");

  let rucnoKcal = 0;
  namirnice.forEach((n, i) => {
    const doprinos = (Number(n.kcalPer100g) * kolicine[i]) / 100;
    rucnoKcal += doprinos;
    console.log(
      `  ${kolicine[i]} g  ${n.nameSr}` +
        `  (${n.kcalPer100g} kcal/100g)  →  ${doprinos.toFixed(2)} kcal`
    );
  });

  const rezultat = izracunajVrednosti(sastav, 2);

  console.log("\nModul za izračunavanje:");
  console.log(`  Ukupno:      ${rezultat.ukupno.kcal} kcal`);
  console.log(`  Po porciji:  ${rezultat.poPorciji.kcal} kcal`);
  console.log(`  Proteini:    ${rezultat.poPorciji.proteini} g / porcija`);
  console.log(`  UH:          ${rezultat.poPorciji.ugljeniHidrati} g / porcija`);
  console.log(`  Masti:       ${rezultat.poPorciji.masti} g / porcija`);

  console.log("\nRučna provera:");
  console.log(`  Ukupno:      ${rucnoKcal.toFixed(2)} kcal`);
  console.log(`  Po porciji:  ${(rucnoKcal / 2).toFixed(2)} kcal`);

  const razlika = Math.abs(Number(rezultat.ukupno.kcal) - rucnoKcal);
  console.log(
    razlika < 0.01
      ? "\nRezultati se poklapaju."
      : `\nOdstupanje: ${razlika.toFixed(4)} kcal`
  );
}

main()
  .catch((g) => {
    console.error(g);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
