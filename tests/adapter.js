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
const pg_1 = require("pg");
const babilon_1 = require("ancient-babilon/lib/babilon");
const adapter_1 = require("../lib/adapter");
const tracker_1 = require("ancient-tracker/lib/tracker");
const tracker_test_1 = require("ancient-tracker/tests/tracker-test");
const returns_references_1 = require("ancient-babilon/lib/returns-references");
const rules_full_1 = require("../lib/rules-full");
const resolver = rules_full_1.createResolver(rules_full_1.resolverOptions);
const triggers_1 = require("../lib/triggers");
exports.default = () => {
    describe('adapter', () => {
        let client;
        const triggers = new triggers_1.Triggers();
        const cleaning = () => __awaiter(this, void 0, void 0, function* () {
            yield client.query(`
        drop table if exists documents1;
        drop table if exists documents2;
      `);
            yield client.query(triggers.deinit());
            yield client.query(triggers.unwrap('documents1'));
            yield client.query(triggers.unwrap('documents2'));
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
            yield client.query(`
        create table if not exists documents1 (
          id serial PRIMARY KEY,
          num int default 0
        );
        create table if not exists documents2 (
          id serial PRIMARY KEY,
          num int default 0
        );
      `);
            yield client.query(triggers.init());
            yield client.query(triggers.wrap('documents1'));
            yield client.query(triggers.wrap('documents2'));
        }));
        afterEach(() => __awaiter(this, void 0, void 0, function* () {
            yield cleaning();
            yield client.end();
        }));
        it('lifecycle', () => __awaiter(this, void 0, void 0, function* () {
            const _e = [];
            const adapter = new adapter_1.Adapter('abc');
            yield adapter.start({ client, triggers });
            const tracker = new tracker_1.Tracker();
            const exp = order => ['select',
                ['returns'],
                ['from', ['alias', 'documents1']],
                ['and',
                    ['gt', ['path', 'documents1', 'num'], ['data', 2]],
                    ['lt', ['path', 'documents1', 'num'], ['data', 6]],
                ],
                ['orders', ['order', ['path', 'documents1', 'num'], order], ['order', ['path', 'documents1', 'id'], true]],
                ['limit', 2],
            ];
            const q = (order = true) => ({
                triggers,
                fetchQuery: babilon_1.babilon({ resolver, validators: rules_full_1.validators, exp: exp(order) }).result,
                trackQuery: babilon_1.babilon({ resolver, validators: rules_full_1.validators, exp: returns_references_1.returnsReferences(exp(order), returns_references_1.generateReturnsAs()) }).result,
            });
            yield tracker_test_1.delay(5);
            yield tracker_test_1.default(adapter, tracker, q(true), q(false), () => __awaiter(this, void 0, void 0, function* () {
                yield client.query(`insert into documents1 (num) values (1);`);
                yield client.query(`insert into documents1 (num) values (2);`);
                yield client.query(`insert into documents1 (num) values (3);`);
                yield client.query(`insert into documents1 (num) values (4);`);
                yield client.query(`insert into documents1 (num) values (5);`);
                yield client.query(`insert into documents1 (num) values (6);`);
                yield tracker_test_1.delay(5);
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield client.query(`insert into documents1 (id,num) values (9,3);`);
                yield tracker_test_1.delay(5);
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield client.query(`update documents1 set num = 5 where id = 3;`);
                yield tracker_test_1.delay(5);
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield client.query(`update documents1 set num = 6 where id = 3;`);
                yield tracker_test_1.delay(5);
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield client.query(`update documents1 set num = 3 where id = 4;`);
                yield tracker_test_1.delay(5);
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield client.query(`delete from documents1 where id = 4;`);
                yield tracker_test_1.delay(5);
            }));
            yield adapter.stop();
        }));
        it('truncate', () => __awaiter(this, void 0, void 0, function* () {
            const _e = [];
            const adapter = new adapter_1.Adapter('abc');
            yield adapter.start({ client, triggers });
            const tracker = new tracker_1.Tracker();
            const exp = order => ['select',
                ['returns'],
                ['from', ['alias', 'documents1']],
                ['and',
                    ['gt', ['path', 'documents1', 'num'], ['data', 2]],
                    ['lt', ['path', 'documents1', 'num'], ['data', 6]],
                ],
                ['orders', ['order', ['path', 'documents1', 'num'], order], ['order', ['path', 'documents1', 'id'], true]],
                ['limit', 2],
            ];
            const q = (order = true) => ({
                triggers,
                fetchQuery: babilon_1.babilon({ resolver, validators: rules_full_1.validators, exp: exp(order) }).result,
                trackQuery: babilon_1.babilon({ resolver, validators: rules_full_1.validators, exp: returns_references_1.returnsReferences(exp(order), returns_references_1.generateReturnsAs()) }).result,
            });
            yield tracker_test_1.delay(5);
            tracker.init(adapter.track(q(true)));
            yield tracker.subscribe();
            chai_1.assert.deepEqual(tracker.ids, []);
            chai_1.assert.deepEqual(tracker.memory, {});
            yield client.query(`insert into documents1 (num) values (1);`);
            yield client.query(`insert into documents1 (num) values (2);`);
            yield client.query(`insert into documents1 (num) values (3);`);
            yield client.query(`insert into documents1 (num) values (4);`);
            yield client.query(`insert into documents1 (num) values (5);`);
            yield client.query(`insert into documents1 (num) values (6);`);
            yield tracker_test_1.delay(5);
            chai_1.assert.deepEqual(tracker.ids, [3, 4]);
            chai_1.assert.deepEqual(tracker.memory, {
                3: { id: 3, num: 3 },
                4: { id: 4, num: 4 },
            });
            yield client.query(`truncate documents1;`);
            yield tracker_test_1.delay(5);
            chai_1.assert.deepEqual(tracker.ids, []);
            chai_1.assert.deepEqual(tracker.memory, {});
            yield tracker.unsubscribe();
            tracker.destroy();
            yield adapter.stop();
        }));
    });
};
//# sourceMappingURL=adapter.js.map