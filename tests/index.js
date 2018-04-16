"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
require('source-map-support').install();
const babilon_1 = require("./babilon");
const adapter_1 = require("./adapter");
describe('AncientSouls/PostgreSQL:', () => {
    if (!process.env.DEVELOP) {
        it('wait pg docker', (done) => {
            setTimeout(() => done(), 4000);
        });
    }
    babilon_1.default();
    adapter_1.default();
});
//# sourceMappingURL=index.js.map