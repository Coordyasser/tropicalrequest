/**
 * O PostgREST/Supabase corta toda resposta em 1000 linhas (db-max-rows) sem
 * avisar: não há erro, a query simplesmente devolve menos dados do que existe.
 * Qualquer `.select()` que possa ultrapassar isso precisa paginar.
 *
 * Use `fetchAll` no lugar de dar `await` direto no builder.
 */

const PAGE_SIZE = 1000;

/** Tamanho de bloco para listas em `.in(...)`, evita URL longa demais (HTTP 414). */
const ID_CHUNK_SIZE = 200;

type PagedResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Executa a query em páginas de 1000 até esgotar.
 *
 * `build` recebe o intervalo e devolve um builder novo a cada chamada — o
 * builder do supabase-js é mutável, reaproveitar a mesma instância entre
 * páginas sobrescreve o range anterior.
 *
 * @example
 * const rastreios = await fetchAll((from, to) =>
 *   supabase.from("rastreio").select("*").order("id").range(from, to)
 * );
 */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<PagedResult<T>>
): Promise<T[]> {
  const todos: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    const pagina = data ?? [];
    todos.push(...pagina);

    if (pagina.length < PAGE_SIZE) return todos;
    from += PAGE_SIZE;
  }
}

/**
 * Igual a `fetchAll`, mas também quebra uma lista de ids em blocos antes do
 * `.in(...)`. Pagina dentro de cada bloco.
 *
 * @example
 * const itens = await fetchAllIn(reqIds, (chunk, from, to) =>
 *   supabase.from("itens_requisicao").select("*")
 *     .in("requisicao_id", chunk).order("id").range(from, to)
 * );
 */
export async function fetchAllIn<T, Id>(
  ids: readonly Id[],
  build: (chunk: Id[], from: number, to: number) => PromiseLike<PagedResult<T>>
): Promise<T[]> {
  const todos: T[] = [];

  for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + ID_CHUNK_SIZE);
    const doChunk = await fetchAll<T>((from, to) => build(chunk, from, to));
    todos.push(...doChunk);
  }

  return todos;
}
