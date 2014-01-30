// TODO Grue needs a generic dialog system

module.exports = Dialog;

var mix = require('../Grue/js/object/mix'),
    createDom = require('../Grue/js/dom/create'),
    docEl = document.documentElement,
    win   = window;

function Dialog (opts) {
    this.dom = null;
    this.destroyOnHide = !!opts && !!opts.destroyOnHide;
    this._mask = createDom('div', {'class': 'dlg-mask'});
    this._onHide = !!opts && opts.onHide || null;
    this._init(opts.content);
    this._isVisible = false;
}

mix({
    _init: function (content) {
        if (this.dom)
            return true;

        this.dom = createDom('div', {'class': 'dlg', 'tabindex': '-1'});

        if (typeof content == 'string')
            this.dom.innerHTML = content;
        else if (content != null && typeof content.nodeType == 'number')
            this.dom.appendChild(content);
        else
            throw TypeError('Was expecting a string or DOMNode but saw ' + content + ' instead');
    },

    show: function () {
        var h1 = ((h = docEl.clientHeight) < window.innerHeight ? window.innerHeight : h), 
            h2 = docEl.scrollHeight + docEl.scrollTop;
        //     w = ((w = docEl.clientWidth) < window.innerWidth ? window.innerWidth : w);

        this._mask.style.height = Math.max(h1, h2) + 'px';

        document.body.style.overflow = 'hidden';

        document.body.appendChild(this._mask);
        document.body.appendChild(this.dom);
        this.dom.focus();
        this._isVisible = true;
    },

    hide: function () {
        this._isVisible = false;
        this.dom.blur();
        this.dom.parentNode.removeChild(this.dom);
        this._mask.parentNode.removeChild(this._mask);
        this._onHide && this._onHide(this.data);
        document.body.style.overflow = 'inherit';
        if (this.destroyOnHide)
            this.destroy();
    },

    destroy: function () {
        this._isVisible && this.hide();
        delete this.dom;
        delete this._mask;
    }

}, Dialog.prototype);
