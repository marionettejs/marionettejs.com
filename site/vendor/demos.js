// site/vendor/marionette.js
var getObjectTag = Function.call.bind(Object.prototype.toString);
function isString(value) {
  return getObjectTag(value) === "[object String]";
}
function setProperty(target, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true
    });
  } else {
    target[key] = value;
  }
}
function extendRuntime(protoProps, staticProps) {
  const parent = this;
  let child;
  if (protoProps && Object.hasOwn(protoProps, "constructor")) {
    child = protoProps.constructor;
  } else {
    child = function() {
      return parent.apply(this, arguments);
    };
  }
  for (const key in parent) {
    setProperty(child, key, parent[key]);
  }
  Object.defineProperties(child, Object.getOwnPropertyDescriptors({
    ...staticProps
  }));
  child.prototype = Object.create(parent.prototype, Object.getOwnPropertyDescriptors({
    ...protoProps,
    constructor: child
  }));
  child.__super__ = parent.prototype;
  return child;
}
var extend = extendRuntime;
var version = "5.0.0-beta.2";
var packageJson = {
  version
};
var errorProps = ["code", "description", "fileName", "lineNumber", "name", "message", "number", "url"];
var MarionetteError = extend.call(Error, {
  urlRoot: `http://marionettejs.com/docs/v${packageJson.version}/`,
  url: "",
  constructor: function(options) {
    const error = Error.call(this, options.message);
    const nativeProperties = {};
    const optionProperties = {};
    for (const property of errorProps) {
      const value = error[property];
      if (property in error) {
        nativeProperties[property] = value;
      }
    }
    const optionSource = Object(options);
    for (const property of errorProps) {
      const value = optionSource[property];
      if (property in optionSource) {
        optionProperties[property] = value;
      }
    }
    if (this !== void 0 && this !== null) {
      Object.assign(this, nativeProperties, optionProperties);
    }
    this.captureStackTrace(error);
    this.url = this.urlRoot + this.url;
  },
  captureStackTrace(fallbackError) {
    if (typeof Error.captureStackTrace !== "function") {
      this.stack = fallbackError.stack;
      return;
    }
    Error.captureStackTrace(this, MarionetteError);
  },
  toString() {
    return `${this.name}: ${this.message} See: ${this.url}`;
  }
});
function getValue(object, property, fallback) {
  const value = object == null ? void 0 : object[property];
  const resolvedValue = value === void 0 ? fallback : value;
  return typeof resolvedValue === "function" ? resolvedValue.call(object) : resolvedValue;
}
function getOption(optionName) {
  if (!optionName) {
    return;
  }
  const context = this;
  if (context.options && context.options[optionName] !== void 0) {
    return context.options[optionName];
  } else {
    return context[optionName];
  }
}
var propertyIsEnumerable$1 = Object.prototype.propertyIsEnumerable;
function mergeOptions(options, keys) {
  if (options == null) {
    return;
  }
  const optionKeys = keys;
  const length = optionKeys.length;
  for (let index = 0; index < length; index++) {
    const key = optionKeys[index];
    if (typeof key !== "string" || !propertyIsEnumerable$1.call(options, key)) {
      continue;
    }
    const option = options[key];
    if (option !== void 0) {
      setProperty(this, key, option);
    }
  }
}
var resolveMethod = function(context, method, name) {
  if (typeof method === "function") {
    return method;
  }
  const methodName = method;
  const resolvedMethod = isString(methodName) ? context[methodName] : void 0;
  if (typeof resolvedMethod !== "function") {
    const methodLabel = typeof methodName === "string" ? methodName : "<invalid>";
    throw new MarionetteError({
      code: "MN0019",
      message: `The handler "${methodLabel}" for "${name}" must resolve to a function.`
    });
  }
  return resolvedMethod;
};
function normalizeMethods(hash) {
  if (!hash) {
    return;
  }
  const normalizedHash = {};
  for (const name of Object.keys(hash)) {
    setProperty(normalizedHash, name, resolveMethod(this, hash[name], name));
  }
  return normalizedHash;
}
var splitter = /(^|:)(\w)/gi;
var methodCache = /* @__PURE__ */ Object.create(null);
function getEventName(match, prefix, eventName) {
  return eventName.toUpperCase();
}
var getOnMethodName = function(event) {
  if (!methodCache[event]) {
    methodCache[event] = "on" + event.replace(splitter, getEventName);
  }
  return methodCache[event];
};
function triggerMethod(event, ...args) {
  const methodName = getOnMethodName(event);
  const method = getOption.call(this, methodName);
  let result;
  if (typeof method === "function") {
    result = method.apply(this, args);
  }
  this.trigger.apply(this, arguments);
  return result;
}
var propertyIsEnumerable = Object.prototype.propertyIsEnumerable;
function normalizeBindings(context, bindings) {
  if (propertyIsEnumerable.call(bindings, "__proto__")) {
    throw new MarionetteError({
      code: "MN0026",
      message: 'Entity event maps cannot include an own "__proto__" event name.',
      url: "common.html#bindevents"
    });
  }
  return normalizeMethods.call(context, bindings);
}
function bindEvents(entity, bindings) {
  if (!entity || !bindings) {
    return this;
  }
  this.listenTo(entity, normalizeBindings(this, bindings));
  return this;
}
function unbindEvents(entity, bindings) {
  if (!entity) {
    return this;
  }
  if (!bindings) {
    this.stopListening(entity);
    return this;
  }
  this.stopListening(entity, normalizeBindings(this, bindings));
  return this;
}
function bindRequests(channel, bindings) {
  if (!channel || !bindings) {
    return this;
  }
  channel.reply(normalizeMethods.call(this, bindings), this);
  return this;
}
function unbindRequests(channel, bindings) {
  if (!channel) {
    return this;
  }
  if (!bindings) {
    channel.stopReplying(null, null, this);
    return this;
  }
  channel.stopReplying(normalizeMethods.call(this, bindings), this);
  return this;
}
var eventSplitter = /\s+/;
function buildEventArgs(name, callback, context, listener) {
  if (name && typeof name === "object") {
    const eventContext = context === void 0 ? callback : context;
    const eventArgs = [];
    const names = Object.keys(name);
    for (let i = 0; i < names.length; i++) {
      const key = names[i];
      const args = buildEventArgs(key, name[key], eventContext, listener);
      for (let j = 0; j < args.length; j++) {
        eventArgs.push(args[j]);
      }
    }
    return eventArgs;
  }
  if (name && eventSplitter.test(name)) {
    const names = name.split(eventSplitter);
    const eventArgs = [];
    for (let i = 0; i < names.length; i++) {
      eventArgs.push({
        name: names[i],
        callback,
        context,
        listener
      });
    }
    return eventArgs;
  }
  return [{
    name,
    callback,
    context,
    listener
  }];
}
function callHandler(callback, context, args = []) {
  switch (args.length) {
    case 0:
      return callback.call(context);
    case 1:
      return callback.call(context, args[0]);
    case 2:
      return callback.call(context, args[0], args[1]);
    case 3:
      return callback.call(context, args[0], args[1], args[2]);
    default:
      return callback.apply(context, args);
  }
}
function onceWrap(callback, offCallback) {
  let called = false;
  let result;
  function onceCallback() {
    if (called) {
      return result;
    }
    called = true;
    offCallback(onceCallback);
    result = callback.apply(this, arguments);
    return result;
  }
  onceCallback._callback = callback;
  return onceCallback;
}
var idCounter = 0;
function uniqueId(prefix) {
  const id = `${++idCounter}`;
  return prefix ? prefix + id : id;
}
var objectKeys = Object.keys;
var listening;
function getKeys(object) {
  return object == null ? [] : objectKeys(object);
}
var onApi = function({
  events,
  name,
  callback,
  context,
  ctx,
  listener
}) {
  let handlers = Object.hasOwn(events, name) ? events[name] : void 0;
  if (!handlers) {
    handlers = [];
    setProperty(events, name, handlers);
  }
  handlers.push({
    callback,
    context,
    ctx: context || ctx,
    listener
  });
  return events;
};
var onReducer = function(events, {
  name,
  callback,
  context
}) {
  if (!callback) {
    return events;
  }
  const listener = listening;
  events = onApi({
    events,
    name,
    callback,
    context,
    ctx: this,
    listener
  });
  if (listener) {
    const listeners = this._rdListeners || (this._rdListeners = {});
    listeners[listener.listenerId] = listener;
    listener.count++;
    listener.interop = false;
  }
  return events;
};
var cleanupListener = function({
  obj,
  listeneeId,
  listenerId,
  listeningTo
}) {
  delete listeningTo[listeneeId];
  if (obj._rdListeners) {
    delete obj._rdListeners[listenerId];
  }
};
var offReducer = function(events, {
  name,
  callback,
  context
}) {
  const names = name ? [name] : getKeys(events);
  for (let nameIndex = 0, namesLength = names.length; nameIndex < namesLength; nameIndex++) {
    const key = names[nameIndex];
    const handlers = Object.hasOwn(events, key) ? events[key] : void 0;
    if (!handlers) {
      continue;
    }
    const remaining = [];
    for (let index = 0, length = handlers.length; index < length; index++) {
      const handler = handlers[index];
      if (callback && callback !== handler.callback && callback !== handler.callback._callback || context && context !== handler.context) {
        remaining.push(handler);
        continue;
      }
      if (handler.listener) {
        const listener = handler.listener;
        listener.count--;
        if (!listener.count) {
          cleanupListener(listener);
        }
      }
    }
    events[key] = remaining;
    if (!events[key].length) {
      delete events[key];
    }
  }
  return events;
};
var getListener = function(obj, listenerObj) {
  const listeneeId = obj._rdListenId || (obj._rdListenId = uniqueId("l"));
  const listeningTo = listenerObj._rdListeningTo || (listenerObj._rdListeningTo = {});
  const listener = listeningTo[listeneeId];
  if (!listener) {
    const listenerId = listenerObj._rdListenId || (listenerObj._rdListenId = uniqueId("l"));
    listeningTo[listeneeId] = {
      obj,
      listeneeId,
      listenerId,
      listeningTo,
      count: 0,
      interop: true,
      _rdEvents: {}
    };
    return listeningTo[listeneeId];
  }
  return listener;
};
var listenToApi = function({
  name,
  callback,
  context,
  listener
}) {
  if (!callback) {
    return;
  }
  const previousListening = listening;
  listening = listener;
  try {
    listener.obj.on(name, callback, context);
  } finally {
    listening = previousListening;
  }
  if (listener.interop) {
    listener._rdEvents = onApi({
      events: listener._rdEvents,
      name,
      callback,
      context,
      ctx: context
    });
  }
};
function buildOnceMap(eventArgs, offCallback) {
  const events = {};
  for (let index = 0, length = eventArgs.length; index < length; index++) {
    const {
      name,
      callback
    } = eventArgs[index];
    if (!callback) {
      continue;
    }
    const onceCallback = onceWrap(callback, (callbackToRemove) => {
      offCallback(name, callbackToRemove);
    });
    setProperty(events, name, onceCallback);
  }
  return events;
}
var triggerApi = function({
  events,
  name,
  args
}) {
  const objEvents = Object.hasOwn(events, name) ? events[name] : void 0;
  const registeredAllEvents = Object.hasOwn(events, "all") ? events.all : void 0;
  const allEvents = objEvents && registeredAllEvents ? registeredAllEvents.slice() : registeredAllEvents;
  if (objEvents) {
    triggerEvents(objEvents, args);
  }
  if (allEvents) {
    triggerEvents(allEvents, [name].concat(args));
  }
};
var triggerEvents = function(events, args) {
  for (let index = 0, length = events.length; index < length; index++) {
    const {
      callback,
      ctx
    } = events[index];
    callHandler(callback, ctx, args);
  }
};
function reduceEventArgs(context, eventArgs, events, reducer) {
  for (let index = 0, length = eventArgs.length; index < length; index++) {
    events = reducer.call(context, events, eventArgs[index]);
  }
  return events;
}
var Events = {
  on(name, callback, context) {
    const eventArgs = buildEventArgs(name, callback, context);
    this._rdEvents = reduceEventArgs(this, eventArgs, this._rdEvents || {}, onReducer);
    return this;
  },
  off(name, callback, context) {
    if (!this._rdEvents) {
      return this;
    }
    if (!name && !context && !callback) {
      this._rdEvents = void 0;
      const listeners = this._rdListeners;
      const listenerIds = getKeys(listeners);
      for (let index = 0, length = listenerIds.length; index < length; index++) {
        const listenerId = listenerIds[index];
        cleanupListener(listeners[listenerId]);
      }
      return this;
    }
    const eventArgs = buildEventArgs(name, callback, context);
    this._rdEvents = reduceEventArgs(void 0, eventArgs, this._rdEvents, offReducer);
    return this;
  },
  once(name, callback, context) {
    const eventArgs = buildEventArgs(name, callback, context);
    const events = buildOnceMap(eventArgs, this.off.bind(this));
    if (typeof name === "string" && context == null) {
      callback = void 0;
    }
    return this.on(events, callback, context);
  },
  listenTo(obj, name, callback) {
    if (!obj) {
      return this;
    }
    const listener = getListener(obj, this);
    const eventArgs = buildEventArgs(name, callback, this, listener);
    for (let index = 0, length = eventArgs.length; index < length; index++) {
      listenToApi(eventArgs[index]);
    }
    return this;
  },
  listenToOnce(obj, name, callback) {
    const eventArgs = buildEventArgs(name, callback, this);
    const events = buildOnceMap(eventArgs, this.stopListening.bind(this, obj));
    return this.listenTo(obj, events);
  },
  stopListening(obj, name, callback) {
    const listeningTo = this._rdListeningTo;
    if (!listeningTo) {
      return this;
    }
    const eventArgs = buildEventArgs(name, callback, this);
    const listenerIds = obj ? [obj._rdListenId] : getKeys(listeningTo);
    for (let i = 0, listenerIdsLength = listenerIds.length; i < listenerIdsLength; i++) {
      const listener = listeningTo[listenerIds[i]];
      if (!listener) {
        break;
      }
      for (let index = 0, length = eventArgs.length; index < length; index++) {
        const args = eventArgs[index];
        listener.obj.off(args.name, args.callback, this);
        if (listener.interop) {
          listener._rdEvents = offReducer(listener._rdEvents, args);
          if (!getKeys(listener._rdEvents).length) {
            cleanupListener(listener);
          }
        }
      }
    }
    return this;
  },
  trigger(name, ...args) {
    const events = this._rdEvents;
    if (!events) {
      return this;
    }
    if (name && typeof name === "object") {
      const names = getKeys(name);
      for (let index = 0, length = names.length; index < length; index++) {
        const key = names[index];
        triggerApi({
          events,
          name: key,
          args: [name[key]]
        });
      }
      return this;
    }
    if (name && eventSplitter.test(name)) {
      const names = name.split(eventSplitter);
      for (let index = 0, length = names.length; index < length; index++) {
        const n = names[index];
        triggerApi({
          events,
          name: n,
          args
        });
      }
      return this;
    }
    triggerApi({
      events,
      name,
      args
    });
    return this;
  },
  triggerMethod
};
function createDebug() {
  let shouldDebug = false;
  const hooks = {
    debugLog: warn,
    log: logActivity
  };
  function setDebug(setShouldDebug = true) {
    shouldDebug = setShouldDebug;
  }
  function debugLog2(warning, eventName, channelName) {
    if (shouldDebug) {
      hooks.debugLog(warning, eventName, channelName);
    }
  }
  function log2(channelName, eventName, ...args) {
    hooks.log(channelName, eventName, ...args);
  }
  return {
    hooks,
    setDebug,
    debugLog: debugLog2,
    log: log2
  };
}
function warn(warning, eventName, channelName) {
  console.warn(warning + (channelName ? ` on the ${channelName} channel` : "") + `: "${eventName}"`);
}
function logActivity(channelName, eventName, ...args) {
  console.log(`[${channelName}] "${eventName}"`, args);
}
var defaultDebug = createDebug();
var {
  debugLog,
  log
} = defaultDebug;
var objectKeys2 = Object.keys;
function makeCallback(callback) {
  if (typeof callback === "function") {
    return callback;
  }
  const result = function() {
    return callback;
  };
  result._callback = callback;
  return result;
}
function getDebugLog(channel) {
  return channel._debugLog || debugLog;
}
function getKeys2(object) {
  const type = typeof object;
  return object != null && (type === "object" || type === "function") ? objectKeys2(object) : [];
}
var registerReply = function(requests, name, callback, context) {
  if (Object.hasOwn(requests, name)) {
    getDebugLog(this)("A request was overwritten", name, this.channelName);
  }
  setProperty(requests, name, {
    callback: makeCallback(callback),
    context: context || this
  });
  return requests;
};
var stopReducer = function(requests, {
  name,
  callback,
  context
}) {
  const names = name ? [name] : getKeys2(requests);
  for (let index = 0, length = names.length; index < length; index++) {
    const key = names[index];
    const handler = Object.hasOwn(requests, key) ? requests[key] : void 0;
    if (!handler || callback && callback !== handler.callback && callback !== handler.callback._callback || context && context !== handler.context) {
      continue;
    }
    delete requests[key];
  }
  return requests;
};
function dispatchOverload(receiver, method, name, callback, context) {
  if (name && typeof name === "object") {
    const names = getKeys2(name);
    const mapContext = context || callback;
    for (let index = 0, length = names.length; index < length; index++) {
      const key = names[index];
      receiver[method](key, name[key], mapContext);
    }
    return true;
  }
  if (name && eventSplitter.test(name)) {
    const names = name.split(eventSplitter);
    for (let index = 0, length = names.length; index < length; index++) {
      receiver[method](names[index], callback, context);
    }
    return true;
  }
  return false;
}
var Requests = {
  reply(name, callback, context) {
    if (dispatchOverload(this, "reply", name, callback, context)) {
      return this;
    }
    this._rdRequests = registerReply.call(this, this._rdRequests || {}, name, callback, context);
    return this;
  },
  replyOnce(name, callback, context) {
    if (dispatchOverload(this, "replyOnce", name, callback, context)) {
      return this;
    }
    const onceCallback = onceWrap(makeCallback(callback), (callbackToRemove) => {
      this.stopReplying(name, callbackToRemove);
    });
    return this.reply(name, onceCallback, context);
  },
  stopReplying(name, callback, context) {
    if (dispatchOverload(this, "stopReplying", name, callback, context)) {
      return this;
    }
    if (!this._rdRequests) {
      return this;
    }
    if (!name && !callback && !context) {
      delete this._rdRequests;
      return this;
    }
    this._rdRequests = stopReducer.call(this, this._rdRequests, {
      name,
      callback,
      context
    });
    return this;
  },
  request(name, ...args) {
    if (name && typeof name === "object") {
      const replies = /* @__PURE__ */ Object.create(null);
      const names = getKeys2(name);
      for (let index = 0, length = names.length; index < length; index++) {
        const key = names[index];
        const result = this.request(key, name[key], ...args);
        if (eventSplitter.test(key)) {
          Object.assign(replies, result);
        } else {
          setProperty(replies, key, result);
        }
      }
      return {
        ...replies
      };
    }
    if (name && eventSplitter.test(name)) {
      const replies = {};
      const names = name.split(eventSplitter);
      for (let index = 0, length = names.length; index < length; index++) {
        const n = names[index];
        setProperty(replies, n, this.request(n, ...args));
      }
      return replies;
    }
    const channelName = this.channelName;
    const requests = this._rdRequests;
    if (channelName && this._tunedIn) {
      (this._log || log)(channelName, name, ...args);
    }
    if (requests) {
      const hasRequest = Object.hasOwn(requests, name);
      const handler = hasRequest ? requests[name] : Object.hasOwn(requests, "default") ? requests.default : void 0;
      if (handler) {
        if (hasRequest) {
          return callHandler(handler.callback, handler.context, args);
        }
        return callHandler(handler.callback, handler.context, arguments);
      }
    }
    getDebugLog(this)("An unhandled request was fired", name, channelName);
  }
};
function buildRadio(debug) {
  const _logs = /* @__PURE__ */ Object.create(null);
  function getChannelLog(channelName) {
    return _logs[channelName] || (_logs[channelName] = debug.log.bind(Radio2, channelName));
  }
  const Radio2 = debug.hooks;
  Object.assign(Radio2, {
    setDebug: debug.setDebug,
    tuneIn(channelName) {
      const channel = Radio2.channel(channelName);
      channel._tunedIn = true;
      channel.on("all", getChannelLog(channelName));
      return Radio2;
    },
    tuneOut(channelName) {
      const channel = Radio2.channel(channelName);
      channel._tunedIn = false;
      channel.off("all", getChannelLog(channelName));
      delete _logs[channelName];
      return Radio2;
    }
  });
  const _channels = /* @__PURE__ */ Object.create(null);
  Radio2.channel = function(channelName) {
    if (!channelName) {
      throw new MarionetteError({
        code: "MN0017",
        message: "You must provide a name for the channel."
      });
    }
    if (_channels[channelName]) {
      return _channels[channelName];
    }
    return _channels[channelName] = new Radio2.Channel(channelName);
  };
  function RadioChannel(channelName) {
    this.channelName = channelName;
  }
  Object.assign(RadioChannel.prototype, Events, Requests, {
    reset() {
      this.off();
      this.stopListening();
      this.stopReplying();
      return this;
    }
  });
  Object.defineProperties(RadioChannel.prototype, {
    _debugLog: {
      configurable: true,
      value: debug.debugLog,
      writable: true
    },
    _log: {
      configurable: true,
      value: debug.log,
      writable: true
    }
  });
  Radio2.Channel = RadioChannel;
  for (const system of [Events, Requests]) {
    for (const methodName of Object.keys(system)) {
      setProperty(Radio2, methodName, function(channelName, ...args) {
        const channel = Radio2.channel(channelName);
        return callHandler(channel[methodName], channel, args);
      });
    }
  }
  Radio2.reset = function(channelName) {
    if (!arguments.length) {
      const channelNames = Object.keys(_channels);
      for (let index = 0, length = channelNames.length; index < length; index++) {
        _channels[channelNames[index]].reset();
      }
      return;
    }
    if (!channelName) {
      Radio2.channel(channelName);
    }
    const channel = _channels[channelName];
    if (!channel) {
      throw new MarionetteError({
        code: "MN0021",
        message: "Radio channel does not exist."
      });
    }
    channel.reset();
  };
  return Radio2;
}
function createRadio() {
  return buildRadio(createDebug());
}
var Radio = buildRadio(defaultDebug);
var Channel = Radio.Channel;
var extend2 = extend;
function eachChild(children, iteratee) {
  const length = children.length;
  for (let index = 0; index < length; index++) {
    iteratee(children[index]);
  }
}
function triggerMethodChildren(view, event, shouldTrigger) {
  eachChild(view._getImmediateChildren(), (child) => {
    if (!shouldTrigger(child)) {
      return;
    }
    child.triggerMethod(event, child);
  });
}
function shouldTriggerAttach(view) {
  return !view._isAttached;
}
function shouldAttach(view) {
  if (!shouldTriggerAttach(view)) {
    return false;
  }
  view._isAttached = true;
  return true;
}
function shouldTriggerDetach(view) {
  return view._isAttached;
}
function shouldDetach(view) {
  view._isAttached = false;
  return true;
}
function triggerDOMRefresh(view) {
  if (view._isAttached && view._isRendered) {
    view.triggerMethod("dom:refresh", view);
  }
}
function triggerDOMRemove(view) {
  if (view._isAttached && view._isRendered) {
    view.triggerMethod("dom:remove", view);
  }
}
function handleBeforeAttach() {
  triggerMethodChildren(this, "before:attach", shouldTriggerAttach);
}
function handleAttach() {
  this.Dom?.notifyAttach?.(this.el);
  triggerMethodChildren(this, "attach", shouldAttach);
  triggerDOMRefresh(this);
}
function handleBeforeDetach() {
  triggerMethodChildren(this, "before:detach", shouldTriggerDetach);
  triggerDOMRemove(this);
}
function handleDetach() {
  this.Dom?.notifyDetach?.(this.el);
  triggerMethodChildren(this, "detach", shouldDetach);
}
function handleBeforeRender() {
  triggerDOMRemove(this);
}
function handleRender() {
  triggerDOMRefresh(this);
}
function monitorViewEvents(view) {
  if (view._areViewEventsMonitored || view.monitorViewEvents === false) {
    return;
  }
  view._areViewEventsMonitored = true;
  view.on({
    "before:attach": handleBeforeAttach,
    "attach": handleAttach,
    "before:detach": handleBeforeDetach,
    "detach": handleDetach,
    "before:render": handleBeforeRender,
    "render": handleRender
  });
}
var TemplateRenderMixin = {
  _renderTemplate(template) {
    const data = this.mixinTemplateContext(this.serializeData()) || {};
    const html = this._renderHtml(template, data);
    this.attachElContent(html);
  },
  getTemplate() {
    return this.template;
  },
  mixinTemplateContext(serializedData) {
    const templateContext = getValue(this, "templateContext");
    if (!templateContext) {
      return serializedData;
    }
    if (!serializedData) {
      return templateContext;
    }
    return {
      ...serializedData,
      ...templateContext
    };
  },
  serializeData() {
    if (this.model != null) {
      return this.serializeModel();
    }
    if (this.collection != null) {
      return {
        models: this.serializeCollection()
      };
    }
  },
  serializeModel() {
    return this.Data.serialize(this.model);
  },
  serializeCollection() {
    return this.Data.models(this.collection).map((model) => this.Data.serialize(model));
  },
  _renderHtml(template, data) {
    return template(data);
  },
  attachElContent(html) {
    this.Dom.setContents(this.el, html);
  }
};
var CommonMixin = {
  initialize() {
  },
  normalizeMethods,
  _setOptions(options, classOptions) {
    this.options = {
      ...getValue(this, "options"),
      ...options
    };
    this.mergeOptions(options, classOptions);
  },
  mergeOptions,
  getOption,
  bindEvents,
  unbindEvents,
  bindRequests,
  unbindRequests
};
Object.assign(CommonMixin, Events);
var DestroyMixin = {
  _isDestroyed: false,
  isDestroyed() {
    return this._isDestroyed;
  },
  destroy(options) {
    if (this._isDestroyed || this._isDestroying) {
      return this;
    }
    this._isDestroying = true;
    this.triggerMethod("before:destroy", this, options);
    this._isDestroyed = true;
    this._destroyRadio?.();
    this._destroyState?.();
    this.triggerMethod("destroy", this, options);
    this.stopListening();
    return this;
  }
};
var RadioMixin = {
  Radio,
  _initRadio() {
    const channelName = getValue(this, "channelName");
    if (!channelName) {
      return;
    }
    const channel = this._channel = this.Radio.channel(channelName);
    const radioEvents = getValue(this, "radioEvents");
    this.bindEvents(channel, radioEvents);
    const radioRequests = getValue(this, "radioRequests");
    this.bindRequests(channel, radioRequests);
  },
  _destroyRadio() {
    const channel = this._channel;
    if (!channel) {
      return this;
    }
    channel.stopReplying(null, null, this);
    this.stopListening(channel);
    return this;
  },
  getChannel() {
    return this._channel;
  }
};
function setStateApi$1(mixin) {
  this.prototype.State = {
    ...this.prototype.State,
    ...mixin
  };
  return this;
}
var StateApi = {
  subscribe() {
    throw new MarionetteError({
      code: "MN0037",
      name: "StateApiError",
      message: "The default StateApi cannot observe stateEvents. Configure a StateApi that supports this state source or remove stateEvents.",
      url: "marionette.state.html#state-events"
    });
  }
};
function subscribeBindings(context, Api, source, bindings) {
  const eventArgs = buildEventArgs(normalizeBindings(context, bindings), context);
  const cleanups = eventArgs.map(({
    name,
    callback
  }) => Api.subscribe(source, name, callback, context));
  return function() {
    cleanups.forEach((cleanup) => cleanup());
  };
}
var StateMixin = {
  State: StateApi,
  _initState(options = {}) {
    const stateOption = options != null && Object.hasOwn(options, "state") ? options.state : void 0;
    const hasStateOption = stateOption !== void 0;
    const state = hasStateOption ? stateOption : this.state;
    if (hasStateOption || state !== void 0) {
      this._state = state;
      return;
    }
    if (this.createState !== StateMixin.createState) {
      this._stateOptions = options;
    }
  },
  _initStateEvents() {
    if (this._isDestroyed) {
      return this;
    }
    const stateEvents = getValue(this, "stateEvents");
    if (stateEvents && !this._isDestroyed) {
      this._stateEventCleanup = subscribeBindings(this, this.State, this.getState(), stateEvents);
    }
    return this;
  },
  getState() {
    if (Object.hasOwn(this, "_state")) {
      return this._state;
    }
    const options = this._stateOptions;
    const state = this.createState(options);
    delete this._stateOptions;
    this._state = state;
    this._ownsState = true;
    if (this._isDestroyed) {
      this._destroyState();
    }
    return state;
  },
  _destroyState() {
    if (!Object.hasOwn(this, "_state") || this._stateReleased) {
      return this;
    }
    const state = this._state;
    const cleanup = this._stateEventCleanup;
    const ownsState = this._ownsState;
    const disposeOwned = this.State.disposeOwned;
    this._stateReleased = true;
    delete this._stateEventCleanup;
    delete this._ownsState;
    cleanup?.();
    if (ownsState && disposeOwned) {
      disposeOwned.call(this.State, state);
    }
    return this;
  },
  createState() {
    return {};
  }
};
var ClassOptions$3 = ["channelName", "radioEvents", "radioRequests", "stateEvents"];
var MarionetteObject = function(options) {
  this._setOptions(options, ClassOptions$3);
  this.cid = uniqueId(this.cidPrefix);
  this._initRadio();
  this._initState(options);
  this.initialize.apply(this, arguments);
  this._initStateEvents();
};
Object.assign(MarionetteObject, {
  extend: extend2,
  setStateApi: setStateApi$1
});
Object.assign(MarionetteObject.prototype, CommonMixin, DestroyMixin, RadioMixin, StateMixin, {
  cidPrefix: "mno"
});
var defaultRuntimeId = {};
var runtimeId = /* @__PURE__ */ Symbol("MarionetteRuntime");
function isView(view) {
  return typeof view?.render === "function" && typeof view.destroy === "function";
}
function isViewClass(ViewClass) {
  return isView(ViewClass.prototype);
}
function renderView(view) {
  if (view._isRendered) {
    return;
  }
  view.render();
  view._isRendered = true;
}
function destroyView(view, disableDetachEvents) {
  view._disableDetachEvents = disableDetachEvents;
  view.destroy();
}
function setDomApi$1(mixin) {
  this.prototype.Dom = {
    ...this.prototype.Dom,
    ...mixin
  };
  return this;
}
var DomApi = {
  notifyAttach(_el) {
  },
  notifyDetach(_el) {
  },
  createElement(tagName) {
    return document.createElement(tagName);
  },
  createBuffer() {
    return document.createDocumentFragment();
  },
  getDocumentEl(el) {
    return el.ownerDocument.documentElement;
  },
  findEl(el, selector) {
    return el.querySelectorAll(selector);
  },
  hasEl(el, childEl) {
    return el.contains(childEl && childEl.parentNode);
  },
  detachEl(el) {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  },
  replaceEl(newEl, oldEl) {
    if (newEl === oldEl) {
      return;
    }
    const parent = oldEl.parentNode;
    if (!parent) {
      return;
    }
    parent.replaceChild(newEl, oldEl);
  },
  setContents(el, html) {
    el.innerHTML = html ?? "";
  },
  setAttributes(el, attrs) {
    const attrsType = typeof attrs;
    if (attrs == null || attrsType !== "object" && attrsType !== "function") {
      return;
    }
    const attrNames = Object.keys(attrs);
    for (let index = 0, length = attrNames.length; index < length; index++) {
      const attr = attrNames[index];
      const value = attrs[attr];
      if (value === null) {
        el.removeAttribute(attr);
      } else if (value !== void 0) {
        el.setAttribute(attr, value);
      }
    }
  },
  appendContents(el, contents) {
    el.appendChild(contents);
  },
  moveEl(el, parent, before = null) {
    if (el.parentNode === parent && typeof parent.moveBefore === "function") {
      parent.moveBefore(el, before);
      return;
    }
    parent.insertBefore(el, before);
  },
  hasContents(el) {
    return !!el && el.hasChildNodes();
  },
  detachContents(el) {
    el.textContent = "";
  }
};
var classErrorName$4 = "RegionError";
var RegionClassOptions = ["allowMissingEl", "parentEl", "replaceElement"];
var Region$1 = function(options) {
  this._setOptions(options, RegionClassOptions);
  this.cid = uniqueId(this.cidPrefix);
  this._initEl = this.el = this.getOption("el");
  this.initialize.apply(this, arguments);
};
Region$1.extend = extend2;
Region$1.setDomApi = setDomApi$1;
Object.assign(Region$1.prototype, CommonMixin, {
  Dom: DomApi,
  cidPrefix: "mnr",
  replaceElement: false,
  _isReplaced: false,
  _isSwappingView: false,
  show(view, options) {
    if (this._isDestroyed || this._isDestroying) {
      return this;
    }
    if (!this._ensureElement(options)) {
      return;
    }
    view = this._getView(view, options);
    if (view === this.currentView) {
      return this;
    }
    if (view._parent) {
      throw new MarionetteError({
        code: "MN0003",
        name: classErrorName$4,
        message: "View is already managed by a Region or CollectionView",
        url: "marionette.region.html#showing-a-view"
      });
    }
    this._isSwappingView = !!this.currentView;
    this.triggerMethod("before:show", this, view, options);
    if (this.currentView || !view._isAttached) {
      this.empty(options);
    }
    this._setupChildView(view);
    this.currentView = view;
    renderView(view);
    this._attachView(view, options);
    this.triggerMethod("show", this, view, options);
    this._isSwappingView = false;
    return this;
  },
  _setEl(el) {
    if (el !== null && typeof el === "object") {
      this.el = el;
      return;
    }
    if (!el) {
      throw new MarionetteError({
        code: "MN0004",
        name: classErrorName$4,
        message: 'An "el" must be specified for a region.',
        url: "marionette.region.html#additional-options"
      });
    }
    this.el = this.getEl(el);
  },
  _setElement(el) {
    if (el === this.el) {
      return this;
    }
    const shouldReplace = this._isReplaced;
    this._restoreEl();
    this._setEl(el);
    if (this.currentView) {
      const view = this.currentView;
      if (shouldReplace) {
        this._replaceEl(view);
      } else {
        this.attachHtml(view);
      }
    }
    return this;
  },
  _setupChildView(view) {
    view._parent = this;
    this._proxyChildViewEvents(view);
    view.on("destroy", this._empty, this);
  },
  _proxyChildViewEvents(view) {
    const parentView = this._parentView;
    if (!parentView) {
      return;
    }
    parentView._proxyChildViewEvents(view);
  },
  _shouldDisableMonitoring() {
    return this._parentView && this._parentView.monitorViewEvents === false;
  },
  _isElAttached() {
    const documentEl = this.Dom.getDocumentEl(this.el);
    return !!documentEl && this.Dom.hasEl(documentEl, this.el);
  },
  _attachView(view, {
    replaceElement
  } = {}) {
    const shouldTriggerAttach2 = !view._isAttached && this._isElAttached() && !this._shouldDisableMonitoring();
    const shouldReplaceEl = typeof replaceElement === "undefined" ? !!getValue(this, "replaceElement") : !!replaceElement;
    if (shouldTriggerAttach2) {
      view.triggerMethod("before:attach", view);
    }
    if (shouldReplaceEl) {
      this._replaceEl(view);
    } else {
      this.attachHtml(view);
    }
    if (shouldTriggerAttach2) {
      view._isAttached = true;
      view.triggerMethod("attach", view);
    }
    view._isShown = true;
  },
  _ensureElement(options = {}) {
    this._setEl(this.el);
    if (!this.el) {
      const allowMissingEl = typeof options.allowMissingEl === "undefined" ? !!getValue(this, "allowMissingEl") : !!options.allowMissingEl;
      if (allowMissingEl) {
        return false;
      } else {
        throw new MarionetteError({
          code: "MN0005",
          name: classErrorName$4,
          message: `An "el" must exist in DOM for this region ${this.cid}`,
          url: "marionette.region.html#additional-options"
        });
      }
    }
    return true;
  },
  _getView(view) {
    if (view._isDestroyed) {
      throw new MarionetteError({
        code: "MN0007",
        name: classErrorName$4,
        message: `View (cid: "${view.cid}") has already been destroyed and cannot be used.`,
        url: "marionette.region.html#showing-a-view"
      });
    }
    return view;
  },
  getEl(el) {
    const context = getValue(this, "parentEl");
    return this.Dom.findEl(context || document, el)[0];
  },
  _replaceEl(view) {
    this._restoreEl();
    view.on("before:destroy", this._restoreEl, this);
    this.Dom.replaceEl(view.el, this.el);
    this._isReplaced = true;
  },
  _restoreEl() {
    if (!this._isReplaced) {
      return;
    }
    const view = this.currentView;
    if (!view) {
      return;
    }
    view.off("before:destroy", this._restoreEl, this);
    this._detachView(view);
    this._isReplaced = false;
  },
  isReplaced() {
    return !!this._isReplaced;
  },
  isSwappingView() {
    return !!this._isSwappingView;
  },
  attachHtml(view) {
    this.Dom.appendContents(this.el, view.el);
  },
  empty(options = {
    allowMissingEl: true
  }) {
    if (this._isDestroyed) {
      return this;
    }
    const view = this.currentView;
    if (!view) {
      if (this._ensureElement(options)) {
        this.detachHtml();
      }
      return this;
    }
    this._empty(view, true);
    return this;
  },
  _empty(view, shouldDestroy) {
    view.off("destroy", this._empty, this);
    this.triggerMethod("before:empty", this, view);
    this._restoreEl();
    delete this.currentView;
    if (!view._isDestroyed) {
      if (shouldDestroy) {
        this.removeView(view);
      } else {
        this._detachView(view);
      }
    }
    view._isShown = false;
    this._stopChildViewEvents(view);
    delete view._parent;
    this.triggerMethod("empty", this, view);
  },
  _stopChildViewEvents(view) {
    const parentView = this._parentView;
    if (!parentView) {
      return;
    }
    this._parentView.stopListening(view);
  },
  destroyView(view) {
    if (view._isDestroyed) {
      return view;
    }
    destroyView(view, this._shouldDisableMonitoring());
    return view;
  },
  removeView(view) {
    this.destroyView(view);
  },
  detachView() {
    if (this._isDestroyed || this._isDestroying) {
      return;
    }
    const view = this.currentView;
    if (!view) {
      return;
    }
    this._empty(view);
    return view;
  },
  _detachView(view) {
    const shouldTriggerDetach2 = view._isAttached && !this._shouldDisableMonitoring();
    const shouldRestoreEl = this._isReplaced;
    if (shouldTriggerDetach2) {
      view.triggerMethod("before:detach", view);
    }
    if (shouldRestoreEl) {
      this.Dom.replaceEl(this.el, view.el);
    } else {
      this.detachHtml();
    }
    if (shouldTriggerDetach2) {
      view._isAttached = false;
      view.triggerMethod("detach", view);
    }
  },
  detachHtml() {
    this.Dom.detachContents(this.el);
  },
  hasView() {
    return !!this.currentView;
  },
  getOwner() {
    return this._parentView;
  },
  getName() {
    return this._name;
  },
  reset(options) {
    if (this._isDestroyed) {
      return this;
    }
    this.empty(options);
    this.el = this._initEl;
    return this;
  },
  _isDestroyed: false,
  isDestroyed() {
    return this._isDestroyed;
  },
  destroy(options) {
    if (this._isDestroyed || this._isDestroying) {
      return this;
    }
    this._isDestroying = true;
    this.triggerMethod("before:destroy", this, options);
    this.reset(options);
    this._isDestroyed = true;
    const parentView = this._parentView;
    const name = this._name;
    delete this._parentView;
    delete this._name;
    if (parentView && name !== void 0) {
      parentView._removeReferences(name);
    }
    this.triggerMethod("destroy", this, options);
    this.stopListening();
    return this;
  }
});
Object.defineProperty(Region$1.prototype, runtimeId, {
  value: defaultRuntimeId
});
function throwRegionRegistrationConflict$1(message) {
  throw new MarionetteError({
    code: "MN0030",
    name: "RegionError",
    message
  });
}
function buildRegion(definition, defaults) {
  if (definition instanceof Region$1) {
    if (definition[runtimeId] !== (defaults[runtimeId] || defaultRuntimeId)) {
      throwRegionRegistrationConflict$1("A Region instance must belong to the same Marionette runtime as its owner.");
    }
    return definition;
  }
  if (isString(definition)) {
    return buildRegionFromObject(defaults, {
      el: definition
    });
  }
  if (typeof definition === "function") {
    return buildRegionFromObject(defaults, {
      regionClass: definition
    });
  }
  return buildRegionFromObject(defaults, definition);
}
function buildRegionFromObject(defaults, definition) {
  const options = {
    ...defaults,
    ...definition
  };
  const RegionClass = options.regionClass;
  const RegionRuntimeId = RegionClass.prototype[runtimeId];
  if (RegionRuntimeId && RegionRuntimeId !== (defaults[runtimeId] || defaultRuntimeId)) {
    throwRegionRegistrationConflict$1("A Region class must belong to the same Marionette runtime as its owner.");
  }
  delete options.regionClass;
  return new RegionClass(options);
}
function addBehavior(view, behaviorDefinition) {
  const options = typeof behaviorDefinition === "function" ? {} : behaviorDefinition;
  const BehaviorClass = typeof behaviorDefinition === "function" ? behaviorDefinition : behaviorDefinition.behaviorClass;
  const behavior = new BehaviorClass(options, view);
  if (!behavior._isDestroyed) {
    view._behaviors.push(behavior);
  }
  parseBehaviors(view, getValue(behavior, "behaviors"));
}
function parseBehaviors(view, behaviors) {
  if (Array.isArray(behaviors)) {
    for (let index = 0, length = behaviors.length; index < length; index++) {
      addBehavior(view, behaviors[index]);
    }
  } else if (behaviors) {
    const definitions = behaviors;
    for (const name of Object.keys(definitions)) {
      addBehavior(view, definitions[name]);
    }
  }
}
function eachBehavior(behaviors, iteratee) {
  if (behaviors == null) {
    return;
  }
  for (let index = 0, length = behaviors.length; index < length; index++) {
    iteratee(behaviors[index]);
  }
}
var BehaviorsMixin = {
  _initBehaviors() {
    this._behaviors = [];
    parseBehaviors(this, getValue(this, "behaviors"));
  },
  _delegateBehaviorViewEvents() {
    eachBehavior(this._behaviors, (behavior) => behavior._delegateViewEvents(this));
  },
  _undelegateBehaviorViewEvents() {
    eachBehavior(this._behaviors, (behavior) => behavior._undelegateViewEvents());
  },
  _delegateBehaviorEntityEvents() {
    eachBehavior(this._behaviors, (behavior) => behavior.delegateEntityEvents());
  },
  _undelegateBehaviorEntityEvents() {
    eachBehavior(this._behaviors, (behavior) => behavior.undelegateEntityEvents());
  },
  _destroyBehaviors(options) {
    eachBehavior(this._behaviors, (behavior) => behavior.destroy(options));
  },
  _removeBehavior(behavior) {
    if (this._isDestroyed) {
      return;
    }
    const remainingBehaviors = [];
    for (let index = 0, length = this._behaviors.length; index < length; index++) {
      const currentBehavior = this._behaviors[index];
      if (currentBehavior !== behavior) {
        remainingBehaviors.push(currentBehavior);
      }
    }
    this._behaviors = remainingBehaviors;
  },
  _bindBehaviorUIElements() {
    eachBehavior(this._behaviors, (behavior) => behavior.bindUIElements());
  },
  _unbindBehaviorUIElements() {
    eachBehavior(this._behaviors, (behavior) => behavior.unbindUIElements());
  },
  _triggerEventOnBehaviors(eventName, view, options) {
    eachBehavior(this._behaviors, (behavior) => behavior.triggerMethod(eventName, view, options));
  }
};
var DelegateEntityEventsMixin = {
  _delegateEntityEvents(model, collection, Data) {
    if (model != null) {
      this._modelEvents = getValue(this, "modelEvents");
      if (this._modelEvents) {
        this._modelEventCleanup = subscribeBindings(this, Data, model, this._modelEvents);
      }
    }
    if (collection != null) {
      this._collectionEvents = getValue(this, "collectionEvents");
      if (this._collectionEvents) {
        this._collectionEventCleanup = subscribeBindings(this, Data, collection, this._collectionEvents);
      }
    }
  },
  _undelegateEntityEvents() {
    const subscriptions = [this._modelEventCleanup, this._collectionEventCleanup];
    delete this._modelEventCleanup;
    delete this._collectionEventCleanup;
    delete this._modelEvents;
    delete this._collectionEvents;
    subscriptions.forEach((cleanup) => cleanup?.());
  }
};
var normalizeUIKeys = function(hash, ui) {
  const normalizedHash = {};
  if (!hash) {
    return normalizedHash;
  }
  for (const key of Object.keys(hash)) {
    const normalizedKey = normalizeUIString(key, ui);
    setProperty(normalizedHash, normalizedKey, hash[key]);
  }
  return normalizedHash;
};
var uiRegEx = /@ui\.[a-zA-Z-_$0-9]*/g;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var normalizeUIString = function(uiString, ui) {
  return uiString.replace(uiRegEx, (r) => {
    const name = r.slice(4);
    if (!name) {
      throw new MarionetteError({
        code: "MN0018",
        message: "The ui reference must include a key name."
      });
    }
    const hasSelector = ui && hasOwnProperty.call(ui, name);
    const selector = hasSelector ? ui[name] : void 0;
    if (!hasSelector) {
      throw new MarionetteError({
        code: "MN0018",
        message: `The ui reference "${name}" must be declared as an own ui key.`
      });
    }
    return selector;
  });
};
var normalizeUIValues = function(hash, ui, property) {
  for (const key of Object.keys(hash)) {
    const val = hash[key];
    if (isString(val)) {
      hash[key] = normalizeUIString(val, ui);
    } else if (val) {
      const propertyVal = val[property];
      if (isString(propertyVal)) {
        val[property] = normalizeUIString(propertyVal, ui);
      }
    }
  }
  return hash;
};
var UIMixin = {
  normalizeUIKeys(hash, uiBindings = this._getUIBindings()) {
    return normalizeUIKeys(hash, uiBindings);
  },
  normalizeUIString(uiString, uiBindings = this._getUIBindings()) {
    return normalizeUIString(uiString, uiBindings);
  },
  normalizeUIValues(hash, property, uiBindings = this._getUIBindings()) {
    return normalizeUIValues(hash, uiBindings, property);
  },
  _getUIBindings() {
    const uiBindings = getValue(this, "_uiBindings");
    return uiBindings || getValue(this, "ui");
  },
  _bindUIElements() {
    if (!this.ui) {
      return;
    }
    if (!this._uiBindings) {
      this._uiBindings = this.ui;
    }
    const bindings = getValue(this, "_uiBindings") ?? {};
    this._ui = {};
    for (const key of Object.keys(bindings)) {
      setProperty(this._ui, key, this.$(bindings[key]));
    }
    this.ui = this._ui;
  },
  _unbindUIElements() {
    if (!this.ui || !this._uiBindings) {
      return;
    }
    for (const name of Object.keys(this.ui)) {
      delete this.ui[name];
    }
    this.ui = this._uiBindings;
    delete this._uiBindings;
    delete this._ui;
  },
  _getUI(name) {
    if (!this.ui) {
      throw new MarionetteError({
        code: "MN0023",
        message: "A ui map must be declared before calling getUI()."
      });
    }
    if (!this._ui) {
      throw new MarionetteError({
        code: "MN0023",
        message: "UI elements must be bound before calling getUI()."
      });
    }
    return this._ui[name];
  }
};
function setEventDelegator$1(delegator) {
  Object.defineProperty(this.prototype, "EventDelegator", {
    configurable: true,
    enumerable: true,
    value: delegator,
    writable: false
  });
  return this;
}
var EventDelegator = {
  delegate({
    eventName,
    selector,
    handler,
    rootEl
  }) {
    const capture = eventName === "focus" || eventName === "blur";
    let eventHandler = handler;
    if (selector) {
      eventHandler = function(evt) {
        let node = evt.target;
        for (; node && node !== rootEl; node = node.parentNode) {
          if (node.nodeType === 1 && node.matches(selector)) {
            evt.delegateTarget = node;
            handler(evt);
            break;
          }
        }
      };
    }
    rootEl.addEventListener(eventName, eventHandler, capture);
    let isRemoved;
    return () => {
      if (isRemoved) {
        return;
      }
      isRemoved = true;
      rootEl.removeEventListener(eventName, eventHandler, capture);
    };
  }
};
var delegateEventSplitter = /^(\S+)\s*(.*)$/;
function buildViewTrigger(view, triggerDef) {
  if (isString(triggerDef)) {
    triggerDef = {
      event: triggerDef
    };
  }
  const eventName = triggerDef.event;
  const shouldPreventDefault = triggerDef.preventDefault !== false;
  const shouldStopPropagation = triggerDef.stopPropagation !== false;
  return function(event, ...args) {
    if (shouldPreventDefault) {
      event.preventDefault();
    }
    if (shouldStopPropagation) {
      event.stopPropagation();
    }
    view.triggerMethod(eventName, view, event, ...args);
  };
}
var ViewEventsMixin = {
  EventDelegator,
  _initViewEvents() {
    this._domEvents = [];
  },
  _undelegateViewEvents() {
    const cleanups = this._domEvents.splice(0);
    for (let index = cleanups.length; index--; ) {
      cleanups[index]();
    }
  },
  _delegateViewEvents(view = this, events) {
    if (!events && !this.events && !this.triggers) {
      return;
    }
    const uiBindings = this._getUIBindings();
    const delegates = [];
    this._delegateEvents(delegates, uiBindings, events);
    this._delegateTriggers(delegates, uiBindings, view);
    for (let index = 0; index < delegates.length; index += 2) {
      this._delegate(delegates[index], delegates[index + 1]);
    }
  },
  _delegateEvents(delegates, uiBindings, events) {
    const eventMap = events || getValue(this, "events");
    if (!eventMap) {
      return;
    }
    for (const key of Object.keys(eventMap)) {
      const handler = resolveMethod(this, eventMap[key], key);
      delegates.push(handler.bind(this), this.normalizeUIString(key, uiBindings));
    }
  },
  _delegateTriggers(delegates, uiBindings, view) {
    if (!this.triggers) {
      return;
    }
    const triggers = getValue(this, "triggers") ?? {};
    for (const key of Object.keys(triggers)) {
      delegates.push(buildViewTrigger(view, triggers[key]), this.normalizeUIString(key, uiBindings));
    }
  },
  _delegate(handler, key) {
    const match = key.match(delegateEventSplitter);
    const cleanup = this.EventDelegator.delegate({
      eventName: match[1],
      selector: match[2],
      handler,
      rootEl: this.el
    });
    this._domEvents.push(cleanup);
  }
};
var noop = function() {
};
function setDataApi$1(mixin) {
  this.prototype.Data = {
    ...this.prototype.Data,
    ...mixin
  };
  return this;
}
var DataApi = {
  key(model) {
    return model;
  },
  get(model, attribute) {
    return Object.hasOwn(model, attribute) ? model[attribute] : void 0;
  },
  has(model, attribute) {
    return Object.hasOwn(Object(model), attribute);
  },
  serialize(model) {
    return model;
  },
  models(collection) {
    return collection;
  },
  subscribe(entity, eventName, callback, context) {
    if (typeof entity?.on !== "function" || typeof entity?.off !== "function") {
      throw new MarionetteError({
        code: "MN0037",
        name: "DataApiError",
        message: "The default DataApi cannot observe modelEvents or collectionEvents on a plain value. Configure a DataApi that supports this source or remove the event map.",
        url: "data.api.html#entity-events"
      });
    }
    let isSubscribed = true;
    entity.on(eventName, callback, context);
    return function() {
      if (!isSubscribed) {
        return;
      }
      isSubscribed = false;
      entity.off(eventName, callback, context);
    };
  },
  observeCollection(collection) {
    if (Array.isArray(collection)) {
      return noop;
    }
    throw new MarionetteError({
      code: "MN0037",
      name: "DataApiError",
      message: "The default DataApi can observe only static plain arrays. Configure a DataApi that supports this collection source.",
      url: "data.api.html#collection-observations"
    });
  }
};
var ViewOptions = ["attributes", "className", "collection", "el", "events", "id", "model", "tagName"];
var ViewMixin = {
  tagName: "div",
  preinitialize() {
  },
  Dom: DomApi,
  Data: DataApi,
  _getEl() {
    const elOption = getValue(this, "el");
    if (!elOption) {
      const el = this.Dom.createElement(getValue(this, "tagName"));
      this.Dom.setAttributes(el, this._getAttributes());
      return el;
    }
    return elOption;
  },
  _getAttributes() {
    const attrs = {
      ...getValue(this, "attributes")
    };
    if ("id" in this) {
      attrs.id = getValue(this, "id");
    }
    if ("className" in this) {
      attrs.class = getValue(this, "className");
    }
    return attrs;
  },
  renderAttributes() {
    if (this._isDestroying || this._isDestroyed) {
      return this;
    }
    this.Dom.setAttributes(this.el, this._getAttributes());
    return this;
  },
  $(selector) {
    return this.Dom.findEl(this.el, selector);
  },
  _isElAttached() {
    const documentEl = this.el && this.Dom.getDocumentEl(this.el);
    return !!documentEl && this.Dom.hasEl(documentEl, this.el);
  },
  _isDestroyed: false,
  isDestroyed() {
    return !!this._isDestroyed;
  },
  _isRendered: false,
  isRendered() {
    return !!this._isRendered;
  },
  _isAttached: false,
  isAttached() {
    return !!this._isAttached;
  },
  delegateEvents(events) {
    if (this._isDestroying || this._isDestroyed) {
      return this;
    }
    this.undelegateEvents();
    this._buildEventProxies();
    this._delegateViewEvents(this, events);
    this._delegateBehaviorViewEvents();
    return this;
  },
  undelegateEvents() {
    if (this._isDestroyed || this._isDestroying) {
      return this;
    }
    this._undelegateViewEvents();
    this._undelegateBehaviorViewEvents();
    return this;
  },
  delegateEntityEvents() {
    if (this._isDestroyed || this._isDestroying) {
      return this;
    }
    this._delegateEntityEvents(this.model, this.collection, this.Data);
    this._delegateBehaviorEntityEvents();
    return this;
  },
  undelegateEntityEvents() {
    this._undelegateEntityEvents();
    this._undelegateBehaviorEntityEvents();
    return this;
  },
  destroy(options) {
    if (this._isDestroyed || this._isDestroying) {
      return this;
    }
    this._isDestroying = true;
    const shouldTriggerDetach2 = this._isAttached && !this._disableDetachEvents;
    this.triggerMethod("before:destroy", this, options);
    if (shouldTriggerDetach2) {
      this.triggerMethod("before:detach", this);
    }
    this.unbindUIElements();
    this._undelegateViewEvents();
    this.Dom.detachEl(this.el);
    if (shouldTriggerDetach2) {
      this._isAttached = false;
      this.triggerMethod("detach", this);
    }
    this._removeChildren();
    this._isDestroyed = true;
    this._isRendered = false;
    const dataObserverCleanup = this._dataObserverCleanup;
    delete this._dataObserverCleanup;
    dataObserverCleanup?.();
    this._undelegateEntityEvents();
    this._destroyBehaviors(options);
    this._destroyState();
    this.triggerMethod("destroy", this, options);
    this._triggerEventOnBehaviors("destroy", this, options);
    this.stopListening();
    return this;
  },
  bindUIElements() {
    if (this._isDestroyed || this._isDestroying) {
      return this;
    }
    this._bindUIElements();
    this._bindBehaviorUIElements();
    return this;
  },
  unbindUIElements() {
    this._unbindUIElements();
    this._unbindBehaviorUIElements();
    return this;
  },
  getUI(name) {
    return this._getUI(name);
  },
  _buildEventProxies() {
    this._childViewEvents = this.normalizeMethods(getValue(this, "childViewEvents"));
    this._childViewTriggers = getValue(this, "childViewTriggers");
    this._eventPrefix = this._getEventPrefix();
  },
  _getEventPrefix() {
    const prefix = getValue(this, "childViewEventPrefix", false);
    return prefix === false ? prefix : prefix + ":";
  },
  _proxyChildViewEvents(view) {
    if (this._childViewEvents || this._childViewTriggers || this._eventPrefix) {
      this.listenTo(view, "all", this._childViewEventHandler);
    }
  },
  _childViewEventHandler(eventName, ...args) {
    const childViewEvents = this._childViewEvents;
    if (childViewEvents && Object.hasOwn(childViewEvents, eventName)) {
      childViewEvents[eventName].apply(this, args);
    }
    const childViewTriggers = this._childViewTriggers;
    if (childViewTriggers && Object.hasOwn(childViewTriggers, eventName) && childViewTriggers[eventName]) {
      this.triggerMethod(childViewTriggers[eventName], ...args);
    }
    if (this._eventPrefix) {
      this.triggerMethod(this._eventPrefix + eventName, ...args);
    }
  }
};
Object.assign(ViewMixin, BehaviorsMixin, CommonMixin, DelegateEntityEventsMixin, StateMixin, TemplateRenderMixin, UIMixin, ViewEventsMixin);
function setRenderer$1(renderer) {
  this.prototype._renderHtml = renderer;
  return this;
}
var classErrorName$3 = "RegionError";
function assertRegionName(name) {
  if (name.length > 0) {
    return;
  }
  throw new MarionetteError({
    code: "MN0032",
    name: classErrorName$3,
    message: "A Region name must be a non-empty string."
  });
}
function setRegion(regions, definition, name) {
  assertRegionName(name);
  Object.defineProperty(regions, name, {
    configurable: true,
    enumerable: true,
    value: definition,
    writable: true
  });
  return regions;
}
function getOwnRegion(regions, name) {
  assertRegionName(name);
  return regions[name];
}
function getRequiredRegion(region, name) {
  if (region) {
    return region;
  }
  throw new MarionetteError({
    code: "MN0020",
    name: classErrorName$3,
    message: `Region "${name}" does not exist.`
  });
}
function getRegionForChild(view, name) {
  assertRegionName(name);
  if (!view._isRendered) {
    view.render();
  }
  return getRequiredRegion(view.getRegion(name), name);
}
function throwRegionRegistrationConflict(message) {
  throw new MarionetteError({
    code: "MN0030",
    name: classErrorName$3,
    message
  });
}
function isSameRegionRegistration(view, region, name) {
  return region._parentView === view && region._name === name && getOwnRegion(view._regions, name) === region;
}
function assertRegionCanRegister(view, region, name) {
  if (isSameRegionRegistration(view, region, name)) {
    return;
  }
  if (region._parentView !== void 0) {
    throwRegionRegistrationConflict("A Region instance cannot be registered with more than one owner or name.");
  }
  if (region._isDestroying || region._isDestroyed) {
    throwRegionRegistrationConflict("A destroying or destroyed Region cannot be registered.");
  }
  if (getOwnRegion(view._regions, name)) {
    throwRegionRegistrationConflict(`Region name "${name}" is already registered.`);
  }
}
function assertRegionDefinitionsCanRegister(view, definitions) {
  const seenRegions = /* @__PURE__ */ new Set();
  for (const name of Object.keys(definitions)) {
    const definition = definitions[name];
    if (!(definition instanceof Region$1)) {
      if (getOwnRegion(view._regions, name)) {
        throwRegionRegistrationConflict(`Region name "${name}" is already registered.`);
      }
      continue;
    }
    if (seenRegions.has(definition)) {
      throwRegionRegistrationConflict("A Region instance cannot be registered under more than one name.");
    }
    seenRegions.add(definition);
    assertRegionCanRegister(view, definition, name);
  }
}
var RegionsMixin = {
  regionClass: Region$1,
  _initRegions() {
    this.regions = this.regions || {};
    this._regions = /* @__PURE__ */ Object.create(null);
    this.addRegions(getValue(this, "regions"));
  },
  _reInitRegions() {
    for (const name of Object.keys(this._regions)) {
      this._regions[name].reset();
    }
  },
  addRegion(name, definition) {
    const regions = setRegion({}, definition, name);
    return this.addRegions(regions)[name];
  },
  addRegions(regions) {
    if (regions == null || Object.keys(regions).length === 0) {
      return;
    }
    for (const name of Object.keys(regions)) {
      assertRegionName(name);
    }
    regions = this.normalizeUIValues(regions, "el");
    assertRegionDefinitionsCanRegister(this, regions);
    const allRegions = {};
    for (const name of Object.keys(this.regions)) {
      setRegion(allRegions, this.regions[name], name);
    }
    for (const name of Object.keys(regions)) {
      setRegion(allRegions, regions[name], name);
    }
    this.regions = allRegions;
    return this._addRegions(regions);
  },
  _addRegions(regionDefinitions) {
    const defaults = {
      [runtimeId]: this[runtimeId],
      regionClass: this.regionClass,
      parentEl: () => getValue(this, "el")
    };
    const regions = {};
    for (const name of Object.keys(regionDefinitions)) {
      const region = buildRegion(regionDefinitions[name], defaults);
      this._addRegion(region, name);
      setRegion(regions, region, name);
    }
    return regions;
  },
  _addRegion(region, name) {
    if (isSameRegionRegistration(this, region, name)) {
      return;
    }
    assertRegionCanRegister(this, region, name);
    this.triggerMethod("before:add:region", this, name, region);
    region._parentView = this;
    region._name = name;
    this._regions[name] = region;
    this.triggerMethod("add:region", this, name, region);
  },
  removeRegion(name) {
    const region = getRequiredRegion(getOwnRegion(this._regions, name), name);
    this._removeRegion(region, name);
    return region;
  },
  removeRegions() {
    const regions = this._getRegions();
    for (const name of Object.keys(regions)) {
      this._removeRegion(regions[name], name);
    }
    return regions;
  },
  _removeRegion(region, name) {
    this.triggerMethod("before:remove:region", this, name, region);
    region.destroy();
    this.triggerMethod("remove:region", this, name, region);
  },
  _removeReferences(name) {
    delete this.regions[name];
    delete this._regions[name];
  },
  emptyRegions() {
    if (!this._isRendered) {
      this.render();
    }
    const regions = this.getRegions();
    for (const name of Object.keys(regions)) {
      regions[name].empty();
    }
    return regions;
  },
  hasRegion(name) {
    return !!getOwnRegion(this._regions, name);
  },
  getRegion(name) {
    return getOwnRegion(this._regions, name);
  },
  _getRegions() {
    const regions = {};
    for (const name of Object.keys(this._regions)) {
      setRegion(regions, this._regions[name], name);
    }
    return regions;
  },
  getRegions() {
    return this._getRegions();
  },
  showChildView(name, view, options) {
    const region = getRegionForChild(this, name);
    region.show(view, options);
    return view;
  },
  detachChildView(name) {
    return getRegionForChild(this, name).detachView();
  },
  getChildView(name) {
    return getRegionForChild(this, name).currentView;
  }
};
var ViewClassOptions = ["attributes", "behaviors", "childViewEventPrefix", "childViewEvents", "childViewTriggers", "className", "collection", "collectionEvents", "el", "events", "id", "model", "modelEvents", "regionClass", "regions", "stateEvents", "tagName", "template", "templateContext", "triggers", "ui"];
function childReducer(children, region) {
  if (region.currentView) {
    children.push(region.currentView);
  }
  return children;
}
var View$1 = function(options) {
  this.cid = uniqueId(this.cidPrefix);
  this._setOptions(options, ViewClassOptions);
  this.preinitialize.apply(this, arguments);
  this.mergeOptions(options, ViewOptions);
  this._initViewEvents();
  this.el = this._getEl();
  this._isRendered = this.Dom.hasContents(this.el);
  this._isAttached = this._isElAttached();
  if (this._isRendered) {
    this.bindUIElements();
  }
  this.delegateEvents();
  if (this._isAttached && this.monitorViewEvents !== false) {
    this.Dom.notifyAttach?.(this.el);
  }
  monitorViewEvents(this);
  this._initState(options);
  this._initBehaviors();
  this._initRegions();
  this._buildEventProxies();
  this.initialize.apply(this, arguments);
  if (this._isDestroyed || this._isDestroying) {
    return;
  }
  this._initStateEvents();
  this.delegateEntityEvents();
  this._triggerEventOnBehaviors("initialize", this, options);
};
Object.assign(View$1, {
  extend: extend2,
  setRenderer: setRenderer$1,
  setDomApi: setDomApi$1,
  setEventDelegator: setEventDelegator$1,
  setDataApi: setDataApi$1,
  setStateApi: setStateApi$1
});
Object.assign(View$1.prototype, ViewMixin, RegionsMixin, {
  cidPrefix: "mnv",
  render() {
    if (this._isDestroyed) {
      return this;
    }
    const template = this.getTemplate();
    if (template === false) {
      return this;
    }
    this.triggerMethod("before:render", this);
    if (this._isRendered) {
      this._reInitRegions();
    }
    this._renderTemplate(template);
    this.bindUIElements();
    this._isRendered = true;
    this.triggerMethod("render", this);
    return this;
  },
  _removeChildren() {
    this.removeRegions();
  },
  _getImmediateChildren() {
    const children = [];
    for (const name of Object.keys(this._regions)) {
      childReducer(children, this._regions[name]);
    }
    return children;
  }
});
var classErrorName$2 = "CollectionViewError";
function createIndex() {
  return /* @__PURE__ */ Object.create(null);
}
var Container = function(dataApi = DataApi) {
  this.Data = dataApi;
  this._init();
};
function assertCount(count) {
  if (!Number.isInteger(count) || count < 0) {
    throw new MarionetteError({
      code: "MN0024",
      name: classErrorName$2,
      message: "ChildViewContainer count must be a nonnegative integer."
    });
  }
  return count;
}
function stringComparator(Data, comparator, view) {
  return view.model != null && Data.has(view.model, comparator) ? Data.get(view.model, comparator) : void 0;
}
function compareCriteria(left, right) {
  const leftCriteria = left.criteria;
  const rightCriteria = right.criteria;
  if (leftCriteria !== rightCriteria) {
    if (leftCriteria > rightCriteria || leftCriteria === void 0) {
      return 1;
    }
    if (leftCriteria < rightCriteria || rightCriteria === void 0) {
      return -1;
    }
  }
  return left.index - right.index;
}
function sortByCriteria(views, comparator, context) {
  const decoratedViews = views.map((view, index) => ({
    criteria: comparator.call(context, view),
    index,
    view
  }));
  decoratedViews.sort(compareCriteria);
  return decoratedViews.map(({
    view
  }) => view);
}
Object.assign(Container.prototype, {
  each(callback, context) {
    const length = this._views.length;
    for (let index = 0; index < length; index++) {
      callback.call(context, this._views[index], index);
    }
    return this;
  },
  map(callback, context) {
    const length = this._views.length;
    const results = Array(length);
    for (let index = 0; index < length; index++) {
      results[index] = callback.call(context, this._views[index], index);
    }
    return results;
  },
  reduce(callback, initialValue, context) {
    const length = this._views.length;
    const hasInitialValue = arguments.length > 1;
    let index = 0;
    let accumulator = initialValue;
    if (!hasInitialValue) {
      if (!length) {
        throw new MarionetteError({
          code: "MN0024",
          name: classErrorName$2,
          message: "Reduce of empty ChildViewContainer with no initial value."
        });
      }
      accumulator = this._views[index++];
    }
    for (; index < length; index++) {
      accumulator = callback.call(context, accumulator, this._views[index], index);
    }
    return accumulator;
  },
  find(predicate, context) {
    const length = this._views.length;
    for (let index = 0; index < length; index++) {
      const view = this._views[index];
      if (predicate.call(context, view, index)) {
        return view;
      }
    }
  },
  filter(predicate, context) {
    const results = [];
    const length = this._views.length;
    for (let index = 0; index < length; index++) {
      const view = this._views[index];
      if (predicate.call(context, view, index)) {
        results.push(view);
      }
    }
    return results;
  },
  reject(predicate, context) {
    const results = [];
    const length = this._views.length;
    for (let index = 0; index < length; index++) {
      const view = this._views[index];
      if (!predicate.call(context, view, index)) {
        results.push(view);
      }
    }
    return results;
  },
  every(predicate, context) {
    const length = this._views.length;
    for (let index = 0; index < length; index++) {
      if (!predicate.call(context, this._views[index], index)) {
        return false;
      }
    }
    return true;
  },
  some(predicate, context) {
    const length = this._views.length;
    for (let index = 0; index < length; index++) {
      if (predicate.call(context, this._views[index], index)) {
        return true;
      }
    }
    return false;
  },
  contains(view) {
    return this._views.indexOf(view) !== -1;
  },
  invoke(methodName, ...args) {
    const length = this._views.length;
    const results = Array(length);
    for (let index = 0; index < length; index++) {
      const view = this._views[index];
      const method = view[methodName];
      results[index] = method.apply(view, args);
    }
    return results;
  },
  toArray() {
    return this._views.slice();
  },
  first(count) {
    if (count === void 0) {
      return this._views[0];
    }
    return this._views.slice(0, assertCount(count));
  },
  initial(count = 1) {
    const end = Math.max(this._views.length - assertCount(count), 0);
    return this._views.slice(0, end);
  },
  rest(count = 1) {
    return this._views.slice(assertCount(count));
  },
  last(count) {
    if (count === void 0) {
      return this._views[this._views.length - 1];
    }
    const start = Math.max(this._views.length - assertCount(count), 0);
    return this._views.slice(start);
  },
  without(...excludedViews) {
    const results = [];
    const length = this._views.length;
    for (let index = 0; index < length; index++) {
      const view = this._views[index];
      if (excludedViews.indexOf(view) === -1) {
        results.push(view);
      }
    }
    return results;
  },
  isEmpty() {
    return this._views.length === 0;
  },
  pluck(key) {
    const length = this._views.length;
    const results = Array(length);
    for (let index = 0; index < length; index++) {
      results[index] = this._views[index][key];
    }
    return results;
  },
  partition(predicate, context) {
    const matching = [];
    const rejected = [];
    const length = this._views.length;
    for (let index = 0; index < length; index++) {
      const view = this._views[index];
      (predicate.call(context, view, index) ? matching : rejected).push(view);
    }
    return [matching, rejected];
  },
  _init() {
    this._views = [];
    this._viewsByCid = createIndex();
    this._indexByModel = /* @__PURE__ */ new Map();
    this._keyByView = /* @__PURE__ */ new Map();
    this._updateLength();
  },
  _add(view, index = this._views.length) {
    this._addViewIndexes(view);
    if (index === this._views.length) {
      this._views.push(view);
    } else {
      this._views.splice(index, 0, view);
    }
    this._updateLength();
  },
  _addViewIndexes(view) {
    this._viewsByCid[view.cid] = view;
    if (view.model != null) {
      const key = this.Data.key(view.model);
      this._indexByModel.set(key, view);
      this._keyByView.set(view, key);
    }
  },
  _sort(comparator, context) {
    if (typeof comparator === "string") {
      return this._sortBy((view) => stringComparator(this.Data, comparator, view));
    }
    if (comparator.length === 1) {
      return this._sortBy(comparator, context);
    }
    return this._views.sort(comparator.bind(context));
  },
  _sortBy(comparator, context) {
    const sortedViews = sortByCriteria(this._views, comparator, context);
    this._set(sortedViews);
    return sortedViews;
  },
  _set(views, shouldReset) {
    if (views !== this._views) {
      this._views.length = 0;
      this._views.push.apply(this._views, views);
    }
    if (shouldReset) {
      this._viewsByCid = createIndex();
      this._indexByModel = /* @__PURE__ */ new Map();
      this._keyByView = /* @__PURE__ */ new Map();
      for (const view of views) {
        this._addViewIndexes(view);
      }
      this._updateLength();
    }
  },
  _swap(view1, view2) {
    const view1Index = this.findIndexByView(view1);
    const view2Index = this.findIndexByView(view2);
    if (view1Index === -1 || view2Index === -1) {
      return;
    }
    const swapView = this._views[view1Index];
    this._views[view1Index] = this._views[view2Index];
    this._views[view2Index] = swapView;
  },
  findByModel(model) {
    return this._indexByModel.get(this.Data.key(model));
  },
  findByKey(key) {
    return this._indexByModel.get(key);
  },
  findByIndex(index) {
    return this._views[index];
  },
  findIndexByView(view) {
    return this._views.indexOf(view);
  },
  findByCid(cid) {
    return this._viewsByCid[cid];
  },
  hasView(view) {
    return this.findByCid(view.cid) === view;
  },
  _remove(view) {
    if (!this.hasView(view)) {
      return;
    }
    if (view.model != null) {
      const modelKey = this._keyByView.get(view);
      if (this._indexByModel.get(modelKey) === view) {
        this._indexByModel.delete(modelKey);
      }
      this._keyByView.delete(view);
    }
    delete this._viewsByCid[view.cid];
    const index = this.findIndexByView(view);
    this._views.splice(index, 1);
    this._updateLength();
  },
  _updateLength() {
    this.length = this._views.length;
  }
});
Container.prototype[Symbol.iterator] = function() {
  return this._views[Symbol.iterator]();
};
var classErrorName$1 = "CollectionViewError";
function sameValueZero(left, right) {
  return left === right || Object.is(left, right);
}
function throwCollectionProtocolError(message) {
  throw new MarionetteError({
    code: "MN0039",
    name: classErrorName$1,
    message,
    url: "data.api.html#collection-observations"
  });
}
function buildCollectionSnapshot(Data, collection, previous) {
  const models = Data.models(collection);
  const keys = /* @__PURE__ */ new Set();
  const modelEntries = /* @__PURE__ */ new Map();
  const snapshot = Array(models.length);
  for (let index = 0; index < models.length; index++) {
    const model = models[index];
    const key = Data.key(model);
    if (key == null) {
      throwCollectionProtocolError(`DataApi.key() returned a missing key for model at index ${index}.`);
    }
    if (keys.has(key)) {
      throwCollectionProtocolError(`DataApi.key() returned duplicate key "${String(key)}".`);
    }
    const previousEntry = previous?.get(model);
    if (previousEntry && !sameValueZero(previousEntry.key, key)) {
      throwCollectionProtocolError("DataApi.key() changed while a model remained in the CollectionView.");
    }
    const entry = {
      model,
      key
    };
    snapshot[index] = entry;
    keys.add(key);
    modelEntries.set(model, entry);
  }
  return {
    entries: snapshot,
    models: modelEntries
  };
}
function normalizeCollectionChange(change, previous, current) {
  if (change.kind !== "update") {
    return change;
  }
  const added = new Set(change.added);
  const removed = new Set(change.removed);
  return {
    kind: "update",
    added: added.size ? current.entries.filter((entry) => added.has(entry.model)) : [],
    removed: removed.size ? previous.entries.filter((entry) => removed.has(entry.model)) : [],
    updated: change.updated.map((pair) => ({
      key: current.models.get(pair.current).key,
      previous: pair.previous,
      current: pair.current
    }))
  };
}
function canDetachContents(container, children) {
  if (container.childElementCount !== children.length || !children.every((view) => view.el.parentNode === container)) {
    return false;
  }
  return container.childNodes.length === children.length || Array.from(container.childNodes).every((node) => node.nodeType === 1 || node.nodeType === 3 && !/[^\t\n\f\r ]/.test(node.textContent));
}
function modelAttributesMatcher(Data, predicate) {
  const keys = Object.keys(predicate);
  const length = keys.length;
  const values = Array(length);
  for (let index = 0; index < length; index++) {
    values[index] = predicate[keys[index]];
  }
  return function(view) {
    const model = view.model;
    if (model == null) {
      return length === 0;
    }
    for (let index = 0; index < length; index++) {
      const key = keys[index];
      if (!Data.has(model, key) || values[index] !== Data.get(model, key)) {
        return false;
      }
    }
    return true;
  };
}
var ClassOptions$2 = ["attributes", "behaviors", "childView", "childViewContainer", "childViewEventPrefix", "childViewEvents", "childViewOptions", "childViewTriggers", "className", "collection", "collectionEvents", "el", "emptyView", "emptyViewOptions", "events", "id", "model", "modelEvents", "stateEvents", "sortWithCollection", "tagName", "template", "templateContext", "triggers", "ui", "viewComparator", "viewFilter"];
var CollectionView$1 = function(options) {
  this.cid = uniqueId(this.cidPrefix);
  this._setOptions(options, ClassOptions$2);
  this.preinitialize.apply(this, arguments);
  this.mergeOptions(options, ViewOptions);
  this._initViewEvents();
  this.el = this._getEl();
  this._isAttached = this._isElAttached();
  this.delegateEvents();
  if (this._isAttached && this.monitorViewEvents !== false) {
    this.Dom.notifyAttach?.(this.el);
  }
  monitorViewEvents(this);
  this._initState(options);
  this._initChildViewStorage();
  this._initBehaviors();
  this._buildEventProxies();
  this.initialize.apply(this, arguments);
  if (this._isDestroyed || this._isDestroying) {
    return;
  }
  this._initStateEvents();
  this.getEmptyRegion();
  this.delegateEntityEvents();
  this._triggerEventOnBehaviors("initialize", this, options);
};
Object.assign(CollectionView$1, {
  extend: extend2,
  setRenderer: setRenderer$1,
  setDomApi: setDomApi$1,
  setEventDelegator: setEventDelegator$1,
  setDataApi: setDataApi$1,
  setStateApi: setStateApi$1
});
Object.assign(CollectionView$1.prototype, ViewMixin, {
  cidPrefix: "mncv",
  sortWithCollection: true,
  _initChildViewStorage() {
    this._children = new Container(this.Data);
    this.children = new Container(this.Data);
  },
  getEmptyRegion() {
    if (this._isDestroyed && this._emptyRegion) {
      return this._emptyRegion;
    }
    const emptyEl = this.container || this.el;
    if (this._emptyRegion && !this._emptyRegion.isDestroyed()) {
      this._emptyRegion._setElement(emptyEl);
      return this._emptyRegion;
    }
    const RegionClass = this.RegionClass || Region$1;
    this._emptyRegion = new RegionClass({
      el: emptyEl,
      replaceElement: false
    });
    this._emptyRegion._parentView = this;
    return this._emptyRegion;
  },
  _initialEvents() {
    if (this._isRendered || this._dataObserverCleanup) {
      return;
    }
    this._dataObserverCleanup = this.Data.observeCollection(this.collection, this._onCollectionChange, this);
  },
  _onCollectionChange(change) {
    if (this._isDestroying || this._isDestroyed) {
      return;
    }
    const previous = this._collectionObservedSnapshot || this._collectionSnapshot;
    const current = buildCollectionSnapshot(this.Data, this.collection, previous.models);
    const normalized = normalizeCollectionChange(change, previous, current);
    const notification = {
      change: normalized,
      snapshot: current
    };
    this._collectionObservedSnapshot = current;
    if (this._collectionChangeQueue) {
      this._collectionChangeQueue.push(notification);
      return;
    }
    const queue = this._collectionChangeQueue = [notification];
    try {
      while (queue.length) {
        const {
          change: pendingChange,
          snapshot
        } = queue[0];
        if (pendingChange.kind === "reorder") {
          this._onCollectionReorder();
        } else if (pendingChange.kind === "reset") {
          this._onCollectionReset(snapshot);
        } else {
          this._onCollectionUpdate(pendingChange);
        }
        this._collectionSnapshot = snapshot;
        queue.shift();
      }
    } finally {
      delete this._collectionChangeQueue;
      delete this._collectionObservedSnapshot;
    }
  },
  _onCollectionReorder() {
    if (this._isDestroying || this._isDestroyed) {
      return;
    }
    if (!this.sortWithCollection) {
      return;
    }
    this.sort();
  },
  _onCollectionReset(snapshot) {
    if (this._isDestroying || this._isDestroyed) {
      return;
    }
    this._destroyChildren();
    this._addChildModels(snapshot.entries.map((entry) => entry.model));
    this.sort();
  },
  _onCollectionUpdate(changes) {
    if (this._isDestroying || this._isDestroyed) {
      return;
    }
    const updateEntries = [];
    for (const {
      key,
      previous,
      current
    } of changes.updated) {
      const view = this._children.findByKey(key);
      if (view) {
        updateEntries.push({
          current,
          previous,
          view
        });
      }
    }
    const replacementViews = updateEntries.filter(({
      current,
      previous
    }) => current !== previous).map(({
      current
    }) => this._createChildView(current));
    const removedViews = [];
    const updatedViews = [];
    let replacementIndex = 0;
    for (const {
      key
    } of changes.removed) {
      const view = this._children.findByKey(key);
      if (!view) {
        continue;
      }
      this._removeChild(view);
      removedViews.push(view);
    }
    for (const {
      model
    } of changes.added) {
      const view = this._createChildView(model);
      this._addChild(view);
    }
    for (const {
      current,
      previous,
      view
    } of updateEntries) {
      if (previous !== current) {
        const childIndex = this._children.findIndexByView(view);
        this._removeChild(view);
        removedViews.push(view);
        const replacementView = replacementViews[replacementIndex++];
        this._addChild(replacementView, childIndex);
      } else {
        updatedViews.push(view);
      }
    }
    this._detachChildren(removedViews);
    for (const view of updatedViews) {
      view._isRendered = false;
    }
    this.sort();
    this._removeChildViews(removedViews);
  },
  _setChildrenFromSnapshot(snapshot) {
    const sourceViews = snapshot.entries.map(({
      key
    }) => this._children.findByKey(key)).filter(Boolean);
    const sourceViewSet = new Set(sourceViews);
    const manualViews = this._children._views.filter((view) => !sourceViewSet.has(view));
    const views = sourceViews.concat(manualViews);
    this._children._set(views);
  },
  _removeChild(view) {
    this.triggerMethod("before:remove:child", this, view);
    this.children._remove(view);
    this._children._remove(view);
    this.triggerMethod("remove:child", this, view);
  },
  _addChildModels(models) {
    const length = models.length;
    const views = Array(length);
    for (let index = 0; index < length; index++) {
      views[index] = this._addChildModel(models[index]);
    }
    return views;
  },
  _addChildModel(model) {
    const view = this._createChildView(model);
    this._addChild(view);
    return view;
  },
  _createChildView(model) {
    const ChildView = this._getChildView(model);
    const childViewOptions = this._getChildViewOptions(model);
    const view = this.buildChildView(model, ChildView, childViewOptions);
    return view;
  },
  _addChild(view, index) {
    this.triggerMethod("before:add:child", this, view);
    this._setupChildView(view);
    this._children._add(view, index);
    this.children._add(view, index);
    this.triggerMethod("add:child", this, view);
  },
  _getChildView(child) {
    const childView = this.childView;
    if (!childView) {
      throw new MarionetteError({
        code: "MN0011",
        name: classErrorName$1,
        message: 'A "childView" must be specified',
        url: "marionette.collectionview.html#collectionviews-childview"
      });
    }
    return this._getView(childView, child);
  },
  _getView(view, child) {
    if (isViewClass(view)) {
      return view;
    }
    return view.call(this, child);
  },
  _getChildViewOptions(child) {
    if (typeof this.childViewOptions === "function") {
      return this.childViewOptions(child);
    }
    return this.childViewOptions;
  },
  buildChildView(child, ChildViewClass, childViewOptions) {
    const options = childViewOptions == null ? {
      model: child
    } : {
      model: child,
      ...childViewOptions
    };
    return new ChildViewClass(options);
  },
  _setupChildView(view) {
    view._parent = this;
    view.on("destroy", this.removeChildView, this);
    this._proxyChildViewEvents(view);
  },
  _getImmediateChildren() {
    return this.children._views;
  },
  render() {
    if (this._isDestroyed) {
      return this;
    }
    this.triggerMethod("before:render", this);
    this._destroyChildren();
    if (this.collection != null) {
      this._collectionSnapshot = buildCollectionSnapshot(this.Data, this.collection);
      this._addChildModels(this._collectionSnapshot.entries.map((entry) => entry.model));
      this._initialEvents();
    }
    const template = this.getTemplate();
    if (template) {
      this._renderTemplate(template);
      this.bindUIElements();
    }
    this._getChildViewContainer();
    this.sort();
    this._isRendered = true;
    this.triggerMethod("render", this);
    return this;
  },
  _getChildViewContainer() {
    const childViewContainer = getValue(this, "childViewContainer");
    this.container = childViewContainer ? this.$(childViewContainer)[0] : this.el;
    if (!this.container) {
      throw new MarionetteError({
        code: "MN0013",
        name: classErrorName$1,
        message: `The specified "childViewContainer" was not found: ${childViewContainer}`,
        url: "marionette.collectionview.html#defining-the-childviewcontainer"
      });
    }
  },
  sort() {
    this._sortChildren();
    this.filter();
    return this;
  },
  _sortChildren() {
    if (!this._children.length) {
      return;
    }
    let viewComparator = this.getComparator();
    const notification = this._collectionChangeQueue?.[0];
    if (viewComparator) {
      this.triggerMethod("before:sort", this);
    }
    if (notification && this.sortWithCollection && viewComparator !== defaultViewComparator && notification.change.kind !== "reset") {
      this._setChildrenFromSnapshot(notification.snapshot);
    }
    if (!viewComparator) {
      return;
    }
    if (viewComparator === defaultViewComparator && this._children.length) {
      const indexByModel = /* @__PURE__ */ new Map();
      const models = notification ? notification.snapshot.entries.map((entry) => entry.model) : this.Data.models(this.collection);
      for (let index = 0; index < models.length; index++) {
        indexByModel.set(models[index], index);
      }
      viewComparator = (view) => indexByModel.get(view.model) ?? -1;
    }
    this._children._sort(viewComparator, this);
    this.triggerMethod("sort", this);
  },
  setComparator(comparator, {
    preventRender
  } = {}) {
    const comparatorChanged = this.viewComparator !== comparator;
    const shouldSort = comparatorChanged && !preventRender;
    this.viewComparator = comparator;
    if (shouldSort) {
      this.sort();
    }
    return this;
  },
  removeComparator(options) {
    return this.setComparator(null, options);
  },
  getComparator() {
    if (this.viewComparator) {
      return this.viewComparator;
    }
    if (!this.sortWithCollection || this.viewComparator === false || this.collection == null) {
      return false;
    }
    return this._viewComparator;
  },
  _viewComparator(view) {
    return this.Data.models(this.collection).indexOf(view.model);
  },
  filter() {
    if (this._isDestroyed) {
      return this;
    }
    this._filterChildren();
    this._renderChildren();
    return this;
  },
  _filterChildren() {
    if (!this._children.length) {
      return;
    }
    const viewFilter = this._getFilter();
    if (!viewFilter) {
      const shouldReset = this.children.length !== this._children.length;
      this.children._set(this._children._views, shouldReset);
      return;
    }
    this.triggerMethod("before:filter", this);
    const attachViews = [];
    const detachViews = [];
    const children = this._children._views;
    const length = children.length;
    for (let index = 0; index < length; index++) {
      const view = children[index];
      (viewFilter.call(this, view, index, children) ? attachViews : detachViews).push(view);
    }
    this._detachChildren(detachViews);
    this.children._set(attachViews, true);
    this.triggerMethod("filter", this, attachViews, detachViews);
  },
  _getFilter() {
    const viewFilter = this.getFilter();
    if (!viewFilter) {
      return false;
    }
    if (typeof viewFilter === "function") {
      return viewFilter;
    }
    if (typeof viewFilter === "string") {
      return (view) => view.model != null && this.Data.has(view.model, viewFilter) && this.Data.get(view.model, viewFilter);
    }
    return modelAttributesMatcher(this.Data, viewFilter);
  },
  getFilter() {
    return this.viewFilter;
  },
  setFilter(filter, {
    preventRender
  } = {}) {
    const filterChanged = this.viewFilter !== filter;
    const shouldRender = filterChanged && !preventRender;
    this.viewFilter = filter;
    if (shouldRender) {
      this.filter();
    }
    return this;
  },
  removeFilter(options) {
    return this.setFilter(null, options);
  },
  _detachChildren(detachingViews) {
    const length = detachingViews.length;
    for (let index = 0; index < length; index++) {
      this._detachChildView(detachingViews[index]);
    }
  },
  _detachChildView(view) {
    const shouldTriggerDetach2 = view._isAttached && this.monitorViewEvents !== false;
    if (shouldTriggerDetach2) {
      view.triggerMethod("before:detach", view);
    }
    this.detachHtml(view);
    if (shouldTriggerDetach2) {
      view._isAttached = false;
      view.triggerMethod("detach", view);
    }
    view._isShown = false;
  },
  detachHtml(view) {
    this.Dom.detachEl(view.el);
  },
  _renderChildren() {
    const views = this.children._views;
    this.triggerMethod("before:render:children", this, views);
    if (this.isEmpty()) {
      this._showEmptyView();
    } else {
      this._destroyEmptyView();
      const documentEl = this.container.ownerDocument;
      const activeElement = documentEl.activeElement;
      const selection = activeElement && typeof activeElement.selectionStart === "number" && {
        end: activeElement.selectionEnd,
        start: activeElement.selectionStart,
        direction: activeElement.selectionDirection
      };
      for (const view of views) {
        renderView(view);
      }
      const attaching = views.filter((view) => !view._isShown || view.el.parentNode !== this.container);
      if (attaching.length) {
        this._attachChildren(this._getBuffer(attaching), attaching);
      }
      if (attaching.length !== views.length && attaching.every((view) => view.el.parentNode === this.container)) {
        let childEls;
        let first = this.container.firstChild;
        let last = this.container.lastChild;
        let start = 0;
        let end = views.length - 1;
        while (start <= end) {
          const firstEl = views[start].el;
          if (first !== firstEl) {
            childEls ||= new Set(views.map((view) => view.el));
            while (first && !childEls.has(first)) {
              first = first.nextSibling;
            }
          }
          if (firstEl === first) {
            first = first.nextSibling;
            start++;
            continue;
          }
          while (last && !childEls.has(last)) {
            last = last.previousSibling;
          }
          const lastEl = views[end].el;
          if (lastEl === last) {
            last = last.previousSibling;
            end--;
          } else if (lastEl === first) {
            first = first.nextSibling;
            this.Dom.moveEl(lastEl, this.container, last.nextSibling);
            end--;
          } else if (firstEl === last) {
            last = last.previousSibling;
            this.Dom.moveEl(firstEl, this.container, first);
            start++;
          } else {
            this.Dom.moveEl(firstEl, this.container, first);
            start++;
          }
        }
      }
      if (activeElement && activeElement.isConnected && documentEl.activeElement !== activeElement && views.some((view) => view.el.contains(activeElement))) {
        activeElement.focus({
          preventScroll: true
        });
        if (selection) {
          activeElement.setSelectionRange(selection.start, selection.end, selection.direction);
        }
      }
    }
    this.triggerMethod("render:children", this, views);
  },
  _getBuffer(views) {
    const elBuffer = this.Dom.createBuffer();
    const length = views.length;
    for (let index = 0; index < length; index++) {
      const view = views[index];
      view._isShown = true;
      this.Dom.appendContents(elBuffer, view.el);
    }
    return elBuffer;
  },
  _attachChildren(els, views) {
    const shouldTriggerAttach2 = this._isAttached && this.monitorViewEvents !== false;
    views = shouldTriggerAttach2 ? views : [];
    const beforeAttachLength = views.length;
    for (let index = 0; index < beforeAttachLength; index++) {
      const view = views[index];
      if (view._isAttached) {
        continue;
      }
      view.triggerMethod("before:attach", view);
    }
    this.attachHtml(els, this.container);
    const attachLength = views.length;
    for (let index = 0; index < attachLength; index++) {
      const view = views[index];
      if (view._isAttached) {
        continue;
      }
      view._isAttached = true;
      view.triggerMethod("attach", view);
    }
  },
  attachHtml(els, container) {
    this.Dom.appendContents(container, els);
  },
  isEmpty() {
    return !this.children.length;
  },
  _showEmptyView() {
    const EmptyView = this._getEmptyView();
    if (!EmptyView) {
      this._destroyEmptyView();
      return;
    }
    const options = this._getEmptyViewOptions();
    const emptyRegion = this.getEmptyRegion();
    emptyRegion.show(new EmptyView(options));
  },
  _getEmptyView() {
    const emptyView2 = this.emptyView;
    if (emptyView2 == null || emptyView2 === false) {
      return;
    }
    if (isViewClass(emptyView2)) {
      return emptyView2;
    }
    return emptyView2.call(this);
  },
  _destroyEmptyView() {
    const emptyRegion = this.getEmptyRegion();
    if (emptyRegion.hasView()) {
      emptyRegion.empty();
    }
  },
  _getEmptyViewOptions() {
    const emptyViewOptions = this.emptyViewOptions || this.childViewOptions;
    if (typeof emptyViewOptions === "function") {
      return emptyViewOptions.call(this);
    }
    return emptyViewOptions;
  },
  swapChildViews(view1, view2) {
    if (!this._children.hasView(view1) || !this._children.hasView(view2)) {
      throw new MarionetteError({
        code: "MN0015",
        name: classErrorName$1,
        message: "Both views must be children of the collection view to swap.",
        url: "marionette.collectionview.html#swapping-child-views"
      });
    }
    this._children._swap(view1, view2);
    const el1 = view1.el;
    const el2 = view2.el;
    const parent1 = el1.parentNode;
    const parent2 = el2.parentNode;
    if (el1 !== el2 && parent1 && parent2) {
      const next1 = el1.nextSibling;
      const next2 = el2.nextSibling;
      if (el2 !== next1) {
        this.Dom.moveEl(el2, parent1, next1);
      }
      if (el1 !== next2) {
        this.Dom.moveEl(el1, parent2, next2);
      }
    }
    if (this.children.hasView(view1) !== this.children.hasView(view2)) {
      this.filter();
    } else {
      this.children._swap(view1, view2);
    }
    return this;
  },
  addChildView(view, index, options = {}) {
    if (this._isDestroying || this._isDestroyed) {
      return view;
    }
    if (!view || view._isDestroyed) {
      return view;
    }
    if (view._parent) {
      throw new MarionetteError({
        code: "MN0003",
        name: classErrorName$1,
        message: "View is already managed by a Region or CollectionView",
        url: "marionette.region.html#showing-a-view"
      });
    }
    const indexType = typeof index;
    if (index !== null && (indexType === "object" || indexType === "function")) {
      options = index;
    }
    if (options.index != null) {
      index = options.index;
    }
    if (!this._isRendered) {
      this.render();
    }
    this._addChild(view, typeof index === "number" ? index : void 0);
    if (options.preventRender) {
      return view;
    }
    if (typeof index === "number") {
      this._renderChildren();
    } else {
      this.sort();
    }
    return view;
  },
  detachChildView(view) {
    this.removeChildView(view, {
      shouldDetach: true
    });
    return view;
  },
  removeChildView(view, options) {
    if (!view || !this._children.hasView(view)) {
      return view;
    }
    this._removeChildView(view, options);
    this._removeChild(view);
    if (this.isEmpty()) {
      this._showEmptyView();
    }
    return view;
  },
  _removeChildViews(views) {
    for (const view of views) {
      this._removeChildView(view);
    }
  },
  _removeChildView(view, {
    shouldDetach: shouldDetach2
  } = {}) {
    view.off("destroy", this.removeChildView, this);
    shouldDetach2 ? this._detachChildView(view) : this._destroyChildView(view);
    this.stopListening(view);
    delete view._parent;
  },
  _destroyChildView(view) {
    if (view._isDestroyed) {
      return;
    }
    const shouldDisableEvents = this.monitorViewEvents === false;
    destroyView(view, shouldDisableEvents);
  },
  _removeChildren() {
    const emptyRegion = this.getEmptyRegion();
    this._destroyChildren();
    emptyRegion.destroy();
  },
  _destroyChildren() {
    if (!this._children.length) {
      return;
    }
    this.triggerMethod("before:destroy:children", this);
    const children = this._children._views;
    const container = this.container;
    if (this.monitorViewEvents === false && canDetachContents(container, children)) {
      this.Dom.detachContents(container);
    }
    this._removeChildViews(children);
    this._children._init();
    this.children._init();
    this.triggerMethod("destroy:children", this);
  }
});
var defaultViewComparator = CollectionView$1.prototype._viewComparator;
var ClassOptions$1 = ["collectionEvents", "events", "modelEvents", "stateEvents", "triggers", "ui"];
var Behavior$1 = function(options, view) {
  this.view = view;
  this._setOptions(options, ClassOptions$1);
  this.cid = uniqueId(this.cidPrefix);
  this._initViewEvents();
  this.el = view.el;
  this._initState(options);
  this.ui = {
    ...getValue(this, "ui"),
    ...getValue(view, "ui")
  };
  this.listenTo(view, "all", this.triggerMethod);
  this.initialize.apply(this, arguments);
  this._initStateEvents();
  if (this._isDestroyed) {
    return;
  }
  this._delegateViewEvents(this.view);
};
Object.assign(Behavior$1, {
  extend: extend2,
  setEventDelegator: setEventDelegator$1,
  setStateApi: setStateApi$1
});
Object.assign(Behavior$1.prototype, CommonMixin, DelegateEntityEventsMixin, StateMixin, UIMixin, ViewEventsMixin, {
  cidPrefix: "mnb",
  $() {
    return this.view.$.apply(this.view, arguments);
  },
  destroy() {
    this._isDestroyed = true;
    this._undelegateViewEvents();
    this._destroyState();
    this.stopListening();
    this.view._removeBehavior(this);
    this._undelegateEntityEvents();
    return this;
  },
  bindUIElements() {
    if (this.view._isDestroying || this.view._isDestroyed) {
      return this;
    }
    this._bindUIElements();
    return this;
  },
  unbindUIElements() {
    this._unbindUIElements();
    return this;
  },
  getUI(name) {
    return this._getUI(name);
  },
  delegateEntityEvents() {
    if (this.view._isDestroying || this.view._isDestroyed) {
      return this;
    }
    this._delegateEntityEvents(this.view.model, this.view.collection, this.view.Data);
    return this;
  },
  undelegateEntityEvents() {
    this._undelegateEntityEvents();
    return this;
  }
});
var ClassOptions = ["channelName", "radioEvents", "radioRequests", "region", "regionClass", "stateEvents"];
var DESTROYED = "destroyed";
var DESTROYING = "destroying";
var RESTARTING = "restarting";
var RUNNING = "running";
var STARTING = "starting";
var STOPPED = "stopped";
var STOPPING = "stopping";
var classErrorName = "ApplicationError";
var Application$1 = function(options) {
  this._setOptions(options, ClassOptions);
  this.cid = uniqueId(this.cidPrefix);
  this.preinitialize.apply(this, arguments);
  this._initRegion();
  this._initRadio();
  this._initState(options);
  this.initialize.apply(this, arguments);
  this._initStateEvents();
};
function isCurrentOperation(application, operation) {
  return application._lifecycleOperation === operation;
}
function throwApplicationOwnershipConflict(message) {
  throw new MarionetteError({
    code: "MN0031",
    name: classErrorName,
    message
  });
}
function isTerminal(application) {
  return application._lifecycleState === DESTROYING || application._lifecycleState === DESTROYED;
}
function hasTerminalOwner(application) {
  let owner = application._parentApp;
  while (owner) {
    if (isTerminal(owner)) {
      return true;
    }
    owner = owner._parentApp;
  }
  return false;
}
function isSameChildApp(owner, name, application) {
  return application._parentApp === owner && application._name === name && owner._childApps?.get(name) === application;
}
function assertChildAppCanRegister(owner, name, application) {
  if (name.length === 0) {
    throwApplicationOwnershipConflict("A child Application name must be a non-empty string.");
  }
  if (application[runtimeId] !== owner[runtimeId]) {
    throwApplicationOwnershipConflict("A child Application must belong to the same Marionette runtime as its owner.");
  }
  if (isSameChildApp(owner, name, application)) {
    return;
  }
  if (application === owner) {
    throwApplicationOwnershipConflict("An Application cannot own itself.");
  }
  if (application._parentApp !== void 0) {
    throwApplicationOwnershipConflict("An Application instance cannot be registered with more than one owner or name.");
  }
  if (owner._childApps?.has(name)) {
    throwApplicationOwnershipConflict(`Child Application name "${name}" is already registered.`);
  }
  let parent = owner;
  while (parent) {
    if (parent === application) {
      throwApplicationOwnershipConflict("A child Application cannot be an ancestor of its owner.");
    }
    parent = parent._parentApp;
  }
}
function removeChildAppReference(owner, name, application) {
  owner._childApps.delete(name);
  delete application._parentApp;
  delete application._name;
  if (owner._childApps.size === 0) {
    delete owner._childApps;
  }
}
async function destroyChildApps(application, options) {
  for (const child of application._childApps.values()) {
    await child.destroy(options);
  }
}
function hasStableLifecycleState(application, state) {
  return application._lifecycleState === state && !application._lifecycleOperation;
}
async function startChildApps(application, operation, options) {
  if (!application._childApps) {
    return true;
  }
  for (const child of application._childApps.values()) {
    if (!isCurrentOperation(application, operation)) {
      return false;
    }
    const started = await child.start(options);
    if (!isCurrentOperation(application, operation) || !started || !hasStableLifecycleState(child, RUNNING)) {
      return false;
    }
  }
  return true;
}
function canStopChildren(application, operation) {
  if (isCurrentOperation(application, operation)) {
    return true;
  }
  const current = application._lifecycleOperation;
  return current?.stopReadiness !== void 0 && current.stopReadiness === operation.stopReadiness && current.kind !== "start";
}
function cancelStopReadiness(operation) {
  operation.stopReadiness.isCanceled = true;
  return false;
}
async function stopChildApps(application, operation, options) {
  if (!application._childApps) {
    return true;
  }
  for (const child of application._childApps.values()) {
    if (!canStopChildren(application, operation)) {
      return cancelStopReadiness(operation);
    }
    const stopped = await child.stop(options);
    if (!canStopChildren(application, operation)) {
      return cancelStopReadiness(operation);
    }
    if (stopped && hasStableLifecycleState(child, STOPPED)) {
      continue;
    }
    if (!isTerminal(application)) {
      return cancelStopReadiness(operation);
    }
    await child.destroy(options);
  }
  return true;
}
function hasActiveChildApps(application) {
  for (const child of application._childApps.values()) {
    if (child._lifecycleState !== STOPPED && child._lifecycleState !== DESTROYED) {
      return true;
    }
  }
  return false;
}
function emptyView(application, options) {
  const region = application.getRegion();
  if (region?.currentView) {
    region.empty(options);
  }
}
function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {
    promise,
    reject,
    resolve
  };
}
function beginReadiness(operation, options, callback) {
  const deferred = createDeferred();
  const controller = new AbortController();
  const readiness = {
    ...deferred,
    context: {
      signal: controller.signal
    },
    controller,
    options
  };
  operation.readiness = readiness;
  try {
    Promise.resolve(callback(readiness.context)).then(readiness.resolve, readiness.reject);
  } catch (error) {
    readiness.reject(error);
  }
  return readiness;
}
function completeReadiness(operation) {
  delete operation.readiness;
}
function getFailureState(application, operation) {
  if (operation?.stopReadiness) {
    return operation.failureState;
  }
  return application._lifecycleState === RUNNING ? RUNNING : STOPPED;
}
function supersedeOperation(application) {
  const operation = application._lifecycleOperation;
  if (!operation) {
    return;
  }
  delete application._lifecycleOperation;
  operation.resolve(!!operation.isCompleting);
  return operation;
}
function completeOperation(application, operation) {
  if (!isCurrentOperation(application, operation)) {
    return;
  }
  delete application._lifecycleOperation;
  operation.resolve(true);
}
function cancelOperation(application, operation) {
  delete application._lifecycleOperation;
  application._lifecycleState = operation.failureState;
  operation.resolve(false);
}
function failOperation(application, operation, error) {
  if (!isCurrentOperation(application, operation)) {
    return;
  }
  delete application._lifecycleOperation;
  application._lifecycleState = operation.failureState;
  operation.reject(error);
}
function runOperation(application, operation, callback) {
  (async () => {
    try {
      await callback();
      completeOperation(application, operation);
    } catch (error) {
      failOperation(application, operation, error);
    }
  })();
}
function beginOperation(application, kind, state, failureState, callback) {
  const superseded = supersedeOperation(application);
  const deferred = createDeferred();
  const stopReadiness = superseded?.stopReadiness?.isCanceled ? void 0 : superseded?.stopReadiness;
  const operation = {
    ...deferred,
    kind,
    failureState,
    readiness: stopReadiness,
    stopReadiness
  };
  application._lifecycleOperation = operation;
  application._lifecycleState = state;
  if (superseded?.readiness && superseded.readiness !== stopReadiness) {
    superseded.readiness.controller.abort();
  }
  if (!isCurrentOperation(application, operation)) {
    return deferred.promise;
  }
  runOperation(application, operation, () => callback(operation));
  return deferred.promise;
}
async function startApplication(application, operation, options) {
  if (operation.stopReadiness) {
    const readiness2 = operation.stopReadiness;
    const childrenStopped = await readiness2.promise;
    if (!isCurrentOperation(application, operation)) {
      return;
    }
    completeReadiness(operation);
    if (childrenStopped) {
      operation.failureState = STOPPED;
    }
    delete operation.stopReadiness;
  }
  const readiness = beginReadiness(operation, options, async (context) => {
    await application.triggerMethod("before:start", application, options, context);
    return startChildApps(application, operation, options);
  });
  const childrenStarted = await readiness.promise;
  if (!isCurrentOperation(application, operation)) {
    return;
  }
  completeReadiness(operation);
  if (!childrenStarted) {
    cancelOperation(application, operation);
    return;
  }
  application._lifecycleState = RUNNING;
  operation.failureState = RUNNING;
  operation.isCompleting = true;
  application.triggerMethod("start", application, options);
}
async function stopApplication(application, operation, options) {
  try {
    if (!operation.stopReadiness) {
      const readiness2 = beginReadiness(operation, options, async (context) => {
        await application.triggerMethod("before:stop", application, options, context);
        return stopChildApps(application, operation, options);
      });
      operation.stopReadiness = readiness2;
    }
    const readiness = operation.stopReadiness;
    const childrenStopped = await readiness.promise;
    if (!isCurrentOperation(application, operation)) {
      return;
    }
    completeReadiness(operation);
    delete operation.stopReadiness;
    if (!childrenStopped) {
      cancelOperation(application, operation);
      return;
    }
    emptyView(application, readiness.options);
    if (!isCurrentOperation(application, operation)) {
      return;
    }
    operation.failureState = STOPPED;
    operation.isStopped = true;
    if (operation.kind === "stop") {
      application._lifecycleState = STOPPED;
      operation.isCompleting = true;
    }
    application.triggerMethod("stop", application, readiness.options);
    operation.stopDeferred?.resolve(true);
  } catch (error) {
    operation.stopDeferred?.reject(error);
    throw error;
  }
}
var ApplicationBase = /* @__PURE__ */ ((methods) => {
  Object.assign(Application$1, {
    extend: extend2,
    setStateApi: setStateApi$1
  });
  Object.assign(Application$1.prototype, CommonMixin, DestroyMixin, RadioMixin, StateMixin, methods);
  Object.defineProperty(Application$1.prototype, runtimeId, {
    value: defaultRuntimeId
  });
  return Application$1;
})({
  preinitialize() {
  },
  cidPrefix: "mna",
  _lifecycleState: STOPPED,
  isRunning() {
    return this._lifecycleState === RUNNING;
  },
  start(options) {
    if (isTerminal(this) || hasTerminalOwner(this)) {
      return Promise.resolve(false);
    }
    const operation = this._lifecycleOperation;
    if (operation?.kind === "start") {
      return operation.promise;
    }
    if (this._lifecycleState === RUNNING && !operation) {
      return Promise.resolve(true);
    }
    const failureState = getFailureState(this, operation);
    return beginOperation(this, "start", STARTING, failureState, (nextOperation) => {
      return startApplication(this, nextOperation, options);
    });
  },
  stop(options) {
    if (this._lifecycleState === DESTROYED) {
      return Promise.resolve(true);
    }
    const operation = this._lifecycleOperation;
    if (this._lifecycleState === DESTROYING) {
      if (!operation?.stopReadiness) {
        return Promise.resolve(true);
      }
      if (!operation.stopDeferred) {
        operation.stopDeferred = createDeferred();
      }
      return operation.stopDeferred.promise;
    }
    if (operation?.kind === "stop") {
      return operation.promise;
    }
    if (operation?.isStopped) {
      const superseded = supersedeOperation(this);
      this._lifecycleState = STOPPED;
      superseded.readiness?.controller.abort();
      return Promise.resolve(true);
    }
    if (this._lifecycleState === STOPPED && !operation) {
      try {
        emptyView(this, options);
        return Promise.resolve(true);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    const failureState = getFailureState(this, operation);
    return beginOperation(this, "stop", STOPPING, failureState, (nextOperation) => {
      return stopApplication(this, nextOperation, options);
    });
  },
  restart(options) {
    if (isTerminal(this) || hasTerminalOwner(this)) {
      return Promise.resolve(false);
    }
    const operation = this._lifecycleOperation;
    if (operation?.kind === "restart") {
      return operation.promise;
    }
    const shouldStop = !operation?.isStopped && this._lifecycleState !== STOPPED;
    const failureState = getFailureState(this, operation);
    return beginOperation(this, "restart", RESTARTING, failureState, async (nextOperation) => {
      if (shouldStop) {
        await stopApplication(this, nextOperation, options);
      } else {
        emptyView(this, options);
      }
      if (!isCurrentOperation(this, nextOperation)) {
        return;
      }
      await startApplication(this, nextOperation, options);
    });
  },
  destroy(options) {
    if (this._lifecycleState === DESTROYED) {
      return Promise.resolve(true);
    }
    const operation = this._lifecycleOperation;
    if (operation?.kind === "destroy") {
      return operation.promise;
    }
    const shouldStop = !operation?.isStopped && this._lifecycleState !== STOPPED;
    const failureState = getFailureState(this, operation);
    return beginOperation(this, "destroy", DESTROYING, failureState, async (nextOperation) => {
      if (shouldStop) {
        await stopApplication(this, nextOperation, options);
      } else if (this._childApps && hasActiveChildApps(this)) {
        await stopChildApps(this, nextOperation, options);
      }
      emptyView(this, options);
      const readiness = beginReadiness(nextOperation, options, (context) => {
        return this.triggerMethod("before:destroy", this, options, context);
      });
      await readiness.promise;
      completeReadiness(nextOperation);
      if (this._childApps) {
        await destroyChildApps(this, options);
      }
      const ownedRegion = this._ownedRegion;
      ownedRegion?.destroy(options);
      delete this._region;
      delete this._ownedRegion;
      this._isDestroyed = true;
      this._lifecycleState = DESTROYED;
      nextOperation.failureState = DESTROYED;
      nextOperation.isCompleting = true;
      if (this._parentApp) {
        removeChildAppReference(this._parentApp, this._name, this);
      }
      this._destroyRadio();
      this._destroyState();
      this.triggerMethod("destroy", this, options);
      this.stopListening();
    });
  },
  addChildApp(name, application) {
    if (isTerminal(this)) {
      return application;
    }
    if (application[runtimeId] === this[runtimeId] && isTerminal(application)) {
      return application;
    }
    assertChildAppCanRegister(this, name, application);
    if (isSameChildApp(this, name, application)) {
      return application;
    }
    const children = this._childApps || (this._childApps = /* @__PURE__ */ new Map());
    application._parentApp = this;
    application._name = name;
    children.set(name, application);
    return application;
  },
  removeChildApp(name, options) {
    const application = this.getChildApp(name);
    if (!application) {
      return Promise.resolve();
    }
    return application.destroy(options).then(() => application);
  },
  hasChildApp(name) {
    return !!this._childApps?.has(name);
  },
  getChildApp(name) {
    return this._childApps?.get(name);
  },
  getChildApps() {
    const applications = {};
    this._childApps?.forEach((application, name) => {
      setProperty(applications, name, application);
    });
    return applications;
  },
  getName() {
    return this._name;
  },
  regionClass: Region$1,
  _initRegion() {
    const region = this.region;
    if (!region) {
      return;
    }
    const defaults = {
      [runtimeId]: this[runtimeId],
      regionClass: this.regionClass
    };
    this._region = buildRegion(region, defaults);
    if (!(region instanceof Region$1)) {
      this._ownedRegion = this._region;
    }
  },
  getRegion() {
    return this._region;
  },
  showView(view, ...args) {
    if (isTerminal(this)) {
      return view;
    }
    this.getRegion().show(view, ...args);
    return view;
  },
  getView() {
    return this.getRegion()?.currentView;
  }
});
var version2 = "5.0.0-beta.2";
function copyApi(api) {
  return {
    ...api
  };
}
var DefaultDataApi = copyApi(DataApi);
var DefaultDomApi = copyApi(DomApi);
var DefaultEventDelegator = copyApi(EventDelegator);
var DefaultStateApi = copyApi(StateApi);
function composeClass(BaseClass, properties) {
  return BaseClass.extend(properties);
}
function setClassReference(Class, name, value) {
  Object.defineProperty(Class.prototype, name, {
    configurable: true,
    value,
    writable: true
  });
}
function setDomApiFor(CollectionView2, Region2, View2, mixin) {
  CollectionView2.setDomApi(mixin);
  Region2.setDomApi(mixin);
  View2.setDomApi(mixin);
}
function setDataApiFor(CollectionView2, View2, mixin) {
  CollectionView2.setDataApi(mixin);
  View2.setDataApi(mixin);
}
function setStateApiFor(Application2, Behavior2, CollectionView2, MnObject2, View2, mixin) {
  Application2.setStateApi(mixin);
  Behavior2.setStateApi(mixin);
  CollectionView2.setStateApi(mixin);
  MnObject2.setStateApi(mixin);
  View2.setStateApi(mixin);
}
function setRendererFor(CollectionView2, View2, renderer) {
  CollectionView2.setRenderer(renderer);
  View2.setRenderer(renderer);
}
function setEventDelegatorFor(Behavior2, CollectionView2, View2, delegator) {
  Behavior2.setEventDelegator(delegator);
  CollectionView2.setEventDelegator(delegator);
  View2.setEventDelegator(delegator);
}
var Region = Region$1;
var View = View$1;
var CollectionView = CollectionView$1;
var Behavior = Behavior$1;
var MnObject = MarionetteObject;
var Application = ApplicationBase;
function setDomApi(mixin) {
  setDomApiFor(CollectionView, Region, View, mixin);
}
function setDataApi(mixin) {
  setDataApiFor(CollectionView, View, mixin);
}
function setStateApi(mixin) {
  setStateApiFor(Application, Behavior, CollectionView, MnObject, View, mixin);
}
function setRenderer(renderer) {
  setRendererFor(CollectionView, View, renderer);
}
function setEventDelegator(delegator) {
  setEventDelegatorFor(Behavior, CollectionView, View, delegator);
}
function createMarionette() {
  const Data = copyApi(DefaultDataApi);
  const Dom = copyApi(DefaultDomApi);
  const Delegator = copyApi(DefaultEventDelegator);
  const State = copyApi(DefaultStateApi);
  const runtimeRadio = createRadio();
  const isolatedRuntimeId = {};
  const RuntimeRegion = composeClass(Region$1, {
    Dom
  });
  const RuntimeView = composeClass(View$1, {
    Data,
    Dom,
    EventDelegator: Delegator,
    State,
    _renderHtml: TemplateRenderMixin._renderHtml,
    regionClass: RuntimeRegion
  });
  const RuntimeCollectionView = composeClass(CollectionView$1, {
    Data,
    Dom,
    EventDelegator: Delegator,
    State,
    _renderHtml: TemplateRenderMixin._renderHtml
  });
  const RuntimeBehavior = composeClass(Behavior$1, {
    EventDelegator: Delegator,
    State
  });
  const RuntimeMnObject = composeClass(MarionetteObject, {
    Radio: runtimeRadio,
    State
  });
  const RuntimeApplication = composeClass(ApplicationBase, {
    Radio: runtimeRadio,
    State,
    regionClass: RuntimeRegion
  });
  setClassReference(RuntimeRegion, runtimeId, isolatedRuntimeId);
  setClassReference(RuntimeView, runtimeId, isolatedRuntimeId);
  setClassReference(RuntimeCollectionView, "RegionClass", RuntimeRegion);
  setClassReference(RuntimeApplication, runtimeId, isolatedRuntimeId);
  return {
    Application: RuntimeApplication,
    Behavior: RuntimeBehavior,
    CollectionView: RuntimeCollectionView,
    DataApi: Data,
    DomApi: Dom,
    Events,
    MarionetteError,
    MnObject: RuntimeMnObject,
    Radio: runtimeRadio,
    Region: RuntimeRegion,
    StateApi: State,
    VERSION: version2,
    View: RuntimeView,
    extend: extend2,
    monitorViewEvents,
    setDataApi(mixin) {
      setDataApiFor(RuntimeCollectionView, RuntimeView, mixin);
    },
    setDomApi(mixin) {
      setDomApiFor(RuntimeCollectionView, RuntimeRegion, RuntimeView, mixin);
    },
    setEventDelegator(delegator) {
      setEventDelegatorFor(RuntimeBehavior, RuntimeCollectionView, RuntimeView, delegator);
    },
    setRenderer(renderer) {
      setRendererFor(RuntimeCollectionView, RuntimeView, renderer);
    },
    setStateApi(mixin) {
      setStateApiFor(RuntimeApplication, RuntimeBehavior, RuntimeCollectionView, RuntimeMnObject, RuntimeView, mixin);
    }
  };
}

// node_modules/@mnjs/utils/dist/index.js
var getObjectTag2 = Function.call.bind(Object.prototype.toString);
function setProperty2(target, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true
    });
  } else {
    target[key] = value;
  }
}
function extendRuntime2(protoProps, staticProps) {
  const parent = this;
  let child;
  if (protoProps && Object.hasOwn(protoProps, "constructor")) {
    child = protoProps.constructor;
  } else {
    child = function() {
      return parent.apply(this, arguments);
    };
  }
  for (const key in parent) {
    setProperty2(child, key, parent[key]);
  }
  Object.defineProperties(child, Object.getOwnPropertyDescriptors({
    ...staticProps
  }));
  child.prototype = Object.create(parent.prototype, Object.getOwnPropertyDescriptors({
    ...protoProps,
    constructor: child
  }));
  child.__super__ = parent.prototype;
  return child;
}
var extend3 = extendRuntime2;
var version3 = "5.0.0-beta.2";
var packageJson2 = {
  version: version3
};
var errorProps2 = ["code", "description", "fileName", "lineNumber", "name", "message", "number", "url"];
var MarionetteError2 = extend3.call(Error, {
  urlRoot: `http://marionettejs.com/docs/v${packageJson2.version}/`,
  url: "",
  constructor: function(options) {
    const error = Error.call(this, options.message);
    const nativeProperties = {};
    const optionProperties = {};
    for (const property of errorProps2) {
      const value = error[property];
      if (property in error) {
        nativeProperties[property] = value;
      }
    }
    const optionSource = Object(options);
    for (const property of errorProps2) {
      const value = optionSource[property];
      if (property in optionSource) {
        optionProperties[property] = value;
      }
    }
    if (this !== void 0 && this !== null) {
      Object.assign(this, nativeProperties, optionProperties);
    }
    this.captureStackTrace(error);
    this.url = this.urlRoot + this.url;
  },
  captureStackTrace(fallbackError) {
    if (typeof Error.captureStackTrace !== "function") {
      this.stack = fallbackError.stack;
      return;
    }
    Error.captureStackTrace(this, MarionetteError2);
  },
  toString() {
    return `${this.name}: ${this.message} See: ${this.url}`;
  }
});
function getOption2(optionName) {
  if (!optionName) {
    return;
  }
  const context = this;
  if (context.options && context.options[optionName] !== void 0) {
    return context.options[optionName];
  } else {
    return context[optionName];
  }
}
var splitter2 = /(^|:)(\w)/gi;
var methodCache2 = /* @__PURE__ */ Object.create(null);
function getEventName2(match, prefix, eventName) {
  return eventName.toUpperCase();
}
var getOnMethodName2 = function(event) {
  if (!methodCache2[event]) {
    methodCache2[event] = "on" + event.replace(splitter2, getEventName2);
  }
  return methodCache2[event];
};
function triggerMethod2(event, ...args) {
  const methodName = getOnMethodName2(event);
  const method = getOption2.call(this, methodName);
  let result;
  if (typeof method === "function") {
    result = method.apply(this, args);
  }
  this.trigger.apply(this, arguments);
  return result;
}
var eventSplitter2 = /\s+/;
function buildEventArgs2(name, callback, context, listener) {
  if (name && typeof name === "object") {
    const eventContext = context === void 0 ? callback : context;
    const eventArgs = [];
    const names = Object.keys(name);
    for (let i = 0; i < names.length; i++) {
      const key = names[i];
      const args = buildEventArgs2(key, name[key], eventContext, listener);
      for (let j = 0; j < args.length; j++) {
        eventArgs.push(args[j]);
      }
    }
    return eventArgs;
  }
  if (name && eventSplitter2.test(name)) {
    const names = name.split(eventSplitter2);
    const eventArgs = [];
    for (let i = 0; i < names.length; i++) {
      eventArgs.push({
        name: names[i],
        callback,
        context,
        listener
      });
    }
    return eventArgs;
  }
  return [{
    name,
    callback,
    context,
    listener
  }];
}
function callHandler2(callback, context, args = []) {
  switch (args.length) {
    case 0:
      return callback.call(context);
    case 1:
      return callback.call(context, args[0]);
    case 2:
      return callback.call(context, args[0], args[1]);
    case 3:
      return callback.call(context, args[0], args[1], args[2]);
    default:
      return callback.apply(context, args);
  }
}
function onceWrap2(callback, offCallback) {
  let called = false;
  let result;
  function onceCallback() {
    if (called) {
      return result;
    }
    called = true;
    offCallback(onceCallback);
    result = callback.apply(this, arguments);
    return result;
  }
  onceCallback._callback = callback;
  return onceCallback;
}
var idCounter2 = 0;
function uniqueId2(prefix) {
  const id = `${++idCounter2}`;
  return prefix ? prefix + id : id;
}
var objectKeys3 = Object.keys;
var listening2;
function getKeys3(object) {
  return object == null ? [] : objectKeys3(object);
}
var onApi2 = function({
  events,
  name,
  callback,
  context,
  ctx,
  listener
}) {
  let handlers = Object.hasOwn(events, name) ? events[name] : void 0;
  if (!handlers) {
    handlers = [];
    setProperty2(events, name, handlers);
  }
  handlers.push({
    callback,
    context,
    ctx: context || ctx,
    listener
  });
  return events;
};
var onReducer2 = function(events, {
  name,
  callback,
  context
}) {
  if (!callback) {
    return events;
  }
  const listener = listening2;
  events = onApi2({
    events,
    name,
    callback,
    context,
    ctx: this,
    listener
  });
  if (listener) {
    const listeners = this._rdListeners || (this._rdListeners = {});
    listeners[listener.listenerId] = listener;
    listener.count++;
    listener.interop = false;
  }
  return events;
};
var cleanupListener2 = function({
  obj,
  listeneeId,
  listenerId,
  listeningTo
}) {
  delete listeningTo[listeneeId];
  if (obj._rdListeners) {
    delete obj._rdListeners[listenerId];
  }
};
var offReducer2 = function(events, {
  name,
  callback,
  context
}) {
  const names = name ? [name] : getKeys3(events);
  for (let nameIndex = 0, namesLength = names.length; nameIndex < namesLength; nameIndex++) {
    const key = names[nameIndex];
    const handlers = Object.hasOwn(events, key) ? events[key] : void 0;
    if (!handlers) {
      continue;
    }
    const remaining = [];
    for (let index = 0, length = handlers.length; index < length; index++) {
      const handler = handlers[index];
      if (callback && callback !== handler.callback && callback !== handler.callback._callback || context && context !== handler.context) {
        remaining.push(handler);
        continue;
      }
      if (handler.listener) {
        const listener = handler.listener;
        listener.count--;
        if (!listener.count) {
          cleanupListener2(listener);
        }
      }
    }
    events[key] = remaining;
    if (!events[key].length) {
      delete events[key];
    }
  }
  return events;
};
var getListener2 = function(obj, listenerObj) {
  const listeneeId = obj._rdListenId || (obj._rdListenId = uniqueId2("l"));
  const listeningTo = listenerObj._rdListeningTo || (listenerObj._rdListeningTo = {});
  const listener = listeningTo[listeneeId];
  if (!listener) {
    const listenerId = listenerObj._rdListenId || (listenerObj._rdListenId = uniqueId2("l"));
    listeningTo[listeneeId] = {
      obj,
      listeneeId,
      listenerId,
      listeningTo,
      count: 0,
      interop: true,
      _rdEvents: {}
    };
    return listeningTo[listeneeId];
  }
  return listener;
};
var listenToApi2 = function({
  name,
  callback,
  context,
  listener
}) {
  if (!callback) {
    return;
  }
  const previousListening = listening2;
  listening2 = listener;
  try {
    listener.obj.on(name, callback, context);
  } finally {
    listening2 = previousListening;
  }
  if (listener.interop) {
    listener._rdEvents = onApi2({
      events: listener._rdEvents,
      name,
      callback,
      context,
      ctx: context
    });
  }
};
function buildOnceMap2(eventArgs, offCallback) {
  const events = {};
  for (let index = 0, length = eventArgs.length; index < length; index++) {
    const {
      name,
      callback
    } = eventArgs[index];
    if (!callback) {
      continue;
    }
    const onceCallback = onceWrap2(callback, (callbackToRemove) => {
      offCallback(name, callbackToRemove);
    });
    setProperty2(events, name, onceCallback);
  }
  return events;
}
var triggerApi2 = function({
  events,
  name,
  args
}) {
  const objEvents = Object.hasOwn(events, name) ? events[name] : void 0;
  const registeredAllEvents = Object.hasOwn(events, "all") ? events.all : void 0;
  const allEvents = objEvents && registeredAllEvents ? registeredAllEvents.slice() : registeredAllEvents;
  if (objEvents) {
    triggerEvents2(objEvents, args);
  }
  if (allEvents) {
    triggerEvents2(allEvents, [name].concat(args));
  }
};
var triggerEvents2 = function(events, args) {
  for (let index = 0, length = events.length; index < length; index++) {
    const {
      callback,
      ctx
    } = events[index];
    callHandler2(callback, ctx, args);
  }
};
function reduceEventArgs2(context, eventArgs, events, reducer) {
  for (let index = 0, length = eventArgs.length; index < length; index++) {
    events = reducer.call(context, events, eventArgs[index]);
  }
  return events;
}
var Events2 = {
  on(name, callback, context) {
    const eventArgs = buildEventArgs2(name, callback, context);
    this._rdEvents = reduceEventArgs2(this, eventArgs, this._rdEvents || {}, onReducer2);
    return this;
  },
  off(name, callback, context) {
    if (!this._rdEvents) {
      return this;
    }
    if (!name && !context && !callback) {
      this._rdEvents = void 0;
      const listeners = this._rdListeners;
      const listenerIds = getKeys3(listeners);
      for (let index = 0, length = listenerIds.length; index < length; index++) {
        const listenerId = listenerIds[index];
        cleanupListener2(listeners[listenerId]);
      }
      return this;
    }
    const eventArgs = buildEventArgs2(name, callback, context);
    this._rdEvents = reduceEventArgs2(void 0, eventArgs, this._rdEvents, offReducer2);
    return this;
  },
  once(name, callback, context) {
    const eventArgs = buildEventArgs2(name, callback, context);
    const events = buildOnceMap2(eventArgs, this.off.bind(this));
    if (typeof name === "string" && context == null) {
      callback = void 0;
    }
    return this.on(events, callback, context);
  },
  listenTo(obj, name, callback) {
    if (!obj) {
      return this;
    }
    const listener = getListener2(obj, this);
    const eventArgs = buildEventArgs2(name, callback, this, listener);
    for (let index = 0, length = eventArgs.length; index < length; index++) {
      listenToApi2(eventArgs[index]);
    }
    return this;
  },
  listenToOnce(obj, name, callback) {
    const eventArgs = buildEventArgs2(name, callback, this);
    const events = buildOnceMap2(eventArgs, this.stopListening.bind(this, obj));
    return this.listenTo(obj, events);
  },
  stopListening(obj, name, callback) {
    const listeningTo = this._rdListeningTo;
    if (!listeningTo) {
      return this;
    }
    const eventArgs = buildEventArgs2(name, callback, this);
    const listenerIds = obj ? [obj._rdListenId] : getKeys3(listeningTo);
    for (let i = 0, listenerIdsLength = listenerIds.length; i < listenerIdsLength; i++) {
      const listener = listeningTo[listenerIds[i]];
      if (!listener) {
        break;
      }
      for (let index = 0, length = eventArgs.length; index < length; index++) {
        const args = eventArgs[index];
        listener.obj.off(args.name, args.callback, this);
        if (listener.interop) {
          listener._rdEvents = offReducer2(listener._rdEvents, args);
          if (!getKeys3(listener._rdEvents).length) {
            cleanupListener2(listener);
          }
        }
      }
    }
    return this;
  },
  trigger(name, ...args) {
    const events = this._rdEvents;
    if (!events) {
      return this;
    }
    if (name && typeof name === "object") {
      const names = getKeys3(name);
      for (let index = 0, length = names.length; index < length; index++) {
        const key = names[index];
        triggerApi2({
          events,
          name: key,
          args: [name[key]]
        });
      }
      return this;
    }
    if (name && eventSplitter2.test(name)) {
      const names = name.split(eventSplitter2);
      for (let index = 0, length = names.length; index < length; index++) {
        const n = names[index];
        triggerApi2({
          events,
          name: n,
          args
        });
      }
      return this;
    }
    triggerApi2({
      events,
      name,
      args
    });
    return this;
  },
  triggerMethod: triggerMethod2
};

// node_modules/@mnjs/data/dist/index.js
var modelId = 0;
function getDefaults(model) {
  const defaults = model.defaults;
  return typeof defaults === "function" ? defaults.call(model) : defaults;
}
function noChange(model) {
  if (!model._isDestroyed) {
    model.changed = {};
  }
  return model;
}
function update(model, attributes, options = {}, removed = []) {
  if (model._isDestroyed) {
    return model;
  }
  options = options == null ? {} : options;
  const previous = {};
  const changed = {};
  const changedKeys = [];
  for (const key of removed) {
    if (!Object.hasOwn(model.attributes, key)) {
      continue;
    }
    setProperty2(previous, key, model.attributes[key]);
    setProperty2(changed, key, void 0);
    changedKeys.push(key);
    delete model.attributes[key];
  }
  for (const key of Object.keys(attributes)) {
    const value = attributes[key];
    const hadKey = Object.hasOwn(model.attributes, key);
    if (hadKey && Object.is(model.attributes[key], value)) {
      continue;
    }
    if (hadKey) {
      setProperty2(previous, key, model.attributes[key]);
    }
    setProperty2(changed, key, value);
    changedKeys.push(key);
    setProperty2(model.attributes, key, value);
  }
  if (!changedKeys.length) {
    model.changed = changed;
    return model;
  }
  model.id = model.get(model.idAttribute);
  model.changed = changed;
  if (!options.silent) {
    const change = {
      ...options,
      changed,
      previous
    };
    for (const key of changedKeys) {
      model.triggerMethod(`change:${key}`, model, changed[key], change);
    }
    model.triggerMethod("change", model, change);
  }
  return model;
}
var Model = function(attributes = {}, options = {}) {
  this.cid = `mnd${++modelId}`;
  this.attributes = {};
  const defaults = getDefaults(this);
  update(this, {
    ...defaults,
    ...attributes
  }, {
    silent: true
  });
  this.changed = {};
  this.initialize(attributes, options);
};
Model.extend = extend3;
Object.assign(Model.prototype, Events2, {
  idAttribute: "id",
  _isDestroyed: false,
  initialize() {
  },
  get(key) {
    return Object.hasOwn(this.attributes, key) ? this.attributes[key] : void 0;
  },
  has(key) {
    return Object.hasOwn(this.attributes, key);
  },
  set(key, value, options) {
    if (key == null) {
      return noChange(this);
    }
    const attributes = typeof key === "object" ? key : {
      [key]: value
    };
    return update(this, attributes, typeof key === "object" ? value : options);
  },
  unset(key, options) {
    return key == null ? noChange(this) : update(this, {}, options, [key]);
  },
  clear(options) {
    return update(this, {}, options, Object.keys(this.attributes));
  },
  reset(attributes = {}, options) {
    if (this._isDestroyed) {
      return this;
    }
    const next = {
      ...getDefaults(this),
      ...attributes
    };
    const removed = Object.keys(this.attributes).filter((key) => !Object.hasOwn(next, key));
    return update(this, next, options, removed);
  },
  toObject() {
    return {
      ...this.attributes
    };
  },
  isDestroyed() {
    return this._isDestroyed;
  },
  destroy(options) {
    if (this._isDestroyed) {
      return this;
    }
    this._isDestroyed = true;
    this.triggerMethod("destroy", this, options);
    this.stopListening();
    this.off();
    return this;
  }
});
function asArray(models) {
  if (models == null) {
    return [];
  }
  return Array.isArray(models) ? models : [models];
}
function normalizeOptions(options) {
  return options == null ? {} : options;
}
function sameValueZero2(left, right) {
  return left === right || Number.isNaN(left) && Number.isNaN(right);
}
function assertUniqueModels(models) {
  const knownModels = /* @__PURE__ */ new Set();
  const knownIds = /* @__PURE__ */ new Set();
  for (const model of models) {
    if (knownModels.has(model) || model.id != null && knownIds.has(model.id)) {
      throw new TypeError("@mnjs/data Collection models must have unique instances and ids.");
    }
    knownModels.add(model);
    if (model.id != null) {
      knownIds.add(model.id);
    }
  }
}
function indexModels(models) {
  const identities = /* @__PURE__ */ new Map();
  for (const model of models) {
    identities.set(model.cid, model);
  }
  for (let index = models.length; index--; ) {
    const model = models[index];
    if (model.id != null) {
      identities.set(model.id, model);
    }
  }
  for (const model of models) {
    identities.set(model, model);
  }
  return identities;
}
var Collection = function(models = [], options = {}) {
  options = normalizeOptions(options);
  this.models = [];
  this.length = 0;
  if (options.model) {
    this.model = options.model;
  }
  this.reset(models, {
    silent: true
  });
  this.initialize(models, options);
};
Collection.extend = extend3;
Object.assign(Collection.prototype, Events2, {
  model: Model,
  _isDestroyed: false,
  initialize() {
  },
  _prepareModel(model) {
    const ModelClass = this.model;
    return model instanceof Model ? model : new ModelClass(model);
  },
  _bindModel(model) {
    model.on("all", this._onModelEvent, this);
  },
  _unbindModel(model) {
    model.off("all", this._onModelEvent, this);
  },
  _bindModels(models) {
    for (const model of models) {
      this._bindModel(model);
    }
  },
  _replaceBindings(previousModels, currentModels) {
    let added = currentModels;
    let removed = previousModels;
    if (previousModels.length && currentModels.length) {
      const previous = new Set(previousModels);
      const current = new Set(currentModels);
      added = currentModels.filter((model) => !previous.has(model));
      removed = previousModels.filter((model) => !current.has(model));
    }
    this._bindModels(added);
    for (const model of removed) {
      this._unbindModel(model);
    }
  },
  _onModelEvent(eventName, model, ...args) {
    if (eventName === "destroy") {
      this.remove(model, args[0]);
    }
    this.triggerMethod(eventName, model, ...args);
  },
  at(index) {
    return this.models.at(index);
  },
  get(identity) {
    if (identity == null) {
      return void 0;
    }
    if (identity instanceof Model && this.models.includes(identity)) {
      return identity;
    }
    return this.models.find((model) => sameValueZero2(model.id, identity)) || this.models.find((model) => model.cid === identity);
  },
  indexOf(model) {
    return this.models.indexOf(model);
  },
  forEach(callback, context) {
    this.models.forEach(callback, context);
  },
  map(callback, context) {
    return this.models.map(callback, context);
  },
  add(models, options = {}) {
    options = normalizeOptions(options);
    if (this._isDestroyed) {
      return Array.isArray(models) ? [] : void 0;
    }
    const added = [];
    const knownModels = new Set(this.models);
    const knownIds = new Set(this.models.filter((model) => model.id != null).map((model) => model.id));
    for (const candidate of asArray(models)) {
      if (!(candidate instanceof Model) && candidate != null && typeof candidate === "object") {
        const idAttribute = this.model.prototype.idAttribute;
        const rawId = Object.hasOwn(candidate, idAttribute) ? candidate[idAttribute] : void 0;
        if (rawId != null && knownIds.has(rawId)) {
          continue;
        }
      }
      const model = this._prepareModel(candidate);
      if (knownModels.has(model) || model.id != null && knownIds.has(model.id)) {
        continue;
      }
      added.push(model);
      knownModels.add(model);
      if (model.id != null) {
        knownIds.add(model.id);
      }
    }
    if (!added.length) {
      return Array.isArray(models) ? added : void 0;
    }
    this._bindModels(added);
    const at = Number.isInteger(options.at) ? Math.max(0, Math.min(options.at, this.models.length)) : this.models.length;
    this.models.splice(at, 0, ...added);
    this.length = this.models.length;
    if (!options.silent) {
      const change = {
        kind: "update",
        added,
        removed: [],
        updated: []
      };
      for (const model of added) {
        this.triggerMethod("add", model, this, options);
      }
      this.triggerMethod("update", this, {
        ...options,
        changes: change
      });
    }
    return Array.isArray(models) ? added : added[0];
  },
  remove(models, options = {}) {
    options = normalizeOptions(options);
    if (this._isDestroyed) {
      return Array.isArray(models) ? [] : void 0;
    }
    const removed = [];
    const removing = /* @__PURE__ */ new Set();
    const candidates = asArray(models);
    const identities = candidates.length > 1 ? indexModels(this.models) : void 0;
    for (const candidate of candidates) {
      const model = identities ? identities.get(candidate) : this.get(candidate);
      if (!model || removing.has(model)) {
        continue;
      }
      removed.push(model);
      removing.add(model);
    }
    if (!removed.length) {
      return Array.isArray(models) ? removed : void 0;
    }
    const nextModels = this.models.filter((model) => !removing.has(model));
    for (const model of removed) {
      this._unbindModel(model);
    }
    this.models = nextModels;
    this.length = this.models.length;
    if (!options.silent) {
      const change = {
        kind: "update",
        added: [],
        removed,
        updated: []
      };
      for (const model of removed) {
        this.triggerMethod("remove", model, this, options);
      }
      this.triggerMethod("update", this, {
        ...options,
        changes: change
      });
    }
    return Array.isArray(models) ? removed : removed[0];
  },
  reset(models = [], options = {}) {
    options = normalizeOptions(options);
    if (this._isDestroyed) {
      return this;
    }
    const preparedModels = asArray(models).map((model) => this._prepareModel(model));
    assertUniqueModels(preparedModels);
    this._replaceBindings(this.models, preparedModels);
    this.models = preparedModels;
    this.length = this.models.length;
    if (!options.silent) {
      this.triggerMethod("reset", this, options);
    }
    return this;
  },
  move(model, index, options = {}) {
    options = normalizeOptions(options);
    const currentModel = this.get(model);
    if (!currentModel || this._isDestroyed) {
      return void 0;
    }
    if (!Number.isInteger(index)) {
      throw new TypeError("@mnjs/data Collection.move() requires an integer index.");
    }
    const previousIndex = this.models.indexOf(currentModel);
    const nextIndex = Math.max(0, Math.min(index, this.models.length - 1));
    if (previousIndex === nextIndex) {
      return currentModel;
    }
    this.models.splice(previousIndex, 1);
    this.models.splice(nextIndex, 0, currentModel);
    if (!options.silent) {
      this.triggerMethod("sort", this, options);
    }
    return currentModel;
  },
  sort(comparator = this.comparator, options = {}) {
    options = normalizeOptions(options);
    if (this._isDestroyed) {
      return this;
    }
    if (typeof comparator === "string") {
      this.models.sort((left, right) => {
        const leftValue = left.get(comparator);
        const rightValue = right.get(comparator);
        return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
      });
    } else if (typeof comparator === "function") {
      this.models.sort(comparator.bind(this));
    } else {
      return this;
    }
    if (!options.silent) {
      this.triggerMethod("sort", this, options);
    }
    return this;
  },
  toArray() {
    return this.models.map((model) => model.toObject());
  },
  isDestroyed() {
    return this._isDestroyed;
  },
  destroy(options) {
    if (this._isDestroyed) {
      return this;
    }
    this._isDestroyed = true;
    for (let index = this.models.length; index--; ) {
      this._unbindModel(this.models[index]);
    }
    this.triggerMethod("destroy", this, options);
    this.stopListening();
    this.off();
    return this;
  }
});
Collection.prototype[Symbol.iterator] = function() {
  return this.models[Symbol.iterator]();
};
function subscribe(source, eventName, callback, context) {
  if (typeof source?.on !== "function" || typeof source?.off !== "function") {
    throw new TypeError("@mnjs/data can subscribe only to sources with on() and off().");
  }
  let subscribed = true;
  source.on(eventName, callback, context);
  return function() {
    if (!subscribed) {
      return;
    }
    subscribed = false;
    source.off(eventName, callback, context);
  };
}
var StateApi2 = {
  subscribe,
  disposeOwned(source) {
    source?.destroy?.();
  }
};
var DataApi2 = {
  key(model) {
    return model.cid;
  },
  get(model, property) {
    return model instanceof Model ? model.get(property) : Object.hasOwn(Object(model), property) ? model[property] : void 0;
  },
  has(model, property) {
    return model instanceof Model ? model.has(property) : Object.hasOwn(Object(model), property);
  },
  serialize(model) {
    return model instanceof Model ? model.attributes : model;
  },
  models(collection) {
    if (!(collection instanceof Collection)) {
      throw new TypeError("@mnjs/data DataApi.models() requires a Collection.");
    }
    return collection.models.slice();
  },
  subscribe,
  observeCollection(collection, callback, context) {
    const onUpdate = function(_, {
      changes
    }) {
      callback.call(context, changes);
    };
    const onReset = function() {
      callback.call(context, {
        kind: "reset"
      });
    };
    const onSort = function() {
      callback.call(context, {
        kind: "reorder"
      });
    };
    return subscribe(collection, {
      update: onUpdate,
      reset: onReset,
      sort: onSort
    }, context);
  }
};
export {
  Application,
  Behavior,
  Collection,
  CollectionView,
  DataApi2 as DataApi,
  DomApi,
  Events,
  MarionetteError,
  MnObject,
  Model,
  Radio,
  Region,
  StateApi2 as StateApi,
  version2 as VERSION,
  View,
  createMarionette,
  extend2 as extend,
  monitorViewEvents,
  setDataApi,
  setDomApi,
  setEventDelegator,
  setRenderer,
  setStateApi
};
