import React from "react"
import { DataGrid } from "@mui/x-data-grid"
import type { GridColDef } from "@mui/x-data-grid"

type TableProps<D> = TableState & {

    // data itself
    columns: TableColumn<D>[] // the ordered set of columns
    data: D[] // array of rows

    // called whenever the state changes
    onStateChange: (state: TableState) => void;

    // page state -- only relevant for interface
    page: number; // zero-based page number
    total_pages: number; // the total number of pages, if known
    per_page: number; // number of elements per-page
    per_page_selection: number[]; // available options of per-page
}

export type TableColumn<D> = {
    key: React.Key; // key used to uniquely identify this header amongst the other set of columns
    Header: React.ComponentType<ColumnHeaderComponentProps<D>> // component used to render the header
    Cell: React.ComponentType<CellComponentProps<D>> // component used to render cells in this column
    width?: number; // optional column width in pixels
}

export type ColumnHeaderComponentProps<D> = {
    column: TableColumn<D>
}

export type CellComponentProps<D> = ColumnHeaderComponentProps<D> & {
    data: D,
}

export type TableState = {
    per_page: number;
    page: number;
}

/**
 * Table implements a fully controlled Table Component using MUI DataGrid (community edition).
 * Column resizing is enabled by default.
 */
export default function Table<D>({
    columns, data,
    page, total_pages, per_page, per_page_selection,
    onStateChange,
}: TableProps<D>) {
    const gridColumns: GridColDef[] = columns.map(col => {
        const HeaderComponent = col.Header
        const CellComponent = col.Cell
        return {
            field: String(col.key),
            width: col.width ?? 150,
            sortable: false,
            resizable: true,
            renderHeader: () => <HeaderComponent column={col} />,
            renderCell: (params) => <CellComponent column={col} data={params.row as D} />,
        }
    })

    const rowCount = total_pages > 0 ? total_pages * per_page : 0

    return (
        <DataGrid
            rows={data as any[]}
            columns={gridColumns}
            getRowId={(row: any) => row._id ?? row}
            rowCount={rowCount}
            paginationMode="server"
            paginationModel={{ page, pageSize: per_page }}
            onPaginationModelChange={(model) => onStateChange({ page: model.page, per_page: model.pageSize })}
            pageSizeOptions={per_page_selection}
            disableColumnMenu
            disableRowSelectionOnClick
            autoHeight
        />
    )
}
