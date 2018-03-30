import * as _ from 'lodash';
import { assert } from 'chai';
import { v4 } from 'uuid';

import {
  TClass,
  IInstance,
} from 'ancient-mixins/lib/mixins';

import {
  Query,
  TWhere,
  ISelect,
} from './query';

export interface ISubject {
  table: string;
  id: number | string;
}

export class Restricted extends Query {
  constructor(parentQuery?) {
    super(parentQuery);
    if (parentQuery) this.subjects = parentQuery.subjects;
  }

  SubQuery = Restricted;

  subjects: ISubject[];
  _subjects(subjects: ISubject[]) {
    this.subjects = subjects;
  }
  
  _getIdColumn(alias) {
    return 'id';
  }
  _getRestrictionsTable() {
    return 'restrictions';
  }
  _generateRestrictionsAlias() {
    return v4();
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
  where(exp?: TWhere): string {
    let result = super.where(exp);
    if (this.subjects.length) {
      result = `(${result}) and exists (${
        _.map(this.aliases, alias => this._restriction(alias))
      })`;
    }
    return result;
  }
  _subselect(exp: ISelect): string {
    const query = new Query(this);
    this.subqueries.push(query);
    return query.select(exp);
  }
}
