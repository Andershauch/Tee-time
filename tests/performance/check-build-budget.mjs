import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const chunksDirectory = path.join(projectRoot, ".next", "static", "chunks");

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const resolved = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(resolved) : [resolved];
  }))).flat();
}

async function assertFileBudget(relativePath, maximumBytes) {
  const bytes = (await stat(path.join(projectRoot, relativePath))).size;
  if (bytes > maximumBytes) throw new Error(`${relativePath} is ${bytes} bytes; budget is ${maximumBytes}.`);
  console.info(`✓ ${relativePath}: ${bytes}/${maximumBytes} bytes`);
}

const chunks = (await filesBelow(chunksDirectory)).filter((file) => file.endsWith(".js"));
const guestChunks = [];
for (const file of chunks) {
  if ((await readFile(file, "utf8")).includes("tee-time-cart-v1")) guestChunks.push(file);
}
if (guestChunks.length !== 1) throw new Error(`Expected one central guest chunk, found ${guestChunks.length}.`);

const guestBytes = (await stat(guestChunks[0])).size;
const guestBudget = 55_000;
if (guestBytes > guestBudget) throw new Error(`Central guest chunk is ${guestBytes} bytes; budget is ${guestBudget}.`);
console.info(`✓ central guest chunk: ${guestBytes}/${guestBudget} bytes`);

await Promise.all([
  assertFileBudget("public/sw.js", 8_000),
  assertFileBudget("public/images/pwa-icon-180.png", 36_000),
  assertFileBudget("public/images/pwa-icon-192.png", 40_000),
  assertFileBudget("public/images/pwa-icon-512.png", 220_000),
]);

const prerenderManifest = JSON.parse(await readFile(path.join(projectRoot, ".next", "prerender-manifest.json"), "utf8"));
const expectedPrerenderedRoutes = ["/", "/bestilling", "/kurv", "/menu", "/tilbud"];
const missingRoutes = expectedPrerenderedRoutes.filter((route) => !prerenderManifest.routes[route]);
if (missingRoutes.length) throw new Error(`Expected prerendered routes are missing: ${missingRoutes.join(", ")}.`);
console.info(`✓ prerendering retained for ${expectedPrerenderedRoutes.join(", ")}`);
