import * as _ from 'lodash';
import { assert } from 'chai';

import {
  TClass,
  IInstance,
} from 'ancient-mixins/lib/mixins';

import {
  Node,
  INode,
  INodeEventsList,
} from 'ancient-mixins/lib/node';



export interface ILiveTriggersEventsList extends INodeEventsList {
}

export type TLiveTriggers = ILiveTriggers<ILiveTriggersEventsList>;
export interface ILiveTriggers<IEL extends ILiveTriggersEventsList>
extends INode<IEL> {
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

  dropFunction(functionName): string;
  dropTrigger(tableName, triggerName): string;
  dropTable(tableName): string;
}

export function mixin<T extends TClass<IInstance>>(
  superClass: T,
): any {
  return class LiveTriggers extends superClass {
    public liveQueriesTableName = `ancient_postgresql_live_queries`;

    public insertUpdateFunctionName = `ancient_postgresql_insert_update_live`;
    public deleteFunctionName = `ancient_postgresql_delete_live`;
    public truncateFunctionName = `ancient_postgresql_truncate_live`;

    createLiveQueriesTable() {
      return `create table if not exists ${this.liveQueriesTableName} (
        id serial primary key,
        query text,
        channel text
      );`;
    }
    createFunctionInsertUpdate() {
      return `	
        create or replace function ${this.insertUpdateFunctionName}() returns trigger as $$
          declare
            current record;
            query text;
          begin
            select string_agg(
              E'select \\''||${this.liveQueriesTableName}.channel::text||E'\\' as channel, \\''||${this.liveQueriesTableName}.id::text||E'\\' as trackingID
                from (' || ${this.liveQueriesTableName}.query|| E') as q
                  where q.table = \\'' || TG_TABLE_NAME || E'\\' and
                  q.id = ' || NEW.id, ' union ') || ';' into query from ${this.liveQueriesTableName};
              for current in execute query loop
                PERFORM pg_notify (current.channel, '{ "table": "' || TG_TABLE_NAME || E'", "id": ' || NEW.id || ', "tracking": ' || current.trackingID || ', "event": "' || TG_OP || '"}'::text );
              end loop;
            return new;
          end;
        $$ LANGUAGE plpgsql;
      `;
    }
    createTriggerInsertUpdate(tableName) {
      return `CREATE TRIGGER ${tableName}_${this.insertUpdateFunctionName}
        AFTER INSERT or UPDATE ON ${tableName}
        FOR EACH ROW
        EXECUTE PROCEDURE ${this.insertUpdateFunctionName}();
      `;
    }
    createFunctionDelete() {
      return `	
        create or replace function ${this.deleteFunctionName}() returns trigger as $$
          declare
            current record;
            query text;
          begin
            select string_agg(
              E'select \\''||${this.liveQueriesTableName}.channel::text||E'\\' as channel, \\''||${this.liveQueriesTableName}.id::text||E'\\' as trackingID 
                from (' || ${this.liveQueriesTableName}.query|| E') as q 
                  where q.table = \\'' || TG_TABLE_NAME || E'\\' and 
                  q.id = ' || OLD.id, ' union ') || ';' into query from ${this.liveQueriesTableName};
              for current in EXECUTE query LOOP
                PERFORM pg_notify (current.channel, '{ "table": "' || TG_TABLE_NAME || '", "id": ' || OLD.id || ', "tracking": ' || current.trackingID || ', "event": "' || TG_OP || '"}'::text );
              end LOOP;
            return old;
          end;
        $$ LANGUAGE plpgsql;
      `;
    }
    createTriggerDelete(tableName) {
      return `CREATE TRIGGER ${tableName}_${this.deleteFunctionName}
        BEFORE DELETE ON ${tableName}
        FOR EACH ROW
        EXECUTE PROCEDURE ${this.deleteFunctionName}();
      `;
    }
    createFunctionTruncate() {
      return `	
        create or replace function ${this.truncateFunctionName}() returns trigger as $$
          declare
            current record;
            query text;
          begin
            select string_agg(
              E'select \\''||${this.liveQueriesTableName}.channel::text||E'\\' as channel, \\''||${this.liveQueriesTableName}.id::text||E'\\' as trackingID 
                from (' || ${this.liveQueriesTableName}.query|| E') as q 
                  where q.table = \\'' || TG_TABLE_NAME || E'\\'', ' union ') || ';' into query from ${this.liveQueriesTableName};
              for current in EXECUTE query LOOP
                PERFORM pg_notify (current.channel, '{ "table": "' || TG_TABLE_NAME ||'", "tracking": ' || current.trackingID || ', "event": "' || TG_OP || '"}'::text );
              end LOOP;
            return old;
          end;
        $$ LANGUAGE plpgsql;
      `;
    }
    createTriggerTruncate(tableName) {
      return `CREATE TRIGGER ${tableName}_${this.truncateFunctionName}
        BEFORE TRUNCATE ON ${tableName}
        EXECUTE PROCEDURE ${this.truncateFunctionName}();
      `;
    }
    dropFunction(functionName) {
      return `DROP function IF EXISTS ${functionName} ();`;
    }
    dropTrigger(tableName, functionName) {
      return `DROP trigger IF EXISTS ${tableName}_${functionName} on ${tableName};`;
    }
    dropTable(tableName) {
      return `DROP table IF EXISTS ${tableName};`;
    }
    createFunctions() {
      return [
        this.createFunctionInsertUpdate(),
        this.createFunctionDelete(),
        this.createFunctionTruncate(),
      ].join('');
    }
    createTriggers(tableName) {
      return [
        this.createTriggerInsertUpdate(tableName),
        this.createTriggerDelete(tableName),
        this.createTriggerTruncate(tableName),
      ].join('');
    }
    dropTriggers(tableName) {
      return [
        this.dropTrigger(tableName, this.insertUpdateFunctionName),
        this.dropTrigger(tableName, this.deleteFunctionName),
        this.dropTrigger(tableName, this.truncateFunctionName),
      ].join('');
    }
    dropFunctions() {
      return [
        this.dropFunction(this.insertUpdateFunctionName),
        this.dropFunction(this.deleteFunctionName),
        this.dropFunction(this.truncateFunctionName),
      ].join('');
    }
  };
}

export const MixedLiveTriggers: TClass<TLiveTriggers> = mixin(Node);
export class LiveTriggers extends MixedLiveTriggers {}
