# MarkupDiff

MarkupDiff is a NodeJs package for detecting differences in markup. Specifically, it looks for changes in markup *structure*, whil ignoring content. Markup can be divided into discreet modules. In the BEM (Block Element Modifier) approch, a module would correspond to a block.

Tracking changes is useful in large development teams where markup is created by a frontend team using a rapid prototyping approach, and is then reimplemented by another team for final rendering in a CMS.

## Use

    npm install markupDiff

Compare modules found in two local files.

    var markupDiff = require('markupDiff');
    markupDiff.compare(

        // sources
        [{ glob: './some/file1.html' },
        { glob: './some/file2.html' }],

        // options (required)
        { }

        // callback (required)
        function(err, results){ }
    );

Compare modules from a remote HTML document, and all the files nested in a local folder.

    markupDiff.compare(
        [{ host: 'www.someDomain.com', port : 8080, path : '/doc.html'},
        { glob: './some/path/**/*.html' },
        { glob: './some/other/path/**/*.html' }],
        {},
        function(err, results){
        }
    );

Any combination of remote or local sources can be used.

## Options

Options is not required. It can be used to override the following default settings.

    markupDiff.compare(
        ...
        {
            encoding : 'utf8',
            consoleOut : true,
            consoleOutFirstErrorOnly : true
            attributes : ['class', 'data-*'],
            processInnerText : true,
            startModuleRegex : /<!--module:(\S*) -->/,
            endModuleRegex : /<!--\/module -->/,
            startIgnoreRegex : /<!--module!ignore-->/,
            endIgnoreRegex : /<!--\/module!ignore-->/
        }
        ...
    );

### encoding

Default: 'utf8'

Encoding used for loading file content.

### consoleOut

Default: true

If true,  errors will be written to the console by MarkupDiff.js.

### attributes

Default:  [] (all attributes).

The element attributes you want to include in your check.

    ['class', 'data-*']

Will compare the contents of class and any attribute starting with 'data-'. Values must be regex-ready strings.

### startModuleRegex

Default: /<!--module:(\S*) -->/

Regex used to identify the start of your modules. Must return module name.

### endModuleRegex

Default:  /<!--\/module -->/

Regex used to identify the end of your modules.

## How it works

MarkupDiff processes an interpretation of your markup, not a 100% identical mapping of it. It uses JSDOM to parse markup, and is only as accurate as JSOM allows. However, JSDOM is consistent in how it parses markup, so changes in markup will still yield different parsings.

## Assumptions

* Your markup is available as rendered HTML - either as local files, or from webserver.

 * Your markup is modular, you are willing to delimit your modules with some kind of inline comment

 * Your modules have unique names.

For example :

    <!--module:MyModule -->
    <div>
       ...
    <div>
    <!--/module -->

You want to check markup structure, not content. Elements and attributes like class name matter, everything else is noise. The following pieces of markup are therefore functionally identical even though image paths and alt/title differ.

    File1.html :
    <!--module:MyModule -->
    <div class="MyModule">
       <img class="MyModule-image" src="someImage.jpg" alt="">
    <div>
    <!--/module -->

    File2.html :
    <!--module:MyModule -->
    <div class="MyModule">
       <img class="MyModule-image" src="someOther.jpg" title="Some Other Image" />
    <div>
    <!--/module -->

The following are not identical because image class name differs.

    File3.html :
    <!--module:MyModule -->
    <div class="MyModule">
       <img class="MyModule-image" src="someImage.jpg" />
    <div>
    <!--/module -->

    File4.html :
    <!--module:MyModule -->
    <div class="MyModule">
       <img class="MyModule-otherimage" src="someImage.jpg" />
    <div>
    <!--/module -->

and the following cannot be compared because module names differ even though markup is identical.

    File5.html :
    <!--module:MyModule -->
    <div class="MyModule">
       <img class="MyModule-image" src="someImage.jpg" alt="">
    <div>
    <!--/module -->

    File6.html :
    <!--module:MyOtherModule -->
    <div class="MyModule">
       <img class="MyModule-image" src="someImage.jpg" alt="">
    <div>
    <!--/module -->
