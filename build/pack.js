#!/usr/bin/env node

var jsyaml = require("js-yaml");
var Handlebars = require("handlebars");

var yamlToJS = function(rawYaml, youtubeId) {
    var docs = [];
    jsyaml.loadAll(rawYaml, function(r) {
        r["youtubeId"] = youtubeId;
        docs.push(r);
    });

    var out = docs.map(function(e) {
        // hack hack hack!
        res = {};
        for (var k in e) {
            var k2 = JSON.stringify(k);
            res[k2] = k === "template" ?
                "template(" + Handlebars.precompile(e.template) + ")" :
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
    output.push("(function() {\n");
    output.push("var template = Handlebars.template;\n");
    output.push("PackageManager.setLoadedAndExport(");
    output.push("\"socrates-" + youtubeId + ".js\", ");
    output.push("[" + out.join(',\n') + "]");
    output.push(");\n");
    output.push("})();\n");
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
