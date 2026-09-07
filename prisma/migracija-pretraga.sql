-- Pretraga neosetljiva na dijakritičke znakove.
-- Pokreće se jednom, u SQL editoru.
--
-- Razlog: nazivi namirnica sadrže znakove č, ć, š, ž, đ. Korisnici ih
-- pri kucanju najčešće izostavljaju, pa upit "pileca" ne bi pronašao
-- zapis "Pileća prsa". Proširenje unaccent uklanja dijakritike pri
-- poređenju, čime oba oblika daju isti rezultat.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Funkcija unaccent je označena kao STABLE, pa se ne može neposredno
-- koristiti u definiciji indeksa. Omotač označen kao IMMUTABLE to
-- omogućava. Navođenje rečnika ('unaccent') je obavezno — bez njega
-- funkcija ne bi bila determinisana.
CREATE OR REPLACE FUNCTION bez_kvacica(tekst text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$ SELECT unaccent('unaccent', $1) $$;

-- Indeksi ubrzavaju pretragu po početku niske. Za pretragu po sredini
-- niske (LIKE '%pojam%') indeks se ne koristi, ali pri veličini tabele
-- od nekoliko stotina zapisa to ne utiče na vreme odziva.
CREATE INDEX IF NOT EXISTS ingredients_name_sr_bez_kvacica_idx
  ON ingredients (lower(bez_kvacica(name_sr)) text_pattern_ops);

CREATE INDEX IF NOT EXISTS ingredients_name_bez_kvacica_idx
  ON ingredients (lower(bez_kvacica(name)) text_pattern_ops);

-- Provera:
--   SELECT bez_kvacica('Pileća prsa');   →  Pileca prsa
