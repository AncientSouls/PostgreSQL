import { TClass, IInstance } from 'ancient-mixins/lib/mixins';
import { INode, INodeEventsList } from 'ancient-mixins/lib/node';
export interface ILiveTriggersEventsList extends INodeEventsList {
}
export declare type TLiveTriggers = ILiveTriggers<ILiveTriggersEventsList>;
export interface ILiveTriggers<IEL extends ILiveTriggersEventsList> extends INode<IEL> {
    liveQueriesTableName: string;
    insertUpdateFunctionName: string;
    truncateFunctionName: string;
    createLiveQueriesTable(): string;
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
export declare const MixedLiveTriggers: TClass<TLiveTriggers>;
export declare class LiveTriggers extends MixedLiveTriggers {
}
