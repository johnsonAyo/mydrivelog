"use client";

import { Toast } from "@base-ui/react/toast";
import { CircleAlert, CircleCheck, Info, X, type LucideIcon } from "lucide-react";
import { Button } from "./primitives";

type ToastVariantSpec = { priority: "low" | "high"; timeout: number; icon: LucideIcon };

// One entry per variant. A new variant needs an entry here and a `[data-dt="toast"][data-type="…"]` rule in globals.css.
const toastVariants = {
  success: { priority: "low", timeout: 5000, icon: CircleCheck },
  info: { priority: "low", timeout: 5000, icon: Info },
  error: { priority: "high", timeout: 8000, icon: CircleAlert },
} satisfies Record<string, ToastVariantSpec>;

export type ToastVariant = keyof typeof toastVariants;

export type ToastMessage = string | {
  title: string;
  description?: string;
  /** Milliseconds before auto-dismiss; `0` keeps the toast until dismissed. */
  timeout?: number;
  action?: { label: string; onClick: () => void };
  /** Reusing an id replaces the visible toast instead of stacking another. */
  id?: string;
};

const manager = Toast.createToastManager();

function show(variant: ToastVariant, message: ToastMessage): string {
  const { title, description, timeout, action, id } = typeof message === "string" ? { title: message } as Exclude<ToastMessage, string> : message;
  const spec = toastVariants[variant];
  return manager.add({
    id,
    type: variant,
    title,
    description,
    priority: spec.priority,
    timeout: timeout ?? spec.timeout,
    actionProps: action ? { children: action.label, onClick: action.onClick } : undefined,
  });
}

export const toast = {
  ...(Object.fromEntries(Object.keys(toastVariants).map((variant) => [variant, (message: ToastMessage) => show(variant as ToastVariant, message)])) as Record<ToastVariant, (message: ToastMessage) => string>),
  show,
  dismiss: (id?: string) => manager.close(id),
};

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((item) => {
    const Icon = toastVariants[item.type as ToastVariant]?.icon ?? Info;
    return <Toast.Root key={item.id} toast={item} swipeDirection={["up", "right"]} data-dt="toast">
      <Icon aria-hidden="true" data-dt="toast-mark" size={18} />
      <Toast.Content data-dt="toast-content">
        <Toast.Title render={<p />} data-dt="toast-title" />
        <Toast.Description render={<p />} data-dt="toast-description" />
        <Toast.Action render={<Button variant="surface" size="1" />} />
      </Toast.Content>
      <Toast.Close render={<Button tone="neutral" variant="ghost" size="1" />} aria-label="Dismiss notification"><X aria-hidden="true" size={18} /></Toast.Close>
    </Toast.Root>;
  });
}

export function Toaster() {
  return <Toast.Provider toastManager={manager} limit={3}>
    <Toast.Portal>
      <Toast.Viewport data-dt="toast-viewport"><ToastList /></Toast.Viewport>
    </Toast.Portal>
  </Toast.Provider>;
}
