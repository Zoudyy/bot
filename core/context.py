"""
MIT License
Copyright (c) 2021 GamingGeek

Permission is hereby granted, free of charge, to any person obtaining a copy of this software
and associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
"""

from core.config import Config
from discord.ext import commands
import discord
import random


class Context(commands.Context):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.config: Config = self.bot.get_config(
            self.guild.id) if self.guild else None
        self.silent = False
        self.ticket_override = None

    async def success(self, message: str, **kwargs):
        return await self.reply(f'<:yes:534174796888408074> {message}', **kwargs)

    async def warning(self, message: str, **kwargs):
        return await self.reply(f'<:maybe:534174796578160640> {message}', **kwargs)

    async def error(self, message: str, **kwargs):
        return await self.reply(f'<:no:534174796938870792> {message}', **kwargs)

    async def reply(self, message: str, **kwargs):
        try:
            return await commands.Context.reply(self, message, **kwargs)
        except Exception:
            return await self.send(message, **kwargs)

    async def send(self, content=None, *, tts=False, embed=None, file=None, files=None, delete_after=None, allowed_mentions=None):
        if isinstance(content, discord.Embed):
            embed = content.copy()
            content = None
        if isinstance(embed, discord.Embed) and embed.color in [discord.Embed.Empty, discord.Color.default()]:
            embed.color = discord.Color.random()
        if not (file or files):
            resp = discord.utils.get(
                self.bot.cached_messages, id=self.bot.cmdresp.get(self.message.id, 0))
            edited = self.message.edited_at
            if resp and edited and edited > (resp.edited_at or self.message.created_at):
                try:
                    await resp.edit(content=content, tts=tts, embed=embed, delete_after=delete_after)
                    return resp
                except Exception:
                    pass
            elif not resp:
                self.bot.cmdresp.pop(self.message.id, 0)
        resp = await super().send(content=content, tts=tts, embed=embed, file=file, files=files, delete_after=delete_after, allowed_mentions=allowed_mentions)
        if not delete_after and not (file or files):
            self.bot.cmdresp[self.message.id] = resp.id
        return resp

    async def dm(self, content=None, *, tts=False, embed=None, file=None, files=None, delete_after=None):
        return await self.author.send(content=content, tts=tts, embed=embed, file=file, files=files, delete_after=delete_after)

    async def modlog(self, embed: discord.Embed):
        channel: discord.TextChannel = self.config.get('log.moderation')
        if not channel:
            return
        await channel.send(embed=embed)

    async def actionlog(self, embed: discord.Embed):
        channel: discord.TextChannel = self.config.get('log.action')
        if not channel:
            return
        await channel.send(embed=embed)
