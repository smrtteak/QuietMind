# QuietMind

A gentler way to check in. A working concept for a daily mood tracker that helps you notice patterns over time — without streaks, guilt notifications, or gamification.

🌿 **[Live demo](https://quietmind.vercel.app)** ← replace with your URL


## The idea

Most mood apps treat your emotions like metrics to maximize — streaks to keep, scores to beat, days to "win." QuietMind treats them like moments to notice.

- **No streaks** — skip a day, skip a week. Nothing breaks.
- **One line, not a journal** — light enough to keep, meaningful enough to remember.
- **Gentle nudges** — reminders are off by default and never guilt-driven.
- **Patterns, not performance** — see how your weeks actually feel, without turning them into KPIs.
- **Local-first** — your data lives in your browser, not on a server.

---

## Features

| Feature | Description |
|---|---|
| 🌓 **Themes** | Light, dark, or auto (follows system). Toggles persist across sessions. |
| 🔒 **PIN lock** | Optional 4-digit PIN protects entries on shared devices. |
| 📱 **Installable** | Add to home screen on iOS/Android — works like a native app. |
| 📊 **Mood graph** | 30-day line graph of your check-ins with hoverable tooltips. |
| 💡 **Smart insights** | Auto-detects day-of-week patterns and trends over time. |
| 📄 **PDF export** | Download any date range of entries (capped at how long you've used the app). |
| 💾 **JSON export/import** | Backup or transfer your data manually. |
| 🌑 **No servers** | Everything runs in your browser. No accounts, no analytics, no tracking. |

---

## Try it

1. Open the deployed site (or `index.html` locally).
2. Set a PIN on first launch — or skip if you'd rather not.
3. Pick a mood emoji, write one sentence about your day, hit save.
4. Scroll down to see your point on the graph.
5. Open settings (gear icon, top right) to export a PDF or change theme.

---

## Run locally

No build step. No dependencies to install. Just open `index.html` in any modern browser.

```bash
# Optional: serve with a local server (recommended for the manifest to work)
npx serve .
# or
python3 -m http.server 8000
