import { TClass, IInstance } from 'ancient-mixins/lib/mixins';
import { INode, INodeEventsList } from 'ancient-mixins/lib/node';
export declare type TParam = string;
export interface IExpPath {
    field: string;
    alias?: string;
}
export declare type TExpData = boolean | number | string;
export interface IExpValue {
    data?: TExpData;
    path?: IExpPath;
    exp?: IExp;
    as?: string;
}
export interface IExpAlias {
    table?: string;
    as?: string;
}
export declare enum EExpComparisonType {
    EQ = "=",
    NOT = "!=",
    GT = ">",
    GTE = ">=",
    LT = "<",
    LTE = "<=",
    IN = "in",
    BETWEEN = "between",
    LIKE = "like",
    EXISTS = "exists",
    NULL = "null",
}
export declare enum EExpConditionType {
    AND = "and",
    OR = "or",
}
export interface IExpComparison {
    type?: EExpComparisonType;
    values: IExpValue[][];
    not?: boolean;
}
export interface IExpCondition {
    type: EExpConditionType;
    conditions?: IExpCondition[];
    comparisons?: IExpComparison[];
}
export declare type TExpContent = TExpData | IExpValue;
export declare type TExpWhat = TExpContent[] | undefined;
export declare type TExpFrom = IExpAlias[];
export declare type TExpWhere = IExpCondition;
export declare enum EExpOrder {
    ASC = "asc",
    DESC = "desc",
}
export interface IExpOrder extends IExpPath {
    order?: EExpOrder;
}
export declare enum EExpType {
    SELECT = "select",
    UNION = "union",
    UNIONALL = "union all",
}
export declare type TExpGroup = IExpPath[];
export declare type TExpOrder = EExpOrder[];
export interface IExp {
    type: EExpType;
    what?: TExpWhat;
    from?: TExpFrom;
    where?: TExpWhere;
    group?: TExpGroup;
    order?: TExpOrder;
    offset?: number;
    limit?: number;
    selects?: IExp[];
}
export declare enum EParsing {
    waiting = 0,
    parsing = 1,
    parsed = 2,
}
export interface IQueryEventsList extends INodeEventsList {
}
export declare type TQuery = IQuery<IQueryEventsList>;
export interface IQuery<IEL extends IQueryEventsList> extends INode<IEL> {
    params: string[];
    addParam(value: string): TParam;
    IExp(exp: IExp): void;
    IExpSelect(exp: IExp): void;
}
export declare function mixin<T extends TClass<IInstance>>(superClass: T): any;
export declare const MixedQuery: TClass<TQuery>;
export declare class Query extends MixedQuery {
}
