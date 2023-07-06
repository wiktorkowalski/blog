import { getCollection } from "astro:content";
import getSortedPosts from "@utils/getSortedPosts";
import slugify from "@utils/slugify";

export async function get() {
  const posts = await getCollection("blog");
  const sortedPosts = getSortedPosts(posts.slice(0, 5));
  return {
    body: JSON.stringify(sortedPosts.map(({ data }) => ({
      link: `posts/${slugify(data)}`,
      title: data.title,
      description: data.description,
      pubDate: new Date(data.pubDatetime),
    }))),
    headers: {
      "content-type": "application/json",
    },
  };
}
