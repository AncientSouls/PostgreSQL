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

import { Triggers } from '../lib/triggers';

const resolver = createResolver(resolverOptions);

const delay = async time => new Promise(res => setTimeout(res, time));

const testTableName = `test`;

const num = process.env['TRAVIS_JOB_NUMBER'] ? parseInt(process.env['TRAVIS_JOB_NUMBER'].split('.')[1], 10) : 0;

export default (env) => { 
  describe('Client', () => {
    const triggers = new Triggers();

    const cleaning = async () => {
      await env.client.query(`
        drop table if exists ${testTableName};
      `);

      await env.client.query(triggers.deinit());
      await env.client.query(triggers.unwrap(`${testTableName}`));
    };

    beforeEach(async () => {
      await cleaning();

      await env.client.query(`
        create table if not exists ${testTableName} (
          id serial PRIMARY KEY,
          num int default 0
        );
      `);

      await env.client.query(triggers.init());
      await env.client.query(triggers.wrap(`${testTableName}`));
    });
    
    afterEach(async () => {
      await cleaning();
    });

    it(`lifecycle`, async () => {
      const client = new Client();
      client.client = {
        triggers,
        pg: env.client,
      };
      await client.start();

      const exp = order => [`select`,
        [`returns`,[`as`,[`path`,`id`],`_id`],[`path`,`num`]],
        [`from`,[`alias`,`${testTableName}`]],
        [`and`,
          [`gt`,[`path`,`${testTableName}`,`num`],[`data`,2]],
          [`lt`,[`path`,`${testTableName}`,`num`],[`data`,6]],
        ],
        [`orders`,[`order`,[`path`,`${testTableName}`,`num`],order],[`order`,[`path`,`${testTableName}`,`id`],true]],
        [`limit`,2],
      ];

      const trackerQuery = (order = true) => ({
        fetchQuery: babilon({ resolver, validators, exp: exp(order) }).result,
        trackQuery: babilon({ resolver, validators, exp: returnsReferences(exp(order), generateReturnsAs()) }).result,
      });

      const tracker = new Tracker();
      tracker.query = trackerQuery(true);
      client.add(tracker);
      
      assert.deepEqual(await tracker.get(), []);
      await env.client.query(`insert into ${testTableName} (num) values (1);`);
      await env.client.query(`insert into ${testTableName} (num) values (2);`);
      await env.client.query(`insert into ${testTableName} (num) values (3);`);
      await env.client.query(`insert into ${testTableName} (num) values (4);`);
      await env.client.query(`insert into ${testTableName} (num) values (5);`);
      await env.client.query(`insert into ${testTableName} (num) values (6);`);
      assert.deepEqual(await tracker.get(), [
        { id: `3`, item: { _id: 3, num: 3 }, oldIndex: -1, newIndex: 0 },
        { id: `4`, item: { _id: 4, num: 4 }, oldIndex: -1, newIndex: 1 },
      ]);

      await env.client.query(`insert into ${testTableName} (id,num) values (9,3);`);
      assert.deepEqual(await tracker.get(), [
        { id: `4`, item: { _id: 4, num: 4 }, oldIndex: 1, newIndex: -1 },
        { id: `9`, item: { _id: 9, num: 3 }, oldIndex: -1, newIndex: 1 },
      ]);
      
      await env.client.query(`update ${testTableName} set num = 5 where id = 3;`);
      assert.deepEqual(await tracker.get(), [
        { id: `3`, item: { _id: 3, num: 3 }, oldIndex: 0, newIndex: -1 },
        { id: `4`, item: { _id: 4, num: 4 }, oldIndex: -1, newIndex: 1 },
      ]);
      
      await env.client.query(`update ${testTableName} set num = 6 where id = 3;`);
      assert.deepEqual(await tracker.get(), []);
      
      await env.client.query(`update ${testTableName} set num = 3 where id = 4;`);
      assert.deepEqual(await tracker.get(), [
        { id: `4`, item: { _id: 4, num: 3 }, changed: true, oldIndex: 1, newIndex: 0 },
      ]);
      
      await env.client.query(`delete from ${testTableName} where id = 4;`);
      assert.deepEqual(await tracker.get(), [
        { id: `4`, item: { _id: 4, num: 3 }, oldIndex: 0, newIndex: -1 },
        { id: `5`, item: { _id: 5, num: 5 }, oldIndex: -1, newIndex: 1 },
      ]);

      await env.client.query(`truncate ${testTableName};`);
      assert.deepEqual(await tracker.get(), [
        { id: `5`, item: { _id: 5, num: 5 }, oldIndex: 1, newIndex: -1 },
        { id: `9`, item: { _id: 9, num: 3 }, oldIndex: 0, newIndex: -1 },
      ]);

      await client.stop();
      await delay(10);
    });
  });
};
