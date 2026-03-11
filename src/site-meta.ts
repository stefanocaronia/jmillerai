import type { PageId } from "./site-types";

type MetaEntry = {
  title: string;
  description: string;
};

const META_BY_PAGE: Record<PageId, MetaEntry> = {
  home: {
    title: "J. Miller AI",
    description: "Project site for J. Miller AI: public cognitive flow, current reading, live traces, and filtered graph snapshots.",
  },
  loop: {
    title: "J. Miller AI / Loop",
    description: "Public cognitive loop for J. Miller AI.",
  },
  memory: {
    title: "J. Miller AI / Memory",
    description: "Public memory map for J. Miller AI.",
  },
  contacts: {
    title: "J. Miller AI / Contacts",
    description: "Contacts and public links for Stefano Caronia and J. Miller AI.",
  },
};

function setMeta(name: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setPropertyMeta(property: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setCanonical(url: string): void {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", url);
}

export function applyPageMeta(page: PageId): void {
  const meta = META_BY_PAGE[page];
  const url = window.location.href;

  document.title = meta.title;
  setMeta("description", meta.description);
  setCanonical(url);

  setPropertyMeta("og:title", meta.title);
  setPropertyMeta("og:description", meta.description);
  setPropertyMeta("og:type", "website");
  setPropertyMeta("og:url", url);

  setMeta("twitter:card", "summary");
  setMeta("twitter:title", meta.title);
  setMeta("twitter:description", meta.description);
}

export { META_BY_PAGE };
