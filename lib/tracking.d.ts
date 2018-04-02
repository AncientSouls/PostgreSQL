import { Client } from 'pg';
import { LiveTriggers } from './live-triggers';
import { TClass, IInstance } from 'ancient-mixins/lib/mixins';
import { ITrackingEventsList, ITrackingItem, ITracking } from 'ancient-tracker/lib/tracking';
import { TLiveQuery } from '../lib/live-query';
export declare type TPostgresTracking = IPostgresTracking<IPostgresTrackingItem, ITrackingEventsList<IPostgresTrackingItem>>;
export interface IPostgresTrackingItemQuery {
    query: TLiveQuery;
    liveQueryId?: number;
}
export interface IPostgresTrackingItem extends ITrackingItem {
    query: IPostgresTrackingItemQuery;
}
export interface IPostgresTracking<ITE extends IPostgresTrackingItem, IEventsList extends ITrackingEventsList<ITE>> extends ITracking<ITE, IEventsList> {
    client: Client;
    liveTriggers: LiveTriggers;
    liveQueryIds: {
        [id: number]: string;
    };
    start(client?: Client, liveTriggers?: LiveTriggers): Promise<void>;
}
export declare function mixin<T extends TClass<IInstance>>(superClass: T): any;
export declare const MixedPostgresTracking: TClass<TPostgresTracking>;
export declare class PostgresTracking extends MixedPostgresTracking {
}
