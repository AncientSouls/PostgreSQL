"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const pg_1 = require("pg");
const live_triggers_1 = require("../lib/live-triggers");
const live_query_1 = require("../lib/live-query");
const tracking_1 = require("../lib/tracking");
const tracker_1 = require("ancient-tracker/lib/tracker");
const l = require("../lib/language");
const { SELECT, CONDITIONS: { AND, OR }, COMPARISONS: { EQ, NOT, GT, GTE, LT, LTE, IN, BETWEEN, LIKE, EXISTS, NULL }, VALUES: V, PATH, UNION, UNIONALL, } = l;
const { DATA } = V;
const delay = t => new Promise(resolve => setTimeout(resolve, t));
function default_1() {
    describe('Tracking:', () => {
        let client;
        const liveTriggers = new live_triggers_1.LiveTriggers();
        const cleaning = () => __awaiter(this, void 0, void 0, function* () {
            yield client.query(liveTriggers.dropTriggers('documents'));
            yield client.query(liveTriggers.dropFunctions());
            yield client.query(liveTriggers.dropTable(liveTriggers.liveQueriesTableName));
            yield client.query(liveTriggers.dropTable('documents'));
        });
        beforeEach(() => __awaiter(this, void 0, void 0, function* () {
            client = new pg_1.Client({
                user: 'postgres',
                host: 'localhost',
                database: 'postgres',
                password: 'postgres',
                port: 5432,
            });
            yield client.connect();
            yield cleaning();
            yield client.query(liveTriggers.createLiveQueriesTable());
            yield client.query(liveTriggers.createFunctions());
            yield client.query(`
        create table if not exists documents (
          id serial PRIMARY KEY,
          value int default 0
        );`);
            yield client.query(liveTriggers.createTriggers('documents'));
        }));
        afterEach(() => __awaiter(this, void 0, void 0, function* () {
            yield cleaning();
            yield client.end();
        }));
        it('lifecycle', () => __awaiter(this, void 0, void 0, function* () {
            const t = new tracking_1.PostgresTracking();
            yield t.start(client, liveTriggers);
            const tracker = new tracker_1.Tracker();
            const events = [];
            tracker.on('emit', ({ eventName }) => events.push(eventName));
            const q1 = new live_query_1.LiveQuery();
            q1.IExp(SELECT().FROM('documents')
                .WHERE(GT(PATH('value'), 2), LT(PATH('value'), 8))
                .ORDER(PATH('value'), true).LIMIT(2));
            tracker.init(t.track({ query: q1 }));
            yield delay(100);
            yield client.query(`insert into documents (value) values ${_.times(9, t => `(${t + 1})`)};`);
            yield tracker.subscribe();
            yield delay(100);
            console.log(yield client.query('select * from ancient_postgresql_live_queries'));
            yield t.stop();
        }));
    });
}
exports.default = default_1;
//# sourceMappingURL=tracking.js.map