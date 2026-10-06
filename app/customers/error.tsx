"use client";

import { RouteError } from "@/components/route-error";

export default function CustomersError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} />;
}
