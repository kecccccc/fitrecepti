import { NextRequest } from "next/server";
import { pronadjiSlicneRecepte } from "@/lib/pretraga";
import { uspeh, greska } from "@/lib/odgovori";

/**
 * GET /api/pretraga?namirnice=<pojam>&maxKcal=<broj>
 *
 * Претрага рецепата на основу намирница којима корисник располаже
 * (ФЗ-18).
 *
 * За разлику од претраге по наслову, која проналази само подударање
 * ниски, овде се пореде значења. Упит „пилетина, јаја, спанаћ" проналази
 * и рецепт под називом „Омлет са зеленишем", иако се ниједна унета реч у
 * наслову не појављује.
 */

const NAJMANJA_DUZINA = 3;

export async function GET(zahtev: NextRequest) {
  const parametri = zahtev.nextUrl.searchParams;
  const upit = parametri.get("namirnice")?.trim() ?? "";

  if (upit.length < NAJMANJA_DUZINA) {
    return greska(
      `Унесите бар ${NAJMANJA_DUZINA} знака.`,
      400
    );
  }

  const maxKcalTekst = parametri.get("maxKcal");
  const maxKcal = maxKcalTekst ? Number(maxKcalTekst) : undefined;

  if (maxKcal !== undefined && (!Number.isFinite(maxKcal) || maxKcal <= 0)) {
    return greska("Неисправна вредност параметра maxKcal.", 400);
  }

  const rezultati = await pronadjiSlicneRecepte(upit, { maxKcal, broj: 10 });

  const poklapanjeNamirnica = rezultati.some((r) => r.poklopljeneNamirnice > 0);

  return uspeh({
    upit,
    ukupno: rezultati.length,
    poklapanjeNamirnica,
    rezultati,
  });
}
