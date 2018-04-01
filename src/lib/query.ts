import * as _ from 'lodash';
import { assert } from 'chai';

import {
  TClass,
  IInstance,
} from 'ancient-mixins/lib/mixins';

import {
  Node,
  INode,
  INodeEventsList,
} from 'ancient-mixins/lib/node';

export type TParam = string;
export interface IExpPath {
  field: string;
  alias?: string;
}
export type TExpData = boolean | number | string;
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
export enum EExpComparisonType {
  EQ = '=',
  NOT = '!=',
  GT = '>',
  GTE = '>=',
  LT = '<',
  LTE = '<=',
  IN = 'in',
  BETWEEN = 'between',
  LIKE = 'like',
  EXISTS = 'exists',
  NULL = 'null',
}
export enum EExpConditionType {
  AND = 'and',
  OR = 'or',
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
export type TExpContent = TExpData | IExpValue;
export type TExpWhat = TExpContent[] | undefined;
export type TExpFrom = IExpAlias[];
export type TExpWhere = IExpCondition;
export enum EExpOrder {
  ASC = 'asc',
  DESC = 'desc',
}
export interface IExpOrder extends IExpPath {
  order?: EExpOrder;
}
export enum EExpType {
  SELECT = 'select',
  UNION = 'union',
  UNIONALL = 'union all',
}
export type TExpGroup = IExpPath[];
export type TExpOrder = IExpOrder[];
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

export enum EParsing {
  waiting,
  parsing,
  parsed,
}

export interface IQuerySelectSql {
  what?: string;
  from?: string;
  where?: string;
  group?: string;
  order?: string;
  offset?: string;
  limit?: string;
}
export interface IQuerySelect {
  exp?: IExp;
  sql?: string;
  _sql?: IQuerySelectSql;
}

export interface IQueryEventsList extends INodeEventsList {
}

export type TQuery = IQuery<IQueryEventsList>;
export interface IQuery<IEL extends IQueryEventsList>
extends INode<IEL> {
  _selects: IQuerySelect[];
  _selectsContext: IQuerySelect[];
  _tables: { [key: string]: string[] };

  ExpDataStringRegexp: RegExp;

  params: string[];
  addParam(value: string): TParam;

  _key(exp: string): string;
  _as(a: string, b: string): string;
  _select(_sql: IQuerySelectSql): string;

  TExpData(data: TExpData): string;
  IExpPath(exp: IExpPath): string;
  IExpValue(exp: IExpValue): string;
  TExpContent(exp): string;
  TExpWhat(exp?: TExpWhat): string;
  IExpAlias(exp: IExpAlias): string;
  TExpFrom(exp?: TExpFrom): string;
  IExpComparison(exp?: IExpComparison): string;
  IExpCondition(exp?: IExpCondition): string;
  TExpWhere(exp?: TExpWhere): string;
  TExpGroup(exp?: TExpGroup): string;
  TExpOrder(exp?: TExpOrder): string;
  IExpSelect(exp: IExp): string;
  IExpUnion(exp: IExp): string;
  IExp(exp: IExp): string;
}

export const ExpDataStringRegexp = /^[a-zA-Zа-яА-Я0-9]*$/; 

export function mixin<T extends TClass<IInstance>>(
  superClass: T,
): any {
  return class Query extends superClass {
    _selects = [];
    _selectsContext = [];
    _tables = {};

    ExpDataStringRegexp = ExpDataStringRegexp;

    params = [];
    addParam(data) {
      assert.isString(data);
      this.params.push(data);
      return `$${this.params.length}`;
    }

    _key(exp) {
      assert.isString(exp);
      return `"${exp}"`;
    }

    _as(a, b) {
      assert.isString(a);
      assert.isString(a);
      return `${a} as ${b}`;
    }

    _select(_sql) {
      let sql = `select ${_sql.what} from ${_sql.from}`;
      if (_sql.where) sql += ` where ${_sql.where}`;
      if (_sql.group) sql += ` group by ${_sql.group}`;
      if (_sql.order) sql += ` order by ${_sql.order}`;
      if (_sql.offset) sql += ` offset ${_sql.offset}`;
      if (_sql.limit) sql += ` limit ${_sql.limit}`;
      return sql;
    }

    TExpData(data) {
      if (_.isNumber(data) || _.isBoolean(data)) return data.toString();
      if (_.isString(data)) {
        if (this.ExpDataStringRegexp.test(data)) {
          return `'${data}'`;
        }
        return this.addParam(data);
      }
      throw new Error(`Unexpected TExpData: ${data}`);
    }

    IExpPath(exp) {
      assert.isObject(exp);
      return `${exp.alias ? `${this._key(exp.alias)}.` : ''}${this._key(exp.field)}`;
    }

    IExpValue(exp) {
      let value;
      if (_.has(exp, 'data')) value = this.TExpData(exp.data);
      else if (_.has(exp, 'path')) value = this.IExpPath(exp.path);
      else if (_.has(exp, 'exp')) value = `(${this.IExp(exp.exp)})`;
      else throw new Error(`Unexpected IExpValue: ${JSON.stringify(exp)}`);
  
      if (_.has(exp, 'as')) return this._as(value, this._key(exp.as));
      return value;
    }

    TExpContent(exp) {
      if (_.isObject(exp)) return this.IExpValue(exp);
      return this.TExpData(exp);
    }

    TExpWhat(exp) {
      if (_.isUndefined(exp)) return '*';
      if (_.isArray(exp)) {
        if (!exp.length) return '*';
        return _.map(exp, exp => this.TExpContent(exp)).join(',');
      }
      
      throw new Error(`Unexpected TExpWrat: ${JSON.stringify(exp)}`);
    }

    IExpAlias(exp) {
      let table;
      if (_.has(exp, 'table')) table = this._key(exp.table);
      else throw new Error(`Unexpected IExpAlias: ${JSON.stringify(exp)}`);

      this._tables[exp.table] = this._tables[exp.table] || [];
      
      if (_.has(exp, 'as')) {
        this._tables[exp.table].push(exp.as);
        return this._as(table, this._key(exp.as));
      }

      return table;
    }

    TExpFrom(exp) {
      if (_.isArray(exp) && exp.length) {
        return _.map(exp, exp => this.IExpAlias(exp)).join(',');
      }

      throw new Error(`Unexpected TExpFrom: ${JSON.stringify(exp)}`);
    }

    IExpComparison(exp?) {
      assert.isArray(exp.values);
  
      let result = '';
      if (_.isString(exp.type)) {
        if (_.includes(['=', '!=', '>', '>=', '<', '<='], exp.type)) {
          assert.lengthOf(exp.values, 2);
          assert.lengthOf(exp.values[0], 1);
          assert.lengthOf(exp.values[1], 1);
          result += `${
            this.IExpValue(exp.values[0][0])
          } ${exp.type} ${
            this.IExpValue(exp.values[1][0])
          }`;
        } else if (exp.type === 'in') {
          assert.lengthOf(exp.values, 2);
          assert.lengthOf(exp.values[0], 1);
          result += `${this.IExpValue(exp.values[0][0])} ${exp.type} `;
          result += `(${
            _.map(exp.values[1], exp => this.IExpValue(exp)).join(',')
          })`;
        } else if (exp.type === 'between') {
          assert.lengthOf(exp.values, 2);
          assert.lengthOf(exp.values[0], 1);
          result += `${this.IExpValue(exp.values[0][0])} ${exp.type} `;
          assert.lengthOf(exp.values[1], 2);
          result += `${this.IExpValue(exp.values[1][0])} and ${this.IExpValue(exp.values[1][1])}`;
        } else if (exp.type === 'like') {
          assert.lengthOf(exp.values, 2);
          assert.lengthOf(exp.values[0], 1);
          result += `${this.IExpValue(exp.values[0][0])} ${exp.type} `;
          assert.lengthOf(exp.values[1], 1);
          result += `${this.IExpValue(exp.values[1][0])}`;
        } else if (exp.type === 'exists') {
          assert.lengthOf(exp.values, 1);
          assert.lengthOf(exp.values[0], 1);
          result += `${this.IExpValue(exp.values[0][0])}`;
          result = `${exp.not ? `not ` : ''}exists ${result}`; 
        } else if (exp.type === 'null') {
          assert.lengthOf(exp.values, 1);
          assert.lengthOf(exp.values[0], 1);
          result += `${this.IExpValue(exp.values[0][0])}`;
          result = `${result} is ${exp.not ? `not ` : ''} null`; 
        } else {
          throw new Error(`Unexpected IExpComparison ${exp}`);
        }
      } else {
        assert.lengthOf(exp.values, 1);
        assert.lengthOf(exp.values[0], 1);
        result += `${this.IExpValue(exp.values[0][0])}`;
      }
      return result;
    }

    IExpCondition(exp?) {
      assert.include([EExpConditionType.AND, EExpConditionType.OR], exp.type);
      const result = [];
      if (_.isArray(exp.conditions)) {
        result.push(..._.map(exp.conditions, exp => `(${this.IExpCondition(exp)})`));
      }
      if (_.isArray(exp.comparisons)) {
        result.push(..._.map(exp.comparisons, exp => `(${this.IExpComparison(exp)})`));
      }
      if (!result.length) throw new Error('IExpCondition can not be empty.');
      return result.join(` ${exp.type} `);
    }
  
    TExpWhere(exp?) {
      return this.IExpCondition(exp);
    }
  
    TExpGroup(exp?) {
      if (_.isArray(exp) && exp.length) {
        return _.map(exp, exp => this.IExpPath(exp)).join(',');
      }

      throw new Error(`Unexpected TExpGroup: ${JSON.stringify(exp)}`);
    }

    TExpOrder(exp?) {
      if (_.isArray(exp) && exp.length) {
        return _.map(exp, (exp) => {
          const order = exp.order === EExpOrder.DESC ? ' DESC' : ' ASC';
          return this.IExpPath(exp) + order;
        }).join(',');
      }

      throw new Error(`Unexpected TExpOrder: ${JSON.stringify(exp)}`);
    }

    IExpSelect(exp) {
      assert.equal(exp.type, EExpType.SELECT);

      const _select: IQuerySelect = { exp };

      this._selectsContext.push(_select);

      _select._sql = {
        what: this.TExpWhat(exp.what),
        from: this.TExpFrom(exp.from),
      };
      
      if (exp.where) {
        _select._sql.where = this.TExpWhere(exp.where);
      }
      if (exp.group) {
        _select._sql.group = this.TExpGroup(exp.group);
      }
      if (exp.order) {
        _select._sql.order = this.TExpOrder(exp.order);
      }
      if (_.isNumber(exp.offset)) {
        _select._sql.offset = exp.offset;
      }
      if (_.isNumber(exp.limit)) {
        _select._sql.limit = exp.limit;
      }
      
      _select.sql = this._select(_select._sql);

      this._selects.push(_select);
      this._selectsContext.pop();

      return _select.sql;
    }

    IExpUnion(exp) {
      assert.include([EExpType.UNION, EExpType.UNIONALL], exp.type);
      assert.isArray(exp.selects);
      assert.isOk(exp.selects.length);

      return _.map(exp.selects, (exp) => {
        return `(${this.IExpSelect(exp)})`;
      }).join(` ${exp.type} `);
    }

    IExp(exp) {
      assert.isObject(exp);
      if (exp.type === EExpType.SELECT) {
        return this.IExpSelect(exp);
      }
      if (exp.type === EExpType.UNIONALL || exp.type === EExpType.UNION) {
        return this.IExpUnion(exp);
      }
      throw new Error(`Unexpected IExp.type: ${exp.type}`);
    }
  };
}

export const MixedQuery: TClass<TQuery> = mixin(Node);
export class Query extends MixedQuery {}
