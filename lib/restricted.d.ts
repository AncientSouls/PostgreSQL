import { Query, TWhere, ISelect } from './query';
export interface ISubject {
    table: string;
    id: number | string;
}
export declare class Restricted extends Query {
    constructor(parentQuery?: any);
    SubQuery: typeof Restricted;
    subjects: ISubject[];
    _subjects(subjects: ISubject[]): void;
    _getIdColumn(alias: any): string;
    _getRestrictionsTable(): string;
    _generateRestrictionsAlias(): any;
    _restriction(alias: any): string;
    where(exp?: TWhere): string;
    _subselect(exp: ISelect): string;
}
