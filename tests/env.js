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
const execa = require("execa");
const pg = require("pg");
const triggers_1 = require("../lib/triggers");
const num = process.env['TRAVIS_JOB_NUMBER'] ? parseInt(process.env['TRAVIS_JOB_NUMBER'].split('.')[1], 10) : 0;
const port = 5432 + num;
exports.newEnv = () => {
    const env = {
        client: undefined,
        triggers: new triggers_1.Triggers(),
        delay: (time) => __awaiter(this, void 0, void 0, function* () { return new Promise(res => setTimeout(res, time)); }),
        tableReinit: () => __awaiter(this, void 0, void 0, function* () {
            yield env.client.query(`
        drop table if exists test;
        create table if not exists test (
          id serial PRIMARY KEY,
          num int default 0
        );
      `);
        }),
        triggersReinit: () => __awaiter(this, void 0, void 0, function* () {
            yield env.client.query(env.triggers.unwrap(`test`));
            yield env.client.query(env.triggers.deinit());
            yield env.client.query(env.triggers.init());
            yield env.client.query(env.triggers.wrap(`test`));
        }),
        dockerStop: () => __awaiter(this, void 0, void 0, function* () {
            try {
                yield execa.shell(`docker stop postgres${port}`);
            }
            catch (error) { }
            try {
                yield execa.shell(`docker rm postgres${port}`);
            }
            catch (error) { }
        }),
        dockerStart: () => __awaiter(this, void 0, void 0, function* () {
            yield env.dockerStop();
            yield execa.shell(`docker pull postgres`);
            yield execa.shell(`docker run --name postgres${port} -d -p ${port}:5432 postgres`);
            yield env.delay(10000);
        }),
        createClient: () => __awaiter(this, void 0, void 0, function* () {
            env.client = new pg.Client({
                port,
                user: `postgres`,
                host: `localhost`,
                database: `postgres`,
                password: ``,
            });
            yield env.client.connect();
        }),
    };
    return env;
};
//# sourceMappingURL=env.js.map