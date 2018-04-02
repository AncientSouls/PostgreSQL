"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("ancient-mixins/lib/node");
function mixin(superClass) {
    return class LiveTriggers extends superClass {
        constructor() {
            super(...arguments);
            this.liveQueriesTableName = `ancient_postgresql_live_queries`;
            this.insertUpdateFunctionName = `ancient_postgresql_insert_update_live`;
            this.deleteFunctionName = `ancient_postgresql_delete_live`;
            this.truncateFunctionName = `ancient_postgresql_truncate_live`;
        }
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
              E'select \\''||${this.liveQueriesTableName}.channel::text||E'\\' as channel, \\''||${this.liveQueriesTableName}.id::text||E'\\' as queryID
                from (' || ${this.liveQueriesTableName}.query|| E') as q
                  where q.table = \\'' || TG_TABLE_NAME || E'\\' and
                  q.id = ' || NEW.id, ' union ') || ';' into query from ${this.liveQueriesTableName};
            if query is not null then
              for current in execute query loop
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
            return `	
        create or replace function ${this.deleteFunctionName}() returns trigger as $$
          declare
            current record;
            query text;
          begin
            select string_agg(
              E'select \\''||${this.liveQueriesTableName}.channel::text||E'\\' as channel, \\''||${this.liveQueriesTableName}.id::text||E'\\' as queryID 
                from (' || ${this.liveQueriesTableName}.query|| E') as q 
                  where q.table = \\'' || TG_TABLE_NAME || E'\\' and 
                  q.id = ' || OLD.id, ' union ') || ';' into query from ${this.liveQueriesTableName};
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
            return `	
        create or replace function ${this.truncateFunctionName}() returns trigger as $$
          declare
            current record;
            query text;
          begin
            select string_agg(
              E'select \\''||${this.liveQueriesTableName}.channel::text||E'\\' as channel, \\''||${this.liveQueriesTableName}.id::text||E'\\' as queryID 
                from (' || ${this.liveQueriesTableName}.query|| E') as q 
                  where q.table = \\'' || TG_TABLE_NAME || E'\\'', ' union ') || ';' into query from ${this.liveQueriesTableName};
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
exports.mixin = mixin;
exports.MixedLiveTriggers = mixin(node_1.Node);
class LiveTriggers extends exports.MixedLiveTriggers {
}
exports.LiveTriggers = LiveTriggers;
//# sourceMappingURL=live-triggers.js.map