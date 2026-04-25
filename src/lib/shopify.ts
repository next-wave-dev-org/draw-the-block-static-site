// src/lib/shopify.ts
//
// Build-time Shopify Storefront API client.
//
// Reads from real Shopify when env vars are set:
//   SHOPIFY_STORE_DOMAIN  (e.g. drawtheblock.myshopify.com)
//   SHOPIFY_STOREFRONT_TOKEN  (public Storefront API access token)
//
// When either is missing, returns mock data so we can develop against
// the design without a real store. Force-mock by setting:
//   SHOPIFY_USE_MOCKS=true
//
// This file is imported by /shop at build time. It must not be called
// from the client — the API token is meant to be public-facing (it's
// scoped to read-only Storefront access), but baking it into HTML is
// pointless when the data is already prerendered.

const STOREFRONT_API_VERSION = "2024-10";

export interface Product {
    id: string;
    handle: string;
    title: string;
    url: string; // External Shopify product page URL
    image: {
        src: string;
        alt: string;
    } | null;
    price: {
        amount: number;
        currency: string;
    };
    availableForSale: boolean;
}

/**
 * Format a price for display.
 *
 * Returns "$25" if no cents, "$25.50" otherwise. Uses Intl.NumberFormat
 * with USD/en-US for now — when the client expands beyond US currency,
 * we'll thread locale/currency through.
 */
export function formatPrice(amount: number, currency: string): string {
    const hasCents = amount % 1 !== 0;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Append a width transform to a Shopify CDN image URL.
 * Shopify CDN responds to ?width=N by serving an appropriately resized
 * image. Saves transferring full-size originals for card thumbnails.
 */
export function sizedImageUrl(url: string, width: number): string {
    if (!url) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}width=${width}`;
}

/**
 * Fetch products from Shopify or return mock data.
 * Always sorted by MANUAL (whatever order the client arranged in admin).
 */
export async function getProducts(): Promise<Product[]> {
    const domain = import.meta.env.SHOPIFY_STORE_DOMAIN;
    const token = import.meta.env.SHOPIFY_STOREFRONT_TOKEN;
    const useMocks = import.meta.env.SHOPIFY_USE_MOCKS === "true";

    if (useMocks || !domain || !token) {
        return getMockProducts();
    }

    return fetchFromShopify(domain, token);
}

// ─────────────────────────────────────────────────────────────────────
//  Real Shopify fetch
// ─────────────────────────────────────────────────────────────────────

const PRODUCTS_QUERY = `
  query Products($first: Int!) {
    products(first: $first, sortKey: MANUAL) {
      edges {
        node {
          id
          handle
          title
          onlineStoreUrl
          availableForSale
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

interface ShopifyEdge {
    node: {
        id: string;
        handle: string;
        title: string;
        onlineStoreUrl: string | null;
        availableForSale: boolean;
        featuredImage: { url: string; altText: string | null } | null;
        priceRange: {
            minVariantPrice: { amount: string; currencyCode: string };
        };
    };
}

async function fetchFromShopify(domain: string, token: string): Promise<Product[]> {
    const endpoint = `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`;

    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Storefront-Access-Token": token,
            },
            body: JSON.stringify({
                query: PRODUCTS_QUERY,
                variables: { first: 100 }, // small catalog cap; raise if needed
            }),
        });
    } catch (err) {
        // Network failure: build should not blow up. Empty list → empty state.
        console.error("[shopify] fetch failed:", err);
        return [];
    }

    if (!response.ok) {
        console.error(`[shopify] HTTP ${response.status} from Storefront API`);
        return [];
    }

    const json = (await response.json()) as {
        data?: { products?: { edges: ShopifyEdge[] } };
        errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
        console.error("[shopify] GraphQL errors:", json.errors);
        return [];
    }

    const edges = json.data?.products?.edges ?? [];

    return edges.map((edge): Product => {
        const n = edge.node;
        const priceAmount = parseFloat(n.priceRange.minVariantPrice.amount);

        return {
            id: n.id,
            handle: n.handle,
            title: n.title,
            // Prefer onlineStoreUrl when set; fall back to constructing a /products/<handle> URL.
            url: n.onlineStoreUrl ?? `https://${domain}/products/${n.handle}`,
            image: n.featuredImage
                ? {
                    src: n.featuredImage.url,
                    alt: n.featuredImage.altText ?? n.title,
                }
                : null,
            price: {
                amount: isNaN(priceAmount) ? 0 : priceAmount,
                currency: n.priceRange.minVariantPrice.currencyCode,
            },
            availableForSale: n.availableForSale,
        };
    });
}

// ─────────────────────────────────────────────────────────────────────
//  Mock data
// ─────────────────────────────────────────────────────────────────────

function getMockProducts(): Product[] {
    // Six products with intentional variety: short and long titles, mix of
    // in-stock and sold-out, range of prices, varied image aspect ratios.
    // Images use Unsplash for placeholder visuals during development.
    return [
        {
            id: "mock-1",
            handle: "dtb-classic-tee",
            title: "DTB CLASSIC TEE",
            url: "https://example.myshopify.com/products/dtb-classic-tee",
            image: {
                src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",
                alt: "Black t-shirt with yellow logo",
            },
            price: { amount: 35, currency: "USD" },
            availableForSale: true,
        },
        {
            id: "mock-2",
            handle: "art-market-poster",
            title: "ART MARKET POSTER (DAY 1 / DAY 2 SET)",
            url: "https://example.myshopify.com/products/art-market-poster",
            image: {
                src: "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=600",
                alt: "Abstract poster art",
            },
            price: { amount: 18, currency: "USD" },
            availableForSale: true,
        },
        {
            id: "mock-3",
            handle: "block-hoodie-purple",
            title: "BLOCK HOODIE — PURPLE",
            url: "https://example.myshopify.com/products/block-hoodie-purple",
            image: {
                src: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600",
                alt: "Purple hoodie",
            },
            price: { amount: 65, currency: "USD" },
            availableForSale: false,
        },
        {
            id: "mock-4",
            handle: "manga-zine-vol-1",
            title: "MANGA ZINE VOL. 1",
            url: "https://example.myshopify.com/products/manga-zine-vol-1",
            image: {
                src: "https://images.unsplash.com/photo-1612178537253-bccd437b730e?w=600",
                alt: "Zine cover",
            },
            price: { amount: 12.5, currency: "USD" },
            availableForSale: true,
        },
        {
            id: "mock-5",
            handle: "dtb-sticker-pack",
            title: "STICKER PACK",
            url: "https://example.myshopify.com/products/dtb-sticker-pack",
            image: {
                src: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=600",
                alt: "Sticker pack",
            },
            price: { amount: 8, currency: "USD" },
            availableForSale: true,
        },
        {
            id: "mock-6",
            handle: "limited-tote",
            title: "LIMITED EDITION TOTE",
            url: "https://example.myshopify.com/products/limited-tote",
            image: {
                src: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600",
                alt: "Canvas tote bag",
            },
            price: { amount: 22, currency: "USD" },
            availableForSale: false,
        },
    ];
}