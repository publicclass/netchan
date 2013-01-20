
# netchan

[![Build Status](https://travis-ci.org/publicclass/netchan.png?branch=master)](https://travis-ci.org/publicclass/netchan)

  A NetChan implementation wrapping an unreliable DataChannel.

## Installation

    $ component install publicclass/netchan

## API


## Example

    var pc = new PeerConnection(null)
    var channel = pc.createDataChannel('netchan',{reliable: false})
    var netchan = new NetChannel(channel);

    var buf = new ArrayBuffer(4)
      , dat = new DataView(buf);
    dat.setUint8(0,1)
    dat.setUint8(1,2)
    dat.setUint8(2,3)
    dat.setUint8(3,4)

    netchan.onmessage = function(msg){
      var dat = new DataView(msg);
      dat.getUInt8(0) // 1
      dat.getUInt8(1) // 2
      dat.getUInt8(2) // 3
      dat.getUInt8(3) // 4
    }

    // only binary supported by NetChannel
    netchan.send(buf);


## Testing

  Because Node 0.8 lacks ArrayBuffer#slice it must be ran with Node 0.9.4+ but it will fail on 0.9.7 because of [a regression](https://github.com/joyent/node/issues/4626).

  To unit test simply run:

    $ make


## License

  MIT
