import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { GuildMember, User } from "discord.js";

export default class Plonk extends Command {
  constructor() {
    super("plonk", {
      description: (language: Language) =>
        language.get("PLONK_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      args: [
        {
          id: "user",
          type: "user|member",
          required: true,
        },
        {
          id: "permanent",
          type: (message: FireMessage, phrase: string | null) => {
            if (
              ["yes", "y", "true", "t", "1", "enable", "on"].includes(
                phrase.toLowerCase().trim()
              )
            )
              return true;
            else if (
              ["no", "n", "false", "f", "0", "disable", "off"].includes(
                phrase.toLowerCase().trim()
              )
            )
              return false;
            else return null;
          },
          default: true,
          required: false,
        },
        {
          id: "reason",
          type: "string",
          default: "bad boi",
          match: "rest",
          required: false,
        },
      ],
      aliases: ["unplonk"],
      category: "Admin",
    });
  }

  condition(message: FireMessage) {
    return this.client.util.admins.includes(message.author.id);
  }

  async exec(
    message: FireMessage,
    args: { user: GuildMember | User; permanent: boolean; reason: string }
  ) {
    const user = args.user instanceof GuildMember ? args.user.user : args.user;
    if (this.client.util.plonked.includes(user.id)) {
      const unblacklisted = await this.client.util.unblacklist(user);
      if (unblacklisted) return await message.success();
      else return await message.error();
    } else {
      const blacklisted = await this.client.util.blacklist(
        user,
        args.reason,
        args.permanent
      );
      if (blacklisted) return await message.success();
      else return await message.error();
    }
  }
}