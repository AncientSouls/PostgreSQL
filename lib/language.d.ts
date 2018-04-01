import { IExp, EExpType, TExpWhat, TExpFrom, TExpWhere, IExpValue, IExpComparison, EExpComparisonType, IExpCondition, EExpConditionType, IExpPath } from './query';
export declare class COMPARISONS {
    static EQ(a: any, b: any): COMPARISON;
    static NOT(a: any, b: any): COMPARISON;
    static GT(a: any, b: any): COMPARISON;
    static GTE(a: any, b: any): COMPARISON;
    static LT(a: any, b: any): COMPARISON;
    static LTE(a: any, b: any): COMPARISON;
    static IN(a: any, ...b: any[]): COMPARISON;
    static BETWEEN(a: any, b: any, c: any): COMPARISON;
    static LIKE(a: any, b: any): COMPARISON;
    static EXISTS(a: any): COMPARISON;
    static NULL(a: any): COMPARISON;
}
export declare class COMPARISON implements IExpComparison {
    type: EExpComparisonType;
    values: IExpValue[][];
    constructor(type: EExpComparisonType, values: IExpValue[][]);
    not: any;
    NOT(): this;
}
export declare class CONDITIONS {
    static AND(...conds: (IExpCondition | IExpComparison)[]): CONDITION;
    static OR(...conds: (IExpCondition | IExpComparison)[]): CONDITION;
}
export declare class CONDITION implements IExpCondition {
    type: EExpConditionType;
    conditions: any[];
    comparisons: any[];
    constructor(type: EExpConditionType, conds: any[]);
}
export declare class ExpPath implements IExpPath {
    alias: any;
    field: any;
    constructor(a: any, b?: any);
    VALUE(): VALUE;
}
export declare const PATH: (a: any, b?: any) => ExpPath;
export declare class VALUES {
    static DATA(exp: any): VALUE;
    static PATH(a: any, b?: any): VALUE;
    static SELECT(exp: any): VALUE;
}
export declare class VALUE implements IExpValue {
    data: any;
    path: any;
    exp: any;
    as: any;
    constructor(key: string, exp: any);
    AS(as: string): this;
}
export declare class ExpSelect implements IExp {
    type: EExpType;
    what: any[];
    WHAT(...what: TExpWhat): this;
    from: any[];
    FROM(...from: TExpFrom): this;
    where: any;
    WHERE(where: TExpWhere): this;
    group: any;
    GROUP(...group: IExpPath[]): this;
    order: any;
    ORDER(path: IExpPath, order?: boolean): this;
    offset: any;
    OFFSET(offset: number): this;
    limit: any;
    LIMIT(limit: number): this;
    VALUE(): VALUE;
}
export declare const SELECT: (...what: any[]) => ExpSelect;
export declare class ExpUnion implements IExp {
    type: EExpType;
    selects: IExp[];
    constructor(type: EExpType, selects: IExp[]);
    VALUE(): VALUE;
}
export declare const UNION: (...selects: IExp[]) => ExpUnion;
export declare const UNIONALL: (...selects: IExp[]) => ExpUnion;
