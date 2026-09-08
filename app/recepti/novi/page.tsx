import { zahtevajKorisnika } from "@/lib/auth";
import ObrazacRecepta from "@/components/ObrazacRecepta";

export default async function Strana() {
  await zahtevajKorisnika();
  return <ObrazacRecepta />;
}
