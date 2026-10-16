/** Bounded network retry; UI focus does not bypass a backend outage cooldown. */
export function mailRetryDelay(failures:number){return Math.min(120000,5000*2**Math.min(5,Math.max(1,failures)));}
