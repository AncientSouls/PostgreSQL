"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const validators_1 = require("ancient-babilon/lib/validators");
const rules_1 = require("ancient-babilon/lib/rules");
const rules_full_1 = require("./rules-full");
exports.resolverOptions = rules_full_1.resolverOptions;
exports.createResolver = rules_full_1.createResolver;
exports.types = _.cloneDeep(rules_full_1.types);
exports.rules = rules_1.createRules(exports.types);
exports.validate = validators_1.createValidate(exports.rules);
//# sourceMappingURL=rules-track.js.map