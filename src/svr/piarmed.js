"use strict";

let Server = require('./server');
let Alarm = require('./alarm');

let PinInAdaptor = require('./data/pininadaptor.js');

let GenericPirGenerator = require('./generator/genericpir.js');

let IftttMakerNotifier = require('./notifiers/iftttmaker.js');
let LoggerNotifier = require('./notifiers/logger.js');

const alarm = new Alarm({
    generators: [
        new GenericPirGenerator({
            tamperDataAdaptor: new PinInAdaptor({
                gpio: 9,
                mode: 'interrupt'
            }),
            zone: 'Office',
            tamper: {
                mode: 'nc'
            }
         })
    ],
    notifiers: [
        //new IftttMakerNotifier({}),
        new LoggerNotifier({})
    ]
});
let alarmEmitter = alarm.start();

const server = new Server({ port: 8888 });
server.start();
