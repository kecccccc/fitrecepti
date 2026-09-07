import { Prisma } from "@prisma/client";

/**
 * Modul za izračunavanje nutritivnih vrednosti recepta (FZ-12).
 *
 * Vrednosti se ne unose ručno, već se izračunavaju na osnovu
 * strukturirano unetih namirnica i njihovih količina.
 *
 * Sva aritmetika koristi decimalni tip, a ne brojeve sa pokretnim
 * zarezom. Binarni zapis ne može tačno predstaviti vrednosti poput
 * 0,1, pa se pri sabiranju kroz više namirnica greške zaokruživanja
 * gomilaju.
 */

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

const STO = new Decimal(100);

/** Nutritivne vrednosti namirnice, izražene na 100 grama. */
export type VrednostiNa100g = {
  kcalPer100g: Decimal | number | string;
  proteinPer100g: Decimal | number | string;
  carbsPer100g: Decimal | number | string;
  fatPer100g: Decimal | number | string;
};

/** Jedna stavka sastava recepta — namirnica i njena količina. */
export type StavkaSastava = {
  namirnica: VrednostiNa100g;
  kolicinaG: Decimal | number | string;
};

export type NutritivneVrednosti = {
  kcal: Decimal;
  proteini: Decimal;
  ugljeniHidrati: Decimal;
  masti: Decimal;
};

export type RezultatObracuna = {
  ukupno: NutritivneVrednosti;
  poPorciji: NutritivneVrednosti;
};

export class GreskaObracuna extends Error {}

function zaokruzi(vrednost: Decimal): Decimal {
  return vrednost.toDecimalPlaces(2);
}

/**
 * Doprinos jedne namirnice ukupnim vrednostima.
 *
 *     doprinos = (količina u gramima / 100) × vrednost na 100 g
 */
function doprinosStavke(stavka: StavkaSastava): NutritivneVrednosti {
  const kolicina = new Decimal(stavka.kolicinaG);

  if (kolicina.lessThanOrEqualTo(0)) {
    throw new GreskaObracuna("Količina namirnice mora biti veća od nule.");
  }

  const cinilac = kolicina.dividedBy(STO);

  return {
    kcal: new Decimal(stavka.namirnica.kcalPer100g).times(cinilac),
    proteini: new Decimal(stavka.namirnica.proteinPer100g).times(cinilac),
    ugljeniHidrati: new Decimal(stavka.namirnica.carbsPer100g).times(cinilac),
    masti: new Decimal(stavka.namirnica.fatPer100g).times(cinilac),
  };
}

/**
 * Izračunava ukupne i porcione nutritivne vrednosti recepta.
 *
 * @param sastav      namirnice sa količinama
 * @param brojPorcija na koliko porcija se recept deli
 */
export function izracunajVrednosti(
  sastav: StavkaSastava[],
  brojPorcija: number
): RezultatObracuna {
  if (sastav.length === 0) {
    throw new GreskaObracuna("Recept mora sadržati bar jednu namirnicu.");
  }

  if (!Number.isInteger(brojPorcija) || brojPorcija <= 0) {
    throw new GreskaObracuna("Broj porcija mora biti ceo broj veći od nule.");
  }

  const ukupno: NutritivneVrednosti = {
    kcal: new Decimal(0),
    proteini: new Decimal(0),
    ugljeniHidrati: new Decimal(0),
    masti: new Decimal(0),
  };

  for (const stavka of sastav) {
    const doprinos = doprinosStavke(stavka);
    ukupno.kcal = ukupno.kcal.plus(doprinos.kcal);
    ukupno.proteini = ukupno.proteini.plus(doprinos.proteini);
    ukupno.ugljeniHidrati = ukupno.ugljeniHidrati.plus(doprinos.ugljeniHidrati);
    ukupno.masti = ukupno.masti.plus(doprinos.masti);
  }

  const porcije = new Decimal(brojPorcija);

  return {
    ukupno: {
      kcal: zaokruzi(ukupno.kcal),
      proteini: zaokruzi(ukupno.proteini),
      ugljeniHidrati: zaokruzi(ukupno.ugljeniHidrati),
      masti: zaokruzi(ukupno.masti),
    },
    poPorciji: {
      kcal: zaokruzi(ukupno.kcal.dividedBy(porcije)),
      proteini: zaokruzi(ukupno.proteini.dividedBy(porcije)),
      ugljeniHidrati: zaokruzi(ukupno.ugljeniHidrati.dividedBy(porcije)),
      masti: zaokruzi(ukupno.masti.dividedBy(porcije)),
    },
  };
}

/**
 * Doprinos pojedinačne namirnice, za prikaz na strani recepta.
 * Vidi sliku 4.4 — uz svaku namirnicu prikazuje se koliko doprinosi
 * ukupnoj energetskoj vrednosti.
 */
export function izracunajDoprinos(stavka: StavkaSastava): NutritivneVrednosti {
  const d = doprinosStavke(stavka);
  return {
    kcal: zaokruzi(d.kcal),
    proteini: zaokruzi(d.proteini),
    ugljeniHidrati: zaokruzi(d.ugljeniHidrati),
    masti: zaokruzi(d.masti),
  };
}
