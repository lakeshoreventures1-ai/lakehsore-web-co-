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

## Custom domain (lakeshorewebco.com)

The `CNAME` file tells GitHub Pages to serve the site at `lakeshorewebco.com`.
For it to actually resolve, add these DNS records at your domain registrar
(wherever `lakeshorewebco.com` was purchased):

| Type  | Host/Name | Value                              |
|-------|-----------|-------------------------------------|
| A     | @         | 185.199.108.153                     |
| A     | @         | 185.199.109.153                     |
| A     | @         | 185.199.110.153                     |
| A     | @         | 185.199.111.153                     |
| CNAME | www       | lakeshoreventures1-ai.github.io.    |

DNS changes can take anywhere from a few minutes to ~24 hours to propagate.
Once it does, GitHub automatically issues an HTTPS certificate for the domain
(check Settings → Pages in the repo — it'll show "DNS check successful" and
an option to enforce HTTPS).

## SEO

- `robots.txt` and `sitemap.xml` help search engines crawl and index the site.
- `index.html` includes a canonical URL and `ProfessionalService` structured
  data (JSON-LD) so Google can show richer results (phone, service area, etc.).
- Both files reference `https://lakeshorewebco.com/` — update them if the
  domain ever changes.
