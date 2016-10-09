var assert = require('assert'),
    util = require('util'),
    markupDiff = require('../lib/markupDiff');

/**
 * To access remote, use
 * { host: 'domain.com', port : 80, path : '/page.html'},
 */

/**
 *
 */
markupDiff.compare(
    [
        { glob : './content/simple1.html' },
        { glob : './content/simple2.html' }
    ],
    {
        attributes : ['class', 'data-*']
    },
    function(err, result){
        assert.equal(true, err == null);
        assert.equal(true, result !== null);
        //console.log(util.inspect(result.results, showHidden=true, depth=10 ));
    }
);

