import * as _ from 'lodash';
import { assert } from 'chai';
import * as pg from 'pg';
import 'colors';
import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';

import {
  babilon,
} from 'ancient-babilon/lib/babilon';

import {
  Client,
} from '../lib/client';

import {
  Tracker,
} from 'ancient-tracker/lib/tracker';

import {
  returnsReferences,
  generateReturnsAs,
} from 'ancient-babilon/lib/returns-references';

import {
  createResolver,
  resolverOptions,
  validate,
} from '../lib/rules-track';

import { Triggers } from '../lib/triggers';

import {
  Asketic,
} from 'ancient-tracker/lib/asketic';

const resolver = createResolver(resolverOptions);

const delay = async time => new Promise(res => setTimeout(res, time));

const timing = async (callback) => {
  const start = new Date().valueOf();
  await callback();
  return new Date().valueOf() - start;
};

const triggers = new Triggers();

const env = require('./env').newEnv();

const screen = blessed.screen();
const grid = new contrib.grid({ screen, rows: 12, cols: 12 });

screen.key(['escape', 'q', 'C-c'], (ch, key) => {
  return process.exit(0);
});

const log = grid.set(
  0,0,12,2,
  contrib.log,
  { fg: 'green', selectedFg: 'green', label: 'Stages' },
);

process.on('uncaughtException', (err) => {
  log.log('Error: ' + err);
});

const lines = grid.set(
  0, 2, 12, 8,
  contrib.line,
  {
    label: 'Operations',
    showNthLabel: 5,
    maxY: 10,
    minY: 0,
    showLegend: true,
    legend: { width: 10 },
  },
);

const strategies = grid.set(
  0, 10, 12, 2,
  contrib.table, {
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
  },
);

strategies.focus();

const strategiesData = [
  [0,0],
  [1,0],
  [1,1],
];
for (let s = 0; s < 20; s++) {
  strategiesData.push([1,Math.ceil(_.last(strategiesData)[1] * 1.5)]);
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
  [`from`,[`alias`,`test`]],
];

const query = () => ({
  fetchQuery: babilon({ resolver, validate, exp: exp() }).result,
  trackQuery: babilon({ resolver, validate, exp: returnsReferences(exp(), generateReturnsAs()) }).result,
});

let clientId = 0;
let trackerId = 0;

strategies.children[1].on('select', async (node) => {
  strategy.index = node.top;
  const str = strategiesData[strategy.index];
  log.log(`strategy ${str}`.white);
  if (strategy.client) {
    await strategy.client.stop();
    await strategy.client.destroy();
  }
  await env.client.query(env.triggers.unwrap(`test`));
  clientId++;
  strategy.client = new Client(clientId);
  strategy.client.client = {
    triggers: env.triggers,
    pg: env.client,
  };
  await strategy.client.start();
  if (str[0]) {
    await env.client.query(env.triggers.wrap(`test`));
    for (let t = 0; t < str[1]; t++) {
      trackerId++;
      const tracker = new Tracker(trackerId);
      tracker.query = query();
      strategy.client.add(tracker);
    }
  }
});

const start = async () => {
  const hash = {};
  log.log('starting'.white);
  await env.createClient();
  log.log('pg connected'.white);
  await env.tableReinit();
  await env.client.query(env.triggers.deinit());
  await env.client.query(env.triggers.init());
  log.log('table reinited'.white);
  
  log.log('start iterator'.white);

  const numbers: any = {};

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

  (async () => {
    while (true) {
      i++;
      const times = {
        inserts: await timing(async () => {
          let i;
          for (i = 1; i < 10; i++) {
            await env.client.query(`insert into test (num) values (${_.random(1,999999999)});`);
          }
        }),
        updates: await timing(async () => {
          let i;
          for (i = 1; i < 10; i++) {
            await env.client.query(`update test set num = ${_.random(1,999999999)} where id = (select id from test limit 1);`);
          }
        }),
        deletes: await timing(async () => {
          let i;
          for (i = 1; i < 10; i++) {
            await env.client.query(`delete from test where id = (select id from test limit 1);`);
          }
        }),
      };
      log.log(`${i}: ${String(times.inserts).blue} ${String(times.updates).yellow} ${String(times.deletes).red}`);

      _.each(times, (time, name) => {
        lines.options.maxY = _.max(_.flatten(_.map(_.values(numbers), (n: any) => n.y)));
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
  })();
};

screen.on('resize', () => {
  log.emit('attach');
  lines.emit('attach');
  strategies.emit('attach');
});

screen.render();

start();
