import fetch from 'node-fetch';
import { APIUser, APIGuild, APIMessage } from 'discord-api-types';

class DiscordClient {
  apiEndpoint = 'https://discord.com/api/v9';

  token: string | undefined;

  private async sendRequest<ResObj = any>(adress: string) {
    if (!this.token) {
      throw new Error('Not logged in.');
    }
    const result = await fetch(`${this.apiEndpoint}${adress}`, {
      headers: { authorization: this.token },
    });
    const body = (await result.json()) as ResObj;
    return body;
  }

  /**
   *
   * @param guildId
   * @param limit Max 100
   * @returns
   */
  async getMessages(guildId: string, limit = 100) {
    const result = await this.sendRequest<APIMessage>(`/channels/${guildId}/messages?limit=${limit}`);
    return result;
  }

  async getGuilds() {
    const result = await this.sendRequest<APIGuild[]>('/users/@me/guilds');
    return result;
  }

  async login(token: string) {
    this.token = token;
    const result = await this.sendRequest<APIUser>('/users/@me');
    if (!result.id) {
      this.token = undefined;
      throw new Error('Invalid token');
    }
  }
}
export default DiscordClient;
