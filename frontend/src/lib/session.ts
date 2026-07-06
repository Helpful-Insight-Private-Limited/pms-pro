"use client";

import { useEffect, useState } from "react";
import { readSessionUser, type AuthUser } from "@/lib/api";

export function useSessionUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(readSessionUser());
    setHydrated(true);
  }, []);

  return { user, hydrated };
}
