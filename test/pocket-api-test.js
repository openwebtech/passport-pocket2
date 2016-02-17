'use strict';

const PocketApi = require('../lib/pocket-api');
const chai = require('chai');
const expect = chai.expect;

describe('pocket api test', function() {

    before(function() {
      this.api = new PocketApi({
        consumerKey: process.env.POCKET_CONSUMER_KEY,
        accessToken: process.env.POCKET_ACCESS_TOKEN
      });
    });

    it('should add item with tags', function() {
      const url = 'https://github.com/openwebtech/passport-pocket2';
      return this.api.add({
        url: url,
        tags: 'javascript, node.js, passport'
      })
      .then(data => {
        console.log('data', data);
        expect(data.item['resolved_url']).to.equal(url);
        expect(data.item.title).to.equal('openwebtech/passport-pocket2');
      });
    });

    it('should get unread items', function() {
      return this.api.get()
      .then(data => {
        // console.log(data);
        expect(data.status).to.equal(1);
        expect(Object.keys(data.list)).to.have.length.gt(0);
      });
    });

    it('should get archive items', function() {
      return this.api.get({
        state: 'archive',
        tag: 'javascript'
      })
      .then(data => {
        // console.log(data);
        expect(data.status).to.equal(1);
        expect(Object.keys(data.list)).to.have.length.gt(0);
      });
    });

    xit('should modify item', function() {
      // TODO
    });
});
