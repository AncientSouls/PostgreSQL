"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const query_1 = require("./query");
function mixin(superClass) {
    return class Query extends superClass {
    };
}
exports.mixin = mixin;
exports.MixedQueryAll = mixin(query_1.Query);
class QueryAll extends exports.MixedQueryAll {
}
exports.QueryAll = QueryAll;
//# sourceMappingURL=query-all.js.map