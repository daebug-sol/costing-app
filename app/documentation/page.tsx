import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DocumentationModule } from "@/components/documentation/documentation-module";

export default function DocumentationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center border-t border-border bg-background">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DocumentationModule />
    </Suspense>
  );
}
