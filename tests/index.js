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
require("mocha");
require('source-map-support').install();
const execa = require("execa");
const pg = require("pg");
const babilon_1 = require("./babilon");
const client_1 = require("./client");
const asketic_1 = require("./asketic");
const delay = (time) => __awaiter(this, void 0, void 0, function* () { return new Promise(res => setTimeout(res, time)); });
const num = process.env['TRAVIS_JOB_NUMBER'] ? parseInt(process.env['TRAVIS_JOB_NUMBER'].split('.')[1], 10) : 0;
const port = 5432 + num;
describe('AncientSouls/PostgreSQL:', () => {
    const env = {
        client: undefined,
    };
    before(() => __awaiter(this, void 0, void 0, function* () {
        try {
            yield execa.shell(`docker stop postgres${port}`);
        }
        catch (error) { }
        try {
            yield execa.shell(`docker rm postgres${port}`);
        }
        catch (error) { }
        yield execa.shell(`docker pull postgres`);
        yield execa.shell(`docker run --name postgres${port} -d -p ${port}:5432 postgres`);
        yield delay(10000);
        env.client = new pg.Client({
            port,
            user: `postgres`,
            host: `localhost`,
            database: `postgres`,
            password: ``,
        });
        yield env.client.connect();
    }));
    after(() => __awaiter(this, void 0, void 0, function* () {
        yield env.client.end();
        try {
            yield execa.shell(`docker stop postgres${port}`);
        }
        catch (error) { }
        try {
            yield execa.shell(`docker rm postgres${port}`);
        }
        catch (error) { }
    }));
    babilon_1.default();
    client_1.default(env);
    asketic_1.default(env);
});
//# sourceMappingURL=index.js.map