var wordcloud = wordcloud || {};

//Utility class
wordcloud.util = {
    /**
     * Invoke Ajax Calls
     * @method ajaxHelper
     * @param {String} url data end point
     * @param {Object} data params as needed
     * @param {object} header header data infromation
     * @return {object} ajax object
     */
    ajaxHelper: function(url, data, headerData) {
        return $.ajax({
                url: url,
                // type: 'POST',
                dataType: 'json',
                data: data,
                headers: headerData,
                timeout: 300000000,
                statusCode: {
                    404: function() {
                        wordcloud.util.hideSpinner();
                    }
                },
                beforeSend: function(jqXHR, settings) {
                    wordcloud.util.showSpinner();
                }
            })
            .fail(function(xhr, textStatus) {
                wordcloud.util.hideSpinner();
            })
    },
    /**
     * Show spinner: the below html object can contain any spinner as needed
     */
    showSpinner: function() {
        $("#animated-loader").show();
    },
    /**
     * Hide spinner
     */
    hideSpinner: function() {
        $("#animated-loader").hide();
    }
};

// From Jonathan Feinberg's cue.language, see lib/cue.language/license.txt.
var stopWords = /^(i|me|my|myself|we|us|our|ours|ourselves|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|what|which|who|whom|whose|this|that|these|those|am|is|are|was|were|be|been|being|have|has|had|having|do|does|did|doing|will|would|should|can|could|ought|i'm|you're|he's|she's|it's|we're|they're|i've|you've|we've|they've|i'd|you'd|he'd|she'd|we'd|they'd|i'll|you'll|he'll|she'll|we'll|they'll|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|doesn't|don't|didn't|won't|wouldn't|shan't|shouldn't|can't|cannot|couldn't|mustn't|let's|that's|who's|what's|here's|there's|when's|where's|why's|how's|a|an|the|and|but|if|or|because|as|until|while|of|at|by|for|with|about|against|between|into|through|during|before|after|above|below|to|from|up|upon|down|in|out|on|off|over|under|again|further|then|once|here|there|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|say|says|said|capital|one|CapitalOne|CapitalOne|shall)$/,
    // punctuation = new RegExp("[" + unicodePunctuationRe + "]", "g"),
    wordSeparators = /[ \f\n\r\t\v\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\u3031-\u3035\u309b\u309c\u30a0\u30fc\uff70]+/g,
    discard = /^(@|https?:|\/\/|,|CapitalOne|Capital|one|Express|Chase|Amex|Discover|Morgan|JPMorgan|PNCBankHelp|pncbank|AmericanExpress|American)/,
    htmlTags = /(<[^>]*?>|<script.*?<\/script>|<style.*?<\/style>|<head.*?><\/head>)/g,
    matchTwitter = /^https?:\/\/([^\.]*\.)?twitter\.com/;

//application core
wordcloud.app = {
    /**
     * List of static variables like end points for Word Cloud Data
     * @property vars
     * @type Object
     * @param {array} words length of word
     * @param {number} totalWords total number of words on the screen
     * @param {number} w width of SVG container
     * @param {number} h height of SVG container
     * @param {string} wordcloudapi Word Cloud End Point
     * @param color range for words
     * @param font size range for words
     */
    vars: {
        words: [],
        max: '',
        scale: 1,
        complete: 0,
        tags: '',
        maxLength: 50,
        fetcher: '',
        totalWords: 100, //Can be increased as required but also needs a larger canvas/svg size
        scaleType: "sqrt", //linear, log,
        w: 980, //increase svg size to view more words
        h: 700,
        fill: d3.scale.category20(),
        fontSize:[30, 100],
        wordcloudapi: 'data/wordcloudtext.json'
    },
    /**
     * Initialization of Word cloud and needs to be called on DOM Load
     * @method init
     */
    init: function() {
        wordcloud.app.vars.layout = d3.layout.cloud()
            .timeInterval(1000)
            .size([wordcloud.app.vars.w, wordcloud.app.vars.h])
            .fontSize(function(d) {
                return fontSize(+d.value);
            })
            .text(function(d) {
                return d.key;
            })
            .on("end", wordcloud.app.draw);

        $('#vis').empty();
        wordcloud.app.vars.svg = d3.select("#vis").append("svg")
            .attr("width", wordcloud.app.vars.w)
            .attr("height", wordcloud.app.vars.h);

        wordcloud.app.vars.background = wordcloud.app.vars.svg.append("g"),
            vis = wordcloud.app.vars.svg.append("g")
            .attr("transform", "translate(" + [wordcloud.app.vars.w >> 1, wordcloud.app.vars.h >> 1] + ")");

        wordcloud.app.drawWords();
    },
    /*
    Get data for Wordcloud from the endpoint and load the words
     */
    drawWords: function() {
        wordcloud.util.ajaxHelper(wordcloud.app.vars.wordcloudapi)
            .done(function(data) {
                wordcloud.util.hideSpinner();
                $("vis").empty();
                $('#vis').show();
                var words = data.content.join();
                wordcloud.util.showSpinner();
                wordcloud.app.load(words);
        })
    },
    flatten: function(o, k) {
        if (typeof o === "string") return o;
        var text = [];
        for (k in o) {
            var v = flatten(o[k], k);
            if (v) text.push(v);
        }
        return text.join(" ");
    },
    /*
    Parse the words from the word cloud and check for:
    1. Discarded words
    2. Stop words
    in accordance with the stop words variable
     */
    parseText: function(text) {
        wordcloud.app.vars.tags = {};
        var cases = {};
        text.split(wordSeparators).forEach(function(word) {
            if (discard.test(word)) return;
            if (stopWords.test(word.toLowerCase())) return;
            word = word.substr(0, wordcloud.app.vars.maxLength);
            cases[word.toLowerCase()] = word;
            wordcloud.app.vars.tags[word = word.toLowerCase()] = (wordcloud.app.vars.tags[word] || 0) + 1;
        });
        wordcloud.app.vars.tags = d3.entries(wordcloud.app.vars.tags).sort(function(a, b) {
            return b.value - a.value;
        });
        wordcloud.app.vars.tags.forEach(function(d) {
            d.key = cases[d.key];
        });
        wordcloud.app.generate();
    },
    generate: function() {
        wordcloud.app.vars.layout
            .font("impact")
            .spiral("archimedean");
        fontSize = d3.scale[wordcloud.app.vars.scaleType]().range(wordcloud.app.vars.fontSize);
        if (wordcloud.app.vars.tags.length) fontSize.domain([+wordcloud.app.vars.tags[wordcloud.app.vars.tags.length - 1].value || 1, +wordcloud.app.vars.tags[0].value]);
        wordcloud.app.vars.complete = 0;
        words = [];
        wordcloud.app.vars.layout.stop().words(wordcloud.app.vars.tags.slice(0, wordcloud.app.vars.max = Math.min(wordcloud.app.vars.tags.length, +wordcloud.app.vars.totalWords))).start();

    },
    draw: function(data, bounds) {
        w = wordcloud.app.vars.w;
        h = wordcloud.app.vars.h;
        wordcloud.app.vars.scale = bounds ? Math.min(
            w / Math.abs(bounds[1].x - w / 2),
            w / Math.abs(bounds[0].x - w / 2),
            h / Math.abs(bounds[1].y - h / 2),
            h / Math.abs(bounds[0].y - h / 2)) / 2 : 1;
        words = data;
        var text = vis.selectAll("text")
            .data(words, function(d) {
                return d.text.toLowerCase();
            });
        text.transition()
            .duration(1000)
            .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .style("font-size", function(d) {
                return d.size + "px";
            });
        text.enter().append("text")
            .attr("text-anchor", "middle")
            .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .style("font-size", "1px")
            .transition()
            .duration(1000)
            .style("font-size", function(d) {
                return d.size + "px";
            });
        text.style("font-family", function(d) {
                return d.font;
            })
            .style("fill", function(d) {
                return wordcloud.app.vars.fill(d.text.toLowerCase());
            })
            .attr("class", function(d) {
                return "text";
            })
            .text(function(d) {
                return d.text;
            });
        var exitGroup = wordcloud.app.vars.background.append("g")
            .attr("transform", vis.attr("transform"));
        var exitGroupNode = exitGroup.node();
        text.exit().each(function() {
            exitGroupNode.appendChild(this);
        });
        exitGroup.transition()
            .duration(1000)
            .style("opacity", 1e-6)
            .remove();
        vis.transition()
            .delay(1000)
            .duration(750)
            .attr("transform", "translate(" + [w >> 1, h >> 1] + ")scale(" + wordcloud.app.vars.scale + ")");
        wordcloud.util.hideSpinner();
    },
    load: function(f) {
        fetcher = f;
        if (fetcher != null) d3.select("#text").property("value", fetcher);
        wordcloud.app.parseText(fetcher);
    }
};

//Inititalize Word Cloud
$(document).ready(function($) {
    wordcloud.app.init();
});