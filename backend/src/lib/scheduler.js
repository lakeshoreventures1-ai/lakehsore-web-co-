import { runOutreachTick } from "./prospects.js";
import { sendWeeklyReports } from "./reports.js";
import { getMeta, setMeta } from "./store.js";

/**
 * Hourly autopilot loop, run inside the web process (no separate cron needed):
 *  - weekdays 9am-4pm (OUTREACH_TZ): send outreach + follow-ups, if OUTREACH_AUTOSEND=1
 *  - Mondays: send weekly client reports once
 */
export function startScheduler() {
  const tick = async () => {
    const tz = process.env.OUTREACH_TZ || "America/Chicago";
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", hour12: false })
        .formatToParts(new Date())
        .map((p) => [p.type, p.value]),
    );
    const hour = Number(parts.hour);
    const weekday = parts.weekday;
    const isWeekday = !["Sat", "Sun"].includes(weekday);

    try {
      if (process.env.OUTREACH_AUTOSEND === "1" && isWeekday && hour >= 9 && hour < 16) {
        const r = await runOutreachTick();
        if (r.sent) console.log(`[scheduler] outreach sent ${r.sent}`);
      }
      const week = new Date().toISOString().slice(0, 10);
      if (weekday === "Mon" && hour >= 9 && getMeta("lastReportDate") !== week) {
        setMeta("lastReportDate", week);
        const r = await sendWeeklyReports();
        console.log(`[scheduler] weekly reports sent ${r.sent}`);
      }
    } catch (err) {
      console.error("[scheduler] tick failed:", err);
    }
  };
  setTimeout(tick, 15_000);
  return setInterval(tick, 60 * 60 * 1000);
}
