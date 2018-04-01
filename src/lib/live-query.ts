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

import {
  Query,
  TQuery,
  IQuery,
  IQueryEventsList,
} from './query';

export type TLiveQuery = ILiveQuery<IQueryEventsList>;
export interface ILiveQuery<IEL extends IQueryEventsList>
extends IQuery<IEL> {
  _id(table: string): string;
  createLiveQuery(): string;
}

export function mixin<T extends TClass<IInstance>>(
  superClass: T,
): any {
  return class LiveQuery extends superClass {
    IExpSelect(exp) {
      if (this._selectsContext > 1) throw new Error(`Sub selects not allowed in live query.`);
      return super.IExpSelect(exp);
    }

    _id(table) {
      return 'id';
    }

    createLiveQuery() {
      const result = [];
      _.each(this._selects, (select) => {
        _.each(select.exp.from, (from) => {
          const alias = from.alias || from.table;
          result.push(`(${this._select({
            ...select._sql,
            what: `${this.TExpData(alias)} as table, "${alias}"."${this._id(from.table)}" as id`,
          })})`);
        });
      });
      return result.join(` union `);
    }
  };
}

export const MixedLiveQuery: TClass<TLiveQuery> = mixin(Query);
export class LiveQuery extends MixedLiveQuery {}

export const liveQuery = (exp) => {
  const q = new LiveQuery();
  q.IExp(exp);
  return q.createLiveQuery();
};
