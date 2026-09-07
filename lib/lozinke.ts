import bcrypt from "bcryptjs";

/**
 * Rad sa lozinkama (NFZ-1).
 *
 * Lozinka se nikada ne čuva u izvornom obliku, već isključivo kao
 * kriptografski sažetak. Sažetak je jednosmeran — iz njega se izvorna
 * lozinka ne može izračunati, pa ni pristup bazi ne otkriva lozinke
 * korisnika.
 */

/**
 * Broj rundi heširanja. Svaka runda udvostručuje vreme izračunavanja.
 * Vrednost 12 daje trajanje od oko 250 ms na uobičajenom serveru —
 * dovoljno brzo da korisnik ne primeti, a dovoljno sporo da napad
 * grubom silom postane neisplativ.
 */
const RUNDE = 12;

export async function hesirajLozinku(lozinka: string): Promise<string> {
  return bcrypt.hash(lozinka, RUNDE);
}

/**
 * Poredi unetu lozinku sa sačuvanim sažetkom.
 *
 * So (nasumična vrednost dodata lozinci pre heširanja) sadržana je u
 * samom sažetku, pa je bcrypt sam izdvaja pri poređenju. Zahvaljujući
 * njoj dva korisnika sa istom lozinkom imaju različite sažetke, čime
 * je onemogućen napad unapred izračunatim tabelama.
 */
export async function proveriLozinku(
  lozinka: string,
  sazetak: string
): Promise<boolean> {
  return bcrypt.compare(lozinka, sazetak);
}
