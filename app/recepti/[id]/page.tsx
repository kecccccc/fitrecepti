import { notFound } from "next/navigation";
import { ucitajRecept } from "@/lib/recepti";
import { trenutniKorisnik } from "@/lib/auth";
import DugmeBrisanja from "@/components/DugmeBrisanja";

/**
 * Страна за приказ рецепта (слика 4.4).
 *
 * Реализована је као серверска компонента, будући да не захтева
 * интеракцију — подаци се учитавају на серверу и шаљу већ припремљени.
 */

export default async function StranaRecepta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recept = await ucitajRecept(id);

  if (!recept) notFound();

  const korisnik = await trenutniKorisnik();
  const smeDaBrise =
    korisnik &&
    (korisnik.id === recept.autor.id || korisnik.role === "ADMIN");

  return (
    <article className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="flex h-64 items-center justify-center rounded border border-neutral-700 bg-neutral-800 text-sm text-neutral-500">
            {recept.urlSlike ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={recept.urlSlike}
                alt={recept.naslov}
                className="h-full w-full rounded object-cover"
              />
            ) : (
              "bez fotografije"
            )}
          </div>

          <h1 className="mt-6 text-3xl font-semibold">{recept.naslov}</h1>

          <p className="mt-2 text-sm text-neutral-400">
            {recept.autor.korisnickoIme} ·{" "}
            {recept.datumKreiranja.toLocaleDateString("sr-RS")}
          </p>

          {recept.prosecnaOcena !== null && (
            <p className="mt-2 text-sm">
              Prosečna ocena: {recept.prosecnaOcena.toFixed(1)} ({recept.brojOcena})
            </p>
          )}

          {recept.oznake.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {recept.oznake.map((o) => (
                <span
                  key={o}
                  className="rounded-full border border-neutral-600 px-3 py-1 text-sm text-neutral-300"
                >
                  {o}
                </span>
              ))}
            </div>
          )}

          <p className="mt-4 text-neutral-300">{recept.opis}</p>

          {smeDaBrise && (
            <div className="mt-6">
              <DugmeBrisanja receptId={recept.id} />
            </div>
          )}
        </div>

        <div>
          {/* Панел са нутритивним вредностима */}
          <section className="rounded border border-neutral-700 p-5">
            <h2 className="mb-4 font-medium">Nutritivne vrednosti po porciji</h2>

            <div className="grid grid-cols-2 gap-4">
              <Vrednost naziv="Energetska vrednost" iznos={`${recept.poPorciji.kcal.toFixed(0)} kcal`} />
              <Vrednost naziv="Proteini" iznos={`${recept.poPorciji.proteini.toFixed(1)} g`} />
              <Vrednost naziv="Ugljeni hidrati" iznos={`${recept.poPorciji.ugljeniHidrati.toFixed(1)} g`} />
              <Vrednost naziv="Masti" iznos={`${recept.poPorciji.masti.toFixed(1)} g`} />
            </div>

            <p className="mt-4 text-xs text-neutral-500">
              Izračunato automatski · broj porcija: {recept.brojPorcija}
            </p>
          </section>

          {/* Састав са доприносом сваке намирнице */}
          <section className="mt-6">
            <h2 className="mb-3 font-medium">Namirnice</h2>
            <ul>
              {recept.sastav.map((s) => (
                <li
                  key={s.namirnicaId}
                  className="flex items-baseline justify-between border-b border-neutral-800 py-2 text-sm"
                >
                  <span title={s.nazivIzvorni}>{s.nazivSr}</span>
                  <span className="ml-4 whitespace-nowrap text-neutral-400">
                    {s.kolicinaG} g · {s.doprinosKcal.toFixed(0)} kcal
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="mb-3 font-medium">Postupak pripreme</h2>
            <p className="whitespace-pre-line text-neutral-300">
              {recept.postupakPripreme}
            </p>
          </section>
        </div>
      </div>

      <p className="mt-10 text-xs text-neutral-500">
        Prikazane vrednosti su informativnog karaktera i ne predstavljaju zamenu
        za savet stručnjaka za ishranu.
      </p>
    </article>
  );
}

function Vrednost({ naziv, iznos }: { naziv: string; iznos: string }) {
  return (
    <div>
      <p className="text-sm text-neutral-400">{naziv}</p>
      <p className="text-xl font-semibold">{iznos}</p>
    </div>
  );
}
