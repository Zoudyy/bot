import { PermissionString, TextChannel, GuildMember, Role } from "discord.js";
import { FireMessage } from "../../lib/extensions/message";
import { constants } from "../../lib/util/constants";
import { Language } from "../../lib/util/language";
import { Command } from "../../lib/util/command";

const {
  emojis: { success, error },
} = constants;

export default class Debug extends Command {
  constructor() {
    super("debug", {
      description: (language: Language) =>
        language.get("DEBUG_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      args: [
        {
          id: "command",
          type: "command",
          default: null,
        },
      ],
    });
  }

  async exec(message: FireMessage, args: { command: Command }) {
    const cmd = args.command;
    if (!cmd)
      return await message.channel.send({
        embed: this.createEmbed(message, [
          `${error} ${message.language.get("DEBUG_NO_COMMAND")}`,
        ]),
      });
    if (!cmd.id)
      return await message.channel.send({
        embed: this.createEmbed(message, [
          `${error} ${message.language.get("UNKNOWN_COMMAND")}`,
        ]),
      });
    if (cmd.id == this.id)
      return await message.channel.send({
        embed: this.createEmbed(message, [
          `${success} ${message.language.get("DEBUGGING_DEBUG")}`,
        ]),
      });
    if (cmd.ownerOnly)
      return await message.channel.send({
        embed: this.createEmbed(message, [
          `${error} ${message.language.get("COMMAND_OWNER_ONLY")}`,
        ]),
      });
    let details: string[] = [];
    const permissionChecks = await this.client.commandHandler.runPermissionChecks(
      message,
      cmd
    );
    const cmdPerms = {
      clientPermissions: cmd.clientPermissions as Array<string>,
      userPermissions: cmd.userPermissions as Array<string>,
    };
    if (permissionChecks) {
      let userMissing = [];
      cmdPerms.userPermissions?.forEach((perm) => {
        if (!message.member.permissions.has(perm as PermissionString)) {
          let permTitle = perm.split("_");
          permTitle.forEach((v, index) => {
            permTitle[index] =
              v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
          });
          userMissing.push(permTitle.join(" "));
        }
      });
      let clientMissing = [];
      cmdPerms.clientPermissions?.forEach((perm) => {
        if (!message.guild.me.permissions.has(perm as PermissionString)) {
          let permTitle = perm.split("_");
          permTitle.forEach((v, index) => {
            permTitle[index] =
              v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
          });
          clientMissing.push(permTitle.join(" "));
        }
      });
      const permMsg = (message.language.get(
        "DEBUG_PERMS_FAIL",
        userMissing,
        clientMissing
      ) as unknown) as { user: string | null; client: string | null };
      if (userMissing || clientMissing)
        details.push(
          `${error} ${message.language.get("DEBUG_PERMS_CHECKS_FAIL")}` +
            (permMsg.user ? `\n${permMsg.user}` : ``) +
            (permMsg.client ? `\n${permMsg.client}` : ``)
        );
    } else
      details.push(`${success} ${message.language.get("DEBUG_PERMS_PASS")}`);
    const inhibitorCheck = await this.client.inhibitorHandler.test(
      "all",
      message,
      cmd
    );
    if (inhibitorCheck != null) details.push(`${error} ${inhibitorCheck}`); // No Translation :(
    const disabledCommands: string[] = this.client.settings.get(
      message.guild.id,
      "disabled.commands",
      []
    );
    if (disabledCommands.includes(cmd.id)) {
      if (message.member.permissions.has("MANAGE_MESSAGES"))
        details.push(
          `${success} ${message.language.get("DEBUG_COMMAND_DISABLE_BYPASS")}`
        );
      else
        details.push(
          `${error} ${message.language.get("DEBUG_COMMAND_DISABLE")}`
        );
    } else
      details.push(
        `${success} ${message.language.get("DEBUG_COMMAND_NOT_DISABLED")}`
      );
    if (cmd.id == "mute") {
      let bypass = [];
      const overwrites = (message.channel as TextChannel).permissionOverwrites;
      overwrites.forEach((value, key) => {
        let overwriteFor: GuildMember | Role =
          message.guild.roles.cache.get(key) ||
          message.guild.members.cache.get(key);
        if (value.allow.has("SEND_MESSAGES"))
          bypass.push(overwriteFor.toString());
      });
      if (bypass.length)
        details.push(
          `${error} ${message.language.get(
            "DEBUG_MUTE_BYPASS",
            message.channel,
            bypass
          )}`
        );
      else
        details.push(
          `${success} ${message.language.get(
            "DEBUG_MUTE_NO_BYPASS",
            message.channel
          )}`
        );
    }
    if (message.guild.me.permissions.has("EMBED_LINKS"))
      return await message.channel.send({
        embed: this.createEmbed(message, details),
      });
    else {
      details.push(`${error} ${message.language.get("DEBUG_NO_EMBEDS")}`);
      return await message.channel.send(details.join("\n"));
    }
  }

  createEmbed(message: FireMessage, details: string[]) {
    let issues = details.filter((detail) => detail.startsWith(error));
    return {
      title: issues.length
        ? `${issues.length} issues found`
        : "No issues found",
      color: message.member?.displayColor || "#ffffff",
      timestamp: new Date(),
      description: details.join("\n"),
    };
  }
}