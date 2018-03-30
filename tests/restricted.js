"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const restricted_1 = require("../lib/restricted");
const helpers_1 = require("../lib/helpers");
class TestRestricted extends restricted_1.Restricted {
    _generateRestrictionsAlias() {
        return 'rest';
    }
}
function default_1() {
    describe('Restricted:', () => {
        it('ISelect', () => {
            const q = new TestRestricted();
            q._subjects([{ id: 7, table: 'nodes' }]);
            const sel = (exp, equal) => chai_1.assert.equal(q.select(exp), equal);
            chai_1.assert.deepEqual(q.tables, {});
            chai_1.assert.deepEqual(q.aliases, {});
            sel(new helpers_1.SELECT()
                .FROM({ table: 'a' })
                .WHERE(helpers_1.SELECT.AND(helpers_1.SELECT.EQ({ path: ['a', 'b'] }, { data: 'a' }), helpers_1.SELECT.GT({ data: 123 }, { path: ['x', 'y'] }))), `select * from "a" where (("a"."b" = $1) and (123 > "x"."y")) ` +
                `and exists (select * from "restrictions" as "rest" where (("subjectId" = 7) ` +
                `and ("subjectTable" = $2) and ("objectId" = "a"."id") ` +
                `and ("objectTable" = $3)))`);
            chai_1.assert.deepEqual(q.tables, { a: [] });
        });
    });
}
exports.default = default_1;
//# sourceMappingURL=restricted.js.map