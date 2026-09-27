"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Wordmark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

type Section = "product" | "workflow" | "faq";

const sections: { id: Section; label: string }[] = [
  { id: "product", label: "Product" },
  { id: "workflow", label: "Workflow" },
  { id: "faq", label: "FAQ" },
];

export function SiteHeader({ testingWorkspace = false, mode = "landing" }: { testingWorkspace?: boolean; mode?: "landing" | "standalone" }) {
  const landing = mode === "landing";
  const [active, setActive] = useState<Section>("product");

  useEffect(() => {
    if (!landing) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const marker = window.scrollY + 160;
      const workflowTop = document.getElementById("workflow")?.offsetTop ?? Infinity;
      const faqTop = document.getElementById("faq")?.offsetTop ?? Infinity;

      setActive(marker >= faqTop ? "faq" : marker >= workflowTop ? "workflow" : "product");
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [landing]);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href={landing ? "#top" : "/"} aria-label="MyDriveLog home"><Wordmark /></Link>
        <nav aria-label="Main navigation" data-active={landing ? active : undefined}>
          {sections.map(({ id, label }) => (
            <Link
              href={landing ? `#${id}` : `/#${id}`}
              key={id}
              aria-current={landing && active === id ? "location" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          {testingWorkspace ? (
            <Button render={<Link href="/calendar" />} nativeButton={false} size="sm">Open calendar <ArrowRight /></Button>
          ) : (
            <>
              <Button render={<Link href="/sign-in" />} nativeButton={false} variant="neutral" size="sm">Sign in</Button>
              <Button render={<Link href="/get-started" />} nativeButton={false} size="sm">Start pilot <ArrowRight /></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
