﻿// TODO
// use gamepad manager
// provide gamepad axis binding selector

import { EmojiForm } from "./forms/EmojiForm.js";
import { InstructionsForm } from "./forms/InstructionsForm.js";
import { LoginForm } from "./forms/LoginForm.js";
import { OptionsForm } from "./forms/OptionsForm.js";
import { ToolBar } from "./forms/ToolBar.js";
import { Game } from "./Game.js";
import { GamepadManager } from "./gamepad/GamepadStateManager.js";
import { Settings } from "./Settings.js";
import { BaseJitsiClient } from "./jitsi/BaseJitsiClient.js";

/**
 * 
 * @param {string} host
 * @param {BaseJitsiClient} client
 */
export function init(host, client) {
    const settings = new Settings(),
        game = new Game(),
        login = new LoginForm(),
        toolbar = new ToolBar(),
        options = new OptionsForm(),
        emoji = new EmojiForm(),
        instructions = new InstructionsForm(),

        forExport = {
            settings,
            client,
            game,
            login,
            toolbar,
            options,
            emoji,
            instructions
        };

    for (let e of Object.values(forExport)) {
        if (e.element) {
            document.body.append(e.element);
        }
    }

    refreshGamepads();

    options.drawHearing = game.drawHearing = settings.drawHearing;
    options.audioDistanceMin = game.audioDistanceMin = settings.audioDistanceMin;
    options.audioDistanceMax = game.audioDistanceMax = settings.audioDistanceMax;
    options.audioRolloff = settings.audioRolloff;
    options.fontSize = game.fontSize = settings.fontSize;
    options.gamepadIndex = game.gamepadIndex = settings.gamepadIndex;
    options.inputBinding = game.inputBinding = settings.inputBinding;
    toolbar.zoom = game.cameraZ = game.targetCameraZ = settings.zoom;
    login.userName = settings.userName;
    login.roomName = settings.roomName;

    showLogin();

    function showLogin() {
        client.hide();
        game.hide();
        toolbar.hide();
        options.hide();
        emoji.hide();
        instructions.hide();
        login.show();
    }

    async function withEmojiSelection(callback) {
        if (!emoji.isOpen()) {
            toolbar.optionsButton.lock();
            toolbar.instructionsButton.lock();
            options.hide();
            instructions.hide();
            const e = await emoji.selectAsync();
            if (!!e) {
                callback(e);
            }
            toolbar.optionsButton.unlock();
            toolbar.instructionsButton.unlock();
        }
    }

    async function selectEmojiAsync() {
        await withEmojiSelection((e) => {
            game.emote(client.localUser, e);
            toolbar.setEmojiButton(settings.inputBinding.keyButtonEmote, e);
        });
    }

    function setAudioProperties() {
        client.setAudioProperties(
            window.location.origin,
            0.125,
            settings.audioDistanceMin = game.audioDistanceMin = options.audioDistanceMin,
            settings.audioDistanceMax = game.audioDistanceMax = options.audioDistanceMax,
            settings.audioRolloff = options.audioRolloff);
    }

    function refreshGamepads() {
        options.gamepads = GamepadManager.gamepads;
    }


    window.addEventListeners({
        resize: () => {
            game.resize(toolbar.offsetHeight);
            client.resize(toolbar.offsetHeight);
        },
        gamepadconnected: refreshGamepads,
        gamepaddisconnected: refreshGamepads
    });

    toolbar.addEventListeners({
        toggleAudio: () => {
            client.toggleAudioAsync();
        },
        selectEmoji: selectEmojiAsync,
        emote: () => {
            game.emote(client.localUser, game.currentEmoji);
        },
        zoomChanged: () => {
            settings.zoom = game.targetCameraZ = toolbar.zoom;
        },
        toggleOptions: () => {
            if (!emoji.isOpen()) {
                instructions.hide();
                options.toggleOpen();
            }
        },
        toggleInstructions: () => {
            if (!emoji.isOpen()) {
                options.hide();
                instructions.toggleOpen();
            }
        },
        tweet: () => {
            const message = encodeURIComponent(`Join my #TeleParty ${document.location.href}`),
                url = new URL("https://twitter.com/intent/tweet?text=" + message);
            open(url);
        },
        leave: () => {
            client.leave();
        },
        toggleUI: () => {
            game.setOpen(toolbar.visible);
            game.resize(toolbar.offsetHeight);
            client.resize(toolbar.offsetHeight);
        }
    });


    login.addEventListener("login", () => {
        client.startAudio();
        client.joinAsync(
            host,
            settings.roomName = login.roomName,
            settings.userName = login.userName);
    });


    options.addEventListeners({
        selectAvatar: async () => {
            withEmojiSelection((e) => {
                settings.avatarEmoji
                    = options.avatarEmoji
                    = game.me.avatarEmoji
                    = e;
                client.setAvatarEmoji(e);
            });
        },
        avatarURLChanged: () => {
            client.setAvatarURL(options.avatarURL);
        },
        audioPropertiesChanged: setAudioProperties,
        toggleVideo: () => {
            client.toggleVideoAsync();
        },
        toggleDrawHearing: () => {
            settings.drawHearing = game.drawHearing = options.drawHearing;
        },
        fontSizeChanged: () => {
            settings.fontSize = game.fontSize = options.fontSize;
        },
        audioInputChanged: () => {
            client.setAudioInputDeviceAsync(options.currentAudioInputDevice);
        },
        audioOutputChanged: () => {
            client.setAudioOutputDevice(options.currentAudioOutputDevice);
        },
        videoInputChanged: () => {
            client.setVideoInputDeviceAsync(options.currentVideoInputDevice);
        },
        gamepadChanged: () => {
            settings.gamepadIndex = game.gamepadIndex = options.gamepadIndex;
        },
        inputBindingChanged: () => {
            settings.inputBinding = game.inputBinding = options.inputBinding;
        }
    });

    game.addEventListeners({
        emote: (evt) => {
            client.emote(evt.emoji);
        },
        userJoined: (evt) => {
            evt.user.addEventListener("userPositionNeeded", (evt2) => {
                client.userInitRequest(evt2.id);
            });
        },
        toggleAudio: () => {
            client.toggleAudioAsync();
        },
        toggleVideo: () => {
            client.toggleVideoAsync();
        },
        gameStarted: () => {
            login.hide();
            toolbar.show();
            client.show();

            setAudioProperties();

            client.setLocalPosition(game.me);
            game.me.addEventListener("userMoved", (evt) => {
                client.setLocalPosition(evt);
            });

            if (settings.avatarEmoji !== null) {
                game.me.avatarEmoji = settings.avatarEmoji
            }
            settings.avatarEmoji
                = options.avatarEmoji
                = game.me.avatarEmoji;
        },
        gameEnded: () => {
            game.hide();
            client.hide();
            login.connected = false;
            showLogin();
        },
        emojiNeeded: selectEmojiAsync,
        zoomChanged: () => {
            settings.zoom = toolbar.zoom = game.targetCameraZ;
        }
    });

    client.addEventListeners({
        videoConferenceJoined: async (evt) => {
            login.connected = true;

            window.location.hash = login.roomName;

            game.start(evt);

            options.audioInputDevices = await client.getAudioInputDevicesAsync();
            options.audioOutputDevices = await client.getAudioOutputDevicesAsync();
            options.videoInputDevices = await client.getVideoInputDevicesAsync();

            options.currentAudioInputDevice = await client.getCurrentAudioInputDeviceAsync();
            options.currentAudioOutputDevice = await client.getCurrentAudioOutputDeviceAsync();
            options.currentVideoInputDevice = await client.getCurrentVideoInputDeviceAsync();

            const audioMuted = await client.isAudioMutedAsync();
            game.muteUserAudio({ id: client.localUser, muted: audioMuted });
            toolbar.audioEnabled = !audioMuted;

            const videoMuted = await client.isVideoMutedAsync();
            game.muteUserVideo({ id: client.localUser, muted: videoMuted });
            options.videoEnabled = !videoMuted;
        },
        videoConferenceLeft: (evt) => {
            if (evt.roomName.toLowerCase() === game.currentRoomName) {
                game.end();
            }
        },
        participantJoined: (evt) => {
            game.addUser(evt);
        },
        videoAdded: (evt) => {
            game.setAvatarVideo(evt);
        },
        participantLeft: (evt) => {
            game.removeUser(evt);
            client.removeUser(evt);
        },
        avatarChanged: (evt) => {
            game.setAvatarURL(evt);
            if (evt.id === client.localUser) {
                options.avatarURL = evt.avatarURL;
            }
        },
        displayNameChange: (evt) => {
            game.changeUserName(evt);
        },
        audioMuteStatusChanged: (evt) => {
            game.muteUserAudio(evt);
        },
        localAudioMuteStatusChanged: async (evt) => {
            toolbar.audioEnabled = !evt.muted;
            if (!evt.muted) {
                options.currentAudioInputDevice = await client.getCurrentAudioInputDeviceAsync();
            }
        },
        videoMuteStatusChanged: (evt) => {
            game.muteUserVideo(evt);
        },
        localVideoMuteStatusChanged: async (evt) => {
            options.videoEnabled = !evt.muted;
            if (!evt.muted) {
                options.currentVideoInputDevice = await client.getCurrentVideoInputDeviceAsync();
            }
            else {
                options.currentVideoInputDevice = null;
            }
        },
        userInitRequest: (evt) => {
            if (game.me && game.me.id) {
                client.userInitResponse(evt.id, game.me.serialize());
            }
            else {
                console.log("Local user not initialized");
            }
        },
        userInitResponse: (evt) => {
            if (game.users.has(evt.id)) {
                const user = game.users.get(evt.id);
                user.deserialize(evt);
                client.setUserPosition(evt);
            }
        },
        userMoved: (evt) => {
            if (game.users.has(evt.id)) {
                const user = game.users.get(evt.id);
                user.moveTo(evt.x, evt.y);
                client.setUserPosition(evt);
            }
        },
        emote: (evt) => {
            game.emote(evt.id, evt);
        },
        setAvatarEmoji: (evt) => {
            game.setAvatarEmoji(evt);
        },
        audioActivity: (evt) => {
            game.updateAudioActivity(evt);
        }
    });

    login.ready = true;
    return forExport;
}