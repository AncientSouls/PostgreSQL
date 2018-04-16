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
  TracksAdapter,
  TTracksAdapter,
} from 'ancient-tracker/lib/tracks-adapter';

export function mixin<T extends TClass<IInstance>>(
  superClass: T,
): any {
  return class Adapter extends superClass {
    async starting() {
      await this.client.client.query(`listen "${this.id}";`);
      this.client.client.on('notification', (n) => {
        if (n.channel === this.id) {
          const json = JSON.parse(n.payload);
          const item = this.items[json.trackerId];
          item.memory = json.fetched;
          this.override(item);
        }
      });
    }
    async stopping() {
      this.client.client.query(`unlisten "${this.id}";`);
    }
    isChanged(id, data, item) {
      return !_.isEqual(_.toPlainObject(data), item.tracker.memory[id]);
    }
    async tracked(item) {
      await this.client.client.query(
        `insert into ${this.client.triggers._tracks} (trackerId,channel,fetchQuery,trackQuery) values ($1,$2,$3,$4);`,
        [
          item.tracker.id,
          this.id,
          item.query.fetchQuery,
          item.query.trackQuery,
        ],
      );
      const results = await this.client.client.query(item.query.fetchQuery);
      item.memory = results.rows;
      await super.tracked(item);
    }
    async untracked(item) {
      await this.client.client.query(
        `delete from ${this.client.triggers._tracks} where trackerId = $1;`,
        [
          item.tracker.id,
        ],
      );
      await super.untracked(item);
    }
  };
}

export const MixedTracksAdapter: TClass<TTracksAdapter> = mixin(TracksAdapter);
export class Adapter extends MixedTracksAdapter {}
