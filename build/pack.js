#!/usr/bin/env node

var jsyaml = require("js-yaml");
var Handlebars = require("handlebars");
var yamlToJS = function(rawYaml, youtubeId) {
    var docs = [];
    jsyaml.loadAll(rawYaml, function(r) {docs.push(r);});

    var out = docs.map(function(e) {
        // hack hack hack!
        res = {};
        for (var k in e) {
            var k2 = JSON.stringify(k);
            res[k2] = k === "template" ? Handlebars.precompile(e.template) :
                JSON.stringify(e[k]);
        }
        return res;
    }).map(function(e) {
        var res = [];
        for (var k in e) {
            res.push(k + ":" + e[k]);
        }
        return "{\n" + res.join(",\n") + "\n}";
    });

    var output = [];
    output.push("PackageManager.setLoadedAndExport(");
    output.push("\"socrates-" + youtubeId + "-package\", ");
    output.push("[" + out.join(',\n') + "]");
    output.push(");");

    return output.join('');
};


// compile each yaml file to a js file.
var file =  "questions/xyAuNHPsq-g.yaml";

var path = require("path");
var youtubeId = path.basename(file).slice(0, -".yaml".length);

var fs = require("fs");
var rawYaml = fs.readFileSync(file, 'utf-8');

var js = yamlToJS(rawYaml, youtubeId);
fs.writeFileSync(file + ".js", js, 'utf-8');
