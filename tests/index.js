"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
require('source-map-support').install();
const query_1 = require("./query");
const live_query_1 = require("./live-query");
describe('AncientSouls/PostgreSQL:', () => {
    query_1.default();
    live_query_1.default();
});
//# sourceMappingURL=index.js.map