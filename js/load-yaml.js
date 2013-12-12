(function() {

var jsyaml, _;

if (typeof window !== 'undefined' && window.jsyaml && window._) {
    jsyaml = window.jsyaml;
    _ = window._;
} else {
    jsyaml = require("js-yaml");
    _ = require("underscore");
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
if (typeof module !== 'undefined') {
    module.exports = fromYaml;
}

// socrates.js expects this to be available in `Socrates.loadQuestions`
if (typeof Socrates !== 'undefined') {
    Socrates.fromYaml = fromYaml;
}

})();
