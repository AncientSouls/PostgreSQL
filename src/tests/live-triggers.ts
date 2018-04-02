import { assert } from 'chai';
import * as _ from 'lodash';
import { Client } from 'pg';

import { LiveTriggers } from '../lib/live-triggers';
import { liveQuery } from '../lib/live-query';

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

const subscribing = t => _.times(t, t => `LISTEN ch${t + 1}; `).join('');
const unsubscribing = t => _.times(t, t => `UNLISTEN ch${t + 1}; `).join('');

export default function () {
  describe.skip('LiveTriggers:', () => {
    let client;
    const querysCount = 3;
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

      await client.query(
        `insert into ${liveTriggers.liveQueriesTableName} (query, channel) values ${
          _.times(querysCount, t => `($${t + 1},'ch${t + 1}')`)
        };`,
        _.times(querysCount, t => liveQuery(
          SELECT()
          .FROM({ table: 'documents' })
          .ORDER(PATH('id'))
          .OFFSET(t * 2).LIMIT(3),
        )),
      );
    });
    
    afterEach(async () => {
      await cleaning();
      await client.end();
    });

    it('insert', async () => {
      await client.query(subscribing(querysCount));
      const notifications = [];
      client.on('notification', msg => notifications.push(JSON.parse(msg.payload)));
      await client.query(`insert into documents (id) values ${_.times(9, t => `(DEFAULT)`)}`);

      await delay(100);

      assert.deepEqual(
        [
          ..._.filter(notifications, n => n.query === 1),
          ..._.filter(notifications, n => n.query === 2),
          ..._.filter(notifications, n => n.query === 3),
        ],
        [
          ..._.times(3, n => ({ table: 'documents', id: n + 1, query: 1, event: 'INSERT' })),
          ..._.times(3, n => ({ table: 'documents', id: n + 3, query: 2, event: 'INSERT' })),
          ..._.times(3, n => ({ table: 'documents', id: n + 5, query: 3, event: 'INSERT' })),
        ],
      );
      
      await client.query(unsubscribing(querysCount));
    });
    
    it('update', async () => {
      const notifications = [];
      client.on('notification', msg => notifications.push(JSON.parse(msg.payload)));
      await client.query(`insert into documents (id) values ${_.times(9, t => `(DEFAULT)`)}`);

      await delay(100);

      await client.query(subscribing(querysCount));
      
      await client.query(`${_.times(9, t => `update documents set value = value + 1 where id = ${t + 1}; `).join('')}`);

      await delay(100);

      assert.deepEqual(
        [
          ..._.filter(notifications, n => n.query === 1),
          ..._.filter(notifications, n => n.query === 2),
          ..._.filter(notifications, n => n.query === 3),
        ],
        [
          ..._.times(3, n => ({ table: 'documents', id: n + 1, query: 1, event: 'UPDATE' })),
          ..._.times(3, n => ({ table: 'documents', id: n + 3, query: 2, event: 'UPDATE' })),
          ..._.times(3, n => ({ table: 'documents', id: n + 5, query: 3, event: 'UPDATE' })),
        ],
      );

      await client.query(unsubscribing(querysCount));
    });
    
    it('delete', async () => {
      const notifications = [];
      client.on('notification', msg => notifications.push(JSON.parse(msg.payload)));
      await client.query(`insert into documents (id) values ${_.times(9, t => `(DEFAULT)`)}`);
      
      await delay(100);

      await client.query(subscribing(querysCount));
      
      await client.query(`${_.times(9, t => `delete from documents where id = ${9 - t}; `).join('')}`);

      await delay(100);

      assert.deepEqual(
        notifications,
        [ 
          { table: 'documents', id: 7, query: 3, event: 'DELETE' },
          { table: 'documents', id: 6, query: 3, event: 'DELETE' },
          { table: 'documents', id: 5, query: 3, event: 'DELETE' },
          { table: 'documents', id: 5, query: 2, event: 'DELETE' },
          { table: 'documents', id: 4, query: 2, event: 'DELETE' },
          { table: 'documents', id: 3, query: 2, event: 'DELETE' },
          { table: 'documents', id: 3, query: 1, event: 'DELETE' },
          { table: 'documents', id: 2, query: 1, event: 'DELETE' },
          { table: 'documents', id: 1, query: 1, event: 'DELETE' },
        ],
      );

      await client.query(unsubscribing(querysCount));
    });
    
    it('truncate', async () => {
      const notifications = [];
      client.on('notification', msg => notifications.push(JSON.parse(msg.payload)));
      await client.query(`insert into documents (id) values ${_.times(9, t => `(DEFAULT)`)}`);
      
      await delay(100);

      await client.query(subscribing(querysCount));
      
      await delay(100);
      
      await client.query(`truncate documents`);

      await delay(100);

      assert.deepEqual(
        notifications,
        [
          ..._.times(3, n => ({ table: 'documents', query: 3 - n, event: 'TRUNCATE' })),
        ],
      );
      
      await client.query(unsubscribing(querysCount));
    });
  });
}
