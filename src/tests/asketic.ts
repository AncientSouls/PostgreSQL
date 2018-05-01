import * as _ from 'lodash';
import { assert } from 'chai';

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

import { Triggers } from '../lib/triggers';

const babilonResolver = createResolver(resolverOptions);

const delay = async time => new Promise(res => setTimeout(res, time));

const testTableName = `test`;

export default (env) => { 
  describe(`Asketic`, () => {
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

      const asketic = new Asketic();

      const flow = {
        query,
        next: asket,
        resolver: async (flow) => {
          if (flow.name === `a` && flow.env.type === `root`) {
            const tracker = new Tracker();
            tracker.idField = `id`;
            tracker.query = trackerQuery(expAll, {});
            client.add(tracker);
            return asketic.flowTracker(flow, tracker);
          }
          if (flow.name === `b` && flow.env.type === `item`) {
            const tracker = new Tracker();
            tracker.idField = `id`;
            tracker.query = trackerQuery(expEqual, { num: flow.env.item.num });
            client.add(tracker);
            return asketic.flowTracker(flow, tracker);
          }
          // msut be writed in asketic compatibly resolver
          if (flow.env.type === `items`) return asketic.flowItem(flow);
          return asketic.flowValue(flow);
        },
      };


      const expAll = [`select`,
        [`returns`],
        [`from`,[`alias`,`${testTableName}`]],
        [`and`,
          [`gt`,[`path`,`${testTableName}`,`num`],[`data`,2]],
          [`lt`,[`path`,`${testTableName}`,`num`],[`data`,6]],
        ],
        [`orders`,[`order`,[`path`,`${testTableName}`,`num`],true],[`order`,[`path`,`${testTableName}`,`id`],true]],
        [`limit`,2],
      ];

      const expEqual = [`select`,
        [`returns`],
        [`from`,[`alias`,`${testTableName}`]],
        [`and`,
          [`eq`,[`path`,`${testTableName}`,`num`],[`variable`,`num`]],
        ],
        [`orders`,[`order`,[`path`,`${testTableName}`,`num`],true],[`order`,[`path`,`${testTableName}`,`id`],true]],
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
          await env.client.query(`insert into ${testTableName} (num) values (1);`);
          await env.client.query(`insert into ${testTableName} (num) values (2);`);
          await env.client.query(`insert into ${testTableName} (num) values (3);`);
          await env.client.query(`insert into ${testTableName} (num) values (4);`);
          await env.client.query(`insert into ${testTableName} (num) values (5);`);
          await env.client.query(`insert into ${testTableName} (num) values (6);`);
          await update();
        },
        async () => {
          await env.client.query(`insert into ${testTableName} (id,num) values (9,3);`);
          await update();
        },
        async () => {
          await env.client.query(`update ${testTableName} set num = 5 where id = 3;`);
          await update();
        },
        async () => {
          await env.client.query(`update ${testTableName} set num = 6 where id = 3;`);
          await update();
        },
        async () => {
          await env.client.query(`update ${testTableName} set num = 3 where id = 4;`);
          await update();
        },
        async () => {
          await env.client.query(`delete from ${testTableName} where id = 4;`);
          await update();
        },
      );

      await client.stop();
      await delay(10);
    });
  });
};
