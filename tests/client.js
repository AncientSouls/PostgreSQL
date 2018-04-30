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
const pg = require("pg");
const babilon_1 = require("ancient-babilon/lib/babilon");
const client_1 = require("../lib/client");
const tracker_1 = require("ancient-tracker/lib/tracker");
const returns_references_1 = require("ancient-babilon/lib/returns-references");
const rules_full_1 = require("../lib/rules-full");
const resolver = rules_full_1.createResolver(rules_full_1.resolverOptions);
const triggers_1 = require("../lib/triggers");
const delay = (time) => __awaiter(this, void 0, void 0, function* () { return new Promise(res => setTimeout(res, time)); });
exports.default = () => {
    describe('Client', () => {
        let c;
        const triggers = new triggers_1.Triggers();
        const cleaning = () => __awaiter(this, void 0, void 0, function* () {
            yield c.query(`
        drop table if exists documents1;
      `);
            yield c.query(triggers.deinit());
            yield c.query(triggers.unwrap('documents1'));
        });
        beforeEach(() => __awaiter(this, void 0, void 0, function* () {
            c = new pg.Client({
                user: 'postgres',
                host: 'localhost',
                database: 'postgres',
                password: 'postgres',
                port: 5432,
            });
            yield c.connect();
            yield cleaning();
            yield c.query(`
        create table if not exists documents1 (
          id serial PRIMARY KEY,
          num int default 0
        );
      `);
            yield c.query(triggers.init());
            yield c.query(triggers.wrap('documents1'));
        }));
        afterEach(() => __awaiter(this, void 0, void 0, function* () {
            yield cleaning();
            yield c.end();
        }));
        it('lifecycle', () => __awaiter(this, void 0, void 0, function* () {
            const client = new client_1.Client();
            client.client = {
                triggers,
                pg: c,
            };
            yield client.start();
            const exp = order => ['select',
                ['returns', ['as', ['path', 'id'], '_id'], ['path', 'num']],
                ['from', ['alias', 'documents1']],
                ['and',
                    ['gt', ['path', 'documents1', 'num'], ['data', 2]],
                    ['lt', ['path', 'documents1', 'num'], ['data', 6]],
                ],
                ['orders', ['order', ['path', 'documents1', 'num'], order], ['order', ['path', 'documents1', 'id'], true]],
                ['limit', 2],
            ];
            const trackerQuery = (order = true) => ({
                fetchQuery: babilon_1.babilon({ resolver, validators: rules_full_1.validators, exp: exp(order) }).result,
                trackQuery: babilon_1.babilon({ resolver, validators: rules_full_1.validators, exp: returns_references_1.returnsReferences(exp(order), returns_references_1.generateReturnsAs()) }).result,
            });
            const tracker = new tracker_1.Tracker();
            tracker.query = trackerQuery(true);
            client.add(tracker);
            chai_1.assert.deepEqual(yield tracker.get(), []);
            yield c.query(`insert into documents1 (num) values (1);`);
            yield c.query(`insert into documents1 (num) values (2);`);
            yield c.query(`insert into documents1 (num) values (3);`);
            yield c.query(`insert into documents1 (num) values (4);`);
            yield c.query(`insert into documents1 (num) values (5);`);
            yield c.query(`insert into documents1 (num) values (6);`);
            chai_1.assert.deepEqual(yield tracker.get(), [
                { id: '3', item: { _id: 3, num: 3 }, oldIndex: -1, newIndex: 0 },
                { id: '4', item: { _id: 4, num: 4 }, oldIndex: -1, newIndex: 1 },
            ]);
            yield c.query(`insert into documents1 (id,num) values (9,3);`);
            chai_1.assert.deepEqual(yield tracker.get(), [
                { id: '4', item: { _id: 4, num: 4 }, oldIndex: 1, newIndex: -1 },
                { id: '9', item: { _id: 9, num: 3 }, oldIndex: -1, newIndex: 1 },
            ]);
            yield c.query(`update documents1 set num = 5 where id = 3;`);
            chai_1.assert.deepEqual(yield tracker.get(), [
                { id: '3', item: { _id: 3, num: 3 }, oldIndex: 0, newIndex: -1 },
                { id: '4', item: { _id: 4, num: 4 }, oldIndex: -1, newIndex: 1 },
            ]);
            yield c.query(`update documents1 set num = 6 where id = 3;`);
            chai_1.assert.deepEqual(yield tracker.get(), []);
            yield c.query(`update documents1 set num = 3 where id = 4;`);
            chai_1.assert.deepEqual(yield tracker.get(), [
                { id: '4', item: { _id: 4, num: 3 }, changed: true, oldIndex: 1, newIndex: 0 },
            ]);
            yield c.query(`delete from documents1 where id = 4;`);
            chai_1.assert.deepEqual(yield tracker.get(), [
                { id: '4', item: { _id: 4, num: 3 }, oldIndex: 0, newIndex: -1 },
                { id: '5', item: { _id: 5, num: 5 }, oldIndex: -1, newIndex: 1 },
            ]);
            yield c.query(`truncate documents1;`);
            chai_1.assert.deepEqual(yield tracker.get(), [
                { id: '5', item: { _id: 5, num: 5 }, oldIndex: 1, newIndex: -1 },
                { id: '9', item: { _id: 9, num: 3 }, oldIndex: 0, newIndex: -1 },
            ]);
            yield client.stop();
            yield delay(10);
        }));
    });
};
//# sourceMappingURL=client.js.map