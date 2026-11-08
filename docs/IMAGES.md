# Images and media

This document describes how PawCompanion handles merchant photos and how the demo image set is sourced.

## Merchant upload pipeline

1. The partner picks a file in the listing form. The browser accepts `image/jpeg` and `image/png` up to 5 MiB.
2. The API accepts one file into memory (`multer`, 5 MiB limit) and checks the MIME type.
3. `sharp` decodes the actual bytes and rejects anything that is not a single-frame JPEG or PNG, or larger than 16 megapixels.
4. The image is auto-rotated, resized to fit within 2048×2048 without enlargement, and **re-encoded as JPEG at quality 85**. Original bytes, EXIF/GPS metadata, filenames and extensions are never served.
5. It is stored as `<merchantId>-<uuid>.jpeg`; the merchant can delete only files matching their own owner prefix.
6. `/uploads/*` serves only that filename shape, with `image/jpeg`, `default-src 'none'; sandbox` CSP, and immutable caching.

Relevant code: [secureImage.js](../backend/src/services/secureImage.js), [merchant.router.js](../backend/src/routers/merchant.router.js), [MerchantListingFormPage.jsx](../frontend/src/pages/Merchant/MerchantListingFormPage.jsx).

## Current limits

| Concern | Current behaviour |
| --- | --- |
| Accepted input | JPEG, PNG |
| Max upload | 5 MiB |
| Max decoded pixels | 16 MP |
| Output | One JPEG, max 2048 px, quality 85 |
| Metadata | Stripped by re-encode |
| Animated images | Rejected |
| Filenames | Randomized, owner-prefixed |
| Deletion | Owner only |
| Storage | Local `UPLOAD_DIR` volume |
| Content moderation | Not automated; UI asks for a real photo, no people, no stock images |

## Gaps before a production launch

- No WebP or HEIC input; iPhone uploads may need conversion by the browser.
- No minimum dimensions or aspect-ratio guidance, so a very small or very tall image can still be accepted.
- One 2048 px output only; no 640/1280 responsive variants or `srcset`.
- No automated image content moderation or alt-text field.
- Local uploads assume one instance or a shared volume; object storage and signed URLs are the production path.

These are tracked product/engineering work, not claims that the current upload is complete.

## Demo image policy

The seed images currently in `frontend/public/animals` were inherited from the early demo. They are visually useful, but:

- they total about **20 MB** and many are 5K–7K pixels wide;
- they have no embedded source/license metadata;
- they should not be presented as licensed production assets.

For a public portfolio or commercial launch:

1. Use images with a clear license: [Pexels](https://www.pexels.com/license/), [Unsplash](https://unsplash.com/license), or [Openverse](https://openverse.org/) with an explicit CC license.
2. Record the photographer, source URL and license in `docs/IMAGE_CREDITS.md`.
3. Export at about 1600 px on the long edge, JPEG/WebP quality ~82; keep the repository under a few MB for the demo.
4. Avoid research datasets (e.g. Oxford-IIIT Pet) for consumer marketing unless the dataset license explicitly allows it.
5. Do not scrape shelter websites, Google Images or social media.

Using the current images as a temporary local demo is fine. Using them as the public, long-lived visual identity is not recommended until their provenance is documented or they are replaced.
