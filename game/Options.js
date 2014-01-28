// TODO Grue needs a generic dialog system

module.exports = Options;

var mix = require('../Grue/js/object/mix'),
    createDom = require('../Grue/js/dom/create'),
    DOMEvents = require('../Grue/js/dom/events/DOMEvents'),
    contains = require('../Grue/js/dom/contains'),

    // inline template for now
    TMPL = '<h2>Options</h2>' +
            '<label class="g_row">Starting Level: <input type="number" min="0" max="30" name="start_level" /></label>' +
            '<div class="g_row"><span>Up Arrow Turns:</span>' +
            '<label><input type="radio" name="up_turns_right" value="false" /><span>left</span></label> ' +
            '<label><input type="radio" name="up_turns_right" value="true" /><span>right</span></label>'  +
            '</div>' +
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
    this.data = opts.data;
    this._data = opts.data;
    this.destroyOnHide = !!opts.destroyOnHide;
    this._mask = createDom('div', {'class': 'dlg-mask'});
    this._dom = null;
    this._handle = null;
    this._onHide = opts.onHide;
    this._init();
}

mix({
    _init: function () {
        if (this._dom)
            return;

        this._dom = createDom('div', {'class': 'dlg options-dlg'});
        this._dom.innerHTML = TMPL;

        function asBool (str) {
            return str == 'true';
        }

        var start  = $('[name="start_level"]', this._dom)[0],
            radios = $('[name="up_turns_right"]', this._dom);

        for (var i = 0; i < radios.length; i++) {
            if (asBool(radios[i].value) == this.data.up_turns_right) {
                radios[i].checked = true;
                break;
            }
        }

        start.value = this.data.start_level;

        this._handle = DOMEvents.on(this._dom, 'click', function (e) {
            var target = e.target,
                name   = target.nodeName.toLowerCase();

            if (name == 'button') {
                if (target.name == 'save') {
                    for (var i = 0; i < radios.length; i++)
                        if (radios[i].checked)
                            this.data.up_turns_right = asBool(radios[i].value);

                    this.data.start_level = Math.min(30, +start.value);
                } else {
                    this.data = this._data;
                }

                this.hide();
            }
        }, false, this);

    },

    show: function () {
        document.body.appendChild(this._mask);
        document.body.appendChild(this._dom);
    },

    hide: function () {
        this._dom.parentNode.removeChild(this._dom);
        this._mask.parentNode.removeChild(this._mask);
        this._onHide && this._onHide(this.data);

        if (this.destroyOnHide)
            this.destroy();
    },

    destroy: function () {
        DOMEvents.off(this._handle);
        this._dom  = null;
        this._mask = null;
        delete this.data;
    }

}, Options.prototype);

// inherit(Options, Grue);