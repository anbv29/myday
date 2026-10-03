---
name: MYDAY
description: Cool silver, graphite and electric teal surfaces for a public calendar of meaningful dates.
colors:
  paper: "#f3f7f5"
  paper-raised: "#ffffff"
  ink: "#142927"
  muted: "#516965"
  line: "#d7e3df"
  line-strong: "#78978e"
  accent: "#086d5d"
  accent-hover: "#065647"
  accent-ink: "#ffffff"
  selection: "#b7f5dd"
  gold-bg: "#e0f6ed"
  gold-line: "#95cbb7"
  action: "#a9f2d1"
  action-ink: "#113f31"
  peach: "#a9f2d1"
  peach-ink: "#113f31"
typography:
  headline: {fontFamily: "Manrope, Segoe UI, sans-serif", fontSize: "clamp(32px, 3.1vw, 42px)", fontWeight: 600, lineHeight: 1.17, letterSpacing: "-.03em"}
  title: {fontFamily: "Manrope, Segoe UI, sans-serif", fontSize: "23px", fontWeight: 600, lineHeight: 1.3, letterSpacing: "-.02em"}
  body: {fontFamily: "Manrope, Segoe UI, Arial, sans-serif", fontSize: "clamp(16px, 1.08vw, 18px)", fontWeight: 450, lineHeight: 1.6}
  label: {fontFamily: "Manrope, Segoe UI, sans-serif", fontSize: "12px", fontWeight: 550}
rounded: {day: "8px", button: "11px", surface: "16px", badge: "99px"}
spacing: {compact: "8px", field: "12px", small: "16px", medium: "24px", panel: "26px", section: "64px"}
components:
  button-primary: {backgroundColor: "{colors.action}", textColor: "{colors.action-ink}", rounded: "{rounded.button}", height: "46px"}
  calendar-day: {backgroundColor: "{colors.paper}", textColor: "{colors.ink}", rounded: "{rounded.day}", padding: "11px", height: "64px"}
  calendar-day-selected: {backgroundColor: "{colors.peach}", textColor: "{colors.peach-ink}", rounded: "{rounded.day}"}
  record-panel: {backgroundColor: "{colors.gold-bg}", textColor: "{colors.ink}", rounded: "{rounded.surface}"}
---
# Design System: MYDAY
## Overview
The approved world is cool silver and graphite with electric teal and mint accents, clean Manrope typography, quiet borders, and restrained motion. This is an extraction of the implemented frontend; no named Creative North Star was approved.
Key characteristics: flat tonal surfaces; readable date numerals; a consistent single-family hierarchy; retained light and dark themes.
## Colors
Primary: mint marks actions and selected dates; electric teal supplies accent text and focus. Neutral: cool silver paper, white panels, graphite ink, muted green-gray secondary text, and quiet borders. Pale mint denotes featured records. Values above describe the default light theme; CSS custom properties supply the retained dark equivalents. Legacy peach token names remain compatibility aliases for action colors.
## Typography
Manrope serves headings, copy, labels, and controls through the shared display/copy variables. Headings use moderate weight and tight tracking; date numerals use tabular figures. Selected-date numerals are (100px), reducing to (66px) in the stacked layout.
## Layout
The shared container caps at (1240px), with (32px) desktop gutters and (16px) below (600px). The homepage's top-30 paid-date board uses six columns with (12px) gaps; four below (1100px), three below (760px), and two below (540px). Tiles follow backend price rank, not the current month or chronological order. Only actual paid records appear; there are no fabricated filler dates. Registration pairs a form with supporting rules, stacking below (760px).
## Elevation & Depth
Calendar, selected record, checkout, leaderboard, and standard cards use flat backgrounds and borders without shadows. Search and floating utilities retain the existing ambient shadow variable. Tonal contrast, not decorative gradients or lifted calendar boards, establishes the primary workspace hierarchy.
## Shapes
Working panels have gently curved corners (16px); fields and days use compact corners (8px), reducing days to (6px) below (480px). Buttons use (11px), filter controls (8px), and badges retain capsule corners.
## Components
Primary actions use mint with dark green ink and a teal border; hover mixes mint with the raised paper surface. Fields use native controls, paper fill, quiet borders, and (44px) minimum height. Focus uses an accent outline (3px) with (4px) offset. Navigation marks the current route with tonal fill; mobile exposes a menu below (900px).
The homepage board keeps rank, current value, exact date/year, title and attribution together. Its first-ranked tile uses pale mint. There are no month controls or sort toggles on this board. The existing collection component retains its free/paid filters and native selects for other uses; native details exposes secondary featured stories. The separate free-registration form uses readable labels, public-entry consent, pending, conflict and saved states.
## Do's and Don'ts
Do reuse theme-bound CSS variables, preserve visible focus, use the single Manrope hierarchy, and show real date/claim states.
Don't invent availability or ownership guarantees, add decorative depth to the working calendar, or reintroduce competing font families.
