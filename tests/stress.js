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
require("colors");
const blessed = require("blessed");
const contrib = require("blessed-contrib");
const babilon_1 = require("ancient-babilon/lib/babilon");
const client_1 = require("../lib/client");
const tracker_1 = require("ancient-tracker/lib/tracker");
const returns_references_1 = require("ancient-babilon/lib/returns-references");
const rules_track_1 = require("../lib/rules-track");
const triggers_1 = require("../lib/triggers");
const resolver = rules_track_1.createResolver(rules_track_1.resolverOptions);
const delay = (time) => __awaiter(this, void 0, void 0, function* () { return new Promise(res => setTimeout(res, time)); });
const timing = (callback) => __awaiter(this, void 0, void 0, function* () {
    const start = new Date().valueOf();
    yield callback();
    return new Date().valueOf() - start;
});
const triggers = new triggers_1.Triggers();
const env = require('./env').newEnv();
const screen = blessed.screen();
const grid = new contrib.grid({ screen, rows: 12, cols: 12 });
screen.key(['escape', 'q', 'C-c'], (ch, key) => {
    return process.exit(0);
});
const log = grid.set(0, 0, 12, 2, contrib.log, { fg: 'green', selectedFg: 'green', label: 'Stages' });
process.on('uncaughtException', (err) => {
    log.log('Error: ' + err);
});
const lines = grid.set(0, 2, 12, 8, contrib.line, {
    label: 'Operations',
    showNthLabel: 5,
    maxY: 10,
    minY: 0,
    showLegend: true,
    legend: { width: 10 },
});
const strategies = grid.set(0, 10, 12, 2, contrib.table, {
    keys: true,
    fg: 'white',
    selectedFg: 'white',
    selectedBg: 'blue',
    interactive: true,
    label: 'Strategies',
    width: '0%',
    height: '0%',
    border: { type: 'line', fg: 'cyan' },
    columnSpacing: 0,
    columnWidth: [10, 10],
});
strategies.focus();
const strategiesData = [
    [0, 0],
    [1, 0],
    [1, 1],
];
for (let s = 0; s < 20; s++) {
    strategiesData.push([1, Math.ceil(_.last(strategiesData)[1] * 1.5)]);
}
strategies.setData({
    headers: ['Triggers', 'Trackings'],
    data: strategiesData,
});
const strategy = {
    index: 0,
    client: undefined,
};
const exp = () => [`select`,
    [`from`, [`alias`, `test`]],
];
const query = () => ({
    fetchQuery: babilon_1.babilon({ resolver, validate: rules_track_1.validate, exp: exp() }).result,
    trackQuery: babilon_1.babilon({ resolver, validate: rules_track_1.validate, exp: returns_references_1.returnsReferences(exp(), returns_references_1.generateReturnsAs()) }).result,
});
let clientId = 0;
let trackerId = 0;
strategies.children[1].on('select', (node) => __awaiter(this, void 0, void 0, function* () {
    strategy.index = node.top;
    const str = strategiesData[strategy.index];
    log.log(`strategy ${str}`.white);
    if (strategy.client) {
        yield strategy.client.stop();
        yield strategy.client.destroy();
    }
    yield env.client.query(env.triggers.unwrap(`test`));
    clientId++;
    strategy.client = new client_1.Client(clientId);
    strategy.client.on('emit', ({ eventName }) => {
        log.log(`client: ${strategy.client.id} :${eventName}`);
    });
    strategy.client.client = {
        triggers: env.triggers,
        pg: env.client,
    };
    yield strategy.client.start();
    if (str[0]) {
        yield env.client.query(env.triggers.wrap(`test`));
        for (let t = 0; t < str[1]; t++) {
            trackerId++;
            const tracker = new tracker_1.Tracker(trackerId);
            tracker.query = query();
            strategy.client.add(tracker);
        }
    }
}));
const start = () => __awaiter(this, void 0, void 0, function* () {
    const hash = {};
    log.log('starting'.white);
    yield env.createClient();
    log.log('pg connected'.white);
    yield env.tableReinit();
    yield env.client.query(env.triggers.deinit());
    yield env.client.query(env.triggers.init());
    log.log('table reinited'.white);
    log.log('start iterator'.white);
    const numbers = {};
    numbers.inserts = {
        title: 'inserts 10',
        style: { line: 'blue' },
        x: [],
        y: [],
    };
    numbers.updates = {
        title: 'updates 10',
        style: { line: 'yellow' },
        x: [],
        y: [],
    };
    numbers.deletes = {
        title: 'deletes 10',
        style: { line: 'red' },
        x: [],
        y: [],
    };
    let i = 0;
    (() => __awaiter(this, void 0, void 0, function* () {
        while (true) {
            i++;
            const ins = yield timing(() => __awaiter(this, void 0, void 0, function* () {
                let i;
                for (i = 1; i < 10; i++) {
                    yield env.client.query(`insert into test (num) values (${_.random(1, 999999999)});`);
                }
            }));
            const upd = yield timing(() => __awaiter(this, void 0, void 0, function* () {
                let i;
                for (i = 1; i < 10; i++) {
                    yield env.client.query(`update test set num = ${_.random(1, 999999999)} where id = (select id from test limit 1);`);
                }
            }));
            const del = yield timing(() => __awaiter(this, void 0, void 0, function* () {
                let i;
                for (i = 1; i < 10; i++) {
                    yield env.client.query(`delete from test where id = (select id from test limit 1);`);
                }
            }));
            const times = {
                inserts: ins,
                updates: upd,
                deletes: del,
            };
            log.log(`${i}: ${String(times.inserts).blue} ${String(times.updates).yellow} ${String(times.deletes).red}`);
            const tracks = yield env.client.query(`select * from ${env.triggers._tracks}`);
            log.log(`tracks: ${tracks.rows.length}`.grey);
            _.each(times, (time, name) => {
                lines.options.maxY = _.max(_.flatten(_.map(_.values(numbers), (n) => n.y)));
                numbers[name].y.push(time);
                numbers[name].x.push(i);
                if (i > 100) {
                    numbers[name].y.shift();
                    numbers[name].x.shift();
                }
            });
            lines.setData(_.values(numbers));
            screen.render();
        }
    }))();
});
screen.on('resize', () => {
    log.emit('attach');
    lines.emit('attach');
    strategies.emit('attach');
});
screen.render();
start();
//# sourceMappingURL=stress.js.map