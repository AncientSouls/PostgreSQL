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
export declare type TComparisonType = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'between' | 'like' | 'exists' | 'null';
export interface IComparison {
    type?: TComparisonType;
    values: IValue[][];
    not?: boolean;
}
export declare type TConditionType = 'and' | 'or';
export interface ICondition {
    type: TConditionType;
    conditions?: ICondition[];
    comparisons?: IComparison[];
}
export declare type TWhere = ICondition;
export interface ISelect {
    what?: TWhat;
    from?: TFrom;
    where?: TWhere;
    limit?: number;
    offset?: number;
}
export declare class Query {
    parentQuery: any;
    constructor(parentQuery?: any);
    values: string[];
    tables: {
        [alias: string]: string[];
    };
    aliases: {
        [table: string]: string;
    };
    subqueries: Query[];
    SubQuery: typeof Query;
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
    subselect(exp: ISelect): string;
}
