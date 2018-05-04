export declare class Triggers {
    _tracks: string;
    _iu: string;
    _d: string;
    _t: string;
    tracksTableInit(ram: any): string;
    tracksTableDeinit(): string;
    tracksFunctionInit(): string;
    tracksFunctionDeinit(): string;
    tracksTriggerInit(): string;
    tracksTriggerDeinit(): string;
    insertUpdateFunctionInit(): string;
    insertUpdateFunctionDeinit(): string;
    deleteFunctionInit(): string;
    deleteFunctionDeinit(): string;
    truncateFunctionInit(): string;
    truncateFunctionDeinit(): string;
    init(ram?: boolean): string;
    deinit(): string;
    wrap(table: any): string;
    unwrap(table: any): string;
}
