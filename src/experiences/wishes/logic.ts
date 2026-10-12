import { invoke } from '../../services/supabase';
export const WISH_LIMIT = 2000;
export const FIRST_APPEARANCE = 30000;
export const REAPPEARANCE = 120000;
export const INVITATION_LIFETIME = 45000;
export class WishEncounterClock {
 private elapsed = 0;
 private delay = FIRST_APPEARANCE;
 invited = false;
 tick(ms: number, active: boolean) {
  if (!active) return false;
  this.elapsed += Math.max(0, ms);
  if (this.invited && this.elapsed >= INVITATION_LIFETIME) { this.dismiss(); return false; }
  if (!this.invited && this.elapsed >= this.delay) { this.invited = true; this.elapsed = 0; }
  return this.invited;
 }
 dismiss() { this.invited = false; this.elapsed = 0; this.delay = REAPPEARANCE; }
}
export function createWishDelivery(send = (body: unknown) => invoke<{ok:boolean}>('submit', body)) {
 let request: Promise<void> | null = null;
 let sent = false;
 let id: string | undefined;
 let original: string | undefined;
 return {
  deliver(text: string): Promise<void> {
   if (request) return request;
   if (sent) return Promise.resolve();
   const trimmed = text.trim();
   if (!trimmed || trimmed.length > WISH_LIMIT) return Promise.reject(new Error('Escreva um desejo de até 2.000 caracteres.'));
   if (original !== trimmed) { id = crypto.randomUUID(); original = trimmed; }
   request = (async () => {
    const result = await send({kind:'wish', text:trimmed, consent:true, submissionId:id});
    if (result?.ok !== true) throw new Error('O servidor não confirmou o envio.');
    sent = true;
   })().finally(() => { request = null; });
   return request;
  },
 };
}
