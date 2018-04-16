import * as _ from 'lodash';
import { assert } from 'chai';

import {
  babilon,
} from 'ancient-babilon/lib/babilon';

import {
  createResolver,
  resolverOptions as _resolverOptions,
  validators,
} from '../lib/rules-full';

const resolverOptions = _.cloneDeep(_resolverOptions);
resolverOptions._constant = () => '';

const resolver = createResolver(resolverOptions);

const babi = (exp, result) => {
  const b = babilon({ resolver, validators, exp, variables: { a: { b: { c: 123 } } } });
  assert.deepEqual(b.errors, []);
  assert.deepEqual(b.result, result);
  return b;
};

export default () => { 
  describe('babilon', () => {
    it('data', () => {
      babi(['data', true], 'true');
      babi(['data', false], 'false');
      babi(['data', 123], '123');
      babi(['data', 'abc'], '$$abc$$');
    });
    it('variable', () => {
      babi(['variable', 'a.b.c'], '123');
    });
    it('path', () => {
      babi(['path', 'a'], '"a"');
      babi(['path', 'a', 'b'], '"a"."b"');
    });
    it('alias', () => {
      babi(['alias', 'a'], '"a"');
      babi(['alias', 'a', 'b'], '"a" as "b"');
    });
    it('as', () => {
      babi(['as', ['data', 123], 'x'], '123 as "x"');
    });
    it('logic', () => {
      babi(['and', ['data', 123], ['eq', ['data', 123], ['data', 123]], ['path', 'a', 'b']], '(123) and (123 = 123) and ("a"."b")');
      babi(['or', ['data', 123], ['eq', ['data', 123], ['data', 123]], ['path', 'a', 'b']], '(123) or (123 = 123) or ("a"."b")');
    });
    it('check', () => {
      babi(['eq', ['data', 123], ['data', 123]], '123 = 123');
      babi(['not', ['data', 123], ['data', 123]], '123 != 123');
      babi(['gt', ['data', 123], ['data', 123]], '123 > 123');
      babi(['gte', ['data', 123], ['data', 123]], '123 >= 123');
      babi(['lt', ['data', 123], ['data', 123]], '123 < 123');
      babi(['lte', ['data', 123], ['data', 123]], '123 <= 123');
    });
    it('operators', () => {
      babi(['add', ['data', 'abc'], ['data', 'def']], '($$abc$$)||($$def$$)');
      babi(['plus', ['data', 123], ['data', 123]], '(123)+(123)');
      babi(['minus', ['data', 123], ['data', 123]], '(123)-(123)');
      babi(['multiply', ['data', 123], ['data', 123]], '(123)*(123)');
      babi(['divide', ['data', 123], ['data', 123]], '(123)/(123)');
    });
    it('order orders', () => {
      babi(['order', ['path','a']], '"a" ASC');
      babi(['order', ['path','a'], true], '"a" ASC');
      babi(['order', ['path','a'], false], '"a" DESC');
      babi(['orders', ['order', ['path','a']], ['order', ['path','a'], false]], '"a" ASC,"a" DESC');
    });
    it('group groups', () => {
      babi(['group', ['path','a']], '"a"');
      babi(['groups', ['group', ['path','a']], ['group', ['path','a']]], '"a","a"');
    });
    it('limit skip', () => {
      babi(['limit', 7], '7');
      babi(['skip', 7], '7');
    });
    it('returns', () => {
      babi(['returns', ['path', 'a'], ['as', ['data', 123], 'x']], '"a",123 as "x"');
      babi(['returns'], '*');
    });
    it('from', () => {
      babi(['from', ['alias', 'a'], ['alias', 'a', 'b']], '"a","a" as "b"');
    });
    it('select', () => {
      babi(
        ['select',
          ['returns',
            ['path','z','a'],
            ['as',['data',123],'q'],
            ['as',
              ['or',
                ['eq',['path','x','b'],['data',123]],
                ['eq',['path','x','c'],['data',123]],
              ],
              'w',
            ],
          ],
          ['from',
            ['alias','x'],
            ['alias','y','z'],
          ],
          ['and',
            ['gt',['path','z','a'],['data',10]],
            ['or',
              ['eq',['path','x','b'],['data',123]],
              ['eq',['path','x','c'],['data',123]],
            ],
          ],
          ['orders', ['order', ['path', 'z', 'a']], ['order', ['path', 'x', 'b'], false]],
          ['limit', 10], ['skip', 10],
        ],
        '(select "z"."a",123 as "q",("x"."b" = 123) or ("x"."c" = 123) as "w" from "x","y" as "z" where ("z"."a" > 10) and (("x"."b" = 123) or ("x"."c" = 123)) order by "z"."a" ASC,"x"."b" DESC limit 10 offset 10)',
      );
    });
    it('union unionall', () => {
      babi(
        [
          'union',
          ['select', ['from', ['alias', 'a']]],
          ['select', ['from', ['alias', 'b']]],
          ['select', ['from', ['alias', 'c']]],
        ],
        '(select * from "a") union (select * from "b") union (select * from "c")',
      );
      babi(
        [
          'unionall',
          ['select', ['from', ['alias', 'a']]],
          ['select', ['from', ['alias', 'b']]],
          ['select', ['from', ['alias', 'c']]],
        ],
        '(select * from "a") union all (select * from "b") union all (select * from "c")',
      );
    });
  });
};
