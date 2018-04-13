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
const tracking_triggers_1 = require("../lib/tracking-triggers");
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
        const trackingTriggers = new tracking_triggers_1.TrackingTriggers();
        const cleaning = () => __awaiter(this, void 0, void 0, function* () {
            yield client.query(trackingTriggers.dropTriggers('documents'));
            yield client.query(trackingTriggers.dropTriggers('documents2'));
            yield client.query(trackingTriggers.dropFunctions());
            yield client.query(trackingTriggers.dropTable(trackingTriggers.trackingsTableName));
            yield client.query(trackingTriggers.dropTable('documents'));
            yield client.query(trackingTriggers.dropTable('documents2'));
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
            yield client.query(trackingTriggers.initTrackings());
            yield client.query(trackingTriggers.createFunctions());
            yield client.query(`
        create table if not exists documents (
          id serial PRIMARY KEY,
          value int default 0
        );
        create table if not exists documents2 (
          id serial PRIMARY KEY,
          value int default 0
        );`);
            yield client.query(trackingTriggers.createTriggers('documents'));
            yield client.query(trackingTriggers.createTriggers('documents2'));
            yield client.query(trackingTriggers.createTrackingTrigger());
        }));
        afterEach(() => __awaiter(this, void 0, void 0, function* () {
            yield cleaning();
            yield client.end();
        }));
        it('lifecycle', () => __awaiter(this, void 0, void 0, function* () {
            const t = new tracking_1.PostgresTracking();
            yield t.start(client, trackingTriggers);
            const tracker = new tracker_1.Tracker();
            const events = [];
            tracker.on('emit', ({ eventName }) => events.push(eventName));
            const q1 = new live_query_1.LiveQuery();
            q1.IExp(UNION(SELECT().FROM('documents')
                .WHERE(GT(PATH('documents', 'value'), 2), LT(PATH('documents', 'value'), 8)).ORDER(PATH('documents', 'value'), false).LIMIT(2), SELECT().FROM('documents2')
                .WHERE(GT(PATH('documents2', 'value'), 2), LT(PATH('documents2', 'value'), 8)).ORDER(PATH('documents2', 'value'), false).LIMIT(2)));
            const q2 = new live_query_1.LiveQuery();
            q2.IExp(SELECT().FROM('documents')
                .WHERE(GT(PATH('value'), 2), LT(PATH('value'), 8))
                .ORDER(PATH('value'), false).LIMIT(2));
            const notifications = [];
            const notifications2 = [];
            yield client.query(`listen ch1`);
            yield client.query(`listen ch2`);
            client.on('notification', msg => msg.channel === 'ch1' ? notifications.push(msg.payload) : notifications2.push(msg.payload));
            const inserted1 = yield client.query(`insert into ancient_postgresql_trackings (fetchQuery, liveQuery, channel) values ($1, $2, 'ch1') returning id;`, [
                q1.createQuery(),
                q1.createLiveQuery(),
            ]);
            const inserted = yield client.query(`insert into ancient_postgresql_trackings (fetchQuery, liveQuery, channel) values ($1, $2, 'ch2') returning id;`, [
                q2.createQuery(),
                q2.createLiveQuery(),
            ]);
            yield client.query(`insert into documents (value) values ${_.times(9, t => `(${t + 1})`)};`);
            yield client.query(`insert into documents2 (value) values (4)`);
            yield client.query(`insert into documents (value) values (0)`);
            yield client.query(`update documents set value = 4 where id > 4`);
            yield client.query(`TRUNCATE DOCUMENTS;`);
            yield client.query(`insert into documents (value) values (3)`);
            yield client.query(`update documents set value = 4 where id = 12`);
            yield client.query(`update documents set value = 1 where id = 12`);
            yield client.query(`update documents set value = 3 where id = 12`);
            yield client.query(`DELETE from documents where value = 1`);
            yield client.query(`DELETE from documents where value = 3`);
            yield client.query(`insert into documents (value) values ${_.times(9, t => `(${t + 1})`)};`);
            yield client.query(`DELETE from documents where id = 19`);
            yield client.query(`DELETE from documents where value > 0`);
            yield client.query(`TRUNCATE DOCUMENTS;`);
            yield client.query(`TRUNCATE documents2`);
            console.log(notifications);
        }));
    });
}
exports.default = default_1;
//# sourceMappingURL=tracking.js.map