"use strict";

let Server = require('./server');
const Alarm = require('./alarm');

const Mcp23017 = require('./ics/mcptwothreezerooneseven.js');

const InputFilter = require('./data/inputfilter.js');
const Mcp23017InAdaptor = require('./data/mcptwothreezerooneseveninadaptor.js');

const GenericPirGenerator = require('./generator/genericpir.js');

const IftttMakerNotifier = require('./notifiers/iftttmaker.js');
const LoggerNotifier = require('./notifiers/logger.js');

const ioExpander1 = new Mcp23017({
   bus: 1, // 1 for 2/B+/A+/Zero 0 for Model B/A
   address: 0x20,
   pins: [
       { id: 1, pullup: true, direction: "in" },
       { id: 2, pullup: true, direction: "in" },
   ],
   pollInterval: 10,
});

const alarm = new Alarm({
    generators: [
        new GenericPirGenerator({
            zone: 'Office',
            tamper: {
                dataAdaptor: new InputFilter({
                    sampleSize: 10,
                    dataAdaptor: new Mcp23017InAdaptor({
                        mcp23017: ioExpander1,
                        pin: 1,
                    })
                }),
                mode: 'no'
            },
            movement: {
                dataAdaptor: new InputFilter({
                    sampleSize: 10,
                    dataAdaptor: new Mcp23017InAdaptor({
                        mcp23017: ioExpander1,
                        pin: 2,
                    })
                }),
                mode: 'no'
            }
         })
    ],
    notifiers: [
        //new IftttMakerNotifier({}),
        new LoggerNotifier({ interestedIn: ['tamper', 'movement'] })
    ]
});
let alarmEmitter = alarm.start();

const server = new Server({ port: 8888 });
server.start();
