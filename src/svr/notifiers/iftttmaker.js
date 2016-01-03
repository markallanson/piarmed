"use strict"

const https = require('https');
const querystring = require('querystring');

module.exports = function(config) {
    var me = this;

    this.config = config;
    this.config.host = 'maker.ifttt.com';
    this.config.path = '/trigger/orchard-alarm-on/with/key/l4Kentkmkxo0A-X4x0kfx-cJTowNnyE_QWSdfiIRzA3?';

    this.interestedIn = interestedIn;
    this.notify = notify;

    function interestedIn() {
        return [ 'alarmstate' ];
    }

    function notify(event) {
        let req = https.request({
            protocol: 'https:',
            host: me.config.host,
            path: me.config.path + querystring.stringify({value1: event.event, value2: event.zone}),
            method: 'GET'
        }, me.notified);
        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
        });
        req.end();

        console.info("IFTTT Maker Notifier, Notified of Alert. - ", event);
    }

    function notified(res) {

    }
}