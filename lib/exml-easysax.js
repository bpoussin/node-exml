var EasySAXParser = require('easysax');

function _newFrame() {
    return { handlers: {}, /*textContent: '', cdataContent: '',*/ content: '' };
}

function Parser() {
    this._eventStack = ['$root'];
    this._frameStack = [_newFrame()];
    this._availableHandlers = {}; // just to know if handler can be available or not (globaly)

    this._stream = this.saxParser = new EasySAXParser();
    this._stream.on('startNode', this._handleOpenTag.bind(this));
    this._stream.on('textNode', this._handleText.bind(this));
    this._stream.on('cdata', this._handleCDATA.bind(this));
    this._stream.on('endNode', this._handleCloseTag.bind(this));
}

Parser.prototype.on = function() {
    var events = Array.prototype.slice.call(arguments, 0, -1);
    var callback = arguments[arguments.length-1];
    var fullEvent = this._fullEvent(events);
    this._currentFrame().handlers[fullEvent] = callback;
    this._availableHandlers[fullEvent] = true;
};

Parser.prototype.write = function(data) {
    this._stream.parse(data);
};

Parser.prototype.end = function(data) {
    return this._stream.close(data);
};

Parser.prototype._handleOpenTag = function(name, attributes) {
    this._eventStack.push(this._eventStack[this._eventStack.length-1] + "/" + name);

    var handler = this._getHandler();
    this._frameStack.push(_newFrame());

    var result;
    if (handler) {
        result = handler(attributes());
    }

    return result;
};

Parser.prototype._handleCloseTag = function() {
    var result;

    var handler = this._getHandler('$content');
    if (handler) {
        result = handler(this._currentFrame().content);
    }
    this._frameStack.pop();
    this._eventStack.pop();

    return result;
};

Parser.prototype._handleText = function(text, unEntities) {
    var result;
    text = unEntities(text);

    var handler = this._getHandler('$text');
    if (handler) {
        result = handler(text);
    }

    var currentFrame = this._currentFrame();
    currentFrame.content += text;

    return result;
};

Parser.prototype._handleCDATA = function(cdata) {
    var result;

    var handler = this._getHandler('$cdata');
    if (handler) {
        result = handler(cdata);
    }

    var currentFrame = this._currentFrame();
    currentFrame.content += cdata;

    return result;
};

Parser.prototype._currentFrame = function() {
    return this._frameStack[this._frameStack.length-1];
};

Parser.prototype._fullEvent = function(events) {
    var result = this._eventStack[this._eventStack.length-1];
    if (events) {
        if (typeof events === 'string') {
            result += '/' + events;
        } else {
            result += '/' + events.join('/');
        }
    }
    return result;
};

Parser.prototype._getHandler = function(event) {
    var fullEvent = this._fullEvent(event),
        handler;

    if (this._availableHandlers[fullEvent]) {
        for (var i=this._frameStack.length-1; i>=0 && !handler; i--) {
            handler = this._frameStack[i].handlers[fullEvent];
        }
    }

    return handler;
};

module.exports.Parser = Parser;

module.exports.assign = function(obj, propertyName) {
    return function(content) {
        obj[propertyName] = content;
    };
};
