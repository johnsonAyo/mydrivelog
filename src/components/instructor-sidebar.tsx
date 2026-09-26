"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { InstructorSignOut } from "./instructor-sign-out";
import { instructorNavigation, type InstructorSection } from "./instructor-navigation";

function sectionForPath(pathname: string): InstructorSection {
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/learners")) return "learners";
  if (pathname.startsWith("/settings/scheduling")) return "scheduling";
  return "today";
}

export function InstructorSidebar({ instructorName }: { instructorName: string }) {
  const pathname = usePathname();
  const navigation = instructorNavigation(sectionForPath(pathname));
  return <aside data-dt="product-sidebar">
    <div data-dt="product-brand">MyDriveLog</div>
    <nav aria-label="Product navigation" data-dt="product-nav">
      {navigation.map((item) => <Link href={item.href} key={item.href} aria-current={item.active ? "page" : undefined}>
        <span aria-hidden="true">{item.icon}</span>{item.label}
      </Link>)}
    </nav>
    <div data-dt="product-identity"><span>{instructorName}</span><InstructorSignOut /></div>
    <details data-dt="product-mobile-menu" key={pathname}>
      <summary><Menu size={20} aria-hidden="true" /><span>Menu</span></summary>
      <div data-dt="product-mobile-menu-panel">
        <nav aria-label="Mobile product navigation">
          {navigation.map((item) => <Link href={item.href} key={item.href} aria-current={item.active ? "page" : undefined}>
            <span aria-hidden="true">{item.icon}</span>{item.label}
          </Link>)}
        </nav>
        <div data-dt="product-mobile-account"><span>{instructorName}</span><InstructorSignOut /></div>
      </div>
    </details>
  </aside>;
}
