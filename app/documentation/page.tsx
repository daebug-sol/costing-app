import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DocumentationModule } from "@/components/documentation/documentation-module";

export default function DocumentationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50">
          <Loader2 className="size-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <DocumentationModule />
    </Suspense>
  );
}
