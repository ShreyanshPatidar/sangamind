---
name: datagrid-helper
description: Help configure and debug the Indas DataGrid (indas-ui/datagrid, and Estimo's in-repo original) with 30+ features including row selection, column freezing, search, filtering, export, virtualization, and performance optimization. Use when user mentions DataGrid, table, grid, row selection, column issues, search not working, export, pagination, or grid performance problems.
when_to_use: Use for any problem or change in a data grid or table built on the Indas DataGrid (Oric, Estimo, indas-ui): row selection not working, ids not matching, columns, frozen columns, filters, search, export, card view, slow grid, before reading the grid code.
---

# DataGrid Helper

Where it lives depends on the project:
- Apps on the published library (Oric): `import { DataGrid } from 'indas-ui/datagrid'`, usually behind an
  app adapter (Oric: `src/components/ui/data-grid.tsx` - use the adapter, not the library directly)
- Indas Estimo: the in-repo original, `src/components/datagrid/` (docs: its `README.md`)

Rules below come from Estimo; where a project's own rules differ (Oric wraps business data in
`<DataText>` and has its own translation layer), the project's rules win.

---

## Critical Rules

```typescript
// 1. getRowId MUST return string — numeric IDs break selectedRowIds matching
getRowId={(row) => String(row.MachineID)}   // ✅
getRowId={(row) => row.MachineID}            // ❌ returns number

// 2. Column headers MUST use t()
const { t } = useLanguage()
const columns = useMemo(() => [
  { accessorKey: 'name', header: t('Name') },
  { accessorKey: 'status', header: t('Status') },
], [t])

// 3. Wrap columns in useMemo, callbacks in useCallback — prevents re-renders
const columns = useMemo(() => [...columnDefs], [t, handleEdit])
const handleEdit = useCallback((row) => { ... }, [session])
```

---

## Feature Reference

### Row Selection
```typescript
<DataGrid
  enableRowSelection={true}
  rowSelectionMode="multi"          // or "single"
  getRowId={(row) => String(row.id)}
  selectedRowIds={selectedIds}      // string[] — must match getRowId type
  onRowSelect={(rows) => setSelectedRows(rows)}
/>
```

### Search
```typescript
// Global search
<DataGrid enableSearch={true} globalFilter={searchTerm} onGlobalFilterChange={setSearchTerm} />

// Column-specific (Baccha search)
<DataGrid enableBacchaSearch={true} mainColumns="processName,itemName" />
```

### Column Freezing
```typescript
<DataGrid enableColumnFreezing={true} frozenColumns={['id', 'name']} />
```

### Date Filter
```typescript
<DataGrid
  enableDateFilter={true}
  dateFrom={startDate} dateTo={endDate}
  onDateRangeChange={(from, to) => { setStartDate(from); setEndDate(to) }}
/>
```

### Performance (large datasets)
```typescript
<DataGrid enableVirtualization={true} enablePagination={true} pageSize={50} />
```

### Compact (modal/dialog use)
```typescript
<DataGrid compactMode={true} compactHeader={true} />
```

### Export
```typescript
<DataGrid enableExport={true} exportFileName="report-name" />
```

### All/Selected View Toggle
```typescript
const [viewMode, setViewMode] = useState<'all' | 'selected'>('all')

const displayData = useMemo(() =>
  viewMode === 'selected' ? data.filter(r => selectedIds.includes(String(r.id))) : data
, [viewMode, data, selectedIds])

<DataGrid
  data={displayData}
  enableViewToggle={true}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  enableRowReordering={viewMode === 'selected'}
  onRowOrderChange={handleReorder}
/>
```

### Custom Cell Rendering
```typescript
{
  accessorKey: 'status',
  header: t('Status'),
  cell: ({ getValue }) => {
    const val = getValue() as string
    return <span className={val === 'active' ? 'text-[rgb(var(--color-success))]' : 'text-[rgb(var(--color-error))]'}>{val}</span>
  }
}
```

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Pre-selected rows not highlighted | `getRowId` returns number, `selectedRowIds` has strings | Wrap with `String()` in `getRowId` |
| Grid not refreshing after data change | Missing stable `key` or unstable column refs | Add `key="stable-key"`, wrap columns in `useMemo` |
| Search finds nothing | `enableSearch` not set or filter state not wired | Add `globalFilter` + `onGlobalFilterChange` |
| Slow with large data | No virtualization | Add `enableVirtualization={true} enablePagination={true}` |
| Re-renders on every keystroke | Columns/callbacks recreated each render | `useMemo` for columns, `useCallback` for handlers |

---

## Debugging (temporary — delete before commit)

```typescript
// Check data shape
console.log('rows:', data.length, 'sample:', data[0])
// Check ID types
console.log('rowId type:', typeof data[0]?.id, 'selectedIds type:', typeof selectedIds[0])
```
