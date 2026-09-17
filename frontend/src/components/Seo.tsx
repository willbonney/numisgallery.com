import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  canonicalUrl,
  faqJsonLd,
  getRouteSeo,
  jsonLdGraph,
  OG_IMAGE_URL,
  SITE_NAME,
  type SeoMeta,
} from "../seo";
import { SeoOverrideContext } from "./SeoOverrideContext";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${CSS.escape(key)}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(
    `link[rel="${CSS.escape(rel)}"]`
  ) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(id: string, data: unknown | null) {
  const existing = document.getElementById(id);
  if (!data) {
    existing?.remove();
    return;
  }
  let el = existing as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function Seo({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [override, setOverride] = useState<Partial<SeoMeta> | null>(null);
  const route = getRouteSeo(pathname);
  const title = override?.title ?? route.title;
  const description = override?.description ?? route.description;
  const noindex = override?.noindex ?? route.noindex ?? false;
  const canonical = canonicalUrl(override?.path ?? route.path);
  const robots = noindex ? "noindex, nofollow" : "index, follow";

  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertMeta("name", "googlebot", robots);
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "en_US");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", OG_IMAGE_URL);
    upsertMeta("property", "og:image:alt", title);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", OG_IMAGE_URL);

    upsertJsonLd("numisgallery-ld-json", jsonLdGraph());
    upsertJsonLd(
      "numisgallery-faq-json",
      pathname === "/" ? faqJsonLd() : null
    );
  }, [title, description, robots, canonical, pathname]);

  return (
    <SeoOverrideContext.Provider value={setOverride}>
      {children}
    </SeoOverrideContext.Provider>
  );
}
