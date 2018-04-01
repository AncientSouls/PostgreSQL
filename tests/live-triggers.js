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
const chai_1 = require("chai");
const _ = require("lodash");
const pg_1 = require("pg");
const live_triggers_1 = require("../lib/live-triggers");
const delay = t => new Promise(resolve => setTimeout(resolve, t));
const subscribing = t => _.times(t, t => `LISTEN ch${t + 1}; `).join('');
const unsubscribing = t => _.times(t, t => `LISTEN ch${t + 1}; `).join('');
function default_1() {
    describe('LiveTriggers:', () => {
        let client;
        const trackingsCount = 3;
        const liveTriggers = new live_triggers_1.LiveTriggers();
        const cleaning = () => __awaiter(this, void 0, void 0, function* () {
            yield client.query(liveTriggers.dropTrigger('documents', liveTriggers.insertUpdateFunctionName));
            yield client.query(liveTriggers.dropFunction(liveTriggers.insertUpdateFunctionName));
            yield client.query(liveTriggers.dropTable(liveTriggers.liveQueriesTableName));
            yield client.query(liveTriggers.dropTable('documents'));
        });
        beforeEach(() => __awaiter(this, void 0, void 0, function* () {
            client = new pg_1.Client({
                user: 'postgres',
                host: 'localhost',
                database: 'postgres',
                password: 'postgres',
                port: 5432,
            });
            yield client.connect();
            yield cleaning();
            yield client.query(liveTriggers.createLiveQueriesTable());
            yield client.query(liveTriggers.createFunctions());
            yield client.query(`
        create table if not exists documents (
          id serial PRIMARY KEY,
          value int default 0
        );`);
            yield client.query(liveTriggers.createTriggers('documents'));
            yield client.query(`insert into ${liveTriggers.liveQueriesTableName} (query, channel) values ${_.times(trackingsCount, t => `($${t + 1},'ch${t + 1}')`)};`, _.times(trackingsCount, t => `select 'documents'::text as table, documents.id as id from documents order by id offset ${t * 2} limit 3`));
        }));
        afterEach(() => __awaiter(this, void 0, void 0, function* () {
            yield cleaning();
            yield client.end();
        }));
        it('insert', () => __awaiter(this, void 0, void 0, function* () {
            yield client.query(subscribing(trackingsCount));
            const notifications = [];
            client.on('notification', msg => notifications.push(JSON.parse(msg.payload)));
            yield client.query(`insert into documents (id) values ${_.times(9, t => `(DEFAULT)`)}`);
            yield delay(100);
            chai_1.assert.deepEqual([
                ..._.filter(notifications, n => n.tracking === 1),
                ..._.filter(notifications, n => n.tracking === 2),
                ..._.filter(notifications, n => n.tracking === 3),
            ], [
                ..._.times(3, n => ({ table: 'documents', id: n + 1, tracking: 1, event: 'INSERT' })),
                ..._.times(3, n => ({ table: 'documents', id: n + 3, tracking: 2, event: 'INSERT' })),
                ..._.times(3, n => ({ table: 'documents', id: n + 5, tracking: 3, event: 'INSERT' })),
            ]);
            yield client.query(unsubscribing(trackingsCount));
        }));
        it('update', () => __awaiter(this, void 0, void 0, function* () {
            const notifications = [];
            client.on('notification', msg => notifications.push(JSON.parse(msg.payload)));
            yield client.query(`insert into documents (id) values ${_.times(9, t => `(DEFAULT)`)}`);
            yield delay(100);
            yield client.query(subscribing(trackingsCount));
            yield client.query(`${_.times(9, t => `update documents set value = value + 1 where id = ${t + 1}; `).join('')}`);
            yield delay(100);
            chai_1.assert.deepEqual([
                ..._.filter(notifications, n => n.tracking === 1),
                ..._.filter(notifications, n => n.tracking === 2),
                ..._.filter(notifications, n => n.tracking === 3),
            ], [
                ..._.times(3, n => ({ table: 'documents', id: n + 1, tracking: 1, event: 'UPDATE' })),
                ..._.times(3, n => ({ table: 'documents', id: n + 3, tracking: 2, event: 'UPDATE' })),
                ..._.times(3, n => ({ table: 'documents', id: n + 5, tracking: 3, event: 'UPDATE' })),
            ]);
            yield client.query(unsubscribing(trackingsCount));
        }));
        it('delete', () => __awaiter(this, void 0, void 0, function* () {
            const notifications = [];
            client.on('notification', msg => notifications.push(JSON.parse(msg.payload)));
            yield client.query(`insert into documents (id) values ${_.times(9, t => `(DEFAULT)`)}`);
            yield delay(100);
            yield client.query(subscribing(trackingsCount));
            yield client.query(`${_.times(9, t => `delete from documents where id = ${9 - t}; `).join('')}`);
            yield delay(100);
            chai_1.assert.deepEqual(notifications, [
                { table: 'documents', id: 7, tracking: 3, event: 'DELETE' },
                { table: 'documents', id: 6, tracking: 3, event: 'DELETE' },
                { table: 'documents', id: 5, tracking: 3, event: 'DELETE' },
                { table: 'documents', id: 5, tracking: 2, event: 'DELETE' },
                { table: 'documents', id: 4, tracking: 2, event: 'DELETE' },
                { table: 'documents', id: 3, tracking: 2, event: 'DELETE' },
                { table: 'documents', id: 3, tracking: 1, event: 'DELETE' },
                { table: 'documents', id: 2, tracking: 1, event: 'DELETE' },
                { table: 'documents', id: 1, tracking: 1, event: 'DELETE' },
            ]);
            yield client.query(unsubscribing(trackingsCount));
        }));
        it('truncate', () => __awaiter(this, void 0, void 0, function* () {
            const notifications = [];
            client.on('notification', msg => notifications.push(JSON.parse(msg.payload)));
            yield client.query(`insert into documents (id) values ${_.times(9, t => `(DEFAULT)`)}`);
            yield delay(100);
            yield client.query(subscribing(trackingsCount));
            yield delay(100);
            yield client.query(`truncate documents`);
            yield delay(100);
            chai_1.assert.deepEqual(notifications, [
                ..._.times(3, n => ({ table: 'documents', tracking: 3 - n, event: 'TRUNCATE' })),
            ]);
            yield client.query(unsubscribing(trackingsCount));
        }));
    });
}
exports.default = default_1;
//# sourceMappingURL=live-triggers.js.map