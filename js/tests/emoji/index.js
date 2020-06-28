﻿import { EmojiForm } from "../../src/forms/EmojiForm.js";

const emoji = new EmojiForm();
document.body.appendChild(emoji.element);

async function show() {
    const emote = await emoji.selectAsync();
    console.log(emote);
    setTimeout(show, 1000);
}

show();