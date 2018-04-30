import { TClass, IInstance } from 'ancient-mixins/lib/mixins';
import { TClient } from 'ancient-tracker/lib/client';
export declare function mixin<T extends TClass<IInstance>>(superClass: T): any;
export declare const MixedClient: TClass<TClient>;
export declare class Client extends MixedClient {
}
