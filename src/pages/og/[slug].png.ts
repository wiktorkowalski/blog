import type { APIRoute } from "astro";
import { formatDate, getPosts, type Post } from "../../lib/posts";
import { renderOg } from "../../lib/og";

export async function getStaticPaths() {
  const posts = await getPosts();
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: Post };
  const png = await renderOg({
    title: post.data.title,
    label: post.data.tags.slice(0, 3).join(" · ").toUpperCase() || "POST",
    footer: formatDate(post.data.date),
  });
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
