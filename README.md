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

There's no custom domain yet — the site lives at
`https://lakeshoreventures1-ai.github.io/lakehsore-web-co-/`. If a domain is
purchased later (e.g. `cnddigital.com`), add a `CNAME` file to the repo
root containing just the domain, add these DNS records at the registrar:

| Type  | Host/Name | Value                              |
|-------|-----------|-------------------------------------|
| A     | @         | 185.199.108.153                     |
| A     | @         | 185.199.109.153                     |
| A     | @         | 185.199.110.153                     |
| A     | @         | 185.199.111.153                     |
| CNAME | www       | lakeshoreventures1-ai.github.io.    |

and update the URLs in `robots.txt`, `sitemap.xml`, and `index.html`
(canonical link + JSON-LD) to the new domain. DNS changes can take a few
minutes to ~24 hours to propagate; GitHub then auto-issues an HTTPS
certificate (check Settings → Pages in the repo for "DNS check successful").

## SEO

- `robots.txt` and `sitemap.xml` help search engines crawl and index the site.
- `index.html` includes a canonical URL and `ProfessionalService` structured
  data (JSON-LD) so Google can show richer results (phone, service area, etc.).
- All three currently point at the github.io URL above — update them if a
  custom domain is added later.
