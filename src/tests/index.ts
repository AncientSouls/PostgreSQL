import 'mocha';
require('source-map-support').install();

import query from './query';
import liveQuery from './live-query';
import liveTriggers from './live-triggers';
import tracking from './tracking';

describe('AncientSouls/PostgreSQL:', () => {
  if (!process.env.DEVELOP) {
    it('wait pg docker', (done) => {
      setTimeout(() => done(), 4000);
    });
  }
  query();
  // liveQuery();
  // liveTriggers();
  tracking();
});
