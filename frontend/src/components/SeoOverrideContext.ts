import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { SeoMeta } from "../seo";

export const SeoOverrideContext = createContext<
  Dispatch<SetStateAction<Partial<SeoMeta> | null>>
>(() => {});

export function useSeoOverride() {
  return useContext(SeoOverrideContext);
}
