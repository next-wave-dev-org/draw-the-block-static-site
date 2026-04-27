# Shopify Integration

How `/shop` pulls products from the client's Shopify store, how to provision credentials, and how to handle the integration when things go wrong.

The integration is intentionally minimal — read-only product display, click-out to Shopify-hosted product pages, no cart, no detail pages on this site. If scope grows beyond that, this doc and the underlying code need a real rethink.

---

## Architecture at a glance

```
src/lib/shopify.ts        ← data layer (fetch + mocks + helpers)
src/components/ProductCard.astro  ← presentation
src/pages/shop.astro      ← page that maps products to cards
.env                      ← credentials (gitignored)
```

The data flow is simple: `shop.astro` calls `getProducts()` from `shopify.ts` at build time. `getProducts()` either fetches from the Shopify Storefront API (if env vars are set) or returns a hardcoded mock list. Either way, the page receives a `Product[]` and maps it to a grid of `ProductCard` components.

Build time matters. Products are baked into the static HTML on each deploy. The site does not call Shopify at runtime. This means stale data is possible — see the *Webhooks for auto-rebuild* section below.

---

## Environment variables

The integration reads three env vars from `.env` at the repo root:

| Variable                   | Required | Description                                                                |
| :------------------------- | :------- | :------------------------------------------------------------------------- |
| `SHOPIFY_STORE_DOMAIN`     | If using real data | The store's `*.myshopify.com` domain. No protocol, no trailing slash. |
| `SHOPIFY_STOREFRONT_TOKEN` | If using real data | Public Storefront API access token. See *Acquiring credentials* below. |
| `SHOPIFY_USE_MOCKS`        | No       | Set to `"true"` to force mock data even when the above are present. Useful for visual debugging or working offline. |

When either of the first two is missing, `getProducts()` returns mock data. This is **by design**, not a bug:

- Lets new developers run the site locally without needing client credentials
- Lets preview deployments render something useful when env vars aren't configured
- Lets you visually debug the rendering pipeline by setting `SHOPIFY_USE_MOCKS=true` to isolate the API from the UI

If `/shop` shows mock products in production, the env vars aren't reaching the build environment. Check your deploy host's environment configuration.

---

## Acquiring credentials

Three paths, in order of how painful they are. Try them in order.

### Path A — Custom distribution from your Partner Dev Dashboard *(recommended)*

This is the modern Partner-friendly flow. You create a custom app in your own Partner organization's Dev Dashboard, then send the client an install link they click once to mount it on their store.

Steps from your Dev Dashboard (`dev.shopify.com/dashboard`):

1. Click **Create app**, name it something like `DTB Site Storefront`.
2. Under **Configuration** → **Storefront API integration**, configure scopes. Required: `unauthenticated_read_product_listings`.
3. Release a version. App URL can be the default `https://shopify.dev/apps/default-app-home` for backend-only integrations.
4. Go to **Distribution** → **Select distribution method** → **Custom distribution**.
5. Enter the client's store domain (e.g., `draw-the-block.myshopify.com`). Shopify generates an install link unique to that store.
6. Send the install link to the client with instructions to click it while logged in as the store owner.
7. Once installed, the Storefront access token appears in the app's API credentials view in your Dev Dashboard.

This works cleanly when it works. Sometimes it doesn't — e.g., if the client's store plan or permissions block installation, or if the Dev Dashboard doesn't surface the Storefront token after install.

### Path B — Headless sales channel

The official Shopify-hosted way to mint Storefront tokens. The client installs the Headless channel from the Shopify App Store, creates a "storefront" in it, and copies the token to you.

Two requirements for this path:

- Client has the **Apps and channels** permission (most store owners do by default).
- The store is on a plan that supports Headless. Some plan tiers don't.

If the client's plan blocks the Headless channel, you'll see a "This app isn't compatible with your store" message in the App Store. In that case, fall back to Path A or C.

### Path C — Postman OAuth dance + storefrontAccessTokenCreate mutation *(last resort)*

Use this when Paths A and B don't work — typically because the client's plan tier rules out the Headless channel and the Custom distribution flow has hit a Dev Dashboard surface bug. We've actually shipped this project on this path; it's annoying but reliable.

The high-level flow:
1. Get an Admin API token via OAuth (using the custom app you created)
2. Use that Admin token to mint a separate Storefront access token via a GraphQL mutation
3. Use the Storefront token going forward; throw the Admin token away

**Step 1 — Create the custom app in Dev Dashboard** (same as Path A steps 1–3 above). After releasing, note your app's `client_id` and `client_secret` from the API credentials view.

**Step 2 — Get an authorization code via browser.**

Visit this URL in your browser (replace `client_id` and the store domain):

```
https://draw-the-block.myshopify.com/admin/oauth/authorize?client_id=<your_client_id>
```

You'll be redirected to a Shopify install page, then to a return URL containing a `code` parameter. Copy that code value.

**Step 3 — Exchange the code for an Admin API token via Postman.**

If you've never used Postman: it's a free desktop app for making HTTP requests with a UI. Download from `postman.com/downloads`. To make a request, click **+ New** for a new tab, set the method dropdown (left of the URL bar), enter the URL, configure Headers and Body via the tabs below the URL bar, then click **Send**. The response appears in the lower panel.

Postman setup for this request:

- **Method:** `POST`
- **URL:** `https://draw-the-block.myshopify.com/admin/oauth/access_token`
- **Headers tab:**
  ```
  Content-Type: application/json
  ```
- **Body tab:** Select **raw** and choose **JSON** from the dropdown on the right. Paste:
  ```json
  {
    "client_id": "<your app's client_id>",
    "client_secret": "<your app's client_secret>",
    "code": "<the authorization code from step 2>"
  }
  ```

Click Send. Successful response:

```json
{
  "access_token": "shpat_xxxxxxxxxxxx",
  "scope": "unauthenticated_read_product_listings"
}
```

The `access_token` is an **Admin API token** despite the scope being a Storefront scope. This is the source of confusion in this flow — we're not done yet.

**Step 4 — Mint a Storefront token using the Admin token.**

Now run a GraphQL mutation against the Admin API to create a Storefront access token. Same Postman conventions as Step 3:

- **Method:** `POST`
- **URL:** `https://draw-the-block.myshopify.com/admin/api/2024-10/graphql.json`
- **Headers tab:**
  ```
  Content-Type: application/json
  X-Shopify-Access-Token: <admin token from step 3>
  ```
- **Body tab:** Select **raw** and choose **JSON** from the dropdown on the right. Paste:
  ```json
  {
    "query": "mutation { storefrontAccessTokenCreate(input: { title: \"DTB Site Storefront\" }) { storefrontAccessToken { accessToken title } userErrors { field message } } }"
  }
  ```

Click Send. Successful response:
```json
{
  "data": {
    "storefrontAccessTokenCreate": {
      "storefrontAccessToken": {
        "accessToken": "abc123def456...",
        "title": "DTB Site Storefront"
      },
      "userErrors": []
    }
  }
}
```

The `accessToken` value is your **Storefront API token**. This is what goes in `.env` as `SHOPIFY_STOREFRONT_TOKEN`.

**Step 5 — Verify before celebrating.**

Sanity-check the token actually works against the Storefront endpoint:

```bash
curl -X POST \
  https://draw-the-block.myshopify.com/api/2024-10/graphql.json \
  -H "X-Shopify-Storefront-Access-Token: <storefront token>" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ shop { name } products(first: 3) { edges { node { title } } } }"}'
```

If you get back the shop name and a list of products, you're done. If you get a 401, the token isn't authorized — likely a scope issue or the app didn't install correctly.

---

## How the data layer works

`src/lib/shopify.ts` exports a small surface:

```ts
interface Product { /* id, handle, title, url, image, price, availableForSale */ }
function getProducts(): Promise<Product[]>
function formatPrice(amount: number, currency: string): string
function sizedImageUrl(url: string, width: number): string
```

### Mock fallback

`getMockProducts()` returns six hand-curated mock products with deliberate variety: short and long titles, a mix of in-stock and sold-out, varied prices, varied image aspect ratios. Keep it. The mock data isn't test scaffolding — it's a fallback for any environment that doesn't have credentials. Removing it would make the dev experience noticeably worse for anyone cloning the repo fresh.

### GraphQL query

The query asks for the first 100 products sorted by `CREATED_AT` with `reverse: true` (newest first). Originally this used `MANUAL` sort, but `MANUAL` is only valid for products *within a collection*, not for top-level product queries — Shopify's Storefront API rejects it. We chose `CREATED_AT` desc as the sensible default for a small store with no manual ordering needs.

If editorial control becomes important, the path forward is to switch from querying top-level products to querying a specific collection's products. Collections support `MANUAL` sort because the client explicitly orders products inside the collection in the admin UI.

### Error handling

The fetch is wrapped at three levels:

1. **Network failure** (`try/catch` around `fetch`) → log, return empty array.
2. **Non-2xx HTTP response** → log status, return empty array.
3. **GraphQL errors in response body** → log, return empty array.

In all error cases, `/shop` falls back to the empty state ("Shop is currently being updated"). The build never fails. This is deliberate — a transient API hiccup or expired token shouldn't take the whole site down.

When debugging, watch the dev server terminal for `[shopify]` prefixed messages. Those are the only logs the data layer emits.

### Image sizing

Shopify CDN supports a `?width=N` query parameter that returns a server-side resized image. `sizedImageUrl(url, 600)` appends this. ProductCard uses 600px (covers retina at 300px display) instead of loading whatever original size the client uploaded. Saves significant bandwidth on every shop view.

### Price formatting

`formatPrice(25, "USD")` returns `"$25"`. `formatPrice(25.50, "USD")` returns `"$25.50"`. Built on `Intl.NumberFormat` with `en-US` locale hardcoded. If the client expands beyond US currency, thread locale through as a parameter — don't try to guess from the user's browser, that introduces inconsistency between SSR and runtime.

### Product detail URLs

The `Product.url` field prefers Shopify's `onlineStoreUrl` (which respects custom vanity domains if the client sets one up) and falls back to constructing `https://{domain}/products/{handle}`. Both work; the fallback only matters if `onlineStoreUrl` is null, which happens when a product isn't published to the Online Store sales channel.

---

## Webhooks for auto-rebuild

Without webhooks, product changes only appear on the live site after a manual deploy. With webhooks, Shopify pings your deploy host whenever products change, triggering a fresh build automatically.

Setup:

1. Get a build hook URL from your deploy provider (Netlify: Site settings → Build & deploy → Build hooks; Vercel: Settings → Git → Deploy hooks; Cloudflare Pages: similar).
2. In the client's Shopify Admin: Settings → Notifications → Webhooks.
3. Create webhooks for these events, all pointing at the build hook URL, all in JSON format:
    - `Product creation`
    - `Product update`
    - `Product deletion`
    - `Inventory level update`
4. Test by editing a product in the admin and confirming a build kicks off within ~60 seconds.

Webhook setup requires `Manage settings` permission on the client's store — collaborator or staff role with that scope is enough.

---

## Credential rotation

The Storefront access token is treated as a "public" credential by Shopify (it's scoped to read-only data and is meant to be embeddable in client-side apps), but for our build-time usage we still treat it like a secret — kept in `.env`, never committed, rotated when there's any reason to suspect exposure.

### When to rotate

- Token was accidentally committed to git history
- Token was pasted into a chat / ticket / email / shared screen
- A developer with access to `.env` left the team
- You're handing the project off to another agency
- It's been a year and you haven't rotated, just on principle

### How to rotate (token created via Path A or B)

If the token came from a Custom distribution app or the Headless channel, regeneration is a UI action:

1. Open the app or storefront in the Dev Dashboard or Shopify admin.
2. Find the token's settings page.
3. Click "Rotate" or "Regenerate token". Old token is invalidated immediately.
4. Copy the new token to `.env` locally.
5. Update the env var in your deploy host's environment configuration.
6. Trigger a redeploy.

### How to rotate (token created via Path C — Postman dance)

Storefront tokens minted via the Admin API mutation are managed via the same Admin API. Two requests using the same Postman setup as Path C step 4 (POST to `https://draw-the-block.myshopify.com/admin/api/2024-10/graphql.json` with `Content-Type: application/json` and `X-Shopify-Access-Token: <admin token>` headers, raw JSON body).

**Step 1 — List existing tokens to find the one to delete.**

Body:
```json
{
  "query": "{ shop { storefrontAccessTokens(first: 10) { edges { node { id title accessToken } } } } }"
}
```

The response includes each token with its `id` (a `gid://shopify/StorefrontAccessToken/...` string). Find the entry whose `accessToken` matches the one you're rotating, copy its `id`.

**Step 2 — Delete the compromised token.**

Body (replace the id with what you copied):
```json
{
  "query": "mutation { storefrontAccessTokenDelete(input: { id: \"gid://shopify/StorefrontAccessToken/123456\" }) { deletedStorefrontAccessTokenId userErrors { field message } } }"
}
```

If `userErrors` is empty and `deletedStorefrontAccessTokenId` matches what you sent, the old token is dead immediately. Any request using it will now 401.

**Step 3 — Mint a replacement.**

Run the `storefrontAccessTokenCreate` mutation from Path C step 4 again to create a fresh token. Drop the new token in `.env`, update your deploy host's env vars, redeploy.

> Note: if the original Admin API token from Path C was *also* compromised (e.g., both were in the same leaked file), rotate that one separately by uninstalling and reinstalling the custom app on the store. The Admin token is one-per-install.

### Both paths — after rotation

1. Verify the old token is dead by curl-ing the Storefront API with it. Should 401.
2. Verify the new token works the same way. Should return data.
3. Confirm the live site rebuilds and shows products correctly.
4. Audit `.env` files on every machine that had the old token; replace with the new one or delete entirely.

---

## What's deliberately not in scope

If anyone asks "can we add X to the shop?", consult this list:

| Feature                     | Status |
| :-------------------------- | :----- |
| Cart UI / cart icon         | Out — checkout happens on Shopify |
| Product detail pages on this site | Out — clicks open Shopify-hosted pages |
| Filtering / sorting UI      | Out — order is build-time, sort is hardcoded |
| Variant pickers (size, color) | Out — handled on Shopify product page |
| Real-time inventory display | Out — refreshed on each build / webhook trigger |
| Customer accounts           | Out — Shopify owns the customer relationship |
| Discount code application   | Out — Shopify owns checkout |
| Wishlists                   | Out |

Adding any of these crosses the line from "headless catalog display" into "actual ecommerce frontend" and is a real engineering project, not a small change. Push back on scope creep here.

---

## Troubleshooting

**Mock data appears when real data should:**
Either env vars aren't set, `SHOPIFY_USE_MOCKS=true` is in `.env`, or the dev server hasn't been restarted since the env vars were added. Restart with Ctrl+C and `npm run dev`.

**`HTTP 401 from Storefront API`:**
Token is wrong, expired, or for a different store. Most common cause: pasted the Admin API token instead of the Storefront token. Run the curl verify step from Path C step 5 to confirm.

**`GraphQL errors: Argument 'sortKey' on Field 'products' has an invalid value`:**
Someone changed the sortKey to a value that's not in the `ProductSortKeys` enum. Valid values: `TITLE`, `PRICE`, `BEST_SELLING`, `CREATED_AT`, `ID`, `PRODUCT_TYPE`, `RELEVANCE`, `UPDATED_AT`, `VENDOR`. `MANUAL` only works for products inside a collection.

**Empty page or "Shop is currently being updated" when products exist in admin:**
Products may not be published to the Online Store sales channel. Open a product in admin, check the Sales channels section, ensure "Online Store" is checked. The Storefront API only sees products published to that channel.

**Cards link to the wrong domain:**
The `onlineStoreUrl` field returned by the API reflects the customer-facing URL. If the client has set up a vanity domain, it'll be that. If not, it falls back to `*.myshopify.com`. Either is fine — it just affects which URL clicks land on.

**Sold-out badge missing on out-of-stock products:**
The `availableForSale` field is true if *any* variant has stock. A product with 5 variants where 1 is in stock and 4 are sold out reads as available. Usually correct behavior; flag if it isn't.

**Build fails after a previously-working setup:**
Check whether the API version in `shopify.ts` (currently `2024-10`) has been deprecated by Shopify. They version their API quarterly; old versions sunset after about a year. Bump to the current quarterly version and re-test.