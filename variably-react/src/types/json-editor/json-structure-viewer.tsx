// src/components/JSONEditor/JSONStructureViewer.tsx
import * as React from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"

interface JSONStructureViewerProps {
  data: unknown
  title?: string
}

// Data table types
export type JSONTableRow = {
  id: string
  key: string
  path: string
  value: string
  type: string
  depth: number
  hasChildren: boolean
}

// Convert JSON to flat table data
function flattenJSON(
  data: unknown,
  path = '',
  depth = 0,
  expandedNodes: Set<string> = new Set()
): JSONTableRow[] {
  const rows: JSONTableRow[] = []
  
  if (data === null) {
    rows.push({
      id: path || 'root',
      key: path || 'root',
      path: path || 'root',
      value: 'null',
      type: 'null',
      depth,
      hasChildren: false,
    })
    return rows
  }
  
  if (Array.isArray(data)) {
    rows.push({
      id: path || 'root',
      key: path || 'root',
      path: path || 'root',
      value: `Array(${data.length})`,
      type: 'array',
      depth,
      hasChildren: data.length > 0,
    })
    
    if (expandedNodes.has(path || 'root')) {
      data.forEach((item, index) => {
        const childPath = path ? `${path}[${index}]` : `[${index}]`
        rows.push(...flattenJSON(item, childPath, depth + 1, expandedNodes))
      })
    }
    return rows
  }
  
  if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data as Record<string, unknown>)
    rows.push({
      id: path || 'root',
      key: path || 'root',
      path: path || 'root',
      value: `Object(${keys.length})`,
      type: 'object',
      depth,
      hasChildren: keys.length > 0,
    })
    
    if (expandedNodes.has(path || 'root')) {
      keys.forEach((key) => {
        const childPath = path ? `${path}.${key}` : key
        const childValue = (data as Record<string, unknown>)[key]
        rows.push(...flattenJSON(childValue, childPath, depth + 1, expandedNodes))
      })
    }
    return rows
  }
  
  rows.push({
    id: path || 'root',
    key: path || 'root',
    path: path || 'root',
    value: typeof data === 'string' ? `"${data}"` : String(data),
    type: typeof data,
    depth,
    hasChildren: false,
  })
  
  return rows
}

// Data table columns definition
const columns: ColumnDef<JSONTableRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "key",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Key
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const depth = row.original.depth
      return (
        <div className="flex items-center" style={{ paddingLeft: `${depth * 20}px` }}>
          <span className="font-mono">{row.getValue("key")}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "value",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Value
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-mono">{row.getValue("value")}</div>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.getValue("type")}
      </Badge>
    ),
  },
  {
    accessorKey: "depth",
    header: "Depth",
    cell: ({ row }) => <div className="text-right">{row.getValue("depth")}</div>,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const jsonRow = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(jsonRow.path)}
            >
              Copy path
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(jsonRow.value)}
            >
              Copy value
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function renderJSONNode(
  key: string, 
  value: unknown, 
  depth: number, 
  expandedNodes: Set<string>,
  onToggle: (path: string) => void,
  path = ''
): React.ReactNode {
  const currentPath = path ? `${path}.${key}` : key
  const isExpanded = expandedNodes.has(currentPath)
  
  if (value === null) {
    return (
      <div key={currentPath} className="flex items-center py-1" style={{ paddingLeft: `${depth * 20}px` }}>
        <File className="h-3 w-3 text-gray-400 mr-2" />
        <span className="text-sm font-mono">{key}:</span>
        <span className="text-sm text-muted-foreground italic ml-2">null</span>
      </div>
    )
  }
  
  if (Array.isArray(value)) {
    const hasChildren = value.length > 0
    return (
      <div key={currentPath}>
        <div className="flex items-center py-1" style={{ paddingLeft: `${depth * 20}px` }}>
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 mr-1"
              onClick={() => onToggle(currentPath)}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          )}
          {hasChildren ? (
            isExpanded ? <FolderOpen className="h-4 w-4 text-green-500 mr-2" /> : <Folder className="h-4 w-4 text-green-500 mr-2" />
          ) : (
            <File className="h-3 w-3 text-gray-400 mr-2" />
          )}
          <span className="text-sm font-mono">{key}:</span>
          <Badge variant="secondary" className="ml-2 text-xs">Array({value.length})</Badge>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {value.map((item, index) => 
              renderJSONNode(`[${index}]`, item, depth + 1, expandedNodes, onToggle, currentPath)
            )}
          </div>
        )}
      </div>
    )
  }
  
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value as Record<string, unknown>)
    const hasChildren = keys.length > 0
    return (
      <div key={currentPath}>
        <div className="flex items-center py-1" style={{ paddingLeft: `${depth * 20}px` }}>
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 mr-1"
              onClick={() => onToggle(currentPath)}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          )}
          {hasChildren ? (
            isExpanded ? <FolderOpen className="h-4 w-4 text-blue-500 mr-2" /> : <Folder className="h-4 w-4 text-blue-500 mr-2" />
          ) : (
            <File className="h-3 w-3 text-gray-400 mr-2" />
          )}
          <span className="text-sm font-mono">{key}:</span>
          <Badge variant="default" className="ml-2 text-xs">Object({keys.length})</Badge>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {keys.map((childKey) => 
              renderJSONNode(
                childKey, 
                (value as Record<string, unknown>)[childKey], 
                depth + 1, 
                expandedNodes, 
                onToggle, 
                currentPath
              )
            )}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div key={currentPath} className="flex items-center py-1" style={{ paddingLeft: `${depth * 20}px` }}>
      <File className="h-3 w-3 text-gray-400 mr-2" />
      <span className="text-sm font-mono">{key}:</span>
      <span className="text-sm ml-2">
        {typeof value === 'string' ? `"${value}"` : String(value)}
      </span>
      <Badge variant="outline" className="ml-2 text-xs capitalize">{typeof value}</Badge>
    </div>
  )
}

// Data Table Component
function JSONDataTable({ data, expandedNodes }: { data: unknown; expandedNodes: Set<string> }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const tableData = React.useMemo(() => {
    return flattenJSON(data, '', 0, expandedNodes)
  }, [data, expandedNodes])

  const table = useReactTable({
    data: tableData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter keys..."
          value={(table.getColumn("key")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("key")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export function JSONStructureViewer({ data, title = "JSON Structure" }: JSONStructureViewerProps) {
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = React.useState<'tree' | 'table'>('tree')

  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tree')}
            >
              Tree View
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table View
            </Button>
          </div>
        </div>
        
        {viewMode === 'tree' ? (
          <div className="space-y-1">
            {renderJSONNode('root', data, 0, expandedNodes, toggleNode)}
          </div>
        ) : (
          <JSONDataTable data={data} expandedNodes={expandedNodes} />
        )}
      </CardContent>
    </Card>
  )
}