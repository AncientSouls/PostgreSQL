"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const chai_1 = require("chai");
class Query {
    constructor() {
        this.values = [];
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
            value = `(${this.select(exp.select)})`;
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
        if (_.has(exp, 'as'))
            return this.as(table, this.key(exp.as));
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
        if (_.has(exp, 'type')) {
            if (_.includes(['=', '!=', '>', '>=', '<', '<='], exp.type)) {
                chai_1.assert.lengthOf(exp.values, 2);
                chai_1.assert.lengthOf(exp.values[0], 1);
                chai_1.assert.lengthOf(exp.values[1], 1);
                result += `${this.value(exp.values[0][0])} ${exp.type} ${this.value(exp.values[1][0])}`;
            }
            else if (_.includes(['in', 'between', 'like'], exp.type)) {
                chai_1.assert.lengthOf(exp.values, 2);
                chai_1.assert.lengthOf(exp.values[0], 1);
                result += `${this.value(exp.values[0][0])} ${exp.type} `;
                if (exp.type === 'in') {
                    result += `(${_.map(exp.values[1], exp => this.value(exp)).join(',')})`;
                }
                else if (exp.type === 'between') {
                    chai_1.assert.lengthOf(exp.values[1], 2);
                    result += `${this.value(exp.values[1][0])} and ${this.value(exp.values[1][1])}`;
                }
                else {
                    chai_1.assert.lengthOf(exp.values[1], 1);
                    result += `${this.value(exp.values[1][0])}`;
                }
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
        if (_.has(exp, 'modifier')) {
            chai_1.assert.include(['not', 'is null', 'is not null'], exp.modifier);
            if (exp.modifier === 'not')
                result = `not (${result})`;
            else
                `(${result}) ${exp.modifier}`;
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
        if (_.has(exp, 'where')) {
            result += ` where ${this.where(exp.where)}`;
        }
        return result;
    }
}
exports.Query = Query;
//# sourceMappingURL=query.js.map