import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { InvoicesModule } from "@/components/invoices/invoices-module";

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" aria-hidden />
        </div>
      }
    >
      <InvoicesModule />
    </Suspense>
  );
}
