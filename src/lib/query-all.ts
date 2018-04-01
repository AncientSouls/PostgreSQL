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
} from './query';

export function mixin<T extends TClass<IInstance>>(
  superClass: T,
): any {
  return class Query extends superClass {
    
  };
}

export const MixedQueryAll: TClass<TQuery> = mixin(Query);
export class QueryAll extends MixedQueryAll {}
