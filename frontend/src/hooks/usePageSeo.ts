import { useEffect } from "react";
import { useSeoOverride } from "../components/SeoOverrideContext";
import type { SeoMeta } from "../seo";

export function usePageSeo(meta: Partial<SeoMeta>) {
  const setOverride = useSeoOverride();
  const { title, description, path, noindex } = meta;

  useEffect(() => {
    setOverride({ title, description, path, noindex });
    return () => setOverride(null);
  }, [title, description, path, noindex, setOverride]);
}
