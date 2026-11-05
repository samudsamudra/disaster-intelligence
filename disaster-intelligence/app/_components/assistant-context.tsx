"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { BotEarthquake } from "./floating-disaster-bot";

export type AssistantPageContext = {
  title: string;
  details: string;
  events: BotEarthquake[];
};

type AssistantContextValue = {
  pageContext: AssistantPageContext;
  setPageContext: (context: AssistantPageContext) => void;
};

const defaultContext: AssistantPageContext = {
  title: "PantauBencana",
  details: "Tidak ada data halaman khusus yang tersedia.",
  events: [],
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pageContext, setPageContext] = useState(defaultContext);
  const value = useMemo(() => ({ pageContext, setPageContext }), [pageContext]);

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext() {
  const context = useContext(AssistantContext);

  if (!context) {
    throw new Error("useAssistantContext must be used within AssistantContextProvider");
  }

  return context;
}
