"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const query_1 = require("../lib/query");
const helpers_1 = require("../lib/helpers");
function default_1() {
    describe('Query:', () => {
        it('TData', () => {
            const q = new query_1.Query();
            chai_1.assert.equal(q.data(true), 'true');
            chai_1.assert.equal(q.data(123), '123');
            chai_1.assert.equal(q.data('123'), '$1');
            chai_1.assert.deepEqual(q.values, ['123']);
        });
        it('IValue', () => {
            const q = new query_1.Query();
            chai_1.assert.equal(q.value({ data: true }), 'true');
            chai_1.assert.equal(q.value({ data: 123 }), '123');
            chai_1.assert.equal(q.value({ data: '123' }), '$1');
            chai_1.assert.equal(q.value({ path: ['a'] }), '"a"');
            chai_1.assert.equal(q.value({ path: ['a', 'b'] }), '"a"."b"');
            chai_1.assert.equal(q.value({ path: ['a'], as: 'c' }), '"a" as "c"');
            chai_1.assert.equal(q.value({ path: ['a', 'b'], as: 'c' }), '"a"."b" as "c"');
            chai_1.assert.equal(q.value({ select: new helpers_1.SELECT().FROM({ table: 'a' }) }), '(select * from "a")');
        });
        it('IAlias', () => {
            const q = new query_1.Query();
            chai_1.assert.equal(q.alias({ table: 'a' }), '"a"');
            chai_1.assert.equal(q.alias({ table: 'a', as: 'c' }), '"a" as "c"');
        });
        it('TWhat', () => {
            const q = new query_1.Query();
            chai_1.assert.equal(q.what(), '*');
            chai_1.assert.equal(q.what([]), '*');
            chai_1.assert.equal(q.what([{ data: true }]), 'true');
            chai_1.assert.equal(q.what([{ data: 123 }]), '123');
            chai_1.assert.equal(q.what([{ data: '123' }]), '$1');
            chai_1.assert.equal(q.what([{ path: ['a'] }]), '"a"');
            chai_1.assert.equal(q.what([{ path: ['a', 'b'] }]), '"a"."b"');
            chai_1.assert.equal(q.what([{ path: ['a'], as: 'c' }]), '"a" as "c"');
            chai_1.assert.equal(q.what([{ path: ['a', 'b'], as: 'c' }]), '"a"."b" as "c"');
        });
        it('TFrom', () => {
            const q = new query_1.Query();
            chai_1.assert.throw(() => q.from());
            chai_1.assert.throw(() => q.from([]));
            chai_1.assert.equal(q.from([{ table: 'a' }]), '"a"');
            chai_1.assert.equal(q.from([{ table: 'a', as: 'c' }]), '"a" as "c"');
            chai_1.assert.deepEqual(q.tables, { a: ['c'] });
        });
        it('IComparison', () => {
            const q = new query_1.Query();
            const com = (exp, equal) => chai_1.assert.equal(q.comparison(exp), equal);
            com({ values: [[{ data: 'a' }]] }, '$1');
            com({ type: '=', values: [[{ path: ['a', 'b'] }], [{ data: 'a' }]] }, '"a"."b" = $2');
            com({ type: 'in', values: [[{ path: ['a', 'b'] }], [{ data: 'a' }, { data: 'b' }]] }, '"a"."b" in ($3,$4)');
            com({ type: 'between', values: [[{ path: ['a', 'b'] }], [{ data: 'a' }, { data: 'b' }]] }, '"a"."b" between $5 and $6');
            com({ type: 'like', values: [[{ path: ['a', 'b'] }], [{ data: 'a' }]] }, '"a"."b" like $7');
            com({ values: [[{ select: new helpers_1.SELECT().FROM({ table: 'a' }) }]], type: 'exists', not: true }, 'not exists (select * from "a")');
        });
        it('ICondition', () => {
            const q = new query_1.Query();
            const con = (exp, equal) => chai_1.assert.equal(q.condition(exp), equal);
            con(helpers_1.SELECT.AND(helpers_1.SELECT.AND(helpers_1.SELECT.EQ({ path: ['a', 'b'] }, { data: 'a' }), helpers_1.SELECT.GT({ data: 123 }, { path: ['x', 'y'] })), helpers_1.SELECT.EQ({ path: ['a', 'b'] }, { data: 'a' }), helpers_1.SELECT.GT({ data: 123 }, { path: ['x', 'y'] })), '(("a"."b" = $1) and (123 > "x"."y")) and ("a"."b" = $2) and (123 > "x"."y")');
        });
        it('ISelect', () => {
            const q = new query_1.Query();
            const sel = (exp, equal) => chai_1.assert.equal(q.select(exp), equal);
            chai_1.assert.deepEqual(q.tables, {});
            chai_1.assert.deepEqual(q.aliases, {});
            sel(new helpers_1.SELECT()
                .FROM({ table: 'a' })
                .WHERE(helpers_1.SELECT.AND(helpers_1.SELECT.EQ({ path: ['a', 'b'] }, { data: 'a' }), helpers_1.SELECT.GT({ data: 123 }, { path: ['x', 'y'] }))), 'select * from "a" where ("a"."b" = $1) and (123 > "x"."y")');
            chai_1.assert.deepEqual(q.tables, { a: [] });
        });
    });
}
exports.default = default_1;
//# sourceMappingURL=query.js.map