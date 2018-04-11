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
        tracked text,
        channel text
      );`;
      // @todo добавить здесь триггер on insert новый трекинг, для заполнения tracked, либо если это возможно иначе заполнить tracked
    }

    createFunctionTrackings() {
      return `
      create or replace function ${this.trackingsTableName}_func() returns trigger as $trigger$
        DECLARE
          tracked text;
        begin
          EXECUTE $exec$ select $$'$$ || string_agg ('"'||q.id|| '/' ||q.table||'"', $$', '$$) || $$'$$ from ($exec$ || NEW.liveQuery || $exec$) as q $exec$ into NEW.tracked;
          if NEW.tracked is null then NEW.tracked := $$('')$$; end if;
        return NEW;
        end;
      $trigger$ LANGUAGE plpgsql;`;
    }

    createTriggerTrackings() {
      return `CREATE TRIGGER ${this.trackingsTableName}_${this.trackingsTableName}_func
        BEFORE INSERT OR UPDATE ON ${this.trackingsTableName}
        FOR EACH ROW
        EXECUTE PROCEDURE ${this.trackingsTableName}_func();`;
    }

    createFunctionInsertUpdate() {
      return `	
        create or replace function ${this.insertUpdateFunctionName}() returns trigger as $trigger$
          declare
            current record;
            query text;
         begin
            select 
              string_agg (
                $$( 
                  select 
                    channel, 
                    queryID, 
                    tracked 
                  from (
                    select 
                      '$$ || ${this.trackingsTableName}.channel::text || $$' as channel, 
                      $$ || ${this.trackingsTableName}.id::text || $$ as queryID, 
                      q2.tracked as tracked
                        from 
                          ($$ || ${this.trackingsTableName}.liveQuery || $$) as q,
                          (select array_agg('"'||q2.id||'/'||q2.table||'"') as tracked from 
                            ($$ || ${this.trackingsTableName}.liveQuery || $$) as q2) as q2
                        where 
                            q.table = '$$ || TG_TABLE_NAME || $$' and
                            q.id = $$ || NEW.id || $$
                  UNION
                    select 
                      '$$ || ${this.trackingsTableName}.channel::text || $$' as channel, 
                      $$ || ${this.trackingsTableName}.id::text || $$ as queryID, 
                      q2.tracked as tracked
                    from (
                      select 
                        array_agg('"'||q2.id||'/'||q2.table||'"') as tracked 
                      from (
                        $$ || ${this.trackingsTableName}.liveQuery || $$) as q2) as q2
                    where 
                      array[$$ || ${this.trackingsTableName}.tracked || $$] @> array['$$ || '"' || NEW.id || $$/$$ || TG_TABLE_NAME || '"' || $$']) as q limit 1
                )$$, 
              ' union ') into query 
            from ${this.trackingsTableName};

              

            if query is not null then
              for current in EXECUTE query LOOP
                if current.tracked is null then
                  current.tracked := array[''];
                end if;   
                  
                  update ${this.trackingsTableName} set tracked = '' where id = current.queryID;

                  PERFORM pg_notify (current.channel, '{ "table": "' || TG_TABLE_NAME || E'", "id": ' || NEW.id || ', "query": ' || current.queryID || ', "tracked": [' || array_to_string(current.tracked, ', ') || '], "event": "' || TG_OP || '"}'::text );
              end loop;
            end if;

            return new;
          end;
        $trigger$ LANGUAGE plpgsql;
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
        create or replace function ${this.deleteFunctionName}() returns trigger as $trigger$
          declare
            current record;
            query text;
          begin
            select 
              string_agg (
                $$( 
                  select 
                    channel, 
                    queryID, 
                    tracked 
                  from (
                    select 
                      '$$ || ${this.trackingsTableName}.channel::text || $$' as channel, 
                      $$ || ${this.trackingsTableName}.id::text || $$ as queryID, 
                      q2.tracked as tracked
                        from 
                          ($$ || ${this.trackingsTableName}.liveQuery || $$) as q,
                          (select array_agg('"'||q2.id||'/'||q2.table||'"') as tracked from 
                            ($$ || ${this.trackingsTableName}.liveQuery || $$) as q2) as q2
                        where 
                            q.table = '$$ || TG_TABLE_NAME || $$' and
                            q.id = $$ || OLD.id || $$
                  UNION
                    select 
                      '$$ || ${this.trackingsTableName}.channel::text || $$' as channel, 
                      $$ || ${this.trackingsTableName}.id::text || $$ as queryID, 
                      q2.tracked as tracked
                    from (
                      select 
                        array_agg('"'||q2.id||'/'||q2.table||'"') as tracked 
                      from (
                        $$ || ${this.trackingsTableName}.liveQuery || $$) as q2) as q2
                    where 
                      array[$$ || ${this.trackingsTableName}.tracked || $$] @> array['$$ || '"' || OLD.id || $$/$$ || TG_TABLE_NAME || '"' || $$']) as q limit 1
                )$$, 
              ' union ') into query 
            from ${this.trackingsTableName};

            if query is not null then
              for current in EXECUTE query LOOP
                if current.tracked is null then
                  current.tracked := array[''];
                end if;

                update ${this.trackingsTableName} set tracked = '' where id = current.queryID;

                PERFORM pg_notify (current.channel, '{ "table": "' || TG_TABLE_NAME || E'", "id": ' || OLD.id || ', "query": ' || current.queryID || ', "tracked": [' || array_to_string(current.tracked, ', ') || '], "event": "' || TG_OP || '"}'::text );

              end loop;
            end if;

            return OLD;
          end;
        $trigger$ LANGUAGE plpgsql;
      `;
    }
    createTriggerDelete(tableName) {
      return `CREATE TRIGGER ${tableName}_${this.deleteFunctionName}
        AFTER DELETE ON ${tableName}
        FOR EACH ROW
        EXECUTE PROCEDURE ${this.deleteFunctionName}();
      `;
    }
    createFunctionTruncate() {
      // @todo если liveQuery результаты отличаются от tracked, перезаписать tracked и сделать notify IPostgresTrackingNotification и return
      return `	
      create or replace function ${this.truncateFunctionName}() returns trigger as $trigger$
        declare
          current record;
          query text;
         begin
            select 
              string_agg (
                $$( 
                  select 
                    channel, 
                    queryID, 
                    tracked 
                  from (
                    select 
                      '$$ || ${this.trackingsTableName}.channel::text || $$' as channel, 
                      $$ || ${this.trackingsTableName}.id::text || $$ as queryID, 
                      q2.tracked as tracked
                        from 
                          ($$ || ${this.trackingsTableName}.liveQuery || $$) as q,
                          (select array_agg('"'||q2.id||'/'||q2.table||'"') as tracked from 
                            ($$ || ${this.trackingsTableName}.liveQuery || $$) as q2) as q2
                        where 
                            q.table = '$$ || TG_TABLE_NAME || $$'
                  UNION
                    select 
                      '$$ || ${this.trackingsTableName}.channel::text || $$' as channel, 
                      $$ || ${this.trackingsTableName}.id::text || $$ as queryID, 
                      q2.tracked as tracked
                    from (
                      select 
                        array_agg('"'||q2.id||'/'||q2.table||'"') as tracked 
                      from (
                        $$ || ${this.trackingsTableName}.liveQuery || $$) as q2) as q2) as q limit 1
                )$$, 
              ' union ') into query 
            from ${this.trackingsTableName};


          if query is not null then
            for current in EXECUTE query LOOP

              if current.tracked is null then
                current.tracked := array[''];
              end if;

              update ${this.trackingsTableName} set tracked = '' where id = current.queryID;
              PERFORM pg_notify (current.channel, '{ "table": "' || TG_TABLE_NAME || '", "query": ' || current.queryID || ', "tracked": [' || array_to_string(current.tracked, ', ') || '], "event": "' || TG_OP || '"}'::text );

            end loop;
          end if;

          return OLD;
        end;
      $trigger$ LANGUAGE plpgsql;
    `;
    }
    createTriggerTruncate(tableName) {
      return `CREATE TRIGGER ${tableName}_${this.truncateFunctionName}
        AFTER TRUNCATE ON ${tableName}
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
      return [this.createFunctionInsertUpdate(), this.createFunctionDelete(), this.createFunctionTruncate(), this.createFunctionTrackings()].join('');
    }
    createTriggers(tableName) {
      return [this.createTriggerInsertUpdate(tableName), this.createTriggerDelete(tableName), this.createTriggerTruncate(tableName)].join('');
    }
    createTrackingTrigger() {
      return [this.createTriggerTrackings()].join('');
    }
    dropTriggers(tableName) {
      return [this.dropTrigger(tableName, this.insertUpdateFunctionName), this.dropTrigger(tableName, this.deleteFunctionName), this.dropTrigger(tableName, this.truncateFunctionName)].join('');
    }
    dropFunctions() {
      return [this.dropFunction(this.insertUpdateFunctionName), this.dropFunction(this.deleteFunctionName), this.dropFunction(this.truncateFunctionName)].join('');
    }
  };
}

export const MixedTrackingTriggers: TClass<TTrackingTriggers> = mixin(Node);
export class TrackingTriggers extends MixedTrackingTriggers {}
