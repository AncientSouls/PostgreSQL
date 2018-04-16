import { TClass, IInstance } from 'ancient-mixins/lib/mixins';
import { TTracksAdapter } from 'ancient-tracker/lib/tracks-adapter';
export declare function mixin<T extends TClass<IInstance>>(superClass: T): any;
export declare const MixedTracksAdapter: TClass<TTracksAdapter>;
export declare class Adapter extends MixedTracksAdapter {
}
