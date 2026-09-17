import { prisma } from "@/lib/prisma";
import { vektorUpita, vektorSadrzaja, tekstZaVektor } from "@/lib/vektori";

/**
 * Претрага рецепата на основу расположивих намирница (ФЗ-18).
 *
 * Примењен је хибридни поступак — семантичка сличност одређује редослед,
 * а поклапање назива намирница одлучује који рецепти улазе у резултат.
 *
 * Разлог за такав поступак утврђен је тестирањем. Модел за уграђивање
 * текста свака два текста из исте области оцењује као међусобно слична,
 * па се вредности сличности групишу у уском опсегу (у спроведеним
 * мерењима између 0,75 и 0,87). Услед тога се сама семантичка мера не
 * може користити као праг, будући да би сваки рецепт из базе био оцењен
 * као довољно близак упиту.
 */

export type RezultatSlicnosti = {
  id: string;
  naslov: string;
  urlSlike: string | null;
  kcalPoPorciji: number;
  proteiniPoPorciji: number;
  slicnost: number;
  poklopljeneNamirnice: number;
};

const BROJ_KANDIDATA = 30;

export async function sacuvajVektorRecepta(receptId: string): Promise<void> {
  const recept = await prisma.recipe.findUnique({
    where: { id: receptId },
    select: {
      title: true,
      ingredients: { select: { ingredient: { select: { nameSr: true } } } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  if (!recept) return;

  const tekst = tekstZaVektor({
    naslov: recept.title,
    namirnice: recept.ingredients.map((s) => s.ingredient.nameSr),
    oznake: recept.tags.map((t) => t.tag.name),
  });

  const vektor = await vektorSadrzaja(tekst);

  await prisma.$executeRaw`
    UPDATE recipes
    SET embedding = ${JSON.stringify(vektor)}::vector
    WHERE id = ${receptId}
  `;
}

/**
 * Уклања дијакритичке знакове и своди текст на мала слова.
 * Слово đ се не раставља поступком NFD, па се замењује посебно.
 */
function normalizuj(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function reci(tekst: string): string[] {
  return normalizuj(tekst)
    .split(/[^a-z0-9]+/)
    .filter((r) => r.length >= 3);
}

/**
 * Пореди две речи по заједничком почетку.
 *
 * Доследно поређење целих речи овде није употребљиво, будући да се
 * именице у српском језику мењају по падежима и роду. Корисник уноси
 * „пилетина", док у бази стоји „Пилећа прса"; речи се разликују у
 * завршетку, али деле почетак.
 *
 * Дужина заједничког почетка одређује се као дужина краће речи умањена
 * за два знака, при чему се не силази испод три. Тиме се обухватају
 * облици исте речи, а речи различитог значења остају раздвојене
 * („пилетина" и „пиринач" поклапају се тек у прва два знака).
 */
function isteReci(a: string, b: string): boolean {
  const kraca = Math.min(a.length, b.length);
  if (kraca < 3) return a === b;

  const duzinaKorena = Math.max(3, kraca - 2);
  return a.slice(0, duzinaKorena) === b.slice(0, duzinaKorena);
}

type Red = {
  id: string;
  title: string;
  image_url: string | null;
  kcal_per_serving: unknown;
  protein_per_serving: unknown;
  slicnost: number;
  namirnice: string;
};

export async function pronadjiSlicneRecepte(
  upit: string,
  granica: { maxKcal?: number; broj?: number } = {}
): Promise<RezultatSlicnosti[]> {
  const { maxKcal, broj = 10 } = granica;

  const vektor = JSON.stringify(await vektorUpita(upit));

  const kandidati = await prisma.$queryRaw<Red[]>`
    SELECT r.id, r.title, r.image_url,
           r.kcal_per_serving, r.protein_per_serving,
           1 - (r.embedding <=> ${vektor}::vector) AS slicnost,
           COALESCE(string_agg(i.name_sr, ' | '), '') AS namirnice
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
    LEFT JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE r.embedding IS NOT NULL
      AND (${maxKcal ?? null}::numeric IS NULL
           OR r.kcal_per_serving <= ${maxKcal ?? null}::numeric)
    GROUP BY r.id
    ORDER BY r.embedding <=> ${vektor}::vector
    LIMIT ${BROJ_KANDIDATA}
  `;

  const treazeneReci = reci(upit);

  const saPoklapanjem = kandidati.map((r) => {
    const sadrzajReci = reci(`${r.title} ${r.namirnice}`);

    // Броје се различите тражене речи које су пронађене, а не укупан
    // број поклапања — рецепт са више састојака не сме због тога бити
    // рангиран више.
    const poklopljene = treazeneReci.filter((tr) =>
      sadrzajReci.some((sr) => isteReci(tr, sr))
    ).length;

    return {
      id: r.id,
      naslov: r.title,
      urlSlike: r.image_url,
      kcalPoPorciji: Number(r.kcal_per_serving),
      proteiniPoPorciji: Number(r.protein_per_serving),
      slicnost: Number(r.slicnost),
      poklopljeneNamirnice: poklopljene,
    };
  });

  // Уколико бар један рецепт садржи неку од унетих намирница, приказују
  // се само такви рецепти. У супротном — када корисник унесе описни
  // упит попут „нешто лагано за доручак" — редослед одређује једино
  // семантичка мера.
  const postojiPoklapanje = saPoklapanjem.some((r) => r.poklopljeneNamirnice > 0);

  const odabrani = postojiPoklapanje
    ? saPoklapanjem.filter((r) => r.poklopljeneNamirnice > 0)
    : saPoklapanjem;

  odabrani.sort(
    (a, b) =>
      b.poklopljeneNamirnice - a.poklopljeneNamirnice ||
      b.slicnost - a.slicnost
  );

  return odabrani.slice(0, broj);
}
