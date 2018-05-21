import * as _ from 'lodash';

import {
  TClass,
  IInstance,
} from 'ancient-mixins/lib/mixins';

import {
  Node,
  INode,
  INodeEventsList,
} from 'ancient-mixins/lib/node';

import {
  Client as TrackerClient,
  TClient,
} from 'ancient-tracker/lib/client';

export function mixin<T extends TClass<IInstance>>(
  superClass: T,
): any {
  return class Adapter extends superClass {
    async starting() {
      await this.client.pg.query(`listen "${this.id}";`);
      this.client.pg.on('notification', (n) => {
        if (n.channel === this.id) {
          const json = JSON.parse(n.payload);
          const tracker = this.list.nodes[json.trackerId];
          tracker.set([]);
        }
      });
    }
    async stopping() {
      this.client.pg.query(`unlisten "${this.id}";`);
    }
    async tracking(tracker) {
      tracker.fetch = async () => _.map((await this.client.pg.query(tracker.query.fetchQuery)).rows, r => _.toPlainObject(r));
      await this.client.pg.query(
        `DO LANGUAGE plperl $plperl$
          $tracked = spi_exec_prepared(
            spi_prepare(
              q(SELECT $$'$$ || string_agg ($$"$$||tracked||$$"$$, $$', '$$) || $$'$$ as str FROM (${tracker.query.trackQuery}) AS tracked)
            ))->{rows}[0]->{str};

          $prepared = spi_prepare('insert into ancient_postgresql_tracks(trackerId,channel,trackQuery,tracked) values ($1, $2, $3, $4)', 'TEXT' ,'TEXT', 'TEXT', 'TEXT');

          spi_exec_prepared($prepared, '${tracker.id}', '${this.id}', '${tracker.query.trackQuery}', $tracked)
        $plperl$
        `
      );
    }
    async untracking(tracker) {
      await this.client.pg.query(
        `delete from ${this.client.triggers._tracks} where trackerId = $1;`,
        [tracker.id],
      );
    }
  };
}

export const MixedClient: TClass<TClient> = mixin(TrackerClient);
export class Client extends MixedClient {}
