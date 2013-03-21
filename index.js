
module.exports = NetChannel;

/**
 * NetChannel wraps an unreliable DataChannel
 * with a sequence and an ack.
 *
 * When a message is received it checks the ack against
 * the messages buffer and the ones "acknowledged" will
 * be removed from the buffer and the rest will be resent.
 *
 * After sending and the buffer is not empty after a timeout
 * it will try to send again until it is.
 *
 * Inspired by NetChan by Id software.
 */

function NetChannel(channel,opts){
  this.seq = 1;
  this.ack = 0;
  this.buffer = []; // [seq,buf]
  this.bufferLength = 0;
  this.encoded = null; // cached

  this.options = opts || {}

  channel && this.setChannel(channel)
}

NetChannel.prototype = {

  onmessage: noop,

  setChannel: function(channel){
    if( channel.reliable )
      throw new ArgumentError('channel must be unreliable. just use the normal data channel instead.')
    var netchan = this;
    this.channel = channel;
    this.channel.addEventListener('message',function(e){ netchan.recv(e) },false)
  },

  recv: function(e){
    this.decode(e.data)
    this.flush()
  },

  send: function(msg){
    // accept any TypedArray
    if( msg && (msg.buffer instanceof ArrayBuffer) ){
      msg = msg.buffer;
    }

    if( !(msg instanceof ArrayBuffer) ){
      throw new Error('invalid message type, only binary is supported');
    }

    if( msg.byteLength > 255 ){
      throw new Error('invalid message length, only up to 256 bytes are supported')
    }

    // grow by 3 bytes (seq & len)
    var seq = this.seq++;
    var buf = new Uint8Array(3+msg.byteLength);
    var dat = new DataView(buf.buffer);
    dat.setUint16(0,seq);
    dat.setUint8(2,msg.byteLength);
    buf.set(new Uint8Array(msg),3);

    this.bufferLength += buf.byteLength;
    this.buffer.push(seq,buf);
    this.encoded = null;

    this.flush();
  },

  flush: function(){
    if( this.bufferLength && this.channel ){
      this.channel.send(this.encoded || this.encode());
    }

    // try again every 50ms
    if( this.options.resend ){
      clearTimeout(this.timeout)
      this.timeout = setTimeout(this.flush.bind(this),this.options.resend)
    }
  },

  // encodes into a message like this:
  // ack,seq1,len1,data1[,seq2,len2,data2...]
  encode: function(){
    // grow by 2 bytes (ack) + unsent buffer
    var buf = new Uint8Array(2+this.bufferLength);
    var data = new DataView(buf.buffer);

    // prepend with ack number
    data.setUint16(0,this.ack)

    // write all buffered messages
    var offset = 2;
    for(var i=1; i < this.buffer.length; i+=2){
      var msg = this.buffer[i];
      buf.set(msg,offset);
      offset += msg.byteLength;
    }
    return this.encoded = buf.buffer;
  },

  // decodes from a message like this:
  // ack,seq1,len1,data1[,seq2,len2,data2...]
  decode: function(buf){
    // read the sequence and ack
    var data = new DataView(buf.buffer || buf)
    var ack = data.getUint16(0)
    this.shrink(ack)

    // read messages
    var offset = 2 // start after ack
      , length = buf.byteLength
      , seq = this.ack // in case no messages are read, its the same
      , len = 0;

    while(offset < length){
      seq = data.getUint16(offset,false); // false is required for node test only
      len = data.getUint8(offset+2);
      if( seq <= this.ack ){
        offset += len+3; // len + seq = 3 bytes
        continue;
      }

      // get the message
      var msg = data.buffer.slice(offset+3,offset+3+len);
      offset += len+3;

      // emit onmessage for each message
      this.onmessage(msg)

      // store the sequence as the last acknowledged one
      this.ack = seq;
    }
  },

  // shrink the buffer & bufferLength up to the
  // acknowledged messages.
  // assumes this.buffer is sorted by sequence
  shrink: function(ack){
    var index = null
      , length = 0;
    for(var i=0; i < this.buffer.length; i+=2){
      var s = this.buffer[i];
      if( s <= ack ){
        index = i+2;
        length += this.buffer[i+1].byteLength;
      } else {
        break;
      }
    }
    if( index !== null ){
      this.buffer.splice(0,index);
      this.bufferLength -= length;
      this.encoded = null;
    }
  },

  toString: function(){
    return 'NetChannel\n\t' + [
      'seq: '+this.seq,
      'ack: '+this.ack,
      'buffer: '+this.buffer.length,
      'buffer size: '+this.bufferLength,
      'encoded: '+(this.encoded&&this.encoded.byteLength)
    ].join('\n\t')
  }

}

function noop(){}