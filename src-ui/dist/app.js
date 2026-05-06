(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // node_modules/@tauri-apps/api/external/tslib/tslib.es6.js
  function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
  }
  function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
  }
  var init_tslib_es6 = __esm({
    "node_modules/@tauri-apps/api/external/tslib/tslib.es6.js"() {
    }
  });

  // node_modules/@tauri-apps/api/core.js
  function transformCallback(callback, once2 = false) {
    return window.__TAURI_INTERNALS__.transformCallback(callback, once2);
  }
  async function invoke(cmd, args = {}, options) {
    return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
  }
  var _Channel_onmessage, _Channel_nextMessageIndex, _Channel_pendingMessages, _Channel_messageEndIndex, _Resource_rid, SERIALIZE_TO_IPC_FN, Channel, Resource;
  var init_core = __esm({
    "node_modules/@tauri-apps/api/core.js"() {
      init_tslib_es6();
      SERIALIZE_TO_IPC_FN = "__TAURI_TO_IPC_KEY__";
      Channel = class {
        constructor(onmessage) {
          _Channel_onmessage.set(this, void 0);
          _Channel_nextMessageIndex.set(this, 0);
          _Channel_pendingMessages.set(this, []);
          _Channel_messageEndIndex.set(this, void 0);
          __classPrivateFieldSet(this, _Channel_onmessage, onmessage || (() => {
          }), "f");
          this.id = transformCallback((rawMessage) => {
            const index = rawMessage.index;
            if ("end" in rawMessage) {
              if (index == __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")) {
                this.cleanupCallback();
              } else {
                __classPrivateFieldSet(this, _Channel_messageEndIndex, index, "f");
              }
              return;
            }
            const message = rawMessage.message;
            if (index == __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")) {
              __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message);
              __classPrivateFieldSet(this, _Channel_nextMessageIndex, __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") + 1, "f");
              while (__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") in __classPrivateFieldGet(this, _Channel_pendingMessages, "f")) {
                const message2 = __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")];
                __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message2);
                delete __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")];
                __classPrivateFieldSet(this, _Channel_nextMessageIndex, __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") + 1, "f");
              }
              if (__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") === __classPrivateFieldGet(this, _Channel_messageEndIndex, "f")) {
                this.cleanupCallback();
              }
            } else {
              __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[index] = message;
            }
          });
        }
        cleanupCallback() {
          window.__TAURI_INTERNALS__.unregisterCallback(this.id);
        }
        set onmessage(handler) {
          __classPrivateFieldSet(this, _Channel_onmessage, handler, "f");
        }
        get onmessage() {
          return __classPrivateFieldGet(this, _Channel_onmessage, "f");
        }
        [(_Channel_onmessage = /* @__PURE__ */ new WeakMap(), _Channel_nextMessageIndex = /* @__PURE__ */ new WeakMap(), _Channel_pendingMessages = /* @__PURE__ */ new WeakMap(), _Channel_messageEndIndex = /* @__PURE__ */ new WeakMap(), SERIALIZE_TO_IPC_FN)]() {
          return `__CHANNEL__:${this.id}`;
        }
        toJSON() {
          return this[SERIALIZE_TO_IPC_FN]();
        }
      };
      Resource = class {
        get rid() {
          return __classPrivateFieldGet(this, _Resource_rid, "f");
        }
        constructor(rid) {
          _Resource_rid.set(this, void 0);
          __classPrivateFieldSet(this, _Resource_rid, rid, "f");
        }
        /**
         * Destroys and cleans up this resource from memory.
         * **You should not call any method on this object anymore and should drop any reference to it.**
         */
        async close() {
          return invoke("plugin:resources|close", {
            rid: this.rid
          });
        }
      };
      _Resource_rid = /* @__PURE__ */ new WeakMap();
    }
  });

  // node_modules/@tauri-apps/api/event.js
  async function _unlisten(event, eventId) {
    window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(event, eventId);
    await invoke("plugin:event|unlisten", {
      event,
      eventId
    });
  }
  async function listen(event, handler, options) {
    var _a;
    const target = typeof (options === null || options === void 0 ? void 0 : options.target) === "string" ? { kind: "AnyLabel", label: options.target } : (_a = options === null || options === void 0 ? void 0 : options.target) !== null && _a !== void 0 ? _a : { kind: "Any" };
    return invoke("plugin:event|listen", {
      event,
      target,
      handler: transformCallback(handler)
    }).then((eventId) => {
      return async () => _unlisten(event, eventId);
    });
  }
  async function once(event, handler, options) {
    return listen(event, (eventData) => {
      void _unlisten(event, eventData.id);
      handler(eventData);
    }, options);
  }
  async function emit(event, payload) {
    await invoke("plugin:event|emit", {
      event,
      payload
    });
  }
  async function emitTo(target, event, payload) {
    const eventTarget = typeof target === "string" ? { kind: "AnyLabel", label: target } : target;
    await invoke("plugin:event|emit_to", {
      target: eventTarget,
      event,
      payload
    });
  }
  var TauriEvent;
  var init_event = __esm({
    "node_modules/@tauri-apps/api/event.js"() {
      init_core();
      (function(TauriEvent2) {
        TauriEvent2["WINDOW_RESIZED"] = "tauri://resize";
        TauriEvent2["WINDOW_MOVED"] = "tauri://move";
        TauriEvent2["WINDOW_CLOSE_REQUESTED"] = "tauri://close-requested";
        TauriEvent2["WINDOW_DESTROYED"] = "tauri://destroyed";
        TauriEvent2["WINDOW_FOCUS"] = "tauri://focus";
        TauriEvent2["WINDOW_BLUR"] = "tauri://blur";
        TauriEvent2["WINDOW_SCALE_FACTOR_CHANGED"] = "tauri://scale-change";
        TauriEvent2["WINDOW_THEME_CHANGED"] = "tauri://theme-changed";
        TauriEvent2["WINDOW_CREATED"] = "tauri://window-created";
        TauriEvent2["WINDOW_SUSPENDED"] = "tauri://suspended";
        TauriEvent2["WINDOW_RESUMED"] = "tauri://resumed";
        TauriEvent2["WEBVIEW_CREATED"] = "tauri://webview-created";
        TauriEvent2["DRAG_ENTER"] = "tauri://drag-enter";
        TauriEvent2["DRAG_OVER"] = "tauri://drag-over";
        TauriEvent2["DRAG_DROP"] = "tauri://drag-drop";
        TauriEvent2["DRAG_LEAVE"] = "tauri://drag-leave";
      })(TauriEvent || (TauriEvent = {}));
    }
  });

  // node_modules/@tauri-apps/api/dpi.js
  var LogicalSize, PhysicalSize, Size, LogicalPosition, PhysicalPosition, Position;
  var init_dpi = __esm({
    "node_modules/@tauri-apps/api/dpi.js"() {
      init_core();
      LogicalSize = class {
        constructor(...args) {
          this.type = "Logical";
          if (args.length === 1) {
            if ("Logical" in args[0]) {
              this.width = args[0].Logical.width;
              this.height = args[0].Logical.height;
            } else {
              this.width = args[0].width;
              this.height = args[0].height;
            }
          } else {
            this.width = args[0];
            this.height = args[1];
          }
        }
        /**
         * Converts the logical size to a physical one.
         * @example
         * ```typescript
         * import { LogicalSize } from '@tauri-apps/api/dpi';
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         *
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const size = new LogicalSize(400, 500);
         * const physical = size.toPhysical(factor);
         * ```
         *
         * @since 2.0.0
         */
        toPhysical(scaleFactor) {
          return new PhysicalSize(this.width * scaleFactor, this.height * scaleFactor);
        }
        [SERIALIZE_TO_IPC_FN]() {
          return {
            width: this.width,
            height: this.height
          };
        }
        toJSON() {
          return this[SERIALIZE_TO_IPC_FN]();
        }
      };
      PhysicalSize = class {
        constructor(...args) {
          this.type = "Physical";
          if (args.length === 1) {
            if ("Physical" in args[0]) {
              this.width = args[0].Physical.width;
              this.height = args[0].Physical.height;
            } else {
              this.width = args[0].width;
              this.height = args[0].height;
            }
          } else {
            this.width = args[0];
            this.height = args[1];
          }
        }
        /**
         * Converts the physical size to a logical one.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const size = await appWindow.innerSize(); // PhysicalSize
         * const logical = size.toLogical(factor);
         * ```
         */
        toLogical(scaleFactor) {
          return new LogicalSize(this.width / scaleFactor, this.height / scaleFactor);
        }
        [SERIALIZE_TO_IPC_FN]() {
          return {
            width: this.width,
            height: this.height
          };
        }
        toJSON() {
          return this[SERIALIZE_TO_IPC_FN]();
        }
      };
      Size = class {
        constructor(size) {
          this.size = size;
        }
        toLogical(scaleFactor) {
          return this.size instanceof LogicalSize ? this.size : this.size.toLogical(scaleFactor);
        }
        toPhysical(scaleFactor) {
          return this.size instanceof PhysicalSize ? this.size : this.size.toPhysical(scaleFactor);
        }
        [SERIALIZE_TO_IPC_FN]() {
          return {
            [`${this.size.type}`]: {
              width: this.size.width,
              height: this.size.height
            }
          };
        }
        toJSON() {
          return this[SERIALIZE_TO_IPC_FN]();
        }
      };
      LogicalPosition = class {
        constructor(...args) {
          this.type = "Logical";
          if (args.length === 1) {
            if ("Logical" in args[0]) {
              this.x = args[0].Logical.x;
              this.y = args[0].Logical.y;
            } else {
              this.x = args[0].x;
              this.y = args[0].y;
            }
          } else {
            this.x = args[0];
            this.y = args[1];
          }
        }
        /**
         * Converts the logical position to a physical one.
         * @example
         * ```typescript
         * import { LogicalPosition } from '@tauri-apps/api/dpi';
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         *
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const position = new LogicalPosition(400, 500);
         * const physical = position.toPhysical(factor);
         * ```
         *
         * @since 2.0.0
         */
        toPhysical(scaleFactor) {
          return new PhysicalPosition(this.x * scaleFactor, this.y * scaleFactor);
        }
        [SERIALIZE_TO_IPC_FN]() {
          return {
            x: this.x,
            y: this.y
          };
        }
        toJSON() {
          return this[SERIALIZE_TO_IPC_FN]();
        }
      };
      PhysicalPosition = class {
        constructor(...args) {
          this.type = "Physical";
          if (args.length === 1) {
            if ("Physical" in args[0]) {
              this.x = args[0].Physical.x;
              this.y = args[0].Physical.y;
            } else {
              this.x = args[0].x;
              this.y = args[0].y;
            }
          } else {
            this.x = args[0];
            this.y = args[1];
          }
        }
        /**
         * Converts the physical position to a logical one.
         * @example
         * ```typescript
         * import { PhysicalPosition } from '@tauri-apps/api/dpi';
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         *
         * const appWindow = getCurrentWindow();
         * const factor = await appWindow.scaleFactor();
         * const position = new PhysicalPosition(400, 500);
         * const physical = position.toLogical(factor);
         * ```
         *
         * @since 2.0.0
         */
        toLogical(scaleFactor) {
          return new LogicalPosition(this.x / scaleFactor, this.y / scaleFactor);
        }
        [SERIALIZE_TO_IPC_FN]() {
          return {
            x: this.x,
            y: this.y
          };
        }
        toJSON() {
          return this[SERIALIZE_TO_IPC_FN]();
        }
      };
      Position = class {
        constructor(position) {
          this.position = position;
        }
        toLogical(scaleFactor) {
          return this.position instanceof LogicalPosition ? this.position : this.position.toLogical(scaleFactor);
        }
        toPhysical(scaleFactor) {
          return this.position instanceof PhysicalPosition ? this.position : this.position.toPhysical(scaleFactor);
        }
        [SERIALIZE_TO_IPC_FN]() {
          return {
            [`${this.position.type}`]: {
              x: this.position.x,
              y: this.position.y
            }
          };
        }
        toJSON() {
          return this[SERIALIZE_TO_IPC_FN]();
        }
      };
    }
  });

  // node_modules/@tauri-apps/api/image.js
  function transformImage(image) {
    const ret = image == null ? null : typeof image === "string" ? image : image instanceof Image ? image.rid : image;
    return ret;
  }
  var Image;
  var init_image = __esm({
    "node_modules/@tauri-apps/api/image.js"() {
      init_core();
      Image = class _Image extends Resource {
        /**
         * Creates an Image from a resource ID. For internal use only.
         *
         * @ignore
         */
        constructor(rid) {
          super(rid);
        }
        /** Creates a new Image using RGBA data, in row-major order from top to bottom, and with specified width and height. */
        static async new(rgba, width, height) {
          return invoke("plugin:image|new", {
            rgba: transformImage(rgba),
            width,
            height
          }).then((rid) => new _Image(rid));
        }
        /**
         * Creates a new image using the provided bytes by inferring the file format.
         * If the format is known, prefer [@link Image.fromPngBytes] or [@link Image.fromIcoBytes].
         *
         * Only `ico` and `png` are supported (based on activated feature flag).
         *
         * Note that you need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         */
        static async fromBytes(bytes) {
          return invoke("plugin:image|from_bytes", {
            bytes: transformImage(bytes)
          }).then((rid) => new _Image(rid));
        }
        /**
         * Creates a new image using the provided path.
         *
         * Only `ico` and `png` are supported (based on activated feature flag).
         *
         * Note that you need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         */
        static async fromPath(path) {
          return invoke("plugin:image|from_path", { path }).then((rid) => new _Image(rid));
        }
        /** Returns the RGBA data for this image, in row-major order from top to bottom.  */
        async rgba() {
          return invoke("plugin:image|rgba", {
            rid: this.rid
          }).then((buffer) => new Uint8Array(buffer));
        }
        /** Returns the size of this image.  */
        async size() {
          return invoke("plugin:image|size", { rid: this.rid });
        }
      };
    }
  });

  // node_modules/@tauri-apps/api/window.js
  function getCurrentWindow() {
    return new Window(window.__TAURI_INTERNALS__.metadata.currentWindow.label, {
      // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
      skip: true
    });
  }
  async function getAllWindows() {
    return invoke("plugin:window|get_all_windows").then((windows) => windows.map((w) => new Window(w, {
      // @ts-expect-error `skip` is not defined in the public API but it is handled by the constructor
      skip: true
    })));
  }
  var UserAttentionType, CloseRequestedEvent, ProgressBarStatus, localTauriEvents, Window, BackgroundThrottlingPolicy, ScrollBarStyle, Effect, EffectState;
  var init_window = __esm({
    "node_modules/@tauri-apps/api/window.js"() {
      init_dpi();
      init_dpi();
      init_event();
      init_core();
      init_image();
      (function(UserAttentionType2) {
        UserAttentionType2[UserAttentionType2["Critical"] = 1] = "Critical";
        UserAttentionType2[UserAttentionType2["Informational"] = 2] = "Informational";
      })(UserAttentionType || (UserAttentionType = {}));
      CloseRequestedEvent = class {
        constructor(event) {
          this._preventDefault = false;
          this.event = event.event;
          this.id = event.id;
        }
        preventDefault() {
          this._preventDefault = true;
        }
        isPreventDefault() {
          return this._preventDefault;
        }
      };
      (function(ProgressBarStatus2) {
        ProgressBarStatus2["None"] = "none";
        ProgressBarStatus2["Normal"] = "normal";
        ProgressBarStatus2["Indeterminate"] = "indeterminate";
        ProgressBarStatus2["Paused"] = "paused";
        ProgressBarStatus2["Error"] = "error";
      })(ProgressBarStatus || (ProgressBarStatus = {}));
      localTauriEvents = ["tauri://created", "tauri://error"];
      Window = class {
        /**
         * Creates a new Window.
         * @example
         * ```typescript
         * import { Window } from '@tauri-apps/api/window';
         * const appWindow = new Window('my-label');
         * appWindow.once('tauri://created', function () {
         *  // window successfully created
         * });
         * appWindow.once('tauri://error', function (e) {
         *  // an error happened creating the window
         * });
         * ```
         *
         * @param label The unique window label. Must be alphanumeric: `a-zA-Z-/:_`.
         * @returns The {@link Window} instance to communicate with the window.
         */
        constructor(label, options = {}) {
          var _a;
          this.label = label;
          this.listeners = /* @__PURE__ */ Object.create(null);
          if (!(options === null || options === void 0 ? void 0 : options.skip)) {
            invoke("plugin:window|create", {
              options: {
                ...options,
                parent: typeof options.parent === "string" ? options.parent : (_a = options.parent) === null || _a === void 0 ? void 0 : _a.label,
                label
              }
            }).then(async () => this.emit("tauri://created")).catch(async (e) => this.emit("tauri://error", e));
          }
        }
        /**
         * Gets the Window associated with the given label.
         * @example
         * ```typescript
         * import { Window } from '@tauri-apps/api/window';
         * const mainWindow = Window.getByLabel('main');
         * ```
         *
         * @param label The window label.
         * @returns The Window instance to communicate with the window or null if the window doesn't exist.
         */
        static async getByLabel(label) {
          var _a;
          return (_a = (await getAllWindows()).find((w) => w.label === label)) !== null && _a !== void 0 ? _a : null;
        }
        /**
         * Get an instance of `Window` for the current window.
         */
        static getCurrent() {
          return getCurrentWindow();
        }
        /**
         * Gets a list of instances of `Window` for all available windows.
         */
        static async getAll() {
          return getAllWindows();
        }
        /**
         *  Gets the focused window.
         * @example
         * ```typescript
         * import { Window } from '@tauri-apps/api/window';
         * const focusedWindow = Window.getFocusedWindow();
         * ```
         *
         * @returns The Window instance or `undefined` if there is not any focused window.
         */
        static async getFocusedWindow() {
          for (const w of await getAllWindows()) {
            if (await w.isFocused()) {
              return w;
            }
          }
          return null;
        }
        /**
         * Listen to an emitted event on this window.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const unlisten = await getCurrentWindow().listen<string>('state-changed', (event) => {
         *   console.log(`Got error: ${payload}`);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param handler Event handler.
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async listen(event, handler) {
          if (this._handleTauriEvent(event, handler)) {
            return () => {
              const listeners = this.listeners[event];
              listeners.splice(listeners.indexOf(handler), 1);
            };
          }
          return listen(event, handler, {
            target: { kind: "Window", label: this.label }
          });
        }
        /**
         * Listen to an emitted event on this window only once.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const unlisten = await getCurrentWindow().once<null>('initialized', (event) => {
         *   console.log(`Window initialized!`);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param handler Event handler.
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async once(event, handler) {
          if (this._handleTauriEvent(event, handler)) {
            return () => {
              const listeners = this.listeners[event];
              listeners.splice(listeners.indexOf(handler), 1);
            };
          }
          return once(event, handler, {
            target: { kind: "Window", label: this.label }
          });
        }
        /**
         * Emits an event to all {@link EventTarget|targets}.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().emit('window-loaded', { loggedIn: true, token: 'authToken' });
         * ```
         *
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param payload Event payload.
         */
        async emit(event, payload) {
          if (localTauriEvents.includes(event)) {
            for (const handler of this.listeners[event] || []) {
              handler({
                event,
                id: -1,
                payload
              });
            }
            return;
          }
          return emit(event, payload);
        }
        /**
         * Emits an event to all {@link EventTarget|targets} matching the given target.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().emit('main', 'window-loaded', { loggedIn: true, token: 'authToken' });
         * ```
         * @param target Label of the target Window/Webview/WebviewWindow or raw {@link EventTarget} object.
         * @param event Event name. Must include only alphanumeric characters, `-`, `/`, `:` and `_`.
         * @param payload Event payload.
         */
        async emitTo(target, event, payload) {
          if (localTauriEvents.includes(event)) {
            for (const handler of this.listeners[event] || []) {
              handler({
                event,
                id: -1,
                payload
              });
            }
            return;
          }
          return emitTo(target, event, payload);
        }
        /** @ignore */
        _handleTauriEvent(event, handler) {
          if (localTauriEvents.includes(event)) {
            if (!(event in this.listeners)) {
              this.listeners[event] = [handler];
            } else {
              this.listeners[event].push(handler);
            }
            return true;
          }
          return false;
        }
        // Getters
        /**
         * The scale factor that can be used to map physical pixels to logical pixels.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const factor = await getCurrentWindow().scaleFactor();
         * ```
         *
         * @returns The window's monitor scale factor.
         */
        async scaleFactor() {
          return invoke("plugin:window|scale_factor", {
            label: this.label
          });
        }
        /**
         * The position of the top-left hand corner of the window's client area relative to the top-left hand corner of the desktop.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const position = await getCurrentWindow().innerPosition();
         * ```
         *
         * @returns The window's inner position.
         */
        async innerPosition() {
          return invoke("plugin:window|inner_position", {
            label: this.label
          }).then((p) => new PhysicalPosition(p));
        }
        /**
         * The position of the top-left hand corner of the window relative to the top-left hand corner of the desktop.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const position = await getCurrentWindow().outerPosition();
         * ```
         *
         * @returns The window's outer position.
         */
        async outerPosition() {
          return invoke("plugin:window|outer_position", {
            label: this.label
          }).then((p) => new PhysicalPosition(p));
        }
        /**
         * The physical size of the window's client area.
         * The client area is the content of the window, excluding the title bar and borders.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const size = await getCurrentWindow().innerSize();
         * ```
         *
         * @returns The window's inner size.
         */
        async innerSize() {
          return invoke("plugin:window|inner_size", {
            label: this.label
          }).then((s) => new PhysicalSize(s));
        }
        /**
         * The physical size of the entire window.
         * These dimensions include the title bar and borders. If you don't want that (and you usually don't), use inner_size instead.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const size = await getCurrentWindow().outerSize();
         * ```
         *
         * @returns The window's outer size.
         */
        async outerSize() {
          return invoke("plugin:window|outer_size", {
            label: this.label
          }).then((s) => new PhysicalSize(s));
        }
        /**
         * Gets the window's current fullscreen state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const fullscreen = await getCurrentWindow().isFullscreen();
         * ```
         *
         * @returns Whether the window is in fullscreen mode or not.
         */
        async isFullscreen() {
          return invoke("plugin:window|is_fullscreen", {
            label: this.label
          });
        }
        /**
         * Gets the window's current minimized state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const minimized = await getCurrentWindow().isMinimized();
         * ```
         */
        async isMinimized() {
          return invoke("plugin:window|is_minimized", {
            label: this.label
          });
        }
        /**
         * Gets the window's current maximized state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const maximized = await getCurrentWindow().isMaximized();
         * ```
         *
         * @returns Whether the window is maximized or not.
         */
        async isMaximized() {
          return invoke("plugin:window|is_maximized", {
            label: this.label
          });
        }
        /**
         * Gets the window's current focus state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const focused = await getCurrentWindow().isFocused();
         * ```
         *
         * @returns Whether the window is focused or not.
         */
        async isFocused() {
          return invoke("plugin:window|is_focused", {
            label: this.label
          });
        }
        /**
         * Gets the window's current decorated state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const decorated = await getCurrentWindow().isDecorated();
         * ```
         *
         * @returns Whether the window is decorated or not.
         */
        async isDecorated() {
          return invoke("plugin:window|is_decorated", {
            label: this.label
          });
        }
        /**
         * Gets the window's current resizable state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const resizable = await getCurrentWindow().isResizable();
         * ```
         *
         * @returns Whether the window is resizable or not.
         */
        async isResizable() {
          return invoke("plugin:window|is_resizable", {
            label: this.label
          });
        }
        /**
         * Gets the window's native maximize button state.
         *
         * #### Platform-specific
         *
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const maximizable = await getCurrentWindow().isMaximizable();
         * ```
         *
         * @returns Whether the window's native maximize button is enabled or not.
         */
        async isMaximizable() {
          return invoke("plugin:window|is_maximizable", {
            label: this.label
          });
        }
        /**
         * Gets the window's native minimize button state.
         *
         * #### Platform-specific
         *
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const minimizable = await getCurrentWindow().isMinimizable();
         * ```
         *
         * @returns Whether the window's native minimize button is enabled or not.
         */
        async isMinimizable() {
          return invoke("plugin:window|is_minimizable", {
            label: this.label
          });
        }
        /**
         * Gets the window's native close button state.
         *
         * #### Platform-specific
         *
         * - **iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const closable = await getCurrentWindow().isClosable();
         * ```
         *
         * @returns Whether the window's native close button is enabled or not.
         */
        async isClosable() {
          return invoke("plugin:window|is_closable", {
            label: this.label
          });
        }
        /**
         * Gets the window's current visible state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const visible = await getCurrentWindow().isVisible();
         * ```
         *
         * @returns Whether the window is visible or not.
         */
        async isVisible() {
          return invoke("plugin:window|is_visible", {
            label: this.label
          });
        }
        /**
         * Gets the window's current title.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const title = await getCurrentWindow().title();
         * ```
         */
        async title() {
          return invoke("plugin:window|title", {
            label: this.label
          });
        }
        /**
         * Gets the window's current theme.
         *
         * #### Platform-specific
         *
         * - **macOS:** Theme was introduced on macOS 10.14. Returns `light` on macOS 10.13 and below.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const theme = await getCurrentWindow().theme();
         * ```
         *
         * @returns The window theme.
         */
        async theme() {
          return invoke("plugin:window|theme", {
            label: this.label
          });
        }
        /**
         * Whether the window is configured to be always on top of other windows or not.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * const alwaysOnTop = await getCurrentWindow().isAlwaysOnTop();
         * ```
         *
         * @returns Whether the window is visible or not.
         */
        async isAlwaysOnTop() {
          return invoke("plugin:window|is_always_on_top", {
            label: this.label
          });
        }
        async activityName() {
          return invoke("plugin:window|activity_name", {
            label: this.label
          });
        }
        async sceneIdentifier() {
          return invoke("plugin:window|scene_identifier", {
            label: this.label
          });
        }
        // Setters
        /**
         * Centers the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().center();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async center() {
          return invoke("plugin:window|center", {
            label: this.label
          });
        }
        /**
         *  Requests user attention to the window, this has no effect if the application
         * is already focused. How requesting for user attention manifests is platform dependent,
         * see `UserAttentionType` for details.
         *
         * Providing `null` will unset the request for user attention. Unsetting the request for
         * user attention might not be done automatically by the WM when the window receives input.
         *
         * #### Platform-specific
         *
         * - **macOS:** `null` has no effect.
         * - **Linux:** Urgency levels have the same effect.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().requestUserAttention();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async requestUserAttention(requestType) {
          let requestType_ = null;
          if (requestType) {
            if (requestType === UserAttentionType.Critical) {
              requestType_ = { type: "Critical" };
            } else {
              requestType_ = { type: "Informational" };
            }
          }
          return invoke("plugin:window|request_user_attention", {
            label: this.label,
            value: requestType_
          });
        }
        /**
         * Updates the window resizable flag.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setResizable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setResizable(resizable) {
          return invoke("plugin:window|set_resizable", {
            label: this.label,
            value: resizable
          });
        }
        /**
         * Enable or disable the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setEnabled(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         *
         * @since 2.0.0
         */
        async setEnabled(enabled) {
          return invoke("plugin:window|set_enabled", {
            label: this.label,
            value: enabled
          });
        }
        /**
         * Whether the window is enabled or disabled.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setEnabled(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         *
         * @since 2.0.0
         */
        async isEnabled() {
          return invoke("plugin:window|is_enabled", {
            label: this.label
          });
        }
        /**
         * Sets whether the window's native maximize button is enabled or not.
         * If resizable is set to false, this setting is ignored.
         *
         * #### Platform-specific
         *
         * - **macOS:** Disables the "zoom" button in the window titlebar, which is also used to enter fullscreen mode.
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMaximizable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMaximizable(maximizable) {
          return invoke("plugin:window|set_maximizable", {
            label: this.label,
            value: maximizable
          });
        }
        /**
         * Sets whether the window's native minimize button is enabled or not.
         *
         * #### Platform-specific
         *
         * - **Linux / iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMinimizable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMinimizable(minimizable) {
          return invoke("plugin:window|set_minimizable", {
            label: this.label,
            value: minimizable
          });
        }
        /**
         * Sets whether the window's native close button is enabled or not.
         *
         * #### Platform-specific
         *
         * - **Linux:** GTK+ will do its best to convince the window manager not to show a close button. Depending on the system, this function may not have any effect when called on a window that is already visible
         * - **iOS / Android:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setClosable(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setClosable(closable) {
          return invoke("plugin:window|set_closable", {
            label: this.label,
            value: closable
          });
        }
        /**
         * Sets the window title.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setTitle('Tauri');
         * ```
         *
         * @param title The new title
         * @returns A promise indicating the success or failure of the operation.
         */
        async setTitle(title) {
          return invoke("plugin:window|set_title", {
            label: this.label,
            value: title
          });
        }
        /**
         * Maximizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().maximize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async maximize() {
          return invoke("plugin:window|maximize", {
            label: this.label
          });
        }
        /**
         * Unmaximizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().unmaximize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async unmaximize() {
          return invoke("plugin:window|unmaximize", {
            label: this.label
          });
        }
        /**
         * Toggles the window maximized state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().toggleMaximize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async toggleMaximize() {
          return invoke("plugin:window|toggle_maximize", {
            label: this.label
          });
        }
        /**
         * Minimizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().minimize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async minimize() {
          return invoke("plugin:window|minimize", {
            label: this.label
          });
        }
        /**
         * Unminimizes the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().unminimize();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async unminimize() {
          return invoke("plugin:window|unminimize", {
            label: this.label
          });
        }
        /**
         * Sets the window visibility to true.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().show();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async show() {
          return invoke("plugin:window|show", {
            label: this.label
          });
        }
        /**
         * Sets the window visibility to false.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().hide();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async hide() {
          return invoke("plugin:window|hide", {
            label: this.label
          });
        }
        /**
         * Closes the window.
         *
         * Note this emits a closeRequested event so you can intercept it. To force window close, use {@link Window.destroy}.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().close();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async close() {
          return invoke("plugin:window|close", {
            label: this.label
          });
        }
        /**
         * Destroys the window. Behaves like {@link Window.close} but forces the window close instead of emitting a closeRequested event.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().destroy();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async destroy() {
          return invoke("plugin:window|destroy", {
            label: this.label
          });
        }
        /**
         * Whether the window should have borders and bars.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setDecorations(false);
         * ```
         *
         * @param decorations Whether the window should have borders and bars.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setDecorations(decorations) {
          return invoke("plugin:window|set_decorations", {
            label: this.label,
            value: decorations
          });
        }
        /**
         * Whether or not the window should have shadow.
         *
         * #### Platform-specific
         *
         * - **Windows:**
         *   - `false` has no effect on decorated window, shadows are always ON.
         *   - `true` will make undecorated window have a 1px white border,
         * and on Windows 11, it will have a rounded corners.
         * - **Linux:** Unsupported.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setShadow(false);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setShadow(enable) {
          return invoke("plugin:window|set_shadow", {
            label: this.label,
            value: enable
          });
        }
        /**
         * Set window effects.
         */
        async setEffects(effects) {
          return invoke("plugin:window|set_effects", {
            label: this.label,
            value: effects
          });
        }
        /**
         * Clear any applied effects if possible.
         */
        async clearEffects() {
          return invoke("plugin:window|set_effects", {
            label: this.label,
            value: null
          });
        }
        /**
         * Whether the window should always be on top of other windows.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setAlwaysOnTop(true);
         * ```
         *
         * @param alwaysOnTop Whether the window should always be on top of other windows or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setAlwaysOnTop(alwaysOnTop) {
          return invoke("plugin:window|set_always_on_top", {
            label: this.label,
            value: alwaysOnTop
          });
        }
        /**
         * Whether the window should always be below other windows.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setAlwaysOnBottom(true);
         * ```
         *
         * @param alwaysOnBottom Whether the window should always be below other windows or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setAlwaysOnBottom(alwaysOnBottom) {
          return invoke("plugin:window|set_always_on_bottom", {
            label: this.label,
            value: alwaysOnBottom
          });
        }
        /**
         * Prevents the window contents from being captured by other apps.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setContentProtected(true);
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setContentProtected(protected_) {
          return invoke("plugin:window|set_content_protected", {
            label: this.label,
            value: protected_
          });
        }
        /**
         * Resizes the window with a new inner size.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
         * await getCurrentWindow().setSize(new LogicalSize(600, 500));
         * ```
         *
         * @param size The logical or physical inner size.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSize(size) {
          return invoke("plugin:window|set_size", {
            label: this.label,
            value: size instanceof Size ? size : new Size(size)
          });
        }
        /**
         * Sets the window minimum inner size. If the `size` argument is not provided, the constraint is unset.
         * @example
         * ```typescript
         * import { getCurrentWindow, PhysicalSize } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMinSize(new PhysicalSize(600, 500));
         * ```
         *
         * @param size The logical or physical inner size, or `null` to unset the constraint.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMinSize(size) {
          return invoke("plugin:window|set_min_size", {
            label: this.label,
            value: size instanceof Size ? size : size ? new Size(size) : null
          });
        }
        /**
         * Sets the window maximum inner size. If the `size` argument is undefined, the constraint is unset.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
         * await getCurrentWindow().setMaxSize(new LogicalSize(600, 500));
         * ```
         *
         * @param size The logical or physical inner size, or `null` to unset the constraint.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setMaxSize(size) {
          return invoke("plugin:window|set_max_size", {
            label: this.label,
            value: size instanceof Size ? size : size ? new Size(size) : null
          });
        }
        /**
         * Sets the window inner size constraints.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setSizeConstraints({ minWidth: 300 });
         * ```
         *
         * @param constraints The logical or physical inner size, or `null` to unset the constraint.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSizeConstraints(constraints) {
          function logical(pixel) {
            return pixel ? { Logical: pixel } : null;
          }
          return invoke("plugin:window|set_size_constraints", {
            label: this.label,
            value: {
              minWidth: logical(constraints === null || constraints === void 0 ? void 0 : constraints.minWidth),
              minHeight: logical(constraints === null || constraints === void 0 ? void 0 : constraints.minHeight),
              maxWidth: logical(constraints === null || constraints === void 0 ? void 0 : constraints.maxWidth),
              maxHeight: logical(constraints === null || constraints === void 0 ? void 0 : constraints.maxHeight)
            }
          });
        }
        /**
         * Sets the window outer position.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
         * await getCurrentWindow().setPosition(new LogicalPosition(600, 500));
         * ```
         *
         * @param position The new position, in logical or physical pixels.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setPosition(position) {
          return invoke("plugin:window|set_position", {
            label: this.label,
            value: position instanceof Position ? position : new Position(position)
          });
        }
        /**
         * Sets the window fullscreen state.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setFullscreen(true);
         * ```
         *
         * @param fullscreen Whether the window should go to fullscreen or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setFullscreen(fullscreen) {
          return invoke("plugin:window|set_fullscreen", {
            label: this.label,
            value: fullscreen
          });
        }
        /**
         * On macOS, Toggles a fullscreen mode that doesn’t require a new macOS space. Returns a boolean indicating whether the transition was successful (this won’t work if the window was already in the native fullscreen).
         * This is how fullscreen used to work on macOS in versions before Lion. And allows the user to have a fullscreen window without using another space or taking control over the entire monitor.
         *
         * On other platforms, this is the same as {@link Window.setFullscreen}.
         *
         * @param fullscreen Whether the window should go to simple fullscreen or not.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSimpleFullscreen(fullscreen) {
          return invoke("plugin:window|set_simple_fullscreen", {
            label: this.label,
            value: fullscreen
          });
        }
        /**
         * Bring the window to front and focus.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setFocus();
         * ```
         *
         * @returns A promise indicating the success or failure of the operation.
         */
        async setFocus() {
          return invoke("plugin:window|set_focus", {
            label: this.label
          });
        }
        /**
         * Sets whether the window can be focused.
         *
         * #### Platform-specific
         *
         * - **macOS**: If the window is already focused, it is not possible to unfocus it after calling `set_focusable(false)`.
         *   In this case, you might consider calling {@link Window.setFocus} but it will move the window to the back i.e. at the bottom in terms of z-order.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setFocusable(true);
         * ```
         *
         * @param focusable Whether the window can be focused.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setFocusable(focusable) {
          return invoke("plugin:window|set_focusable", {
            label: this.label,
            value: focusable
          });
        }
        /**
         * Sets the window icon.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setIcon('/tauri/awesome.png');
         * ```
         *
         * Note that you may need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         *
         * @param icon Icon bytes or path to the icon file.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setIcon(icon) {
          return invoke("plugin:window|set_icon", {
            label: this.label,
            value: transformImage(icon)
          });
        }
        /**
         * Whether the window icon should be hidden from the taskbar or not.
         *
         * #### Platform-specific
         *
         * - **macOS:** Unsupported.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setSkipTaskbar(true);
         * ```
         *
         * @param skip true to hide window icon, false to show it.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setSkipTaskbar(skip) {
          return invoke("plugin:window|set_skip_taskbar", {
            label: this.label,
            value: skip
          });
        }
        /**
         * Grabs the cursor, preventing it from leaving the window.
         *
         * There's no guarantee that the cursor will be hidden. You should
         * hide it by yourself if you want so.
         *
         * #### Platform-specific
         *
         * - **Linux:** Unsupported.
         * - **macOS:** This locks the cursor in a fixed location, which looks visually awkward.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorGrab(true);
         * ```
         *
         * @param grab `true` to grab the cursor icon, `false` to release it.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorGrab(grab) {
          return invoke("plugin:window|set_cursor_grab", {
            label: this.label,
            value: grab
          });
        }
        /**
         * Modifies the cursor's visibility.
         *
         * #### Platform-specific
         *
         * - **Windows:** The cursor is only hidden within the confines of the window.
         * - **macOS:** The cursor is hidden as long as the window has input focus, even if the cursor is
         *   outside of the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorVisible(false);
         * ```
         *
         * @param visible If `false`, this will hide the cursor. If `true`, this will show the cursor.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorVisible(visible) {
          return invoke("plugin:window|set_cursor_visible", {
            label: this.label,
            value: visible
          });
        }
        /**
         * Modifies the cursor icon of the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorIcon('help');
         * ```
         *
         * @param icon The new cursor icon.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorIcon(icon) {
          return invoke("plugin:window|set_cursor_icon", {
            label: this.label,
            value: icon
          });
        }
        /**
         * Sets the window background color.
         *
         * #### Platform-specific:
         *
         * - **Windows:** alpha channel is ignored.
         * - **iOS / Android:** Unsupported.
         *
         * @returns A promise indicating the success or failure of the operation.
         *
         * @since 2.1.0
         */
        async setBackgroundColor(color) {
          return invoke("plugin:window|set_background_color", { color });
        }
        /**
         * Changes the position of the cursor in window coordinates.
         * @example
         * ```typescript
         * import { getCurrentWindow, LogicalPosition } from '@tauri-apps/api/window';
         * await getCurrentWindow().setCursorPosition(new LogicalPosition(600, 300));
         * ```
         *
         * @param position The new cursor position.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setCursorPosition(position) {
          return invoke("plugin:window|set_cursor_position", {
            label: this.label,
            value: position instanceof Position ? position : new Position(position)
          });
        }
        /**
         * Changes the cursor events behavior.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setIgnoreCursorEvents(true);
         * ```
         *
         * @param ignore `true` to ignore the cursor events; `false` to process them as usual.
         * @returns A promise indicating the success or failure of the operation.
         */
        async setIgnoreCursorEvents(ignore) {
          return invoke("plugin:window|set_ignore_cursor_events", {
            label: this.label,
            value: ignore
          });
        }
        /**
         * Starts dragging the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().startDragging();
         * ```
         *
         * @return A promise indicating the success or failure of the operation.
         */
        async startDragging() {
          return invoke("plugin:window|start_dragging", {
            label: this.label
          });
        }
        /**
         * Starts resize-dragging the window.
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().startResizeDragging();
         * ```
         *
         * @return A promise indicating the success or failure of the operation.
         */
        async startResizeDragging(direction) {
          return invoke("plugin:window|start_resize_dragging", {
            label: this.label,
            value: direction
          });
        }
        /**
         * Sets the badge count. It is app wide and not specific to this window.
         *
         * #### Platform-specific
         *
         * - **Windows**: Unsupported. Use @{linkcode Window.setOverlayIcon} instead.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setBadgeCount(5);
         * ```
         *
         * @param count The badge count. Use `undefined` to remove the badge.
         * @return A promise indicating the success or failure of the operation.
         */
        async setBadgeCount(count) {
          return invoke("plugin:window|set_badge_count", {
            label: this.label,
            value: count
          });
        }
        /**
         * Sets the badge cont **macOS only**.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setBadgeLabel("Hello");
         * ```
         *
         * @param label The badge label. Use `undefined` to remove the badge.
         * @return A promise indicating the success or failure of the operation.
         */
        async setBadgeLabel(label) {
          return invoke("plugin:window|set_badge_label", {
            label: this.label,
            value: label
          });
        }
        /**
         * Sets the overlay icon. **Windows only**
         * The overlay icon can be set for every window.
         *
         *
         * Note that you may need the `image-ico` or `image-png` Cargo features to use this API.
         * To enable it, change your Cargo.toml file:
         *
         * ```toml
         * [dependencies]
         * tauri = { version = "...", features = ["...", "image-png"] }
         * ```
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from '@tauri-apps/api/window';
         * await getCurrentWindow().setOverlayIcon("/tauri/awesome.png");
         * ```
         *
         * @param icon Icon bytes or path to the icon file. Use `undefined` to remove the overlay icon.
         * @return A promise indicating the success or failure of the operation.
         */
        async setOverlayIcon(icon) {
          return invoke("plugin:window|set_overlay_icon", {
            label: this.label,
            value: icon ? transformImage(icon) : void 0
          });
        }
        /**
         * Sets the taskbar progress state.
         *
         * #### Platform-specific
         *
         * - **Linux / macOS**: Progress bar is app-wide and not specific to this window.
         * - **Linux**: Only supported desktop environments with `libunity` (e.g. GNOME).
         *
         * @example
         * ```typescript
         * import { getCurrentWindow, ProgressBarStatus } from '@tauri-apps/api/window';
         * await getCurrentWindow().setProgressBar({
         *   status: ProgressBarStatus.Normal,
         *   progress: 50,
         * });
         * ```
         *
         * @return A promise indicating the success or failure of the operation.
         */
        async setProgressBar(state) {
          return invoke("plugin:window|set_progress_bar", {
            label: this.label,
            value: state
          });
        }
        /**
         * Sets whether the window should be visible on all workspaces or virtual desktops.
         *
         * #### Platform-specific
         *
         * - **Windows / iOS / Android:** Unsupported.
         *
         * @since 2.0.0
         */
        async setVisibleOnAllWorkspaces(visible) {
          return invoke("plugin:window|set_visible_on_all_workspaces", {
            label: this.label,
            value: visible
          });
        }
        /**
         * Sets the title bar style. **macOS only**.
         *
         * @since 2.0.0
         */
        async setTitleBarStyle(style) {
          return invoke("plugin:window|set_title_bar_style", {
            label: this.label,
            value: style
          });
        }
        /**
         * Set window theme, pass in `null` or `undefined` to follow system theme
         *
         * #### Platform-specific
         *
         * - **Linux / macOS**: Theme is app-wide and not specific to this window.
         * - **iOS / Android:** Unsupported.
         *
         * @since 2.0.0
         */
        async setTheme(theme) {
          return invoke("plugin:window|set_theme", {
            label: this.label,
            value: theme
          });
        }
        // Listeners
        /**
         * Listen to window resize.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onResized(({ payload: size }) => {
         *  console.log('Window resized', size);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onResized(handler) {
          return this.listen(TauriEvent.WINDOW_RESIZED, (e) => {
            e.payload = new PhysicalSize(e.payload);
            handler(e);
          });
        }
        /**
         * Listen to window move.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onMoved(({ payload: position }) => {
         *  console.log('Window moved', position);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onMoved(handler) {
          return this.listen(TauriEvent.WINDOW_MOVED, (e) => {
            e.payload = new PhysicalPosition(e.payload);
            handler(e);
          });
        }
        /**
         * Listen to window close requested. Emitted when the user requests to closes the window.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * import { confirm } from '@tauri-apps/api/dialog';
         * const unlisten = await getCurrentWindow().onCloseRequested(async (event) => {
         *   const confirmed = await confirm('Are you sure?');
         *   if (!confirmed) {
         *     // user did not confirm closing the window; let's prevent it
         *     event.preventDefault();
         *   }
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onCloseRequested(handler) {
          return this.listen(TauriEvent.WINDOW_CLOSE_REQUESTED, async (event) => {
            const evt = new CloseRequestedEvent(event);
            await handler(evt);
            if (!evt.isPreventDefault()) {
              await this.destroy();
            }
          });
        }
        /**
         * Listen to a file drop event.
         * The listener is triggered when the user hovers the selected files on the webview,
         * drops the files or cancels the operation.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/webview";
         * const unlisten = await getCurrentWindow().onDragDropEvent((event) => {
         *  if (event.payload.type === 'over') {
         *    console.log('User hovering', event.payload.position);
         *  } else if (event.payload.type === 'drop') {
         *    console.log('User dropped', event.payload.paths);
         *  } else {
         *    console.log('File drop cancelled');
         *  }
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onDragDropEvent(handler) {
          const unlistenDrag = await this.listen(TauriEvent.DRAG_ENTER, (event) => {
            handler({
              ...event,
              payload: {
                type: "enter",
                paths: event.payload.paths,
                position: new PhysicalPosition(event.payload.position)
              }
            });
          });
          const unlistenDragOver = await this.listen(TauriEvent.DRAG_OVER, (event) => {
            handler({
              ...event,
              payload: {
                type: "over",
                position: new PhysicalPosition(event.payload.position)
              }
            });
          });
          const unlistenDrop = await this.listen(TauriEvent.DRAG_DROP, (event) => {
            handler({
              ...event,
              payload: {
                type: "drop",
                paths: event.payload.paths,
                position: new PhysicalPosition(event.payload.position)
              }
            });
          });
          const unlistenCancel = await this.listen(TauriEvent.DRAG_LEAVE, (event) => {
            handler({ ...event, payload: { type: "leave" } });
          });
          return () => {
            unlistenDrag();
            unlistenDrop();
            unlistenDragOver();
            unlistenCancel();
          };
        }
        /**
         * Listen to window focus change.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
         *  console.log('Focus changed, window is focused? ' + focused);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onFocusChanged(handler) {
          const unlistenFocus = await this.listen(TauriEvent.WINDOW_FOCUS, (event) => {
            handler({ ...event, payload: true });
          });
          const unlistenBlur = await this.listen(TauriEvent.WINDOW_BLUR, (event) => {
            handler({ ...event, payload: false });
          });
          return () => {
            unlistenFocus();
            unlistenBlur();
          };
        }
        /**
         * Listen to window scale change. Emitted when the window's scale factor has changed.
         * The following user actions can cause DPI changes:
         * - Changing the display's resolution.
         * - Changing the display's scale factor (e.g. in Control Panel on Windows).
         * - Moving the window to a display with a different scale factor.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onScaleChanged(({ payload }) => {
         *  console.log('Scale changed', payload.scaleFactor, payload.size);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onScaleChanged(handler) {
          return this.listen(TauriEvent.WINDOW_SCALE_FACTOR_CHANGED, handler);
        }
        /**
         * Listen to the system theme change.
         *
         * @example
         * ```typescript
         * import { getCurrentWindow } from "@tauri-apps/api/window";
         * const unlisten = await getCurrentWindow().onThemeChanged(({ payload: theme }) => {
         *  console.log('New theme: ' + theme);
         * });
         *
         * // you need to call unlisten if your handler goes out of scope e.g. the component is unmounted
         * unlisten();
         * ```
         *
         * @returns A promise resolving to a function to unlisten to the event.
         * Note that removing the listener is required if your listener goes out of scope e.g. the component is unmounted.
         */
        async onThemeChanged(handler) {
          return this.listen(TauriEvent.WINDOW_THEME_CHANGED, handler);
        }
      };
      (function(BackgroundThrottlingPolicy2) {
        BackgroundThrottlingPolicy2["Disabled"] = "disabled";
        BackgroundThrottlingPolicy2["Throttle"] = "throttle";
        BackgroundThrottlingPolicy2["Suspend"] = "suspend";
      })(BackgroundThrottlingPolicy || (BackgroundThrottlingPolicy = {}));
      (function(ScrollBarStyle2) {
        ScrollBarStyle2["Default"] = "default";
        ScrollBarStyle2["FluentOverlay"] = "fluentOverlay";
      })(ScrollBarStyle || (ScrollBarStyle = {}));
      (function(Effect2) {
        Effect2["AppearanceBased"] = "appearanceBased";
        Effect2["Light"] = "light";
        Effect2["Dark"] = "dark";
        Effect2["MediumLight"] = "mediumLight";
        Effect2["UltraDark"] = "ultraDark";
        Effect2["Titlebar"] = "titlebar";
        Effect2["Selection"] = "selection";
        Effect2["Menu"] = "menu";
        Effect2["Popover"] = "popover";
        Effect2["Sidebar"] = "sidebar";
        Effect2["HeaderView"] = "headerView";
        Effect2["Sheet"] = "sheet";
        Effect2["WindowBackground"] = "windowBackground";
        Effect2["HudWindow"] = "hudWindow";
        Effect2["FullScreenUI"] = "fullScreenUI";
        Effect2["Tooltip"] = "tooltip";
        Effect2["ContentBackground"] = "contentBackground";
        Effect2["UnderWindowBackground"] = "underWindowBackground";
        Effect2["UnderPageBackground"] = "underPageBackground";
        Effect2["Mica"] = "mica";
        Effect2["Blur"] = "blur";
        Effect2["Acrylic"] = "acrylic";
        Effect2["Tabbed"] = "tabbed";
        Effect2["TabbedDark"] = "tabbedDark";
        Effect2["TabbedLight"] = "tabbedLight";
      })(Effect || (Effect = {}));
      (function(EffectState2) {
        EffectState2["FollowsWindowActiveState"] = "followsWindowActiveState";
        EffectState2["Active"] = "active";
        EffectState2["Inactive"] = "inactive";
      })(EffectState || (EffectState = {}));
    }
  });

  // src/app.js
  var require_app = __commonJS({
    "src/app.js"() {
      init_core();
      init_event();
      init_window();
      var currentStep = "camera";
      var cameraOpen = false;
      var lastPayload = null;
      var lastBoardPrint = null;
      var generatedBoards = [];
      var intrinsicsFrames = 0;
      var calibrationFrameSummaries = [];
      var boardNameDirty = false;
      var MIN_INTRINSICS_FRAMES = 6;
      var controlDebounceTimers = /* @__PURE__ */ new Map();
      function showStep(name) {
        currentStep = name;
        document.querySelectorAll(".step").forEach((el) => el.classList.toggle("active", el.dataset.step === name));
        document.querySelectorAll(".page").forEach((el) => el.classList.toggle("active", el.id === "page-" + name));
      }
      async function loadBackends() {
        try {
          const backends = await invoke("list_camera_backends");
          const sel = document.getElementById("backendSelect");
          sel.innerHTML = "";
          backends.forEach((b) => {
            const opt = document.createElement("option");
            opt.value = b.name;
            opt.textContent = b.name === "opencv-msmf" ? "Media Foundation (Windows Camera path)" : b.name === "opencv-dshow" ? "DirectShow (UVC controls)" : b.name === "arducam-sdk" ? "Arducam SDK" : b.name === "opencv-sidecar" ? "Native Vision Sidecar" : b.name === "opencv" ? "OpenCV" : b.name;
            opt.title = b.description || "";
            opt.disabled = !b.available;
            sel.appendChild(opt);
          });
          if (!sel.value && backends.length) sel.value = backends[0].name;
          if (sel.value) await invoke("select_camera_backend", { backendName: sel.value });
        } catch (e) {
          console.error("Backend load failed:", e);
        }
      }
      async function refreshCameras() {
        try {
          const backendName = document.getElementById("backendSelect")?.value;
          if (backendName) await invoke("select_camera_backend", { backendName });
          const cameras = await invoke("enumerate_cameras");
          const sel = document.getElementById("cameraSelect");
          sel.innerHTML = '<option value="">\u2014 select \u2014</option>';
          cameras.forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c.index;
            opt.textContent = c.name || `Camera_${c.index}`;
            opt.title = c.device_id || "";
            sel.appendChild(opt);
          });
        } catch (e) {
          console.error("Enumerate failed:", e);
        }
      }
      async function openCamera() {
        const idx = parseInt(document.getElementById("cameraSelect").value);
        if (isNaN(idx)) return;
        const res = document.getElementById("resolutionSelect").value.split("x");
        const width = parseInt(res[0]);
        const height = parseInt(res[1]);
        const fps = parseFloat(document.getElementById("fpsSelect").value);
        const selectedCamera = document.getElementById("cameraSelect").selectedOptions[0]?.textContent || `Camera_${idx}`;
        try {
          const result = await invoke("open_camera", {
            deviceIndex: idx,
            width,
            height,
            fourcc: document.getElementById("formatSelect").value,
            fps
          });
          cameraOpen = true;
          document.getElementById("openCamBtn").disabled = true;
          document.getElementById("refreshAfBtn").disabled = false;
          document.getElementById("closeCamBtn").disabled = false;
          document.getElementById("previewOff").style.display = "none";
          document.getElementById("statusCamera").textContent = `Camera: ${selectedCamera} \xB7 ${result.actual_width}\xD7${result.actual_height} \xB7 ${result.actual_fourcc || "----"} \xB7 ${Number(result.actual_fps || 0).toFixed(1)} fps`;
          loadControls();
        } catch (e) {
          alert("Camera error: " + e);
        }
      }
      async function refreshAutofocus() {
        const button = document.getElementById("refreshAfBtn");
        const status = document.getElementById("statusCamera");
        button.disabled = true;
        const previousStatus = status.textContent;
        status.textContent = `${previousStatus} \xB7 autofocus refresh...`;
        try {
          await invoke("refresh_autofocus");
          await loadControls();
          status.textContent = `${previousStatus} \xB7 autofocus refreshed`;
        } catch (e) {
          status.textContent = previousStatus;
          alert("Autofocus refresh failed: " + e);
        } finally {
          button.disabled = !cameraOpen;
        }
      }
      async function closeCamera() {
        try {
          await invoke("close_camera");
          cameraOpen = false;
          document.getElementById("openCamBtn").disabled = false;
          document.getElementById("refreshAfBtn").disabled = true;
          document.getElementById("closeCamBtn").disabled = true;
          document.getElementById("previewOff").style.display = "";
          document.getElementById("previewImg").src = "";
          document.getElementById("statusCamera").textContent = "Camera: \u2014";
        } catch (e) {
          console.error(e);
        }
      }
      async function loadControls() {
        try {
          const controls = await invoke("get_camera_controls");
          if (!controls) return;
          const panel = document.getElementById("controlsPanel");
          panel.innerHTML = "";
          if (!controls.length) {
            panel.innerHTML = '<div class="info-text">No camera controls reported by this backend.</div>';
            return;
          }
          controls.forEach((c) => {
            const div = document.createElement("div");
            div.className = "control-item" + (c.supported ? "" : " unsupported");
            if (c.control_type === "Boolean") {
              div.innerHTML = `<label>${c.name}</label><label><input type="checkbox" ${c.value ? "checked" : ""} /> ${c.supported ? "" : "(unsupported)"}</label>`;
              div.querySelector("input").addEventListener("change", (e) => invoke("set_auto_control", { controlKey: c.key, enabled: e.target.checked }).catch(console.error));
            } else {
              div.innerHTML = `<label>${c.name} <span>${c.value}</span></label><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.value}" ${c.supported ? "" : "disabled"} />`;
              const slider = div.querySelector('input[type="range"]');
              const span = div.querySelector("span");
              const sendControl = () => {
                invoke("set_camera_control", { controlKey: c.key, value: parseInt(slider.value) }).catch(console.error);
              };
              slider.addEventListener("input", () => {
                span.textContent = slider.value;
                clearTimeout(controlDebounceTimers.get(c.key));
                controlDebounceTimers.set(c.key, setTimeout(sendControl, 200));
              });
              slider.addEventListener("change", sendControl);
            }
            panel.appendChild(div);
          });
        } catch (e) {
          console.error(e);
        }
      }
      function describeBoard(board) {
        return `${board.name} (${board.config.squares_x}x${board.config.squares_y}, ${board.config.square_length_mm}mm, ${board.config.dictionary_name})`;
      }
      function selectedPaperSizeMm() {
        const paper = document.getElementById("paperSize")?.value;
        if (paper === "a4") return { width: 210, height: 297, label: "A4" };
        if (paper === "a3") return { width: 297, height: 420, label: "A3" };
        const width = parseFloat(document.getElementById("paperW")?.value || "0");
        const height = parseFloat(document.getElementById("paperH")?.value || "0");
        return { width, height, label: `${width}x${height}mm` };
      }
      function suggestedBoardName() {
        const paper = selectedPaperSizeMm();
        const square = parseFloat(document.getElementById("squareSize")?.value || "0");
        const dict = document.getElementById("dictSelect")?.value || "DICT_4X4_250";
        const fullPage = document.getElementById("fullPage")?.checked ?? false;
        const squareLabel = Number.isFinite(square) && square > 0 ? String(square).replace(/\.0+$/, "") : "custom";
        return `${paper.label} ${squareLabel}mm ${dict}${fullPage ? " full-page" : ""} ChArUco`;
      }
      function updateBoardName(force = false) {
        const input = document.getElementById("boardName");
        if (!input) return;
        if (force || !boardNameDirty || !input.value.trim()) {
          input.value = suggestedBoardName();
        }
      }
      async function loadGeneratedBoards(selectedId = "") {
        try {
          generatedBoards = await invoke("list_generated_charuco_boards");
          const selects = [
            document.getElementById("boardLibrarySelect"),
            document.getElementById("intrBoardSelect")
          ].filter(Boolean);
          selects.forEach((select) => {
            const previous = selectedId || select.value;
            select.innerHTML = "";
            if (!generatedBoards.length) {
              const opt = document.createElement("option");
              opt.value = "";
              opt.textContent = "Generate a board first";
              select.appendChild(opt);
              return;
            }
            generatedBoards.forEach((board) => {
              const opt = document.createElement("option");
              opt.value = board.id;
              opt.textContent = describeBoard(board);
              select.appendChild(opt);
            });
            select.value = generatedBoards.some((board) => board.id === previous) ? previous : generatedBoards[generatedBoards.length - 1].id;
          });
          syncSelectedBoardForPrint();
        } catch (e) {
          console.error("Board library load failed:", e);
        }
      }
      function selectedBoard() {
        const id = document.getElementById("boardLibrarySelect")?.value;
        return generatedBoards.find((board) => board.id === id) || null;
      }
      function syncSelectedBoardForPrint() {
        const board = selectedBoard();
        document.getElementById("printBoardBtn").disabled = !board || !board.verification_passed;
        lastBoardPrint = board ? {
          id: board.id,
          path: board.path,
          paperWidthMm: board.paper_width_mm,
          paperHeightMm: board.paper_height_mm,
          boardWidthMm: board.board_width_mm,
          boardHeightMm: board.board_height_mm
        } : null;
      }
      async function generateBoard() {
        updateBoardName();
        const { width: pw, height: ph } = selectedPaperSizeMm();
        const sq = parseFloat(document.getElementById("squareSize").value);
        const dict = document.getElementById("dictSelect").value;
        const fullPage = document.getElementById("fullPage")?.checked ?? false;
        let sx, sy;
        if (fullPage) {
          const usableW = pw - 10;
          const usableH = ph - 10;
          sx = Math.floor(usableW / sq);
          sy = Math.floor(usableH / sq);
        } else {
          sx = Math.floor(pw / sq);
          sy = Math.floor(ph / sq);
        }
        if (sx < 2 || sy < 2) {
          alert("Paper too small for this square size");
          return;
        }
        const marker = sq * 0.7;
        try {
          const result = await invoke("generate_charuco_board", {
            name: document.getElementById("boardName").value,
            config: { squares_x: sx, squares_y: sy, square_length_mm: sq, marker_length_mm: marker, dictionary_name: dict, legacy_pattern: false },
            paperWidthMm: pw,
            paperHeightMm: ph,
            pixelsPerMm: 8
          });
          const expectedCorners = (sx - 1) * (sy - 1);
          await loadGeneratedBoards(result.board?.id);
          const svgText = result.svg_path ? ` SVG saved to ${result.svg_path}` : "";
          document.getElementById("boardInfo").textContent = `Generated ${sx}\xD7${sy} squares (${result.width_px}\xD7${result.height_px}px). OpenCV verification: ${result.verification_corner_count}/${expectedCorners} corners ${result.verification_passed ? "\u2713" : "\u2717"}. Saved to ${result.path}.${svgText}`;
        } catch (e) {
          alert("Board generation failed: " + e);
        }
      }
      async function printGeneratedBoard() {
        if (!lastBoardPrint) return;
        let imageSrc;
        try {
          imageSrc = await invoke("get_generated_charuco_board_image", { boardId: lastBoardPrint.id });
        } catch (e) {
          document.getElementById("boardInfo").textContent = "Print image load failed: " + e;
          return;
        }
        const frame = document.createElement("iframe");
        frame.className = "print-frame";
        frame.setAttribute("aria-hidden", "true");
        frame.addEventListener("load", () => {
          setTimeout(() => {
            frame.contentWindow?.addEventListener("afterprint", () => frame.remove(), { once: true });
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
            setTimeout(() => frame.remove(), 3e3);
          }, 150);
        });
        frame.srcdoc = `<!doctype html>
    <html>
      <head>
        <title>Bedmapper ChArUco Board</title>
        <style>
          @page { size: ${lastBoardPrint.paperWidthMm}mm ${lastBoardPrint.paperHeightMm}mm; margin: 0; }
          html, body {
            width: ${lastBoardPrint.paperWidthMm}mm;
            height: ${lastBoardPrint.paperHeightMm}mm;
            margin: 0;
            background: white;
          }
          body {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          img {
            display: block;
            width: ${lastBoardPrint.boardWidthMm}mm;
            height: ${lastBoardPrint.boardHeightMm}mm;
            image-rendering: crisp-edges;
          }
        </style>
      </head>
      <body><img src="${imageSrc}" /></body>
    </html>`;
        document.body.appendChild(frame);
      }
      async function scanOnce() {
        try {
          const result = await invoke("scan_once", { publish: true });
          lastPayload = result.payload;
          document.getElementById("scanStatus").textContent = `${result.payload.objects.length} objects in ${result.processing_ms}ms`;
          if (result.debug_image_base64) document.getElementById("scanPreview").src = "data:image/jpeg;base64," + result.debug_image_base64;
        } catch (e) {
          alert("Scan failed: " + e);
        }
      }
      var CALIBRATION_SHEET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
  <defs>
    <style>
      .fine { stroke: #cfcfcf; stroke-width: 0.18; }
      .major { stroke: #8a8a8a; stroke-width: 0.32; }
      .axis { stroke: #111; stroke-width: 0.55; }
      .diag { stroke: #111; stroke-width: 0.35; stroke-dasharray: 2 1.5; }
      .border { fill: none; stroke: #111; stroke-width: 0.55; }
      .text { font-family: Arial, Helvetica, sans-serif; fill: #111; }
      .small { font-size: 3.2px; }
      .body { font-size: 3.7px; }
      .title { font-size: 6px; font-weight: 700; }
      .label { font-size: 3px; fill: #333; }
    </style>
  </defs>

  <rect x="0" y="0" width="210" height="297" fill="white"/>
  <text x="5" y="8" class="text title">Camera perpendicular tramming sheet</text>
  <text x="5" y="14" class="text body">Print at 100% scale. Do not use fit-to-page. Check the 100 mm reference before use.</text>

  <g id="grid" transform="translate(5 20)">
    <rect x="0" y="0" width="200" height="200" class="border"/>
    <g class="fine">
      ${Array.from({ length: 19 }, (_, i) => {
        const p = (i + 1) * 10;
        if (p % 50 === 0 || p === 100) return "";
        return `<line x1="${p}" y1="0" x2="${p}" y2="200"/><line x1="0" y1="${p}" x2="200" y2="${p}"/>`;
      }).join("")}
    </g>
    <g class="major">
      <line x1="50" y1="0" x2="50" y2="200"/>
      <line x1="150" y1="0" x2="150" y2="200"/>
      <line x1="0" y1="50" x2="200" y2="50"/>
      <line x1="0" y1="150" x2="200" y2="150"/>
    </g>
    <line x1="100" y1="0" x2="100" y2="200" class="axis"/>
    <line x1="0" y1="100" x2="200" y2="100" class="axis"/>
    <line x1="0" y1="0" x2="200" y2="200" class="diag"/>
    <line x1="200" y1="0" x2="0" y2="200" class="diag"/>
    <rect x="75" y="75" width="50" height="50" class="major" fill="none"/>
    <rect x="50" y="50" width="100" height="100" class="major" fill="none"/>
    <rect x="25" y="25" width="150" height="150" class="major" fill="none"/>
    <circle cx="100" cy="100" r="12.5" fill="none" class="axis"/>
    <circle cx="100" cy="100" r="5" fill="none" class="axis"/>
    <line x1="92" y1="100" x2="108" y2="100" class="axis"/>
    <line x1="100" y1="92" x2="100" y2="108" class="axis"/>
    <line x1="10" y1="192" x2="110" y2="192" class="axis"/>
    <line x1="10" y1="188" x2="10" y2="196" class="axis"/>
    <line x1="110" y1="188" x2="110" y2="196" class="axis"/>
    <text x="43" y="187" class="text label">100 mm check</text>
    <text x="3" y="-2" class="text label">200 x 200 mm camera tram grid</text>
    <text x="95" y="98" class="text label">CENTER</text>
  </g>

  <g transform="translate(5 230)">
    <text x="0" y="0" class="text title">Quick tramming procedure</text>
    <text x="0" y="8" class="text body">1. Tape this sheet flat to the copy stand base or a flat board.</text>
    <text x="0" y="15" class="text body">2. Set the camera height around 800-900 mm if that frames the whole grid cleanly.</text>
    <text x="0" y="22" class="text body">3. Center the camera so the crosshair sits near the image center.</text>
    <text x="0" y="29" class="text body">4. Adjust tilt until opposite grid edges look equally long and the diagonals cross at center.</text>
    <text x="0" y="36" class="text body">5. Rotate the camera until the 100 mm centerlines are horizontal/vertical in the preview.</text>
    <text x="0" y="43" class="text body">6. Lock the mount, then refocus and avoid changing zoom, focus, or resolution afterwards.</text>
    <text x="0" y="50" class="text body">7. This gets the camera mechanically close; software calibration still handles the final perspective.</text>
    <text x="0" y="61" class="text small">Tip: Perpendicular is good, but repeatable is more important. If the camera moves, recalibrate.</text>
  </g>
</svg>`;
      function printCalibrationSheet() {
        const frame = document.createElement("iframe");
        frame.className = "print-frame";
        frame.setAttribute("aria-hidden", "true");
        frame.addEventListener("load", () => {
          setTimeout(() => {
            frame.contentWindow?.addEventListener("afterprint", () => frame.remove(), { once: true });
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
            setTimeout(() => frame.remove(), 3e3);
          }, 100);
        });
        frame.srcdoc = `<!doctype html>
    <html>
      <head>
        <title>Bedmapper Calibration Sheet</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body { width: 210mm; height: 297mm; margin: 0; background: white; }
          svg { display: block; width: 210mm; height: 297mm; }
        </style>
      </head>
      <body>${CALIBRATION_SHEET_SVG}</body>
    </html>`;
        document.body.appendChild(frame);
      }
      function updateIntrinsicsFrameCount(count = intrinsicsFrames) {
        intrinsicsFrames = count;
        document.getElementById("intrFrameCount").textContent = `${intrinsicsFrames} frame${intrinsicsFrames === 1 ? "" : "s"} captured. Need ${MIN_INTRINSICS_FRAMES} minimum; 10-12 recommended.`;
        document.getElementById("computeIntrBtn").disabled = intrinsicsFrames < MIN_INTRINSICS_FRAMES;
      }
      function formatNumber(value, digits = 2) {
        return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "\u2014";
      }
      function formatError(summary) {
        const px = summary.reprojection_error_px;
        const mm = summary.approx_error_mm;
        if (typeof mm === "number") return `${formatNumber(mm, 2)} mm (${formatNumber(px, 2)} px)`;
        if (typeof px === "number") return `${formatNumber(px, 2)} px`;
        return "Not computed";
      }
      function renderCalibrationFrames(summaries = calibrationFrameSummaries) {
        calibrationFrameSummaries = summaries || [];
        const body = document.getElementById("intrFramesBody");
        if (!body) return;
        if (!calibrationFrameSummaries.length) {
          body.innerHTML = '<tr><td colspan="7" class="empty-cell">No calibration frames captured yet.</td></tr>';
          return;
        }
        body.innerHTML = calibrationFrameSummaries.map((frame) => {
          const flags = frame.flags?.length ? frame.flags.join(", ") : "\u2014";
          const coverage = frame.expected_corner_count ? `${frame.corner_count}/${frame.expected_corner_count}` : `${frame.corner_count}`;
          return `<tr>
      <td>${frame.frame_index}</td>
      <td>${frame.board_name}</td>
      <td>${coverage}</td>
      <td>${formatError(frame)}</td>
      <td><span class="quality-badge ${frame.quality_level}">${frame.quality_label}</span></td>
      <td>${flags}</td>
      <td class="table-actions">
        <button class="btn-sm" data-action="view-frame" data-frame="${frame.frame_index}">View</button>
        <button class="btn-sm danger" data-action="delete-frame" data-frame="${frame.frame_index}">Delete</button>
      </td>
    </tr>`;
        }).join("");
      }
      function updateCalibrationSummary(result = null) {
        const meanEl = document.getElementById("intrMeanError");
        const maxEl = document.getElementById("intrMaxError");
        const scaleEl = document.getElementById("intrScale");
        if (!meanEl || !maxEl || !scaleEl) return;
        if (!result) {
          meanEl.textContent = "\u2014";
          maxEl.textContent = "\u2014";
          scaleEl.textContent = "Define bed area";
          return;
        }
        meanEl.textContent = result.approx_mean_error_mm != null ? `${formatNumber(result.approx_mean_error_mm, 2)} mm` : `${formatNumber(result.mean_frame_error_px, 2)} px`;
        maxEl.textContent = result.approx_max_error_mm != null ? `${formatNumber(result.approx_max_error_mm, 2)} mm` : `${formatNumber(result.max_frame_error_px, 2)} px`;
        scaleEl.textContent = result.px_per_mm ? `${formatNumber(result.px_per_mm, 2)} px/mm` : "Define bed area";
      }
      async function loadIntrinsicsFrames() {
        try {
          const summaries = await invoke("list_intrinsics_calibration_frames");
          updateIntrinsicsFrameCount(summaries.length);
          renderCalibrationFrames(summaries);
        } catch (e) {
          console.error("Frame list failed:", e);
        }
      }
      async function captureIntrinsicsFrame() {
        const resultEl = document.getElementById("intrResult");
        const button = document.getElementById("captureIntrBtn");
        const boardId = document.getElementById("intrBoardSelect").value;
        if (!boardId) {
          resultEl.textContent = "Generate and select the board visible in this capture first.";
          return;
        }
        button.disabled = true;
        resultEl.textContent = "Capturing calibration frame... hold the board steady.";
        try {
          const result = await invoke("capture_intrinsics_frame", { boardId });
          updateIntrinsicsFrameCount(result.total_frames);
          await loadIntrinsicsFrames();
          if (result.accepted) {
            resultEl.textContent = `Accepted frame ${result.total_frames} using ${result.board_name}: detected ${result.corner_count}/${result.expected_corner_count} ChArUco corners.`;
          } else {
            resultEl.textContent = result.rejection_reason || `Rejected frame: detected ${result.corner_count} ChArUco corners.`;
          }
        } catch (e) {
          resultEl.textContent = "Capture failed: " + e;
        } finally {
          button.disabled = false;
        }
      }
      async function computeIntrinsics() {
        const resultEl = document.getElementById("intrResult");
        const button = document.getElementById("computeIntrBtn");
        button.disabled = true;
        resultEl.textContent = "Computing camera intrinsics...";
        try {
          const result = await invoke("compute_intrinsics_calibration");
          updateCalibrationSummary(result);
          renderCalibrationFrames(result.frame_summaries);
          const mmText = result.approx_mean_error_mm != null ? ` Approx mean error: ${formatNumber(result.approx_mean_error_mm, 2)} mm; max frame: ${formatNumber(result.approx_max_error_mm, 2)} mm.` : " Define the bed area to convert pixel error into approximate mm error.";
          resultEl.textContent = `Intrinsics saved. Used ${result.frames_used} frames. OpenCV RMS: ${result.reprojection_error.toFixed(4)} px. Mean frame fit: ${formatNumber(result.mean_frame_error_px, 2)} px; max: ${formatNumber(result.max_frame_error_px, 2)} px.${mmText}`;
        } catch (e) {
          resultEl.textContent = "Compute failed: " + e;
        } finally {
          button.disabled = intrinsicsFrames < MIN_INTRINSICS_FRAMES;
        }
      }
      async function clearIntrinsicsFrames() {
        await invoke("clear_intrinsics_calibration_frames").catch(console.error);
        updateIntrinsicsFrameCount(0);
        renderCalibrationFrames([]);
        updateCalibrationSummary(null);
        document.getElementById("intrResult").textContent = "Calibration frames cleared.";
      }
      async function viewIntrinsicsFrame(frameIndex) {
        try {
          const src = await invoke("view_intrinsics_calibration_frame", { frameIndex });
          document.getElementById("frameModalTitle").textContent = `Calibration Frame ${frameIndex}`;
          document.getElementById("frameModalImg").src = src;
          document.getElementById("frameModal").hidden = false;
        } catch (e) {
          document.getElementById("intrResult").textContent = "Could not load frame: " + e;
        }
      }
      async function deleteIntrinsicsFrame(frameIndex) {
        try {
          const summaries = await invoke("delete_intrinsics_calibration_frame", { frameIndex });
          updateIntrinsicsFrameCount(summaries.length);
          renderCalibrationFrames(summaries);
          updateCalibrationSummary(null);
          document.getElementById("intrResult").textContent = `Deleted frame ${frameIndex}. Recompute intrinsics to refresh quality estimates.`;
        } catch (e) {
          document.getElementById("intrResult").textContent = "Delete failed: " + e;
        }
      }
      function closeFrameModal() {
        document.getElementById("frameModal").hidden = true;
        document.getElementById("frameModalImg").src = "";
      }
      function drawTramOverlay() {
        const canvas = document.getElementById("tramCanvas");
        const wrap = document.getElementById("tramPreviewWrap");
        if (!canvas || !wrap) return;
        const w = wrap.offsetWidth;
        const h = wrap.offsetHeight;
        if (w < 10 || h < 10) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);
        const showGrid = document.getElementById("showGrid")?.checked ?? true;
        const showCross = document.getElementById("showCrosshair")?.checked ?? true;
        const divisions = parseInt(document.getElementById("gridDivisions")?.value || "20");
        const gridSize = Math.min(w, h) * 0.82;
        const x0 = (w - gridSize) / 2;
        const y0 = (h - gridSize) / 2;
        const x1 = x0 + gridSize;
        const y1 = y0 + gridSize;
        const cx = w / 2;
        const cy = h / 2;
        const line = (a, b, c, d) => {
          ctx.beginPath();
          ctx.moveTo(a, b);
          ctx.lineTo(c, d);
          ctx.stroke();
        };
        const rectCentered = (sizeRatio) => {
          const size = gridSize * sizeRatio;
          ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
        };
        if (showGrid) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
          ctx.lineWidth = 3;
          ctx.strokeRect(x0, y0, gridSize, gridSize);
          ctx.strokeStyle = "rgba(0, 212, 255, 0.42)";
          ctx.lineWidth = 1;
          for (let i = 1; i < divisions; i++) {
            const p = i / divisions;
            const isMajor = i % Math.max(1, Math.round(divisions / 4)) === 0;
            ctx.strokeStyle = isMajor ? "rgba(255, 255, 255, 0.78)" : "rgba(0, 212, 255, 0.42)";
            ctx.lineWidth = isMajor ? 2 : 1;
            const x = x0 + gridSize * p;
            const y = y0 + gridSize * p;
            line(x, y0, x, y1);
            line(x0, y, x1, y);
          }
          ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
          ctx.setLineDash([8, 6]);
          ctx.lineWidth = 1.5;
          line(x0, y0, x1, y1);
          line(x1, y0, x0, y1);
          ctx.setLineDash([]);
          ctx.strokeStyle = "rgba(0, 212, 255, 0.9)";
          ctx.lineWidth = 2;
          rectCentered(0.25);
          rectCentered(0.5);
          rectCentered(0.75);
        }
        if (showCross) {
          const outer = gridSize * 0.0625;
          const inner = gridSize * 0.025;
          const arm = gridSize * 0.14;
          const gap = gridSize * 0.025;
          ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
          ctx.lineWidth = 7;
          line(cx - arm, cy, cx - gap, cy);
          line(cx + gap, cy, cx + arm, cy);
          line(cx, cy - arm, cx, cy - gap);
          line(cx, cy + gap, cx, cy + arm);
          ctx.beginPath();
          ctx.arc(cx, cy, outer, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, inner, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = "rgba(255, 48, 48, 0.98)";
          ctx.lineWidth = 3;
          line(cx - arm, cy, cx - gap, cy);
          line(cx + gap, cy, cx + arm, cy);
          line(cx, cy - arm, cx, cy - gap);
          line(cx, cy + gap, cx, cy + arm);
          ctx.beginPath();
          ctx.arc(cx, cy, outer, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, inner, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255, 48, 48, 1)";
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      window.addEventListener("DOMContentLoaded", () => {
        getCurrentWindow().onCloseRequested((event) => {
          const shouldQuit = window.confirm("Quit Bedmapper? Any unsaved workflow progress may be lost.");
          if (!shouldQuit) event.preventDefault();
        });
        document.querySelectorAll(".step").forEach((el) => el.addEventListener("click", () => showStep(el.dataset.step)));
        document.getElementById("backendSelect").addEventListener("change", async (e) => {
          await invoke("select_camera_backend", { backendName: e.target.value }).catch(console.error);
          refreshCameras();
        });
        document.getElementById("refreshCamBtn").addEventListener("click", refreshCameras);
        document.getElementById("openCamBtn").addEventListener("click", openCamera);
        document.getElementById("refreshAfBtn").addEventListener("click", refreshAutofocus);
        document.getElementById("closeCamBtn").addEventListener("click", closeCamera);
        document.getElementById("paperSize").addEventListener("change", (e) => {
          document.getElementById("customPaperFields").style.display = e.target.value === "custom" ? "" : "none";
          updateBoardName();
        });
        document.getElementById("boardName").addEventListener("input", () => {
          boardNameDirty = true;
        });
        ["paperW", "paperH", "squareSize", "dictSelect", "fullPage"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.addEventListener("input", () => updateBoardName());
          if (el) el.addEventListener("change", () => updateBoardName());
        });
        updateBoardName(true);
        document.getElementById("genBoardBtn").addEventListener("click", generateBoard);
        document.getElementById("printBoardBtn").addEventListener("click", printGeneratedBoard);
        document.getElementById("boardLibrarySelect").addEventListener("change", syncSelectedBoardForPrint);
        document.getElementById("scanOnceBtn").addEventListener("click", scanOnce);
        updateIntrinsicsFrameCount(0);
        document.getElementById("captureIntrBtn").addEventListener("click", captureIntrinsicsFrame);
        document.getElementById("computeIntrBtn").addEventListener("click", computeIntrinsics);
        document.getElementById("clearIntrBtn").addEventListener("click", clearIntrinsicsFrames);
        document.getElementById("intrFramesBody").addEventListener("click", (event) => {
          const button = event.target.closest("button[data-action]");
          if (!button) return;
          const frameIndex = parseInt(button.dataset.frame, 10);
          if (button.dataset.action === "view-frame") viewIntrinsicsFrame(frameIndex);
          if (button.dataset.action === "delete-frame") deleteIntrinsicsFrame(frameIndex);
        });
        document.getElementById("frameModalClose").addEventListener("click", closeFrameModal);
        document.getElementById("frameModalCloseBtn").addEventListener("click", closeFrameModal);
        document.getElementById("printTramTarget").addEventListener("click", printCalibrationSheet);
        listen("camera:frame", (event) => {
          const src = "data:image/jpeg;base64," + event.payload;
          document.getElementById("previewImg").src = src;
          if (currentStep === "tramming") {
            document.getElementById("tramPreview").src = src;
            drawTramOverlay();
          }
          if (currentStep === "intrinsics") document.getElementById("intrPreview").src = src;
          if (currentStep === "bed") document.getElementById("bedPreview").src = src;
          if (currentStep === "test") document.getElementById("testPreview").src = src;
          if (currentStep === "scan") document.getElementById("scanPreview").src = src;
        });
        listen("camera:error", (event) => {
          alert("Camera error: " + event.payload);
          closeCamera();
        });
        loadBackends().then(refreshCameras);
        loadGeneratedBoards();
        loadIntrinsicsFrames();
      });
    }
  });
  require_app();
})();
