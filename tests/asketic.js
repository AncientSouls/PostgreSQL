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
const babilon_1 = require("ancient-babilon/lib/babilon");
const client_1 = require("../lib/client");
const tracker_1 = require("ancient-tracker/lib/tracker");
const asket_1 = require("ancient-asket/lib/asket");
const asketic_1 = require("ancient-tracker/lib/asketic");
const bundles_1 = require("ancient-tracker/lib/bundles");
const test_1 = require("ancient-tracker/tests/test");
const returns_references_1 = require("ancient-babilon/lib/returns-references");
const rules_full_1 = require("../lib/rules-full");
const cursor_1 = require("ancient-cursor/lib/cursor");
const triggers_1 = require("../lib/triggers");
const babilonResolver = rules_full_1.createResolver(rules_full_1.resolverOptions);
const delay = (time) => __awaiter(this, void 0, void 0, function* () { return new Promise(res => setTimeout(res, time)); });
const testTableName = `test`;
exports.default = (env) => {
    describe(`Asketic`, () => {
        const triggers = new triggers_1.Triggers();
        const cleaning = () => __awaiter(this, void 0, void 0, function* () {
            yield env.client.query(`
        drop table if exists ${testTableName};
      `);
            yield env.client.query(triggers.deinit());
            yield env.client.query(triggers.unwrap(`${testTableName}`));
        });
        beforeEach(() => __awaiter(this, void 0, void 0, function* () {
            yield cleaning();
            yield env.client.query(`
        create table if not exists ${testTableName} (
          id serial PRIMARY KEY,
          num int default 0
        );
      `);
            yield env.client.query(triggers.init());
            yield env.client.query(triggers.wrap(`${testTableName}`));
        }));
        afterEach(() => __awaiter(this, void 0, void 0, function* () {
            yield cleaning();
        }));
        it(`lifecycle`, () => __awaiter(this, void 0, void 0, function* () {
            const client = new client_1.Client();
            client.client = {
                triggers,
                pg: env.client,
            };
            yield client.start();
            const asketic = new asketic_1.Asketic();
            const flow = {
                query: test_1.query,
                next: asket_1.asket,
                resolver: (flow) => __awaiter(this, void 0, void 0, function* () {
                    if (flow.name === `a` && flow.env.type === `root`) {
                        const tracker = new tracker_1.Tracker();
                        tracker.idField = `id`;
                        tracker.query = trackerQuery(expAll, {});
                        client.add(tracker);
                        return asketic.flowTracker(flow, tracker);
                    }
                    if (flow.name === `b` && flow.env.type === `item`) {
                        const tracker = new tracker_1.Tracker();
                        tracker.idField = `id`;
                        tracker.query = trackerQuery(expEqual, { num: flow.env.item.num });
                        client.add(tracker);
                        return asketic.flowTracker(flow, tracker);
                    }
                    if (flow.env.type === `items`)
                        return asketic.flowItem(flow);
                    return asketic.flowValue(flow);
                }),
            };
            const expAll = [`select`,
                [`returns`],
                [`from`, [`alias`, `${testTableName}`]],
                [`and`,
                    [`gt`, [`path`, `${testTableName}`, `num`], [`data`, 2]],
                    [`lt`, [`path`, `${testTableName}`, `num`], [`data`, 6]],
                ],
                [`orders`, [`order`, [`path`, `${testTableName}`, `num`], true], [`order`, [`path`, `${testTableName}`, `id`], true]],
                [`limit`, 2],
            ];
            const expEqual = [`select`,
                [`returns`],
                [`from`, [`alias`, `${testTableName}`]],
                [`and`,
                    [`eq`, [`path`, `${testTableName}`, `num`], [`variable`, `num`]],
                ],
                [`orders`, [`order`, [`path`, `${testTableName}`, `num`], true], [`order`, [`path`, `${testTableName}`, `id`], true]],
            ];
            const trackerQuery = (exp, variables) => ({
                fetchQuery: babilon_1.babilon({ validators: rules_full_1.validators, variables, exp, resolver: babilonResolver }).result,
                trackQuery: babilon_1.babilon({ validators: rules_full_1.validators, variables, exp: returns_references_1.returnsReferences(exp, returns_references_1.generateReturnsAs()), resolver: babilonResolver }).result,
            });
            const cursor = new cursor_1.Cursor();
            const result = yield asketic.next(flow);
            cursor.apply(bundles_1.dataToBundle(result.data));
            const update = () => __awaiter(this, void 0, void 0, function* () {
                const changes = yield asketic.get();
                const bundles = bundles_1.asketicChangesToBundles(changes);
                _.each(bundles, bundle => cursor.apply(bundle));
            });
            yield test_1.test(cursor, () => __awaiter(this, void 0, void 0, function* () {
                yield env.client.query(`insert into ${testTableName} (num) values (1);`);
                yield env.client.query(`insert into ${testTableName} (num) values (2);`);
                yield env.client.query(`insert into ${testTableName} (num) values (3);`);
                yield env.client.query(`insert into ${testTableName} (num) values (4);`);
                yield env.client.query(`insert into ${testTableName} (num) values (5);`);
                yield env.client.query(`insert into ${testTableName} (num) values (6);`);
                yield update();
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield env.client.query(`insert into ${testTableName} (id,num) values (9,3);`);
                yield update();
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield env.client.query(`update ${testTableName} set num = 5 where id = 3;`);
                yield update();
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield env.client.query(`update ${testTableName} set num = 6 where id = 3;`);
                yield update();
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield env.client.query(`update ${testTableName} set num = 3 where id = 4;`);
                yield update();
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield env.client.query(`delete from ${testTableName} where id = 4;`);
                yield update();
            }));
            yield client.stop();
            yield delay(10);
        }));
    });
};
//# sourceMappingURL=asketic.js.map