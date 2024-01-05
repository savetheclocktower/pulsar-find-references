type RowData = {
    separator: boolean;
    line?: string;
    lineNumber?: number;
    matchLineNumber?: number;
};
export declare class LeadingContextRow {
    group: ResultRowGroup;
    rowOffset: number;
    data: RowData;
    lineNumber: number;
    constructor(rowGroup: ResultRowGroup, line: string, separator: boolean, matchLineNumber: number, rowOffset: number);
}
export declare class TrailingContextRow {
    group: ResultRowGroup;
    rowOffset: number;
    data: RowData;
    lineNumber: number;
    constructor(rowGroup: ResultRowGroup, line: string, separator: boolean, matchLineNumber: number, rowOffset: number);
}
export declare class ResultPathRow {
    group: ResultRowGroup;
    data: RowData;
    constructor(rowGroup: ResultRowGroup);
}
export declare class MatchRow {
    group: ResultRowGroup;
    data: RowData;
    constructor(rowGroup: ResultRowGroup, separator: boolean, lineNumber: number, matches: any);
}
export declare class ResultRowGroup {
    constructor();
}
export {};
