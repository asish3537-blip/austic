# Homemade Foods product photos

Mothers can add, replace or remove a photo in the existing product editor. JPG,
PNG and WebP inputs up to 5 MB are resized locally to at most 640 pixels, then
validated as bounded PNGs on the server. Saving a product and its photo is atomic.
Omitting the image keeps the existing photo; explicit null removes it. Existing
ownership checks, optimistic edit checks and listing rules still apply.

Customers, Mothers and administrators see photo cards. Missing photos have an
explicit placeholder; failed requests offer retry. Customer images are served
only to active authenticated users for currently published products in their
saved city. Mothers can view their own drafts; administrators can review all.
Photo responses are private and uncached. The catalog contains a boolean, not
image bytes. Existing Meal.imageUrl storage is reused without a schema migration.

This release changes the web app. The native Android product editor has not
received a new photo picker. No invented product image is attached to a seller's
listing. Mothers must supply their actual product or packaging photo.

Validation: four focused automated checks cover PNG bounds and sanitization,
invalid formats, preserve/remove semantics, role/ownership/city visibility,
private image URLs, missing-photo cards and file-picker controls. Authenticated
production upload and customer-view checks require the corresponding accounts
in the ChatGPT browser; they must not be reported as passed until observed.
