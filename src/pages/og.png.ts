import { SITE } from "../consts";
import { renderOg } from "../lib/og";

export async function GET() {
  const png = await renderOg({ title: SITE.title, label: "BLOG", footer: SITE.description.split(".")[0] });
  return new Response(png, { headers: { "Content-Type": "image/png" } });
}
