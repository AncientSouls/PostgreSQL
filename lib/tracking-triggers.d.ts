import { TClass, IInstance } from 'ancient-mixins/lib/mixins';
import { INode, INodeEventsList } from 'ancient-mixins/lib/node';
export interface ITrackingTriggersEventsList extends INodeEventsList {
}
export declare type TTrackingTriggers = ITrackingTriggers<ITrackingTriggersEventsList>;
export interface ITrackingTriggers<IEL extends ITrackingTriggersEventsList> extends INode<IEL> {
    trackingsTableName: string;
    insertUpdateFunctionName: string;
    truncateFunctionName: string;
    createTrackingsTable(): string;
    createFunctionInsertUpdate(): string;
    createFunctionDelete(): string;
    createFunctions(): string;
    createTriggerInsertUpdate(tableName: string): string;
    createTriggerDelete(tableName: string): string;
    createTriggers(tableName: string): string;
    dropFunction(functionName: any): string;
    dropTrigger(tableName: any, triggerName: any): string;
    dropTable(tableName: any): string;
}
export declare function mixin<T extends TClass<IInstance>>(superClass: T): any;
export declare const MixedTrackingTriggers: TClass<TTrackingTriggers>;
export declare class TrackingTriggers extends MixedTrackingTriggers {
}
