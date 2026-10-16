import {publicFunctionOrigins} from '../_shared/publicOrigins.ts';
import {makeStellarPushHandler} from '../_shared/stellarPushHandler.ts';
import {pushDb,vapidPublicKey} from '../_shared/stellarPushRuntime.ts';
Deno.serve(makeStellarPushHandler({origins:publicFunctionOrigins(Deno.env.get('ALLOWED_ORIGINS')),db:pushDb,publicKey:vapidPublicKey}));
