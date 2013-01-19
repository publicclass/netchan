
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
 * It will also track the latency of the packets by keeping
 * a list of times when each sequence was sent and comparing
 * against that when that sequence has been acknowledged.
 *
 * Inspired by NetChan by Id software.
 */

function NetChannel(channel){
  this.seq = 1;
  this.ack = 0;
  this.buffer = []; // [seq,buf]
  this.bufferLength = 0;
  this.sequences = [];

  // optional (for testing)
  if( channel ){
    if( channel.reliable )
      throw new ArgumentError('channel must be unreliable. just use the normal data channel instead.')
    this.channel = channel;
    this.channel.addEventListener('message',this.recv.bind(this),false)
  }
}

NetChannel.prototype = {
  onmessage: function(){},

  recv: function(e){
    this.decode(e.data)

    // flush in case there's more non-acked messages
    // in buffer
    this.flush();
  },

  send: function(msg){
    // accept any TypedArray
    if( msg && (msg.buffer instanceof ArrayBuffer) )
      msg = msg.buffer;

    if( !msg.byteLength )
      throw new Error('invalid message type, only binary is supported');

    if( msg.byteLength > 256 )
      throw new Error('invalid message length, only up to 256 bytes are supported')

    // grow by 3 bytes (seq & len)
    var seq = this.seq++;
    var buf = new Uint8Array(3+msg.byteLength);
    var dat = new DataView(buf.buffer);
    dat.setUint16(0,seq);
    dat.setUint8(2,msg.byteLength);
    buf.set(new Uint8Array(msg),3);

    this.bufferLength += buf.byteLength;
    this.buffer.push(seq,buf);
    this.flush();
  },

  flush: function(){
    if( this.bufferLength && this.channel )
      this.channel.send(this.encode());
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
    return buf.buffer;
  },

  // decodes from a message like this:
  // ack,seq1,len1,data1[,seq2,len2,data2...]
  decode: function(buf){
    // read the sequence and ack
    var data = new DataView(buf.buffer || buf)
    var ack = data.getUint16(0,true)

    // read messages
    var offset = 2 // start after ack
      , length = buf.byteLength
      , seq = this.ack // in case no messages are read, its the same
      , len = 0;

    console.log(buf)

    while(offset < length){
      seq = data.getUint16(offset);
      len = data.getUint8(offset+2);
      if( seq <= this.ack ){
        // console.log('skipping message %s, already acknowledged %s',seq,this.ack)
        offset += len+3;
        continue;
      }

      // get the message
      var msg = data.buffer.slice(offset+3,offset+3+len);

      // emit onmessage for each message
      this.onmessage(msg)

      offset += len+3;
    }

    // store the sequence as the last acknowledged one
    this.ack = seq;

    // shrink the buffer & bufferLength up to the
    // acknowledged messages.
    var rm = 0
      , rmLength = 0;
    for(var i=0; i < this.buffer.length; i+=2){
      if(this.buffer[i] <= this.ack){
        rm = i;
        rmLength += this.buffer[i+1].byteLength;
      }
    }
    if( rm ){
      this.buffer.splice(0,rm+2);
      this.bufferLength -= rmLength;
    }
  }
}
