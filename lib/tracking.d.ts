import { Client } from 'pg';
import { TrackingTriggers } from './tracking-triggers';
import { TClass, IInstance } from 'ancient-mixins/lib/mixins';
import { ITrackingEventsList, ITrackingItem, ITracking } from 'ancient-tracker/lib/tracking';
import { TLiveQuery } from '../lib/live-query';
export declare type TPostgresTracking = IPostgresTracking<IPostgresTrackingItem, ITrackingEventsList<IPostgresTrackingItem>>;
export interface IPostgresTrackingItemQuery {
    liveQuery: TLiveQuery;
    liveQueryId?: number;
}
export interface IPostgresTrackingItem extends ITrackingItem {
    query: IPostgresTrackingItemQuery;
}
export interface IPostgresTracking<ITE extends IPostgresTrackingItem, IEventsList extends ITrackingEventsList<ITE>> extends ITracking<ITE, IEventsList> {
    client: Client;
    trackingTriggers: TrackingTriggers;
    liveQueryIds: {
        [id: number]: string;
    };
    start(client?: Client, trackingTriggers?: TrackingTriggers): Promise<void>;
}
export declare function mixin<T extends TClass<IInstance>>(superClass: T): any;
export declare const MixedPostgresTracking: TClass<TPostgresTracking>;
export declare class PostgresTracking extends MixedPostgresTracking {
}
