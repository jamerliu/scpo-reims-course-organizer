# Course Selection Planner

Sciences Po Reims — 202610 Schedule (North America & Africa Minor Programs)

## What it does

- Select your grade (1A or 2A) and regional minor (North America, Africa English, Africa French/METIS)
- Answer a short language eligibility questionnaire (French fluency, English fluency, third-language unlock)
- Browse all 580 courses organised by Type d'enseignement, filterable by discipline, sortable by any column
- Drag or click courses onto a Mon-Fri calendar grid — mandatory Cours magistraux are auto-added on entry
- A sidebar tracks requirement fulfilment (red = missing, green = done) against the official 2026-2027 requirements
- Export a PDF report: calendar view + selected course list + requirement checklist

## Deploy to Vercel (2 minutes)

1. Push this folder to a GitHub repo (can be private)
2. Go to vercel.com -> Add New Project -> import that repo
3. Framework preset: Vite (auto-detected)
4. Build command: npm run build
5. Output directory: dist
6. Click Deploy

No database, no environment variables. All data is bundled.

## Run locally

npm install
npm run dev

Then open http://localhost:5173

## Updating the schedule next year

1. Replace SCHEDULE____202610.xlsx in the project root
2. Run: python3 parse.py
   This regenerates src/data/courses.json
3. Run: npm run build
4. Redeploy to Vercel

## Notes on the requirements tracker

- Mandatory Cours magistraux are auto-populated when you enter the planner.
- Quadruplette system (1A North America): pick the same quadruplette number across Law, Pol Science, History, and Political Theory.
- Items marked [CORRECTED] in the sidebar reflect corrections vs. original notes, cross-checked against the live schedule.
- Mandarin/Chinese is not on the current schedule.
- Semaine A / Semaine B notes appear on biweekly Academic Writing sessions — these show as a note on the calendar block.
- Conflict detection (red outline) fires when two added courses share an overlapping time slot.
