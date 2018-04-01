import * as _ from 'lodash';
import { assert } from 'chai';

import {
  IExp,
  EExpType,
  TExpWhat,
  TExpFrom,
  TExpWhere,
  IExpValue,
  IExpComparison,
  EExpComparisonType,
  IExpCondition,
  EExpConditionType,
  IExpPath,
  EExpOrder,
} from './query';

const toValue = (x) => {
  if (x instanceof ExpPath) return x.VALUE();
  if (x instanceof ExpSelect) return x.VALUE();
  return x;
};

export class COMPARISONS {
  static EQ(a, b) {
    return new COMPARISON(EExpComparisonType.EQ, [[toValue(a)], [toValue(b)]]);
  }
  static NOT(a, b) {
    return new COMPARISON(EExpComparisonType.NOT, [[toValue(a)], [toValue(b)]]);
  }
  static GT(a, b) {
    return new COMPARISON(EExpComparisonType.GT, [[toValue(a)], [toValue(b)]]);
  }
  static GTE(a, b) {
    return new COMPARISON(EExpComparisonType.GTE, [[toValue(a)], [toValue(b)]]);
  }
  static LT(a, b) {
    return new COMPARISON(EExpComparisonType.LT, [[toValue(a)], [toValue(b)]]);
  }
  static LTE(a, b) {
    return new COMPARISON(EExpComparisonType.LTE, [[toValue(a)], [toValue(b)]]);
  }
  static IN(a, ...b) {
    return new COMPARISON(EExpComparisonType.IN, [[toValue(a)], _.map(b, b => toValue(b))]);
  }
  static BETWEEN(a, b, c) {
    return new COMPARISON(EExpComparisonType.BETWEEN, [[toValue(a)], [toValue(b),toValue(c)]]);
  }
  static LIKE(a, b) {
    return new COMPARISON(EExpComparisonType.LIKE, [[toValue(a)], [toValue(b)]]);
  }
  static EXISTS(a) {
    return new COMPARISON(EExpComparisonType.EXISTS, [[toValue(a)]]);
  }
  static NULL(a) {
    return new COMPARISON(EExpComparisonType.NULL, [[toValue(a)]]);
  }
}

export class COMPARISON implements IExpComparison {
  constructor(
    public type: EExpComparisonType,
    public values: IExpValue[][],
  ) {}
  
  not = undefined;
  NOT() {
    this.not = true;
    return this;
  }
}

export class CONDITIONS {
  static AND(...conds: (IExpCondition|IExpComparison)[]) {
    return new CONDITION(EExpConditionType.AND, conds);
  }
  static OR(...conds: (IExpCondition|IExpComparison)[]) {
    return new CONDITION(EExpConditionType.OR, conds);
  }
}

export class CONDITION implements IExpCondition {
  public conditions = [];
  public comparisons = [];

  constructor(
    public type: EExpConditionType,
    conds: any[],
  ) {
    _.each(conds, (c) => {
      if (c instanceof CONDITION) return this.conditions.push(c);
      if (c instanceof COMPARISON) return this.comparisons.push(c);
      throw new Error(`Invalid IExpCondition|IExpComparison: ${JSON.stringify(c)}`);
    });
  }
}

export class ExpPath implements IExpPath {
  public alias;
  public field;

  constructor(a, b?) {
    if (!_.isString(b)) {
      this.field = a;
    } else {
      this.alias = a;
      this.field = b;
    }
  }

  VALUE() {
    return new VALUE('path', this);
  }

  AS(as: string) {
    return this.VALUE().AS(as);
  }
}

export const PATH = (a, b?) => {
  return new ExpPath(a, b);
};

export class VALUES {
  static DATA(exp) {
    return new VALUE('data', exp);
  }
  static PATH(a, b?) {
    return PATH(a, b).VALUE();
  }
  static SELECT(exp) {
    return SELECT(exp).VALUE();
  }
}

export class VALUE implements IExpValue {
  public data;
  public path;
  public exp;
  public as;

  constructor(key: string, exp: any) {
    this[key] = exp;
  }

  AS(as: string) {
    this.as = as;
    return this;
  }
}

export class ExpSelect implements IExp {
  type = EExpType.SELECT;

  what = [];
  WHAT(...what: TExpWhat) {
    this.what = _.map(what, what => toValue(what));
    return this;
  }
  from = [];
  FROM(...from: TExpFrom) {
    this.from = from;
    return this;
  }
  where = undefined;
  WHERE(where: TExpWhere) {
    this.where = where;
    return this;
  }
  group = undefined;
  GROUP(...group: IExpPath[]) {
    this.group = group;
    return this;
  }
  order = undefined;
  ORDER(path: IExpPath, order: boolean = true) {
    if (!this.order) this.order = [];
    this.order.push({
      ...path,
      order: order ? EExpOrder.ASC : EExpOrder.DESC,
    });
    return this;
  }
  offset = undefined;
  OFFSET(offset: number) {
    this.offset = offset;
    return this;
  }
  limit = undefined;
  LIMIT(limit: number) {
    this.limit = limit;
    return this;
  }
  VALUE() {
    return new VALUE('exp', this);
  }
  
  AS(as: string) {
    return this.VALUE().AS(as);
  }
}

export const SELECT = (...what) => new ExpSelect().WHAT(...what);

export class ExpUnion implements IExp {
  constructor(
    public type: EExpType,
    public selects: IExp[],
  ) {}

  VALUE() {
    return new VALUE('exp', this);
  }

  AS(as: string) {
    return this.VALUE().AS(as);
  }
}

export const UNION = (...selects: IExp[]) => {
  return new ExpUnion(EExpType.UNION, selects);
};
export const UNIONALL = (...selects: IExp[]) => {
  return new ExpUnion(EExpType.UNIONALL, selects);
};
