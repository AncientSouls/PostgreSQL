import * as _ from 'lodash';
import { assert } from 'chai';
import * as pg from 'pg';

import {
  babilon,
} from 'ancient-babilon/lib/babilon';

import {
  Client,
} from '../lib/client';

import {
  Tracker,
} from 'ancient-tracker/lib/tracker';

import {
  test, query,
} from 'ancient-tracker/tests/test';

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

const delay = async time => new Promise(res => setTimeout(res, time));

export default () => { 
  describe('Client', () => {
    let c;
    const triggers = new Triggers();

    const cleaning = async () => {
      await c.query(`
        drop table if exists documents1;
      `);

      await c.query(triggers.deinit());
      await c.query(triggers.unwrap('documents1'));
    };

    beforeEach(async () => {
      c = new pg.Client({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: 'postgres',
        port: 5432,
      });
      
      await c.connect();

      await cleaning();

      await c.query(`
        create table if not exists documents1 (
          id serial PRIMARY KEY,
          num int default 0
        );
      `);

      await c.query(triggers.init());
      await c.query(triggers.wrap('documents1'));
    });
    
    afterEach(async () => {
      await cleaning();
      await c.end();
    });

    it('lifecycle', async () => {
      const client = new Client();
      client.client = {
        triggers,
        pg: c,
      };
      await client.start();

      const exp = order => ['select',
        ['returns',['as',['path','id'],'_id'],['path','num']],
        ['from',['alias','documents1']],
        ['and',
          ['gt',['path','documents1','num'],['data',2]],
          ['lt',['path','documents1','num'],['data',6]],
        ],
        ['orders',['order',['path','documents1','num'],order],['order',['path','documents1','id'],true]],
        ['limit',2],
      ];

      const trackerQuery = (order = true) => ({
        fetchQuery: babilon({ resolver, validators, exp: exp(order) }).result,
        trackQuery: babilon({ resolver, validators, exp: returnsReferences(exp(order), generateReturnsAs()) }).result,
      });

      const tracker = new Tracker();
      tracker.query = trackerQuery(true);
      client.add(tracker);
      
      assert.deepEqual(await tracker.get(), []);
      await c.query(`insert into documents1 (num) values (1);`);
      await c.query(`insert into documents1 (num) values (2);`);
      await c.query(`insert into documents1 (num) values (3);`);
      await c.query(`insert into documents1 (num) values (4);`);
      await c.query(`insert into documents1 (num) values (5);`);
      await c.query(`insert into documents1 (num) values (6);`);
      assert.deepEqual(await tracker.get(), [
        { id: '3', item: { _id: 3, num: 3 }, oldIndex: -1, newIndex: 0 },
        { id: '4', item: { _id: 4, num: 4 }, oldIndex: -1, newIndex: 1 },
      ]);

      await c.query(`insert into documents1 (id,num) values (9,3);`);
      assert.deepEqual(await tracker.get(), [
        { id: '4', item: { _id: 4, num: 4 }, oldIndex: 1, newIndex: -1 },
        { id: '9', item: { _id: 9, num: 3 }, oldIndex: -1, newIndex: 1 },
      ]);
      
      await c.query(`update documents1 set num = 5 where id = 3;`);
      assert.deepEqual(await tracker.get(), [
        { id: '3', item: { _id: 3, num: 3 }, oldIndex: 0, newIndex: -1 },
        { id: '4', item: { _id: 4, num: 4 }, oldIndex: -1, newIndex: 1 },
      ]);
      
      await c.query(`update documents1 set num = 6 where id = 3;`);
      assert.deepEqual(await tracker.get(), []);
      
      await c.query(`update documents1 set num = 3 where id = 4;`);
      assert.deepEqual(await tracker.get(), [
        { id: '4', item: { _id: 4, num: 3 }, changed: true, oldIndex: 1, newIndex: 0 },
      ]);
      
      await c.query(`delete from documents1 where id = 4;`);
      assert.deepEqual(await tracker.get(), [
        { id: '4', item: { _id: 4, num: 3 }, oldIndex: 0, newIndex: -1 },
        { id: '5', item: { _id: 5, num: 5 }, oldIndex: -1, newIndex: 1 },
      ]);

      await c.query(`truncate documents1;`);
      assert.deepEqual(await tracker.get(), [
        { id: '5', item: { _id: 5, num: 5 }, oldIndex: 1, newIndex: -1 },
        { id: '9', item: { _id: 9, num: 3 }, oldIndex: 0, newIndex: -1 },
      ]);

      await client.stop();
      await delay(10);
    });
  });
};
