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
      assert.equal(q.TExpData('123'), '$1');
      assert.deepEqual(q.params, ['123']);
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
          q.IExpValue(PATH('a').VALUE()),
          q.IExpValue(PATH('a').VALUE().AS('d')),
          q.IExpValue(PATH('a', 'b').VALUE()),
          q.IExpValue(PATH('a', 'b').VALUE().AS('e')),
          q.IExpValue(sel('x','y').VALUE()),
          q.IExpValue(sel('x','y').VALUE().AS('f')),
          q.IExpValue(UNION(
            sel(null, 'a'),
            sel(null, 'b'),
            sel(null, 'c'),
          ).VALUE()),
          q.IExpValue(UNIONALL(
            sel(null, 'a'),
            sel(null, 'b'),
            sel(null, 'c'),
          ).VALUE().AS('g')),
        ],
        [
          `true`, `false as "a"`,
          `123`, `123 as "b"`,
          `$1`, `$2 as "c"`,
          `"a"`, `"a" as "d"`,
          `"a"."b"`, `"a"."b" as "e"`,
          `(${_t('"x"', '"y"')})`, `(${_t('"x"', '"y"')}) as "f"`,
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
          PATH('a').VALUE(),
          PATH('a').VALUE().AS('d'),
          PATH('a', 'b').VALUE(),
          PATH('a', 'b').VALUE().AS('e'),
          sel('x','y').VALUE(),
          sel('x','y').VALUE().AS('f'),
          UNION(
            sel(null, 'a'),
            sel(null, 'b'),
            sel(null, 'c'),
          ).VALUE(),
          UNIONALL(
            sel(null, 'a'),
            sel(null, 'b'),
            sel(null, 'c'),
          ).VALUE().AS('g'),
        ]),
        [
          `true`, `false as "a"`,
          `123`, `123 as "b"`,
          `$1`, `$2 as "c"`,
          `"a"`, `"a" as "d"`,
          `"a"."b"`, `"a"."b" as "e"`,
          `(${_t('"x"', '"y"')})`, `(${_t('"x"', '"y"')}) as "f"`,
          `((${_t('*','"a"')}) union (${_t('*','"b"')}) union (${_t('*','"c"')}))`,
          `((${_t('*','"a"')}) union all (${_t('*','"b"')}) union all (${_t('*','"c"')})) as "g"`,
        ].join(','),
      );
      assert.deepEqual(q.params, ['123','123']);
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
      assert.equal(q.IExpComparison({ values: [[DATA('a')]] }), '$1');
      assert.equal(
        q.IExpComparison(
          EQ(PATH('a', 'b'), DATA('a')),
        ),
        '"a"."b" = $2',
      );
      assert.equal(
        q.IExpComparison(
          IN(PATH('a', 'b'), DATA('a'), DATA('b')),
        ),
        '"a"."b" in ($3,$4)',
      );
      assert.equal(
        q.IExpComparison(
          BETWEEN(PATH('a', 'b'), DATA('a'), DATA('b')),
        ),
        '"a"."b" between $5 and $6',
      );
      assert.equal(
        q.IExpComparison(
          LIKE(PATH('a', 'b'), DATA('a')),
        ),
        '"a"."b" like $7',
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
        '(("a"."b" = $1) or (123 > "x"."y")) and ("a"."b" = $2) and (123 > "x"."y")',
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
        'select $1,"x"."y" from "a" where ' +
        '(("a"."b" = $2) or (123 > "x"."y")) and ("a"."b" = $3) and (123 > "x"."y") and ' +
        `(exists (${_t('"x"', '"y"')})) ` +
        'group by "x","y" ' +
        'order by "x" ASC,"z"."r" DESC ' +
        'offset 5 limit 3',
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
