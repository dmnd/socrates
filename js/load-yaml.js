Socrates.loadYaml = function(yaml, youtubeId) {
    docs = [];
    jsyaml.loadAll(yaml, function(r) {docs.push(r);});

    var collapsed = _.map(docs, function(doc) {
        if (doc.kind === "bookmark") {
            return new Socrates.Bookmark(doc);
        } else {
            doc.template = Handlebars.compile(doc.template);
            doc.youtubeId = youtubeId;
            return new Socrates.Question(doc);
        }
    });

    var expanded = [];
    _.each(collapsed, function(i) {
        var t = i.get("explainAgain");
        if (t) {
            expanded.push(new Socrates.Bookmark({
                time: t,
                title: i.get("title")
            }));
        }
        expanded.push(i);
    });
    return new Backbone.Collection(expanded);
};
