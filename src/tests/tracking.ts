import { assert } from 'chai';
import * as _ from 'lodash';
import { Client } from 'pg';

import { TrackingTriggers } from '../lib/tracking-triggers';
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
    const trackingTriggers = new TrackingTriggers();

    const cleaning = async () => {
      await client.query(trackingTriggers.dropTriggers('documents'));
      await client.query(trackingTriggers.dropTriggers('documents2'));
      await client.query(trackingTriggers.dropFunctions());
      
      await client.query(trackingTriggers.dropTable(trackingTriggers.trackingsTableName));
      await client.query(trackingTriggers.dropTable('documents'));
      await client.query(trackingTriggers.dropTable('documents2'));
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

      await client.query(trackingTriggers.initTrackings());
      await client.query(trackingTriggers.createFunctions());

      await client.query(`
        create table if not exists documents (
          id serial PRIMARY KEY,
          value int default 0
        );
        create table if not exists documents2 (
          id serial PRIMARY KEY,
          value int default 0
        );`);

      await client.query(trackingTriggers.createTriggers('documents'));
      await client.query(trackingTriggers.createTriggers('documents2'));
      await client.query(trackingTriggers.createTrackingTrigger());
    });
    
    afterEach(async () => {
      await cleaning();
      await client.end();
    });

    it('lifecycle', async () => {
      const t = new PostgresTracking();
      await t.start(client, trackingTriggers);

      const tracker = new Tracker();

      const events = [];
      tracker.on('emit', ({ eventName }) => events.push(eventName));

      const q1 = new LiveQuery();
      q1.IExp(
        UNION(
          SELECT().FROM('documents')
          .WHERE(
            GT(PATH('documents', 'value'), 2), LT(PATH('documents', 'value'), 8),
          ).ORDER(PATH('documents', 'value'), false).LIMIT(2),
          SELECT().FROM('documents2')
          .WHERE(
            GT(PATH('documents2', 'value'), 2), LT(PATH('documents2', 'value'), 8),
          ).ORDER(PATH('documents2', 'value'), false).LIMIT(2),
        ),
      );

      const q2 = new LiveQuery();
      q2.IExp(
        SELECT().FROM('documents')
        .WHERE(GT(PATH('value'), 2), LT(PATH('value'), 8))
        .ORDER(PATH('value'), false).LIMIT(2),
      );


      const notifications = [];

      const notifications2 = [];

      await client.query(`listen ch1`);
      await client.query(`listen ch2`);

      client.on('notification', msg => msg.channel === 'ch1' ? notifications.push(msg.payload) : notifications2.push(msg.payload));   

      const inserted1 = await client.query(
        `insert into ancient_postgresql_trackings (fetchQuery, liveQuery, channel) values ($1, $2, 'ch1') returning id;`,
        [
          q1.createQuery(), 
          q1.createLiveQuery(),
        ],
      );

      const inserted = await client.query(
        `insert into ancient_postgresql_trackings (fetchQuery, liveQuery, channel) values ($1, $2, 'ch2') returning id;`,
        [
          q2.createQuery(),
          q2.createLiveQuery(),
        ],
      );

      
      await client.query(`insert into documents (value) values ${_.times(9, t => `(${t + 1})`)};`);

      await client.query(`insert into documents2 (value) values (4)`);

      await client.query(`insert into documents (value) values (0)`);

      await client.query(`update documents set value = 4 where id > 4`);

      await client.query(`TRUNCATE DOCUMENTS;`);

      await client.query(`insert into documents (value) values (3)`);

      await client.query(`update documents set value = 4 where id = 12`);

      await client.query(`update documents set value = 1 where id = 12`);

      await client.query(`update documents set value = 3 where id = 12`);

      await client.query(`DELETE from documents where value = 1`);

      await client.query(`DELETE from documents where value = 3`);

      await client.query(`insert into documents (value) values ${_.times(9, t => `(${t + 1})`)};`);

      await client.query(`DELETE from documents where id = 19`);

      await client.query(`DELETE from documents where value > 0`);

      await client.query(`TRUNCATE DOCUMENTS;`);

      await client.query(`TRUNCATE documents2`);


      console.log(notifications);

      // console.log(notifications2);

      // assert.deepEqual(tracker.ids, [3,4]);
      // assert.deepEqual(tracker.memory, {
      //   3: { id: 3, value: 3 },
      //   4: { id: 4, value: 4 },
      // });

      // await client.query(`update documents set value = 6 where id = 3`);

      // await delay(100);
      
      // assert.deepEqual(tracker.ids, [4,5]);
      // assert.deepEqual(tracker.memory, {
      //   4: { id: 4, value: 4 },
      //   5: { id: 5, value: 5 },
      // });

      // await client.query(`update documents set value = 3 where id = 5`);

      // await delay(100);
      
      // assert.deepEqual(tracker.ids, [5,4]);
      // assert.deepEqual(tracker.memory, {
      //   4: { id: 4, value: 4 },
      //   5: { id: 5, value: 3 },
      // });

      // await client.query(`update documents set value = 5 where id = 5`);

      // await delay(100);
      
      // assert.deepEqual(tracker.ids, [4,5]);
      // assert.deepEqual(tracker.memory, {
      //   4: { id: 4, value: 4 },
      //   5: { id: 5, value: 5 },
      // });

      // await tracker.unsubscribe();
      
      // assert.deepEqual(tracker.ids, [4,5]);
      // assert.deepEqual(tracker.memory, {
      //   4: { id: 4, value: 4 },
      //   5: { id: 5, value: 5 },
      // });

      // tracker.init(t.track(q2));

      // await tracker.subscribe();
      
      // assert.deepEqual(tracker.ids, [7,3]);
      // assert.deepEqual(tracker.memory, {
      //   7: { id: 7, value: 7 },
      //   3: { id: 3, value: 6 },
      // });

      // await tracker.unsubscribe();
      // tracker.destroy();
      
      // assert.deepEqual(tracker.ids, [7,3]);
      // assert.deepEqual(tracker.memory, {
      //   7: { id: 7, value: 7 },
      //   3: { id: 3, value: 6 },
      // });

      // tracker.clean();
      
      // assert.deepEqual(tracker.ids, []);
      // assert.deepEqual(tracker.memory, {});

      // await delay(100);

      // await t.stop();
    });
  });
}
