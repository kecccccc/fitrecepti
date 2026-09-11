import { prisma } from "@/lib/prisma";
import { izracunajDoprinos } from "@/lib/nutricija";

/**
 * Учитавање појединачног рецепта.
 *
 * Модул користе и REST рута и страна за приказ рецепта, чиме је
 * избегнуто удвостручавање упита и правила приказа.
 */

export type StavkaPrikaza = {
  namirnicaId: string;
  nazivSr: string;
  nazivIzvorni: string;
  kolicinaG: number;
  doprinosKcal: number;
};

export type PrikazRecepta = {
  id: string;
  naslov: string;
  opis: string;
  postupakPripreme: string;
  urlSlike: string | null;
  brojPorcija: number;
  autor: { id: string; korisnickoIme: string };
  poPorciji: {
    kcal: number;
    proteini: number;
    ugljeniHidrati: number;
    masti: number;
  };
  sastav: StavkaPrikaza[];
  oznake: string[];
  prosecnaOcena: number | null;
  brojOcena: number;
  datumKreiranja: Date;
};

export async function ucitajRecept(id: string): Promise<PrikazRecepta | null> {
  const recept = await prisma.recipe.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      instructions: true,
      imageUrl: true,
      servings: true,
      kcalPerServing: true,
      proteinPerServing: true,
      carbsPerServing: true,
      fatPerServing: true,
      createdAt: true,
      author: { select: { id: true, username: true } },
      tags: { select: { tag: { select: { name: true } } } },
      ingredients: {
        orderBy: { position: "asc" },
        select: {
          amountGrams: true,
          ingredient: {
            select: {
              id: true,
              nameSr: true,
              name: true,
              kcalPer100g: true,
              proteinPer100g: true,
              carbsPer100g: true,
              fatPer100g: true,
            },
          },
        },
      },
    },
  });

  if (!recept) return null;

  // Просечна оцена израчунава се упитом над табелом оцена (ФЗ-21).
  const ocene = await prisma.rating.aggregate({
    where: { recipeId: id },
    _avg: { value: true },
    _count: { value: true },
  });

  return {
    id: recept.id,
    naslov: recept.title,
    opis: recept.description,
    postupakPripreme: recept.instructions,
    urlSlike: recept.imageUrl,
    brojPorcija: recept.servings,
    autor: {
      id: recept.author.id,
      korisnickoIme: recept.author.username,
    },
    poPorciji: {
      kcal: Number(recept.kcalPerServing),
      proteini: Number(recept.proteinPerServing),
      ugljeniHidrati: Number(recept.carbsPerServing),
      masti: Number(recept.fatPerServing),
    },
    // Уз сваку намирницу приказује се њен допринос енергетској вредности,
    // чиме је кориснику омогућен увид у начин на који је вредност добијена
    // (слика 4.4).
    sastav: recept.ingredients.map((s) => ({
      namirnicaId: s.ingredient.id,
      nazivSr: s.ingredient.nameSr,
      nazivIzvorni: s.ingredient.name,
      kolicinaG: Number(s.amountGrams),
      doprinosKcal: Number(
        izracunajDoprinos({
          namirnica: s.ingredient,
          kolicinaG: s.amountGrams,
        }).kcal
      ),
    })),
    oznake: recept.tags.map((t) => t.tag.name),
    prosecnaOcena: ocene._avg.value,
    brojOcena: ocene._count.value,
    datumKreiranja: recept.createdAt,
  };
}
