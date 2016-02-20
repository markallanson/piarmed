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

    const alarmBotToken = process.env.ALARM_BOT_TOKEN;

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
        "movement-end": movementEnd,
        "zone-report": zoneReportReceived,
        "alarm-armed": alarmArmed,
        "alarm-disarmed": alarmDisarmed,
        "alarm-alert-start": alarmAlertStart,
        "alarm-alert-end": alarmAlertEnd,
        "shutdown": stop
    };

    const commands = [
        { trigger: "disarm", handler: disarmNow, help: "Immediately Disarms the alarm." },
        { trigger: "arm now", handler: armNow, help: "Immediately Arms the alarm." },
        { trigger: "Everyone is Away", handler: everyoneLeft },
        { trigger: "Someone is Home", handler: someoneArrived },
        { trigger: "zone report", handler: requestZoneReport, help: "Reports on the status of all zones." },
        { trigger: "help", handler: showHelp }
    ];

    const botBits = initialize();

    function start() {
        return  {
            state: "started",
            emitter: me.emitter,
        };
    }

    function stop() {
        if (initialized) {
            botSend(channels.alarmControlChannel, "I am shutting down so you will no longer receive notifications of alarm conditions.");
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
                    botSend(channels.alarmControlChannel, "I have started monitoring the house. Type '@alarmbot help' for help.");
                }, 5000);

                initialized = true;
            }
        });

        return { controller: controller, bot: alarmbot };
    }

    function startHearing(controller) {
        const eventTypes = [ "ambient", "direct_message", "mention", "direct_mention" ];

        // register all the commands for activation from human users or bots
        for (const command of commands) {
            log.info("Registering Command:", command);
            controller.hears(command.trigger, eventTypes, command.handler);
            controller.on("bot_message", function(bot, message) { dispatchBotCommand(bot, message, command);  });
        }
    }

    /** Dispatch messages to their matching handlers. */
    function dispatchBotCommand(bot, message, command) {
        log.info("Processing bot message...", message);
        if (message.type === "message" && message.attachments.length > 0) {
            let messageText = message.attachments[0].text;
            if (!messageText) {
                messageText = message.attachments[0].pretext;
            }
            if (!messageText) {
                messageText = message.attachments[0].fallback;
            }
            if (messageText && messageText.toLowerCase().indexOf(command.trigger.toLowerCase()) !== -1) {
                command.handler(bot, message);
            }
        }
    }

    /**
     * Requests a Zone Report.
     */
    function requestZoneReport() {
        me.emitter.emit("zone", { event: "zone-report-request", source: "alarmbot" });
    }

    /**
     * Emits a presence message indicating someone has arrived at the facility being monitored.
     */
    function someoneArrived(bot, message) {
        if (message.channel === channels.alarmControlChannel.id) {
            log.info("Someone Arrived Home.", "From " + users[message.user]);
            me.emitter.emit("presence", { event: "presence-present", who: "alarmbot" });
            bot.reply(message, "Good to see you home.");// + message.match[1] + ".");
        }
    }

    /**
     * Emits a presence indicator indicating no one is in the facility being monitored
     */
    function everyoneLeft(bot, message) {
        if (message.channel === channels.alarmControlChannel.id) {
            log.info("Someone Left Home.", "From " + users[message.user]);
            me.emitter.emit("presence", { event: "presence-absent", who: "alarmbot" });
            bot.reply(message, "Have a nice adventure.");// + message.match[1] + "! Come back soon.");
        }
    }

    /**
     * Emits the arm message
     */
    function armNow(bot, message) {
        if (message.channel === channels.alarmControlChannel.id) {
            log.info("Request to arm immediately received.", "From " + users[message.user]);
            me.emitter.emit("alarm", { event: "alarm-arm-manual", who: users[message.user] });
        }
    }

    /**
     * Emits the disarm message.
     */
    function disarmNow(bot, message) {
        if (message.channel === channels.alarmControlChannel.id) {
            log.info("Request to disarm immediately received.", "From " + users[message.user]);
            me.emitter.emit("alarm", { event: "alarm-disarm-manual", who: users[message.user] });
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
            for (const command of commands.filter(function(c) { return c.help })) {
                bot.reply(message, command.trigger + ": " + command.help);
            }
        }
    }

    /**
     * Defines what events we are interested in knowing about.
     */
    function interestedIn() {
        return [ "tamper", "movement", "zone", "alarm", "shutdown" ];
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
        botSend(channels.tamperNotificationChannel, "Tamper started: " + event.zone);
    }

    function tamperEnd(event) {
        log.info("Sending Tamper End Notification");
        botSend(channels.tamperNotificationChannel, "Tamper ended:" + event.zone);
    }

    function movementStart(event) {
        log.info("Sending Movement Start Notification");
        botSend(channels.movementNotificationChannel, "Movement started: " + event.zone);
    }

    function movementEnd(event) {
        log.info("Sending Movement End Notification");
        botSend(channels.movementNotificationChannel, "Movement ended: " + event.zone);
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

    /**
     * Transmits a zone report to the channel if we are the target of the report.
     */
    function zoneReportReceived(event) {
        if (event.target === "alarmbot") {
            for (let reportLine of event.report) {
                botSend(channels.alarmControlChannel, reportLine);
            }
        }
    }

    function alarmArmed(event) {
        log.info("sending armed message");
        botSend(channels.alarmControlChannel, "Armed: " + event.reason);
    }

    function alarmDisarmed(event) {
        botSend(channels.alarmControlChannel, "Disarmed: " + event.reason);
    }

    function alarmAlertStart(event) {
        botSend(channels.alarmNotificationChannel, "Intrusion Detected in Zone " + event.triggerZone);
    }

    function alarmAlertEnd(event) {
        botSend(channels.alarmNotificationChannel, "Intrusion Ended because " + event.reason);
    }
}
