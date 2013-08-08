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


// compile each yaml file to a js file.
glob.sync("questions/*.yaml").forEach(function(file) {
    console.log(file);
    var youtubeId = path.basename(file).slice(0, -".yaml".length);
    var rawYaml = fs.readFileSync(file, 'utf-8');
    var js = yamlToJS(rawYaml, youtubeId);
    fs.writeFileSync(file + ".js", js, 'utf-8');
});
