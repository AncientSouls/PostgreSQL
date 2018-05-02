import * as _ from 'lodash';
import * as randomstring from 'randomstring';

import { createValidate } from 'ancient-babilon/lib/validators';
import { createRules, IRules } from 'ancient-babilon/lib/rules';
import { IValidator } from 'ancient-babilon/lib/babilon';
import {
  types as defaultTypes,
  createResolver as _createResolver,
  resolverOptions as _resolverOptions,
} from 'ancient-babilon/lib/proto-sql';

export const types: any = _.cloneDeep(defaultTypes);

export const rules: IRules = createRules(types);
export const validate = createValidate(rules);

export const resolverOptions = {
  ..._resolverOptions,
  _column(name) {
    return `"${name}"`;
  },
  _constant() {
    return randomstring.generate({
      charset: 'alphabetic',
    });
  },
  data(last, flow) {
    if (_.isBoolean(last.exp[1]) || _.isNumber(last.exp[1])) {
      return last.exp[1].toString();
    }
    if (_.isString(last.exp[1])) {
      const constant = this._constant();
      return `$${constant}$${last.exp[1]}$${constant}$`;
    }
  },
};

export const createResolver = _createResolver;
