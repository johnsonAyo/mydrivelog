import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck2,
  Check,
  Clock3,
  Link2,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import { Faq } from "@/components/faq";
import { Wordmark } from "@/components/brand-mark";
import { ProductPreview } from "@/components/product-preview";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const workflow = [
  { number: "01", title: "Plan availability", copy: "Shape the week around how you teach.", icon: CalendarCheck2 },
  { number: "02", title: "Release slots", copy: "Share only the lesson times you want booked.", icon: Clock3 },
  { number: "03", title: "Learner books", copy: "A personal link keeps booking straightforward.", icon: Link2 },
  { number: "04", title: "Complete debrief", copy: "Capture progress and set the next focus.", icon: BookOpenCheck },
];

const continuity = [
  { label: "Last lesson", value: "What you covered and how it went" },
  { label: "Practice goals", value: "What the learner is working on between lessons" },
  { label: "Private context", value: "The details only you need to remember" },
  { label: "Next focus", value: "A clear starting point for the next session" },
];

const features = [
  {
    icon: CalendarCheck2,
    eyebrow: "Plan",
    title: "Your teaching week, clearly arranged.",
    copy: "Set working patterns, organise lesson slots, and keep changes in one dependable calendar.",
  },
  {
    icon: Link2,
    eyebrow: "Book",
    title: "Availability without losing control.",
    copy: "Release selected slots through learner-specific links while the rest of your week stays private.",
  },
  {
    icon: MessageSquareText,
    eyebrow: "Debrief",
    title: "Close one lesson. Prepare the next.",
    copy: "Record progress, shared notes, private context, and the next focus while the lesson is fresh.",
  },
  {
    icon: MapPinned,
    eyebrow: "Travel",
    title: "See pressure before it becomes a problem.",
    copy: "Keep pickup points and travel gaps visible as you shape the day.",
  },
];

function ActionLink({ children, href, variant = "default" }: { children: React.ReactNode; href: string; variant?: "default" | "neutral" }) {
  return <Button render={<Link href={href} />} nativeButton={false} variant={variant}>{children}</Button>;
}

export default function Home() {
  const testingWorkspace = process.env.NODE_ENV === "development" && Boolean(process.env.DEV_WORKSPACE_ID);
  const actionHref = testingWorkspace ? "/calendar" : "/get-started";
  return (
    <main className="landing-page">
      <SiteHeader testingWorkspace={testingWorkspace} />

      <section className="hero section" id="top">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <Badge className="kicker"><span className="status-dot" /> Built for independent driving instructors</Badge>
            <h1>Keep every lesson <em>on track.</em></h1>
            <p className="hero-lede">
              Plan your week, release lesson slots, manage bookings, and complete debriefs from one focused workspace.
            </p>
            <div className="hero-actions">
              <ActionLink href={actionHref}>{testingWorkspace ? "Open calendar" : "Start free trial"} <ArrowRight /></ActionLink>
            </div>
            <div className="trust-line">
              <span><Check /> Instructor-first</span>
              <span><Check /> Learner-specific booking</span>
              <span><Check /> Private notes stay private</span>
            </div>
          </div>
          <div className="hero-side">
            <div className="hero-note">
              <span>Built around the work between lessons.</span>
              <p>Less reconstructing. More purposeful teaching.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="product-stage section" id="product">
        <div className="shell">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">The day at a glance</p>
              <h2>Know what needs your attention.</h2>
            </div>
            <p>Today’s lessons, follow-ups, and the context you need before the next learner gets in the car.</p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="continuity section">
        <div className="shell continuity-grid">
          <div className="continuity-copy">
            <p className="eyebrow">Lesson continuity</p>
            <h2>Pick up where you left off with every learner.</h2>
            <p className="section-lede">
              When you teach a full week of different people, the next lesson should not begin with you rebuilding the last one from memory.
            </p>
            <ActionLink href={actionHref}>Keep lessons connected <ArrowRight /></ActionLink>
          </div>
          <Card className="continuity-card">
            <CardContent>
              <div className="continuity-card__top">
                <div className="avatar avatar--large">MA</div>
                <div><span>Next at 09:00</span><strong>Maya A.</strong></div>
                <Badge className="status-badge">Lesson 8</Badge>
              </div>
              <div className="continuity-list">
                {continuity.map((item, index) => (
                  <div className="continuity-item" key={item.label}>
                    <span className="continuity-item__number">0{index + 1}</span>
                    <div><span>{item.label}</span><strong>{item.value}</strong></div>
                    <Check aria-hidden="true" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="workflow section" id="workflow">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">One connected workflow</p>
            <h2>From planning to the next lesson.</h2>
          </div>
          <div className="workflow-track">
            {workflow.map((step) => {
              const Icon = step.icon;
              return (
                <article className="workflow-step" key={step.number}>
                  <div className="workflow-step__top"><span>{step.number}</span><Icon /></div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="features section">
        <div className="shell">
          <div className="section-heading section-heading--split">
            <div><p className="eyebrow">The essentials</p><h2>Everything earns its place.</h2></div>
            <p>A concise workspace for the recurring work of running lessons well—without turning teaching into admin.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="feature" key={feature.title}>
                  <div className="feature__top"><span className="icon-tile"><Icon /></span><span>{feature.eyebrow}</span></div>
                  <h3>{feature.title}</h3>
                  <p>{feature.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="principles section">
        <div className="shell principles-grid">
          <div>
            <p className="eyebrow">Quietly dependable</p>
            <h2>Made for the reality of an instructor’s day.</h2>
          </div>
          <div className="principle-list">
            <div><ShieldCheck /><span><strong>Your workspace is yours.</strong> Learners only see the booking choices and notes meant for them.</span></div>
            <div><Clock3 /><span><strong>Debrief while it is fresh.</strong> A focused flow keeps the record useful without slowing your day down.</span></div>
            <div><BookOpenCheck /><span><strong>Context stays attached.</strong> Progress and next focus remain connected to the right learner.</span></div>
          </div>
        </div>
      </section>

      <section className="faq section" id="faq">
        <div className="shell faq-grid">
          <div className="section-heading">
            <p className="eyebrow">Questions, answered</p>
            <h2>The practical details.</h2>
          </div>
          <Faq />
        </div>
      </section>

      <section className="closing section" id="start">
        <div className="shell closing-panel">
          <div>
            <p className="eyebrow">Ready when you are</p>
            <h2>Run the week. Remember the learner.</h2>
            <p>Bring availability, bookings, and lesson continuity into one focused place.</p>
          </div>
          <div className="closing-actions">
            <ActionLink href={actionHref}>{testingWorkspace ? "Open calendar" : "Start free trial"} <ArrowRight /></ActionLink>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <Wordmark />
          <p>One focused workspace for independent driving instructors.</p>
          <div><Link href="#product">Product</Link><Link href="#faq">FAQ</Link><Link href="mailto:hello@drivetrack.uk">Contact</Link></div>
        </div>
      </footer>
    </main>
  );
}
