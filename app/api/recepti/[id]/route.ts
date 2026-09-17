import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { trenutniKorisnik } from "@/lib/auth";
import { ucitajRecept } from "@/lib/recepti";
import { uspeh, greska, neovlascen, zabranjeno, nijePronadjeno } from "@/lib/odgovori";
import { z } from "zod";

/**
 * GET    /api/recepti/[id]   Приказ рецепта
 * DELETE /api/recepti/[id]   Брисање рецепта (ФЗ-11, ФЗ-23)
 */

export async function GET(
  _zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recept = await ucitajRecept(id);

  if (!recept) return nijePronadjeno("Рецепт");

  return uspeh(recept);
}

export async function DELETE(
  _zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const korisnik = await trenutniKorisnik();
  if (!korisnik) return neovlascen();

  const { id } = await params;

  const recept = await prisma.recipe.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!recept) return nijePronadjeno("Рецепт");

  // Рецепт може обрисати његов аутор или администратор (ФЗ-11, ФЗ-23).
  // Провера се спроводи на серверу — скривање дугмета у интерфејсу
  // само по себи не представља заштиту.
  const sopstveni = recept.authorId === korisnik.id;
  const administrator = korisnik.role === "ADMIN";

  if (!sopstveni && !administrator) return zabranjeno();

  await prisma.recipe.delete({ where: { id } });

  return uspeh({ obrisano: true });
}

const semaIzmene = z.object({
  urlSlike: z.string().url("Неисправна адреса слике.").nullable(),
});

export async function PATCH(
  zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const korisnik = await trenutniKorisnik();
  if (!korisnik) return neovlascen();

  const { id } = await params;

  const recept = await prisma.recipe.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!recept) return nijePronadjeno("Рецепт");

  const sopstveni = recept.authorId === korisnik.id;
  const administrator = korisnik.role === "ADMIN";

  if (!sopstveni && !administrator) return zabranjeno();

  let telo: unknown;
  try {
    telo = await zahtev.json();
  } catch {
    return greska("Тело захтева није исправан JSON.", 400);
  }

  const provera = semaIzmene.safeParse(telo);
  if (!provera.success) {
    return greska(
      "Унети подаци нису исправни.",
      400,
      provera.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  await prisma.recipe.update({
    where: { id },
    data: { imageUrl: provera.data.urlSlike },
  });

  return uspeh({ urlSlike: provera.data.urlSlike });
}
