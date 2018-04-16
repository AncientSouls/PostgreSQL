import 'mocha';
require('source-map-support').install();

import babilon from './babilon';
import adapter from './adapter';

describe('AncientSouls/PostgreSQL:', () => {
  if (!process.env.DEVELOP) {
    it('wait pg docker', (done) => {
      setTimeout(() => done(), 4000);
    });
  }
  babilon();
  adapter();
});
