import * as _ from 'lodash';
import * as randomstring from 'randomstring';

import {
  createResolver as _createResolver,
  resolverOptions as _resolverOptions,
} from 'ancient-babilon/lib/proto-sql';
import { createValidators } from 'ancient-babilon/lib/validators';
import { rules as _rules, IRules } from 'ancient-babilon/lib/rules';

export const rules = _.cloneDeep(_rules);
rules.types.get = ['!data','!variable','!path',':logic',':check',':operator'];

export const validators = createValidators(rules);

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
