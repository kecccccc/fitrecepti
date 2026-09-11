import Link from "next/link";
import { trenutniKorisnik } from "@/lib/auth";
import { odjavi } from "@/app/actions/auth";

/**
 * Навигација апликације.
 *
 * Реализована је као серверска компонента, будући да јој је потребан
 * податак о пријављеном кориснику. Одјава се спроводи серверском
 * акцијом, чиме је колачић сесије уклоњен на серверској страни (ФЗ-3).
 */
export default async function Navigacija() {
  const korisnik = await trenutniKorisnik();

  return (
    <header className="border-b border-neutral-800">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        <Link href="/" className="text-lg font-semibold">
          FitRecepti
        </Link>

        <Link href="/" className="text-sm text-neutral-300">
          Recepti
        </Link>

        {korisnik && (
          <Link href="/recepti/novi" className="text-sm text-neutral-300">
            Novi recept
          </Link>
        )}

        <div className="ml-auto flex items-center gap-4">
          {korisnik ? (
            <>
              <span className="text-sm text-neutral-400">
                {korisnik.username}
              </span>
              <form action={odjavi}>
                <button
                  type="submit"
                  className="rounded border border-neutral-600 px-3 py-1.5 text-sm"
                >
                  Odjava
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/prijava" className="text-sm text-neutral-300">
                Prijava
              </Link>
              <Link
                href="/registracija"
                className="rounded border border-neutral-600 px-3 py-1.5 text-sm"
              >
                Registracija
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
