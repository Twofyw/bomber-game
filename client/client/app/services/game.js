const GameState = Object.freeze({
    "First": 1,
    "Second": 2,
    "Third": 3,
    "Move": 4,
    // "Wait": 5,
});

const PlaneDirection = Object.freeze({
    "upward": 0,
    "right": 1,
    "downward": 2,
    "left": 3,
});

var SessionState = Object.freeze({
    "FirstThingsFirst": 0,
    "Init": 1, // send check
    "WaitForInfoResponse": 2, // Match user in database, password not received yet
    // If user exists, send a response
    "WaitForPasswordResponse": 3, // Send UserCheck response
    "UserExists": 4, // Branch #1, receive password and match password in database
    "PasswordReset": 5, // First login. Receive new password and update database
    "AlreadyLoggedIn": 6, // Kick off the logged in session
    "UserSync": 7, // Merge #1, send preference
    "ClientWaiting": 8,
    "ClientInvited": 9,
    "ClientInviting": 10,
    //"Draw": 11,
    "InGame": 11,

    "HistorySync": 67, // Send history
    // Branch #2 and Merge #2, branch according to the media_type
    // of the next packet (either received or sent).
    // Send has priority over read.
    "TextUsername": 69, // Target text username
    "Text": 60, // Text data
    "FileUsername": 61, // Target file username
    "FileName": 62,
    "FileInProgress": 63, // Until a FileEnd packet is received
    "GroupUsernameList": 64, // Target group username list
    "GroupText": 65, // Target group text data
    // go back to ServerWaiting state
    // ZZY
    "GreatWall": 99
});

var PacketType = Object.freeze({
    "Info": 0x00,
    "InfoResponse": 0x01,
    "Password": 0x02,
    "PasswordResponse": 0x03,
    "Refuse": 0x04,
    // "Configuration": 0x05,
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
    "TextUsername": 0x99,
    "Text": 0x9A,
    "FileName": 0x9B,
    "FileInProgress": 0x9C,
    "GroupTextUserlist": 0x9D,
    "FileEnd": 0x9E,
    "FileUsername": 0x9F,
});

const Color = Object.freeze({
    "miss": 0,
    "planeBody": 1,
    "planeHead": 2,
    "planeTail": 3,
    "hitBody": 4,
    "hitHead": 5,
    "hitTail": 6,
    "doubleCoordHead": 7,
    "blink": 8,
    "notKnown": 9,
});

let Game = function (Chat) {
    console.log('Game init');
    console.log(Chat);
    // initialize to -1, -1
    Game.prototype.head = [-1, -1];
    Game.prototype.tail = [];
    // finite state machine
    Game.prototype.state = GameState.First;
    Game.prototype.isMyTurn = false;
    Game.prototype.boardString = "";
    Game.prototype.Chat = Chat;
    Game.prototype.recvBoard = false;
    Game.prototype.headColor = Color.notKnown;
    // Game.prototype.PacketType = PacketType;
    // console.log("*****************", Game.prototype.Chat.socket)
    // Game.prototype.Chat.socket.on('data', Game.prototype.Chat.socketDataCallback);

    // init
    Game.prototype.gameMap = [];
    Game.prototype.planeMap = [];
    Game.prototype.opponentMap = [];
    for (let i = 0; i < 10; i++) {
        Game.prototype.gameMap.push(Array.apply(null, {length: 10}).map(function () {
            return Color.notKnown;
        }));
        Game.prototype.planeMap.push(Array.apply(null, {length: 10}).map(function () {
            return Color.notKnown;
        }));
        Game.prototype.opponentMap.push(Array.apply(null, {length: 10}).map(function () {
            return Color.notKnown;
        }));
    }
    Game.prototype.planeShape = [
        [0, 0, 2, 0, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 1, 0, 0],
        [0, 1, 3, 1, 0]
    ];

    return Game;
}

// When click on a box, a coordinate will be generated
var isCoordEqual = function (cord1, cord2) {
    return (cord1[0] == cord2[0]) && (cord1[1] == cord2[1])
};

// var socketCallBack = function (data) {
//     // change state machine and process data here
//     console.log('data received', data);

//     // append data to existing buffer and check for length
//     receiveBuffer = Buffer.concat([receiveBuffer, data]);

//     if (receiveBuffer.length < 3) {
//     receiveBuffer = Buffer.concat([receiveBuffer, data]);
//     }

//     let payloadLength = receiveBuffer.readUInt16BE(1);
//     while (receiveBuffer.length >=3 && receiveBuffer.length >= payloadLength + 3) {
//     console.log('receiveBuffer', receiveBuffer);
//     let payloadEndPosition = 3 + payloadLength;
//     let packet = decodePacket(receiveBuffer.slice(0, payloadEndPosition));
//     if (payloadEndPosition == receiveBuffer.length) {
//         receiveBuffer = Buffer.allocUnsafe(0);
//         payloadLength = 0;
//     } else {
//         receiveBuffer = receiveBuffer.slice(payloadEndPosition, receiveBuffer.length);
//         payloadLength = receiveBuffer.readUInt16BE(1);
//     }
//     changeState(packet, false);
//     console.log('remaining data length', receiveBuffer.length);
//     console.log('payloadLength', payloadLength);
//     }
// };

var Click = function (x, y, isDouble) {
    // transfer string to integer
    x = Number(x);
    y = Number(y);
    console.log('Game.Click', isDouble);

    if (isDouble == false) {
        switch (this.state) {
            case GameState.First:
            case GameState.Second: {
                if (isCoordEqual(this.head, [-1, -1])) {
                    // need to store the head coordinate
                    console.log("Record Head");
                    this.head = [x, y];
                    this.planeMap[x][y] = this.state * 10 + Color.planeHead;
                } else {
                    this.tail = [x, y];
                    if (this.AddOnePlane(false, this.head, this.tail, 0) == false) {
                        console.log("Add Plane failed");
                        // this.planeMap[x][y] = Color.notKnown;
                        this.planeMap[this.head[0]][this.head[1]] = Color.notKnown;
                        this.head = [-1, -1];
                        return;
                    } else {
                        console.log("Successfully Add Plane!");
                        this.state += 1;
                        this.boardString += this.head[0].toString() + this.head[1].toString() + this.tail[0].toString() + this.tail[1].toString();
                        this.head = [-1, -1];
                    }
                }
                break;
            }
            case GameState.Third: {
                if (isCoordEqual(this.head, [-1, -1])) {
                    // need to store the head coordinate
                    this.head = [x, y];
                    this.planeMap[x][y] = this.state * 10 + Color.planeHead;
                } else {
                    this.tail = [x, y];
                    if (this.AddOnePlane(false, this.head, this.tail, 0) == false) {
                        console.log("Add Plane failed");
                        this.planeMap[this.head[0]][this.head[1]] = Color.notKnown;
                        // this.planeMap[x][y] = Color.notKnown;
                        this.head = [-1, -1];
                        return;
                    } else {
                        console.log("Successfully Add Plane!");
                        this.state = GameState.Move;
                        if (this.isMyTurn == true) {
                            console.log("I need to make first move");
                        } else {
                            console.log('I need to wait the other side');
                        }
                        this.boardString += this.head[0].toString() + this.head[1].toString() + this.tail[0].toString() + this.tail[1].toString();
                        this.head = [-1, -1];
                        // TODO: Send Board Packet
                        let boardPacket = {
                            packetType: PacketType.Board,
                            payload: this.boardString
                        };
                        console.log("boardPacket", boardPacket);
                        console.log("Function", this.Chat.sendPacket);
                        smalltalk.alert('Notice', 'You have successfully drew three planes!');
                        this.Chat.sendPacket(boardPacket);
                    }
                }
                break;
            }
            case GameState.Move: {
                console.log("Move x, y:" , x , " ", y);
                this.gameMap[x][y] = this.opponentMap[x][y];
                if(this.gameMap[x][y] == Color.notKnown) this.gameMap[x][y] = Color.miss;
                // this.state = GameState.Wait;
                this.isMyTurn = false;
                // need to send Single Coordinate Packet
                let singleCoordinatePacket = {
                    packetType: PacketType.SingleCoord,
                    payload: x.toString() + y.toString()
                }
                // SendPacket(singleCoordinatePacket);
                console.log("SingleCoordinatePacket", singleCoordinatePacket);
                this.Chat.sendPacket(singleCoordinatePacket);

                if (this.WinCheck() == true) {
                    // TODO
                    let gameOverPacket = {
                        packetType: PacketType.GameOver,
                        payload: ""
                    };
                    this.Chat.sendPacket(gameOverPacket);
                    smalltalk
                        .confirm('Congrats!', 'You win! Play again?')
                        .then(() => {
                            // .then(function() {
                            console.log('another game');
                            this.Chat.sessionState = SessionState.ClientWaiting;
                            Game.prototype.initGame();
                            Game.prototype.Chat.refresh();
                            console.log('Debug');
                        })
                        .catch(() => {
                            console.log('exit');
                            Game.prototype.Chat.killConnection();
                        });
                }
            }
            // case GameState.Wait: {
            // console.log("Wait & Move x, y", x, " ", y);
            // this.gameMap[x][y] = this.opponentMap[x][y];
            // this.state = GameState.Move;
            //     this.isMyTurn
            // }
        }
        ;
    } else {
        if (this.state != GameState.Move) {
            console.log("ERROR AT Double Click");
            return;
        } else {
            if (isCoordEqual(this.head, [-1, -1])) {
                this.head = [x, y];
                if(this.gameMap[x][y] % 10 == Color.planeHead) {
                    this.headColor = this.gameMap[x][y];
                }
                this.gameMap[x][y] = Color.doubleCoordHead;
            } else {
                this.tail = [x, y];
                console.log("debug", this.opponentMap);
                if (this.opponentMap[this.head[0]][this.head[1]] % 10 == Color.planeHead
                    && this.opponentMap[this.tail[0]][this.tail[1]] ==
                    this.opponentMap[this.head[0]][this.head[1]] + 1) {
                    // Need to send Double Coordinate Packet
                    console.log("Double Coordinate Guess Succeed.");
                    console.log(this.opponentMap);
                    for (let i = 0; i < 10; i++) {
                        for (let j = 0; j < 10; j++) {
                            if (Math.floor(this.opponentMap[i][j] / 10) == Math.floor(this.opponentMap[this.head[0]][this.head[1]] / 10)) {
                                this.gameMap[i][j] = this.opponentMap[i][j];
                            }
                        }
                    }
                    let doubleCoordinatePacket = {
                        packetType: PacketType.DoubleCoord,
                        payload: this.head[0].toString() + this.head[1].toString() + this.tail[0].toString() + this.tail[1].toString()
                    }
                    this.Chat.sendPacket(doubleCoordinatePacket);
                    this.head = [-1, -1];
                    console.log("doubleCoordinatePacket", doubleCoordinatePacket);
                } else {
                    this.gameMap[x][y] = Color.notKnown;
                    this.gameMap[this.head[0]][this.head[1]] = this.headColor;
                    this.head = [-1, -1];
                    this.headColor = Color.notKnown;
                    let doubleCoordinatePacket = {
                        packetType: PacketType.DoubleCoord,
                        payload: this.head[0].toString() + this.head[1].toString() + this.tail[0].toString() + this.tail[1].toString()
                    }
                    this.Chat.sendPacket(doubleCoordinatePacket);
                    console.log("doubleCoordinatePacket2", doubleCoordinatePacket);
                }
                this.isMyTurn = false;
                if (this.WinCheck() == true) {
                    // TODO
                    let gameOverPacket = {
                        packetType: PacketType.GameOver,
                        payload: ""
                    };
                    this.Chat.sendPacket(gameOverPacket);
                    console.log("GameOver2", gameOverPacket);
                    smalltalk
                        .confirm('Congrats!', 'You win! Play again?')
                        .then(() => {
                            // .then(function() {
                            console.log('another game');
                            this.Chat.sessionState = SessionState.ClientWaiting;
                            Game.prototype.initGame();
                            Game.prototype.Chat.refresh();
                            console.log('Debug');
                        })
                        .catch(() => {
                            console.log('exit');
                            Game.prototype.Chat.killConnection();
                        });

                }
            }
        }
    }
}

var recvCoordinate = function (payload, is_double) {
    var x1 = Number(payload[0]);
    var y1 = Number(payload[1]);
    if(is_double == false) {
        if(this.planeMap[x1][y1] % 10 != Color.notKnown) {
            //correct single coordinate guess
            this.planeMap[x1][y1] = this.planeMap[x1][y1] + 3;
        }
        else {
            this.planeMap[x1][y1] = Color.miss;
        }
    }
    else {
        var x2 = Number(payload[2]);
        var y2 = Number(payload[3]);
        if (this.planeMap[x1][y1] % 10 == Color.planeHead && this.planeMap[x2][y2] == this.planeMap[x1][y1] + 1 ) {
            // correct double coordinate guess
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    if (Math.floor(this.planeMap[i][j] / 10) == Math.floor(this.planeMap[x1][y1] / 10)) {
                        this.planeMap[i][j] = this.planeMap[i][j] + 3;
                    }
                }
            }
        }
        else {
            // this.planeMap[x1][y1] = Color.miss;
        }
    }
}

var initGame = function() {
    this.gameMap = [];
    this.planeMap = [];
    this.opponentMap = [];
    for (let i = 0; i < 10; i++) {
        this.gameMap.push(Array.apply(null, {length: 10}).map(function () {
            return Color.notKnown;
        }));
        this.planeMap.push(Array.apply(null, {length: 10}).map(function () {
            return Color.notKnown;
        }));
        this.opponentMap.push(Array.apply(null, {length: 10}).map(function () {
            return Color.notKnown;
        }));
    }
    this.head = [-1, -1];
    this.state = GameState.First;
    this.isMyTurn = false;
    this.recvBoard = false;
    this.boardString = "";
    this.headColor = Color.notKnown;
}

var AddOnePlane = function (isOpponent, head, tail, planeNumber) {
    let x = head[0];
    let y = head[1];
    // c: the direction of the plane
    // 0: upward, 1 right, 2 downward, 3 left
    let c = PlaneDirection.upward;
    // temp map
    var changeMap;
    var planeIndex;
    if(isOpponent == false) {
        changeMap = this.planeMap;
        planeIndex = this.state;
    }
    else {
        changeMap = this.opponentMap;
        planeIndex = planeNumber;
    }

    var resultMap = new Array(10);
    for(let i = 0; i < 10; i++) {
        resultMap[i] = new Array(10);
        for(let j = 0; j < 10; j++) resultMap[i][j] = changeMap[i][j];
    }

    console.log("resultMap",resultMap);
    // console.log(head, tail);

    if (head[0] == tail[0] && (tail[1] - head[1]) == 3) c = PlaneDirection.left;
    else if (head[0] == tail[0] && (head[1] - tail[1]) == 3) c = PlaneDirection.right;
    else if (head[1] == tail[1] && (tail[0] - head[0]) == 3) c = PlaneDirection.upward;
    else if (head[1] == tail[1] && (head[0] - tail[0]) == 3) c = PlaneDirection.downward;
    else return false;

    switch (c) {
        case PlaneDirection.upward: {
            for (let i = x, ci = 0; i < x + 4; i++) {
                if (i < 0 || i > 9) {
                    console.log('Plane Placed Error UP');
                    // reset head record
                    return false;
                }
                let cj = 0;
                for (let j = y - 2; j < y + 3; j++) {
                    if (j < 0 || j > 9) {
                        console.log('Plane Placed Error UP 2');
                        return false;
                    }
                    if(this.planeShape[ci][cj] != 0) {
                        if(resultMap[i][j] == Color.notKnown) ;
                        else if(i == x && j == y) ;
                        else {
                            console.log('Plane Placed Error UP 2');
                            return false;
                        }
                    }

                    if(this.planeShape[ci][cj] == 0) ;
                    else resultMap[i][j] = this.planeShape[ci][cj] + planeIndex * 10;
                    cj++;
                }
                ci++;
            }
            break;
        }
        case PlaneDirection.right: {
            for (let i = x - 2, ci = 0; i < x + 3; i++) {
                if (i < 0 || i > 9) {
                    console.log('Plane Placed Error Right');
                    // reset head record
                    return false;
                }
                let cj = 0;
                for (let j = y; j > y - 4; j--) {
                    if (j < 0 || j > 9) {
                        console.log('Plane Placed Error Right 2');
                        return false;
                    }
                    if(this.planeShape[cj][ci] != 0) {
                        if(resultMap[i][j] == Color.notKnown) ;
                        else if(i == x && j == y) ;
                        else {
                            console.log('Plane Placed Error Right 2');
                            return false;
                        }
                    }

                    if(this.planeShape[cj][ci] == 0);
                    else resultMap[i][j] = this.planeShape[cj][ci] + planeIndex * 10;
                    cj++;
                }
                ci++;
            }
            break;
        }
        case PlaneDirection.downward: {
            for (let i = x, ci = 0; i > x - 4; i--) {
                if (i < 0 || i > 9) {
                    console.log('Plane Placed Error Down');
                    // reset head record
                    return false;
                }
                let cj = 0;
                for (let j = y + 2; j > y - 3; j--) {
                    if (j < 0 || j > 9) {
                        console.log('Plane Placed Error Down 2');
                        return false;
                    }
                    if(this.planeShape[ci][cj] != 0) {
                        if(resultMap[i][j] == Color.notKnown) ;
                        else if(i == x && j == y) ;
                        else {
                            console.log('Plane Placed Error Down 2');
                            return false;
                        }
                    }

                    if(this.planeShape[ci][cj] == 0);
                    else resultMap[i][j] = this.planeShape[ci][cj] + planeIndex * 10;
                    cj++;
                }
                ci++;
            }
            break;
        }
        case PlaneDirection.left: {
            for (let i = x - 2, ci = 0; i < x + 3; i++) {
                if (i < 0 || i > 9) {
                    console.log('Plane Placed Error Left');
                    // reset head record
                    return false;
                }
                let cj = 0;
                for (let j = y; j < y + 4; j++) {
                    if (j < 0 || j > 9) {
                        console.log('Plane Placed Error Left 2');
                        return false;
                    }
                    if(this.planeShape[cj][ci] != 0) {
                        if(resultMap[i][j] == Color.notKnown) ;
                        else if(i == x && j == y) ;
                        else {
                            console.log('Plane Placed Error Left 3');
                            return false;
                        }
                    }

                    if(this.planeShape[cj][ci] == 0);
                    else resultMap[i][j] = this.planeShape[cj][ci] + planeIndex * 10;
                    cj++;
                }
                ci++;
            }
            break;
        }
    }

    if(isOpponent == false) this.planeMap = resultMap;
    else this.opponentMap = resultMap;

    return true;
}

var WinCheck = function () {
    console.log(this.opponentMap);
    console.log(this.gameMap);
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if (this.opponentMap[i][j] != Color.notKnown && this.gameMap[i][j] == Color.notKnown) return false;
        }
    }

    console.log("********************************************************");
    return true;
}

var coordinatePacket = function (payload, isDouble) {
    if (isDouble == false) {
        // Recv Single Coordinate
        var x = Number(payload[0]);
        var y = Number(payload[1]);
        switch (this.planeMap[x][y] % 10) {
            case Color.notKnown: {
                this.planeMap[x][y] = Color.miss;
                break;
            }
            case Color.planeBody: {
                this.planeMap[x][y] = Color.hitBody;
                break;
            }
            case Color.planeHead: {
                this.planeMap[x][y] = Color.hitHead;
                break;
            }
            case Color.planeTail: {
                this.planeMap[x][y] = Color.hitTail;
                break;
            }
        }
    } else {
        // Recv Double Coordinate
        var x1 = Number(payload[0]);
        var y1 = Number(payload[1]);
        var x2 = Number(payload[2]);
        var y2 = Number(payload[3]);

        if ((this.planeMap[x1][y1] % 10) == Color.planeHead && (this.planeMap[x2][y2] - this.planeMap[x1][y1] == 1)) {
            // successfully find out the plane
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    if ((this.planeMap[i][j] / 10) == (this.planeMap[x1][y1] / 10)) {
                        this.planeMap[i][j] = this.planeMap[i][j] + 3;
                    }
                }
            }
        } else {
            let oldColor = this.planeMap[x1][x2];
            let lastColor = this.planeMap[x2][y2];
            this.planeMap[x1][y1] = Color.blink;
            this.planeMap[x2][y2] = Color.blink;
            setTimeout(() => {
                this.planeMap[x1][y1] = oldColor;
                this.planeMap[x2][y2] = lastColor;
            }, 100);
        }
    }
}

var recvOpponentBoard = function (payload) {
    var BoardStr = payload;
    let j = 1;
    for(let i = 0; i < BoardStr.length; i += 4){
        var head = [Number(BoardStr[i]) - 48, Number(BoardStr[i+1]) - 48];
        var tail = [Number(BoardStr[i+2] - 48), Number(BoardStr[i+3] - 48)];

        var changeMap = this.opponentMap;
        if (this.AddOnePlane(true, head, tail, j) == false) {
            console.log("recv opponentBoard: Add Plane failed");
            return false;
        }
        j++;
    }
    console.log("Write opponentBoard succeed.");
    console.log("opponentMap: ", this.opponentMap);
    this.recvBoard = true;
}

// Game();
// Game.prototype
Game.prototype.AddOnePlane = AddOnePlane;
Game.prototype.Click = Click;
Game.prototype.WinCheck = WinCheck;
Game.prototype.coordinatePacket = coordinatePacket;
Game.prototype.recvOpponentBoard = recvOpponentBoard;
Game.prototype.initGame = initGame;
Game.prototype.recvCoordinate = recvCoordinate;
// Game.prototype.Chat.socket.on('data', Chat.socketDataCallback);
// Game.prototype.Chat = Chat;

// console.log(Game.prototype.isMyTurn);
// console.log(Game.prototype.planeMap);

module.exports = Game;