/**
 * Created by luis on 4/1/16.
 */
angular
  .module(DEFAULT.PKG('chat'), [DEFAULT.PKG('socket'), DEFAULT.PKG('settings')])
  .service('$Chat', ['$Socket', '$Settings', '$rootScope', '$q', '$timeout',
    function ($Socket, $Settings, $rootScope, $q, $timeout) {

      /**
       * Instantiates a new Chat Service.
       *
       * @constructor
       */
      var ChatService = function (socket, settings) {

        var self = this;

        self.socket = socket;
        self.settings = settings;

        // The initial service cache
        // TODO: Get from local storage
        self.cache = self.clear(self.settings.user());

        // Wrap the socket requests
        var wrap = function (fn) {
          return function () {
            (fn || angular.noop).apply(self, arguments)
          };
        };

        // Register socket callbacks
        self.socket.on('user.joined', wrap(self.onUserJoined));
        self.socket.on('user.typing', wrap(self.onUserTyping));
        self.socket.on('user.left', wrap(self.onUserLeft));
        self.socket.on('message.received', wrap(self.onMessageReceived));
        self.socket.on('connect', wrap(self.connect));
        self.socket.on('disconnect', wrap(self.onDisconnect));

        // Start the authentication
        self.autoconnect();

      };

      /**
       * Clears the chat service cache.
       *
       * @param {Object} [user] The user to initialize the cache with
       *
       * @returns {Object}
       */
      ChatService.prototype.clear = function clear(user) {

        // Clears the cache
        this.cache = {
          room: [],
          user: user,
          typing: [],
          messages: [],
          timestamp: null,
          connected: false
        };

        return this.cache;

      };

      /**
       * Check if the user is currently logged in.
       *
       * @returns {boolean}
       */
      ChatService.prototype.connected = function () {
        return !!(this.cache && this.cache.connected);
      };

      /**
       * Gets the timestamp from the last connection.
       *
       * @returns {null|Number}
       */
      ChatService.prototype.timestamp = function () {
        return this.cache.timestamp;
      };

      /**
       * Gets current user information.
       *
       * @returns {{}|null}
       */
      ChatService.prototype.user = function () {
        return this.settings.user();
      };

      /**
       * Gets the current user list in the room.
       *
       * @returns {Array}
       */
      ChatService.prototype.room = function () {
        return this.cache.room || [];
      };

      /**
       * Gets the current message list in the room.
       *
       * @returns {Array}
       */
      ChatService.prototype.messages = function () {
        return this.cache.messages || [];
      };

      /**
       * Gets or sets if message is typing.
       *
       * @param user
       * @param state
       *
       * @returns {boolean}
       */
      ChatService.prototype.isTyping = function (user, state) {

        if (state !== undefined) {
          this.cache.typing[user.id || user] = !!state;
        }

        return !!(this.cache.typing[user.id || user]);

      };

      /**
       * Connect to the chat room.
       */
      ChatService.prototype.connect = function (data, ack) {

        var self = this;

        // Put user information in the settings
        self.settings.user(data);

        // TODO: notify observers
        if (self.socket.connected && !self.connected() && self.user()) {

          self.socket.emit('user.login', self.user(), function (response) {

            // TODO: Wrap emitter in socket service
            $rootScope.$apply(function () {

              // Put the chat information in the cache
              self.cache.connected = true;
              self.cache.timestamp = self.cache.timestamp || Date.now();
              self.cache.room = response.room;
              self.cache.messages = response.messages;

              // Put user information in the settings
              self.settings.user(response.user);

              // Log the result and ack
              console.log(response);
              (ack || angular.noop)();

            });

          });

        } else if (!self.socket.connected) {

          // Connect the socket
          self.socket.connect();

        }

      };

      /**
       * Guide the user through the connection.
       */
      ChatService.prototype.autoconnect = function () {

        var self = this;

        // Connect the chat using the OS user name
        if (!self.connected() && !self.user()) {

          // TODO: Put smalltalk in service
          smalltalk.prompt('Get started', 'What\'s your name?', process.env.USER || process.env.username || 'John Doe').then(function (value) {

            self.connect({name: value});

          }, function () {

            try {

              // Quit the whole app, without a name there's nothing to do
              require('electron').remote.app.quit();

            } catch (e) {

              // If could not quit the app, at least close the window
              console.error(e);
              window.close();

            }

          });

        } else if (!self.connected()) {

          // Connect with local storage information
          self.connect(self.user());

        }

      };

      /**
       * Disconnect from the current session.
       *
       * @param data
       * @param ack
       */
      ChatService.prototype.disconnect = function (data, ack) {

        var self = this;

        try {

          self.settings.clear();
          self.socket.close();

        } catch (e) {
          console.warn(e);
        }

      };

      /**
       * Sends a new message to the chat room.
       *
       * @param {Object} data The message data
       * @param {String} data.body The message body
       * @param {Function} [ack] The operation ack
       *
       * @returns {Promise}
       */
      ChatService.prototype.send = function (data, ack) {

        var self = this;
        var request = angular.copy(data);

        ack = ack || angular.noop;

        var q = $q.defer();

        if (self.connected()) {

          // Prepare message and add to chat
          self.cache.messages = self.cache.messages || [];

          // Set myself typing
          self.isTyping(self.user(), false);

          // Send the message through the socket
          self.socket.emit('message.send', request, function (response) {

            // TODO: Wrap emitter in socket service
            $rootScope.$apply(function () {

              self.cache.messages.push(response);

              q.resolve(response);
              ack(response);

              setTimeout(function () {
                jQuery(".messages").getNiceScroll(0).resize();
                return jQuery(".messages").getNiceScroll(0).doScrollTop(999999, 999);
              }, 100);

            });

          });

        } else {

          $timeout(function () {

            q.reject(new Error('Chat is not connected'));

          }, 10);

        }

        return q.promise;

      };

      /**
       * Set user is typing or not.
       *
       * @param {Object} data The request data
       * @param {Boolean} data.typing The state
       * @param {Function} [ack]
       * @returns {Promise}
       */
      ChatService.prototype.typing = function (data, ack) {

        var self = this;
        data = data || {};
        var request = angular.copy(data);

        ack = ack || angular.noop;

        var q = $q.defer();

        if (self.connected()) {

          // Set myself typing
          self.isTyping(self.user(), data.typing);

          // Send the message through the socket
          self.socket.emit('user.typing', request, function (response) {

            // TODO: Wrap emitter in socket service
            $rootScope.$apply(function () {

              //self.cache.messages.push(response);

              q.resolve(response);
              ack(response);

            });

          });

        } else {

          $timeout(function () {

            q.reject(new Error('Chat is not connected'));

          }, 10);

        }

        return q.promise;

      };

      /**
       * Handles the disconnect callback in the Socket.
       */
      ChatService.prototype.onDisconnect = function (data, ack) {

        var self = this;

        // TODO: notify observers
        self.clear();
        self.autoconnect();


        console.log('onDisconnect', data);
        (ack || angular.noop)();

      };

      /**
       * Handles the user joined callback in the Socket.
       */
      ChatService.prototype.onUserJoined = function (data, ack) {

        var self = this;
        console.log('onUserJoined', data);

        $rootScope.$apply(function () {
          self.cache.room = data.room;
          (ack || angular.noop)();
        });

      };

      /**
       * Handles the user typing callback in the Socket.
       */
      ChatService.prototype.onUserTyping = function (data, ack) {

        var self = this;
        console.log('onUserTyping', data);

        $rootScope.$apply(function () {

          self.isTyping(data.user, data.typing);
          (ack || angular.noop)();

        });

      };

      /**
       * Handles the user left callback in the Socket.
       */
      ChatService.prototype.onUserLeft = function (data, ack) {

        var self = this;
        console.log('onUserLeft', data);

        $rootScope.$apply(function () {
          self.cache.room = data.room;
          (ack || angular.noop)();
        });

      };

      /**
       * Handles the message received callback in the Socket.
       */
      ChatService.prototype.onMessageReceived = function (data, ack) {

        var self = this;
        console.log('onMessageReceived', data);

        $rootScope.$apply(function () {

          self.isTyping(data.user, false);
          self.cache.messages.push(data);
          (ack || angular.noop)();

          setTimeout(function () {

            // Scroll to bottom safely
            //var msgs = jQuery('.messages');
            //var last = jQuery('ul.messages li').last();
            //msgs.scrollTop(last.position().top + last.height());

            jQuery(".messages").getNiceScroll(0).resize();
            return jQuery(".messages").getNiceScroll(0).doScrollTop(999999, 999);

          }, 100);

        });

      };

      // Instantiates a new chat service
      return new ChatService($Socket.io, $Settings);

    }]);