const Game = require('./app/services/game');

var PacketType = Object.freeze({
  "Info": 0x00,
  "UsernameResponse": 0x01,
  "Password": 0x02,
  "PasswordResponse": 0x03,
  "Refuse": 0x04,
  "SyncUserName": 0x06,
  "OnlineUser": 0x07,
  "SyncEnd": 0x08,
  "SendInvit": 0x09,
  "OfflineUser": 0x10,
  "RecvInvit": 0x0A,
  "InvitResponse": 0x0B,
  "Board": 0x0C,
  "SingleCoord": 0x0D,
  "DoubleCoord": 0x0E,
  "GameOver": 0x0F,
});

// Server response type
var ResponseType = Object.freeze({
  "UserNotExist": 0,
  "OK": 1,
  "RefuseInvit": 2,
  "Wrong": 3,
  "ErrorOccurs": 4,
  "AlreadyLoggedIn": 5,
  "Busy": 6,
});

var SessionState = Object.freeze({
  "Init": 0,
  "GatherUserInfo": 1, // send check
  "WaitForUsernameResponse": 2, // Match user in database, password not received yet
  // If user exists, send a response
  "WaitForPasswordResponse": 3, // Send UserCheck response
  "UserSync": 4, // Merge #1, send preference
  "ClientWaiting": 8,
  "ClientInvited": 9,
  "ClientInviting": 10,
  "InGame": 11,
});

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
        var globalSelf;
        var globalSocket;
        var wasConnected = false;
        var alertPoped = false;
        var hasValidUser = false;
        var clickedInviteButton = false;
        var personInvited;
        var notResponsingInvitation = true;

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

          ChatService.prototype.sessionState = SessionState.Init;
          ChatService.prototype.refresh = function() {
            console.log("refresh");
            this.sessionState = SessionState.ClientWaiting;
            this.opponentName = "Don\'t have one";
            console.log(this.sessionState, " ", this.opponentName);
            $rootScope.$apply();
          };

          ChatService.prototype.rowLabels = Array.apply(null, { length: 10 }).map(Number.call, Number);
          ChatService.prototype.colLabels = Array.apply(null, { length: 10 }).map(Number.call, Number);
          ChatService.prototype.gameMap = [
            [0,1,2,3,4,5,6,7,8,9],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,2,0,0,0,0,0],
            [0,0,1,1,1,1,1,0,0,0],
            [0,0,0,0,1,0,0,0,0,0],
            [0,0,0,1,3,1,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0]
          ];

          ChatService.prototype.switchDoubleCord = function () {

          };

          ChatService.prototype.opponentName = "Don\'t have one";
          ChatService.prototype.isOurMove = true;
          ChatService.prototype.isDoubleCord = false;

          ChatService.prototype.doubleCordBtnStyle = function (isDoubleCord) {
            let colorHex = isDoubleCord ? '#e17055' : '#0069d9';
            return {
              "background-color": colorHex,
              "border-color":  colorHex
            };
          }
          ChatService.prototype.doubleCordBtnClick = function () {
            this.isDoubleCord = !this.isDoubleCord;
          }
          ChatService.prototype.doubleCordBtnModel = function (isDoubleCord) {
            let messege = (isDoubleCord && globalSelf.planeDrawn) ? 'Use double coordinate' : 'Use single coordinate';
            return messege;
          }
          ChatService.prototype.onlineBadgeModel = function (isDoubleCord) {

          }


          ChatService.prototype.mapToColor = function (planeCode) {
            // return 1;
            // let planeNumber = Math.floor(planeCode / 10);
            let location = planeCode % 10;
            let colorHex = '#b2bec3';
            switch (location) {
                // miss hit
              case 0:
                colorHex = '#000000';
                return {
                  "background-color": colorHex,
                  "border-color":  colorHex
                };
                // body
              case 1:
                colorHex = '#fdcb6e';
                return {
                  "background-color": colorHex,
                  "border-color":  colorHex
                };
              case 4:
                colorHex = '#FF7E00';
                return {
                  "background-color": colorHex,
                  "border-color":  colorHex
                };
                // head
              case 2:
                colorHex = '#e17055';
                return {
                  "background-color": colorHex,
                  "border-color":  colorHex
                };
              case 5:
                colorHex = '#841B2D';
                return {
                  "background-color": colorHex,
                  "border-color":  colorHex
                };
                // tail
              case 3:
                colorHex = '#72A0C1';
                return {
                  "background-color": colorHex,
                  "border-color":  colorHex
                };
              case 6:
                colorHex = '#2E5894';
                return {
                  "background-color": colorHex,
                  "border-color":  colorHex
                };
                //  double cord
              case 7:
                colorHex = '#d63031';
                return {
                  "background-color": colorHex,
                  "border-color":  colorHex
                };
              case 8:
                colorHex = '#d63031';
                return {
                  "background-color": colorHex,
                  "border-color":  colorHex
                };
                //  default

              case 9:
              default:
                return {
                  "background-color": colorHex,
                  "border-color":  colorHex
                };
                // break;
            }
          }


          // Register socket callbacks
          // globalSelf.socket.on('user.joined', wrap(self.onUserJoined));
          // globalSelf.socket.on('user.typing', wrap(self.onUserTyping));
          // globalSelf.socket.on('user.left', wrap(self.onUserLeft));
          // globalSelf.socket.on('message.received', wrap(self.onMessageReceived));
          globalSelf.socket.on('connect', globalSelf.initiateLoginSequence);
          // globalSelf.socket.on('disconnect', wrap(self.onDisconnect));
          globalSelf.socket.on('data', globalSelf.socketDataCallback);
          globalSelf.socket.on('close', globalSelf.socketClose);

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

        ChatService.prototype.demo = function (row, col, checkBox) {
          console.log('demo', row, col, checkBox);
        };

        // On click send request.
        ChatService.prototype.sendRequest = function (user) {
          // should only be clicked when client waiting.
          if (ChatService.prototype.sessionState == SessionState.ClientInviting) {
            smalltalk.alert("Warning", "You have already invited others, now waiting for response and unable to send another request.");
          } else if (ChatService.prototype.sessionState == SessionState.ClientInvited) {
            smalltalk.alert("Warning", "You have already been invited, you should response the invitation before you send another request.");
          } else if (ChatService.prototype.sessionState == SessionState.InGame || ChatService.prototype.sessionState == SessionState.GreatWall) {
            smalltalk.alert("Warning", "You are in the game, and unable to send request.");
          } else {
            console.log("send request to: ", user);
            globalSelf.opponentName = user;
            let rawData = {
              packetType: PacketType.SendInvit,
              payload: user
            };
            smalltalk.alert('Notice', 'Invitation sent to ' + user + ', please wait for response.');
            changeState(rawData, true);
          }
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

          smalltalk.alert('Warning', 'Server offline, please contact the administrator of the server. Press OK to reconnect.').then(
              () => {
                globalSelf.cache.connected = false;
                $rootScope.$apply();
                wasConnected = true;

                function tryReconnect() {
                  console.log('socketClose', globalSocket);
                  console.log('Trying to reconnect...');
                  ChatService.prototype.sessionState = SessionState.GatherUserInfo;
                  globalSelf.connect();
                }
                // otherwise reconnect
                setTimeout(tryReconnect, 500);
              }
          );
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
          console.log(ChatService.prototype.sessionState)
          return this.settings.user() && Chat.hasValidUser;
        };

        ChatService.prototype.planeDrawn = false;

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

            smalltalk.prompt('Log in', 'Username:', 'Novate').then(function (value) {
              globalUsername = value;
              globalSelf.cache.user = {
                name: value
              };
              $rootScope.$apply();
              // prompt for password
              smalltalk.prompt('Log in', 'Password:', '', {
                type: 'password'
              }).then(function (value) {

                globalPassword = value;
                $rootScope.$apply();
                //globalSelf.connect();
                if (!globalSelf.connected()) {
                  globalSelf.connect();
                } else {
                  globalSelf.initiateLoginSequence();
                };


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

            setTimeout(function () {
              jQuery(".messages").getNiceScroll(0).resize();
              return jQuery(".messages").getNiceScroll(0).doScrollTop(999999, 999);
            }, 100);
          } else {
            // warn the user it's not connected
            smalltalk.alert('Warning', 'Connection not set.');
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
          // }
          data = {
            username: globalUsername,
            password: globalPassword
          };
          console.log('initiateLoginSequence', data);
          this.auth = data;
          var self = this;
          // send initial packet and reset sessionState
          console.log("debug")
          let packet = constructPacket({
            packetType: PacketType.Info,
            payload: data.username
          });
          changeState(packet, true);

          // display UI
          $rootScope.$apply(function () {
            // Put the chat information in the cache
            globalSelf.cache.connected = true;
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
        };
        var constructPacket = ChatService.prototype.constructPacket;

        // GatherUserInfo: send check packet, original one.

        ChatService.prototype.changeState = function (rawData, isSend) {
          // @rawData: { packetType: int, payload: Buffer }
          // @isSend: true for sending packet
          console.log('changeState, ChatService.prototype.sessionState =', ChatService.prototype.sessionState);
          if (rawData) {
            console.log('changeState rawData', rawData);
            // console.log('changeState, sessionState =', sessionState);

            // these packets will be processed through the whole process.
            if (rawData.packetType == PacketType.Refuse) {
              if (rawData.payload.readUInt8(0) == ResponseType.ErrorOccurs) {
                smalltalk
                    .alert('Warning', 'Another one used your account to log in, you have to be offline.')
                    .then(() => {
                      globalSelf.killConnection();
                    });
                return;
              } else {
                console.log('changeState rawData', rawData);
                smalltalk.alert('Notice', 'Another client logged in using your account has been forced offline.');
                return;
              }
            }
            else if (rawData.packetType == PacketType.OnlineUser) {
              console.log('get new OnlineUser packet');
              if (globalSelf.onlineUserList.indexOf(globalSelf.decodeUserNamePacket(rawData)) < 0) {
                globalSelf.onlineUserList.push(globalSelf.decodeUserNamePacket(rawData));
                $rootScope.$apply();
                let newUser = globalSelf.onlineUserList[globalSelf.onlineUserList.length - 1];
                console.log('new online user:', newUser);
                if (newUser != globalSelf.user()){
                  smalltalk.alert('Notice', 'User ' + globalSelf.onlineUserList[globalSelf.onlineUserList.length - 1] + ' online.');
                }
              } else {
                console.log('user already exist in the list');
              }
              return;
            }
            else if (rawData.packetType == PacketType.OfflineUser) {
              console.log('get new OfflineUser packet');
              if (globalSelf.onlineUserList.indexOf(globalSelf.decodeUserNamePacket(rawData)) >= 0) {
                let offline = globalSelf.onlineUserList.splice(globalSelf.onlineUserList.indexOf(globalSelf.decodeUserNamePacket(rawData)), 1);
                $rootScope.$apply();
                console.log('offline user:', offline[0]);
                if (offline[0] != globalSelf.user()) {
                  smalltalk.alert('Notice', 'User ' + offline[0] + ' offline.');
                }
              } else {
                console.log('user not exist in the list');
              }
              return;
            }
            // busy
            else if (rawData.packetType == PacketType.RecvInvit && (ChatService.prototype.sessionState == SessionState.ClientInviting || ChatService.prototype.sessionState == SessionState.InGame || (ChatService.prototype.sessionState == SessionState.ClientInvited && !notResponsingInvitation))) {
              // Busy gaming
              console.log(ChatService.prototype.sessionState);
              console.log('busy gaming');
              return;
            }
            else if (rawData.packetType == PacketType.GameOver) {
              if (ChatService.prototype.sessionState == SessionState.ClientWaiting || ChatService.prototype.sessionState == SessionState.ClientInvited || ChatService.prototype.sessionState == SessionState.ClientInviting || ChatService.prototype.sessionState == SessionState.InGame) {
                console.log('game over, you lose');
                smalltalk
                    .confirm('Oops!', 'You lose! Play again?')
                    .then(() => {
                      console.log('another game');
                      ChatService.prototype.sessionState = SessionState.ClientWaiting;
                      globalSelf.opponentName = "Don\'t have one";
                      globalSelf.Game.prototype.initGame();
                      $rootScope.$apply();
                    })
                    .catch(() => {
                      console.log('exit');
                      globalSelf.killConnection();
                    });
              }
              else {
                console.log('rawData.packetType: '+ rawData.packetType);
                smalltalk.alert('Warning', 'Wrong TCP packet from server rawData.packetType: ' + rawData.packetType + ', sessionState: ' + ChatService.prototype.sessionState).then(
                    () => {
                      globalSelf.killConnection();
                    }
                );
              }
              return;
            }
            else {
              console.log('Empty rawData');
            }
          }

          switch (ChatService.prototype.sessionState) {
            case SessionState.Init:
              Chat.hasValidUser = false;
              console.log('app start');
              ChatService.prototype.sessionState = SessionState.GatherUserInfo;
              globalSelf.autoconnect();
              break;
            case SessionState.GatherUserInfo:
              console.log('info', rawData);
              sendPacket(rawData);
              ChatService.prototype.sessionState = SessionState.WaitForUsernameResponse;
              break;
            case SessionState.WaitForUsernameResponse:
              console.log('WaitForUsernameResponse');
              if (rawData.packetType != PacketType.UsernameResponse) {
                // error
                console.log('rawData.packetType: '+ rawData.packetType);
                smalltalk.alert('Warning', 'Wrong TCP packet from server rawData.packetType: ' + rawData.packetType).then(
                    () => {
                      globalSelf.killConnection();
                    }
                );
              } else {
                // decode payload here
                console.log('UsernameResponse: data.payload', rawData.payload);
                console.log('rawData', rawData);
                let infoData = rawData.payload.readUInt8(0);
                switch (infoData) {
                  case ResponseType.UserNotExist:
                    // user not exist
                    console.log('Wrong username: UserNotExist');
                    smalltalk.alert('Warning', 'Username not exist, please Log in again.').then(
                        function() {
                          Chat.hasValidUser = false;
                          ChatService.prototype.sessionState = SessionState.Init;
                          changeState();
                        }
                    );

                    break;
                  case ResponseType.ErrorOccurs:
                    // error occurs
                    console.log('Wrong username: ErrorOccurs');
                    smalltalk.alert('Warning', 'Unknown error occurs.').then(
                        () => {globalSelf.killConnection();}
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
                    ChatService.prototype.sessionState = SessionState.WaitForPasswordResponse;
                    break;
                  default:
                    console.log('unknown ResponseType');
                    smalltalk.alert('Warning', 'Wrong info_response packet from server rawData.ResponseType: ', infoData).then(
                        () => {globalSelf.killConnection();}
                    );
                    break;
                }
              }
              break;
            case SessionState.WaitForPasswordResponse:
              // receive password
              if (rawData.packetType != PacketType.PasswordResponse) {
                // error
                console.log('rawData.packetType: '+ rawData.packetType);
                smalltalk.alert('Warning', 'Wrong TCP packet from server rawData.packetType: ' + rawData.packetType).then(
                    // globalSelf.killConnection()
                );
              } else {
                // decode payload
                let infoData = rawData.payload.readUInt8();
                switch (infoData) {
                  case ResponseType.ErrorOccurs:
                    // error
                    console.log('Wrong password packet type');
                    () => {globalSelf.killConnection();}
                    break;
                  case ResponseType.Wrong:
                    // display message on label
                    // and prompt for reset password
                    // kill tcp connection and reset state
                    console.log('Wrong password');
                    smalltalk.alert('Warning', 'Wrong password, please Log in again.').then(
                        function() {
                          Chat.hasValidUser = false;
                          ChatService.prototype.sessionState = SessionState.Init;
                          changeState();
                        }
                    );
                    break;
                  case ResponseType.OK:
                    console.log('ResponseType.OK');
                    Chat.hasValidUser = true;
                    $rootScope.$apply();

                    // TODO: This is problematic!
                    // this.cache.validOnline = true;
                    ChatService.prototype.sessionState = SessionState.UserSync;
                    break;
                  default:
                    console.log('unknown ResponseType');
                    smalltalk.alert('Warning', 'Wrong passwd_response packet from server rawData.ResponseType: ', infoData).then(
                        () => {
                          globalSelf.killConnection();
                        }
                    );
                    break;
                }
              }
              break;
            case SessionState.UserSync:
              if (rawData.packetType != PacketType.SyncUserName && rawData.packetType != PacketType.SyncEnd) {
                // error
                console.log('rawData.packetType: '+ rawData.packetType);
                smalltalk.alert('Warning', 'Wrong TCP packet from server rawData.packetType').then(
                    // globalSelf.killConnection()
                );
              } else {
                switch (rawData.packetType) {
                  case PacketType.SyncUserName:
                    if (globalSelf.onlineUserList.indexOf(globalSelf.decodeUserNamePacket(rawData)) < 0) {
                      globalSelf.onlineUserList.push(globalSelf.decodeUserNamePacket(rawData));
                      $rootScope.$apply();
                      console.log('online user:', globalSelf.onlineUserList[globalSelf.onlineUserList.length-1]);
                    }
                    break;
                  case PacketType.SyncEnd:
                    console.log('sync online user end');
                    ChatService.prototype.sessionState = SessionState.ClientWaiting;
                    break;

                  default:
                    console.log('sync pack unknown');
                    smalltalk.alert('Warning', 'Unknown packet type').then(
                        () => {globalSelf.killConnection();}
                    );
                    break;
                }
              }
              break;
            case SessionState.ClientWaiting:
              // Wait two things
              // 1. invitation button click.
              // 2. a "RecvInvit" packet has been received.
              // TODO: Must wait after invitation button has been pressed.
              // TODO: This means that when click invitation button, changeState() should be triggered.
                globalSelf.planeDrawn = false;
                // $rootScope.$apply();
              if (isSend) {
                // Invite others
                // Here the invitation button has been clicked.
                // clickedInviteButton = false;
                console.log('invite others');
                sendPacket(rawData);
                ChatService.prototype.sessionState = SessionState.ClientInviting;
              }
              else {
                // Being invited
                // Here nothing has been done by user, this state is triggered because a packet has been received.
                globalSelf.opponentName = "Don\'t have one";
                $rootScope.$apply();
                console.log('being invited');
                ChatService.prototype.sessionState = SessionState.ClientInvited;
                changeState(rawData);
              }
              break;
            case SessionState.ClientInvited:
              // In this state, the invited client will process the received "RecvInvit" packet.
              if (rawData.packetType === PacketType.RecvInvit && notResponsingInvitation) {
                notResponsingInvitation = false;
                console.log('notResponsingInvitation: ', notResponsingInvitation);
                let inviter = globalSelf.decodeUserNamePacket(rawData);
                smalltalk
                    .confirm('Confirmation of invitation', 'Accept the invitation of ' + inviter + '?')
                    .then(() => {
                      // invitation accepted
                      console.log('Accepted invitation from ' + inviter);
                      globalSelf.Game.prototype.isMyTurn = false;
                      // $rootScope.$apply();
                      globalSelf.opponentName = inviter;
                      $rootScope.$apply();
                      const buf = Buffer.allocUnsafe(1);
                      buf.writeUInt8(ResponseType.OK, 0);
                      let packet = constructPacket({
                        packetType: PacketType.InvitResponse,
                        payload: buf
                      });
                      sendPacket(packet);
                      notResponsingInvitation = true;
                      ChatService.prototype.sessionState = SessionState.InGame;
                      changeState();
                    })
                    .catch(() => {
                      // invitation refused
                      console.log('Refused invitation from ' + inviter);
                      const buf = Buffer.allocUnsafe(1);
                      buf.writeUInt8(ResponseType.RefuseInvit, 0);
                      let packet = constructPacket({
                        packetType: PacketType.InvitResponse,
                        payload: buf
                      });
                      sendPacket(packet);
                      notResponsingInvitation = true;
                      // Wait to invite others or to be invited.
                      ChatService.prototype.sessionState = SessionState.ClientWaiting;
                    });
              } else {
                // Get wrong packet
                console.log('rawData.packetType: '+ rawData.packetType);
                smalltalk.alert('Warning', 'Wrong TCP packet from server rawData.packetType: ' + rawData.packetType).then(
                    // globalSelf.killConnection()
                );
              }
              break;
            case SessionState.ClientInviting:
              // In this state, the inviting client is waiting for the response of the invited client.
              // This state will only be triggered after receiving a "InvitResponse" packet.
              if (rawData.packetType != PacketType.InvitResponse) {
                // Get wrong packet
                console.log('rawData.packetType: '+ rawData.packetType);
                smalltalk.alert('Warning', 'Wrong TCP packet from server rawData.packetType: ' + rawData.packetType).then(
                    // globalSelf.killConnection()
                );
              }
              else {
                let infoData = rawData.payload.readUInt8(0);
                switch (infoData) {
                  case ResponseType.UserNotExist:
                    smalltalk.alert('Warning', 'The user you chose does not exist. Please invite another user or wait for invitation.');
                    ChatService.prototype.sessionState = SessionState.ClientWaiting;
                    break;
                  case ResponseType.OK:
                    smalltalk.alert('Notice', 'The user you chose accepted your invitation, game starts.').then(
                        function () {
                          globalSelf.Game.prototype.isMyTurn = true;
                          $rootScope.$apply();
                          ChatService.prototype.sessionState = SessionState.InGame;
                          changeState();
                        }
                    );
                    break;
                  case ResponseType.RefuseInvit:
                    smalltalk.alert('Warning', 'The user you chose refused your invitation. Please invite another user or wait for invitation.');
                    ChatService.prototype.sessionState = SessionState.ClientWaiting;
                    break;
                  case ResponseType.Busy:
                    smalltalk.alert('Warning', 'The user you chose is busy gaming or responding to another one\'s invitation. Please invite another user or wait for invitation.');
                    ChatService.prototype.sessionState = SessionState.ClientWaiting;
                    break;
                  default:
                    smalltalk.alert('Warning', 'Unable to process ResponseType: ' + infoData).then(
                        // globalSelf.killConnection()
                    );
                }
              }
              break;
            case SessionState.InGame:
              // All two players successfully paired.
              // Now draw planes and play games.

              if(!rawData) {
                // not get any packet
                // draw planes
                smalltalk.alert('Notice', 'Please draw three planes on the opponent\'s board for the opponent to guess.');
                $rootScope.$apply();
              } else {
                // get packet from server
                switch (rawData.packetType) {
                  case PacketType.Board:
                    // received opponent's three planes.
                    console.log('received opponent\'s three planes');
                    smalltalk.alert('Notice', 'received opponent\'s three planes, game begin.');
                    globalSelf.planeDrawn = true;
                    $rootScope.$apply();
                    globalSelf.Game.prototype.recvOpponentBoard(rawData.payload);
                    $rootScope.$apply();
                    break;
                  case PacketType.SingleCoord:
                    // received a single coordinate.
                    console.log('get single coord');
                    globalSelf.Game.prototype.isMyTurn = true;
                    globalSelf.Game.prototype.recvCoordinate(rawData.payload, false);
                    $rootScope.$apply();
                    break;
                  case PacketType.DoubleCoord:
                    // received two coordinates.
                    console.log('get double coord');
                    globalSelf.Game.prototype.isMyTurn = true;
                    globalSelf.Game.prototype.recvCoordinate(rawData.payload, true);
                    $rootScope.$apply();
                    break;
                  default:
                    break;
                }
              }
              break;
            default:
              break;
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
        // setInterval(function () {
        //   console.log(socket);
        // }, 1000);
        var sendPacket = ChatService.prototype.sendPacket;

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


        ChatService.prototype.decodeUserNamePacket = function (rawData) {
          console.log('decodeUsernamePacket', rawData);
          let username = rawData.payload.toString();
          return username;
        };

        // game logic
        let chatInstance = new ChatService($Socket.socket, $Settings);
        console.log('chatInstance', chatInstance);
        ChatService.prototype.Game = Game(chatInstance);

        // Instantiates a new chat service
        return chatInstance;


      }




    ]);
