import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { trenutniKorisnik } from "@/lib/auth";
import { uspeh, neovlascen, nijePronadjeno } from "@/lib/odgovori";

/**
 * GET    /api/recepti/[id]/sacuvan   Да ли је рецепт сачуван
 * POST   /api/recepti/[id]/sacuvan   Чување рецепта (ФЗ-19)
 * DELETE /api/recepti/[id]/sacuvan   Уклањање из сачуваних
 */

export async function GET(
  _zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const korisnik = await trenutniKorisnik();
  if (!korisnik) return uspeh({ sacuvan: false });

  const { id } = await params;

  const zapis = await prisma.savedRecipe.findUnique({
    where: { userId_recipeId: { userId: korisnik.id, recipeId: id } },
    select: { recipeId: true },
  });

  return uspeh({ sacuvan: !!zapis });
}

export async function POST(
  _zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const korisnik = await trenutniKorisnik();
  if (!korisnik) return neovlascen();

  const { id } = await params;

  const recept = await prisma.recipe.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!recept) return nijePronadjeno("Рецепт");

  // Сложени примарни кључ спречава двоструко чување истог рецепта.
  // Операција upsert стога чини поновни захтев безопасним — стање
  // остаје исто без обзира на број понављања.
  await prisma.savedRecipe.upsert({
    where: { userId_recipeId: { userId: korisnik.id, recipeId: id } },
    create: { userId: korisnik.id, recipeId: id },
    update: {},
  });

  return uspeh({ sacuvan: true });
}

export async function DELETE(
  _zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const korisnik = await trenutniKorisnik();
  if (!korisnik) return neovlascen();

  const { id } = await params;

  await prisma.savedRecipe.deleteMany({
    where: { userId: korisnik.id, recipeId: id },
  });

  return uspeh({ sacuvan: false });
}
