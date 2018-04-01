"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const query_1 = require("./query");
function mixin(superClass) {
    return class LiveQuery extends superClass {
        IExpSelect(exp) {
            if (this._selectsContext > 1)
                throw new Error(`Sub selects not allowed in live query.`);
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
                    result.push(`(${this._select(Object.assign({}, select._sql, { what: `${this.TExpData(alias)} as table, "${alias}"."${this._id(from.table)}" as id` }))})`);
                });
            });
            return result.join(` union `);
        }
    };
}
exports.mixin = mixin;
exports.MixedLiveQuery = mixin(query_1.Query);
class LiveQuery extends exports.MixedLiveQuery {
}
exports.LiveQuery = LiveQuery;
exports.liveQuery = (exp) => {
    const q = new LiveQuery();
    q.IExp(exp);
    return q.createLiveQuery();
};
//# sourceMappingURL=live-query.js.map