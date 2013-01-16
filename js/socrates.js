Socrates = window.Socrates || {};

/**
 * Handle a click on a link to a socrates bookmark. Such links have a href
 * like "#question-id". These links are mainly used as part of the scrubber,
 * but sometimes questions also have them.
 *
 * TODO(dmnd): Handle links to ISO8601 durations as well.
 */
Socrates.potentialBookmark = function(e) {
    var href = $(e.currentTarget).attr("href");
    if (href[0] !== "#") {
        return;
    }

    var id = href.slice(1);
    // here we directly access the views array inside videoViews, as we don't
    // care about views that are not currently ready. This is an event handler,
    // we have to react to the user immediately.
    var handled = _.some(window.videoViews.views, function(v) {
        return (v.whenReady().state() === "resolved" &&
                v.socratesManager &&
                v.socratesManager.maybeNavigateTo(id));
    });
    if (handled) {
        e.preventDefault();
    }
};

/**
 * Represents a time offset into a video that might be useful to link to.
 * Usually represents the beginning of an explanation of a concept.
 */
Socrates.Bookmark = Backbone.Model.extend({
    defaults: {
        complete: false
    },

    seconds: function() {
        return this.constructor.timeToSeconds(this.get("time"));
    },

    slug: function() {
        return _.str.slugify(this.get("title"));
    },

    toJSON: function() {
        var json = Backbone.Model.prototype.toJSON.call(this);
        json.slug = this.slug();
        return json;
    }
}, {
    /**
     * Attempts to convert a string representing an ISO8601 duration into just
     * the number of seconds.
     * @param  {string} time ISO8601 duration like "4m21s"
     * @return {number}      The duration in seconds only
     */
    timeToSeconds: function(time) {
        if (time == null || time.length === 0) {
            throw "Invalid argument";
        }
        result = 0;
        var i = 0;
        while (time[i]) {
            var start = i;
            while (time[i] && /[\d\.,]/.test(time[i])) i++;
            var n = parseFloat(time.slice(start, i));
            var unit = time[i] || "s"; // assume seconds if reached end
            if (unit == "m") {
                result += n * 60;
            } else if (unit == "s") {
                result += n;
            } else {
                throw "Unimplemented unit, only ISO8601 durations with mins and secs";
            }
            i++;
        }
        return result;
    }
});

/**
 * Represents a Socrates question.
 */
Socrates.Question = Socrates.Bookmark.extend({
    baseSlug: Socrates.Bookmark.prototype.slug,

    slug: function() {
        return this.baseSlug() + "/q";
    },

    imageUrl: function() {
        return this.get("youtubeId") + "-" + this.get("time");
    },

    templateName: function() {
        return "socrates-" + this.get("youtubeId") + "." + this.baseSlug();
    }
});

// This will be populated by video-specific javascript.
Socrates.Data = {};

Socrates.isQuestion = function(o) {
    return o && o.constructor &&
        o.constructor.prototype === Socrates.Question.prototype;
};

Socrates.QuestionCollection = Backbone.Collection.extend({
    model: Socrates.Question
});

Socrates.QuestionView = Backbone.View.extend({
    className: "question",

    events: {
        "click form .submit": "submit",
        "keyup form": "skipOnEsc",
        "click .submit-area a.skip": "skip",
        "click .close": "skip",
        "click .submit-area a.see-answer": "seeAnswerClicked",
        "click a": Socrates.potentialBookmark
    },

    timeDisplayed: 0,
    startTime: null,

    initialize: function() {
        _.extend(this, this.options);
        this.version = 1;
        this.loaded = false;
        this.template = this.model.get("template") || Templates.get(this.model.templateName());

        this.render();
    },

    render: function() {
        var explainLink;
        if (this.model.get("explainAgain")) {
            explainLink = "#" + this.model.slug().slice(0, -2);
        }

        this.$el.html(this.template({
            explainUrl: explainLink,
            imgsrc: this.imageUrl()
        }));

        this._hasVideoFrame = this.$(".videoframe").length !== 0;
        if (this._hasVideoFrame) {
            this.onResize = _.throttle(
                _.bind(this._applyLimitingDimension, this), 100);

            // TODO(dmnd) unbind this when the question is done
            $(window).on("resize", this.onResize);
        }

        this.loaded = true;

        // render all latex
        Socrates.requireMathJax().then(_(function() {
            Socrates.kathJax(this.$("code"));
        }).bind(this));

        return this;
    },

    /**
     * The aspect ratio of the background picture/video. Defaults to 16:9 since
     * older version of IE don't have img.naturalHeight, and a default value
     * makes the backdrop look not totally broken.
     */
    _aspectRatio: 16 / 9,

    /**
     * Measure the aspect ration of the video by looking at the natural
     * dimensions of the background screenshot, if it exists. Note that this
     * method does not return the aspect ratio - it stores it in a member
     * variable _aspectRatio.
     *
     * Old versions of IE don't have naturalHeight, so this might not work, in
     * which case a default value will remain in _aspectRatio and this method
     * will return false.
     *
     * @return {boolean} Returns whether measurement was possible or not.
     */
    _measureAspectRatio: function() {
        var img = this.$("img.boxbound")[0];
        if (img && img.naturalHeight) {
            this._aspectRatio = img.naturalWidth / img.naturalHeight;
            return true;
        }
        return false;
    },

    /**
     * Returns true if the video is constrained by height, and false if it is
     * constrained by width.
     */
    _shouldFillHeight: function() {
        if (!this._measuredAspectRatio) {
            this._measuredAspectRatio = this._measureAspectRatio();
        }
        var $f = this.$(".videoframe");
        return $f.width() / $f.height() >= this._aspectRatio;
    },

    /**
     * Allows a videoframe backdrop to resize while preserving aspect ration in
     * the same way the youtube player's video content does.
     *
     * Note that only the backdrop scales properly - question contents are
     * simply fixed sized and centered.
     */
    _applyLimitingDimension: function() {
        var $box = this.$(".videoframe .boxbound");
        if ($box.length) {
            var shouldFillHeight = this._shouldFillHeight();
            $box.toggleClass("fillheight", shouldFillHeight)
                .toggleClass("fillwidth", !shouldFillHeight);
        }
    },

    qtip: function(x, y) {
        var override = {};
        if (x != null) {
            override = { adjust: {x: x, y: y}};
        }
        var $qtipq = this.$(".qtip-question");

        if ($qtipq.length > 0) {
            // controls is the layer that contains all UI for the question
            var $controls = this.$(".controls");

            // qtips can provide a custom target, but we default to its parent
            var $target = $qtipq.parent();

            // if we were provided with a target selector, try to find it
            var targetSelector = $qtipq.data("qtip-target");
            if (targetSelector) {
                $target = $qtipq.parent().find(targetSelector);
            }

            // get qtip info from markup
            var qtipMarkup = $qtipq.data("qtip") || {};

            $target.qtip($.extend(true, {
                content: {
                    text: $qtipq
                },
                position: $.extend({
                    container: $controls,
                    at: [0, 0]
                }, this.model.get("qtip-position"), override)
            }, qtipMarkup, this.constructor._permaQtip));
        }
    },

    hide: function() {
        this.finishRecordingTime();
        this.$el.removeClass("visible");
        return this;
    },

    finishRecordingTime: function() {
        if (this.startTime) {
            this.timeDisplayed += (+new Date() - this.startTime);
            this.startTime = null;
        } else {
            this.timeDisplayed = 0;
        }
        return this.timeDisplayed;
    },

    show: function() {
        this.startTime = +new Date();
        this.$el.addClass("visible");
        if (!this._qtipRendered) {
            this.qtip();
            this._qtipRendered = true;
        }
        if (this._hasVideoFrame) {
            this._applyLimitingDimension();
        }
        this.$("form input").first().focus();
        return this;
    },

    imageUrl: function() {
        return "/images/videoframes/" + this.model.imageUrl() + ".jpeg";
    },

    isCorrect: function(data) {
        var correctAnswer = this.model.get("correctData");

        // if no answer is specified, any answer is correct
        if (correctAnswer == null) {
            return true;
        }

        // otherwise make sure they got it right.
        // todo: look at how khan-exercise does their fancy number handling
        return _.isEqual(data, correctAnswer);
    },

    getData: function() {
        data = {};

        // process all matrix-inputs
        var $matrixInputs = this.$("table.matrix-input");
        data = _.extend(data, this.matrixInputToAnswer($matrixInputs));

        // process all checkbox-grids
        var $checkboxGrids = this.$("table.checkbox-grid");
        data = _.extend(data, this.checkBoxGridToAnswer($checkboxGrids));

        // process the result of the inputs
        var $inputs = this.$("input")
            .not($matrixInputs.find("input"))
            .not($checkboxGrids.find("input"));

        data = _.extend(data, this.freeInputsToAnswer($inputs));
        return data;
    },

    matrixInputToAnswer: function($matrixInputs) {
        var data = {};
        _.each($matrixInputs, function(table) {
            var matrix = _.map($(table).find("tr"), function(tr) {
                return _.map($(tr).find("input"), function(input) {
                    return parseFloat($(input).val());
                });
            });

            var name = $(table).attr("name") || "answer";
            data[name] = matrix;
        });
        return data;
    },

    checkBoxGridToAnswer: function($checkboxGrids) {
        var data = {};
        _.each($checkboxGrids, function(grid) {
            var headers = _.map($(grid).find("thead th"), function(td) {
                return $(td).attr("name");
            });
            headers = _.rest(headers, 1);
            var answer = {};
            _.each($(grid).find("tbody tr"), function(tr) {
                var row = {};
                _.each($(tr).find("input"), function(input, i) {
                    row[headers[i]] = $(input).prop("checked");
                });
                answer[$(tr).attr("name")] = row;
            });

            var name = $(grid).attr("name") || "answer";
            data[name] = answer;
        });
        return data;
    },

    freeInputsToAnswer: function($inputs) {
        var data = {};
        $inputs.each(function(i, el) {
            var $el = $(el);
            var key = $el.attr("name");

            var val;
            if ($el.attr("type") === "checkbox") {
                val = $el.prop("checked");
            } else if ($el.attr("type") === "radio") {
                if ($el.prop("checked")) {
                    val = $el.val();
                } else {
                    // ignore if it's an unchecked radio button
                    return true; // continue
                }
            } else {
                val = $el.val();
            }

            var isArray = false;
            if (data[key] != null) {
                if (!_.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                isArray = true;
            }

            if (isArray) {
                data[key].push(val);
            } else {
                data[key] = val;
            }
        });
        return data;
    },

    seeAnswerClicked: function() {
        this.$(".submit-area .submit").prop("disabled", true);
        this.showMem();
        this.loadAnswer();
    },

    loadAnswer: function() {
        var data = $.extend(true, {}, this.model.get("correctData"));

        // process all matrix-inputs
        var $matrixInputs = this.$("table.matrix-input");
        data = this.answerToMatrixInputs($matrixInputs, data);

        // process all checkbox-grids
        var $checkboxGrids = this.$("table.checkbox-grid");
        data = this.answerToCheckboxGrids($checkboxGrids, data);

        // process the result of the inputs
        var $inputs = this.$("input")
            .not($matrixInputs.find("input"))
            .not($checkboxGrids.find("input"));

        data = this.answerToFreeInputs($inputs, data);

        // by now data should be empty
        if (!_.isEmpty(data)) {
            KAConsole.log("failed to load answer correctly");
        }
    },

    answerToMatrixInputs: function($matrixInputs, data) {
        _.each($matrixInputs, function(table) {
            var name = $(table).attr("name") || "answer";
            var matrix = data[name];

            _.each($(table).find("tr"), function(tr, i) {
                return _.each($(tr).find("input"), function(input, j) {
                    $(input).val(matrix[i][j]);
                });
            });

            delete data[name];
        });
        return data;
    },

    answerToCheckboxGrids: function($checkboxGrids, data) {
        _.each($checkboxGrids, function(grid) {
            var name = $(grid).attr("name") || "answer";
            var answer = data[name];

            var headers = _.map($(grid).find("thead th"), function(td) {
                return $(td).attr("name");
            });
            headers = _.rest(headers, 1);
            _.each($(grid).find("tbody tr"), function(tr) {
                var rowName = $(tr).attr("name");
                _.each($(tr).find("input"), function(input, i) {
                    $(input).prop("checked", answer[rowName][headers[i]]);
                });
            });
        });
        return data;
    },

    answerToFreeInputs: function($inputs, data) {
        $inputs.each(function(i, el) {
            var $el = $(el);
            var key = $el.attr("name");

            var val = data[key];
            var isArray = _.isArray(data[key]);
            if (isArray) {
                val = data[key].shift();
            }
            // delete the item unless it's a nonempty array
            if (!(isArray && !_.isEmpty(data[key]))) {
                delete data[key];
            }

            if ($el.attr("type") === "checkbox") {
                $el.prop("checked", val);
            } if ($el.attr("type") === "radio") {
                if ($el.val() === val) {
                    $el.prop("checked", true);
                }
                else {
                    // put the item back since we can't use it
                    data[key] = val;
                    return true; // continue
                }
            } else {
                $el.val(val);
            }
        });

        return data;
    },

    getResponse: function() {
        // get response data
        var data = this.getData();

        // find how long it took to answer, then reset the countera
        var timeDisplayed = this.finishRecordingTime();
        this.timeDisplayed = 0;

        return {
            time: this.model.get("time"),
            youtubeId: this.model.get("youtubeId"),
            id: this.model.get("id"),
            version: this.version,
            correct: this.isCorrect(data),
            data: data,
            timeDisplayed: timeDisplayed
        };
    },

    validateResponse: function(response) {
        requiredProps = ["id", "version", "correct", "data", "youtubeId",
            "time"];
        var hasAllProps = _.all(requiredProps, function(prop) {
            return response[prop] != null;
        });
        if (!hasAllProps) {
            KAConsole.log(response);
            throw "Invalid response from question";
        }
        return true;
    },

    fireAnswered: function() {
        this.trigger("answered");
    },

    submit: function(evt) {
        evt.preventDefault();
        var $form = $(evt.currentTarget).parents("form");
        var $button = $form.find("button.submit");

        // when question has been answered correctly, the submit button
        // says continue.
        if ($button.text().trim() === "Continue") {
            this.fireAnswered();
            return;
        }

        // otherwise, get the answer
        var response = this.getResponse();
        this.validateResponse(response);

        // log it on the server side
        this.log("submit", response);

        var $info = this.$(".submit-area .alert-info");
        var hasCorrectAnswer = $info.length === 0;

        if (hasCorrectAnswer && !response.correct) {
            // a wrong answer.
            this.$(".submit-area .alert-success").hide();
            this.$(".submit-area .alert-error").show();
        } else {
            // a correct answer, or answering a question with no right or wrong.
            if (hasCorrectAnswer && response.correct) {
                this.$(".submit-area .alert-error").hide();
                this.$(".submit-area .alert-success").show();
            } else {
                // when there's an info box, we just show that and ask the user
                // to continue
                // assert(!hasCorrectAnswer)
                $info.show();
            }

            // mark the question as complete
            this.model.set({"complete": true});

            // Change the submit button to say continue
            $button.html("<i class=\"icon-play\"></i> Continue");

            var delayUntilVideoResumes;
            if (this.hasMem()) {
                // show the mem if one is present
                this.showMem();
                delayUntilVideoResumes = 6000;
            } else {
                delayUntilVideoResumes = 3000;
            }

            // auto resume the video
            _.delay(_.bind(this.fireAnswered, this), delayUntilVideoResumes);
        }
    },

    hasMem: function() {
        return this.$(".mem").length > 0;
    },

    showMem: function() {
        this.$(".mem").slideDown(350, "easeInOutCubic");
    },

    skipOnEsc: function(ev) {
        if (ev.which == 27) { // esc
            this.skip();
        }
    },

    skip: function() {
        var response = this.getResponse();
        this.validateResponse(response);
        this.log("skip", response);
        this.trigger("skipped");
    },

    log: function(kind, response) {
        var eventName = "Socrates answer " + kind;
        Analytics.trackSingleEvent(eventName, response);
        KAConsole.log("POSTing response", kind, response);
    }
}, {
    /**
     * These settings set up a qtip that is always visible and never disappears.
     * It's basically using qtip as a DSL for bubble-like html markup rather
     * than as a replacement for tooltips.
     */
    _permaQtip: {
        style: {
            classes: "qtip-light qtip-rounded qtip-shadow"
        },
        show: {
            event: false,
            ready: true
        },
        hide: false
    }
});

// TODO(dmnd): possibly merge this with Socrates.Manager
Socrates.MasterView = Backbone.View.extend({
    initialize: function(options) {
        this.views = options.views;
    },

    render: function() {
        this.$el.append(_.pluck(this.views, "el"));
    }
});

/**
 * View that displays question marks icons over the YouTube scrubber.
 * The model for this view is expected to be a Backbone.Collection of
 * Socrates.Question models.
 */
Socrates.Nav = Backbone.View.extend({
    template: Templates.get("socrates.socrates-nav"),

    events: {
        "click a.event": Socrates.potentialBookmark
    },

    initialize: function(options) {
        this.manager = options.manager;
        this._enable();
        this.manager.videoView.model
            .on("change:socratesEnabled", this._enable, this);
        this.model.on("change", this.render, this);
    },

    _questionsJson: function() {
        return this.model
            .filter(Socrates.isQuestion)
            .map(function(q) {
                var pc = q.seconds() / this.options.videoDuration * 100;
                return {
                    title: q.get("title"),
                    time: q.get("time"),
                    slug: q.slug(),
                    percentage: pc,
                    complete: q.get("complete") ? "complete" : ""
                };
            }, this);
    },

    _enable: function() {
        var enabled = this.manager.videoView.model.get("socratesEnabled");
        this.$el.css("display", enabled ? "block" : "none");
    },

    render: function() {
        this.$el.html(this.template({
            questions: this._questionsJson()
        }));
        return this;
    }
});

/**
 * Manages state of Socrates questions, including triggering questions in
 * response to the video, clicks on questions icons, or completing prior
 * questions. Also handles posting response data to the server.
 *
 * @param {VideoView} videoView View to attach questions to.
 * @param {Backbone.Collection} bookmarks Collection of Socrates.Question that
 *                                        will be displayed for this video.
 * @param {Object} options Args for controlling beep sound.
 */
Socrates.Manager = (function() {
    var fn = function(videoView, bookmarks, options) {
        options = _.defaults(options || {}, fn._defaults);
        this._initializeAudio(options);

        this.videoView = videoView;
        this.bookmarks = bookmarks;

        // initialize questions, questionViews, and subscribe to video timing

        this.questions = this.bookmarks.filter(Socrates.isQuestion);

        // wrap each question in a view
        this.questionViews = this.questions.map(function(question) {
            return new Socrates.QuestionView({model: question});
        });

        // subscribe to submit and skip
        _.each(this.questionViews, function(view) {
            view.on("skipped", this.skipped, this);
            view.on("answered", this.submitted, this);
        }, this);

        // hookup question display to video timeline
        _.each(this.questions, function(q) {
            this.videoView.atSeconds(
                q.seconds(),
                _.bind(this.videoTriggeredQuestion, this, q),
                q.slug());
        }, this);

        // TODO(dmnd): Remove all use of poppler from Socrates, go through the
        // VideoView instead
        this.poppler = this.videoView._poppler;

        // TODO(dmnd): find what to do about this editor-specific code
        // if (Socrates.ControlPanel != null && window.ControlPanel == null) {
        //     window.ControlPanel = new Socrates.ControlPanel({
        //         videoView: this.videoView
        //     });
        // }
    };

    fn._defaults = {
        beepUrl: "/sounds/72126__kizilsungur__sweetalertsound2",
        beepVolume: 0.3
    };

    _.extend(fn.prototype, {

    _initializeAudio: function(options) {
        this.beep = null;
        if (window.Audio) {
            this.beep = new Audio("");
            var mimeTypes = {
                "ogg": "audio/ogg",
                "mp3": "audio/mpeg",
                "wav": "audio/x-wav"
            };
            var ext;
            var match = _.find(mimeTypes, function(i, k) {
                if (this.beep.canPlayType(mimeTypes[k]) !== "") {
                    ext = k;
                    return true;
                }
                return false;
            }, this);
            if (match) {
                this.beep.src = options.beepUrl + "." + ext;
                this.beep.volume = options.beepVolume;
            }
        }
    },

    // received a question or view, find the corresponding view
    questionToView: function(view) {
        if (Socrates.isQuestion(view)) {
            view = _.find(this.questionViews, function(v) {
                return v.model == view;
            });
        }
        return view;
    },

    // called when video was playing and caused a question to trigger
    videoTriggeredQuestion: function(question) {
        // if questions are disabled, ignore
        if (!this.videoView.model.get("socratesEnabled")) {
            return;
        }

        // since the video triggered this question, pause it and play a beep
        this.videoView.pause();
        if (this.beep) {
            this.beep.play();
        }

        // TODO(dmnd): update the URL so the question is bookmarkable?

        // show the question
        this.enterState(question);

        return true; // blocks poppler
    },

    // called when question has been triggered manually via clicking a link
    userTriggeredQuestion: function(question) {
        // TODO(dmnd): if questions are disabled, enable them because this was
        // an explicit navigation

        // pause, then seek the video
        this.videoView.pause(_(function() {
            this.videoView.seekToAfterId(question.slug());
        }).bind(this));

        // immediately show the question
        this.enterState(question);
    },

    /**
     * Seek the video to a particular time. Usually called in response to a
     * user clicking on an "Explain again" link.
     *
     * @param  {integer} seconds The time in the video to start playing from
     */
    timestampTriggeredSeek: function(seconds) {
        this.leaveCurrentState();

        // TODO(dmnd): replace this with playFrom
        this.videoView.seekTo(seconds, _(function() {
            if (this.videoView.isPaused()) {
                this.videoView.play({silent: true});
            }
        }).bind(this));
    },

    enterState: function(view) {
        this.leaveCurrentState();

        var nextView = this.questionToView(view);
        if (nextView) {
            this.currentView = nextView;
            this.currentView.show();
        } else {
            KAConsole.log("Invalid view triggered");
        }

        return this;
    },

    leaveCurrentState: function() {
        if (this.currentView) {
            if (this.currentView.hide)
                this.currentView.hide();
            this.currentView = null;
        }
        return this;
    },

    skipped: function() {
        KAConsole.log("skipped");
        var seconds = this.currentView.model.seconds();
        var questionSlug = this.currentView.model.slug();
        this.currentView.hide();

        var triggeredAnotherEvent = this.poppler.resumeEvents();
        KAConsole.log("triggeredAnotherEvent:", triggeredAnotherEvent);
        if (!this.poppler.blocked) {
            // TODO(dmnd): bring this back via an event or something!
            // // no more events left, so resume video
            // var postQuestionSlug = questionSlug.replace(/q$/, "p");
            // this.navigate(this._getVideoFragment() + "#" + postQuestionSlug);
            this.videoView.seekToAfterId(questionSlug,
                _.bind(this.videoView.play, this.videoView, {silent: true}));
        }
    },

    submitted: function() {
        this.skipped();
    },

    /**
     * Display a question, or seek to a bookmark (a particular time in the
     * video). Usually called in response to a user clicking a link to a
     * question. The id is stored in the hash fragment. E.g:
     *
     *   <a href="#matrix-addition/q">Link</a>
     *
     *   EXAMPLE ID         -> WHAT IT DOES
     *   matrix-addition    -> start of explanation of matrix addition
     *   matrix-addition/q  -> question about matrix addition
     *   matrix-addition/p  -> resume video after question
     *   matrix-addition/t  -> start video 5s before question
     *
     * @param  {string} id  The id of the event to seek to
     * @return {boolean}    False if this was an invalid id, otherwise true
     */
    maybeNavigateTo: function(id) {
        var parts = id.split("/");
        if (parts.length > 2) {
            return false;
        }
        var modifier = parts[1];

        // if no modifier, default to question
        if (!modifier) {
            modifier = "q";
        }

        if (modifier !== "q") {
            id = id.replace(/\/\w$/, "/q");
        }

        var bookmark = this.bookmarks.find(function(b) {
            return b.slug() === id;
        });
        if (!bookmark) {
            return false;
        }

        var seconds = bookmark.seconds();
        if (Socrates.isQuestion(bookmark)) {
            if (modifier === "p") {
                // 'post-question': resume the video after the question
                this.timestampTriggeredSeek(seconds);
            } else if (modifier === "t") {
                // 'test question': play the video shortly before the question
                // is due to appear
                this.timestampTriggeredSeek(seconds - 10);
            } else if (modifier === "q") {
                // 'question'
                this.userTriggeredQuestion(bookmark);
            } else {
                throw "unknown bookmark modifier " + modifier;
            }
        } else {
            // was a bookmark
            this.timestampTriggeredSeek(seconds);
        }

        return true;
    }

    });
    return fn;
})();


/**
 * Initialize socrates questions for a particular videoView.
 *
 * Entry point for Socrates questions. Renders all question html, creates a
 * Socrates.Manager to trigger questions, and downloads question data if
 * necessary.
 *
 * @param  {VideoView} view The videoview to load questions for.
 * @return {Promise}    A promise that will be resolved when loading questions
 *                      is complete
 */
Socrates.forView = function(view, events) {
    var promises = [
        // wait for the view to be ready
        view.whenReady(),

        // also, load MathJax
        // TODO(dmnd): Only require MathJax when the question/video needs it
        Socrates.requireMathJax()
    ];

    if (!events) {
        // load the questions for this video
        var questionPkg = view.model.get("questionPackage");
        PackageManager.registerDynamic(questionPkg);
        promises.push(PackageManager.require(questionPkg.name));
    }

    return $.when.apply(null, promises).then(function() {
            if (!events) {
                var id = view.model.get("youtubeId");
                events = new Backbone.Collection(Socrates.Data[id].Events);
            }
            // create a manager to handle state transitions
            var manager = new Socrates.Manager(view, events);

            // this reference is needed by Socrates.potentialBookmark
            view.socratesManager = manager;


            // Enable and check the questions checkbox in options menu
            view.model.set({
                socratesAvailable: true,
                socratesEnabled: true
            });

            // create views

            // Youtube's getDuration returns 0 until the video starts
            // playing. The documentation claims[1] this will happen
            // "until until the video's metadata is loaded, which
            // normally happens just after the video starts playing."
            //
            // Youtube must have some private source for the duration
            // because they display it in the player chrome. We don't
            // have access to it though, so instead we must rely on the
            // server provided value for duration.
            //
            // [1]: https://developers.google.com/youtube/js_api_reference#Retrieving_video_information
            var duration = (view.model.player.getDuration() ||
                view.model.get("duration") || 0);

            var nav = new Socrates.Nav({
                el: ".socrates-nav",
                model: manager.bookmarks,
                videoDuration: duration,
                $hoverContainerEl: $(".youtube-video"),
                manager: manager
            });
            nav.render();

            var masterView = new Socrates.MasterView({
                el: ".video-overlay",
                views: manager.questionViews
            });
            masterView.render();
        }).promise();
};

Handlebars.registerPartial("submit-area", Templates.get("socrates.submit-area"));
Handlebars.registerPartial("submit-area-pre", Templates.get("socrates.submit-area-pre"));
Handlebars.registerPartial("submit-area-pre-no-answer", Templates.get("socrates.submit-area-pre-no-answer"));

/**
 * Ensure that MathJax is present and loaded.
 *
 * Adapted from khan-exercises.
 *
 * TODO(dmnd): Integrate MathJax loading with PackageManager
 *
 * @return {Promise} that resolves when MathJax is ready
 */
Socrates.requireMathJax = _.memoize(function() {
    var dfd = $.Deferred();

    var script = document.createElement("script");
    script.async = "async";

    // TODO(dmnd): Get the config parameter from a central location to make this
    // robust to updates to KAthJax
    script.src = "/khan-exercises/utils/MathJax/1.1a/MathJax.js?config=KAthJax-8a6b08f6f5c97d7c3c310cc909a7a140";

    script.onerror = function() {
        // No error in IE, but this is mostly for debugging during development
        // so it's probably okay
        // http://stackoverflow.com/questions/2027849/how-to-trigger-script-onerror-in-internet-explorer
        KAConsole.log("Error loading script " + script.src);
    };

    script.onload = script.onreadystatechange = function() {
        if (!script.readyState || (/loaded|complete/).test(script.readyState)) {
            // Handle memory leak in IE
            script.onload = script.onreadystatechange = null;

            // Remove the script
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }

            // Dereference the script
            script = void 0;

            MathJax.Hub.Queue(function() {
                dfd.resolve();
            });
        }
    };

    document.getElementsByTagName("head")[0].appendChild(script);

    return dfd.promise();
});

Socrates.kathJax = function($els) {
    $els.each(function(i, elem) {
        if (typeof elem.MathJax === "undefined") {
            var $elem = $(elem);

            // Maintain the classes from the original element
            if (elem.className) {
                $elem.wrap("<span class='" + elem.className + "'></span>");
            }

            // Trick MathJax into thinking that we're dealing with a script block
            elem.type = "math/tex";

            // Make sure that the old value isn't being displayed anymore
            elem.style.display = "none";

            // Stick the processing request onto the queue
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, elem]);
        } else {
            MathJax.Hub.Queue(["Reprocess", MathJax.Hub, elem]);
        }
    });
};

/**
 * Handlebars helper to DRY up question templates.
 */
Handlebars.registerHelper("videoframeQuestion", function(options) {
    var template = Templates.get("socrates.videoframe");
    return template(_.extend({
        questionHtml: options.fn(this),
        submitHtml: Handlebars.partials[options.hash.submitKind](this)
    }, this || {}));
});

// Skippables are currently not used by any videos.
// TODO(dmnd): Delete this if it never ends up being used by content
// Socrates.Skippable = (function() {
//     var Skippable = function(options) {
//         _.extend(this, options);
//     };

//     Skippable.prototype.seconds = function() {
//         return _.map(this.span, Socrates.Question.timeToSeconds);
//     };

//     Skippable.prototype.trigger = function() {
//         var pos = this.seconds()[1];
//         this.videoView.seekTo(pos);
//     };

//     return Skippable;
// })();

// Socrates.initSkips = function(youtubeId) {
//     window.skippable = _.map(Socrates.Data[youtubeId].Skips, function(item) {
//         return new Socrates.Skippable(_.extend(item, {videoView: window.videoViews.get(youtubeId) }));
//     });
//     _.each(skippable, function(item) {
//         poppler.add(item.seconds()[0], _.bind(item.trigger, item));
//     });
// };
