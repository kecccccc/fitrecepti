-- Промена димензије векторске колоне са 1536 на 384.
--
-- Разлог: изабран је локални модел multilingual-e5-small, чији вектор
-- има 384 димензије. Димензија колоне мора одговарати димензији вектора
-- који модел даје, иначе упис бива одбијен.

DROP INDEX IF EXISTS recipes_embedding_idx;

ALTER TABLE recipes DROP COLUMN IF EXISTS embedding;

ALTER TABLE recipes ADD COLUMN embedding vector(384);

-- HNSW индекс за претрагу по косинусној мери сличности.
-- Без индекса би се при сваком упиту пролазило кроз све записе.
CREATE INDEX recipes_embedding_idx
  ON recipes
  USING hnsw (embedding vector_cosine_ops);
