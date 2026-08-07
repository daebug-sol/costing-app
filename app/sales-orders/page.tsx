import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SalesOrdersModule } from "@/components/sales-orders/sales-orders-module";

export default function SalesOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" aria-hidden />
        </div>
      }
    >
      <SalesOrdersModule />
    </Suspense>
  );
}
