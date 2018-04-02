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
const tracking_1 = require("ancient-tracker/lib/tracking");
function mixin(superClass) {
    return class PostgresTracking extends superClass {
        constructor() {
            super(...arguments);
            this.liveQueryIds = {};
        }
        start(client, liveTriggers) {
            const _super = name => super[name];
            return __awaiter(this, void 0, void 0, function* () {
                this.client = client;
                this.liveTriggers = liveTriggers;
                yield this.client.query(`LISTEN "${this.id}";`);
                client.on('notification', (n) => {
                    if (n.channel === this.id) {
                        const json = JSON.parse(n.payload);
                        this.override(this.items[this.liveQueryIds[json.query]]);
                    }
                });
                yield _super("start").call(this);
            });
        }
        stop() {
            const _super = name => super[name];
            return __awaiter(this, void 0, void 0, function* () {
                this.client.query(`UNLISTEN "${this.id}";`);
                yield _super("stop").call(this);
            });
        }
        tracked(item) {
            const _super = name => super[name];
            return __awaiter(this, void 0, void 0, function* () {
                const inserted = yield this.client.query(`insert into ${this.liveTriggers.liveQueriesTableName} (query, channel) values ($1, '${this.id}') returning id;`, [item.query.query.createLiveQuery()]);
                const liveQueryId = inserted.rows[0].id;
                this.liveQueryIds[liveQueryId] = item.tracker.id;
                item.query.liveQueryId = liveQueryId;
                _super("tracked").call(this, item);
            });
        }
        untracked(item) {
            const _super = name => super[name];
            return __awaiter(this, void 0, void 0, function* () {
                yield this.client.query(`delete from ${this.liveTriggers.liveQueriesTableName} where id = ${item.query.liveQueryId};`);
                delete this.liveQueryIds[item.query.liveQueryId];
                return _super("untracked").call(this, item);
            });
        }
        fetch(query) {
            return __awaiter(this, void 0, void 0, function* () {
                const result = yield this.client.query(query.query.createQuery(), query.query.params);
                return result.rows;
            });
        }
    };
}
exports.mixin = mixin;
exports.MixedPostgresTracking = mixin(tracking_1.Tracking);
class PostgresTracking extends exports.MixedPostgresTracking {
}
exports.PostgresTracking = PostgresTracking;
//# sourceMappingURL=tracking.js.map