import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { trenutniKorisnik } from "@/lib/auth";
import { uspeh, greska, neovlascen, nijePronadjeno } from "@/lib/odgovori";

/**
 * GET  /api/recepti/[id]/komentari   Листа коментара
 * POST /api/recepti/[id]/komentari   Унос коментара (ФЗ-22)
 */

const semaKomentara = z.object({
  sadrzaj: z
    .string()
    .trim()
    .min(2, "Коментар мора имати бар 2 знака.")
    .max(1000, "Коментар не сме бити дужи од 1000 знакова."),
});

export async function GET(
  _zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const korisnik = await trenutniKorisnik();

  const komentari = await prisma.comment.findMany({
    where: { recipeId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, username: true } },
    },
  });

  return uspeh({
    ukupno: komentari.length,
    rezultati: komentari.map((k) => ({
      id: k.id,
      sadrzaj: k.body,
      autor: k.author.username,
      datum: k.createdAt,
      // Служи само за приказ дугмета; стварна провера овлашћења
      // спроводи се при брисању, на серверској страни.
      smeBrisanje:
        !!korisnik &&
        (korisnik.id === k.author.id || korisnik.role === "ADMIN"),
    })),
  });
}

export async function POST(
  zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const korisnik = await trenutniKorisnik();
  if (!korisnik) return neovlascen();

  const { id } = await params;

  let telo: unknown;
  try {
    telo = await zahtev.json();
  } catch {
    return greska("Тело захтева није исправан JSON.", 400);
  }

  const provera = semaKomentara.safeParse(telo);
  if (!provera.success) {
    return greska(
      "Унети подаци нису исправни.",
      400,
      provera.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const recept = await prisma.recipe.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!recept) return nijePronadjeno("Рецепт");

  const komentar = await prisma.comment.create({
    data: {
      recipeId: id,
      authorId: korisnik.id,
      body: provera.data.sadrzaj,
    },
    select: { id: true, body: true, createdAt: true },
  });

  return uspeh(
    {
      id: komentar.id,
      sadrzaj: komentar.body,
      autor: korisnik.username,
      datum: komentar.createdAt,
      smeBrisanje: true,
    },
    201
  );
}
