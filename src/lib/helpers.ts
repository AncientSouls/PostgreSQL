import * as _ from 'lodash';
import { assert } from 'chai';

import {
  TClass,
  IInstance,
} from 'ancient-mixins/lib/mixins';

import {
  TWhat,
  TFrom,
  TWhere,
  ISelect,
  IAlias,
  ICondition,
  IComparison,
  IValue,
  TComparisonType,
  TConditionType,
} from './query';

export interface ISelectRest {
  limit?: number;
  offset?: number;
}

export class SELECT implements ISelect {
  constructor(...what: TWhat) {
    this.WHAT(...what);
  }

  what = [];
  WHAT(...what: TWhat) {
    this.what = what;
    return this;
  }
  from = [];
  FROM(...from: TFrom) {
    this.from = from;
    return this;
  }
  where = undefined;
  WHERE(where: TWhere) {
    this.where = where;
    return this;
  }
  limit = undefined;
  LIMIT(limit: number) {
    this.limit = limit;
    return this;
  }
  offset = undefined;
  OFFSET(offset: number) {
    this.offset = offset;
    return this;
  }

  static EQ(a: IValue, b: IValue) {
    return new COMPARISON('=', [[a], [b]]);
  }
  static NEQ(a: IValue, b: IValue) {
    return new COMPARISON('!=', [[a], [b]]);
  }
  static GT(a: IValue, b: IValue) {
    return new COMPARISON('>', [[a], [b]]);
  }
  static GTE(a: IValue, b: IValue) {
    return new COMPARISON('>=', [[a], [b]]);
  }
  static LT(a: IValue, b: IValue) {
    return new COMPARISON('<', [[a], [b]]);
  }
  static LTE(a: IValue, b: IValue) {
    return new COMPARISON('<=', [[a], [b]]);
  }
  static IN(a: IValue, ...b: IValue[]) {
    return new COMPARISON('in', [[a], b]);
  }
  static BETWEEN(a: IValue, b: IValue, c: IValue) {
    return new COMPARISON('between', [[a], [b,c]]);
  }
  static LIKE(a: IValue, b: IValue) {
    return new COMPARISON('like', [[a], [b]]);
  }
  static EXISTS(a: IValue) {
    return new COMPARISON('exists', [[a]]);
  }
  static NULL(a: IValue) {
    return new COMPARISON('null', [[a]]);
  }

  static AND(...conds) {
    return new CONDITION('and', conds);
  }
  static OR(...conds) {
    return new CONDITION('or', conds);
  }
}

export class CONDITION implements ICondition {
  public conditions = [];
  public comparisons = [];

  constructor(
    public type: TConditionType,
    conds: any[],
  ) {
    _.each(conds, (c) => {
      if (c instanceof CONDITION) this.conditions.push(c);
      if (c instanceof COMPARISON) this.comparisons.push(c);
    });
  }
}

export class COMPARISON implements IComparison {
  constructor(
    public type: TComparisonType,
    public values: IValue[][],
  ) {}
  
  not = undefined;
  NOT() {
    this.not = true;
  }
}
