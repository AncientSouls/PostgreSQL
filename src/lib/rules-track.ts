import * as _ from 'lodash';
import * as randomstring from 'randomstring';

import { createValidate } from 'ancient-babilon/lib/validators';
import { createRules, IRules } from 'ancient-babilon/lib/rules';
import { IValidator } from 'ancient-babilon/lib/babilon';

import {
  types as defaultTypes,
  rules as defaultRules,
  resolverOptions,
  createResolver,
} from './rules-full';

export const types: any = _.cloneDeep(defaultTypes);

export const rules: IRules = createRules(types);
export const validate = createValidate(rules);

export {
  resolverOptions,
  createResolver,
};
