module.exports = Options;

var Dialog = require('./Dialog'),
    mix = require('../Grue/js/object/mix'),
    inherit = require('../Grue/js/OO/inherit'),
    DOMEvents = require('../Grue/js/dom/events/DOMEvents'),
    contains = require('../Grue/js/dom/contains'),

    // inline template for now
    TMPL = '<h2>Options</h2>' +
            '<label class="g_row">Starting Level: <input type="number" min="0" max="30" name="start_level" /></label>' +
            '<div class="g_row"><span>Up Arrow Turns:</span>' +
            '<label><input type="radio" name="up_turns_right" value="false" /><span>left</span></label> ' +
            '<label><input type="radio" name="up_turns_right" value="true" /><span>right</span></label>'  +
            '</div>' +
            '<label class="g_row"><input type="checkbox" value="true" name="slide_fast" /> Slide faster?</label>' +
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
    this.data  = mix(opts.data);
    this._data = mix(opts.data);
    this._handle = null;
    Dialog.call(this, opts);
}

mix({
    _init: function () {
        if (Dialog.prototype._init.apply(this, arguments))
            return;

        this.dom.className += ' options-dlg';

        function asBool (str) {return str == 'true'}

        var start  = $('[name="start_level"]', this.dom)[0],
            radios = $('[name="up_turns_right"]', this.dom),
            faster = $('[name="slide_fast"', this.dom)[0];

        for (var i = 0; i < radios.length; i++) {
            if (asBool(radios[i].value) == this.data.up_turns_right) {
                radios[i].checked = true;
                break;
            }
        }

        start.value = this.data.start_level;
        faster.checked = this.data.slide_fast;

        this._handle = DOMEvents.on(this.dom, 'click', function (e) {
            var target = e.target,
                name   = target.nodeName.toLowerCase();

            if (name == 'button') {
                if (target.name == 'save') {
                    for (var i = 0; i < radios.length; i++)
                        if (radios[i].checked)
                            this.data.up_turns_right = asBool(radios[i].value);

                    this.data.start_level = Math.min(30, +start.value);
                    this.data.slide_fast  = faster.checked;
                } else {
                    this.data = this._data;
                }

                this.hide();
            }
        }, false, this);

    },

    destroy: function () {
        DOMEvents.off(this._handle);
        delete this.data;
        Dialog.prototype.destroy.apply(this, arguments);
    }

}, Options.prototype);

// setup the prototype chain
inherit(Options, Dialog);