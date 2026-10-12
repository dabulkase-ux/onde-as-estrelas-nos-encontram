import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testIgnore:[],testMatch:'wishes.spec.ts',timeout:120000,webServer:{
 command:'npm run dev -- --port 5175 --strictPort',url:'http://localhost:5175',reuseExistingServer:false,
 env:{VITE_QUIZ_SHARING_MODE:'off',VITE_SUPABASE_URL:'https://supabase-test.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'public-test-key'},
},use:{...base.use,hasTouch:true,baseURL:'http://localhost:5175'}});
