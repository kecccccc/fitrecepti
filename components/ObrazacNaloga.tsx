"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registruj, prijavi, type StanjeObrasca } from "@/app/actions/auth";

type Rezim = "registracija" | "prijava";

const pocetnoStanje: StanjeObrasca = {};

export default function ObrazacNaloga({ rezim }: { rezim: Rezim }) {
  const jeRegistracija = rezim === "registracija";
  const akcija = jeRegistracija ? registruj : prijavi;

  const [stanje, posalji, uToku] = useActionState(akcija, pocetnoStanje);

  const greskaPolja = (naziv: string) => stanje.greskePolja?.[naziv]?.[0];

  return (
    <div className="mx-auto mt-16 w-full max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">
        {jeRegistracija ? "Registracija" : "Prijava"}
      </h1>

      <form action={posalji} className="space-y-4" noValidate>
        {jeRegistracija && (
          <div>
            <label htmlFor="korisnickoIme" className="mb-1 block text-sm">
              Korisničko ime
            </label>
            <input
              id="korisnickoIme"
              name="korisnickoIme"
              type="text"
              required
              minLength={3}
              maxLength={30}
              autoComplete="username"
              className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
            />
            <Poruka tekst={greskaPolja("korisnickoIme")} />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm">
            E-adresa
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
          />
          <Poruka tekst={greskaPolja("email")} />
        </div>

        <div>
          <label htmlFor="lozinka" className="mb-1 block text-sm">
            Lozinka
          </label>
          <input
            id="lozinka"
            name="lozinka"
            type="password"
            required
            minLength={jeRegistracija ? 8 : undefined}
            autoComplete={jeRegistracija ? "new-password" : "current-password"}
            className="w-full rounded border border-neutral-600 bg-transparent px-3 py-2"
          />
          <Poruka tekst={greskaPolja("lozinka")} />
        </div>

        {stanje.greska && (
          <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {stanje.greska}
          </p>
        )}

        <button
          type="submit"
          disabled={uToku}
          className="w-full rounded bg-neutral-200 px-4 py-2 font-medium text-neutral-900 disabled:opacity-50"
        >
          {uToku
            ? "Slanje..."
            : jeRegistracija
              ? "Registruj se"
              : "Prijavi se"}
        </button>
      </form>

      <p className="mt-6 text-sm text-neutral-400">
        {jeRegistracija ? (
          <>
            Već imate nalog?{" "}
            <Link href="/prijava" className="underline">
              Prijavite se
            </Link>
          </>
        ) : (
          <>
            Nemate nalog?{" "}
            <Link href="/registracija" className="underline">
              Registrujte se
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function Poruka({ tekst }: { tekst?: string }) {
  if (!tekst) return null;
  return <p className="mt-1 text-sm text-red-400">{tekst}</p>;
}
