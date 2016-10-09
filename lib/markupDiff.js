'use strict';

/**
 * Compares modules in sources. Files can be a url, or a path. A path can be a directory or file.
 *
 * @param {array} sources Array of HTML file sources (directory or URLs). Required.
 * @param {object} options Overrides defaults. Required.
 * @param {function} callback Results of comparison {err, results} are passed as parameter. Required.
 * @return {null} Use callback for return value. Returns an object contains analysis of markup, and errors/warning if
 * any.
 *
 * Error codes :
 * The basic error object has two properties { description : text, code : integer }. Additional properties may be
 * appended if applicable. Only one error is raised at a time. Markup differences are not errors.
 *
 * 1 : Invalid location path
 * 2 : Missing location path
 * 3 : Glob error.
 * 4 : Invalid location type
 * 5 : Mismatched ignore start/stop tag count
 * 6 : Mismatched module start/stop tag count
 * 7 : Module start Regex returned incorrect args count
 */

module.exports.compare = function(sources, options, callback){

    var http = require('http'),
        https = require('https'),
        process = require('process'),
        jsdom = require('jsdom-no-contextify').jsdom,
        path = require('path'),
        colors = require('colors'),
        _ = require('lodash'),
        fs = require('fs'),
        sourceIndex = 0,
        fetchedSources = [],
        defaults = {

            // encoding for reading/downloading files
            encoding : 'utf8',

            // if true, results will be written to console directly
            consoleOut : true,

            // if true, reports only first error. Useful to prevent a flood errors after an inserted-line mismatch.
            consoleOutFirstErrorOnly : true,

            // Names of attributes to check for conflicts. If none, all attributes will be checked.
            // Names can be regex patterns.
            attributes : [],

            // if true, text inside nodes will be treated as structure - the text context is ignored, but its presence
            // will count as a node
            processInnerText : true,

            // Start tag of module. Must be embedded in markup. Must return unique module name.
            startModuleRegex : /<!--module:(\S*)-->/,

            // End tag of module.
            endModuleRegex : /<!--\/module-->/,

            // start of ignore block
            startIgnoreRegex : /<!--module!ignore-->/,

            // end of ignore block
            endIgnoreRegex : /<!--\/module!ignore-->/
        };

    // enforce arguments (past this check errors are returned via callback)
    if (!sources || !Array.isArray(sources))
        throw 'Sources is required, and must be an array';

    if (!options || typeof options !== 'object')
        throw 'Options is required, and must be an object';

    if (!callback || typeof callback !== "function")
        throw 'Callback is required, and must be a function';

    options = _.merge(defaults, options);

    doNextSource();


    /**
     * Gets the next source, or proceeds to comparison check when all sources are loaded.
     */
    function doNextSource(){
        if (sourceIndex === sources.length) {
            compareSources(fetchedSources);
        } else {
            loadSource(sources[sourceIndex], function(source){
                fetchedSources = fetchedSources.concat(source);
                sourceIndex ++;
                doNextSource();
            });
        }
    }


    /**
     * Loads/fetches html documents at a given source. source can be a url, or a path glob. Returns one or more
     * documents (glob can return multipl files).
     *
     * source can be one of two types :
     *
     * { host : 'www.domain.com', port : 80, path : '/page.html' }
     * This is the standard node.js "http.request" options object
     * (https://nodejs.org/api/http.html#http_http_request_options_callback)
     *
     * Or
     * { glob : 'some/path/', options : { } }
     * Options here is the standard 'glob' package's options
     * (https://github.com/isaacs/node-glob)
     *
     * Returns an array of objects : { content : string, source : string }
     * Where content is the markup of the target document, source is its unique file path / url.
     */
    function loadSource(source, localCallback){

        if (source.host){

            if (!source.port)
                source.port = 80;

            if (source.path === undefined || source.path === null){
                callback({ description : 'Url source expects a page argument', code : 2}, null);
                process.exitCode  = 1;
                return;
            }

            // path must have leading / or request will fail, this is a nodejs http thing
            if (source.path.indexOf('/') !== 0) {
                callback({description : 'path needs to start with /', code : 1}, null);
                process.exitCode  = 1;
                return;
            }

            var content = '',
                protocol = source.https ? https : http,
                req = protocol.request(source, function(res) {
                    res.setEncoding(options.encoding);
                    res.on('data', function (chunk) {
                        content += chunk;
                    });

                    res.on('end', function () {
                        localCallback([{
                            content : content,
                            path : path.join(source.host, source.path)
                        }]);
                    });
                });

            req.end();

        } else if (source.glob) {
            var glob = require('glob');

            glob(source.glob, source.options || { }, function(er, files){

                // exit on error
                if (er){
                    callback( {description : 'Glob error', code : 3, inner : er}, null);
                    process.exitCode  = 1;
                    return;
                }

                if (files.length === 0)
                    console.warn('No files found for "' + source.glob + '".');

                var results = [];

                for (var i = 0 ; i < files.length ; i ++)
                    results.push({
                        content : fs.readFileSync(files[i], { encoding : options.encoding}),
                        path : files[i]
                    });

                localCallback(results);
            });

        } else {
            callback({description : 'Unsupported source. ' + source, code : 4 }, null);
            process.exitCode  = 1;
        }
    }


    /**
     * @param {array} sources Array of source objects : { content : string, location : string }
     */
    function compareSources(sources){

        // Each source is a raw HTML file (string). Each file needs to converted into an array of "line objects".
        // LineArrays is therefore an array of arrays.
        var sourcesAsLines = [];
        for (var i = 0 ; i < sources.length ; i ++){
            var linesOut = [],
                dom = jsdom(sources[i].content);

            // start recursive process for all nodes in dom
            nodeToLine(dom.body, linesOut);

            sourcesAsLines.push({
                lines : linesOut,
                path : sources[i].path
            });
        }

        // Line arrays are then split into modules - we're interested in modules only, not rest of dom.
        var modules = {};
        for (var i = 0 ; i < sourcesAsLines.length ; i ++)
            linesToModules(sourcesAsLines[i], modules);

        // compares modules for differences
        var results = compareModules(modules);

        // write results to console if necessary
        if (options.consoleOut) {
            var modulesShown = {};

            console.log(('Found ' + Object.keys(modules).length + ' module(s).').green);

            if (Object.keys(results.errors).length){
                console.log('Detected the following mismatches : ');

                for (var module in results.errors){
                    var error = results.errors[module];

                    // if configured, show first error in module only
                    if (options.consoleOutFirstErrorOnly && modulesShown[module]){
                        if (modulesShown[module] === 1) {
                            console.log((module + ' - additional errors suppressed').red);
                            modulesShown[module] = 2;
                        }
                        continue;
                    }

                    modulesShown[module] = 1;
                    for (var line in error){
                        console.log();
                        console.log(('module ' + module + ', line ' + line).red);

                        // show paths
                        for (var i = 0 ; i < error[line].length ; i ++)
                            console.log(error[line][i].path);

                        // then show source code
                        for (var i = 0 ; i < error[line].length ; i ++)
                            console.log((error[line][i].src).yellow);
                    }


                }
            } else {
                console.log(('No mismatches detected.').green);
            }
        }

        // finally, pass errors back via callback
        if (callback)
            callback(null, { modules : modules,  results : results});
    }


    /**
     * Converts the contents of node to a string, and recurses for all children of that node. Children will be wrapped
     * inside a closing tag of the parent node if applicable.
     *
     * outArray is an array of strings.
     */
    function nodeToLine(node, outArray){
        var flattened = null;

        // handle different node types
        if (node.nodeType === 1)
        {
            // Structural nodes are recreated here. The recreated node structure is not identical to the source HTML, as
            // JSDOM doesn't parse 100% accurately, however, JSOM is always consistent in how it parses. Identical markup
            // always parses the same, and we are interested in differences only.

            flattened = '<' + node.tagName.toLowerCase();

            // transfer node attribute values - if options.attributes are set, only attributes which match that list
            if (node.attributes)
                for (var j = 0 ; j < node.attributes.length ; j ++){
                    var attribute = node.attributes[j],
                        attributeAllowed = false;

                    if (options.attributes.length)
                        for (var k = 0 ; k < options.attributes.length ; k  ++){
                            var reg = new RegExp(options.attributes[k]);
                            if (attribute.name.match(reg)){
                                attributeAllowed = true;
                                break;
                            }
                        }
                    else
                        attributeAllowed = true;

                    if (attributeAllowed)
                        flattened += ' ' + attribute.name+'="' + attribute.value + '"' ;
                }

            flattened += '>';
        }
        else if (node.nodeType === 3 && options.processInnerText){
            // replace inner text content with a standard element - we want to test for presence, not content,  of
            // innertext
            var nodeValue = node.nodeValue.trim();
            nodeValue = nodeValue.replace(/\n/, '');
            if (nodeValue.length > 0)
                flattened = '<innertext/>';
        }
        else if (node.nodeType === 8){
            // recreate comments
            flattened = '<!--' + node.nodeValue + '-->';
        }

        if (flattened)
            outArray.push(flattened);

        // recurse for children
        for (var i = 0 ; i < node.childNodes.length ; i ++)
            nodeToLine(node.childNodes[i], outArray);

        // close node off if structural
        if (node.nodeType === 1)
            outArray.push('</' + node.tagName.toLowerCase() + '>');
    }


    /**
     * Divides lines into modules. Modules are defined by start/end tags. Content within ignored blocks are not
     * included.
     *
     * @param {object} sourceLines SourceLines is an object : { lines : [ string ], path : string}. This contains HTML
     * from a unique source, divided up into an array of string lines.
     *
     * @param {object} modules Modules found will be appended to this object as follows :
     *
     *      {
     *          someModule : {
     *              aLocation : [ string ],
     *              otherLocation : [ string ],
     *          },
     *
     *          otherModule : ...
     *      }
     *
     *      Module name is unique, and a location can have only one module in its markup. Duplicates will be
     *      overwritten, last one wins.
     *
     */
    function linesToModules(sourceLines, modules){

        var moduleStarts = 0,
            ignoreStarts = 0,
            ignoreEnds = 0,
            testOut = '',
            moduleEnds = 0;

        // ensure that start and enf flag counts are equal
        for (var i = 0 ; i < sourceLines.lines.length ; i ++) {
            var line = sourceLines.lines[i];

            if (options.startModuleRegex.exec(line))
                moduleStarts ++;
            else if (options.endModuleRegex.exec(line))
                moduleEnds ++;

            if (options.startIgnoreRegex.exec(line))
                ignoreStarts ++;
            else if (options.endIgnoreRegex.exec(line))
                ignoreEnds ++;

            testOut += line + '\r\n';
        }

        // exit if start/end tags don't match, this means modules/ignore structure is broken
        if (ignoreStarts !== ignoreEnds){
            callback({ description : 'Ignore start/end mismatch at ' + sourceLines.path, code : 5 }, null);
            process.exitCode  = 1;
            return;
        }

        // exit if start/end tags don't match, this means modules/ignore structure is broken
        if (moduleStarts !== moduleEnds){
            callback ({ description : 'Module start/end mismatch as ' +  + sourceLines.path, code : 6 }, null);
            return;
        }

        // remove ignore tags
        while (true) {
            var startPosition = -1;

            for (var i = 0 ; i < sourceLines.lines.length ; i ++) {
                var line = sourceLines.lines[i];

                // find start tag furthest down array
                var startMatches = options.startIgnoreRegex.exec(line);
                if (startMatches)
                    startPosition = i;

                // find end tag after last start tag - this will be the closing tag
                if (options.endIgnoreRegex.exec(line) && startPosition !== -1){
                    sourceLines.lines.splice(startPosition, i - startPosition + 1); // cut out of array, including start/end tags
                    break;
                }
            }

            // no more modules, exit
            if (startPosition === -1)
                break;
        }


        // find modules
        while (true){
            var startPosition = -1,
                moduleName = '';

            for (var i = 0 ; i < sourceLines.lines.length ; i ++) {
                var line = sourceLines.lines[i];

                // find start tag furthest down array
                var startMatches = options.startModuleRegex.exec(line);
                if (startMatches){
                    startPosition = i;

                    // this should never happen, but rather throw exception than do array overrun
                    if (startMatches.length < 2){
                        callback({ description : 'Regex for module startTag returned unexpected match count.', code: 7 } , null);
                        process.exitCode  = 1;
                        return;
                    }

                    moduleName = startMatches[1].trim();
                }

                // find end tag after last start tag - this will be the closing tag
                if (options.endModuleRegex.exec(line) && startPosition !== -1){

                    var sourceName = sourceLines.path;
                    modules[moduleName] = modules[moduleName] || {};
                    modules[moduleName][sourceName] = sourceLines.lines.splice(startPosition, i - startPosition + 1); // cut module out of array, including start/end tags
                    modules[moduleName][sourceName].splice(0,1); // discard first (start tag), we don't need it
                    modules[moduleName][sourceName].splice(modules[moduleName][sourceName].length - 1, 1); // discard last(end tag), we don't need it
                    break;
                }
            }

            // no more modules, exit
            if (startPosition === -1)
                break;
        }
    }


    /**
     * Compares modules for differences. Prints results to console if enabled. Returns an object with parsed markup,
     * warnings and errors, formatted as follows :
     *
     *   {
     *
     *     errors : {
     *       module : {
     *         line : [
     *          { src : text, path : text},
     *          { src : text, path : text}
     *         ]
     *       }
     *     }
     *
     *     warnings : {
     *
     *       module : {
     *         description : string,
     *         source: string
     *       }
     *
     *       someOtherModule : ...
     *     }
     *   }
     */
    function compareModules(modules)
    {
        var results = {
            errors : {},
            warnings : {}
        };

        for (var module in modules){

            // check if only instance of a module was detected, then warn
            if (Object.keys(modules[module]).length === 1){
                results.warnings[module] = {
                    description : 'Only only one instance of module "' + module + '" detected, unable to test.',
                    path : Object.keys(modules[module])[0]
                };
                continue;
            }

            for (var source in modules[module]){

                for (var otherSource in modules[module]){

                    // don't test against self
                    if (source === otherSource)
                        continue;

                    var sourceModule = modules[module][source],
                        testModule = modules[module][otherSource];

                    for (var i = 0 ; i < sourceModule.length ;  i++){
                        var testLine = null,
                            mainLine = sourceModule[i];

                        // the "line" being tested against must be in the same position in the
                        // corresponding array
                        if (testModule.length >= i)
                            testLine = testModule[i];

                        // null check
                        var fail = false;
                        if (!testLine || !mainLine)
                            fail = true;
                        else if (testLine.markup !==  mainLine.markup)
                            fail = true;


                        if (fail) {
                            results.errors[module] = results.errors[module] || { };
                            results.errors[module][i + 1] = [
                                {
                                    src : mainLine ? mainLine : '[no corresponding line]',
                                    path : source
                                },
                                {
                                    src : testLine ?  testLine : '[no corresponding line]',
                                    path : otherSource
                                }
                            ]
                        }
                    }
                }
            }
        }

        return results;
    }

};
