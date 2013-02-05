(function() {

var isNode = typeof module !== 'undefined' && module.exports;

var jsyaml, _;
if (isNode) {
    jsyaml = require("js-yaml");
    _ = require("underscore");
} else {
    jsyaml = window.jsyaml;
    _ = window._;
}

var fromYaml = function(yaml, youtubeId, compileFn) {
    var qns = [];
    jsyaml.loadAll(yaml, function(q) {qns.push(q);});

    // add the youtube id
    _.each(qns, function(qn) {
        qn.youtubeId = youtubeId;
    });

    // compile the template
    _.each(qns, function(qn) {
        qn.template = compileFn(qn.template);
    });

    return qns;
};

// export fromYaml so it can be used in build process by node
if (isNode) {
    module.exports = fromYaml;
} else {
    Socrates.fromYaml = fromYaml;
}

})();
