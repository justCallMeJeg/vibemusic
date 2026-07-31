import { createContext, useContext } from "react";

type ScrollHandler = (e: React.UIEvent<HTMLDivElement>) => void;

const DetailScrollContext = createContext<ScrollHandler | null>(null);

export function useDetailScroll() {
  const ctx = useContext(DetailScrollContext);
  return ctx ?? undefined;
}

export { DetailScrollContext };
