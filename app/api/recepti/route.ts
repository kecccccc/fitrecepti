import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trenutniKorisnik } from "@/lib/auth";
import { obracunajZaRecept } from "@/lib/obracun";
import { GreskaObracuna } from "@/lib/nutricija";
import { semaRecepta, semaFiltera } from "@/lib/validacija";
import { uspeh, greska, neovlascen } from "@/lib/odgovori";
import { sacuvajVektorRecepta } from "@/lib/pretraga";
const PO_STRANI = 12;

/**
 * POST /api/recepti
 *
 * Kreiranje recepta (FZ-6, FZ-7, FZ-8, FZ-12).
 *
 * Klijent šalje isključivo oznake namirnica i količine. Nutritivne
 * vrednosti se ne primaju od klijenta, već ih server izračunava na
 * osnovu podataka iz nutritivne baze. Time se onemogućava upis
 * proizvoljnih vrednosti izmenom zahteva.
 */
export async function POST(zahtev: NextRequest) {
  const korisnik = await trenutniKorisnik();
  if (!korisnik) return neovlascen();

  let telo: unknown;
  try {
    telo = await zahtev.json();
  } catch {
    return greska("Telo zahteva nije ispravan JSON.", 400);
  }

  const provera = semaRecepta.safeParse(telo);
  if (!provera.success) {
    return greska(
      "Uneti podaci nisu ispravni.",
      400,
      provera.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const podaci = provera.data;

  // Obračun na serveru. Ova funkcija ujedno proverava da svaka uneta
  // namirnica postoji u nutritivnoj bazi (FZ-8).
  let obracun;
  try {
    obracun = await obracunajZaRecept(podaci.sastav, podaci.brojPorcija);
  } catch (g) {
    if (g instanceof GreskaObracuna) {
      return greska(g.message, 400);
    }
    throw g;
  }

  const recept = await prisma.recipe.create({
    data: {
      authorId: korisnik.id,
      title: podaci.naslov,
      description: podaci.opis,
      instructions: podaci.postupakPripreme,
      imageUrl: podaci.urlSlike ?? null,
      servings: podaci.brojPorcija,

      kcalPerServing: obracun.poPorciji.kcal,
      proteinPerServing: obracun.poPorciji.proteini,
      carbsPerServing: obracun.poPorciji.ugljeniHidrati,
      fatPerServing: obracun.poPorciji.masti,

      ingredients: {
        create: podaci.sastav.map((s, i) => ({
          ingredientId: s.namirnicaId,
          amountGrams: new Prisma.Decimal(s.kolicinaG),
          position: i,
        })),
      },

      tags: {
        create: podaci.oznake.map((naziv) => ({
          tag: {
            connectOrCreate: {
              where: { name: naziv },
              create: { name: naziv },
            },
          },
        })),
      },
    },
    select: { id: true, title: true, kcalPerServing: true },
  });

// Вектор се генерише након чувања. Неуспех генерисања не поништава
  // чување рецепта — рецепт остаје употребљив, само привремено није
  // обухваћен семантичком претрагом.
try {
    await sacuvajVektorRecepta(recept.id);
  } catch (g) {
    console.error("Generisanje vektora nije uspelo:", g);
  }



  return uspeh(
    {
      id: recept.id,
      naslov: recept.title,
      kcalPoPorciji: Number(recept.kcalPerServing),
    },
    201
  );
}

/**
 * GET /api/recepti
 *
 * Lista recepata sa pretragom, filtriranjem i sortiranjem
 * (FZ-13 do FZ-17).
 *
 * Filtriranje se izvršava nad izvedenim vrednostima po porciji, koje
 * su smeštene u tabeli recepata. Zahvaljujući tome upit ne zahteva
 * spajanje sa tabelama namirnica ni agregaciju (vidi poglavlje 4.2).
 */
export async function GET(zahtev: NextRequest) {
  const parametri = Object.fromEntries(zahtev.nextUrl.searchParams);
  const provera = semaFiltera.safeParse(parametri);

  if (!provera.success) {
    return greska(
      "Parametri pretrage nisu ispravni.",
      400,
      provera.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  const { q, maxKcal, minProteini, oznaka, sortiranje, strana } = provera.data;

  const uslov: Prisma.RecipeWhereInput = {
    ...(q && { title: { contains: q, mode: "insensitive" } }),
    ...(maxKcal !== undefined && { kcalPerServing: { lte: maxKcal } }),
    ...(minProteini !== undefined && { proteinPerServing: { gte: minProteini } }),
    ...(oznaka && { tags: { some: { tag: { name: oznaka } } } }),
  };

  const redosled: Prisma.RecipeOrderByWithRelationInput =
    sortiranje === "kalorije"
      ? { kcalPerServing: "asc" }
      : { createdAt: "desc" };

  const [ukupno, recepti] = await Promise.all([
    prisma.recipe.count({ where: uslov }),
    prisma.recipe.findMany({
      where: uslov,
      orderBy: redosled,
      skip: (strana - 1) * PO_STRANI,
      take: PO_STRANI,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        kcalPerServing: true,
        proteinPerServing: true,
        createdAt: true,
        author: { select: { username: true } },
        tags: { select: { tag: { select: { name: true } } } },
        _count: { select: { ratings: true } },
      },
    }),
  ]);

  return uspeh({
    ukupno,
    strana,
    poStrani: PO_STRANI,
    rezultati: recepti.map((r) => ({
      id: r.id,
      naslov: r.title,
      urlSlike: r.imageUrl,
      kcalPoPorciji: Number(r.kcalPerServing),
      proteiniPoPorciji: Number(r.proteinPerServing),
      autor: r.author.username,
      oznake: r.tags.map((t) => t.tag.name),
      brojOcena: r._count.ratings,
      datum: r.createdAt,
    })),
  });
}
