import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck2,
  Check,
  Link2,
} from "lucide-react";

import { Faq } from "@/components/faq";
import { Wordmark } from "@/components/brand-mark";
import { ProductPreview } from "@/components/product-preview";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const workflow = [
  { id: "step-1", title: "Add lesson times", copy: "Pick a week and add the days and times you want to teach.", icon: CalendarCheck2 },
  { id: "step-2", title: "Choose what’s bookable", copy: "Make selected times available to learners. New times stay private until you choose to offer them.", icon: Check },
  { id: "step-3", title: "Share a link", copy: "Invite a learner by name, or create one link for new enquiries.", icon: Link2 },
  { id: "step-4", title: "Finish the lesson", copy: "Write your notes, record the next focus, and mark the lesson complete.", icon: BookOpenCheck },
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
              <ActionLink href={actionHref}>{testingWorkspace ? "Open calendar" : "Start pilot"} <ArrowRight /></ActionLink>
            </div>
            <div className="trust-line">
              <span><Check /> Choose which times learners can book</span>
              <span><Check /> Send each learner their own booking link</span>
              <span><Check /> Record what to cover next time</span>
            </div>
          </div>
          <div className="hero-side">
            <div className="hero-note">
              <span>After the lesson</span>
              <p>Write private notes. Send a separate recap to the learner if you want to.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="product-stage section" id="product">
        <div className="shell">
          <div className="section-heading section-heading--split">
            <div>
              <h2>See who’s booked today.</h2>
            </div>
            <p>Check lesson times, see which debriefs still need doing, and open the next learner’s notes.</p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section className="workflow section" id="workflow">
        <div className="shell">
          <div className="section-heading">
            <h2>From an open time to a finished lesson.</h2>
          </div>
          <div className="workflow-track">
            {workflow.map((step) => {
              const Icon = step.icon;
              return (
                <article className="workflow-step" key={step.id}>
                  <div className="workflow-step__top"><Icon /></div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="faq section" id="faq">
        <div className="shell faq-grid">
          <div className="section-heading">
            <h2>How booking and recaps work.</h2>
          </div>
          <Faq />
        </div>
      </section>

      <section className="closing section" id="start">
        <div className="shell closing-panel">
          <div>
            <h2>Try it with your next teaching week.</h2>
          </div>
          <div className="closing-actions">
            <ActionLink href={actionHref}>{testingWorkspace ? "Open calendar" : "Start pilot"} <ArrowRight /></ActionLink>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <Wordmark />
          <div><Link href="#product">Product</Link><Link href="#faq">FAQ</Link><Link href="mailto:hello@mydrivelog.co.uk">Contact</Link></div>
        </div>
      </footer>
    </main>
  );
}
