import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Upravljanje sesijom (NFZ-2).
 *
 * Podatak o prijavljenom korisniku čuva se u potpisanom tokenu, koji
 * se prosleđuje kolačićem. Kolačić je označen kao httpOnly, pa mu
 * skripte u pregledaču ne mogu pristupiti — time je onemogućena krađa
 * sesije napadom umetanjem skripte.
 *
 * Token je potpisan tajnim ključem koji postoji samo na serveru.
 * Izmena sadržaja tokena poništava potpis, pa se falsifikovana sesija
 * odbacuje.
 */

const NAZIV_KOLACICA = "sesija";
const TRAJANJE_DANA = 7;

function tajniKljuc(): Uint8Array {
  const kljuc = process.env.AUTH_SECRET;
  if (!kljuc) {
    throw new Error("Nedostaje AUTH_SECRET u .env fajlu.");
  }
  return new TextEncoder().encode(kljuc);
}

export type SadrzajSesije = {
  korisnikId: string;
  uloga: "USER" | "ADMIN";
};

export async function kreirajSesiju(sadrzaj: SadrzajSesije): Promise<void> {
  const istice = new Date(Date.now() + TRAJANJE_DANA * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({ ...sadrzaj })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(istice)
    .sign(tajniKljuc());

  const skladiste = await cookies();
  skladiste.set(NAZIV_KOLACICA, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: istice,
    path: "/",
  });
}

export async function ocitajSesiju(): Promise<SadrzajSesije | null> {
  const skladiste = await cookies();
  const token = skladiste.get(NAZIV_KOLACICA)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, tajniKljuc(), {
      algorithms: ["HS256"],
    });

    return {
      korisnikId: payload.korisnikId as string,
      uloga: payload.uloga as "USER" | "ADMIN",
    };
  } catch {
    // istekao ili neispravan potpis
    return null;
  }
}

export async function obrisiSesiju(): Promise<void> {
  const skladiste = await cookies();
  skladiste.delete(NAZIV_KOLACICA);
}
