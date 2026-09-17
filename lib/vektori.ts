import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Генерисање векторских репрезентација текста (ФЗ-18).
 *
 * Модел се извршава локално, на серверу апликације. Тиме је избегнута
 * зависност од спољног сервиса, а систем остаје употребљив и без
 * приступа интернету.
 *
 * Изабран је вишејезични модел multilingual-e5-small, који подржава
 * српски језик. Вектор има 384 димензије — мањи број димензија значи
 * мању заузетост простора и бржу претрагу, уз незнатно слабије
 * разликовање блиских значења у односу на веће моделе.
 */

const MODEL = "Xenova/multilingual-e5-small";
export const DIMENZIJA_VEKTORA = 384;

let cevovod: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Модел се учитава једном и задржава у меморији.
 * Прво учитавање траје неколико секунди, јер се датотеке модела
 * преузимају и смештају у локалну кеш меморију.
 */
function ucitajModel(): Promise<FeatureExtractionPipeline> {
  if (!cevovod) {
    cevovod = pipeline("feature-extraction", MODEL);
  }
  return cevovod;
}

/**
 * Модел e5 очекује ознаку намене испред текста: "query:" за упит,
 * "passage:" за садржај који се претражује. Без тих ознака резултати
 * су осетно слабији, будући да је модел на њима обучаван.
 */
async function generisiVektor(tekst: string): Promise<number[]> {
  const model = await ucitajModel();

  const izlaz = await model(tekst, {
    pooling: "mean",   // просек вектора свих речи даје вектор целог текста
    normalize: true,   // нормализација омогућава поређење косинусном мером
  });

  return Array.from(izlaz.data as Float32Array);
}

/** Вектор упита који је унео корисник. */
export function vektorUpita(upit: string): Promise<number[]> {
  return generisiVektor(`query: ${upit}`);
}

/** Вектор садржаја рецепта. */
export function vektorSadrzaja(tekst: string): Promise<number[]> {
  return generisiVektor(`passage: ${tekst}`);
}

/**
 * Саставља текст на основу кога се гради вектор рецепта.
 *
 * Укључени су наслов, називи намирница и ознаке. Поступак припреме је
 * изостављен, будући да садржи упутства („загрејати тигањ", „пећи
 * двадесет минута") која не описују састав јела, а разблажују значење
 * вектора.
 */
export function tekstZaVektor(podaci: {
  naslov: string;
  namirnice: string[];
  oznake: string[];
}): string {
  return [podaci.naslov, podaci.namirnice.join(", "), podaci.oznake.join(", ")]
    .filter(Boolean)
    .join(". ");
}
