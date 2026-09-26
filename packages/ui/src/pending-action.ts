import { useState } from "react";

// Views that share one `busy` flag across several buttons remember which one was pressed, so only that button spins.
export function usePendingAction(busy: boolean) {
  const [action, setAction] = useState<string | null>(null);
  return { start: setAction, is: (key: string) => busy && action === key };
}
