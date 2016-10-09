# MarkupDiffjs

MarkupDiffjs is a NodeJs tool for detecting differences in markup. It is built around a workflow style wherein markup is organized into discreet modules. One team creates markup in a codebase (normally a frontend rapid prototyping environment), and another team re-implements that markup in a separate codebase (normally a deep stack like a content management system). Detecting markup changes in this scenario can be difficult, and this tool helps to assist with that.

## Assumptions

Your markup is stored in HTML files.

Your markup is modular, you are willing to delimit your modules with some kind of inline comment, and you can give your modules unique names.

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

## Use

Compare modules found in two local files.

    var markupDiff = require('markupDiffjs');
    markupDiff.compare(
        { glob: './some/file1.html' },
        { glob: './some/file2.html' }
    );

Compare modules from a remote HTML document, and all the files nested in a local folder.

    markupDiff.compare(
        { host: 'www.someDomain.com', port : 8080, path : '/doc.html'},
        { glob: './some/path/**/*.html' },
        { glob: './some/other/path/**/*.html' }
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

