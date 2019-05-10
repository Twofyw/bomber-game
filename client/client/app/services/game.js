const GameState = Object.freeze({
    "First": 1,
    "Second": 2,
    "Third": 3,
    "Move": 4,
    "Wait": 5,
});

const PlaneDirection = Object.freeze({
    "upward": 0,
    "right": 1,
    "downward": 2,
    "left": 3,
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

let Game = function (sendPacket, PacketType) {
    console.log('Game init');
    // initialize to -1, -1
    Game.prototype.head = [-1, -1];
    Game.prototype.tail = [];
    // finite state machine
    Game.prototype.state = GameState.First;
    Game.prototype.isMyTurn = false;
    Game.prototype.boardString = "";
    Game.prototype.sendPacket = sendPacket;
    Game.prototype.PacketType = PacketType;

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
}

// When click on a box, a coordinate will be generated
var isCoordEqual = function (cord1, cord2) {
    return (cord1[0] == cord2[0]) && (cord1[1] == cord2[1])
};

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
                    if (this.AddOnePlane(false, this.head, this.tail) == false) {
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
                    if (this.AddOnePlane(false, this.head, this.tail) == false) {
                        console.log("Add Plane failed");
                        this.planeMap[this.head[0]][this.head[1]] = Color.notKnown;
                        // this.planeMap[x][y] = Color.notKnown;
                        this.head = [-1, -1];
                        return;
                    } else {
                        console.log("Successfully Add Plane!");
                        if (this.isMyTurn == true) {
                            this.state = GameState.Move;
                        } else {
                            this.state = GameState.Wait;
                        }
                        this.boardString += this.head[0].toString() + this.head[1].toString() + this.tail[0].toString() + this.tail[1].toString();
                        this.head = [-1, -1];
                        // TODO: Send Board Packet
                        let boardPacket = {
                            packetType: this.PacketType.Board,
                            payload: this.boardString
                        };
                        console.log("boardPacket", boardPacket);
                        console.log("Function", this.sendPacket);
                        this.sendPacket(boardPacket);
                    }
                }
                break;
            }
            case GameState.Move: {
                this.gameMap[x][y] = this.opponentMap[x][y];
                this.state = GameState.Wait;
                this.isMyTurn = false;
                // need to send Single Coordinate Packet
                let singleCoordinatePacket = {
                    packetType: PacketType.SingleCoord,
                    payload: x.toString() + y.toString()
                }
                // SendPacket(singleCoordinatePacket);
                console.log("SingleCoordinatePacket", singleCoordinatePacket);

                if (this.WinCheck() == true) {
                    // TODO
                    let gameOverPacket = {
                        packetType: PacketType.GameOver,
                        payload: ""
                    };
                    // SendPacket(gameOverPacket);
                    console.log("GameOver", gameOverPacket);
                }
            }
        }
        ;
    } else {
        if (this.state != GameState.Move) {
            console.log("ERROR AT Double Click");
            return;
        } else {
            if (this.head == [-1, -1]) {
                this.head = [x, y];
                this.gameMap[x][y] = Color.doubleCoordHead;
            } else {
                this.tail = [x, y];
                if (this.opponentMap[this.head[0]][this.head[1]] % 10 == Color.planeHead
                    && this.opponentMap[this.tail[0]][this.tail[1]] ==
                    this.opponentMap[this.head[0]][this.head[1]] + 1) {
                    // Need to send Double Coordinate Packet
                    console.log("Double Coordinate Guess Succeed.");
                    for (let i = 0; i < 10; i++) {
                        for (let j = 0; j < 10; j++) {
                            if ((this.opponentMap[i][j] / 10) == (this.opponentMap[this.head[0]][this.head[1]] / 10)) {
                                this.gameMap[i][j] = this.opponentMap[i][j];
                            }
                        }
                    }
                    let doubleCoordinatePacket = {
                        packetType: PacketType.DoubleCoord,
                        payload: this.head[0].toString() + this.head[1].toString() + this.tail[0].toString() + this.tail[1].toString()
                    }
                    // SendPacket(doubleCoordinatePacket);
                    console.log("doubleCoordinatePacket", doubleCoordinatePacket);
                } else {
                    this.gameMap[x][y] = Color.notKnown;
                    this.gameMap[this.head[0]][this.gameMap[1]] = Color.notKnown;
                }
                this.state = GameState.Wait;
                this.isMyTurn = false;
                if (this.WinCheck() == true) {
                    // TODO
                    let gameOverPacket = {
                        packetType: PacketType.GameOver,
                        payload: ""
                    };
                    // SendPacket(gameOverPacket);
                    console.log("GameOver2", gameOverPacket);
                }
            }
        }
    }
}

var AddOnePlane = function (isOpponent, head, tail) {
    let x = head[0];
    let y = head[1];
    // c: the direction of the plane
    // 0: upward, 1 right, 2 downward, 3 left
    let c = PlaneDirection.upward;
    // temp map
    var changeMap;
    if(isOpponent == false) changeMap = this.planeMap;
    else changeMap = this.opponentMap;

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
                    else resultMap[i][j] = this.planeShape[ci][cj] + this.state * 10;
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
                    else resultMap[i][j] = this.planeShape[cj][ci] + this.state * 10;
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
                    else resultMap[i][j] = this.planeShape[ci][cj] + this.state * 10;
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
                    else resultMap[i][j] = this.planeShape[cj][ci] + this.state * 10;
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
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if (this.opponentMap[i][j] != 0 && this.gameMap[i][j] == 0) return false;
        }
    }

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
    for(let i = 0; i < BoardStr.length; i += 4){
        var head = [Number(BoardStr[i]), Number(BoardStr[i+1])];
        var tail = [Number(BoardStr[i+2]), Number(BoardStr[i+3])];

        var changeMap = this.opponentMap;
        if (this.AddOnePlane(true, head, tail) == false) {
            console.log("recv opponentBoard: Add Plane failed");
            return false;
        }
    }
    console.log("Write opponentBoard succeed.");
    console.log("opponentMap: ", this.opponentMap);
}

// Game();
// Game.prototype
Game.prototype.AddOnePlane = AddOnePlane;
Game.prototype.Click = Click;
Game.prototype.WinCheck = WinCheck;
Game.prototype.coordinatePacket = coordinatePacket;
Game.prototype.recvOpponentBoard = recvOpponentBoard;
// Game.prototype.Chat = Chat;

console.log(Game.prototype.isMyTurn);
console.log(Game.prototype.planeMap);

module.exports = Game;