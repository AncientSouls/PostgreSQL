export declare type TKey = string;
export declare type TField = [TKey];
export declare type TColumn = [TKey, TKey];
export declare type TPath = TField | TColumn;
export declare type TData = boolean | number | string;
export interface IValue {
    path?: TPath;
    data?: TData;
    select?: ISelect;
    as?: TKey;
}
export interface IAlias {
    table?: TKey;
    as?: TKey;
}
export declare type TWhat = IValue[] | undefined;
export declare type TFrom = IAlias[] | undefined;
export interface IComparison {
    type?: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'between' | 'like';
    values: IValue[][];
    modifier?: 'not' | 'is null' | 'is not null';
}
export interface ICondition {
    type: 'and' | 'or';
    conditions?: ICondition[];
    comparisons?: IComparison[];
}
export declare type TWhere = ICondition;
export interface ISelect {
    what?: TWhat;
    from: TFrom;
    where?: TWhere;
}
export declare class Query {
    values: string[];
    all(): string;
    key(exp: TKey): string;
    as(a: string, b: string): string;
    field(exp: TField): string;
    column(exp: TColumn): string;
    path(exp: TPath): string;
    data(data: any): string;
    value(exp: IValue): string;
    alias(exp: IAlias): string;
    what(exp?: TWhat): string;
    from(exp?: TFrom): string;
    comparison(exp?: IComparison): string;
    condition(exp?: ICondition): string;
    where(exp?: TWhere): string;
    select(exp: ISelect): string;
}
