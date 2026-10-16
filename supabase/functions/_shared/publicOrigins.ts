/** Public galaxy functions: configured origins plus the official site and local Vite. */
export function publicFunctionOrigins(configured=''){
 const origins=[...configured.split(',').map(origin=>origin.trim()).filter(Boolean),'https://onde-as-estrelas-nos-encontram.vercel.app'];
 for(const host of ['localhost','127.0.0.1'])for(const port of [5173,5174,5175,5176,5186])origins.push(`http://${host}:${port}`);
 return [...new Set(origins)];
}
