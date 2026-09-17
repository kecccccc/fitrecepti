import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { trenutniKorisnik } from "@/lib/auth";
import { uspeh, neovlascen, zabranjeno, nijePronadjeno } from "@/lib/odgovori";

/**
 * DELETE /api/komentari/[id]
 *
 * Брисање коментара (ФЗ-23). Коментар може обрисати његов аутор или
 * администратор, чиме је омогућено уклањање непримереног садржаја.
 */
export async function DELETE(
  _zahtev: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const korisnik = await trenutniKorisnik();
  if (!korisnik) return neovlascen();

  const { id } = await params;

  const komentar = await prisma.comment.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!komentar) return nijePronadjeno("Коментар");

  const sopstveni = komentar.authorId === korisnik.id;
  const administrator = korisnik.role === "ADMIN";

  if (!sopstveni && !administrator) return zabranjeno();

  await prisma.comment.delete({ where: { id } });

  return uspeh({ obrisano: true });
}
