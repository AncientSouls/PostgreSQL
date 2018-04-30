import 'mocha';
require('source-map-support').install();

import babilon from './babilon';
import client from './client';
import asketic from './asketic';

describe('AncientSouls/PostgreSQL:', () => {
  babilon();
  client();
  asketic();
});
