import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import guestManifest from "../../app/manifest";

function readPngDimensions(path: string) {
  const png = readFileSync(path);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("installable PWA profiles", () => {
  it("publishes exact Android and Apple icon sizes", () => {
    expect(readPngDimensions("public/images/pwa-icon-180.png")).toEqual({ width: 180, height: 180 });
    expect(readPngDimensions("public/images/pwa-icon-192.png")).toEqual({ width: 192, height: 192 });
    expect(readPngDimensions("public/images/pwa-icon-512.png")).toEqual({ width: 512, height: 512 });
    expect(guestManifest().icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]));
  });

  it.each([
    ["public/personale.webmanifest", "/personale"],
    ["public/menuadmin.webmanifest", "/menuadmin"],
  ])("opens the correct back-office start route from %s", (path, startUrl) => {
    const manifest = JSON.parse(readFileSync(path, "utf8")) as { id: string; start_url: string; display: string; icons: Array<{ sizes: string }> };
    expect(manifest.id).toBe(startUrl);
    expect(manifest.start_url).toBe(startUrl);
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
  });

  it("replaces old caches without caching private application routes", () => {
    const worker = readFileSync("public/sw.js", "utf8");
    expect(worker).toContain("caches.delete(key)");
    expect(worker).toContain("self.clients.claim()");
    expect(worker).toContain("SENSITIVE_PATHS.some");
    expect(worker).toContain('url.pathname.startsWith("/_next/")');
  });
});
