// used as the first byte of data packets
/*
var PacketType = Object.freeze({
  "Info": 0x00,
  "InfoResponse": 0x01,
  "Password": 0x02,
  "PasswordResponse": 0x03,
  "Refuse": 0x04,
  "Configuration": 0x05,
  "SyncUserName": 0x06,
  "History": 0x07,
  "SyncEnd": 0x08,
  "TextUsername": 0x09,
  "Text": 0x0A,
  "FileName": 0x0B,
  "FileInProgress": 0x0C,
  "GroupTextUserlist": 0x0D,
  "FileEnd": 0x0E,
  "FileUsername": 0x0F,
})
*/

// ZZY
var PacketType = Object.freeze({
  "Info": 0x00,
  "InfoResponse": 0x01,
  "Password": 0x02,
  "PasswordResponse": 0x03,
  "Refuse": 0x04,
  "Configuration": 0x05,
  "SyncUserName": 0x06,
  "History": 0x07,
  "SyncEnd": 0x08,
  "TextUsername": 0x09,
  "Text": 0x0A,
  "FileName": 0x0B,
  "FileInProgress": 0x0C,
  "GroupTextUserlist": 0x0D,
  "FileEnd": 0x0E,
  "FileUsername": 0x0F,
});

// Server response type
var ResponseType = Object.freeze({
  "UserNotExist": 0,
  "OK": 1,
  "ChangePassword": 2,
  "Wrong": 3,
  "ErrorOccurs": 4,
  "AlreadyLoggedIn": 5,
});

/*
// TODO: adapt to client states
// State machine definition
// Defined almost sequentially. Actions corresponding to a state are in comments.
var SessionState = Object.freeze({
  "Init": 0, // send check
  "WaitForInfoResponse": 1, // Match user in database, password not received yet
  // If user exists, send a response
  "WaitForPasswordResponse": 2, // Send UserCheck response
  "UserExists": 3, // Branch #1, receive password and match password in database
  "PasswordReset": 4, // First login. Receive new password and update database
  "AlreadyLoggedIn": 5, // Kick off the logged in session
  "UserSync": 6, // Merge #1, send preference
  "HistorySync": 7, // Send history
  "ClientWaiting": 8,
  // Branch #2 and Merge #2, branch according to the media_type
  // of the next packet (either received or sent).
  // Send has priority over read.
  "TextUsername": 9, // Target text username
  "Text": 10, // Text data
  "FileUsername": 11, // Target file username
  "FileName": 12,
  "FileInProgress": 13, // Until a FileEnd packet is received
  "GroupUsernameList": 14, // Target group username list
  "GroupText": 15, // Target group text data
  // go back to ServerWaiting state
});
*/

// Modified by ZZY.
// TODO: adapt to client states
// State machine definition
// Defined almost sequentially. Actions corresponding to a state are in comments.
var SessionState = Object.freeze({
  "Init": 0, // send check
  "WaitForInfoResponse": 1, // Match user in database, password not received yet
  // If user exists, send a response
  "WaitForPasswordResponse": 2, // Send UserCheck response
  "UserExists": 3, // Branch #1, receive password and match password in database
  "PasswordReset": 4, // First login. Receive new password and update database
  "AlreadyLoggedIn": 5, // Kick off the logged in session
  "UserSync": 6, // Merge #1, send preference
  "HistorySync": 7, // Send history
  "ClientWaiting": 8,
  // Branch #2 and Merge #2, branch according to the media_type
  // of the next packet (either received or sent).
  // Send has priority over read.
  "TextUsername": 9, // Target text username
  "Text": 10, // Text data
  "FileUsername": 11, // Target file username
  "FileName": 12,
  "FileInProgress": 13, // Until a FileEnd packet is received
  "GroupUsernameList": 14, // Target group username list
  "GroupText": 15, // Target group text data
  // go back to ServerWaiting state
  // ZZY
  "FirstThingsFirst": 20,
  "GreatWall": 99,
});


// data naming:
// @rawData: { packetType, payload }
// packet: Buffer

angular
  .module(DEFAULT.PKG('chat'), [DEFAULT.PKG('socket'), DEFAULT.PKG('settings')])
  .service('$Chat', ['$Socket', '$Settings', '$rootScope', '$q', '$timeout',
    function ($Socket, $Settings, $rootScope, $q, $timeout) {
      /**
       * Instantiates a new Chat Service.
       *
       * @constructor
       */
      var Chat = this;
      var sessionState = SessionState.FirstThingsFirst;
      var globalSelf;
      var globalSocket;
      // var wasConnected = false;
      // var alertPoped = false;
      var hasValidUser = false;

      var ChatService = function (socket, settings) {

        var self = this;
        globalSelf = this;
        ChatService.prototype.onlineUserList = [];

        globalSelf.socket = socket;
        globalSelf.settings = settings;

        // The initial service cache
        // TODO: Get from local storage
        globalSelf.cache = globalSelf.clear(self.settings.user());

        // Wrap the socket requests
        var wrap = function (fn) {
          return function () {
            (fn || angular.noop).apply(self, arguments)
          };
        };

        ChatService.prototype.rowLabels = Array.apply(null, {length: 10}).map(Number.call, Number);
        ChatService.prototype.colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];


        // Register socket callbacks
        // globalSelf.socket.on('user.joined', wrap(self.onUserJoined));
        // globalSelf.socket.on('user.typing', wrap(self.onUserTyping));
        // globalSelf.socket.on('user.left', wrap(self.onUserLeft));
        // globalSelf.socket.on('message.received', wrap(self.onMessageReceived));
        globalSelf.socket.on('connect', globalSelf.initiateLoginSequence);
        // globalSelf.socket.on('disconnect', wrap(self.onDisconnect));
        globalSelf.socket.on('data', globalSelf.socketDataCallback);
        globalSelf.socket.on('close', globalSelf.socketClose);

        // Start the authentication
        // globalSelf.autoconnect();

        // ZZY
        globalSelf.changeState();
      };

      ChatService.prototype.getOnlineUserList = function() {
        return globalSelf.getOnlineUserList;
      };

      /**
       * Check if the user is currently logged in.
       *
       * @returns {boolean}
       */
      var connected = ChatService.prototype.connected;
      ChatService.prototype.connected = function connected() {
        return !!(globalSelf.cache && globalSelf.cache.connected);
      };

      // ChatService.prototype.rowLabels = [1,2,3,4,5,6,7,8,9,10];
      // ChatService.prototype.colLabels = ['a','b','c','d','e','f','g','h','i','j','k'];
      ChatService.prototype.demo = function (row, col, checkBox) {
        console.log('demo', row, col, checkBox);
      };

      ChatService.prototype.checkBox = false;

      ChatService.prototype.decodePacket = function decodePacket(packet) {
        let packetType = packet.readUInt8(0);
        let payloadLength = packet.readUInt16BE(1);
        let payload = packet.slice(3, payloadLength + 3);

        // switch here to read buffer to correct state
        return {
          packetType: packetType,
          payload: payload
        }; // rawData
      };

      ChatService.prototype.socketClose = function socketClose() {
        // if state is kicked off, pop up a dialog and destroy socket
        if (!alertPoped) {
          smalltalk.alert('警告', '服务器端不在线');
          alertPoped = true;
        }
        // globalSocket.destroy();
        // console.log(globalSelf);
        globalSelf.cache.connected = false;
        wasConnected = true;

        function tryReconnect() {
          console.log('socketClose', globalSocket);
          console.log('Trying to reconnect...');
          globalSelf.connect();
          // if (!globalSelf.connected()) {
          //setTimeout(tryReconnect, 1000);
          // }
        }
        // otherwise reconnect
        setTimeout(tryReconnect, 1000);
      };

      var receiveBuffer = Buffer.allocUnsafe(0);
      var decodePacket = ChatService.prototype.decodePacket;
      ChatService.prototype.socketDataCallback = function socketDataCallback(data) {
        // change state machine and process data here
        console.log('data received', data);

        // append data to existing buffer and check for length
        receiveBuffer = Buffer.concat([receiveBuffer, data]);

        if (receiveBuffer.length < 3) {
          receiveBuffer = Buffer.concat([receiveBuffer, data]);
        }

        let payloadLength = receiveBuffer.readUInt16BE(1);
        while (receiveBuffer.length >=3 && receiveBuffer.length >= payloadLength + 3) {
          console.log('receiveBuffer', receiveBuffer);
          let payloadEndPosition = 3 + payloadLength;
          let packet = decodePacket(receiveBuffer.slice(0, payloadEndPosition));
          if (payloadEndPosition == receiveBuffer.length) {
            receiveBuffer = Buffer.allocUnsafe(0);
            payloadLength = 0;
          } else {
            receiveBuffer = receiveBuffer.slice(payloadEndPosition, receiveBuffer.length);
            payloadLength = receiveBuffer.readUInt16BE(1);
          }
          changeState(packet, false);
          console.log('remaining data length', receiveBuffer.length);
          console.log('payloadLength', payloadLength);
        }
      };

      // this segment of code is from the original project
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
          messages: [],
          // 0: Host2User, 1: User2Host
          lastUsername: {
            direction: 0,
            username: ""
          },
          timestamp: null,
          connected: false,
          // ZZY
          // validOnline: false
        };
        cache = this.cache;

        return this.cache;

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

      ChatService.prototype.validOnline = function () {
          console.log('should be after response ok', this.settings.user(), Chat.hasValidUser, this.settings.user() && Chat.hasValidUser)
        return this.settings.user() && Chat.hasValidUser;
        //return this.settings.user() && this.cache.validOnline;
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
      ChatService.prototype.connect = function () {
        // data: {username, password}
        let data = {
          username: globalUsername,
          password: globalPassword
        };

        var self = this;
        globalSocket = globalSelf.socket;

        // Put user information in the settings
        globalSelf.settings.user(data);

        // use remoteAddress to detect connection status
        // console.log(self.socket.remoteAddress, !self.connected(), globalSelf.user());
        // if (self.socket.remoteAddress && !self.connected() && globalSelf.user()) {

        //   console.log('unexpected connect() called, globalSelf.socket.remoteAddress',
        //     globalSelf.socket.remoteAddress);
        //   console.log('self.connected()', globalSelf.connected());
        //   console.log('self.user()', globalSelf.user());
        //   // record user data
        //   globalSelf.initiateLoginSequence(data);

        // globalSelf.socket.emit('user.login', globalSelf.user(), function (response) {

        //   // TODO: Wrap emitter in socket service
        //   $rootScope.$apply(function () {
        //     // Put the chat information in the cache
        //     globalSelf.cache.connected = true;
        //     globalSelf.cache.timestamp = globalSelf.cache.timestamp || Date.now();
        //     globalSelf.cache.room = response.room;
        //     globalSelf.cache.messages = response.messages;

        //     // Put user information in the settings
        //     globalSelf.settings.user(response.user);

        //     // Log the result and ack
        //     console.log(response);
        //     (ack || angular.noop)();
        //   });
        // });
        // } else if () { // startup
        // } else { // startup
        // Connect the socket
        if (!globalSelf.connected()){
          console.log('Connecting');
          globalSelf.socket.connect(DEFAULT.API.PORT, DEFAULT.API.IP);
        }
        // }
      };

      /**
       * Guide the user through the connection.
       */
      var globalUsername;
      var globalPassword;
      ChatService.prototype.autoconnect = function () {

        var self = this;

        //if (!globalSelf.connected() && !self.user()) {
        if (!self.validOnline()) {

          //smalltalk.prompt('登陆', '用户名：', process.env.USER || process.env.username || 'Larry Shen').then(function (value) {
          smalltalk.prompt('登陆', '用户名：', 'Novate').then(function (value) {
            globalUsername = value;
            globalSelf.cache.user = {
              name: value
            };
            // prompt for password
            smalltalk.prompt('登陆', '密码：', '', {
              type: 'password'
            }).then(function (value) {

              globalPassword = value;
              //globalSelf.connect();
              //ZZY
              if (!globalSelf.connected()) {
                globalSelf.connect();
              } else {
                globalSelf.initiateLoginSequence();
              }


            }, function () {
              try {
                // Quit the whole app, without a password there's nothing to do
                require('electron').remote.app.quit();
              } catch (e) {
                // If could not quit the app, at least close the window
                console.error(e);
                window.close();
              }
            });
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

        } else if (!globalSelf.connected()) {
          // Connect with local storage information
          globalSelf.connect();
        };
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
      ChatService.prototype.send = function (input) {
        input = input.body;

        if (globalSelf.connected()) {

          // Prepare message and add to chat
          globalSelf.cache.messages = globalSelf.cache.messages || [];

          // send username
          let text = input.split('@', 2); // text@user
          let usernamePacket = {
            packetType: PacketType.TextUsername,
            payload: text[1]
          };
          // Send the message through the socket
          sendPacket(usernamePacket);

          // send text
          let textPacket = {
            packetType: PacketType.Text,
            payload: text[0]
          };
          sendPacket(textPacket);

          globalSelf.cache.messages.push({
            username: globalUsername,
            body: text[0]
          });
          console.log(globalSelf.cache.messages);

          // $rootScope.$apply(function () {
          //   globalSelf.cache.messages.push({
          //     username: globalUsername,
          //     user: globalUsername,
          //     body: text[1]
          //   });
          // });

          setTimeout(function () {
            jQuery(".messages").getNiceScroll(0).resize();
            return jQuery(".messages").getNiceScroll(0).doScrollTop(999999, 999);
          }, 100);
        } else {
          // warn the user it's not connected
          smalltalk.alert('警告', '连接未建立');
        }
      };


      /**
       * Handles the disconnect callback in the Socket.
       */
      ChatService.prototype.onDisconnect = function (data, ack) {

        var self = this;

        // TODO: notify observers
        globalSelf.clear();
        globalSelf.autoconnect();


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
          globalSelf.cache.room = data.room;
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

          globalSelf.isTyping(data.user, data.typing);
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
          globalSelf.cache.room = data.room;
          (ack || angular.noop)();
        });

      };

      /**
       * Handles the message received callback in the Socket.
       */
      ChatService.prototype.onMessageReceived = function (data, ack) {
        // key function.
        // call this after formatting received data

        var self = this;
        console.log('onMessageReceived', data);

        $rootScope.$apply(function () {

          // globalSelf.isTyping(data.user, false);
          globalSelf.cache.messages.push(data);
          (ack || angular.noop)();

          setTimeout(function () {
            jQuery(".messages").getNiceScroll(0).resize();
            return jQuery(".messages").getNiceScroll(0).doScrollTop(999999, 999);
          }, 100);
        });
      };

      var cache;
      ChatService.prototype.initiateLoginSequence = function () {
        if (globalSelf.cache.connected) {
          // 被踢/断网
          //switch sessionState
        } else {
          // 第一次连接
          globalSelf.cache.connected = true;
        }
        // if (globalSelf.connected() && wasConnected) {
        //   smalltalk.alert('Connection restored');
        //   wasConnected = false;
        // }
        data = {
          username: globalUsername,
          password: globalPassword
        };
        console.log('initiateLoginSequence', data);
        this.auth = data;
        var self = this;
        // send initial packet and reset sessionState
        let packet = constructPacket({
          packetType: PacketType.Info,
          payload: data.username
        });
        changeState(packet, true);

        // display UI
        $rootScope.$apply(function () {
          // Put the chat information in the cache
          globalSelf.cache.connected = true;
          // globalSelf.cache.timestamp = globalSelf.cache.timestamp || Date.now();
          // globalSelf.cache.room = response.room;
          // globalSelf.cache.messages = response.messages;

          // // Put user information in the settings
          // globalSelf.settings.user(response.user);

          // Log the result and ack
          // console.log(response);
          // (ack || angular.noop)();

        });
      };

      ChatService.prototype.constructPacket = function constructPacket(rawData) {
        // pack data into a packet
        // @rawData: { packetType, payload }
        let packetTypeBuffer = Buffer.from([rawData.packetType]);

        var payloadBuffer;
        if (rawData.payload.length > 0) {
          payloadBuffer = Buffer.from(rawData.payload);
        } else {
          payloadBuffer = Buffer.allocUnsafe(0);
        }

        let payloadLengthBuffer = Buffer.allocUnsafe(2);
        payloadLengthBuffer.writeUInt16BE(payloadBuffer.length, 0);

        let packet = Buffer.concat([packetTypeBuffer, payloadLengthBuffer, payloadBuffer]);
        return packet;
      }
      var constructPacket = ChatService.prototype.constructPacket;

      // Init: send check packet, original one.
      /*
      ChatService.prototype.changeState = function (rawData, isSend) {
        // @rawData: { packetType: int, payload: Buffer }
        // @isSend: true for sending packet
        console.log('changeState rawData', rawData);
        console.log('changeState, sessionState =', sessionState);

        if (rawData.packetType == PacketType.Refuse) {
          if (rawData.payload.readUInt8(0) == ResponseType.ErrorOccurs) {
            smalltalk.alert('警告', '因其他客户端登陆，您已下线');
            return;
          } else {
            console.log('changeState rawData', rawData);
            smalltalk.alert('警告', '您已将用您的账号登陆的其他客户端下线');
            return;
          }
        }

        switch (sessionState) {
          case SessionState.Init:
            console.log('info', rawData);
            sendPacket(rawData);
            sessionState = SessionState.WaitForInfoResponse;
            break;
          case SessionState.WaitForInfoResponse:
            if (rawData.packetType != PacketType.InfoResponse) {
              console.log('rawData.packetType', rawData.packetType);
              // error
            } else {
              // decode payload here
              console.log('InfoResponse: data.payload', rawData.payload);
              console.log('rawData', rawData);
              let infoData = rawData.payload.readUInt8(0);
              switch (infoData) {
                case ResponseType.UserNotExist:
                  // error
                  smalltalk.alert('警告', '用户名不存在');
                  console.log('Wrong username');
                  // globalSelf.killConnection();
                  break;
                case ResponseType.OK:
                  // send password packet
                  // data: password
                  let passwordPacket = {
                    packetType: PacketType.Password,
                    payload: globalPassword
                  };
                  sendPacket(passwordPacket);

                  // step state
                  sessionState = SessionState.WaitForPasswordResponse;
                  break;
                case ResponseType.AlreadyLoggedIn:
                  smalltalk.alert('警告', '您的账号已在其他客户端登陆');
                  break;
                default:
                  console.log('unknown ResponseType');
                  break;
              }
            }
            break;

          case SessionState.WaitForPasswordResponse:
            // receive password
            if (rawData.packetType != PacketType.PasswordResponse) {
              // error
              // this.killConnection()
            } else {
              // decode payload
              let infoData = rawData.payload.readUInt8();
              switch (infoData) {
                case ResponseType.ErrorOccurs:
                  // error
                  console.log('Wrong password packet type');
                  // globalSelf.killConnection();
                  break;
                case ResponseType.ChangePassword:
                  // popup reset password prompt
                  // send password packet
                  // continue waiting for password response
                  // so no need to change state

                  console.log('ResponseType.ChangePassword');
                  smalltalk.prompt('您需要更改您的初始密码', '输入您的新密码').then(function (value) {
                    sendPacket({
                      packetType: PacketType.Password,
                      payload: value
                    });
                    console.log('password reset!');
                  });
                  sessionState = SessionState.UserSync;
                  break;
                case ResponseType.Wrong:
                  // display message on label
                  // and prompt for reset password
                  // kill tcp connection and reset state
                  console.log('Wrong password');

                  break;
                case ResponseType.OK:
                  console.log('ResponseType.OK');
                  sessionState = SessionState.UserSync;
                  break;
                default:
                  console.log('unknown ResponseType');
                  break;
              }
            }
            break;

          case SessionState.UserSync:
            if (rawData.packetType != PacketType.Configuration) {
              // // globalSelf.killConnection();
              console.log('wrong packet', rawData);
            } else {
              // change configuration storage
              // globalSelf.user().prefeferences = globalSelf.decodeConfigurationPacket(rawData);
              console.log('configuration: ', globalSelf.decodeConfigurationPacket(rawData));
              sessionState = SessionState.HistorySync;
            }
            break;

          case SessionState.HistorySync:
            switch (rawData.packetType) {
              case PacketType.SyncUserName:
                // read the byte at index 3
                // 0: Host2User, 1: User2Host
                // store username
                let data = globalSelf.decodeSyncUserNamePacket(rawData);
                if (data.direction == 0) {
                  globalSelf.cache.lastUsername = globalUsername;
                } else {
                  globalSelf.cache.lastUsername = data.username;
                }
                // sessionState = SessionState.History;
                break;

              case PacketType.History:
                let historyText = globalSelf.decodeTextPacket(rawData);
                // update view to show chat history

                $rootScope.$apply(function () {
                  globalSelf.cache.messages.push({
                    username: globalSelf.cache.lastUsername,
                    body: historyText,
                  });
                });

                setTimeout(function () {
                  jQuery(".messages").getNiceScroll(0).resize();
                  return jQuery(".messages").getNiceScroll(0).doScrollTop(999999, 999);
                }, 100);
                break;

              case PacketType.SyncEnd:
                sessionState = SessionState.ClientWaiting;
                break;

              default:
                break;
            }
            break;

          case SessionState.ClientWaiting:
            if (isSend) {
              switch (rawData.packetType) {
                case PacketType.TextUsername:
                  globalSelf.sendPacket(rawData);
                  break;
                case PacketType.Text:
                  // send, assume success
                  // rawData should be packaged at higher levels
                  globalSelf.sendPacket(rawData);
                  sessionState = SessionState.ClientWaiting;
                default:
                  break;
              }
            } else { // receive
              switch (rawData.packetType) {
                case PacketType.TextUsername:
                  // store source username
                  globalSelf.cache.lastUsername = rawData.payload;
                  break;
                case PacketType.Text:
                  // display chat
                  let text = globalSelf.decodeTextPacket(rawData);
                  // update view to show chat history
                  $rootScope.$apply(function () {
                    globalSelf.cache.messages.push({
                      username: globalSelf.cache.lastUsername,
                      body: text,
                    });
                  });

                  setTimeout(function () {
                    jQuery(".messages").getNiceScroll(0).resize();
                    return jQuery(".messages").getNiceScroll(0).doScrollTop(999999, 999);
                  }, 100);

                  break;

                default:
                  break;
              }
            }
        }
      };
      var changeState = ChatService.prototype.changeState;
      */

      // Modified by ZZY
      ChatService.prototype.changeState = function (rawData, isSend) {
        // @rawData: { packetType: int, payload: Buffer }
        // @isSend: true for sending packet
        console.log('changeState, sessionState =', sessionState);
        if (rawData) {
          console.log('changeState rawData', rawData);
          // console.log('changeState, sessionState =', sessionState);

          if (rawData.packetType == PacketType.Refuse) {
            if (rawData.payload.readUInt8(0) == ResponseType.ErrorOccurs) {
              smalltalk.alert('警告', '因其他客户端登陆，您已下线');
              return;
            } else {
              console.log('changeState rawData', rawData);
              smalltalk.alert('警告', '您已将用您的账号登陆的其他客户端下线');
              return;
            }
          }
        } else {
          console.log('Empty rawData');
        }

        switch (sessionState) {
          case SessionState.GreatWall:
            console.log('Howdy! This is temporarily the end!');
            console.log('hasValidUser: ', Chat.hasValidUser);
            console.log('validOnline: ', globalSelf.validOnline());
            console.log('user: ', globalSelf.user());
            smalltalk.alert('警告', '目前暂时在这里告一段落，再见！');
            break;
          case SessionState.FirstThingsFirst:
            Chat.hasValidUser = false;
            console.log('app start');
            sessionState = SessionState.Init;
            globalSelf.autoconnect();
            break;
          case SessionState.Init:
            console.log('info', rawData);
            sendPacket(rawData);
            sessionState = SessionState.WaitForInfoResponse;
            break;
          case SessionState.WaitForInfoResponse:
            console.log('WaitForInfoResponse');
            if (rawData.packetType != PacketType.InfoResponse) {
              // error
              console.log('rawData.packetType: ', rawData.packetType);
              smalltalk.alert('警告', '服务器端TCP包错误，rawData.packetType: ', rawData.packetType).then(
                  // globalSelf.killConnection()
              );
            } else {
              // decode payload here
              console.log('InfoResponse: data.payload', rawData.payload);
              console.log('rawData', rawData);
              let infoData = rawData.payload.readUInt8(0);
              switch (infoData) {
                case ResponseType.UserNotExist:
                  // user not exist
                  console.log('Wrong username: UserNotExist');
                  smalltalk.alert('警告', '用户名不存在，请重新登录').then(
                      function() {
                        Chat.hasValidUser = false;
                        sessionState = SessionState.FirstThingsFirst;
                        changeState();
                      }
                  );

                  break;
                case ResponseType.ErrorOccurs:
                  // error occurs
                  console.log('Wrong username: ErrorOccurs');
                  smalltalk.alert('警告', '出现其他用户名错误').then(
                      function() {
                        // globalSelf.killConnection();
                      }
                  );
                  break;
                case ResponseType.OK:
                  // send password packet
                  // data: password
                  console.log('Username OK');
                  let passwordPacket = {
                    packetType: PacketType.Password,
                    payload: globalPassword
                  };
                  sendPacket(passwordPacket);

                  // step state
                  sessionState = SessionState.WaitForPasswordResponse;
                  break;
                default:
                  console.log('unknown ResponseType');
                  smalltalk.alert('警告', '服务器端info_response包错误，rawData.ResponseType: ', infoData).then(
                      function() {
                        // globalSelf.killConnection();
                      }
                  );
                  break;
              }
            }
            break;
          case SessionState.WaitForPasswordResponse:
            // receive password
            if (rawData.packetType != PacketType.PasswordResponse) {
              // error
              console.log('rawData.packetType: ', rawData.packetType);
              smalltalk.alert('警告', '服务器端TCP包错误，rawData.packetType: ', rawData.packetType).then(
                  // globalSelf.killConnection()
              );
            } else {
              // decode payload
              let infoData = rawData.payload.readUInt8();
              switch (infoData) {
                case ResponseType.ErrorOccurs:
                  // error
                  console.log('Wrong password packet type');
                  // globalSelf.killConnection();
                  break;
                case ResponseType.Wrong:
                  // display message on label
                  // and prompt for reset password
                  // kill tcp connection and reset state
                  console.log('Wrong password');
                  smalltalk.alert('警告', '密码错误，请重新登录').then(
                      function() {
                        Chat.hasValidUser = false;
                        sessionState = SessionState.FirstThingsFirst;
                        changeState();
                      }
                  );
                  break;
                case ResponseType.OK:
                  console.log('ResponseType.OK');
                  Chat.hasValidUser = true;

                  // TODO: This is problematic!
                  // this.cache.validOnline = true;
                  sessionState = SessionState.UserSync;
                  break;
                default:
                  console.log('unknown ResponseType');
                  smalltalk.alert('警告', '服务器端passwd_response包错误，rawData.ResponseType: ', infoData).then(
                      function() {
                        // globalSelf.killConnection();
                      }
                  );
                  break;
              }
            }
            break;

          case SessionState.UserSync:
            if (rawData.packetType != PacketType.SyncUserName && rawData.packetType != PacketType.SyncEnd) {
              // error
              console.log('rawData.packetType: ', rawData.packetType);
              smalltalk.alert('警告', '服务器端TCP包错误，rawData.packetType').then(
                  // globalSelf.killConnection()
              );
            } else {
              switch (rawData.packetType) {
                case PacketType.SyncUserName:
                  if (globalSelf.onlineUserList.indexOf(globalSelf.decodeSyncUserNamePacket(rawData)) < 0) {
                    globalSelf.onlineUserList.push(globalSelf.decodeSyncUserNamePacket(rawData));
                    console.log('online user:', globalSelf.onlineUserList[globalSelf.onlineUserList.length-1]);
                  }
                  break;
                case PacketType.SyncEnd:
                  console.log('sync online user end');
                  sessionState = SessionState.GreatWall;
                  changeState();
                  break;

                default:
                  console.log('sync pack unknown');
                  smalltalk.alert('警告', '未知packet类型').then(
                      function () {
                        // globalSelf.killConnection();
                      }
                  );
                  break;
              }
            }
            break;
/*
          case SessionState.HistorySync:
            switch (rawData.packetType) {
              case PacketType.SyncUserName:
                // read the byte at index 3
                // 0: Host2User, 1: User2Host
                // store username
                let data = globalSelf.decodeSyncUserNamePacket(rawData);
                if (data.direction == 0) {
                  globalSelf.cache.lastUsername = globalUsername;
                } else {
                  globalSelf.cache.lastUsername = data.username;
                }
                // sessionState = SessionState.History;
                break;

              case PacketType.History:
                let historyText = globalSelf.decodeTextPacket(rawData);
                // update view to show chat history

                $rootScope.$apply(function () {
                  globalSelf.cache.messages.push({
                    username: globalSelf.cache.lastUsername,
                    body: historyText,
                  });
                });

                setTimeout(function () {
                  jQuery(".messages").getNiceScroll(0).resize();
                  return jQuery(".messages").getNiceScroll(0).doScrollTop(999999, 999);
                }, 100);
                break;
              case PacketType.SyncEnd:
                sessionState = SessionState.ClientWaiting;
                break;

              default:
                break;
            }
            break;
*/
          case SessionState.ClientWaiting:
            if (isSend) {
              switch (rawData.packetType) {
                case PacketType.TextUsername:
                  globalSelf.sendPacket(rawData);
                  break;
                case PacketType.Text:
                  // send, assume success
                  // rawData should be packaged at higher levels
                  globalSelf.sendPacket(rawData);
                  sessionState = SessionState.ClientWaiting;
                default:
                  break;
              }
            } else { // receive
              switch (rawData.packetType) {
                case PacketType.TextUsername:
                  // store source username
                  globalSelf.cache.lastUsername = rawData.payload;
                  break;
                case PacketType.Text:
                  // display chat
                  let text = globalSelf.decodeTextPacket(rawData);
                  // update view to show chat history
                  $rootScope.$apply(function () {
                    globalSelf.cache.messages.push({
                      username: globalSelf.cache.lastUsername,
                      body: text,
                    });
                  });

                  setTimeout(function () {
                    jQuery(".messages").getNiceScroll(0).resize();
                    return jQuery(".messages").getNiceScroll(0).doScrollTop(999999, 999);
                  }, 100);

                  break;
                default:
                  break;
              }
            }
        }
      };






      var changeState = ChatService.prototype.changeState;

      ChatService.prototype.sendPacket = function sendPacket(packet) {
        // this method also handles packet being rawData
        if (!(packet instanceof Buffer)) {
          // packet is actually rawData
          packet = constructPacket(packet);
        }
        console.log('sendPacket', packet);
        socket.write(packet);
      };
      var socket = $Socket.socket;
      var sendPacket = ChatService.prototype.sendPacket;

      // ZZY
      ChatService.prototype.killConnection = function killConnection() {
        try {
          // Quit the whole app, without a name there's nothing to do
          require('electron').remote.app.quit();
        } catch (e) {
          // If could not quit the app, at least close the window
          console.error(e);
          window.close();
        }
        // globalSelf.socketClose();
      };

/*
      ChatService.prototype.decodeConfigurationPacket = function (rawData) {
        let conf = {
          historyLength: rawData.payload.readUInt16BE(0),
          color1: {
            r: rawData.payload.readUInt8(2),
            g: rawData.payload.readUInt8(3),
            b: rawData.payload.readUInt8(4),
          },
          color2: {
            r: rawData.payload.readUInt8(5),
            g: rawData.payload.readUInt8(6),
            b: rawData.payload.readUInt8(7),
          },
        };
        return conf;
      };
*/
/*
      ChatService.prototype.decodeSyncUserNamePacket = function (rawData) {
        console.log('decodeSyncUserNamePacket', rawData);
        let ret = {
          direction: rawData.payload.readUInt8(0),
          username: rawData.payload.slice(1, rawData.payload.length).toString(),
        };
        return ret;
      };
*/
      ChatService.prototype.decodeSyncUserNamePacket = function (rawData) {
        console.log('decodeUsernamePacket', rawData);
        let username = rawData.payload.toString();
        return username;
      };

      ChatService.prototype.decodeTextPacket = function (rawData) {
        let text = rawData.payload.toString();

        return text;
      };

      ChatService.prototype.todo = function (packet) {

      }
      // Instantiates a new chat service
      return new ChatService($Socket.socket, $Settings);
    }
  ]);