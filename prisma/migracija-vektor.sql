-- Dopuna koju Prisma ne može da izrazi kroz šemu.
-- Pokreće se jednom, nakon `prisma migrate dev`.

-- 1. Proširenje za rad sa vektorima
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Kolona za vektorsku reprezentaciju recepta
--    Dimenzija 1536 odgovara modelu text-embedding-3-small.
--    Ako se koristi drugi model, promeniti i ovde i u schema.prisma.
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Indeks za pretragu po kosinusnoj sličnosti
--    HNSW daje brzu približnu pretragu; bez indeksa se pri svakom
--    upitu prolazi kroz celu tabelu (NFZ-5).
CREATE INDEX IF NOT EXISTS recipes_embedding_idx
  ON recipes
  USING hnsw (embedding vector_cosine_ops);

-- 4. Ograničenje vrednosti ocene na opseg 1–5 (poglavlje 4.2)
ALTER TABLE ratings
  DROP CONSTRAINT IF EXISTS ratings_value_range;

ALTER TABLE ratings
  ADD CONSTRAINT ratings_value_range
  CHECK (value BETWEEN 1 AND 5);

-- 5. Broj porcija mora biti pozitivan — inače deljenje pri obračunu puca
ALTER TABLE recipes
  DROP CONSTRAINT IF EXISTS recipes_servings_positive;

ALTER TABLE recipes
  ADD CONSTRAINT recipes_servings_positive
  CHECK (servings > 0);

-- 6. Količina namirnice mora biti pozitivna
ALTER TABLE recipe_ingredients
  DROP CONSTRAINT IF EXISTS recipe_ingredients_amount_positive;

ALTER TABLE recipe_ingredients
  ADD CONSTRAINT recipe_ingredients_amount_positive
  CHECK (amount_grams > 0);
