
/**
 * Module dependencies.
 */

var Transport = require('../transport')
  , parser = require('engine.io-parser')
  , debug = require('debug')('engine:tcp')

var types = {
  string: new Buffer([0]),
  buffer: new Buffer([1])
};

/**
 * Export the constructor.
 */

module.exports = Tcp;

/**
 * Tcp transport 
 *
 * @param {http.ServerRequest}
 * @api public
 */

function Tcp (req) {
  Transport.call(this, req);

  if (!req.websocket) {
    throw new Error('No socket');
  }

  this.conn = req.websocket;
  this.writable = true;

  this.draincb = this.drain.bind(this);
  this.encodePacketcb = this.encodePacket.bind(this);
};

/**
 * Inherits from Transport.
 */

Tcp.prototype.__proto__ = Transport.prototype;

/**
 * Transport name
 *
 * @api public
 */

Tcp.prototype.name = 'tcp';

/**
 * Advertise upgrade support.
 *
 * @api public
 */

Tcp.prototype.handlesUpgrades = true;

/**
 * Advertise framing support.
 *
 * @api public
 */

Tcp.prototype.supportsFraming = true;

/**
 * Set up new connection
 *
 * @param {http.ServerRequest}
 * @api public
 */

Tcp.prototype.onRequest = function (req) {
  this.conn.on('data', this.handleData.bind(this));
  this.conn.on('error', this.onError.bind(this));
  this.conn.on('end', this.onClose.bind(this));
};

/**
 * Writes a packet payload.
 *
 * @param {Array} packets
 * @api private
 */

Tcp.prototype.send = function(packets){
  this.writable = false;
  packets.forEach(this.writePacket, this);
};

Tcp.prototype.writePacket = function (packet) {
  parser.encodePacket(packet, this.supportsBinary, this.encodePacketcb);
};

Tcp.prototype.encodePacket = function (data) {

  var parts;

  if (typeof data === 'string') {
    parts = [types.string, new Buffer(data)];
  } else {
    parts = [types.buffer, data[0], data[1]];
  }

  debug('writing "%o"', parts);

  this.conn.writeMultipart(parts, this.draincb);
};

Tcp.prototype.drain = function () {
  this.writable = true;
  this.emit('drain');
};

Tcp.prototype.handleData = function (packet) {

  var data = packet.slice(1);

  if (packet[0] === 0) {
      data = data.toString();
  }

  this.onData(data);
};

/**
 * Closes the transport.
 *
 * @api private
 */

Tcp.prototype.doClose = function (fn) {
  debug('closing');
  this.conn.end();
  fn && fn();
};
