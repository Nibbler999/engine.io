
/**
 * Module dependencies.
 */

var Transport = require('../transport');
var parser = require('engine.io-parser');
var util = require('util');
var debug = require('debug')('engine:tcp');

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

  this.conn.on('data', this.handleData.bind(this));
  this.conn.on('error', this.onError.bind(this));
  this.conn.on('end', this.onClose.bind(this));

  this.writable = true;

  this.draincb = this.drain.bind(this);
  this.encodePacketcb = this.encodePacket.bind(this);
}

/**
 * Inherits from Transport.
 */

util.inherits(Tcp, Transport);

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
 * Writes a packet payload.
 *
 * @param {Array} packets
 * @api private
 */

Tcp.prototype.send = function (packets) {
  this.writable = false;
  packets.forEach(this.writePacket, this);
};

Tcp.prototype.writePacket = function (packet) {
  parser.encodePacket(packet, this.supportsBinary, this.encodePacketcb);
};

Tcp.prototype.encodePacket = function (data) {
  debug('writing "%o"', data);
  this.conn.send(data, this.draincb);
};

Tcp.prototype.drain = function () {
  this.writable = true;
  this.emit('drain');
};

Tcp.prototype.handleData = function (data) {
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
