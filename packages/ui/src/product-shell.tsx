import type { ReactNode } from "react";
import { Heading, Text } from "./primitives";

type NavigationItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
};

export function ProductShell({
  brand,
  navigation,
  title,
  description,
  identity,
  actions,
  children,
}: {
  brand: ReactNode;
  navigation: readonly NavigationItem[];
  title: string;
  description?: string;
  identity?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-dt="product-shell">
      <aside data-dt="product-sidebar">
        <div data-dt="product-brand">{brand}</div>
        <nav aria-label="Product navigation" data-dt="product-nav">
          {navigation.map((item) => (
            <a href={item.href} key={item.href} aria-current={item.active ? "page" : undefined}>
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              {item.label}
            </a>
          ))}
        </nav>
        {identity && <div data-dt="product-identity">{identity}</div>}
      </aside>
      <div data-dt="product-main">
        <header data-dt="product-header">
          <div>
            <Heading as="h1" size="section">{title}</Heading>
            {description && <Text variant="muted">{description}</Text>}
          </div>
          {actions && <div data-dt="product-actions">{actions}</div>}
        </header>
        <main data-dt="product-content">{children}</main>
      </div>
    </div>
  );
}
