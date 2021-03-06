import { ApplicationFlags } from "discord.js";
import fetch from "node-fetch";
import { awaitAsync } from "./utils";
type requestQueueMember = { url: string, resolve: (data: any) => void, reject: (data: any) => void }

type rateLimitResponse = {
  "X-RateLimit-Limit": number
  "X-RateLimit-Remaining": number
  "X-RateLimit-Reset": number
  "X-RateLimit-Reset-After": number
  "X-RateLimit-Bucket": string
  "X-RateLimit-Scope": string
}
class DiscordRequest {
  apiEndpoint: string
  private token = ""
  isProcessing = false
  private requestQueue: requestQueueMember[] = []
  private cooldownMS = 0
  private remainingRequests = 1
  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint
  }
  setToken(token: string) {
    this.token = token
  }

  addToQueue<ResObj = any>(url: string) {
    return new Promise<ResObj>((resolve, reject) => {
      this.requestQueue.push({ url, resolve, reject })
      if (!this.isProcessing) this.processRequests()
    })
  }

  getParseLimitHeaders(headers: Record<string, any>): rateLimitResponse {
    return {
      "X-RateLimit-Limit": headers["X-RateLimit-Limit"],
      "X-RateLimit-Remaining": headers["X-RateLimit-Remaining"],
      "X-RateLimit-Reset": headers["X-RateLimit-Reset"],
      "X-RateLimit-Reset-After": headers["X-RateLimit-Reset-After"],
      "X-RateLimit-Bucket": headers["X-RateLimit-Bucket"],
      "X-RateLimit-Scope": headers["X-RateLimit-Scope"],
    }
  }

  private async processRequests<ResObj = any>() {

    while (this.requestQueue.length !== 0) {
      const { url, reject, resolve } = this.requestQueue.shift()!
      if (this.remainingRequests === 0) {
        await awaitAsync(this.cooldownMS)
      }
      //that needs to done asynchronously
      const result = await fetch(`${this.apiEndpoint}${url}`, {
        headers: { authorization: this.token },
      })

      const rateLimitHeaders = this.getParseLimitHeaders(result.headers)

      this.remainingRequests = rateLimitHeaders["X-RateLimit-Remaining"]
      this.cooldownMS = rateLimitHeaders["X-RateLimit-Reset-After"]

      result.json().then((body: ResObj) => {
        resolve(body)
      })
    }
    this.isProcessing = false
  }

}
export default DiscordRequest