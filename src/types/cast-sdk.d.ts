// Cast CAF Receiver SDK 最小型別宣告
// 官方無 TypeScript 型別，僅宣告本專案使用的 API
declare namespace cast {
  namespace framework {
    interface CustomMessageEvent {
      data: unknown
      senderId: string
    }

    class CastReceiverContext {
      static getInstance(): CastReceiverContext
      addCustomMessageListener(
        namespace: string,
        listener: (event: CustomMessageEvent) => void,
      ): void
      sendCustomMessage(
        namespace: string,
        senderId: string | undefined,
        data: unknown,
      ): void
      start(): void
      stop(): void
    }
  }
}
