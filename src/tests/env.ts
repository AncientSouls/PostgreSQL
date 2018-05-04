import * as execa from 'execa';
import * as pg from 'pg';

import { Triggers } from '../lib/triggers';

const num = process.env['TRAVIS_JOB_NUMBER'] ? parseInt(process.env['TRAVIS_JOB_NUMBER'].split('.')[1], 10) : 0;

const port = 5432 + num;

export const newEnv = () => {
  const env = {
    client: undefined,
    triggers: new Triggers(),
    delay: async time => new Promise(res => setTimeout(res, time)),
    tableReinit: async () => {
      await env.client.query(`
        drop table if exists test;
        create table if not exists test (
          id serial PRIMARY KEY,
          num int default 0
        );
      `);
    },
    triggersReinit: async () => {
      await env.client.query(env.triggers.unwrap(`test`));
      await env.client.query(env.triggers.deinit());
      await env.client.query(env.triggers.init());
      await env.client.query(env.triggers.wrap(`test`));
    },
    dockerStop: async () => {
      try { await execa.shell(`docker stop postgres${port}`); } catch (error) {}
      try { await execa.shell(`docker rm postgres${port}`); } catch (error) {}
    },
    dockerStart: async () => {
      await env.dockerStop();
      await execa.shell(`docker pull postgres`);
      await execa.shell(`docker run --name postgres${port} -d -p ${port}:5432 postgres`);
      
      await env.delay(10000);
    },
    createClient: async () => {
      env.client = new pg.Client({
        port,
        user: `postgres`,
        host: `localhost`,
        database: `postgres`,
        password: ``,
      });
      
      await env.client.connect();
    },
  };

  return env;
};
