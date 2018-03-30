"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const uuid_1 = require("uuid");
const query_1 = require("./query");
class Restricted extends query_1.Query {
    constructor(parentQuery) {
        super(parentQuery);
        this.SubQuery = Restricted;
        if (parentQuery)
            this.subjects = parentQuery.subjects;
    }
    _subjects(subjects) {
        this.subjects = subjects;
    }
    _getIdColumn(alias) {
        return 'id';
    }
    _getRestrictionsTable() {
        return 'restrictions';
    }
    _generateRestrictionsAlias() {
        return uuid_1.v4();
    }
    _restriction(alias) {
        const table = this.aliases[alias];
        return this._subselect({
            from: [{
                    table: this._getRestrictionsTable(),
                    as: this._generateRestrictionsAlias(),
                }],
            where: {
                type: 'or',
                conditions: _.map(this.subjects, (subject) => {
                    return {
                        type: 'and',
                        comparisons: [
                            { type: '=', values: [[{ path: ['subjectId'] }], [{ data: subject.id }]] },
                            { type: '=', values: [[{ path: ['subjectTable'] }], [{ data: subject.table }]] },
                            { type: '=', values: [
                                    [{ path: ['objectId'] }],
                                    [{ path: [alias, this._getIdColumn(alias)] }],
                                ] },
                            { type: '=', values: [
                                    [{ path: ['objectTable'] }],
                                    [{ data: alias }],
                                ] },
                        ],
                    };
                }),
            },
        });
    }
    where(exp) {
        let result = super.where(exp);
        if (this.subjects.length) {
            result = `(${result}) and exists (${_.map(this.aliases, alias => this._restriction(alias))})`;
        }
        return result;
    }
    _subselect(exp) {
        const query = new query_1.Query(this);
        this.subqueries.push(query);
        return query.select(exp);
    }
}
exports.Restricted = Restricted;
//# sourceMappingURL=restricted.js.map