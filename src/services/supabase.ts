// Cliente restrito às Edge Functions; nenhuma consulta de tabela no navegador.
export const supabaseConfig = {
 url: (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, ''),
 key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
};
export const savingAvailable = Boolean(supabaseConfig.url && supabaseConfig.key);
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function invoke<T>(name: 'admin' | 'submit', body: unknown, token?: string): Promise<T> {
 if (!savingAvailable) throw new ApiError('Supabase ainda não configurado.', 503);
 const response = await fetch(`${supabaseConfig.url}/functions/v1/${name}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', apikey: supabaseConfig.key, ...(token ? {Authorization: `Bearer ${token}`} : {}) },
  body: JSON.stringify(body), credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000),
 });
 const data = await response.json().catch(() => ({}));
 if (!response.ok) throw new ApiError(data.error ?? 'Não foi possível concluir. Tente novamente.', response.status);
 return data as T;
}
export type Submission = {kind: 'compatibility' | 'couple'; answers: string[]} | {kind: 'proposal'; attempts: number; choice: 'yes' | 'no' | 'later'} | {kind: 'wish'; text: string};
