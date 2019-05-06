const net = require('net');

angular
  .module(DEFAULT.PKG('socket'), [])
  .factory('$Socket', [function () {

    console.log('$Socket', 'BASE_URL: ' + DEFAULT.API.BASE_URL);

    // Connect to the Socket server

    // use our socket

    return {io: new io(DEFAULT.API.BASE_URL)};
    var client = new net.Socket();
    // client.connect(DEFAULT.API.PORT, DEFAULT.API.IP, function () {
    //   // self.socket.setKeepalive(true, 5000);
    //   console.log('Connected', client);
    //   let data = 'Hello, server! Love, Client.';
    //   client.write(data);
    //   console.log('sent', data);
    // });

    return { socket: client };


  }]);
