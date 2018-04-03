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



export interface ITrackingTriggersEventsList extends INodeEventsList {
}

export type TTrackingTriggers = ITrackingTriggers<ITrackingTriggersEventsList>;
export interface ITrackingTriggers<IEL extends ITrackingTriggersEventsList>
extends INode<IEL> {
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

  dropFunction(functionName): string;
  dropTrigger(tableName, triggerName): string;
  dropTable(tableName): string;
}

export function mixin<T extends TClass<IInstance>>(
  superClass: T,
): any {
  return class TrackingTriggers extends superClass {
    public trackingsTableName = `ancient_postgresql_trackings`;

    public insertUpdateFunctionName = `ancient_postgresql_insert_update_live`;
    public deleteFunctionName = `ancient_postgresql_delete_live`;
    public truncateFunctionName = `ancient_postgresql_truncate_live`;

    initTrackings() {
      return `create table if not exists ${this.trackingsTableName} (
        id serial primary key,
        fetchQuery text,
        liveQuery text,
        tracked text default '',
        channel text
      );`;
      // @todo добавить здесь триггер on insert новый трекинг, для заполнения tracked, либо если это возможно иначе заполнить tracked
    }
    createFunctionInsertUpdate() {
      // @todo если есть в liveQuery или в (in(tracked) and not in(liveQuery)), перезаписать tracked, notify IPostgresTrackingNotification и return
      return `	
        create or replace function ${this.insertUpdateFunctionName}() returns trigger as $$
          declare
            current record;
            query text;
          begin
            select string_agg(
              E'select \\''||${this.trackingsTableName}.channel::text||E'\\' as channel, \\''||${this.trackingsTableName}.id::text||E'\\' as queryID
                from (' || ${this.trackingsTableName}.query|| E') as q
                  where q.table = \\'' || TG_TABLE_NAME || E'\\' and
                  q.id = ' || NEW.id, ' union ') || ';' into query from ${this.trackingsTableName};
            if query is not null then
              for current in EXECUTE query LOOP
                PERFORM pg_notify (current.channel, '{ "table": "' || TG_TABLE_NAME || E'", "id": ' || NEW.id || ', "query": ' || current.queryID || ', "event": "' || TG_OP || '"}'::text );
              end loop;
            end if;
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
      // @todo если есть в liveQuery или в (in(tracked) and not in(liveQuery)), перезаписать tracked, notify IPostgresTrackingNotification и return
      return `	
        create or replace function ${this.deleteFunctionName}() returns trigger as $$
          declare
            current record;
            query text;
          begin
            select string_agg(
              E'select \\''||${this.trackingsTableName}.channel::text||E'\\' as channel, \\''||${this.trackingsTableName}.id::text||E'\\' as queryID 
                from (' || ${this.trackingsTableName}.query|| E') as q 
                  where q.table = \\'' || TG_TABLE_NAME || E'\\' and 
                  q.id = ' || OLD.id, ' union ') || ';' into query from ${this.trackingsTableName};
              for current in EXECUTE query LOOP
                PERFORM pg_notify (current.channel, '{ "table": "' || TG_TABLE_NAME || '", "id": ' || OLD.id || ', "query": ' || current.queryID || ', "event": "' || TG_OP || '"}'::text );
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
      // @todo если liveQuery результаты отличаются от tracked, перезаписать tracked и сделать notify IPostgresTrackingNotification и return
      return `	
        create or replace function ${this.truncateFunctionName}() returns trigger as $$
          declare
            current record;
            query text;
          begin
            select string_agg(
              E'select \\''||${this.trackingsTableName}.channel::text||E'\\' as channel, \\''||${this.trackingsTableName}.id::text||E'\\' as queryID 
                from (' || ${this.trackingsTableName}.query|| E') as q 
                  where q.table = \\'' || TG_TABLE_NAME || E'\\'', ' union ') || ';' into query from ${this.trackingsTableName};
              for current in EXECUTE query LOOP
                PERFORM pg_notify (current.channel, '{ "table": "' || TG_TABLE_NAME ||'", "query": ' || current.queryID || ', "event": "' || TG_OP || '"}'::text );
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

export const MixedTrackingTriggers: TClass<TTrackingTriggers> = mixin(Node);
export class TrackingTriggers extends MixedTrackingTriggers {}
