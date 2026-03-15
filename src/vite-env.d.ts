/// <reference types="vite/client" />

declare module "virtual:devlog-posts" {
  interface DevlogPost {
    slug: string;
    title: string;
    date: string;
    time: string;
    html: string;
  }
  const posts: DevlogPost[];
  export default posts;
}
