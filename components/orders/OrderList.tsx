"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface Order {
  id: string;
  order_number: string;
  event_id: string;
  event?: {
    title: string;
    start_at: string;
  };
  user_id: string;
  buyer?: {
    email: string;
    name: string;
  };
  status: "pending" | "processing" | "paid" | "failed" | "refunded" | "cancelled" | "partially_refunded";
  amount_cents: number;
  fee_cents: number;
  created_at: string;
  paid_at?: string;
  refunded_at?: string;
}

interface OrderListProps {
  orders: Order[];
  totalCount: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  onOrderClick?: (order: Order) => void;
  pageSize?: number;
}

const statusColors: Record<Order["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
  cancelled: "bg-gray-100 text-gray-800",
  partially_refunded: "bg-orange-100 text-orange-800",
};

export function OrderList({
  orders,
  totalCount,
  isLoading = false,
  onRefresh,
  onExport,
  onOrderClick,
  pageSize = 20,
}: OrderListProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: "order_number",
        header: "Order #",
        cell: ({ row }) => (
          <button
            onClick={() => onOrderClick?.(row.original)}
            className="font-medium text-blue-600 hover:underline"
          >
            {row.original.order_number}
          </button>
        ),
      },
      {
        accessorKey: "buyer.email",
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.buyer?.name || "N/A"}</div>
            <div className="text-sm text-gray-500">{row.original.buyer?.email}</div>
          </div>
        ),
      },
      {
        accessorKey: "event.title",
        header: "Event",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.event?.title || "N/A"}</div>
            {row.original.event?.start_at && (
              <div className="text-sm text-gray-500">
                {new Date(row.original.event.start_at).toLocaleDateString()}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "amount_cents",
        header: "Amount",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {formatCurrency(row.original.amount_cents)}
            </div>
            {row.original.fee_cents > 0 && (
              <div className="text-sm text-gray-500">
                Fee: {formatCurrency(row.original.fee_cents)}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={statusColors[row.original.status]}>
            {row.original.status.replace("_", " ")}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => (
          <div>
            <div>{new Date(row.original.created_at).toLocaleDateString()}</div>
            <div className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(row.original.created_at), {
                addSuffix: true,
              })}
            </div>
          </div>
        ),
      },
    ],
    [onOrderClick]
  );

  const table = useReactTable({
    data: orders,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount: Math.ceil(totalCount / pageSize),
  });

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search orders..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={(columnFilters.find((f) => f.id === "status")?.value as string[])?.join(",") || "all"}
            onValueChange={(value) => {
              if (value === "all") {
                setColumnFilters((prev) => prev.filter((f) => f.id !== "status"));
              } else {
                setColumnFilters((prev) => [
                  ...prev.filter((f) => f.id !== "status"),
                  { id: "status", value: value.split(",") },
                ]);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? "Loading..." : "No orders found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-gray-700">
          Showing {table.getState().pagination.pageIndex * pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * pageSize,
            totalCount
          )}{" "}
          of {totalCount} orders
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}