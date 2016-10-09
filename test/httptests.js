var assert = require('assert'),
    util = require('util'),
    markupDiff = require('../lib/markupDiff');

/**
 * Fail test.
 * Using a location path without leading / returns error.
 * Note : cannot run test until http serve found
 */
/*
 markupDiff.compare(
 [
 { host: 'needs.com', port : 80, path : 'innovation.html' },
 { glob : './content/simple2.html' }
 ],
 {
 attributes : ['class', 'data-*']
 },
 function(err, result){
 assert.equal(true, err !== null);
 assert.equal(true, result === null);
 }
 );
 */

/**
 * Happy test
 * Compare static vs http served module
 */

/**
 * Happy test
 * Compare static vs https served module
 */