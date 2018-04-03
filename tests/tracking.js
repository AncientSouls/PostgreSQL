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
const chai_1 = require("chai");
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
            yield client.query(trackingTriggers.dropFunctions());
            yield client.query(trackingTriggers.dropTable(trackingTriggers.trackingsTableName));
            yield client.query(trackingTriggers.dropTable('documents'));
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
            yield client.query(trackingTriggers.createTrackingsTable());
            yield client.query(trackingTriggers.createFunctions());
            yield client.query(`
        create table if not exists documents (
          id serial PRIMARY KEY,
          value int default 0
        );`);
            yield client.query(trackingTriggers.createTriggers('documents'));
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
            q1.IExp(SELECT().FROM('documents')
                .WHERE(GT(PATH('value'), 2), LT(PATH('value'), 8))
                .ORDER(PATH('value'), true).LIMIT(2));
            const q2 = new live_query_1.LiveQuery();
            q2.IExp(SELECT().FROM('documents')
                .WHERE(GT(PATH('value'), 2), LT(PATH('value'), 8))
                .ORDER(PATH('value'), false).LIMIT(2));
            tracker.init(t.track({ query: q1 }));
            yield delay(100);
            yield client.query(`insert into documents (value) values ${_.times(9, t => `(${t + 1})`)};`);
            yield tracker.subscribe();
            yield delay(100);
            chai_1.assert.deepEqual(tracker.ids, [3, 4]);
            chai_1.assert.deepEqual(tracker.memory, {
                3: { id: 3, value: 3 },
                4: { id: 4, value: 4 },
            });
            yield client.query(`update documents set value = 6 where id = 3`);
            yield delay(100);
            chai_1.assert.deepEqual(tracker.ids, [4, 5]);
            chai_1.assert.deepEqual(tracker.memory, {
                4: { id: 4, value: 4 },
                5: { id: 5, value: 5 },
            });
            yield client.query(`update documents set value = 3 where id = 5`);
            yield delay(100);
            chai_1.assert.deepEqual(tracker.ids, [5, 4]);
            chai_1.assert.deepEqual(tracker.memory, {
                4: { id: 4, value: 4 },
                5: { id: 5, value: 3 },
            });
            yield client.query(`update documents set value = 5 where id = 5`);
            yield delay(100);
            chai_1.assert.deepEqual(tracker.ids, [4, 5]);
            chai_1.assert.deepEqual(tracker.memory, {
                4: { id: 4, value: 4 },
                5: { id: 5, value: 5 },
            });
            yield tracker.unsubscribe();
            chai_1.assert.deepEqual(tracker.ids, [4, 5]);
            chai_1.assert.deepEqual(tracker.memory, {
                4: { id: 4, value: 4 },
                5: { id: 5, value: 5 },
            });
            tracker.init(t.track(q2));
            yield tracker.subscribe();
            chai_1.assert.deepEqual(tracker.ids, [7, 3]);
            chai_1.assert.deepEqual(tracker.memory, {
                7: { id: 7, value: 7 },
                3: { id: 3, value: 6 },
            });
            yield tracker.unsubscribe();
            tracker.destroy();
            chai_1.assert.deepEqual(tracker.ids, [7, 3]);
            chai_1.assert.deepEqual(tracker.memory, {
                7: { id: 7, value: 7 },
                3: { id: 3, value: 6 },
            });
            tracker.clean();
            chai_1.assert.deepEqual(tracker.ids, []);
            chai_1.assert.deepEqual(tracker.memory, {});
            yield delay(100);
            yield t.stop();
        }));
    });
}
exports.default = default_1;
//# sourceMappingURL=tracking.js.map