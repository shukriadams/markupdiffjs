# MarkupDiff.js



MarkupDiff.js is a NodeJs tool for detecting differences in markup. It is built around a workflow style wherein markup is organized into discreet modules. Frontend developers create markup in one codebase (normally a frontend rapid prototyping environment), and backend developers mirror that markup in a separate codebase (normally a deep stack like a content management system). Detecting markup changes in this scenario can be difficult, and this tool helps to assist with that.

## Assumptions

Your markup is stored in HTML files, with <html> and <body> elements. This is mostly to satisfy parsing by JSDOM, which
will add a body element to any dom that doesn't already have one.

Your markup is modular, you are willing to delimit your modules with some kind of inline comment, and you can give your modules a unique name.

    <!--module:MyModule -->
    <div>
       ...
    <div>
    <!--/module -->

You care about markup structure, not content. Elements and attributes like class name matter, everything is noise. The following pieces of markup are therefore functionally identical even though image paths and alt/title differ.

    File 1 :
    <!--module:MyModule -->
    <div class="MyModule">
       <img class="MyModule-image" src="someImage.jpg" alt="">
    <div>
    <!--/module -->

    File 2 :
    <!--module:MyModule -->
    <div class="MyModule">
       <img class="MyModule-image" src="someOther.jpg" title="Some Other Image" />
    <div>
    <!--/module -->

The following are not identical because image class name differs.

    File 1 :
    <!--module:MyModule -->
    <div class="MyModule">
       <img class="MyModule-image" src="someImage.jpg" />
    <div>
    <!--/module -->

    File 2 :
    <!--module:MyModule -->
    <div class="MyModule">
       <img class="MyModule-otherimage" src="someImage.jpg" />
    <div>
    <!--/module -->

and the following cannot be compared because module names differ even though markup is identical.

    File 1 :
    <!--module:MyModule -->
    <div class="MyModule">
       <img class="MyModule-image" src="someImage.jpg" alt="">
    <div>
    <!--/module -->

    File 2 :
    <!--module:MyOtherModule -->
    <div class="MyModule">
       <img class="MyModule-image" src="someImage.jpg" alt="">
    <div>
    <!--/module -->

## Use


    var markupDiff = require('markupDiff.js');
    markupDiff.compare(
        { path: './some/file1.html' },
        { path: './some/file2.html' }
    );

This directs MarkupDiff.js to compare modules found in two local files.

    markupDiff.compare(
        { host: 'www.someDomain.com', port : 8080, path : 'doc.html'},
        { path: './some/file2.html' }
    );

This directs MarkupDiff.js to compare modules from a remote HTML document, and a local file.

    markupDiff.compare(
        { path: './some/folder' },
        { path: './some/file2.html' }
    );

This directs MarkupDiff.js to compare modules found in all files nested under a given folder, against a local file. Any combination (file, folder or url) can be used.

## Options

Options is not required. It can be used to override the following default settings.

    markupDiff.compare(
        ...
        {
            encoding : 'utf8',
            consoleOut : false,
            matchAttributes : ['class', 'data-*'],
            startModuleRegex : /<!--module:(\S*) -->/,
            endModuleRegex : /<!--\/module -->/
        }
    );

### encoding

Default: 'utf8'

Encoding used for loading file content.

### consoleOut

Default: true

If true,  errors will be written to the console by MarkupDiff.js.

### matchAttributes

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

