try {
var NetChannel = require('netchan');
} catch(e){
var NetChannel = require('./')
  , expect = require('expect.js');
}

function fakeDataChannel(){
  return {
    reliable: false,
    addEventListener: function(type,fn){this.callback = fn},
    dispatchEvent: function(type,msg){this.callback(msg)}
  }
}

describe('NetChannel',function(){

  describe('[1,2,3,4]',function(){
    var netchan
      , buffer
      , called = 0
      , msg;

    beforeEach(function(){ called = 0 })

    it('should create a NetChannel',function(){
      netchan = new NetChannel();
      expect(netchan.seq).to.equal(1)
      expect(netchan.ack).to.equal(0)

      netchan.onmessage = function(msg){
        // console.log('onmessage',msg)
        expect(msg).to.eql(new Uint8Array([1,2,3,4]).buffer)
        called++;
      }
    })

    it('should make a buffer with 1,2,3,4',function(){
      buffer = new Uint8Array([1,2,3,4]).buffer
    })

    it('should send that buffer and update the sequence',function(){
      netchan.send(buffer);
      expect(netchan.seq).to.equal(2)
      expect(netchan.ack).to.equal(0)
    })

    it('should have a buffer of the right size',function(){
      expect(netchan.bufferLength).to.equal((buffer.byteLength + 3))
    })

    it('should encode 1 message',function(){
      msg = netchan.encode();
    })

    it('should have a message of the right size',function(){
      // 2 = ack(2)
      // 3 = len(1) + seq(2)
      expect(msg.byteLength).to.equal(2+(buffer.byteLength + 3))
    })

    it('should validate the message',function(){
      var dat = new DataView(msg);
      expect(dat.getUint16(0)).to.equal(0) // ack
      expect(dat.getUint16(2)).to.equal(1) // seq (fails on node 0.9.7)
      expect(dat.getUint8(4)).to.equal(4)  // len
      expect(dat.getUint8(5)).to.equal(1)  // msg[0]
      expect(dat.getUint8(6)).to.equal(2)  // msg[1]
      expect(dat.getUint8(7)).to.equal(3)  // msg[2]
      expect(dat.getUint8(8)).to.equal(4)  // msg[3]
      expect(function(){ dat.getUint8(9) }).to.throwError(/Index out of range|IndexSizeError/)
    })

    it('should decode 1 message (ack += 1)',function(){
      netchan.decode(msg)
      expect(netchan.seq).to.equal(2)
      expect(netchan.ack).to.equal(1)
      expect(called).to.equal(1)
    })

    it('should have shrunk the buffer to 0',function(){
      expect(netchan.bufferLength).to.equal(0)
    })

    it('should send 2 messages',function(){
      netchan.send(buffer.slice(0)); // use copy of buffer
      expect(netchan.seq).to.equal(3)
      expect(netchan.ack).to.equal(1)

      netchan.send(buffer.slice(0)); // use copy of buffer
      expect(netchan.seq).to.equal(4)
      expect(netchan.ack).to.equal(1)
    })

    it('should have a buffer of the right size',function(){
      // 3 = len + seq
      // *3 = 3 messages (before ack we resend the first one)
      expect(netchan.bufferLength).to.equal((buffer.byteLength + 3)*2)
    })

    it('should encode 2 message',function(){
      msg = netchan.encode()
      expect(netchan.seq).to.equal(4)
      expect(netchan.ack).to.equal(1)
    })

    it('should have a message of the right size',function(){
      // 2 = ack
      // 3 = len + seq
      // *2 = 2 messages
      expect(msg.byteLength).to.equal(2+(buffer.byteLength + 3)*2)
    })

    it('should decode 2 messages (ack += 2)',function(){
      netchan.decode(msg)
      expect(netchan.seq).to.equal(4)
      expect(netchan.ack).to.equal(3)
      expect(called).to.equal(2)
    })

    it('should have a buffer be 0 after ack',function(){
      expect(netchan.bufferLength).to.equal(0)
    })

    it('should decode 0 messages the second time',function(){
      netchan.decode(msg)
      expect(netchan.seq).to.equal(4)
      expect(netchan.ack).to.equal(3)
      expect(called).to.equal(0)
    })
  })

  describe('nc1 <> nc2',function(){
    var nc1
      , nc2
      , rcv1 = 0
      , rcv2 = 0
      , msg;

    beforeEach(function(){ rcv1 = rcv2 = 0 })

    it('should create a NetChannel',function(){
      nc1 = new NetChannel();
      nc1.onmessage = function(m){ rcv1++; expect(m).to.eql(msg.slice(5)) }
      expect(nc1.seq).to.equal(1)
      expect(nc1.ack).to.equal(0)
    })


    it('should create another NetChannel',function(){
      nc2 = new NetChannel();
      nc2.onmessage = function(m){ rcv2++; expect(m).to.eql(msg.slice(5)) }
      expect(nc2.seq).to.equal(1)
      expect(nc2.ack).to.equal(0)
    })

    it('should send a message from 1 > 2',function(){
      var msg = new Uint8Array([5,4,255]);
      expect(msg.byteLength).to.equal(3);
      expect(msg[0]).to.equal(5);
      expect(msg[1]).to.equal(4);
      expect(msg[2]).to.equal(255);
      nc1.send(msg)
      expect(nc1.seq).to.equal(2)
      expect(nc1.ack).to.equal(0)
    })

    it('should have buffer size of 6',function(){
      expect(nc1.bufferLength).to.equal(6)
    })

    it('should encode nc1s buffer',function(){
      msg = nc1.encode()
      expect(nc1.seq).to.equal(2)
      expect(nc1.ack).to.equal(0)
      expect(msg.byteLength).to.equal(8)
    })

    it('should decode nc1s message in nc2 (nc2.ack += 1)',function(){
      nc2.decode(msg)
      expect(rcv1).to.equal(0)
      expect(rcv2).to.equal(1)
      expect(nc1.seq).to.equal(2)
      expect(nc1.ack).to.equal(0)
      expect(nc2.seq).to.equal(1)
      expect(nc2.ack).to.equal(1)
    })

    it('should send back a message from nc2 to nc1',function(){
      var msg = new Uint16Array([1,4,1024]);
      expect(msg.byteLength).to.equal(6);
      expect(msg[0]).to.equal(1);
      expect(msg[1]).to.equal(4);
      expect(msg[2]).to.equal(1024);
      nc2.send(msg)
      expect(nc2.seq).to.equal(2)
      expect(nc2.ack).to.equal(1)
    })

    it('should encode nc2s buffer',function(){
      msg = nc2.encode()
      expect(nc2.seq).to.equal(2)
      expect(nc2.ack).to.equal(1)
      expect(msg.byteLength).to.equal(11)
    })

    it('should decode nc2s message in nc1 (nc1.ack += 1)',function(){
      nc1.decode(msg)
      expect(rcv2).to.equal(0)
      expect(rcv1).to.equal(1)
      expect(nc1.seq).to.equal(2)
      expect(nc1.ack).to.equal(1)
      expect(nc2.seq).to.equal(2)
      expect(nc2.ack).to.equal(1)
    })

  })


  // TODO make a test which uses a fake data channel

  // TODO make a test verifying the order of messages


})