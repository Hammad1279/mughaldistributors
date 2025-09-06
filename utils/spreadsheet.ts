import { GridData } from '../types';

// --- Range Parser for Charts ---
export interface Range {
    start: { row: number; col: number };
    end: { row: number; col: number };
}

const colLetterToNumber = (colStr: string): number => {
    return colStr.toUpperCase().split('').reduce((acc, char) => {
        return acc * 26 + char.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    }, 0) - 1;
};

const parseCellId = (cellId: string): { row: number, col: number } | null => {
    const match = cellId.trim().match(/([A-Z]+)(\d+)/i);
    if (!match) return null;
    
    const col = colLetterToNumber(match[1]);
    const row = parseInt(match[2], 10) - 1;

    if (isNaN(col) || isNaN(row) || col < 0 || row < 0) return null;
    
    return { row, col };
};

export const parseRange = (rangeStr: string): Range | null => {
    if (!rangeStr || typeof rangeStr !== 'string') return null;

    const parts = rangeStr.split(':');
    const start = parseCellId(parts[0]);
    const end = parts.length > 1 ? parseCellId(parts[1]) : start;

    if (!start || !end) return null;

    // Ensure start is top-left and end is bottom-right
    const startRow = Math.min(start.row, end.row);
    const startCol = Math.min(start.col, end.col);
    const endRow = Math.max(start.row, end.row);
    const endCol = Math.max(start.col, end.col);

    return {
        start: { row: startRow, col: startCol },
        end: { row: endRow, col: endCol },
    };
};

export const getValuesFromRange = (grid: GridData, range: Range): (string | number)[] => {
    const values: (string | number)[] = [];
    if (!grid || !range) return values;

    for (let r = range.start.row; r <= range.end.row; r++) {
        for (let c = range.start.col; c <= range.end.col; c++) {
            if (grid[r] && grid[r][c]) {
                values.push(grid[r][c].value);
            }
        }
    }
    return values;
};