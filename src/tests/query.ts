import { assert } from 'chai';
import * as _ from 'lodash';

import { Query } from '../lib/query';
import { SELECT } from '../lib/helpers';

export default function () {
  describe('Query:', () => {
    it('TData', () => {
      const q = new Query();
      assert.equal(q.data(true), 'true');
      assert.equal(q.data(123), '123');
      assert.equal(q.data('123'), '$1');
      assert.deepEqual(q.values, ['123']);
    });
    it('IValue', () => {
      const q = new Query();
      assert.equal(q.value({ data: true }), 'true');
      assert.equal(q.value({ data: 123 }), '123');
      assert.equal(q.value({ data: '123' }), '$1');
      assert.equal(q.value({ path: ['a'] }), '"a"');
      assert.equal(q.value({ path: ['a','b'] }), '"a"."b"');
      assert.equal(q.value({ path: ['a'], as: 'c' }), '"a" as "c"');
      assert.equal(q.value({ path: ['a','b'], as: 'c' }), '"a"."b" as "c"');
      assert.equal(q.value({ select: new SELECT().FROM({ table: 'a' }) }), '(select * from "a")');
    });
    it('IAlias', () => {
      const q = new Query();
      assert.equal(q.alias({ table: 'a' }), '"a"');
      assert.equal(q.alias({ table: 'a', as: 'c' }), '"a" as "c"');
    });
    it('TWhat', () => {
      const q = new Query();
      assert.equal(q.what(), '*');
      assert.equal(q.what([]), '*');
      assert.equal(q.what([{ data: true }]), 'true');
      assert.equal(q.what([{ data: 123 }]), '123');
      assert.equal(q.what([{ data: '123' }]), '$1');
      assert.equal(q.what([{ path: ['a'] }]), '"a"');
      assert.equal(q.what([{ path: ['a','b'] }]), '"a"."b"');
      assert.equal(q.what([{ path: ['a'], as: 'c' }]), '"a" as "c"');
      assert.equal(q.what([{ path: ['a','b'], as: 'c' }]), '"a"."b" as "c"');
    });
    it('TFrom', () => {
      const q = new Query();
      assert.throw(() => q.from());
      assert.throw(() => q.from([]));
      assert.equal(q.from([{ table: 'a' }]), '"a"');
      assert.equal(q.from([{ table: 'a', as: 'c' }]), '"a" as "c"');
      assert.deepEqual(q.tables, { a: ['c'] });
    });
    it('IComparison', () => {
      const q = new Query();
      const com = (exp, equal) => assert.equal(q.comparison(exp), equal);
      com({ values: [[{ data: 'a' }]] }, '$1');
      com({ type: '=', values: [[{ path: ['a','b'] }], [{ data: 'a' }]] }, '"a"."b" = $2');
      com(
        { type: 'in', values: [[{ path: ['a','b'] }], [{ data: 'a' }, { data: 'b' }]] },
        '"a"."b" in ($3,$4)',
      );
      com(
        { type: 'between', values: [[{ path: ['a','b'] }], [{ data: 'a' }, { data: 'b' }]] },
        '"a"."b" between $5 and $6',
      );
      com(
        { type: 'like', values: [[{ path: ['a','b'] }], [{ data: 'a' }]] },
        '"a"."b" like $7',
      );
      com(
        { values: [[{ select: new SELECT().FROM({ table: 'a' }) }]], type: 'exists', not: true },
        'not exists (select * from "a")',
      );
    });
    it('ICondition', () => {
      const q = new Query();
      const con = (exp, equal) => assert.equal(q.condition(exp), equal);
      con(
        SELECT.AND(
          SELECT.AND(
            SELECT.EQ({ path: ['a','b'] }, { data: 'a' }),
            SELECT.GT({ data: 123 }, { path: ['x','y'] }),
          ),
          SELECT.EQ({ path: ['a','b'] }, { data: 'a' }),
          SELECT.GT({ data: 123 }, { path: ['x','y'] }),
        ),
        '(("a"."b" = $1) and (123 > "x"."y")) and ("a"."b" = $2) and (123 > "x"."y")',
      );
    });
    it('ISelect', () => {
      const q = new Query();
      const sel = (exp, equal) => assert.equal(q.select(exp), equal);
      assert.deepEqual(q.tables, {});
      assert.deepEqual(q.aliases, {});
      sel(
        new SELECT()
        .FROM({ table: 'a' })
        .WHERE(
          SELECT.AND(
            SELECT.EQ({ path: ['a','b'] }, { data: 'a' }),
            SELECT.GT({ data: 123 }, { path: ['x','y'] }),
          ),
        ),
        'select * from "a" where ("a"."b" = $1) and (123 > "x"."y")',
      );
      assert.deepEqual(q.tables, { a: [] });
    });
  });
}
