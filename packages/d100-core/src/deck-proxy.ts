import { Deck } from "./object-types";

// Enable deck["discard"] style access
export function deckProxy(deck: Deck): Deck & Record<string, string[]> {
  return new Proxy(deck as any, {
    get(target, prop) {
      if (typeof prop === "string" && prop in target.piles) {
        return target.piles[prop];
      }
      return (target as any)[prop];
    },
  });
}
