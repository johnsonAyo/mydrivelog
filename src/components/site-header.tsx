"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Wordmark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

type Section = "product" | "workflow" | "faq";

const sections: { id: Section; label: string }[] = [
  { id: "product", label: "Product" },
  { id: "workflow", label: "How it works" },
  { id: "faq", label: "FAQ" },
];

export function SiteHeader() {
  const [active, setActive] = useState<Section>("product");

  useEffect(() => {
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
  }, []);

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="#top" aria-label="DriveTrack home"><Wordmark /></Link>
        <nav aria-label="Main navigation" data-active={active}>
          {sections.map(({ id, label }) => (
            <Link
              href={`#${id}`}
              key={id}
              aria-current={active === id ? "location" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Button render={<Link href="/sign-in" />} nativeButton={false} variant="neutral" size="sm">Sign in</Button>
          <Button render={<Link href="/get-started" />} nativeButton={false} size="sm">Start free trial <ArrowRight /></Button>
        </div>
      </div>
    </header>
  );
}
