/// <reference types="vite/client" />

declare module "virtual:devlog-posts" {
  interface DevlogPost {
    slug: string;
    title: string;
    date: string;
    time: string;
    author: string;
    html: string;
  }
  const posts: DevlogPost[];
  export default posts;
}

declare module "virtual:intro-sections" {
  interface IntroSection {
    title?: string;
    html: string;
  }
  const sections: IntroSection[];
  export default sections;
}
