import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PaymentsModule } from "@/components/payments/payments-module";

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" aria-hidden />
        </div>
      }
    >
      <PaymentsModule />
    </Suspense>
  );
}
