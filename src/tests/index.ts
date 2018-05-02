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
  const env = {
    client: undefined,
  };
  before(async () => {
    try { await execa.shell(`docker stop postgres${port}`); } catch (error) {}
    try { await execa.shell(`docker rm postgres${port}`); } catch (error) {}
    await execa.shell(`docker pull postgres`);
    await execa.shell(`docker run --name postgres${port} -d -p ${port}:5432 postgres`);
    
    await delay(10000);
    
    env.client = new pg.Client({
      port,
      user: `postgres`,
      host: `localhost`,
      database: `postgres`,
      password: ``,
    });
    
    await env.client.connect();
  });
  after(async () => {
    await env.client.end();
    try { await execa.shell(`docker stop postgres${port}`); } catch (error) {}
    try { await execa.shell(`docker rm postgres${port}`); } catch (error) {}
  });
  babilon();
  client(env);
  asketic(env);
});
