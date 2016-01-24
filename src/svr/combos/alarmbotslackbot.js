"use strict"

const EventEmitter = require("events");
const BotKit = require("botkit");
const Bunyan = require("bunyan");

/**
 * A combo that acts as a slackbot that can...
 *
 * a) generate commands for arming/disarming.
 * b) notify of tamper/movement.
 * c) notify alarm state.
 *
 * Some of this stuff has been wired up to raw events for now. Eventually
 * these raw events will be moderated by the alarm which will only publish
 * appropriately filtered events based on armed/disarmed state and
 * correct tamper zones.
 */
module.exports = function(config) {
    const me = this;
    const log = Bunyan.createLogger({ name: "AlarmBot"})

    // TODO: Move to config file
    if (!process.env.ALARM_BOT_TOKEN) {
        log.error("ALARM_BOT_TOKEN environment variable missing.");
        process.exit(1);
    }

    this.emitter = new EventEmitter();
    this.interestedIn = interestedIn;
    this.notify = notify;
    this.start = start;
    this.stop = stop;

    const alarmBotToken = process.env.ALARM_BOT_TOKEN

    let initialized = false;

    const channels = {
        alarmControlChannel: { name: "inandout" },
        tamperNotificationChannel: { name: "fiddling" },
        movementNotificationChannel: { name: "shakeitallabout" },
        alarmNotificationChannel: { name: "allhandsondeck" },
    };

    const users = { }

    const notificationHandlers = {
        "tamper-start": tamperStart,
        "tamper-end": tamperEnd,
        "movement-start": movementStart,
        "movement-end": movementEnd
    };

    const botBits = initialize();

    function start() {
        return  {
            state: "started",
            emitter: me.emitter,
        };
    }

    function stop() {
        if (initialized) {
            log.info("Stopping...");
            botBits.bot.closeRTM();
            initialized = false;
            log.info("Stopped");
        }
    }

    function initialize() {
        // Initiate the slackbot.
        log.info("Initiating Alarmbot with Token '" + alarmBotToken + "'");

        const controller = BotKit.slackbot();
        const alarmbot = controller.spawn({
            token: alarmBotToken
        }).startRTM(function(err, bot, payload) {
            if (err) {
                log.info("Could not connect to RTM", err);
            } else {
                log.info("Connected to slack!");
                log.info(payload);

                // allocate channel metadata from the payload into our internal representation.
                payload.channels.forEach(function(channel) {
                    for (const localChannelProxyName in channels) {
                        const localChannel = channels[localChannelProxyName];
                        if (localChannel.name === channel.name) {
                            localChannel.id = channel.id;
                       }
                    }
                });
                log.info("Local Channel Config Complete", channels);

                payload.users.forEach(function(user) {
                    users[user.id] = user.name
                });
                log.info("Local User Complete", users);
                // TODO(allanmar): watch for new user messages and auto-register new users.

                startHearing(controller);
                setTimeout(function() {
                    log.info("Sending Welcome Message to Alarm Control Channel");
                    botSend(channels.alarmControlChannel, "I have started monitoring the house. Type 'help' for help.");
                }, 5000);

                initialized = true;
            }
        });

        return { controller: controller, bot: alarmbot };
    }

    function startHearing(controller) {
        const eventTypes = [ "ambient", "direct_message", "mention", "direct_mention" ];

        controller.hears("entered", eventTypes, someoneArrived);
        controller.hears("exited", eventTypes, someoneLeft);
        controller.hears("disarm now", eventTypes, disarmNow);
        controller.hears("arm now", eventTypes, armNow);
        controller.hears("help", eventTypes, showHelp);
        // controller.on("direct_message", function(bot, message) {
        //     log.info("Received Message", message);
        // });
    }

    /**
     * Emits the arm message
     */
    function someoneArrived(bot, message) {
        if (message.channel === channels.alarmControlChannel.id) {
            log.info("Someone Arrived Home.", "From " + users[message.user]);
            log.info(message);
            me.emitter.emit("arrival", { command: "arrival", who: "alarmbot" });
            bot.reply(message, "Good to see you home.");// + message.match[1] + ".");
        }
    }

    /**
     * Emits the disarm message.
     */
    function someoneLeft(bot, message) {
        if (message.channel === channels.alarmControlChannel.id) {
            log.info("Someone Left Home.", "From " + users[message.user]);
            log.info(message);
            me.emitter.emit("departure", { command: "departure", who: "alarmbot" });
            bot.reply(message, "Have a nice adventure.");// + message.match[1] + "! Come back soon.");
        }
    }

    /**
     * Emits the arm message
     */
    function armNow(bot, message) {
        if (message.channel === channels.alarmControlChannel.id) {
            log.info("Request to arm immediately received.", "From " + users[message.user]);
            me.emitter.emit("arm", { command: "arm-immediate", who: "alarmbot" });
            bot.reply(message, "Alarm has been armed successfully.");
        }
    }

    /**
     * Emits the disarm message.
     */
    function disarmNow(bot, message) {
        if (message.channel === channels.alarmControlChannel.id) {
            log.info("Request to disarm immediately received.", "From " + users[message.user]);
            me.emitter.emit("disarm", { command: "disarm-immediate", who: "alarmbot" });
            bot.reply(message, "Alarm has been disarmed successfully.");
        }
    }

    /**
     * Tell them what I can do.
     */
    function showHelp(bot, message) {
        if (message.channel === channels.alarmControlChannel.id) {
            log.info("Request to show help received.", "Received from" + users[message.user]);
            bot.reply(message, "I am keeping an eye on when you come and go and will automatically arm the alarm when everyone leaves.");
            bot.reply(message, "I can also respond to a number of different commands.");
            bot.reply(message, "'arm now' Immediately arms the alarm.");
            bot.reply(message, "'disarm now' Immediately disarms the alarm.");
            bot.reply(message, "'help' Shows this help screen.");
        }
    }

    /**
     * Defines what events we are interested in knowing about.
     */
    function interestedIn() {
        return [ "tamper", "movement" ];
    }

    /**
     * Dispatches event notifications to handlers.
     */
    function notify(event) {
        const handler = notificationHandlers[event.event];
        if (handler) {
            handler(event);
        }
    }

    function tamperStart(event) {
        log.info("Sending Tamper Start Notification");
        botSend(channels.tamperNotificationChannel, "Tamper detected in the " + event.zone);
    }

    function tamperEnd(event) {
        log.info("Sending Tamper End Notification");
        botSend(channels.tamperNotificationChannel, "Tamper event ended in the " + event.zone);
    }

    function movementStart(event) {
        log.info("Sending Movement Start Notification");
        botSend(channels.movementNotificationChannel, "Movement detected in the " + event.zone);
    }

    function movementEnd(event) {
        log.info("Sending Movement End Notification");
        botSend(channels.movementNotificationChannel, "Movement has stopped in the " + event.zone);
    }

    function botSend(channel, message) {
        if (initialized) {
            botBits.bot.say({
               channel: channel.id,
               text: message
            });
        } else {
            // TODO(mark): Buffer messages in memory until they can be dispatched.
            log.info("No connection to slack - message dropped!");
        }
    }
}