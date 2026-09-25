"use client";

import { Field, SelectField, Text } from "./primitives";

type LessonTime = { date: string; start: string; end: string; defaultDuration: number; weekStart?: string | null };

function weekEnd(weekStart: string) {
  const date = new Date(`${weekStart}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

function timeMinutes(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

function clockTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function localDate(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function lessonEndTime({ start, end, defaultDuration }: Pick<LessonTime, "start" | "end" | "defaultDuration">) {
  if (end) return end;
  const startMinutes = timeMinutes(start);
  if (startMinutes === null || startMinutes + defaultDuration >= 1440) return "";
  return clockTime(startMinutes + defaultDuration);
}

export function lessonTimeIssue({ date, start, end, defaultDuration, weekStart }: LessonTime, now: Date) {
  if (!date) return null;
  if (weekStart && (date < weekStart || date > weekEnd(weekStart))) return "Choose a date inside this week.";
  if (date < localDate(now)) return "Choose today or a future date.";
  if (!start) return null;
  const startMinutes = timeMinutes(start);
  const endMinutes = timeMinutes(lessonEndTime({ start, end, defaultDuration }));
  if (startMinutes === null) return "Choose a valid start time.";
  if (date === localDate(now) && new Date(`${date}T${start}`).getTime() <= now.getTime()) return "Choose a future start time.";
  if (endMinutes === null) return "Choose an end time on the same day.";
  if (endMinutes - startMinutes < 15 || endMinutes - startMinutes > 480) return "Choose an end 15 minutes to 8 hours after the start.";
  return null;
}

function roundedStarts(date: string, now: Date | null) {
  if (!date) return [];
  if (now && date < localDate(now)) return [];
  return Array.from({ length: 47 }, (_, index) => clockTime(index * 30)).filter((time) => !now || date !== localDate(now) || new Date(`${date}T${time}`) > now);
}

function roundedEnds(start: string) {
  const startMinutes = timeMinutes(start);
  if (startMinutes === null) return [];
  return Array.from({ length: 48 }, (_, index) => index * 30)
    .filter((minutes) => minutes - startMinutes >= 15 && minutes - startMinutes <= 480)
    .map(clockTime);
}

function suggestedStart(date: string, now: Date) {
  const options = roundedStarts(date, now);
  return options.find((time) => time >= "09:00") ?? "";
}

export function LessonTimePicker({ date, start, end, defaultDuration, weekStart, now, onDateChange, onStartChange, onEndChange }: LessonTime & {
  now: Date | null;
  onDateChange: (date: string) => void;
  onStartChange: (start: string) => void;
  onEndChange: (end: string) => void;
}) {
  const today = now ? localDate(now) : undefined;
  const starts = roundedStarts(date, now);
  const ends = roundedEnds(start);
  const displayedEnd = lessonEndTime({ start, end, defaultDuration });
  const issue = now ? lessonTimeIssue({ date, start, end, defaultDuration, weekStart }, now) : null;
  const dateIssue = date && weekStart && (date < weekStart || date > weekEnd(weekStart)) ? "Choose a date inside this week." : date && today && date < today ? "Choose today or a future date." : undefined;
  const minimumDate = weekStart && today ? (weekStart > today ? weekStart : today) : weekStart ?? today;
  const nextMinute = now ? now.getHours() * 60 + now.getMinutes() + 1 : null;
  const startMin = date && today === date && nextMinute !== null && nextMinute < 1440 ? clockTime(nextMinute) : undefined;
  const startMinutes = timeMinutes(start);
  const endMin = startMinutes !== null && startMinutes + 15 < 1440 ? clockTime(startMinutes + 15) : undefined;
  const endMax = startMinutes !== null ? clockTime(Math.min(startMinutes + 480, 1439)) : undefined;

  return <>
    <div data-dt="collection-time-fields">
      <Field id="lesson-date" label="Date" type="date" value={date} min={minimumDate} max={weekStart ? weekEnd(weekStart) : undefined} required error={dateIssue} onChange={(event) => {
        const nextDate = event.target.value;
        onDateChange(nextDate);
        onStartChange(nextDate && !(weekStart && (nextDate < weekStart || nextDate > weekEnd(weekStart))) ? suggestedStart(nextDate, now ?? new Date()) : "");
        onEndChange("");
      }} />
      <SelectField id="lesson-start" label="Starts" value={start} required disabled={!date || Boolean(dateIssue)} onChange={(event) => onStartChange(event.target.value)} hint={date ? "Half-hour choices" : "Choose a date first"}>
        <option value="">Choose a time</option>
        {start && !starts.includes(start) && <option value={start}>{start} (exact)</option>}
        {starts.map((time) => <option key={time} value={time}>{time}</option>)}
      </SelectField>
      <SelectField id="lesson-end" label="Ends" value={displayedEnd} required disabled={!start || Boolean(dateIssue)} onChange={(event) => onEndChange(event.target.value)} hint={start ? `Usually ${defaultDuration} minutes` : "Choose a start first"}>
        <option value="">Choose a time</option>
        {displayedEnd && !ends.includes(displayedEnd) && <option value={displayedEnd}>{displayedEnd} (exact)</option>}
        {ends.map((time) => <option key={time} value={time}>{time}</option>)}
      </SelectField>
    </div>
    <details data-dt="collection-exact-times"><summary>Need an exact minute?</summary><div data-dt="collection-exact-time-fields">
      <Field id="lesson-start-exact" label="Exact start" type="time" step={60} value={start} min={startMin} disabled={!date || Boolean(dateIssue)} onChange={(event) => onStartChange(event.target.value)} />
      <Field id="lesson-end-exact" label="Exact end" type="time" step={60} value={displayedEnd} min={endMin} max={endMax} disabled={!date || Boolean(dateIssue)} onChange={(event) => onEndChange(event.target.value)} />
      <Text variant="caption">Use this for times such as 16:20 or 17:15. Each lesson must end on the same day.</Text>
    </div></details>
    {issue ? <p data-dt="collection-time-guidance" role="status">{issue}</p> : date && start && displayedEnd ? <p data-dt="collection-time-preview" role="status">Ready to add <strong>{start}–{displayedEnd}</strong> on {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00`))}.</p> : null}
    {date && starts.length === 0 && !dateIssue && <p data-dt="collection-time-guidance" role="status">No rounded times remain today. Choose another date or enter an exact future time.</p>}
  </>;
}
