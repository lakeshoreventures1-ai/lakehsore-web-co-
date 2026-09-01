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

The contact form currently validates and shows a confirmation message client-side only.
To actually receive submissions, wire the form up to a backend/service such as
Formspree, Netlify Forms, or a custom API endpoint.
