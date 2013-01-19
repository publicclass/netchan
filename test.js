var NetChannel = require('netchan');

function fakeDataChannel(){
  return {
    reliable: false,
    addEventListener: function(type,fn){this.callback = fn},
    dispatchEvent: function(type,msg){this.callback(msg)}
  }
}

describe('NetChannel',function(){

  it('encode',function(){
    var nc = new NetChannel();

    var buf = new ArrayBuffer(4)
      , dat = new DataView(buf);
    dat.setUint8(0,1)
    dat.setUint8(1,2)
    dat.setUint8(2,3)
    dat.setUint8(3,4)

    expect(nc.seq).to.equal(1)
    expect(nc.ack).to.equal(0)
    nc.send(buf);
    expect(nc.seq).to.equal(2)
    expect(nc.ack).to.equal(0)

    var msg = nc.encode();
    var dat = new DataView(msg);
    expect(dat.getInt16(0)).to.equal(0) // ack
    expect(dat.getInt16(2)).to.equal(1) // seq
    expect(dat.getUint8(4)).to.equal(4)      // len
    expect(dat.getUint8(5)).to.equal(1)      // msg[0]
    expect(dat.getUint8(6)).to.equal(2)      // msg[1]
    expect(dat.getUint8(7)).to.equal(3)      // msg[2]
    expect(dat.getUint8(8)).to.equal(4)      // msg[3]

    var called = 0;
    nc.onmessage = function(msg){
      var dat = new DataView(msg);
      expect(dat.getUint8(0)).to.equal(1)
      expect(dat.getUint8(1)).to.equal(2)
      expect(dat.getUint8(2)).to.equal(3)
      expect(dat.getUint8(3)).to.equal(4)
      expect(function(){ dat.getUint8(4) }).to.throwError(/Index out of range|IndexSizeError/)
      called++;
    }

    nc.decode(msg)
    expect(nc.seq).to.equal(2)
    expect(nc.ack).to.equal(1)
    expect(called).to.equal(1)

    nc.send(buf.slice(0));
    expect(nc.seq).to.equal(3)
    expect(nc.ack).to.equal(1)

    nc.send(buf.slice(0));
    expect(nc.seq).to.equal(4)
    expect(nc.ack).to.equal(1)

    msg = nc.encode()

    called = 0;
    nc.decode(msg)
    expect(nc.seq).to.equal(4)
    expect(nc.ack).to.equal(3)
    expect(called).to.equal(2)

    called = 0;
    nc.decode(msg)
    expect(nc.seq).to.equal(4)
    expect(nc.ack).to.equal(3)
    expect(called).to.equal(0)

    called = 0;
    nc.decode(msg)
    expect(nc.seq).to.equal(4)
    expect(nc.ack).to.equal(3)
    expect(called).to.equal(0)

    msg = nc.encode()
    expect(nc.seq).to.equal(4)
    expect(nc.ack).to.equal(3)

    nc.send(buf.slice(0));
    expect(nc.seq).to.equal(5)
    expect(nc.ack).to.equal(3)

    called = 0;
    nc.decode(msg)
    expect(nc.seq).to.equal(5)
    expect(nc.ack).to.equal(3)
    expect(called).to.equal(0)

    msg = nc.encode()
    expect(nc.seq).to.equal(5)
    expect(nc.ack).to.equal(3)

    called = 0;
    nc.decode(msg)
    expect(nc.seq).to.equal(5)
    expect(nc.ack).to.equal(4)
    expect(called).to.equal(1)
  })

})