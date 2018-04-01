import { assert } from 'chai';
import * as _ from 'lodash';

import { LiveQuery } from '../lib/live-query';
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
  describe('LiveQuery:', () => {
    it('createLiveQuery', () => {
      const q = new LiveQuery();
      const select = SELECT('x', PATH('x', 'y'))
      .FROM({ table: 'a', as: 'b' }, { table: 'c' })
      .WHERE(
        AND(
          EQ(PATH('x', 'y'), DATA('z')),
          GT(PATH('c'), DATA(123)),
        ),
      );
      q.IExp(select);
      assert.equal(
        q.createLiveQuery(),
        `(select $3 as table and "a"."id" as id from "a" as "b","c" where ` +
        `("x"."y" = $2) and ("c" > 123)) union ` +
        `(select $4 as table and "c"."id" as id from "a" as "b","c" where ` +
        `("x"."y" = $2) and ("c" > 123))`,
      );
    });
  });
}
