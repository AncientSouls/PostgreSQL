"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
require('source-map-support').install();
const babilon_1 = require("./babilon");
const client_1 = require("./client");
const asketic_1 = require("./asketic");
describe('AncientSouls/PostgreSQL:', () => {
    babilon_1.default();
    client_1.default();
    asketic_1.default();
});
//# sourceMappingURL=index.js.map