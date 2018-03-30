import { assert } from 'chai';
import * as _ from 'lodash';

import { Restricted } from '../lib/restricted';
import { SELECT } from '../lib/helpers';

class TestRestricted extends Restricted {
  _generateRestrictionsAlias() {
    return 'rest';
  }
}

export default function () {
  describe('Restricted:', () => {
    it('ISelect', () => {
      const q = new TestRestricted();
      q._subjects([{ id: 7, table: 'nodes' }]);
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
        `select * from "a" where (("a"."b" = $1) and (123 > "x"."y")) ` +
        `and exists (select * from "restrictions" as "rest" where (("subjectId" = 7) ` +
        `and ("subjectTable" = $2) and ("objectId" = "a"."id") ` +
        `and ("objectTable" = $3)))`,
      );
      assert.deepEqual(q.tables, { a: [] });
    });
  });
}
