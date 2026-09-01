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
