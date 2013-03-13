try {
// browser
var NetChannel = require('netchan')
  , base64 = require('publicclass-base64-arraybuffer');

} catch(e){
// node
var NetChannel = require('../')
  , base64 = require('base64-arraybuffer')
  , expect = require('expect.js');
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

    it('should fail to send a message longer than 255 bytes',function(){
      var msg = new Uint8Array(256);
      expect(msg.byteLength).to.equal(256);
      expect(function(){ netchan.send(msg) }).to.throwError(/invalid message length/)
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
      expect(netchan.buffer).to.have.length(2)
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
      expect(function(){ dat.getUint8(9) }).to.throwError(/out of range|IndexSizeError/)
    })

    it('should decode 1 message (ack += 1)',function(){
      netchan.decode(msg)
      expect(netchan.seq).to.equal(2)
      expect(netchan.ack).to.equal(1)
      expect(called).to.equal(1)
    })

    it('should not have shrunk the buffer (ack was 0)',function(){
      expect(netchan.buffer).to.have.length(2) // 1 msg
      expect(netchan.bufferLength).to.equal((buffer.byteLength + 3))
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
      expect(netchan.buffer).to.have.length(6) // 3 msgs
      expect(netchan.bufferLength).to.equal((buffer.byteLength + 3)*3)
    })

    it('should encode 2 message',function(){
      msg = netchan.encode()
      expect(netchan.seq).to.equal(4)
      expect(netchan.ack).to.equal(1)
    })

    it('should have a message of the right size',function(){
      // 2 = ack
      // 3 = len + seq
      // *3 = 3 messages
      expect(msg.byteLength).to.equal(2+(buffer.byteLength + 3)*3)
    })

    it('should decode 2 messages (ack += 2)',function(){
      netchan.decode(msg)
      expect(netchan.seq).to.equal(4)
      expect(netchan.ack).to.equal(3)
      expect(called).to.equal(2)
    })

    it('should have shrunk the buffer by 1 message',function(){
      // 3 = len + seq
      // *2 = 2 messages (before ack we resend the first one)
      expect(netchan.buffer).to.have.length(4) // 2 msgs
      expect(netchan.bufferLength).to.equal((buffer.byteLength + 3)*2)
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

  describe('Mock DataChannel',function(){
    var nc1;
    var nc2;
    var dc1;
    var dc2;

    describe('sanity dc',function(){

      before(function(){
        dc1 = new MockDataChannel();
        dc2 = new MockDataChannel(dc1);
        dc1.peer = dc2;
      })

      after(function(){
        dc1 = dc1.onmessage = null;
        dc1 = dc2.onmessage = null;
      })

      it('should send message from dc1 to dc2',function(done){
        dc2.onmessage = function(e){
          expect(e).to.have.property('data','1')
          done()
        }
        dc1.send('1')
      })

      it('should send message from dc2 to dc1',function(done){
        dc1.onmessage = function(e){
          expect(e).to.have.property('data','2')
          done()
        }
        dc2.send('2')
      })

    })

    describe('sanity nc',function(){

      before(function(){
        dc1 = new MockDataChannel();
        dc2 = new MockDataChannel(dc1);
        dc1.peer = dc2;

        nc1 = new NetChannel(dc1)
        nc2 = new NetChannel(dc2)
      })

      it('should send a message from nc1 to nc2',function(done){
        nc2.onmessage = function(m){
          expect(new Uint8Array(m)).to.eql(new Uint8Array([1]))
          done()
        }
        nc1.send(new Uint8Array([1]))
      })

      it('should send a message from nc2 to nc1',function(done){
        nc1.onmessage = function(m){
          expect(new Uint8Array(m)).to.eql(new Uint8Array([2]))
          done()
        }
        nc2.send(new Uint8Array([2]))
      })
    })

    describe('ack nc',function(){

      before(function(){
        dc1 = new MockDataChannel();
        dc2 = new MockDataChannel(dc1);
        dc1.peer = dc2;

        nc1 = new NetChannel(dc1)
        nc2 = new NetChannel(dc2)
      })

      it('should receive an "ack"',function(done){
        nc1.onmessage = function(m){
          expect(new Uint8Array(m)).to.eql(new Uint8Array([3]))
          expect(nc2).to.have.property('bufferLength',4)
          expect(nc2).to.have.property('ack',0)
          expect(nc1).to.have.property('bufferLength',0)
          expect(nc1).to.have.property('ack',0)
          this.send(new Uint8Array([4]))
          expect(nc1).to.have.property('bufferLength',4)
        }
        nc2.onmessage = function(m){
          expect(new Uint8Array(m)).to.eql(new Uint8Array([4]))
          expect(nc1).to.have.property('ack',1)
          expect(nc1).to.have.property('bufferLength',4)
          expect(nc2).to.have.property('ack',0)
          expect(nc2).to.have.property('bufferLength',4)
          done()
        }
        nc2.send(new Uint8Array([3]))
        // it won't clear the buffer until ACK
        expect(nc2).to.have.property('bufferLength',4)
      })

      it('should receive multiple messages in order',function(done){
        var recv = 10;
        nc1.onmessage = function(m){
          expect(new Uint8Array(m)).to.eql(new Uint8Array([recv]))
          --recv || done()
        }
        for(var i=recv; i>= 0; i--)
          nc2.send(new Uint8Array([i]))
      })

    })
  })

  // skip real data channels when testing through node
  if( typeof window == 'undefined' ){
    return;
  }

  describe('Real DataChannel',function(){

    describe('sanity data channel',function(){

      var dc1;
      var dc2;

      before(function(done){
        createDataChannels(function(ch1,ch2){
          dc1 = ch1;
          dc2 = ch2;
          done()
        })
      })

      it('should have created channels',function(){
        expect(dc1).to.exist
        expect(dc2).to.exist
      })

      it('should send a string dc1 > dc2',function(done){
        dc2.onmessage = function(e){
          expect(e).to.have.property('data','hello')
          done()
        }
        dc1.send('hello')
      })

      it('should send many strings dc1 > dc2',function(done){
        var recv = 100;
        dc1.onmessage = function(e){
          expect(e).to.have.property('data',''+recv)
          --recv || done()
        }
        for(var i=recv; i>= 0; i--)
          dc2.send(i)
      })

      // NOTE: this is expected to fail for now, but
      //       it will help to find out when binary
      //       is finally supported.
      it('should throw when sending binary',function(){
        expect(function(){
          dc1.send(new Uint8Array([1]))
        }).to.throwError(/SyntaxError: DOM Exception 12/)
      })

      it.skip('should send binary dc1 > dc2',function(done){
        dc2.onmessage = function(e){
          expect(e).to.have.property('data',new Uint8Array([1]))
          done()
        }
        dc1.send(new Uint8Array([1]))
      })

    })

    describe('using netchannel',function(){
      var dc1;
      var dc2;
      var nc1;
      var nc2;

      before(function(done){
        createDataChannels(function(ch1,ch2){
          dc1 = ch1;
          dc2 = ch2;
          nc1 = new NetChannel(dc1);
          nc2 = new NetChannel(dc2);
          done()
        })
      })

      it('should have created channels',function(){
        expect(dc1).to.exist
        expect(dc2).to.exist
        expect(nc1).to.exist
        expect(nc2).to.exist
      })

      it('should wrap the netchannels with base64',function(){
        wrapWithBase64(nc1)
        wrapWithBase64(nc2)
      })

      it('should send a message nc1 > nc2',function(done){
        nc2.onmessage = function(m){
          expect(new Uint8Array(m)).to.eql(new Uint8Array([1,2,3,4]))
          done()
        }
        nc1.send(new Uint8Array([1,2,3,4]))
      })

      it('should be able to send many messages nc1 > nc2',function(done){
        var recv = 30;
        nc1.onmessage = function(m){
          expect(new Uint8Array(m)).to.eql(new Uint8Array([recv]))
          --recv || done()
        }
        for(var i=recv; i>= 0; i--)
          nc2.send(new Uint8Array([i]))
      })

      it('should be able to send many messages nc2 > nc1 manual flush',function(done){
        var recv = 30;
        nc2.onmessage = function(m){
          expect(new Uint8Array(m)).to.eql(new Uint8Array([recv]))
          --recv || done()
        }
        nc1.autoFlush = false;
        for(var i=recv; i >= 0; i--)
          nc1.send(new Uint8Array([i]))
        nc1.flush();
        nc1.autoFlush = true;
      })

    })

  })
})


function createDataChannels(fn){
  var PeerConnection = window.mozRTCPeerConnection // mozilla is dumb
                    || window.RTCPeerConnection
                    || window.webkitRTCPeerConnection;

  var pc1 = new PeerConnection(null,{optional:[{RtpDataChannels: true}]});
  var pc2 = new PeerConnection(null,{optional:[{RtpDataChannels: true}]});

  // doesn't work on firefox yet. i believe the pc must be opened first
  var ch1 = pc1.createDataChannel('netchan',{reliable:false})
  var ch2;
  ch1.onopen = open;
  pc1.onicecandidate = function(e){ e.candidate && pc2.addIceCandidate(e.candidate) }
  pc2.onicecandidate = function(e){ e.candidate && pc1.addIceCandidate(e.candidate) }
  pc2.ondatachannel = function(e){ ch2 = e.channel; ch2.onopen = open };
  pc1.createOffer(function(desc){
    pc1.setLocalDescription(desc);
    pc2.setRemoteDescription(desc);
    pc2.createAnswer(function(desc){
      pc2.setLocalDescription(desc);
      pc1.setRemoteDescription(desc);
    })
  })
  var pending = 2;
  function open(){ --pending || fn(ch1,ch2) }
}


// since data channels don't support binary yet
// we encode the messages as base64
function wrapWithBase64(netchan){
  var _recv = netchan.recv;
  netchan.recv = function(e){
    // MessageEvent#data is not writable
    var m = new MessageEvent('message',{
      data: base64.decode(e.data),
      origin: e.origin,
      lastEventId: e.lastEventId,
      source: e.source,
      ports: e.ports
    })
    return _recv.call(this,m);
  }
  var _send = netchan.channel.send;
  netchan.channel.send = function(msg){
    if( typeof msg != 'string' )
      msg = base64.encode(msg);
    if( msg.length > 1168 )
      console.error('will no send as it will most likely not arrive when msg > 1168 bytes');
    else
      return _send.call(this,msg);
  }
}

function MockDataChannel(peer){
  this.peer = peer;
  this.reliable = false;
  this.callbacks = {};

  this.addEventListener = function(type,fn){
    this.callbacks[type] = this.callbacks[type] || []
    this.callbacks[type].push(fn)
  }
  this.dispatchEvent = function(type,e){
    if( typeof this['on'+type] == 'function' )
      this['on'+type](e);
    if( this.callbacks[type] ){
      for(var i=0; i<this.callbacks[type].length; i++)
        this.callbacks[type][i](e)
    }
  }
  this.send = function(msg){
    var peer = this.peer;
    var evt = {data: msg};
    setTimeout(function(){ peer.dispatchEvent('message',evt) },0);
  }
  this.onmessage = function(evt){}
}


function buf(str){
  var buffer = new ArrayBuffer(str.length);
  var bytes = new Uint8Array(buffer);
  for(var i=0; i < str.length; i++)
    bytes[i] = str.charCodeAt(i);
  return buffer;
}

function str(buf){
  var string = '';
  var bytes = new Uint8Array(buf);
  for(var i=0; i < bytes.length; i++)
    string += String.fromCharCode(bytes[i]);
  return string;
}