# Images and fonts

What the web app ships and fetches as images and fonts, and why it stays this small. Audited for the performance epic
(images and fonts audit).

## Inventory

Measured on `bunx nx run web:build:production`.

| What                         | Where                                          | Before | After | Notes                                                        |
| ---------------------------- | ---------------------------------------------- | ------ | ----- | ------------------------------------------------------------ |
| Blood-splatter mask          | `libs/frontier/src/styles/blood-splatter.webp` | 36 KB  | 11 KB | CSS mask: only the alpha channel is read, so only it is kept |
| Portraits, content art, icon | none                                           | -      | -     | Nothing is stored or shipped yet (see below)                 |
| Font files                   | none shipped                                   | -      | -     | All faces come from Google Fonts or jsDelivr (see below)     |

The built app has no other image, and no font file, in `dist/apps/web/browser`.

## Images

- **Portraits do not exist yet.** No character or campaign document has a portrait field, and `fr-avatar` and
  `fr-character-avatar` are never given a `src` outside stories. Resized storage and list thumbnails belong to the story
  that adds portrait upload; until then there is nothing to resize. Whoever adds it should store a bounded size (for
  example 512 px on the long side, WebP) and a small thumbnail for lists, and not inline base64 in the document.
- **`NgOptimizedImage` is not used by `fr-image`**, on purpose: it throws on `data:` and `blob:` URLs (inlined logos,
  upload previews) and there is no image CDN loader for it to target. `fr-image` already sets `decoding="async"`,
  lazy loading unless `eager`, and a token-sized frame (`aspect-*`, `w-image-*`) that holds the space, so a late image
  cannot shift the layout.
- **The splatter mask is WebP.** The mask reads only alpha, so the colour channels are zeroed and the alpha is kept
  lossless: the mask is pixel-identical to the PNG it replaces. `tools/check-built-css.ts` checks the built CSS points at
  the bundled file.

## Fonts

- Faces load from Google Fonts (`display=swap`, split by `unicode-range` so only the pieces the text uses download) and
  OpenDyslexic from jsDelivr. `FontStylesheets` adds the stylesheet for the chosen faces after boot. The wordmark face
  asks for the letters of "Pioneer" only.
- `index.html` preconnects to `fonts.googleapis.com` and `fonts.gstatic.com`, so the connections are open when
  `FontStylesheets` runs, not started then.
- Every font stack ends in a generic family, so text shows at once in the fallback and swaps when the face arrives.
- Not done: self-hosting and subsetting, and preloading the default face. Google's file URLs are hashed and change, so a
  preload cannot name them; self-hosting would trade that for a font build step and its own cache. Revisit it if the
  request-budget check shows the font requests on the critical path.

## Lighthouse

Before and after LCP and CLS for the list and the sheet are recorded by the request-budget check, not here, so they
come from one setup and stay comparable.
