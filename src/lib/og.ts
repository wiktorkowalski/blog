import { readFile } from "node:fs/promises";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const font = (file: string) => readFile(`node_modules/@fontsource/${file}`);

let fonts: Promise<Parameters<typeof satori>[1]["fonts"]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all([
    font("jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff"),
    font("jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff"),
    font("ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff"),
  ]).then(([mono, monoBold, sans]) => [
    { name: "mono", data: mono, weight: 400 as const },
    { name: "mono", data: monoBold, weight: 700 as const },
    { name: "sans", data: sans, weight: 600 as const },
  ]));

// Tiny hyperscript so we don't need React for satori.
const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({
  type,
  props: { style: { display: "flex", ...style }, children },
});

const screw = (side: "left" | "right") =>
  h("div", {
    position: "absolute",
    top: 40,
    [side]: 28,
    width: 18,
    height: 18,
    borderRadius: 9,
    background: "#555c63",
    border: "2px solid #0b0d0f",
  });

const led = (color: string) =>
  h("div", { width: 14, height: 14, borderRadius: 7, background: color, boxShadow: `0 0 12px ${color}` });

export async function renderOg({ title, label, footer }: { title: string; label: string; footer: string }) {
  const tree = h(
    "div",
    { position: "relative", width: 1200, height: 630, background: "#0c0e10", fontFamily: "mono" },
    h(
      "div",
      {
        position: "absolute",
        top: 40,
        left: 40,
        width: 956,
        height: 434,
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 80px",
        background: "linear-gradient(180deg, #262b30, #1b1f23 40%, #121518)",
        border: "2px solid #33393f",
        borderRadius: 6,
      },
      [
        screw("left"),
        screw("right"),
        h("div", { alignItems: "center", gap: 16, color: "#a3abb3", fontSize: 26, letterSpacing: 2 }, [
          led("#3ddc84"),
          led("#f5a623"),
          h("div", {}, label),
        ]),
        h(
          "div",
          { fontFamily: "sans", fontSize: title.length > 60 ? 56 : 68, lineHeight: 1.15, color: "#e4e7ea" },
          title,
        ),
        h("div", { justifyContent: "space-between", color: "#a3abb3", fontSize: 26 }, [
          h("div", {}, footer),
          h("div", { color: "#7fe3ad", fontWeight: 700 }, "blog.wiktorkowalski.pl"),
        ]),
      ],
    ),
  );
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts: await loadFonts() });
  return new Uint8Array(new Resvg(svg).render().asPng());
}
