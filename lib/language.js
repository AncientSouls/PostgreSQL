"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const query_1 = require("./query");
const toValue = (x) => {
    if (x instanceof ExpPath)
        return x.VALUE();
    if (x instanceof ExpSelect)
        return x.VALUE();
    return x;
};
class COMPARISONS {
    static EQ(a, b) {
        return new COMPARISON(query_1.EExpComparisonType.EQ, [[toValue(a)], [toValue(b)]]);
    }
    static NOT(a, b) {
        return new COMPARISON(query_1.EExpComparisonType.NOT, [[toValue(a)], [toValue(b)]]);
    }
    static GT(a, b) {
        return new COMPARISON(query_1.EExpComparisonType.GT, [[toValue(a)], [toValue(b)]]);
    }
    static GTE(a, b) {
        return new COMPARISON(query_1.EExpComparisonType.GTE, [[toValue(a)], [toValue(b)]]);
    }
    static LT(a, b) {
        return new COMPARISON(query_1.EExpComparisonType.LT, [[toValue(a)], [toValue(b)]]);
    }
    static LTE(a, b) {
        return new COMPARISON(query_1.EExpComparisonType.LTE, [[toValue(a)], [toValue(b)]]);
    }
    static IN(a, ...b) {
        return new COMPARISON(query_1.EExpComparisonType.IN, [[toValue(a)], _.map(b, b => toValue(b))]);
    }
    static BETWEEN(a, b, c) {
        return new COMPARISON(query_1.EExpComparisonType.BETWEEN, [[toValue(a)], [toValue(b), toValue(c)]]);
    }
    static LIKE(a, b) {
        return new COMPARISON(query_1.EExpComparisonType.LIKE, [[toValue(a)], [toValue(b)]]);
    }
    static EXISTS(a) {
        return new COMPARISON(query_1.EExpComparisonType.EXISTS, [[toValue(a)]]);
    }
    static NULL(a) {
        return new COMPARISON(query_1.EExpComparisonType.NULL, [[toValue(a)]]);
    }
}
exports.COMPARISONS = COMPARISONS;
class COMPARISON {
    constructor(type, values) {
        this.type = type;
        this.values = values;
        this.not = undefined;
    }
    NOT() {
        this.not = true;
        return this;
    }
}
exports.COMPARISON = COMPARISON;
class CONDITIONS {
    static AND(...conds) {
        return new CONDITION(query_1.EExpConditionType.AND, conds);
    }
    static OR(...conds) {
        return new CONDITION(query_1.EExpConditionType.OR, conds);
    }
}
exports.CONDITIONS = CONDITIONS;
class CONDITION {
    constructor(type, conds) {
        this.type = type;
        this.conditions = [];
        this.comparisons = [];
        _.each(conds, (c) => {
            if (c instanceof CONDITION)
                return this.conditions.push(c);
            if (c instanceof COMPARISON)
                return this.comparisons.push(c);
            throw new Error(`Invalid IExpCondition|IExpComparison: ${JSON.stringify(c)}`);
        });
    }
}
exports.CONDITION = CONDITION;
class ExpPath {
    constructor(a, b) {
        if (!_.isString(b)) {
            this.field = a;
        }
        else {
            this.alias = a;
            this.field = b;
        }
    }
    VALUE() {
        return new VALUE('path', this);
    }
}
exports.ExpPath = ExpPath;
exports.PATH = (a, b) => {
    return new ExpPath(a, b);
};
class VALUES {
    static DATA(exp) {
        return new VALUE('data', exp);
    }
    static PATH(a, b) {
        return exports.PATH(a, b).VALUE();
    }
    static SELECT(exp) {
        return exports.SELECT(exp).VALUE();
    }
}
exports.VALUES = VALUES;
class VALUE {
    constructor(key, exp) {
        this[key] = exp;
    }
    AS(as) {
        this.as = as;
        return this;
    }
}
exports.VALUE = VALUE;
class ExpSelect {
    constructor() {
        this.type = query_1.EExpType.SELECT;
        this.what = [];
        this.from = [];
        this.where = undefined;
        this.group = undefined;
        this.order = undefined;
        this.offset = undefined;
        this.limit = undefined;
    }
    WHAT(...what) {
        this.what = _.map(what, what => toValue(what));
        return this;
    }
    FROM(...from) {
        this.from = from;
        return this;
    }
    WHERE(where) {
        this.where = where;
        return this;
    }
    GROUP(...group) {
        this.group = group;
        return this;
    }
    ORDER(path, order = true) {
        if (!this.order)
            this.order = [];
        this.order.push(Object.assign({}, path, { order: order ? query_1.EExpOrder.ASC : query_1.EExpOrder.DESC }));
        return this;
    }
    OFFSET(offset) {
        this.offset = offset;
        return this;
    }
    LIMIT(limit) {
        this.limit = limit;
        return this;
    }
    VALUE() {
        return new VALUE('exp', this);
    }
}
exports.ExpSelect = ExpSelect;
exports.SELECT = (...what) => new ExpSelect().WHAT(...what);
exports.UNION = (...selects) => ({ selects, type: query_1.EExpType.UNION });
exports.UNIONALL = (...selects) => ({ selects, type: query_1.EExpType.UNIONALL });
//# sourceMappingURL=language.js.map