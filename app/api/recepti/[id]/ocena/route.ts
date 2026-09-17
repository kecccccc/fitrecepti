import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { trenutniKorisnik } from "@/lib/auth";
import { uspeh, greska, neovlascen, nijePronadjeno } from "@/lib/odgovori";

/**
 * GET  /api/recepti/[id]/ocena   Просечна оцена и оцена корисника
 * POST /api/recepti/[id]/ocena   Оцењивање рецепта (ФЗ-20, ФЗ-21)
 */

async function prosek(receptId: string) {
  const rezultat = await prisma.rating.aggregate({
    where: { recipeId: receptId },
    _avg: { value: true },
    _count: { value: true },
  });

  return {
    prosecnaOcena: rezultat._avg.value,
    brojOcena: rezultat._count.value,
  };
}

export async function GET(
  _zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const korisnik = await trenutniKorisnik();

  // Сопствена оцена прибавља се само за пријављеног корисника, како би
  // му при поновном отварању рецепта била приказана већ дата оцена.
  const mojaOcena = korisnik
    ? await prisma.rating.findUnique({
        where: { userId_recipeId: { userId: korisnik.id, recipeId: id } },
        select: { value: true },
      })
    : null;

  return uspeh({
    ...(await prosek(id)),
    mojaOcena: mojaOcena?.value ?? null,
  });
}

export async function POST(
  zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const korisnik = await trenutniKorisnik();
  if (!korisnik) return neovlascen();

  const { id } = await params;

  let telo: { vrednost?: unknown };
  try {
    telo = await zahtev.json();
  } catch {
    return greska("Тело захтева није исправан JSON.", 400);
  }

  const vrednost = Number(telo.vrednost);

  if (!Number.isInteger(vrednost) || vrednost < 1 || vrednost > 5) {
    return greska("Оцена мора бити цео број од 1 до 5.", 400);
  }

  const recept = await prisma.recipe.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!recept) return nijePronadjeno("Рецепт");

  // Сложени примарни кључ спречава да исти корисник остави више оцена
  // истом рецепту. Поновно оцењивање мења већ дату оцену.
  await prisma.rating.upsert({
    where: { userId_recipeId: { userId: korisnik.id, recipeId: id } },
    create: { userId: korisnik.id, recipeId: id, value: vrednost },
    update: { value: vrednost },
  });

  return uspeh({ ...(await prosek(id)), mojaOcena: vrednost });
}
