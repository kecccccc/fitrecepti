# ФитРецепти

Веб апликација за дељење фитнес рецепата са аутоматским израчунавањем
нутритивних вредности. Дипломски рад, Факултет техничких наука у Чачку.

## Технологије
Next.js, React, TypeScript, PostgreSQL, Prisma, pgvector, Tailwind CSS

## Покретање

1. `npm install`
2. Копирати `.env.example` у `.env` и попунити вредности
3. `npx prisma migrate dev`
4. `npx tsx prisma/uvoz-namirnica.ts`
5. `npm run dev`