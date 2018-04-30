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
const client_1 = require("ancient-tracker/lib/client");
function mixin(superClass) {
    return class Adapter extends superClass {
        starting() {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.client.pg.query(`listen "${this.id}";`);
                this.client.pg.on('notification', (n) => {
                    if (n.channel === this.id) {
                        const json = JSON.parse(n.payload);
                        const tracker = this.list.nodes[json.trackerId];
                        tracker.set([]);
                    }
                });
            });
        }
        stopping() {
            return __awaiter(this, void 0, void 0, function* () {
                this.client.pg.query(`unlisten "${this.id}";`);
            });
        }
        tracking(tracker) {
            return __awaiter(this, void 0, void 0, function* () {
                tracker.fetch = () => __awaiter(this, void 0, void 0, function* () { return _.map((yield this.client.pg.query(tracker.query.fetchQuery)).rows, r => _.toPlainObject(r)); });
                yield this.client.pg.query(`insert into ${this.client.triggers._tracks} (trackerId,channel,trackQuery) values ($1,$2,$3);`, [tracker.id, this.id, tracker.query.trackQuery]);
            });
        }
        untracking(tracker) {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.client.pg.query(`delete from ${this.client.triggers._tracks} where trackerId = $1;`, [tracker.id]);
            });
        }
    };
}
exports.mixin = mixin;
exports.MixedClient = mixin(client_1.Client);
class Client extends exports.MixedClient {
}
exports.Client = Client;
//# sourceMappingURL=client.js.map