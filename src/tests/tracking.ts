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
      
      tracker.init(t.track({ query: q1 }));

      await delay(100);

      await client.query(`insert into documents (value) values ${_.times(9, t => `(${t + 1})`)};`);
      
      await tracker.subscribe();
      await delay(100);
      console.log(await client.query('select * from ancient_postgresql_live_queries'));

      await t.stop();
    });
  });
}
