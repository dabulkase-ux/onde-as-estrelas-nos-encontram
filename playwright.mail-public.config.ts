import base from './playwright.her-remote.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...base,testMatch:'stellar-mail-public.spec.ts',outputDir:'test-results/stellar-mail-public',timeout:150000,webServer:{...base.webServer,env:{VITE_SUPABASE_URL:'https://stage5.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_stage5_mock',VITE_HER_UNIVERSE_REMOTE_ENABLED:'true',VITE_STELLAR_MAIL_LOCAL:'false',VITE_QUIZ_SHARING_MODE:'off'}}});
