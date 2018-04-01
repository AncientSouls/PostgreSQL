import { TClass, IInstance } from 'ancient-mixins/lib/mixins';
import { IQuery, IQueryEventsList } from './query';
export declare type TLiveQuery = ILiveQuery<IQueryEventsList>;
export interface ILiveQuery<IEL extends IQueryEventsList> extends IQuery<IEL> {
    _id(table: string): string;
    createLiveQuery(): string;
}
export declare function mixin<T extends TClass<IInstance>>(superClass: T): any;
export declare const MixedLiveQuery: TClass<TLiveQuery>;
export declare class LiveQuery extends MixedLiveQuery {
}
export declare const liveQuery: (exp: any) => string;
