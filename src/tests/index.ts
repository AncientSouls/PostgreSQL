import 'mocha';
require('source-map-support').install();
import * as execa from 'execa';
import * as pg from 'pg';

import babilon from './babilon';
import client from './client';
import asketic from './asketic';

const delay = async time => new Promise(res => setTimeout(res, time));

const num = process.env['TRAVIS_JOB_NUMBER'] ? parseInt(process.env['TRAVIS_JOB_NUMBER'].split('.')[1], 10) : 0;

const port = 5432 + num;

describe('AncientSouls/PostgreSQL:', () => {
  const env = require('./env').newEnv();
  before(async () => {
    await env.dockerStart();
    await env.createClient();
  });
  after(async () => {
    await env.client.end();
    await env.dockerStop();
  });
  require('./babilon').default();
  require('./client').default(env);
  require('./asketic').default(env);
});
