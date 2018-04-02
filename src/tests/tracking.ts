import { assert } from 'chai';
import * as _ from 'lodash';
import { Client } from 'pg';

import { LiveTriggers } from '../lib/live-triggers';
import { LiveQuery } from '../lib/live-query';
import { PostgresTracking } from '../lib/tracking';
import { Tracker } from 'ancient-tracker/lib/tracker';

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

const delay = t => new Promise(resolve => setTimeout(resolve, t));

export default function () {
  describe('Tracking:', () => {
    let client;
    const liveTriggers = new LiveTriggers();

    const cleaning = async () => {
      await client.query(liveTriggers.dropTriggers('documents'));
      await client.query(liveTriggers.dropFunctions());
      
      await client.query(liveTriggers.dropTable(liveTriggers.liveQueriesTableName));
      await client.query(liveTriggers.dropTable('documents'));
    };

    beforeEach(async () => {
      client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'postgres',
        port: 5432,
      });
      
      await client.connect();

      await cleaning();

      await client.query(liveTriggers.createLiveQueriesTable());
      await client.query(liveTriggers.createFunctions());

      await client.query(`
        create table if not exists documents (
          id serial PRIMARY KEY,
          value int default 0
        );`,
      );
      await client.query(liveTriggers.createTriggers('documents'));
    });
    
    afterEach(async () => {
      await cleaning();
      await client.end();
    });

    it('lifecycle', async () => {
      const t = new PostgresTracking();
      await t.start(client, liveTriggers);

      const tracker = new Tracker();

      const events = [];
      tracker.on('emit', ({ eventName }) => events.push(eventName));

      const q1 = new LiveQuery();
      q1.IExp(
        SELECT().FROM('documents')
        .WHERE(GT(PATH('value'), 2), LT(PATH('value'), 8))
        .ORDER(PATH('value'), true).LIMIT(2),
      );

      const q2 = new LiveQuery();
      q2.IExp(
        SELECT().FROM('documents')
        .WHERE(GT(PATH('value'), 2), LT(PATH('value'), 8))
        .ORDER(PATH('value'), false).LIMIT(2),
      );
      
      tracker.init(t.track({ query: q1 }));

      await delay(100);

      await client.query(`insert into documents (value) values ${_.times(9, t => `(${t + 1})`)};`);
      
      await tracker.subscribe();

      await delay(100);
      
      assert.deepEqual(tracker.ids, [3,4]);
      assert.deepEqual(tracker.memory, {
        3: { id: 3, value: 3 },
        4: { id: 4, value: 4 },
      });

      await client.query(`update documents set value = 6 where id = 3`);

      await delay(100);
      
      assert.deepEqual(tracker.ids, [4,5]);
      assert.deepEqual(tracker.memory, {
        4: { id: 4, value: 4 },
        5: { id: 5, value: 5 },
      });

      await client.query(`update documents set value = 3 where id = 5`);

      await delay(100);
      
      assert.deepEqual(tracker.ids, [5,4]);
      assert.deepEqual(tracker.memory, {
        4: { id: 4, value: 4 },
        5: { id: 5, value: 3 },
      });

      await client.query(`update documents set value = 5 where id = 5`);

      await delay(100);
      
      assert.deepEqual(tracker.ids, [4,5]);
      assert.deepEqual(tracker.memory, {
        4: { id: 4, value: 4 },
        5: { id: 5, value: 5 },
      });

      await tracker.unsubscribe();
      
      assert.deepEqual(tracker.ids, [4,5]);
      assert.deepEqual(tracker.memory, {
        4: { id: 4, value: 4 },
        5: { id: 5, value: 5 },
      });

      tracker.init(t.track(q2));

      await tracker.subscribe();
      
      assert.deepEqual(tracker.ids, [7,3]);
      assert.deepEqual(tracker.memory, {
        7: { id: 7, value: 7 },
        3: { id: 3, value: 6 },
      });

      await tracker.unsubscribe();
      tracker.destroy();
      
      assert.deepEqual(tracker.ids, [7,3]);
      assert.deepEqual(tracker.memory, {
        7: { id: 7, value: 7 },
        3: { id: 3, value: 6 },
      });

      tracker.clean();
      
      assert.deepEqual(tracker.ids, []);
      assert.deepEqual(tracker.memory, {});

      await delay(100);

      await t.stop();
    });
  });
}
