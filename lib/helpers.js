"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
class SELECT {
    constructor(...what) {
        this.what = [];
        this.from = [];
        this.where = undefined;
        this.limit = undefined;
        this.offset = undefined;
        this.WHAT(...what);
    }
    WHAT(...what) {
        this.what = what;
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
    LIMIT(limit) {
        this.limit = limit;
        return this;
    }
    OFFSET(offset) {
        this.offset = offset;
        return this;
    }
    static EQ(a, b) {
        return new COMPARISON('=', [[a], [b]]);
    }
    static NEQ(a, b) {
        return new COMPARISON('!=', [[a], [b]]);
    }
    static GT(a, b) {
        return new COMPARISON('>', [[a], [b]]);
    }
    static GTE(a, b) {
        return new COMPARISON('>=', [[a], [b]]);
    }
    static LT(a, b) {
        return new COMPARISON('<', [[a], [b]]);
    }
    static LTE(a, b) {
        return new COMPARISON('<=', [[a], [b]]);
    }
    static IN(a, ...b) {
        return new COMPARISON('in', [[a], b]);
    }
    static BETWEEN(a, b, c) {
        return new COMPARISON('between', [[a], [b, c]]);
    }
    static LIKE(a, b) {
        return new COMPARISON('like', [[a], [b]]);
    }
    static EXISTS(a) {
        return new COMPARISON('exists', [[a]]);
    }
    static NULL(a) {
        return new COMPARISON('null', [[a]]);
    }
    static AND(...conds) {
        return new CONDITION('and', conds);
    }
    static OR(...conds) {
        return new CONDITION('or', conds);
    }
}
exports.SELECT = SELECT;
class CONDITION {
    constructor(type, conds) {
        this.type = type;
        this.conditions = [];
        this.comparisons = [];
        _.each(conds, (c) => {
            if (c instanceof CONDITION)
                this.conditions.push(c);
            if (c instanceof COMPARISON)
                this.comparisons.push(c);
        });
    }
}
exports.CONDITION = CONDITION;
class COMPARISON {
    constructor(type, values) {
        this.type = type;
        this.values = values;
        this.not = undefined;
    }
    NOT() {
        this.not = true;
    }
}
exports.COMPARISON = COMPARISON;
//# sourceMappingURL=helpers.js.map