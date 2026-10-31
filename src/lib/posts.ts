import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

// Drafts show up in `npm run dev`, never in a build.
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function readingTime(body = ""): number {
  return Math.max(1, Math.round(body.split(/\s+/).length / 220));
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getTags(posts: Post[]): Map<string, { name: string; posts: Post[] }> {
  const tags = new Map<string, { name: string; posts: Post[] }>();
  for (const post of posts) {
    for (const name of post.data.tags) {
      const slug = slugify(name);
      if (!tags.has(slug)) tags.set(slug, { name, posts: [] });
      tags.get(slug)!.posts.push(post);
    }
  }
  return tags;
}
