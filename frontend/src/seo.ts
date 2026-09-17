export const SITE_URL = "https://numisgallery.com";
export const SITE_NAME = "NumisGallery";
export const DEFAULT_TITLE = "NumisGallery — Catalog Your Banknote Collection";
export const DEFAULT_DESCRIPTION =
  "Free web app for paper money collectors. Catalog PMG-certified banknotes, auto-fill details with AI, and share a public gallery of world and US notes.";
export const OG_IMAGE_PATH = "/og-image.png";
export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;

export type SeoMeta = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
};

export const faqs = [
  {
    question: "What is NumisGallery?",
    answer:
      "NumisGallery is a free web app for cataloging, organizing, and showcasing banknote collections. Collectors and dealers use it to store PMG-certified notes, world paper money, and US currency in a shareable digital gallery.",
  },
  {
    question: "Can I catalog PMG-certified banknotes?",
    answer:
      "Yes. Enter a PMG certification number and grade to fetch high-resolution obverse and reverse images plus certification details, then save the note to your collection.",
  },
  {
    question: "Does NumisGallery work for world banknotes and US currency?",
    answer:
      "Yes. World notes can be cataloged with Pick numbers, country, and denomination. US notes support Friedberg numbers, issuing authority, and Federal Reserve district details.",
  },
  {
    question: "Is NumisGallery free?",
    answer:
      "The free plan includes up to 50 banknotes, PMG image fetching, AI data extraction, and CSV export. Pro unlocks unlimited notes, more monthly fetches, extra storage, and PDF export.",
  },
  {
    question: "Can I share my banknote collection online?",
    answer:
      "Yes. Mark notes as public and share a gallery link so other collectors can browse your paper money collection without needing an account.",
  },
] as const;

export const routeSeo: Record<string, SeoMeta> = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
  },
  "/community": {
    title: "Community Banknote Gallery | NumisGallery",
    description:
      "Browse public banknote collections from collectors worldwide. Explore PMG-certified paper money, world notes, and US currency on NumisGallery.",
    path: "/community",
  },
  "/pricing": {
    title: "Pricing | NumisGallery Banknote Catalog",
    description:
      "Start free with up to 50 banknotes, or go Pro for unlimited cataloging, extra PMG image fetches, AI extraction, and PDF export.",
    path: "/pricing",
  },
  "/login": {
    title: "Sign In | NumisGallery",
    description:
      "Sign in or create a free NumisGallery account to catalog your banknote collection, fetch PMG images, and share a public gallery.",
    path: "/login",
  },
  "/terms-and-conditions": {
    title: "Terms and Conditions | NumisGallery",
    description:
      "Terms and conditions for using NumisGallery, the banknote collection catalog operated by Happy Haiku LLC.",
    path: "/terms-and-conditions",
  },
  "/privacy-policy": {
    title: "Privacy Policy | NumisGallery",
    description:
      "How NumisGallery collects, uses, and protects account and banknote collection data. Operated by Happy Haiku LLC.",
    path: "/privacy-policy",
  },
  "/your-banknotes": {
    title: "Your Banknote Collection | NumisGallery",
    description: "Manage your private NumisGallery banknote collection.",
    path: "/your-banknotes",
    noindex: true,
  },
  "/settings": {
    title: "Settings | NumisGallery",
    description: "Manage your NumisGallery account settings.",
    path: "/settings",
    noindex: true,
  },
  "/subscription": {
    title: "Subscription | NumisGallery",
    description: "Manage your NumisGallery subscription.",
    path: "/subscription",
    noindex: true,
  },
};

export function getRouteSeo(pathname: string): SeoMeta {
  if (pathname.startsWith("/users/")) {
    return {
      title: "Public Banknote Collection | NumisGallery",
      description:
        "Browse a public banknote collection on NumisGallery, a digital catalog for paper money collectors.",
      path: pathname,
    };
  }

  return (
    routeSeo[pathname] ?? {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      path: pathname,
    }
  );
}

export function canonicalUrl(pathname: string): string {
  if (pathname === "/") {
    return `${SITE_URL}/`;
  }
  return `${SITE_URL}${pathname}`;
}

export function jsonLdGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        legalName: "Happy Haiku LLC",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/apple-touch-icon.png`,
        },
        sameAs: ["https://discord.gg/mfcar4wYuC"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        description: DEFAULT_DESCRIPTION,
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "0",
          highPrice: "4.99",
          priceCurrency: "USD",
          offerCount: 2,
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}

export function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
