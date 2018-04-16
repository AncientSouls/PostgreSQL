"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const randomstring = require("randomstring");
const proto_sql_1 = require("ancient-babilon/lib/proto-sql");
const validators_1 = require("ancient-babilon/lib/validators");
const rules_1 = require("ancient-babilon/lib/rules");
exports.rules = _.cloneDeep(rules_1.rules);
exports.validators = validators_1.createValidators(exports.rules);
exports.resolverOptions = Object.assign({}, proto_sql_1.resolverOptions, { _column(name) {
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
    } });
exports.createResolver = proto_sql_1.createResolver;
//# sourceMappingURL=rules-full.js.map