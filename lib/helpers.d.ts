import { TWhat, TFrom, TWhere, ISelect, ICondition, IComparison, IValue, TComparisonType, TConditionType } from './query';
export interface ISelectRest {
    limit?: number;
    offset?: number;
}
export declare class SELECT implements ISelect {
    constructor(...what: TWhat);
    what: any[];
    WHAT(...what: TWhat): this;
    from: any[];
    FROM(...from: TFrom): this;
    where: any;
    WHERE(where: TWhere): this;
    limit: any;
    LIMIT(limit: number): this;
    offset: any;
    OFFSET(offset: number): this;
    static EQ(a: IValue, b: IValue): COMPARISON;
    static NEQ(a: IValue, b: IValue): COMPARISON;
    static GT(a: IValue, b: IValue): COMPARISON;
    static GTE(a: IValue, b: IValue): COMPARISON;
    static LT(a: IValue, b: IValue): COMPARISON;
    static LTE(a: IValue, b: IValue): COMPARISON;
    static IN(a: IValue, ...b: IValue[]): COMPARISON;
    static BETWEEN(a: IValue, b: IValue, c: IValue): COMPARISON;
    static LIKE(a: IValue, b: IValue): COMPARISON;
    static EXISTS(a: IValue): COMPARISON;
    static NULL(a: IValue): COMPARISON;
    static AND(...conds: any[]): CONDITION;
    static OR(...conds: any[]): CONDITION;
}
export declare class CONDITION implements ICondition {
    type: TConditionType;
    conditions: any[];
    comparisons: any[];
    constructor(type: TConditionType, conds: any[]);
}
export declare class COMPARISON implements IComparison {
    type: TComparisonType;
    values: IValue[][];
    constructor(type: TComparisonType, values: IValue[][]);
    not: any;
    NOT(): void;
}
