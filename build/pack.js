#!/usr/bin/env node

var jsyaml = require("js-yaml");
var Handlebars = require("handlebars");
var _ = require("underscore");
var fromYaml = require("../js/load-yaml.js");

var yamlToJS = function(yaml, youtubeId) {
    // read the yaml file, compiling templates to evalable strings
    var qns = fromYaml(yaml, youtubeId, function(template) {
        return "template(" + Handlebars.precompile(template) + ")";
    });

    // stringify everything else
    var out = qns.map(function(e) {
        res = {};
        for (var k in e) {
            var k2 = JSON.stringify(k);
            res[k2] = k === "template" ? e[k] : JSON.stringify(e[k]);
        }
        return res;
    }).map(function(e) {
        var res = [];
        for (var k in e) {
            res.push(k + ":" + e[k]);
        }
        return "{\n" + res.join(",\n") + "\n}";
    });

    var output = [
        "(function() {\n",
        "var template = Handlebars.template;\n",
        "PackageManager.define(",
        "\"socrates-" + youtubeId + ".js\", ",
        "{\"questions\": ",
        "[" + out.join(',\n') + "]",
        "}",
        ");\n",
        "})();\n"
    ];
    return output.join('');
};


var path = require("path");
var fs = require("fs");
var glob = require("glob");


// compile each yaml file to a js file.  If no files are given on the
// commandline, process everything in <cwd>/questions/*.yaml.
// If the input is given in the form "a::b", then a is taken to be
// the input file, and b is taken to be the output file.
var argv = process.argv.slice(2);
if (!argv.length) {
    argv = glob.sync("questions/*.yaml");
}
argv.forEach(function(file) {
    var infile = file;
    var outfile = file + ".js";
    var in_and_out_file = file.split('::');
    if (in_and_out_file.length === 2) {
        infile = in_and_out_file[0];
        outfile = in_and_out_file[1];
    }
    console.log(infile, '=>', outfile);
    var youtubeId = path.basename(infile).slice(0, -".yaml".length);
    var rawYaml = fs.readFileSync(infile, 'utf-8');
    var js = yamlToJS(rawYaml, youtubeId);
    fs.writeFileSync(outfile, js, 'utf-8');
});
