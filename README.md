# Lakeshore Web Co.

Marketing website for Lakeshore Web Co., a web design & development studio.

Static site — plain HTML, CSS, and JS, no build step or dependencies.

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

The contact form submits to [FormSubmit.co](https://formsubmit.co), which emails
submissions to `lakeshoreventures1@gmail.com` — no backend or API key required.

**One-time setup:** the first time the form is submitted, FormSubmit sends a
confirmation email to `lakeshoreventures1@gmail.com` with an "Activate Form" link.
Until that link is clicked, submissions won't be delivered — so send a test
submission through the live site once and confirm it from that inbox.

## Custom domain

There's no custom domain yet — the site lives at
`https://lakeshoreventures1-ai.github.io/lakehsore-web-co-/`. If a domain is
purchased later (e.g. `lakeshorewebco.com`), add a `CNAME` file to the repo
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
