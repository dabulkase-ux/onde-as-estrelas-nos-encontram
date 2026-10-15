import type {Page} from '@playwright/test';
import {draftResetKey} from '../../src/experiences/herUniverse/draftReset';
// Builder/recovery fixtures represent drafts created after the delivery reset.
export async function postDraftReset(page:Page){
 await page.addInitScript(key=>localStorage.setItem(key,JSON.stringify({version:1,status:'done'})),draftResetKey);
}
