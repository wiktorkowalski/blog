import { SITE } from "../consts";
import { getPosts } from "../lib/posts";

// Read by wiktorkowalski.pl at build time to show the latest posts.
export async function GET() {
  const posts = await getPosts();
  return Response.json(
    posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      date: post.data.date.toISOString(),
      tags: post.data.tags,
      url: `${SITE.url}/${post.id}/`,
    })),
  );
}
