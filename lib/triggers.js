"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Triggers {
    constructor() {
        this._tracks = `ancient_postgresql_tracks`;
        this._iu = `ancient_postgresql_insert_update`;
        this._d = `ancient_postgresql_delete`;
        this._t = `ancient_postgresql_truncate`;
    }
    tracksTableInit() {
        return `CREATE TABLE IF NOT EXISTS ${this._tracks} (
      id SERIAL PRIMARY KEY,
      trackerId TEXT,
      channel TEXT,
      trackQuery TEXT,
      tracked TEXT
    );`;
    }
    tracksTableDeinit() {
        return `DROP TABLE IF EXISTS ${this._tracks};`;
    }
    tracksFunctionInit() {
        return `CREATE OR REPLACE FUNCTION ${this._tracks}_function() RETURNS TRIGGER AS $trigger$
      DECLARE tracked TEXT;
      BEGIN
        EXECUTE $exec$
          SELECT $$'$$ || string_agg ('"'||tracked||'"', $$', '$$) || $$'$$
          FROM ($exec$ || NEW.trackQuery || $exec$) AS tracked
        $exec$ INTO NEW.tracked;
        IF NEW.tracked IS NULL THEN
          NEW.tracked := $$('')$$;
        END IF;
        RETURN NEW;
      END;
    $trigger$ LANGUAGE PLPGSQL;`;
    }
    tracksFunctionDeinit() {
        return `DROP FUNCTION IF EXISTS ${this._tracks}_function;`;
    }
    tracksTriggerInit() {
        return `CREATE TRIGGER ${this._tracks}_trigger BEFORE INSERT OR UPDATE ON ${this._tracks} FOR EACH ROW EXECUTE PROCEDURE ${this._tracks}_function();`;
    }
    tracksTriggerDeinit() {
        return `DROP TRIGGER IF EXISTS ${this._tracks}_trigger ON ${this._tracks};`;
    }
    insertUpdateFunctionInit() {
        return `
      CREATE OR REPLACE function ${this._iu}_function() RETURNS TRIGGER AS $trigger$
      DECLARE currentTracking RECORD; BEGIN
        FOR currentTracking
        IN EXECUTE (
          SELECT COALESCE ((
            string_agg ($$(
              SELECT
                oneTracking.trackerId,
                oneTracking.channel
              FROM (
                (
                  SELECT
                    '$$ || ${this._tracks}.trackerId || $$' AS trackerId,
                    '$$ || ${this._tracks}.channel || $$' AS channel
                  FROM
                    ($$ || ${this._tracks}.trackQuery || $$) AS trackResults
                  WHERE
                    trackResults.id = '$$ || NEW.id || $$' and
                    trackResults.from = '$$ || TG_TABLE_NAME || $$'
                )
                UNION
                (
                  SELECT
                    '$$ || ${this._tracks}.trackerId || $$' AS trackerId,
                    '$$ || ${this._tracks}.channel || $$' AS channel
                  FROM
                    ($$ || ${this._tracks}.trackQuery || $$) AS trackResults
                  WHERE
                    '$$ || '"(' || TG_TABLE_NAME || $$,$$ || NEW.id || ')"' || $$' IN ($$ || ${this._tracks}.tracked || $$)
                )
              ) AS oneTracking
              LIMIT 1
            )$$, ' union ')
          ), 'select 1 limit 0')
          FROM ${this._tracks}
        )
        LOOP
          UPDATE ${this._tracks} SET tracked = '' WHERE trackerId = currentTracking.trackerId;
          PERFORM pg_notify (
            currentTracking.channel, 
            '{ "table": "' || TG_TABLE_NAME || E'", "id": ' || NEW.id || ', "trackerId": "' ||currentTracking.trackerId || '", "event": "' || TG_OP || '" }'
          );
        END LOOP;
        RETURN NEW;
      END; $trigger$ LANGUAGE plpgsql;
    `;
    }
    insertUpdateFunctionDeinit() {
        return `DROP FUNCTION IF EXISTS ${this._iu}_function;`;
    }
    deleteFunctionInit() {
        return `
      CREATE OR REPLACE function ${this._d}_function() RETURNS TRIGGER AS $trigger$
      DECLARE currentTracking RECORD; BEGIN
        FOR currentTracking
        IN EXECUTE (
          SELECT COALESCE ((
            string_agg ($$(
              SELECT
                oneTracking.trackerId,
                oneTracking.channel
              FROM (
                (
                  SELECT
                    '$$ || ${this._tracks}.trackerId || $$' AS trackerId,
                    '$$ || ${this._tracks}.channel || $$' AS channel
                  FROM
                    ($$ || ${this._tracks}.trackQuery || $$) AS trackResults
                  WHERE
                    trackResults.id = '$$ || OLD.id || $$' and
                    trackResults.from = '$$ || TG_TABLE_NAME || $$'
                )
                UNION
                (
                  SELECT
                    '$$ || ${this._tracks}.trackerId || $$' AS trackerId,
                    '$$ || ${this._tracks}.channel || $$' AS channel
                  FROM
                    ($$ || ${this._tracks}.trackQuery || $$) AS trackResults
                  WHERE
                    '$$ || '"(' || TG_TABLE_NAME || $$,$$ || OLD.id || ')"' || $$' IN ($$ || ${this._tracks}.tracked || $$)
                )
              ) AS oneTracking
              LIMIT 1
            )$$, ' union ')
          ), 'select 1 limit 0')
          FROM ${this._tracks}
        )
        LOOP
          UPDATE ${this._tracks} SET tracked = '' WHERE trackerId = currentTracking.trackerId;
          PERFORM pg_notify (
            currentTracking.channel, 
            '{ "table": "' || TG_TABLE_NAME || E'", "id": ' || OLD.id || ', "trackerId": "' ||currentTracking.trackerId || '", "event": "' || TG_OP || '" }'
          );
        END LOOP;
        RETURN OLD;
      END; $trigger$ LANGUAGE plpgsql;
    `;
    }
    deleteFunctionDeinit() {
        return `DROP FUNCTION IF EXISTS ${this._d}_function;`;
    }
    truncateFunctionInit() {
        return `
      CREATE OR REPLACE function ${this._t}_function() RETURNS TRIGGER AS $trigger$
      DECLARE currentTracking RECORD; BEGIN
        FOR currentTracking
        IN EXECUTE (
          SELECT COALESCE ((
            string_agg ($$(
              SELECT
                oneTracking.trackerId,
                oneTracking.channel
              FROM (
                (
                  SELECT
                    '$$ || ${this._tracks}.trackerId || $$' AS trackerId,
                    '$$ || ${this._tracks}.channel || $$' AS channel
                  FROM
                    ($$ || ${this._tracks}.trackQuery || $$) AS trackResults
                  WHERE
                    trackResults.from = '$$ || TG_TABLE_NAME || $$'
                )
                UNION
                (
                  SELECT 
                    '$$ || ${this._tracks}.trackerId || $$' as trackerId, 
                    '$$ || ${this._tracks}.channel || $$' as channel
                  FROM (
                    SELECT $s_a$'$s_a$ || string_agg('"'||trackQuery.id||'/'||trackQuery.from||'"', $s_a$', '$s_a$) || $s_a$'$s_a$ as track 
                    FROM ($$ || ${this._tracks}.trackQuery || $$) as trackQuery
                  ) as liveResults
                  WHERE 
                    liveResults.track is null or
                    liveResults.track <> $$ || '$$' || ${this._tracks}.tracked || '$$' || $$
                )
              ) AS oneTracking
              LIMIT 1
            )$$, ' union ')
          ), 'select 1 limit 0')
          FROM ${this._tracks}
        )
        LOOP
          UPDATE ${this._tracks} SET tracked = '' WHERE trackerId = currentTracking.trackerId;
          PERFORM pg_notify (
            currentTracking.channel, 
            '{ "table": "' || TG_TABLE_NAME || E'", "trackerId": "' ||currentTracking.trackerId || '", "event": "' || TG_OP || '" }'
          );
          END LOOP;
        RETURN NEW;
      END; $trigger$ LANGUAGE plpgsql;
    `;
    }
    truncateFunctionDeinit() {
        return `DROP FUNCTION IF EXISTS ${this._t}_function;`;
    }
    init() {
        return [
            this.tracksTableInit(),
            this.tracksFunctionInit(),
            this.tracksTriggerInit(),
            this.insertUpdateFunctionInit(),
            this.deleteFunctionInit(),
            this.truncateFunctionInit(),
        ].join('');
    }
    deinit() {
        return [
            this.tracksTableDeinit(),
            this.tracksFunctionDeinit(),
            this.tracksTriggerDeinit(),
            this.insertUpdateFunctionDeinit(),
            this.deleteFunctionDeinit(),
            this.truncateFunctionDeinit(),
        ].join('');
    }
    wrap(table) {
        return [
            `CREATE TRIGGER ${table}_${this._iu} AFTER INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE PROCEDURE ${this._iu}_function();`,
            `CREATE TRIGGER ${table}_${this._d} AFTER DELETE ON ${table} FOR EACH ROW EXECUTE PROCEDURE ${this._d}_function();`,
            `CREATE TRIGGER ${table}_${this._t} AFTER TRUNCATE ON ${table} EXECUTE PROCEDURE ${this._t}_function();`,
        ].join('');
    }
    unwrap(table) {
        return [
            `DROP TRIGGER IF EXISTS ${table}_${this._iu} ON ${table};`,
            `DROP TRIGGER IF EXISTS ${table}_${this._d} ON ${table};`,
            `DROP TRIGGER IF EXISTS ${table}_${this._t} ON ${table};`,
        ].join('');
    }
}
exports.Triggers = Triggers;
//# sourceMappingURL=triggers.js.map