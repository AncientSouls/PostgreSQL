import { TClass, IInstance } from 'ancient-mixins/lib/mixins';
import { TQuery } from './query';
export declare function mixin<T extends TClass<IInstance>>(superClass: T): any;
export declare const MixedQueryAll: TClass<TQuery>;
export declare class QueryAll extends MixedQueryAll {
}
