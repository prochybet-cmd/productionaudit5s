import { generatePlan } from "./src/lib/scheduler";

const plan = generatePlan({ year: 2026, month: 6 });

plan.weeks.forEach((w) => {
  console.log(`\nKW ${w.weekNumber} (${w.start} - ${w.end})`);
  w.days.forEach((d) => {
    const zones = d.assignments.map((a) => a.zone.match(/^(L\d+)/)?.[1] ?? a.zone);
    console.log(`  ${d.weekday} ${d.date}: ${zones.join(", ")}`);
  });
});
