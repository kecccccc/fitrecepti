import { z } from "zod";

/**
 * Šeme za proveru ulaznih podataka (NFZ-3).
 *
 * Iste šeme koriste se i na klijentskoj i na serverskoj strani.
 * Klijentska provera postoji radi udobnosti korisnika, ali se serverska
 * ne sme izostaviti, jer se zahtev može poslati i mimo korisničkog
 * interfejsa.
 */

export const semaStavkeSastava = z.object({
  namirnicaId: z.string().uuid("Neispravna oznaka namirnice."),
  kolicinaG: z
    .number()
    .positive("Količina mora biti veća od nule.")
    .max(5000, "Količina ne sme prelaziti 5000 g."),
});

export const semaRecepta = z.object({
  naslov: z
    .string()
    .trim()
    .min(3, "Naslov mora imati bar 3 znaka.")
    .max(120, "Naslov ne sme biti duži od 120 znakova."),

  opis: z
    .string()
    .trim()
    .min(10, "Opis mora imati bar 10 znakova.")
    .max(1000, "Opis ne sme biti duži od 1000 znakova."),

  postupakPripreme: z
    .string()
    .trim()
    .min(20, "Postupak pripreme mora imati bar 20 znakova.")
    .max(5000, "Postupak pripreme ne sme biti duži od 5000 znakova."),

  brojPorcija: z
    .number()
    .int("Broj porcija mora biti ceo broj.")
    .min(1, "Broj porcija mora biti bar 1.")
    .max(50, "Broj porcija ne sme prelaziti 50."),

  urlSlike: z.string().url("Neispravna adresa slike.").optional().nullable(),

  sastav: z
    .array(semaStavkeSastava)
    .min(1, "Recept mora sadržati bar jednu namirnicu.")
    .max(40, "Recept ne sme sadržati više od 40 namirnica.")
    .refine(
      (stavke) =>
        new Set(stavke.map((s) => s.namirnicaId)).size === stavke.length,
      "Ista namirnica ne sme biti navedena više puta."
    ),

  oznake: z
    .array(z.string().trim().min(2).max(30))
    .max(6, "Recept ne sme imati više od 6 oznaka.")
    .default([]),
});

export type UlazRecepta = z.infer<typeof semaRecepta>;

/** Parametri za filtriranje liste recepata (FZ-13 do FZ-17). */
export const semaFiltera = z.object({
  q: z.string().trim().max(120).optional(),
  maxKcal: z.coerce.number().positive().optional(),
  minProteini: z.coerce.number().nonnegative().optional(),
  oznaka: z.string().trim().optional(),
  sortiranje: z.enum(["najnovije", "kalorije", "ocena"]).default("najnovije"),
  strana: z.coerce.number().int().min(1).default(1),
});
