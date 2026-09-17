import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { zahtevajKorisnika } from "@/lib/auth";

/**
 * Кориснички профил (слика 4.6).
 *
 * Обједињује рецепте које је корисник објавио и рецепте које је сачувао,
 * чиме се остварују захтеви ФЗ-11 и ФЗ-19.
 *
 * Реализован је као серверска компонента. Избор приказане целине
 * преноси се параметром упита, чиме је избегнуто увођење стања на
 * клијентској страни за податак који се и иначе учитава са сервера.
 */

type Kartica = {
  id: string;
  title: string;
  imageUrl: string | null;
  kcalPerServing: unknown;
  proteinPerServing: unknown;
};

export default async function StranaProfila({
  searchParams,
}: {
  searchParams: Promise<{ prikaz?: string }>;
}) {
  const korisnik = await zahtevajKorisnika();
  const { prikaz } = await searchParams;
  const sacuvaniPrikaz = prikaz === "sacuvani";

  const izbor = {
    id: true,
    title: true,
    imageUrl: true,
    kcalPerServing: true,
    proteinPerServing: true,
  };

  const [moji, sacuvani] = await Promise.all([
    prisma.recipe.findMany({
      where: { authorId: korisnik.id },
      orderBy: { createdAt: "desc" },
      select: izbor,
    }),
    prisma.savedRecipe.findMany({
      where: { userId: korisnik.id },
      orderBy: { createdAt: "desc" },
      select: { recipe: { select: izbor } },
    }),
  ]);

  const sacuvaniRecepti = sacuvani.map((s) => s.recipe);
  const prikazani: Kartica[] = sacuvaniPrikaz ? sacuvaniRecepti : moji;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <h1 className="text-xl font-semibold">{korisnik.username}</h1>
          <p className="mt-1 text-sm text-neutral-400">{korisnik.email}</p>
          {korisnik.role === "ADMIN" && (
            <p className="mt-2 inline-block rounded-full border border-neutral-600 px-3 py-1 text-xs">
              администратор
            </p>
          )}
        </aside>

        <section>
          <div className="mb-5 flex gap-2">
            <Link
              href="/profil"
              className={
                "rounded px-4 py-2 text-sm " +
                (!sacuvaniPrikaz
                  ? "bg-neutral-200 font-medium text-neutral-900"
                  : "border border-neutral-600")
              }
            >
              Moji recepti ({moji.length})
            </Link>
            <Link
              href="/profil?prikaz=sacuvani"
              className={
                "rounded px-4 py-2 text-sm " +
                (sacuvaniPrikaz
                  ? "bg-neutral-200 font-medium text-neutral-900"
                  : "border border-neutral-600")
              }
            >
              Sačuvani recepti ({sacuvaniRecepti.length})
            </Link>
          </div>

          {prikazani.length === 0 ? (
            <p className="text-sm text-neutral-400">
              {sacuvaniPrikaz
                ? "Još niste sačuvali nijedan recept."
                : "Još niste objavili nijedan recept."}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {prikazani.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/recepti/${r.id}`}
                    className="block overflow-hidden rounded border border-neutral-700 transition hover:border-neutral-500"
                  >
                    <div className="flex h-32 items-center justify-center bg-neutral-800 text-xs text-neutral-500">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.imageUrl}
                          alt={r.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "bez fotografije"
                      )}
                    </div>
                    <div className="p-3">
                      <h2 className="font-medium">{r.title}</h2>
                      <p className="mt-1 text-sm text-neutral-400">
                        {Number(r.kcalPerServing).toFixed(0)} kcal ·{" "}
                        {Number(r.proteinPerServing).toFixed(0)} g proteina
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
