import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CustomersModule } from "@/components/customers/customers-module";

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" aria-hidden />
          <span className="sr-only">Memuat…</span>
        </div>
      }
    >
      <CustomersModule />
    </Suspense>
  );
}
