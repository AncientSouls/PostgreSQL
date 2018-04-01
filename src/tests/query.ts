import { assert } from 'chai';
import * as _ from 'lodash';

import { Query, EExpOrder } from '../lib/query';
import * as l from '../lib/language';
const {
  SELECT,
  CONDITIONS: { AND, OR },
  COMPARISONS: { EQ,  NOT,  GT,  GTE,  LT,  LTE,  IN,  BETWEEN,  LIKE,  EXISTS,  NULL },
  VALUES: V,
  PATH,
  UNION,
  UNIONALL,
} = l;
const { DATA } = V;

const _t = (f, n) => `select ${f} from ${n}`;

const sel = (x, y) => SELECT(...(x ? [PATH(x)] : [])).FROM({ table: y });

export default function () {
  describe('Query:', () => {
    it('TExpData', () => {
      const q = new Query();
      assert.equal(q.TExpData(true), 'true');
      assert.equal(q.TExpData(123), '123');
      assert.equal(q.TExpData('123'), `'123'`);
      assert.equal(q.TExpData('"123'), '$1');
      assert.deepEqual(q.params, [`"123`]);
    });
    it('IExpValue', () => {
      const q = new Query();
      assert.equal(
        [
          q.IExpValue(DATA(true)),
          q.IExpValue(DATA(false).AS('a')),
          q.IExpValue(DATA(123)),
          q.IExpValue(DATA(123).AS('b')),
          q.IExpValue(DATA('123')),
          q.IExpValue(DATA('123').AS('c')),
          q.IExpValue(DATA('"123')),
          q.IExpValue(DATA('"123').AS('d')),
          q.IExpValue(PATH('a').VALUE()),
          q.IExpValue(PATH('a').AS('e')),
          q.IExpValue(PATH('a', 'b').VALUE()),
          q.IExpValue(PATH('a', 'b').AS('f')),
          q.IExpValue(sel('x','y').VALUE()),
          q.IExpValue(sel('x','y').AS('g')),
          q.IExpValue(UNION(
            sel(null, 'a'),
            sel(null, 'b'),
            sel(null, 'c'),
          ).VALUE()),
          q.IExpValue(UNIONALL(
            sel(null, 'a'),
            sel(null, 'b'),
            sel(null, 'c'),
          ).AS('g')),
        ],
        [
          `true`, `false as "a"`,
          `123`, `123 as "b"`,
          `'123'`, `'123' as "c"`,
          `$1`, `$2 as "d"`,
          `"a"`, `"a" as "e"`,
          `"a"."b"`, `"a"."b" as "f"`,
          `(${_t('"x"', '"y"')})`, `(${_t('"x"', '"y"')}) as "g"`,
          `((${_t('*','"a"')}) union (${_t('*','"b"')}) union (${_t('*','"c"')}))`,
          `((${_t('*','"a"')}) union all (${_t('*','"b"')}) union all (${_t('*','"c"')})) as "g"`,
        ].join(','),
      );
      _.map(q._selects, s => (delete s._sql,s));
      assert.deepEqual(q._selects, [
        { exp: sel('x','y'), sql: _t('"x"', '"y"') },
        { exp: sel('x','y'), sql: _t('"x"', '"y"') },
        { exp: sel(null,'a'), sql: _t('*', '"a"') },
        { exp: sel(null,'b'), sql: _t('*', '"b"') },
        { exp: sel(null,'c'), sql: _t('*', '"c"') },
        { exp: sel(null,'a'), sql: _t('*', '"a"') },
        { exp: sel(null,'b'), sql: _t('*', '"b"') },
        { exp: sel(null,'c'), sql: _t('*', '"c"') },
      ]);
    });
    it('IExpAlias', () => {
      const q = new Query();
      assert.equal(q.IExpAlias({ table: 'a' }), '"a"');
      assert.equal(q.IExpAlias({ table: 'a', as: 'c' }), '"a" as "c"');
    });
    it('IExpWhat', () => {
      const q = new Query();
      assert.equal(q.TExpWhat(), '*');
      assert.equal(q.TExpWhat([]), '*');
      assert.equal(
        q.TExpWhat([
          DATA(true),
          DATA(false).AS('a'),
          DATA(123),
          DATA(123).AS('b'),
          DATA('123'),
          DATA('123').AS('c'),
          DATA('"123'),
          DATA('"123').AS('d'),
          PATH('a').VALUE(),
          PATH('a').AS('e'),
          PATH('a', 'b').VALUE(),
          PATH('a', 'b').AS('f'),
          sel('x','y').VALUE(),
          sel('x','y').AS('g'),
          UNION(
            sel(null, 'a'),
            sel(null, 'b'),
            sel(null, 'c'),
          ).VALUE(),
          UNIONALL(
            sel(null, 'a'),
            sel(null, 'b'),
            sel(null, 'c'),
          ).AS('g'),
        ]),
        [
          `true`, `false as "a"`,
          `123`, `123 as "b"`,
          `'123'`, `'123' as "c"`,
          `$1`, `$2 as "d"`,
          `"a"`, `"a" as "e"`,
          `"a"."b"`, `"a"."b" as "f"`,
          `(${_t('"x"', '"y"')})`, `(${_t('"x"', '"y"')}) as "g"`,
          `((${_t('*','"a"')}) union (${_t('*','"b"')}) union (${_t('*','"c"')}))`,
          `((${_t('*','"a"')}) union all (${_t('*','"b"')}) union all (${_t('*','"c"')})) as "g"`,
        ].join(','),
      );
      assert.deepEqual(q.params, ['"123','"123']);
    });
    it('TExpFrom', () => {
      const q = new Query();
      assert.throw(() => q.TExpFrom());
      assert.throw(() => q.TExpFrom([]));
      assert.equal(q.TExpFrom([{ table: 'a' }]), '"a"');
      assert.equal(q.TExpFrom([{ table: 'a', as: 'c' }]), '"a" as "c"');
    });
    it('IExpComparison', () => {
      const q = new Query();
      const com = (exp, equal) => assert.equal(q.IExpComparison(exp), equal);
      assert.equal(q.IExpComparison({ values: [[DATA('a')]] }), `'a'`);
      assert.equal(
        q.IExpComparison(
          EQ(PATH('a', 'b'), DATA('a')),
        ),
        `"a"."b" = 'a'`,
      );
      assert.equal(
        q.IExpComparison(
          IN(PATH('a', 'b'), DATA('a'), DATA('b')),
        ),
        `"a"."b" in ('a','b')`,
      );
      assert.equal(
        q.IExpComparison(
          BETWEEN(PATH('a', 'b'), DATA('a'), DATA('b')),
        ),
        `"a"."b" between 'a' and 'b'`,
      );
      assert.equal(
        q.IExpComparison(
          LIKE(PATH('a', 'b'), DATA('a')),
        ),
        `"a"."b" like 'a'`,
      );
    });
    it('IExpCondition', () => {
      const q = new Query();
      assert.equal(
        q.IExpCondition(
          AND(
            OR(
              EQ(PATH('a', 'b'), DATA('a')),
              GT(DATA(123),PATH('x', 'y')),
            ),
            EQ(PATH('a', 'b'), DATA('a')),
            GT(DATA(123),PATH('x', 'y')),
          ),
        ),
        `(("a"."b" = 'a') or (123 > "x"."y")) and ("a"."b" = 'a') and (123 > "x"."y")`,
      );
    });
    it('TExpGroup', () => {
      const q = new Query();
      assert.equal(
        q.TExpGroup([PATH('a'), PATH('b','c')]),
        '"a","b"."c"',
      );
    });
    it('TExpOrder', () => {
      const q = new Query();
      assert.equal(
        q.TExpOrder([{ field: 'a' }, { alias: 'b', field: 'c', order: EExpOrder.DESC }]),
        '"a" ASC,"b"."c" DESC',
      );
    });
    it('IExpSelect', () => {
      const q = new Query();
      assert.equal(
        q.IExp(
          SELECT('x', PATH('x', 'y'))
          .FROM({ table: 'a' })
          .WHERE(
            AND(
              OR(
                EQ(PATH('a', 'b'), DATA('a')),
                GT(DATA(123),PATH('x', 'y')),
              ),
              EQ(PATH('a', 'b'), DATA('a')),
              GT(DATA(123),PATH('x', 'y')),
              EXISTS(sel('x','y')),
            ),
          )
          .GROUP(PATH('x'), PATH('y'))
          .ORDER(PATH('x')).ORDER(PATH('z','r'), false)
          .OFFSET(5).LIMIT(3),
        ),
        `select 'x',"x"."y" from "a" where (("a"."b" = 'a') or (123 > "x"."y")) and ("a"."b" = 'a') and (123 > "x"."y") and (exists (${_t('"x"', '"y"')})) group by "x","y" order by "x" ASC,"z"."r" DESC offset 5 limit 3`,
      );
    });
    it('IExpUnion', () => {
      const q = new Query();
      assert.equal(
        q.IExp(
          UNION(
            sel(null, 'a'),
            sel(null, 'b'),
            sel(null, 'c'),
          ),
        ),
        `(${_t('*','"a"')}) union (${_t('*','"b"')}) union (${_t('*','"c"')})`,
      );
    });
    it('IExpUnionall', () => {
      const q = new Query();
      assert.equal(
        q.IExp(
          UNIONALL(
            sel(null, 'a'),
            sel(null, 'b'),
            sel(null, 'c'),
          ),
        ),
        `(${_t('*','"a"')}) union all (${_t('*','"b"')}) union all (${_t('*','"c"')})`,
      );
    });
  });
}
