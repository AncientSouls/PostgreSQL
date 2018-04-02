import * as _ from 'lodash';
import { assert } from 'chai';
import { Client } from 'pg';
import { LiveTriggers } from './live-triggers';

import {
  TClass,
  IInstance,
} from 'ancient-mixins/lib/mixins';

import {
  Node,
  INode,
  INodeEventsList,
} from 'ancient-mixins/lib/node';

import {
  ITrackingEventsList,
  ITrackingItem,
  ITracking,
  Tracking,
} from 'ancient-tracker/lib/tracking';

import {
  liveQuery,
  TLiveQuery,
} from '../lib/live-query';

export type TPostgresTracking =  IPostgresTracking<IPostgresTrackingItem, ITrackingEventsList<IPostgresTrackingItem>>;

export interface IPostgresTrackingItemQuery {
  query: TLiveQuery;
  liveQueryId?: number;
}

export interface IPostgresTrackingItem extends ITrackingItem {
  query: IPostgresTrackingItemQuery;
}

export interface IPostgresTracking
<ITE extends IPostgresTrackingItem, IEventsList extends ITrackingEventsList<ITE>>
extends ITracking<ITE, IEventsList> {
  client: Client;
  liveTriggers: LiveTriggers;
  liveQueryIds: { [id: number]: string };

  start(client?: Client, liveTriggers?: LiveTriggers): Promise<void>;
}

export function mixin<T extends TClass<IInstance>>(
  superClass: T,
): any {
  return class PostgresTracking extends superClass {
    public client;
    public liveTriggers;

    async start(client, liveTriggers) {
      this.client = client;
      this.liveTriggers = liveTriggers;
      await this.client.query(`LISTEN "${this.id}";`);
      client.on('notification', (n) => {
        if (n.channel === this.id) {
          const json = JSON.parse(n.payload);
          this.override(this.items[this.liveQueryIds[json.query]]);
        }
      });
      await super.start();
    }

    async stop() {
      this.client.query(`UNLISTEN "${this.id}";`);
      await super.stop();
    }

    liveQueryIds = {};
    
    async tracked(item) {
      const inserted = await this.client.query(`insert into ${this.liveTriggers.liveQueriesTableName} (query, channel) values ($1, '${this.id}') returning id;`, [item.query.query.createLiveQuery()]);
      const liveQueryId = inserted.rows[0].id;
      this.liveQueryIds[liveQueryId] = item.tracker.id;
      item.query.liveQueryId = liveQueryId;

      super.tracked(item);
    }

    async untracked(item) {
      await this.client.query(`delete from ${this.liveTriggers.liveQueriesTableName} where id = ${item.query.liveQueryId};`);
      delete this.liveQueryIds[item.query.liveQueryId];
      
      return super.untracked(item);
    }

    async fetch(query) {
      const result = await this.client.query(query.query.createQuery(), query.query.params);
      return result.rows;
    }
  };
}

export const MixedPostgresTracking: TClass<TPostgresTracking> = mixin(Tracking);
export class PostgresTracking extends MixedPostgresTracking {}
