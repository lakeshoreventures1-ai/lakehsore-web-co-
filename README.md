# CND Digital

Marketing website for CND Digital, a web design & development studio.

Static site — plain HTML, CSS, and JS, no build step or dependencies.

Note: the repo, GitHub Pages URL, email address, and Calendly link still use
the original "lakeshore" naming — those are technical identifiers tied to
existing accounts and weren't renamed along with the public brand (CND
Digital). Nothing customer-facing shows "Lakeshore" anywhere.

## Structure

- `index.html` — all page content and sections
- `css/style.css` — styles
- `js/script.js` — mobile nav toggle, back-to-top button, contact form handling

## Running locally

Serve the folder with any static file server, e.g.:

```
python3 -m http.server 8080
```

Then open http://localhost:8080

## Notes

The contact form submits to [Web3Forms](https://web3forms.com), which emails
submissions to `lakeshoreventures1@gmail.com` using an access key embedded in
the form (no backend required). No activation step needed — it works
immediately, unlike the previous FormSubmit.co integration (switched away
from in November 2026 after a multi-day FormSubmit outage silently dropped
submissions).

If the access key ever needs to be rotated, generate a new one at
web3forms.com with the same email and swap the `value` on the form's
`access_key` hidden input in `index.html`.

## Custom domain

The site's primary domain is **cnddigital.org** (set via the `CNAME` file in
the repo root). Once DNS has propagated and GitHub's "DNS check successful"
shows in Settings → Pages, the old `lakeshoreventures1-ai.github.io/...` URL
automatically redirects here — no links break.

DNS records needed at the registrar:

| Type  | Host/Name | Value                              |
|-------|-----------|-------------------------------------|
| A     | @         | 185.199.108.153                     |
| A     | @         | 185.199.109.153                     |
| A     | @         | 185.199.110.153                     |
| A     | @         | 185.199.111.153                     |
| CNAME | www       | lakeshoreventures1-ai.github.io.    |

DNS changes can take a few minutes to ~24 hours to propagate; GitHub then
auto-issues an HTTPS certificate.

## SEO

- `robots.txt` and `sitemap.xml` help search engines crawl and index the site.
- `index.html` includes a canonical URL and `ProfessionalService` structured
  data (JSON-LD) so Google can show richer results (phone, service area, etc.).
- All three point at `https://cnddigital.org/` — update them if the domain
  ever changes again.
