import * as _ from 'lodash';
import { assert } from 'chai';
import { Client } from 'pg';

import {
  babilon,
} from 'ancient-babilon/lib/babilon';

import {
  Adapter,
} from '../lib/adapter';

import {
  Tracker,
} from 'ancient-tracker/lib/tracker';

import trackerTest, {
  delay,
} from 'ancient-tracker/tests/tracker-test';

import {
  returnsReferences,
  generateReturnsAs,
} from 'ancient-babilon/lib/returns-references';

import {
  createResolver,
  resolverOptions,
  validators,
} from '../lib/rules-full';

const resolver = createResolver(resolverOptions);

import { Triggers } from '../lib/triggers';

export default () => { 
  describe('adapter', () => {
    let client;
    const triggers = new Triggers();

    const cleaning = async () => {
      await client.query(`
        drop table if exists documents1;
        drop table if exists documents2;
      `);

      await client.query(triggers.deinit());
      await client.query(triggers.unwrap('documents1'));
      await client.query(triggers.unwrap('documents2'));
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

      await client.query(`
        create table if not exists documents1 (
          id serial PRIMARY KEY,
          num int default 0
        );
        create table if not exists documents2 (
          id serial PRIMARY KEY,
          num int default 0
        );
      `);

      await client.query(triggers.init());
      await client.query(triggers.wrap('documents1'));
      await client.query(triggers.wrap('documents2'));
    });
    
    afterEach(async () => {
      await cleaning();
      await client.end();
    });

    it('lifecycle', async () => {
      const _e = [];

      const adapter = new Adapter('abc');


      await adapter.start({ client, triggers });

      const tracker = new Tracker();


      const exp = order => ['select',
        ['returns'],
        ['from',['alias','documents1']],
        ['and',
          ['gt',['path','documents1','num'],['data',2]],
          ['lt',['path','documents1','num'],['data',6]],
        ],
        ['orders',['order',['path','documents1','num'],order],['order',['path','documents1','id'],true]],
        ['limit',2],
      ];

      const q = (order = true) => ({
        triggers,
        fetchQuery: babilon({ resolver, validators, exp: exp(order) }).result,
        trackQuery: babilon({ resolver, validators, exp: returnsReferences(exp(order), generateReturnsAs()) }).result,
      });

      await delay(5);

      await trackerTest(
        adapter,
        tracker,
        q(true),
        q(false),
        async () => {
          await client.query(`insert into documents1 (num) values (1);`);
          await client.query(`insert into documents1 (num) values (2);`);
          await client.query(`insert into documents1 (num) values (3);`);
          await client.query(`insert into documents1 (num) values (4);`);
          await client.query(`insert into documents1 (num) values (5);`);
          await client.query(`insert into documents1 (num) values (6);`);
          await delay(5);
        },
        async () => {
          await client.query(`insert into documents1 (id,num) values (9,3);`);
          await delay(5);
        },
        async () => {
          await client.query(`update documents1 set num = 5 where id = 3;`);
          await delay(5);
        },
        async () => {
          await client.query(`update documents1 set num = 6 where id = 3;`);
          await delay(5);
        },
        async () => {
          await client.query(`update documents1 set num = 3 where id = 4;`);
          await delay(5);
        },
        async () => {
          await client.query(`delete from documents1 where id = 4;`);
          await delay(5);
        },
      );

      await adapter.stop();
    });

    it('truncate', async () => {
      const _e = [];

      const adapter = new Adapter('abc');


      await adapter.start({ client, triggers });

      const tracker = new Tracker();


      const exp = order => ['select',
        ['returns'],
        ['from',['alias','documents1']],
        ['and',
          ['gt',['path','documents1','num'],['data',2]],
          ['lt',['path','documents1','num'],['data',6]],
        ],
        ['orders',['order',['path','documents1','num'],order],['order',['path','documents1','id'],true]],
        ['limit',2],
      ];

      const q = (order = true) => ({
        triggers,
        fetchQuery: babilon({ resolver, validators, exp: exp(order) }).result,
        trackQuery: babilon({ resolver, validators, exp: returnsReferences(exp(order), generateReturnsAs()) }).result,
      });

      await delay(5);

      tracker.init(adapter.track(q(true)));

      await tracker.subscribe();
      
      assert.deepEqual(tracker.ids, []);
      assert.deepEqual(tracker.memory, {
      });

      await client.query(`insert into documents1 (num) values (1);`);
      await client.query(`insert into documents1 (num) values (2);`);
      await client.query(`insert into documents1 (num) values (3);`);
      await client.query(`insert into documents1 (num) values (4);`);
      await client.query(`insert into documents1 (num) values (5);`);
      await client.query(`insert into documents1 (num) values (6);`);

      await delay(5);
  
      assert.deepEqual(tracker.ids, [3,4]);
      assert.deepEqual(tracker.memory, {
        3: { id: 3, num: 3 },
        4: { id: 4, num: 4 },
      });

      await client.query(`truncate documents1;`);

      await delay(5);
  
      assert.deepEqual(tracker.ids, []);
      assert.deepEqual(tracker.memory, {});

      await tracker.unsubscribe();
      tracker.destroy();

      await adapter.stop();
    });
  });
};
