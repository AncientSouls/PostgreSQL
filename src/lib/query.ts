import * as _ from 'lodash';
import { assert } from 'chai';

import {
  TClass,
  IInstance,
} from 'ancient-mixins/lib/mixins';

// "key"
export type TKey = string;

// "field"
export type TField = [TKey];

 // "field"."field"
export type TColumn = [TKey,TKey];

 // "field"
 // "field"."field"
export type TPath = TField | TColumn;

export type TData = boolean | number | string;

// "field"
// "field"."field"
// (select)
// "field" as "field"
// "field"."field" as "field"
// (select) as "field"
export interface IValue {
  path?: TPath;
  data?: TData;
  select?: ISelect;
  as?: TKey;
}

// "field"
// "field"."field"
// "field" as "field"
// "field"."field" as "field"
export interface IAlias {
  table?: TKey;
  as?: TKey;
}

// *
// "field",
// "field"."field",
// (select),
// "field" as "field",
// "field"."field" as "field",
// (select) as "field"
export type TWhat = IValue[]|undefined;

// *
// "field",
// "field"."field",
// "field" as "field",
// "field"."field" as "field",
export type TFrom = IAlias[]|undefined;

export type TComparisonType = '=' | '!=' | '>' | '>=' | '<' | '<=' |
'in' | 'between' | 'like' | 'exists' | 'null';

export interface IComparison {
  type?: TComparisonType;
  values: IValue[][];
  not?: boolean;
}

export type TConditionType = 'and' | 'or';

export interface ICondition {
  type: TConditionType;
  conditions?: ICondition[];
  comparisons?: IComparison[];
}

export type TWhere = ICondition;

// select
export interface ISelect {
  what?: TWhat;
  from?: TFrom;
  where?: TWhere;
  limit?: number;
  offset?: number;
}

export class Query {
  constructor(
    public parentQuery?,
  ) {
    if (parentQuery) {
      this.values = parentQuery.values;
      this.tables = Object.create(parentQuery.tables);
      this.aliases = Object.create(parentQuery.aliases);
    }
  }

  values: string[] = [];
  tables: { [alias: string]: string[] } = {};
  aliases: { [table: string]: string } = {};
  subqueries: Query[] = [];
  SubQuery = Query;

  all(): string {
    return '*';
  }

  key(exp: TKey): string {
    return `"${exp}"`;
  }

  as(a: string, b: string): string {
    assert.isString(a);
    assert.isString(a);
    return `${a} as ${b}`;
  }

  field(exp: TField): string {
    assert.isArray(exp);
    assert.isString(exp[0]);
    return `"${exp[0]}"`;
  }

  column(exp: TColumn): string {
    assert.isArray(exp);
    assert.isString(exp[0]);
    assert.isString(exp[1]);
    return `"${exp[0]}"."${exp[1]}"`;
  }

  path(exp: TPath): string {
    assert.isArray(exp);
    if (exp.length === 1) return this.field(exp);
    if (exp.length === 2) return this.column(exp);
    throw new Error(`Unexpected TPath: ${JSON.stringify(exp)}`);
  }

  data(data): string {
    if (_.isNumber(data) || _.isBoolean(data)) return data.toString();
    if (_.isString(data)) {
      this.values.push(data);
      return `$${this.values.length}`;
    }
    throw new Error(`Unexpected TData: ${data}`);
  }

  value(exp: IValue): string {
    let value;
    if (_.has(exp, 'data')) value = this.data(exp.data);
    else if (_.has(exp, 'path')) value = this.path(exp.path);
    else if (_.has(exp, 'select')) value = `(${this.subselect(exp.select)})`;
    else throw new Error(`Unexpected IValue: ${JSON.stringify(exp)}`);

    if (_.has(exp, 'as')) return this.as(value, this.key(exp.as));
    return value;
  }

  alias(exp: IAlias): string {
    let table;
    if (_.has(exp, 'table')) table = this.key(exp.table);
    else throw new Error(`Unexpected IAlias: ${JSON.stringify(exp)}`);

    _.set(this.tables, exp.table, _.get(this.tables, exp.table, []));

    if (_.has(exp, 'as')) {
      this.tables[exp.table].push(exp.as);
      _.set(this.aliases, exp.as, exp.table);
      return this.as(table, this.key(exp.as));
    }

    _.set(this.aliases, exp.table, exp.table);
    return table;
  }
  
  what(exp?: TWhat): string {
    if (_.isUndefined(exp)) return this.all();
    if (_.isArray(exp)) {
      if (!exp.length) return this.all();
      return _.map(exp, exp => this.value(exp)).join(',');
    }
    
    throw new Error(`Unexpected TWrat: ${JSON.stringify(exp)}`);
  }
  
  from(exp?: TFrom): string {
    if (_.isArray(exp) && exp.length) {
      return _.map(exp, exp => this.alias(exp)).join(',');
    }
    
    throw new Error(`Unexpected TFrom: ${JSON.stringify(exp)}`);
  }

  comparison(exp?: IComparison): string {
    assert.isArray(exp.values);

    let result = '';
    if (_.isString(exp.type)) {
      if (_.includes(['=', '!=', '>', '>=', '<', '<='], exp.type)) {
        assert.lengthOf(exp.values, 2);
        assert.lengthOf(exp.values[0], 1);
        assert.lengthOf(exp.values[1], 1);
        result += `${this.value(exp.values[0][0])} ${exp.type} ${this.value(exp.values[1][0])}`;
      } else if (exp.type === 'in') {
        assert.lengthOf(exp.values, 2);
        assert.lengthOf(exp.values[0], 1);
        result += `${this.value(exp.values[0][0])} ${exp.type} `;
        result += `(${
          _.map(exp.values[1], exp => this.value(exp)).join(',')
        })`;
      } else if (exp.type === 'between') {
        assert.lengthOf(exp.values, 2);
        assert.lengthOf(exp.values[0], 1);
        result += `${this.value(exp.values[0][0])} ${exp.type} `;
        assert.lengthOf(exp.values[1], 2);
        result += `${this.value(exp.values[1][0])} and ${this.value(exp.values[1][1])}`;
      } else if (exp.type === 'like') {
        assert.lengthOf(exp.values, 2);
        assert.lengthOf(exp.values[0], 1);
        result += `${this.value(exp.values[0][0])} ${exp.type} `;
        assert.lengthOf(exp.values[1], 1);
        result += `${this.value(exp.values[1][0])}`;
      } else if (exp.type === 'exists') {
        assert.lengthOf(exp.values, 1);
        assert.lengthOf(exp.values[0], 1);
        result += `${this.value(exp.values[0][0])}`;
        result = `${exp.not ? `not ` : ''}exists ${result}`; 
      } else if (exp.type === 'null') {
        assert.lengthOf(exp.values, 1);
        assert.lengthOf(exp.values[0], 1);
        result += `${this.value(exp.values[0][0])}`;
        result = `${result} is ${exp.not ? `not ` : ''} null`; 
      } else {
        throw new Error(`Unexpected IComparison ${exp}`);
      }
    } else {
      assert.lengthOf(exp.values, 1);
      assert.lengthOf(exp.values[0], 1);
      result += `${this.value(exp.values[0][0])}`;
    }
    return result;
  }

  condition(exp?: ICondition): string {
    assert.include(['and', 'or'], exp.type);
    const result = [];
    if (_.isArray(exp.conditions)) {
      result.push(..._.map(exp.conditions, exp => `(${this.condition(exp)})`));
    }
    if (_.isArray(exp.comparisons)) {
      result.push(..._.map(exp.comparisons, exp => `(${this.comparison(exp)})`));
    }
    if (!result.length) throw new Error('ICondition can not be empty.');
    return result.join(` ${exp.type} `);
  }
  
  where(exp?: TWhere): string {
    return this.condition(exp);
  }
  
  select(exp: ISelect): string {
    assert.isObject(exp);
    
    let result = 'select';

    result += ` ${this.what(exp.what)}`;
    result += ` from ${this.from(exp.from)}`;
    if (_.isObject(exp.where)) {
      result += ` where ${this.where(exp.where)}`;
    }
    if (_.isNumber(exp.offset)) {
      result += ` offset ${exp.offset}`;
    }
    if (_.isNumber(exp.limit)) {
      result += ` limit ${exp.limit}`;
    }

    return result;
  }

  subselect(exp: ISelect): string {
    const query = new this.SubQuery(this);
    this.subqueries.push(query);
    return query.select(exp);
  }
}
