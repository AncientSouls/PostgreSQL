"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const chai_1 = require("chai");
const node_1 = require("ancient-mixins/lib/node");
var EExpComparisonType;
(function (EExpComparisonType) {
    EExpComparisonType["EQ"] = "=";
    EExpComparisonType["NOT"] = "!=";
    EExpComparisonType["GT"] = ">";
    EExpComparisonType["GTE"] = ">=";
    EExpComparisonType["LT"] = "<";
    EExpComparisonType["LTE"] = "<=";
    EExpComparisonType["IN"] = "in";
    EExpComparisonType["BETWEEN"] = "between";
    EExpComparisonType["LIKE"] = "like";
    EExpComparisonType["EXISTS"] = "exists";
    EExpComparisonType["NULL"] = "null";
})(EExpComparisonType = exports.EExpComparisonType || (exports.EExpComparisonType = {}));
var EExpConditionType;
(function (EExpConditionType) {
    EExpConditionType["AND"] = "and";
    EExpConditionType["OR"] = "or";
})(EExpConditionType = exports.EExpConditionType || (exports.EExpConditionType = {}));
var EExpOrder;
(function (EExpOrder) {
    EExpOrder["ASC"] = "asc";
    EExpOrder["DESC"] = "desc";
})(EExpOrder = exports.EExpOrder || (exports.EExpOrder = {}));
var EExpType;
(function (EExpType) {
    EExpType["SELECT"] = "select";
    EExpType["UNION"] = "union";
    EExpType["UNIONALL"] = "union all";
})(EExpType = exports.EExpType || (exports.EExpType = {}));
var EParsing;
(function (EParsing) {
    EParsing[EParsing["waiting"] = 0] = "waiting";
    EParsing[EParsing["parsing"] = 1] = "parsing";
    EParsing[EParsing["parsed"] = 2] = "parsed";
})(EParsing = exports.EParsing || (exports.EParsing = {}));
exports.ExpDataStringRegexp = /^[a-zA-Zа-яА-Я0-9]*$/;
function mixin(superClass) {
    return class Query extends superClass {
        constructor() {
            super(...arguments);
            this._selects = [];
            this._selectsContext = [];
            this._tables = {};
            this.ExpDataStringRegexp = exports.ExpDataStringRegexp;
            this.params = [];
        }
        addParam(data) {
            chai_1.assert.isString(data);
            this.params.push(data);
            return `$${this.params.length}`;
        }
        _key(exp) {
            chai_1.assert.isString(exp);
            return `"${exp}"`;
        }
        _as(a, b) {
            chai_1.assert.isString(a);
            chai_1.assert.isString(a);
            return `${a} as ${b}`;
        }
        _select(_sql) {
            let sql = `select ${_sql.what} from ${_sql.from}`;
            if (_sql.where)
                sql += ` where ${_sql.where}`;
            if (_sql.group)
                sql += ` group by ${_sql.group}`;
            if (_sql.order)
                sql += ` order by ${_sql.order}`;
            if (_sql.offset)
                sql += ` offset ${_sql.offset}`;
            if (_sql.limit)
                sql += ` limit ${_sql.limit}`;
            return sql;
        }
        TExpData(data) {
            if (_.isNumber(data) || _.isBoolean(data))
                return data.toString();
            if (_.isString(data)) {
                if (this.ExpDataStringRegexp.test(data)) {
                    return `'${data}'`;
                }
                return this.addParam(data);
            }
            throw new Error(`Unexpected TExpData: ${data}`);
        }
        IExpPath(exp) {
            chai_1.assert.isObject(exp);
            return `${exp.alias ? `${this._key(exp.alias)}.` : ''}${this._key(exp.field)}`;
        }
        IExpValue(exp) {
            let value;
            if (_.has(exp, 'data'))
                value = this.TExpData(exp.data);
            else if (_.has(exp, 'path'))
                value = this.IExpPath(exp.path);
            else if (_.has(exp, 'exp'))
                value = `(${this.IExp(exp.exp)})`;
            else
                throw new Error(`Unexpected IExpValue: ${JSON.stringify(exp)}`);
            if (_.has(exp, 'as'))
                return this._as(value, this._key(exp.as));
            return value;
        }
        TExpContent(exp) {
            if (_.isObject(exp))
                return this.IExpValue(exp);
            return this.TExpData(exp);
        }
        TExpWhat(exp) {
            if (_.isUndefined(exp))
                return '*';
            if (_.isArray(exp)) {
                if (!exp.length)
                    return '*';
                return _.map(exp, exp => this.TExpContent(exp)).join(',');
            }
            throw new Error(`Unexpected TExpWrat: ${JSON.stringify(exp)}`);
        }
        IExpAlias(exp) {
            let table;
            if (_.has(exp, 'table'))
                table = this._key(exp.table);
            else
                throw new Error(`Unexpected IExpAlias: ${JSON.stringify(exp)}`);
            this._tables[exp.table] = this._tables[exp.table] || [];
            if (_.has(exp, 'as')) {
                this._tables[exp.table].push(exp.as);
                return this._as(table, this._key(exp.as));
            }
            return table;
        }
        TExpFrom(exp) {
            if (_.isArray(exp) && exp.length) {
                return _.map(exp, exp => this.IExpAlias(exp)).join(',');
            }
            throw new Error(`Unexpected TExpFrom: ${JSON.stringify(exp)}`);
        }
        IExpComparison(exp) {
            chai_1.assert.isArray(exp.values);
            let result = '';
            if (_.isString(exp.type)) {
                if (_.includes(['=', '!=', '>', '>=', '<', '<='], exp.type)) {
                    chai_1.assert.lengthOf(exp.values, 2);
                    chai_1.assert.lengthOf(exp.values[0], 1);
                    chai_1.assert.lengthOf(exp.values[1], 1);
                    result += `${this.IExpValue(exp.values[0][0])} ${exp.type} ${this.IExpValue(exp.values[1][0])}`;
                }
                else if (exp.type === 'in') {
                    chai_1.assert.lengthOf(exp.values, 2);
                    chai_1.assert.lengthOf(exp.values[0], 1);
                    result += `${this.IExpValue(exp.values[0][0])} ${exp.type} `;
                    result += `(${_.map(exp.values[1], exp => this.IExpValue(exp)).join(',')})`;
                }
                else if (exp.type === 'between') {
                    chai_1.assert.lengthOf(exp.values, 2);
                    chai_1.assert.lengthOf(exp.values[0], 1);
                    result += `${this.IExpValue(exp.values[0][0])} ${exp.type} `;
                    chai_1.assert.lengthOf(exp.values[1], 2);
                    result += `${this.IExpValue(exp.values[1][0])} and ${this.IExpValue(exp.values[1][1])}`;
                }
                else if (exp.type === 'like') {
                    chai_1.assert.lengthOf(exp.values, 2);
                    chai_1.assert.lengthOf(exp.values[0], 1);
                    result += `${this.IExpValue(exp.values[0][0])} ${exp.type} `;
                    chai_1.assert.lengthOf(exp.values[1], 1);
                    result += `${this.IExpValue(exp.values[1][0])}`;
                }
                else if (exp.type === 'exists') {
                    chai_1.assert.lengthOf(exp.values, 1);
                    chai_1.assert.lengthOf(exp.values[0], 1);
                    result += `${this.IExpValue(exp.values[0][0])}`;
                    result = `${exp.not ? `not ` : ''}exists ${result}`;
                }
                else if (exp.type === 'null') {
                    chai_1.assert.lengthOf(exp.values, 1);
                    chai_1.assert.lengthOf(exp.values[0], 1);
                    result += `${this.IExpValue(exp.values[0][0])}`;
                    result = `${result} is ${exp.not ? `not ` : ''} null`;
                }
                else {
                    throw new Error(`Unexpected IExpComparison ${exp}`);
                }
            }
            else {
                chai_1.assert.lengthOf(exp.values, 1);
                chai_1.assert.lengthOf(exp.values[0], 1);
                result += `${this.IExpValue(exp.values[0][0])}`;
            }
            return result;
        }
        IExpCondition(exp) {
            chai_1.assert.include([EExpConditionType.AND, EExpConditionType.OR], exp.type);
            const result = [];
            if (_.isArray(exp.conditions)) {
                result.push(..._.map(exp.conditions, exp => `(${this.IExpCondition(exp)})`));
            }
            if (_.isArray(exp.comparisons)) {
                result.push(..._.map(exp.comparisons, exp => `(${this.IExpComparison(exp)})`));
            }
            if (!result.length)
                throw new Error('IExpCondition can not be empty.');
            return result.join(` ${exp.type} `);
        }
        TExpWhere(exp) {
            return this.IExpCondition(exp);
        }
        TExpGroup(exp) {
            if (_.isArray(exp) && exp.length) {
                return _.map(exp, exp => this.IExpPath(exp)).join(',');
            }
            throw new Error(`Unexpected TExpGroup: ${JSON.stringify(exp)}`);
        }
        TExpOrder(exp) {
            if (_.isArray(exp) && exp.length) {
                return _.map(exp, (exp) => {
                    const order = exp.order === EExpOrder.DESC ? ' DESC' : ' ASC';
                    return this.IExpPath(exp) + order;
                }).join(',');
            }
            throw new Error(`Unexpected TExpOrder: ${JSON.stringify(exp)}`);
        }
        IExpSelect(exp) {
            chai_1.assert.equal(exp.type, EExpType.SELECT);
            const _select = { exp };
            this._selectsContext.push(_select);
            _select._sql = {
                what: this.TExpWhat(exp.what),
                from: this.TExpFrom(exp.from),
            };
            if (exp.where) {
                _select._sql.where = this.TExpWhere(exp.where);
            }
            if (exp.group) {
                _select._sql.group = this.TExpGroup(exp.group);
            }
            if (exp.order) {
                _select._sql.order = this.TExpOrder(exp.order);
            }
            if (_.isNumber(exp.offset)) {
                _select._sql.offset = exp.offset;
            }
            if (_.isNumber(exp.limit)) {
                _select._sql.limit = exp.limit;
            }
            _select.sql = this._select(_select._sql);
            this._selects.push(_select);
            this._selectsContext.pop();
            return _select.sql;
        }
        IExpUnion(exp) {
            chai_1.assert.include([EExpType.UNION, EExpType.UNIONALL], exp.type);
            chai_1.assert.isArray(exp.selects);
            chai_1.assert.isOk(exp.selects.length);
            return _.map(exp.selects, (exp) => {
                return `(${this.IExpSelect(exp)})`;
            }).join(` ${exp.type} `);
        }
        IExp(exp) {
            chai_1.assert.isObject(exp);
            if (exp.type === EExpType.SELECT) {
                return this.IExpSelect(exp);
            }
            if (exp.type === EExpType.UNIONALL || exp.type === EExpType.UNION) {
                return this.IExpUnion(exp);
            }
            throw new Error(`Unexpected IExp.type: ${exp.type}`);
        }
        createQuery() {
            return _.map(this._selects, select => `(${select.sql})`).join(` union all `);
        }
    };
}
exports.mixin = mixin;
exports.MixedQuery = mixin(node_1.Node);
class Query extends exports.MixedQuery {
}
exports.Query = Query;
//# sourceMappingURL=query.js.map