import { makeHandler } from '../_shared/handler.ts';
import { settingsFromEnv } from '../_shared/runtime.ts';
Deno.serve(makeHandler('admin',settingsFromEnv(Deno.env)));
