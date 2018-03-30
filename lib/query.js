"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const chai_1 = require("chai");
class Query {
    constructor(parentQuery) {
        this.parentQuery = parentQuery;
        this.values = [];
        this.tables = {};
        this.aliases = {};
        this.subqueries = [];
        this.SubQuery = Query;
        if (parentQuery) {
            this.values = parentQuery.values;
            this.tables = Object.create(parentQuery.tables);
            this.aliases = Object.create(parentQuery.aliases);
        }
    }
    all() {
        return '*';
    }
    key(exp) {
        return `"${exp}"`;
    }
    as(a, b) {
        chai_1.assert.isString(a);
        chai_1.assert.isString(a);
        return `${a} as ${b}`;
    }
    field(exp) {
        chai_1.assert.isArray(exp);
        chai_1.assert.isString(exp[0]);
        return `"${exp[0]}"`;
    }
    column(exp) {
        chai_1.assert.isArray(exp);
        chai_1.assert.isString(exp[0]);
        chai_1.assert.isString(exp[1]);
        return `"${exp[0]}"."${exp[1]}"`;
    }
    path(exp) {
        chai_1.assert.isArray(exp);
        if (exp.length === 1)
            return this.field(exp);
        if (exp.length === 2)
            return this.column(exp);
        throw new Error(`Unexpected TPath: ${JSON.stringify(exp)}`);
    }
    data(data) {
        if (_.isNumber(data) || _.isBoolean(data))
            return data.toString();
        if (_.isString(data)) {
            this.values.push(data);
            return `$${this.values.length}`;
        }
        throw new Error(`Unexpected TData: ${data}`);
    }
    value(exp) {
        let value;
        if (_.has(exp, 'data'))
            value = this.data(exp.data);
        else if (_.has(exp, 'path'))
            value = this.path(exp.path);
        else if (_.has(exp, 'select'))
            value = `(${this.subselect(exp.select)})`;
        else
            throw new Error(`Unexpected IValue: ${JSON.stringify(exp)}`);
        if (_.has(exp, 'as'))
            return this.as(value, this.key(exp.as));
        return value;
    }
    alias(exp) {
        let table;
        if (_.has(exp, 'table'))
            table = this.key(exp.table);
        else
            throw new Error(`Unexpected IAlias: ${JSON.stringify(exp)}`);
        _.set(this.tables, exp.table, _.get(this.tables, exp.table, []));
        if (_.has(exp, 'as')) {
            this.tables[exp.table].push(exp.as);
            _.set(this.aliases, exp.as, exp.table);
            return this.as(table, this.key(exp.as));
        }
        _.set(this.aliases, exp.table, exp.table);
        return table;
    }
    what(exp) {
        if (_.isUndefined(exp))
            return this.all();
        if (_.isArray(exp)) {
            if (!exp.length)
                return this.all();
            return _.map(exp, exp => this.value(exp)).join(',');
        }
        throw new Error(`Unexpected TWrat: ${JSON.stringify(exp)}`);
    }
    from(exp) {
        if (_.isArray(exp) && exp.length) {
            return _.map(exp, exp => this.alias(exp)).join(',');
        }
        throw new Error(`Unexpected TFrom: ${JSON.stringify(exp)}`);
    }
    comparison(exp) {
        chai_1.assert.isArray(exp.values);
        let result = '';
        if (_.isString(exp.type)) {
            if (_.includes(['=', '!=', '>', '>=', '<', '<='], exp.type)) {
                chai_1.assert.lengthOf(exp.values, 2);
                chai_1.assert.lengthOf(exp.values[0], 1);
                chai_1.assert.lengthOf(exp.values[1], 1);
                result += `${this.value(exp.values[0][0])} ${exp.type} ${this.value(exp.values[1][0])}`;
            }
            else if (exp.type === 'in') {
                chai_1.assert.lengthOf(exp.values, 2);
                chai_1.assert.lengthOf(exp.values[0], 1);
                result += `${this.value(exp.values[0][0])} ${exp.type} `;
                result += `(${_.map(exp.values[1], exp => this.value(exp)).join(',')})`;
            }
            else if (exp.type === 'between') {
                chai_1.assert.lengthOf(exp.values, 2);
                chai_1.assert.lengthOf(exp.values[0], 1);
                result += `${this.value(exp.values[0][0])} ${exp.type} `;
                chai_1.assert.lengthOf(exp.values[1], 2);
                result += `${this.value(exp.values[1][0])} and ${this.value(exp.values[1][1])}`;
            }
            else if (exp.type === 'like') {
                chai_1.assert.lengthOf(exp.values, 2);
                chai_1.assert.lengthOf(exp.values[0], 1);
                result += `${this.value(exp.values[0][0])} ${exp.type} `;
                chai_1.assert.lengthOf(exp.values[1], 1);
                result += `${this.value(exp.values[1][0])}`;
            }
            else if (exp.type === 'exists') {
                chai_1.assert.lengthOf(exp.values, 1);
                chai_1.assert.lengthOf(exp.values[0], 1);
                result += `${this.value(exp.values[0][0])}`;
                result = `${exp.not ? `not ` : ''}exists ${result}`;
            }
            else if (exp.type === 'null') {
                chai_1.assert.lengthOf(exp.values, 1);
                chai_1.assert.lengthOf(exp.values[0], 1);
                result += `${this.value(exp.values[0][0])}`;
                result = `${result} is ${exp.not ? `not ` : ''} null`;
            }
            else {
                throw new Error(`Unexpected IComparison ${exp}`);
            }
        }
        else {
            chai_1.assert.lengthOf(exp.values, 1);
            chai_1.assert.lengthOf(exp.values[0], 1);
            result += `${this.value(exp.values[0][0])}`;
        }
        return result;
    }
    condition(exp) {
        chai_1.assert.include(['and', 'or'], exp.type);
        const result = [];
        if (_.isArray(exp.conditions)) {
            result.push(..._.map(exp.conditions, exp => `(${this.condition(exp)})`));
        }
        if (_.isArray(exp.comparisons)) {
            result.push(..._.map(exp.comparisons, exp => `(${this.comparison(exp)})`));
        }
        if (!result.length)
            throw new Error('ICondition can not be empty.');
        return result.join(` ${exp.type} `);
    }
    where(exp) {
        return this.condition(exp);
    }
    select(exp) {
        chai_1.assert.isObject(exp);
        let result = 'select';
        result += ` ${this.what(exp.what)}`;
        result += ` from ${this.from(exp.from)}`;
        if (_.isObject(exp.where)) {
            result += ` where ${this.where(exp.where)}`;
        }
        if (_.isNumber(exp.offset)) {
            result += ` offset ${exp.offset}`;
        }
        if (_.isNumber(exp.limit)) {
            result += ` limit ${exp.limit}`;
        }
        return result;
    }
    subselect(exp) {
        const query = new this.SubQuery(this);
        this.subqueries.push(query);
        return query.select(exp);
    }
}
exports.Query = Query;
//# sourceMappingURL=query.js.map