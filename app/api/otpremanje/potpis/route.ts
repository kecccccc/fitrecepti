import crypto from "crypto";
import { trenutniKorisnik } from "@/lib/auth";
import { uspeh, greska, neovlascen } from "@/lib/odgovori";

/**
 * POST /api/otpremanje/potpis
 *
 * Издаје потпис за отпремање фотографије (ФЗ-9).
 *
 * Датотека се не преноси кроз сервер апликације, већ се са клијента
 * шаље непосредно у складиште. Сервер издаје само потпис, чиме је
 * оптерећење сервера сведено на једну краћу размену, независно од
 * величине датотеке.
 *
 * Потпис се израчунава тајним кључем који постоји само на серверу и
 * важи ограничено време. Без њега складиште одбија захтев, па отпремање
 * није могуће мимо апликације.
 */

const DOZVOLJENI_FORMATI = "jpg,jpeg,png,webp";
const FASCIKLA = "fitrecepti";

export async function POST() {
  // Потпис се издаје само пријављеном кориснику (ФЗ-5).
  const korisnik = await trenutniKorisnik();
  if (!korisnik) return neovlascen();

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return greska("Складиште датотека није подешено.", 500);
  }

  const timestamp = Math.round(Date.now() / 1000);

  // Параметри се потписују поређани по називу, онако како то захтева
  // складиште. Сваки параметар који се шаље мора бити обухваћен
  // потписом, иначе захтев бива одбијен.
  const zaPotpis =
    `allowed_formats=${DOZVOLJENI_FORMATI}` +
    `&folder=${FASCIKLA}` +
    `&timestamp=${timestamp}`;

  const potpis = crypto
    .createHash("sha1")
    .update(zaPotpis + apiSecret)
    .digest("hex");

  return uspeh({
    cloudName,
    apiKey,
    timestamp,
    potpis,
    fascikla: FASCIKLA,
    dozvoljeniFormati: DOZVOLJENI_FORMATI,
  });
}
