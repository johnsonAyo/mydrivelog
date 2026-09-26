"use client";

import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Route,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const lessons = [
  {
    time: "09:00",
    name: "Maya A.",
    detail: "Roundabouts · Lesson 8",
    status: "Next focus set",
  },
  {
    time: "11:30",
    name: "Owen P.",
    detail: "Dual carriageways · Lesson 12",
    status: "Awaiting debrief",
  },
  {
    time: "14:00",
    name: "Sofia R.",
    detail: "Bay parking · Lesson 5",
    status: "Booked",
  },
];

function TodayPreview() {
  return (
    <div className="product-window">
      <div className="product-window__topbar">
        <div>
          <p className="eyebrow">Tuesday, 22 September</p>
          <h3>Today</h3>
        </div>
        <Badge className="status-badge">
          <span className="status-dot" /> 3 lessons
        </Badge>
      </div>
      <div className="day-grid">
        <section className="lesson-list" aria-label="Today’s lessons">
          {lessons.map((lesson, index) => (
            <article className="lesson-row" key={lesson.time}>
              <time>{lesson.time}</time>
              <span className="lesson-row__line" aria-hidden="true">
                <span />
              </span>
              <div className="lesson-row__body">
                <div>
                  <strong>{lesson.name}</strong>
                  <p>{lesson.detail}</p>
                </div>
                <Badge
                  variant="neutral"
                  className={index === 1 ? "status-badge status-badge--attention" : "status-badge"}
                >
                  {lesson.status}
                </Badge>
                <ChevronRight aria-hidden="true" />
              </div>
            </article>
          ))}
        </section>

        <aside className="continuity-panel">
          <div className="continuity-panel__heading">
            <span className="icon-tile"><Route /></span>
            <div>
              <p className="eyebrow">Before the next lesson</p>
              <h4>Pick up with Maya</h4>
            </div>
          </div>
          <div className="continuity-block">
            <span>Last lesson</span>
            <strong>Roundabout positioning</strong>
            <p>Mirrors were consistent. Maya needed help choosing her lane on approach.</p>
          </div>
          <div className="continuity-block continuity-block--next">
            <span>Next focus</span>
            <strong>Lane choice without prompting</strong>
          </div>
          <div className="private-note">
            <span>Private note</span>
            <p>Start on a familiar route before the larger roundabout.</p>
          </div>
          <Button size="sm" className="preview-action">
            Open lesson <ArrowUpRight />
          </Button>
        </aside>
      </div>
    </div>
  );
}

function CalendarPreview() {
  const days = ["Mon 21", "Tue 22", "Wed 23", "Thu 24", "Fri 25"];
  return (
    <div className="product-window calendar-preview">
      <div className="product-window__topbar">
        <div>
          <p className="eyebrow">Teaching week</p>
          <h3>September 21–25</h3>
        </div>
        <Badge className="status-badge"><CalendarDays /> 5 days planned</Badge>
      </div>
      <div className="week-grid">
        {days.map((day, index) => (
          <div className="week-column" key={day}>
            <strong>{day}</strong>
            <span className={index === 1 ? "slot slot--active" : "slot"}>09:00</span>
            {index !== 3 && <span className="slot slot--booked">Lesson</span>}
            <span className="slot">14:00</span>
            {index === 2 && <span className="slot slot--warning">Travel gap</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingPreview() {
  return (
    <div className="product-window booking-preview">
      <div className="booking-preview__copy">
        <p className="eyebrow">Learner booking link</p>
        <h3>This is what Maya gets.</h3>
        <p>She can choose from the times you’ve offered her and check the pickup point before booking.</p>
      </div>
      <Card className="booking-card">
        <CardContent>
          <div className="booking-card__heading">
            <div className="avatar">MA</div>
            <div><strong>Maya’s lesson times</strong><span>Choose one available time</span></div>
          </div>
          {["Wed 23 · 11:30", "Thu 24 · 14:00", "Fri 25 · 09:00"].map((slot) => (
            <button className="booking-option" key={slot} type="button">
              <Clock3 /> <span>{slot}</span> <ChevronRight />
            </button>
          ))}
          <div className="pickup"><MapPin /> Pickup · Home address</div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProductPreview() {
  return (
    <Tabs defaultValue="today" className="product-tabs">
      <TabsList className="product-tabs__list" aria-label="MyDriveLog product views">
        <TabsTrigger value="today">Today</TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="booking">Booking links</TabsTrigger>
      </TabsList>
      <TabsContent value="today"><TodayPreview /></TabsContent>
      <TabsContent value="calendar"><CalendarPreview /></TabsContent>
      <TabsContent value="booking"><BookingPreview /></TabsContent>
    </Tabs>
  );
}
