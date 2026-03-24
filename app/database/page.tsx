import { DatabaseModule } from "@/components/database/database-module";

export default function DatabasePage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-foreground mb-2 text-2xl font-semibold tracking-tight">
        Database
      </h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Master data: materials, profiles, components, and forex reference rates.
      </p>
      <DatabaseModule />
    </div>
  );
}
