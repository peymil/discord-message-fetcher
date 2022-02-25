import fetch from 'node-fetch';
import { APIUser, APIGuild, APIMessage } from 'discord-api-types';
import { Channel } from 'discord.js';
import { awaitAsync } from './utils';
import DiscordRequest from "./DiscordRequest";

class DiscordClient {
  discordRequest: DiscordRequest
  constructor(apiEndpoint = 'https://discord.com/api/v9') {
    this.discordRequest = new DiscordRequest(apiEndpoint)

  }

  /**
   *
   * @param guildId
   * @param after
   * @param limit Max 100
   * @returns
   */
  async getNMessagesOfChannel(channelId: string, after?: string, n = 100) {
    let address = `/channels/${channelId}/messages?limit=${n}`;
    if (after) address += `&after=${after}`;
    const result = await this.discordRequest.addToQueue<APIMessage[]>(address);

    return result;
  }

  async getUserMessages(guildId: string, userId: string) {
    let messageCount = 0;
    const messages: APIMessage[] = [];
    while (messageCount % 25 === 0) {
      const result = await this.discordRequest.addToQueue<{ messages: APIMessage[][] } & { retry_after: number }>(
        `/guilds/${guildId}/messages/search?author_id=${userId}&offset=${messageCount}`,
      );
      if (result.retry_after) {
        console.log('restricted for ' + result.retry_after);

        await awaitAsync(result.retry_after * 1000);
      } else {
        if (!result.messages) console.log('result', result);
        messages.push(...result.messages.map((msg) => msg[0]));
        messageCount += result.messages.length;
      }
    }
    console.log(messages.length);

    return messages;
  }

  async getAllMessagesOfChannel(channelId: string) {
    let lastMassegeCount = 100;
    let lastMessageId: string | undefined;
    const messages: APIMessage[] = [];
    while (lastMassegeCount === 100) {
      const messageChunk = await this.getNMessagesOfChannel(channelId, lastMessageId);
      messages.push(...messageChunk);
      lastMassegeCount = messageChunk.length;
      if (lastMassegeCount === 0) break;
      lastMessageId = messageChunk[messageChunk.length - 1].id;
    }
    return messages;
  }

  // async getNMessagesOfGuild(guildId: string, after?: string, n = 100) {
  //   let address = `/channels/${guildId}/messages?limit=${n}`;
  //   if (after) address += `&after=${after}`;
  //   const result = await this.sendRequest<APIMessage[]>(address);
  //   return result;
  // }

  async getGuildChannels(guildId: string) {
    const result = await this.discordRequest.addToQueue<Channel[]>(`/guilds/${guildId}/channels`);
    return result;
  }

  async getGuildsAndChannels() {
    const guilds = await this.getGuilds();
    const guildsAndChannels = [];

    for (let guild of guilds) {
      const channels = await this.getGuildChannels(guild.id);
      const guildAndChannels = { ...guild, ...channels };
      guildsAndChannels.push(guildAndChannels);
    }
    return guildsAndChannels;
  }

  async getAllMessagesOfChannels(channelIds: string[]) {
    const messages = await Promise.all(channelIds.map((channelId) => this.getAllMessagesOfChannel(channelId)));
    return messages;
  }

  async getAllMessagesOfGuild(guildId: string) {
    const channels = await this.getGuildChannels(guildId);
    const messagesOfChannels = channels.map(async ({ id, ...others }) => ({
      id,
      ...others,
      messages: await this.getAllMessagesOfChannel(id),
    }));
    return Promise.all(messagesOfChannels);
  }

  async getGuilds() {
    const result = await this.discordRequest.addToQueue<APIGuild[]>('/users/@me/guilds');
    return result;
  }

  async login(token: string) {
    this.discordRequest.setToken(token)
    const result = await this.discordRequest.addToQueue<APIUser>('/users/@me');
    if (!result.id) {
      this.discordRequest.setToken("")
      throw new Error('Invalid token');
    }
  }
}
export default DiscordClient;
