module.exports = Options;

var Dialog = require('./Dialog'),
    mix = require('../Grue/js/object/mix'),
    inherit = require('../Grue/js/OO/inherit'),
    DOMEvents = require('../Grue/js/dom/events/DOMEvents'),
    addClass  = require('../Grue/js/dom/addClass'),
    removeClass  = require('../Grue/js/dom/removeClass'),
    contains = require('../Grue/js/dom/contains'),
 
    // inline template  for now
    TMPL = '<h2>Options</h2>' +
            '${message}' +
            '<div class="g_row">' +
                '<label>Starting Level: <input type="number" min="0" max="30" name="start_level" style="width:50px" /></label>' +
                ' <label>Max Level: <input type="number" title="-1 for unlimited. The rate of descent increases with the level." name="max_level" step="1" style="width:50px" /></label>' +
            '</div>' +
            '<div class="g_row"><span>Up Arrow Turns:</span>' +
            '<label><input type="radio" name="up_turns_right" value="false" /><span>left</span></label> ' +
            '<label><input type="radio" name="up_turns_right" value="true" /><span>right</span></label>'  +
            '</div>' + 
            '<div><label><input type="checkbox" name="slide_fast" /> Slide faster?</label></div>' +
            '<div><label><input type="checkbox" name="crazy_piece" /> Use crazy piece?</label></div>' +
            '<div><label><input type="checkbox" name="key_entropy" /> Use key press as entropy source?</label></div>' +
            '<div><label><input type="checkbox" name="random_generator" /> Use "<a href="http://tetrisconcept.net/wiki/Random_Generator" target="_blank">The Random Generator</a>"?</label> <label class="bag-size hidden"> Bag Size: <input type="number" name="bag_size" min="7" max="63" value="7" step="7" /></div>' +
            '<div class="g_row btns-right"><button type="button" class="btn btn-small cancel-btn" name="cancel">Cancel</button> <button type="button" class="btn btn-small save-btn" name="save">Save</button>',

    $ = function (selector, root) {
        var sel = (root || document).querySelectorAll(selector),
            ret;

        if (root) {
            ret = [];
            for (var i = 0, l = sel.length; i < l; i++)
                if (contains(root, sel[i]))
                    ret.push(sel[i]);
            return ret;
        }

        return [].slice.apply(sel, 0);
    };

function Options (opts) {
    opts && (opts.content = TMPL) || (opts = {content: TMPL});
    if (opts.message)
        opts.content = opts.content.replace(/\$\{message\}/, '<div style="border:1px solid #FAFAFA;background:#FFA;padding:5px;font-weight:bold;margin:-1em 0 1em 0">' + opts.message + '</div>');
    else
        opts.content = opts.content.replace(/\$\{message\}/, '');
    this.data  = mix(opts.data);
    this._data = mix(opts.data);
    this._handles = [];
    Dialog.call(this, opts);
}

mix({
    _init: function () {
        if (Dialog.prototype._init.apply(this, arguments))
            return;

        this.dom.className += ' options-dlg';

        function asBool (str) {return str == 'true'}

        var start    = $('[name="start_level"]', this.dom)[0],
            radios   = $('[name="up_turns_right"]', this.dom),
            faster   = $('[name="slide_fast"]', this.dom)[0],
            crazy    = $('[name="crazy_piece"]', this.dom)[0],
            entropy  = $('[name="key_entropy"]', this.dom)[0],
            rGen     = $('[name="random_generator"]', this.dom)[0],
            bagWrap  = $('.bag-size', this.dom)[0],
            bagSize  = $('[name="bag_size"]', bagWrap)[0],
            maxLevel = $('[name="max_level"]', this.dom)[0];

        for (var i = 0; i < radios.length; i++) {
            if (asBool(radios[i].value) == this.data.up_turns_right) {
                radios[i].checked = true;
                break;
            }
        }

        start.value = this.data.start_level;
        faster.checked = this.data.slide_fast;
        crazy.checked = this.data.use_crazy_piece;
        entropy.checked = this.data.use_keyboard_entropy;
        bagSize.value = this.data.bag_size;
        rGen.checked = this.data.use_the_random_generator;
        maxLevel.value = this.data.max_level || -1;

        this.data.use_the_random_generator && removeClass(bagWrap, 'hidden');

        this._handles.push(DOMEvents.on(rGen, 'change', function () {
            if (rGen.checked)
                removeClass(bagWrap, 'hidden');
            else
                addClass(bagWrap, 'hidden');
        }));

        this._handles.push(DOMEvents.on(this.dom, 'click', function (e) {
            var target = e.target,
                name   = target.nodeName.toLowerCase();

            if (name == 'button') {
                if (target.name == 'save') {
                    for (var i = 0; i < radios.length; i++)
                        if (radios[i].checked)
                            this.data.up_turns_right = asBool(radios[i].value);

                    this.data.start_level = Math.min(30, +start.value);
                    this.data.slide_fast  = faster.checked;
                    this.data.use_crazy_piece = crazy.checked;
                    this.data.use_the_random_generator = rGen.checked;
                    this.data.bag_size = +bagSize.value;
                    this.data.use_keyboard_entropy = entropy.checked;
                    this.data.max_level = +maxLevel.value;
                } else {
                    this.data = this._data;
                }

                this.hide();
            }
        }, false, this));

    },

    destroy: function () {
        for (var i = 0; i < this._handles.length; i++)
            DOMEvents.off(this._handles[i]);

        delete this.data;
        Dialog.prototype.destroy.apply(this, arguments);
    }

}, Options.prototype);

// setup the prototype chain
inherit(Options, Dialog);