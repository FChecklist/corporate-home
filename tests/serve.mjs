// node tests/serve.mjs [port]  : look at the site on http://127.0.0.1:<port>/ (the BUILT site in dist/: run npm run build first)
import { startServer } from "./lib.mjs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const s = await startServer(resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist"), Number(process.argv[2] || 8788));
console.log("serving " + s.base);
