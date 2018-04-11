import * as _ from 'lodash';
import { assert } from 'chai';
import { Client } from 'pg';
import { TrackingTriggers } from './tracking-triggers';

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

export interface IPostgresTrackingNotification {
  table: string;
  id: number;
  query: number;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
  fetched: object[];
}

export interface IPostgresTrackingItemQuery {
  liveQuery: TLiveQuery;
  liveQueryId?: number;
}

export interface IPostgresTrackingItem extends ITrackingItem {
  query: IPostgresTrackingItemQuery;
}

export interface IPostgresTracking
<ITE extends IPostgresTrackingItem, IEventsList extends ITrackingEventsList<ITE>>
extends ITracking<ITE, IEventsList> {
  client: Client;
  trackingTriggers: TrackingTriggers;
  liveQueryIds: { [id: number]: string };

  start(client?: Client, trackingTriggers?: TrackingTriggers): Promise<void>;
}

export function mixin<T extends TClass<IInstance>>(
  superClass: T,
): any {
  return class PostgresTracking extends superClass {
    public client;
    public trackingTriggers;
    public liveQueryIds = {};

    async start(client, trackingTriggers) {
      this.client = client;
      this.trackingTriggers = trackingTriggers;

      await this.client.query(`LISTEN "${this.id}";`);

      client.on('notification', (n) => {
        if (n.channel === this.id) {
          const json = JSON.parse(n.payload);
          const queryId = this.liveQueryIds[json.query];
          const item = this.items[queryId];
          item.fetched = json.fetched;
          this.override(item);
        }
      });

      await super.start();
    }

    async stop() {
      this.client.query(`UNLISTEN "${this.id}";`);

      await super.stop();
    }
    
    async tracked(item) {
      const inserted = await this.client.query(
        `insert into ${this.trackingTriggers.trackingsTableName} (fetchQuery, liveQuery, channel) values ($1, $2, '${this.id}') returning id;`,
        [
          item.query.query.createQuery(),
          item.query.query.createLiveQuery(),
        ],
      );

      const liveQueryId = inserted.rows[0].id;
      
      this.liveQueryIds[liveQueryId] = liveQueryId;
      item.query.liveQueryId = liveQueryId;

      super.tracked(item);
    }

    async untracked(item) {
      await this.client.query(`delete from ${this.trackingTriggers.trackingsTableName} where id = ${item.query.liveQueryId};`);
      delete this.liveQueryIds[item.query.liveQueryId];
      
      return super.untracked(item);
    }

    async fetch(item) {
      return item.fetched;
    }
  };
}

export const MixedPostgresTracking: TClass<TPostgresTracking> = mixin(Tracking);
export class PostgresTracking extends MixedPostgresTracking {}
