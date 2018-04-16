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
const tracks_adapter_1 = require("ancient-tracker/lib/tracks-adapter");
function mixin(superClass) {
    return class Adapter extends superClass {
        starting() {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.client.client.query(`listen "${this.id}";`);
                this.client.client.on('notification', (n) => {
                    if (n.channel === this.id) {
                        const json = JSON.parse(n.payload);
                        const item = this.items[json.trackerId];
                        item.memory = json.fetched;
                        this.override(item);
                    }
                });
            });
        }
        stopping() {
            return __awaiter(this, void 0, void 0, function* () {
                this.client.client.query(`unlisten "${this.id}";`);
            });
        }
        isChanged(id, data, item) {
            return !_.isEqual(_.toPlainObject(data), item.tracker.memory[id]);
        }
        tracked(item) {
            const _super = name => super[name];
            return __awaiter(this, void 0, void 0, function* () {
                yield this.client.client.query(`insert into ${this.client.triggers._tracks} (trackerId,channel,fetchQuery,trackQuery) values ($1,$2,$3,$4);`, [
                    item.tracker.id,
                    this.id,
                    item.query.fetchQuery,
                    item.query.trackQuery,
                ]);
                const results = yield this.client.client.query(item.query.fetchQuery);
                item.memory = results.rows;
                yield _super("tracked").call(this, item);
            });
        }
        untracked(item) {
            const _super = name => super[name];
            return __awaiter(this, void 0, void 0, function* () {
                yield this.client.client.query(`delete from ${this.client.triggers._tracks} where trackerId = $1;`, [
                    item.tracker.id,
                ]);
                yield _super("untracked").call(this, item);
            });
        }
    };
}
exports.mixin = mixin;
exports.MixedTracksAdapter = mixin(tracks_adapter_1.TracksAdapter);
class Adapter extends exports.MixedTracksAdapter {
}
exports.Adapter = Adapter;
//# sourceMappingURL=adapter.js.map