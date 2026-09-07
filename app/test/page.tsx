import { prisma } from "@/lib/prisma";

export default async function TestPage() {
  const brojKorisnika = await prisma.user.count();
  const brojNamirnica = await prisma.ingredient.count();

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Veza sa bazom radi</h1>
      <p>Korisnika: {brojKorisnika}</p>
      <p>Namirnica: {brojNamirnica}</p>
    </div>
  );
}
