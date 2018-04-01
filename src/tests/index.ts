import 'mocha';
require('source-map-support').install();

import query from './query';
import liveQuery from './live-query';

describe('AncientSouls/PostgreSQL:', () => {
  query();
  liveQuery();
});
