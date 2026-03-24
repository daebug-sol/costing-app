import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TableLoadingSkeletonProps = {
  columns: number;
  rows?: number;
  showHeader?: boolean;
};

export function TableLoadingSkeleton({
  columns,
  rows = 6,
  showHeader = true,
}: TableLoadingSkeletonProps) {
  return (
    <Table>
      {showHeader && (
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      )}
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r} className="hover:bg-transparent">
            {Array.from({ length: columns }).map((_, c) => (
              <TableCell key={c}>
                <Skeleton
                  className="h-4 w-full max-w-[8rem]"
                  style={{ width: `${60 + ((r + c) % 5) * 8}%` }}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
