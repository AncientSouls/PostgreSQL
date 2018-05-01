import 'mocha';
require('source-map-support').install();

import babilon from './babilon';
import client from './client';
import asketic from './asketic';

describe('AncientSouls/PostgreSQL:', () => {
  if (process.env['TRAVIS_JOB_ID']) {
    it('wait pg docker', (done) => {
      setTimeout(() => done(), 4000);
    });
  }
  babilon();
  client();
  asketic();
});
