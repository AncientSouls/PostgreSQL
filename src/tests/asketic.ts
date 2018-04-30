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
  IQuery,
  IQueryResolver,
  asket,
} from 'ancient-asket/lib/asket';

import {
  Asketic,
} from 'ancient-tracker/lib/asketic';

import {
  dataToBundle,
  asketicChangesToBundles,
} from 'ancient-tracker/lib/bundles';

import {
  test,
  query,
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

import {
  Cursor,
} from 'ancient-cursor/lib/cursor';

const babilonResolver = createResolver(resolverOptions);

const delay = async time => new Promise(res => setTimeout(res, time));

import { Triggers } from '../lib/triggers';

export default () => { 
  describe('Asketic', () => {
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

      const asketic = new Asketic();

      const flow = {
        query,
        next: asket,
        resolver: async (flow) => {
          if (flow.name === 'a' && flow.env.type === 'root') {
            const tracker = new Tracker();
            tracker.idField = 'id';
            tracker.query = trackerQuery(expAll, {});
            client.add(tracker);
            return asketic.flowTracker(flow, tracker);
          }
          if (flow.name === 'b' && flow.env.type === 'item') {
            const tracker = new Tracker();
            tracker.idField = 'id';
            tracker.query = trackerQuery(expEqual, { num: flow.env.item.num });
            client.add(tracker);
            return asketic.flowTracker(flow, tracker);
          }
          // msut be writed in asketic compatibly resolver
          if (flow.env.type === 'items') return asketic.flowItem(flow);
          return asketic.flowValue(flow);
        },
      };


      const expAll = ['select',
        ['returns'],
        ['from',['alias','documents1']],
        ['and',
          ['gt',['path','documents1','num'],['data',2]],
          ['lt',['path','documents1','num'],['data',6]],
        ],
        ['orders',['order',['path','documents1','num'],true],['order',['path','documents1','id'],true]],
        ['limit',2],
      ];

      const expEqual = ['select',
        ['returns'],
        ['from',['alias','documents1']],
        ['and',
          ['eq',['path','documents1','num'],['variable','num']],
        ],
        ['orders',['order',['path','documents1','num'],true],['order',['path','documents1','id'],true]],
      ];

      const trackerQuery = (exp, variables) => ({
        fetchQuery: babilon({ validators, variables, exp, resolver: babilonResolver }).result,
        trackQuery: babilon({ validators, variables, exp: returnsReferences(exp, generateReturnsAs()), resolver: babilonResolver }).result,
      });

      const cursor = new Cursor();
  
      const result = await asketic.next(flow);
      // transform first asketic result to cursor bundle
      cursor.apply(dataToBundle(result.data));

      const update = async () => {
        const changes = await asketic.get();
        const bundles = asketicChangesToBundles(changes);
        _.each(bundles, bundle => cursor.apply(bundle));
      };
    
      await test(
        cursor,
        async () => {
          await c.query(`insert into documents1 (num) values (1);`);
          await c.query(`insert into documents1 (num) values (2);`);
          await c.query(`insert into documents1 (num) values (3);`);
          await c.query(`insert into documents1 (num) values (4);`);
          await c.query(`insert into documents1 (num) values (5);`);
          await c.query(`insert into documents1 (num) values (6);`);
          await update();
        },
        async () => {
          await c.query(`insert into documents1 (id,num) values (9,3);`);
          await update();
        },
        async () => {
          await c.query(`update documents1 set num = 5 where id = 3;`);
          await update();
        },
        async () => {
          await c.query(`update documents1 set num = 6 where id = 3;`);
          await update();
        },
        async () => {
          await c.query(`update documents1 set num = 3 where id = 4;`);
          await update();
        },
        async () => {
          await c.query(`delete from documents1 where id = 4;`);
          await update();
        },
      );

      await client.stop();
      await delay(10);
    });
  });
};
