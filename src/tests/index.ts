require('source-map-support').install();

import query from './query';
import restricted from './restricted';

describe('AncientSouls/PostgreSQL:', () => {
  query();
  restricted();
});
